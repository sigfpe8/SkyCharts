class Chart {
	iwidth;			// Internal width
	iheight;		// Internal height
	sx;				// Scale factor for X axis
	sy;				// Scale factor for Y axis
	RA0;			// Starting RA
	panes;			// # of sub-charts

	constructor() {
		this.iwidth  = width - 2 * xMargins;	// Subtract left+right margins
		this.iheight = height - 2 * yMargins;	// Subtract top+bottom margins
		this.RA0 = 0;
		this.panes = 1;
	}

	// By default put the origin in the middle of the canvas.
	// Every Chart subclass must call setCoord() at some point in
	// drawFrame() or in drawStars() to set the approprate coordinate
	// system for the chart.
	setCoord() {
		translate(width/2, height/2);
	}

	drawFrame() {
		background(255);
		stroke(0);
		strokeWeight(3);
		noFill();
		rect(0, 0, width, height);
		strokeWeight(1);
	}

	drawStars() {
		let mag = sldMag.value();

		fill(color_scheme[color_index].star);
		noStroke();
		//const stars = [["Alpha", 1, -20, 0], ["Beta", 2, 40, 0], ["Gamma", 18, 60, 0], ["Delta", 2, -40, 0]];
	
		for (st of stars) {
			// st = [Name, RA, Dec, Vmag]
			let Vmag = st[3];
			if (Vmag <= mag) {
				const [x, y] = this.RADEtoXY(st[1], st[2]);
				const dm = map(Vmag, -2, 8, 8, 1);
				circle(x, y, dm);
			}
		}
	}

	drawEcliptic() {
		let x, y;
		const end = 360 / this.panes;
		
		stroke(color_scheme[color_index].eclp);
		strokeWeight(2);
		noFill();
		beginShape();
		for (let l = 0; l < end; l += 2) {
			const sinde = sine * sin(l);
			const DE = asin(sinde);
			const RAa = (atan2(cose * sin(l), cos(l)) + 360) % 360;
			const RA = (RAa * 24) / 360;
			[x, y] = this.RADEtoXY(RA,DE);
			curveVertex(x,y);
		}
		curveVertex(x,y);
		endShape();

		if (this.panes == 2) {	// Draw second pane
			beginShape();
			for (let l = 181; l < 360; l += 2) {
				const sinde = sine * sin(l);
				const DE = asin(sinde);
				const RAa = (atan2(cose * sin(l), cos(l)) + 360) % 360;
				const RA = (RAa * 24) / 360;
				[x, y] = this.RADEtoXY(RA,DE);
				curveVertex(x,y);
			}
			curveVertex(x,y);
			endShape();
		}
	}
	
	drawSolarSystem() {
		let jd = JD(year(), month(), day());
		jd += (hour() - 12) / 24 + (minute() / 1440) + (second() / 86400);
	
		const dn = jd - 2451543.5;
	
		noStroke();
		for (let p of solarSystem) {
			const [RA, DE] = p.Position(dn);
			const [x, y] = this.RADEtoXY(RA, DE);
			circle(x, y, 3);
			text(p.name, x+5, y+2);
		}
	}

	checkMouse() {
		let x = mouseX;
		let y = mouseY;
		// Outside the canvas?
		if (x < 0 || x >= width || y < 0 || y >= height)
			return false;
	
		const [RA, DE] = this.XYtoRADE(x, y);
		const key = starHash(RA, DE);

		if (key in stars_dic) {
			const st = stars_dic[key][0];
			if (st[3] <= sldMag.value()) {
				hover_star = st;
				console.log("Key=",key,"Star=",st);
				return true;
			}
		}
	
		//console.log("RA=",RA,"DE=",DE,"key=",key);
		return false;
	}
	
	
};

/*********************************************************
	                Rectangular charts
*********************************************************/
class RectangularChart extends Chart {
	constructor() {
		super();
		// Scale factors
		this.sx = (this.iwidth / 24);
		this.sy = (this.iheight / 180);
	}

	// Origin is at the top left corder of the inner frame
	setCoord() {
		translate(xMargins, yMargins);
	}

	drawFrame() {
		Chart.prototype.drawFrame();
		// Set coordinate system to draw everything
		this.setCoord();
		stroke(color_scheme[color_index].grid);
		fill(color_scheme[color_index].sky);
		rect(0, 0, this.iwidth, this.iheight);
	}

	drawGrid() {
		stroke(color_scheme[color_index].grid);
		fill(color_scheme[color_index].grid);
		// Vertical hour lines
		for (let h = 1; h < 24; ++h) {
			// let x = h * this.sx;
			// line(x, 0, x, this.iheight);
			const [x1, y1] = this.RADEtoXY(h, -90);
			const [x2, y2] = this.RADEtoXY(h, 90);
			line(x1, y1, x2, y2);
			const lb = h + "ʰ";
			text(lb, x1 - 6, y1 - 5);
		}
		// Horizontal declination lines
		for (let d = -80; d < 90; d += 20) {
			// let y = d * dy;
			// line(0, y, this.iwidth, y);
			const [x1, y1] = this.RADEtoXY(24, d);
			const [x2, y2] = this.RADEtoXY(0, d);
			line(x1, y1, x2, y2);
			text(d + "°", x1, y1 + 3);
		}
	}
	
	// Convert RA and DE to (x,y) canvas coordinates
	RADEtoXY(RA, DE) {
		const x = (24 - RA) * this.sx;
		const y = (90 - DE) * this.sy;
		return [x, y];
	};

	// Convert (x,y) canvas coordinates to RA and DE
	XYtoRADE(x,y) {
		const RA = 24 - ((x - xMargins) / this.sx);
		const DE = 90 - ((y - yMargins) / this.sy);
		return [RA, DE];
	};
};

/*********************************************************
	                 Elliptical charts
*********************************************************/
class EllipticalChart extends Chart {
	constructor() {
		super();
		// Scale factors
		this.sx = (this.iwidth / 24);
		this.sy = (this.iheight / 2);
	};

	drawFrame() {
		let x, y;

		Chart.prototype.drawFrame();
		// Use default coordinate system (middle of canvas)
		this.setCoord();

		stroke(color_scheme[color_index].grid);
		strokeWeight(1);
		fill(color_scheme[color_index].sky);

		// External frame/meridians
		beginShape();
		for (let DE = -90; DE <= 90; DE += 5) {
			// const x = -12 * this.sx * cos(DE);
			// const y = -this.sy * sin(DE);
			const [x, y] = this.RADEtoXY(24, DE);
			curveVertex(x,y);
		}
		for (let DE = 90; DE >= -90; DE -= 5) {
			// const x = 12 * this.sx * cos(DE);
			// const y = -this.sy * sin(DE);
			const [x, y] = this.RADEtoXY(0, DE);
			curveVertex(x,y);
		}
		endShape(CLOSE);
		//endShape();
	}

	drawGrid() {
		let x, y, _;
		let tx, tw;
	
		stroke(color_scheme[color_index].grid);
		strokeWeight(1);
	
		// The equator
		//line(-12 * this.sx, 0, 12 * this.sx, 0);
	
		// Inner meridians
		for (let RA = 0; RA <= 24; RA += 2) {
			noFill();
			beginShape();
			for (let DE = -90; DE <= 90; DE += 5) {
				// x = (((RA+RA0+24) % 24) - 12) * this.sx * cos(DE);
				// y = -this.sy * sin(DE);
				[x, y] = this.RADEtoXY(RA, DE);
				curveVertex(x,y);
			}
			endShape();
			// RA labels
			// x = (((RA+RA0+24) % 24) - 12) * this.sx;
			[x, _] = this.RADEtoXY(RA, 0);
			tx = RA + hang_sup;
			tw = textWidth(tx);
			text(tx, x - tw/2, -1);
		}
		// Parallels
		for (let DE = -60; DE <= 60; DE += 30) {
			noFill();
			beginShape();
			[x, y] = this.RADEtoXY(0, DE);
			curveVertex(x,y);
			for (let RA = 0; RA <= 24; RA += 2) {
				[x, y] = this.RADEtoXY(RA, DE);
				curveVertex(x,y);
			}
			[x, y] = this.RADEtoXY(24, DE);
			curveVertex(x,y);
			endShape();
		}
	}

	// Convert RA and DE to (x,y) canvas coordinates
	RADEtoXY(RA, DE) {
		// assert(0 <= RA && RA <= 24)

		// 24-22-20-...-12-..2-1-0
		const x = (12 - RA) * this.sx * cos(DE);
		const y = -this.sy * sin(DE);

		// 0-1-2-...-12-..22-23-24
		// const x = (RA - 12) * this.sx * cos(DE);
		// const y = -this.sy * sin(DE);
		return [x, y];
	};

	// Convert (x,y) canvas coordinates to RA and DE
	XYtoRADE(x,y) {
		x -= width / 2;
		y =  height / 2 - y;
	
		const DE = asin(y / this.sy);
		const RA = (12 - (x / (this.sx * cos(DE))) + 24) % 24;
		return [RA, DE];
	};
};

/*********************************************************
	                Polar charts
*********************************************************/
class PolarChart extends Chart {
	constructor() {
		super();
		// Scale factors
		this.sx = (this.iwidth / 24);
		this.sy = (this.iheight / 2);

		// Fix the chart's internal diameter
		north_pole[2] = this.iheight;
		south_pole[2] = this.iheight;

		this.panes = 2;
	};

	// Polar charts have "two origins" (poles)
	// So, don't use the default translation
	setCoord() {}

	drawFrame() {
		Chart.prototype.drawFrame();
		this.drawPolarFrame(north_pole);
		this.drawPolarFrame(south_pole);
	}

	drawPolarFrame(pole) {
		// pole = [x, y, diam, name, stars]
		let d = pole[2];
		let name = pole[3];
		let r1 = d / 25;
		let r2 = 9.5 * d / 20;
		push();
		translate(pole[0], pole[1]);
		circle(0,0,d);		// Outer circle
		fill(color_scheme[color_index].sky);
		d *= 0.95;
		circle(0,0,d);		// Inner circle
		pop();
	}

	drawGrid() {
		this.drawPolarGrid(north_pole);
		this.drawPolarGrid(south_pole);
	}

	drawPolarGrid(pole) {
		// pole = [x, y, diam, name, stars]
		let d = pole[2];
		let name = pole[3];
		let r1 = d / 25;
		let r2 = 9.5 * d / 20;
		push();
		translate(pole[0], pole[1]);
		circle(0,0,d);		// Outer circle
		fill(color_scheme[color_index].sky);
		d *= 0.95;
		circle(0,0,d);		// Inner circle
		let tw = textWidth(name);
		let th = textSize();
		fill(color_scheme[color_index].grid);
		stroke(color_scheme[color_index].grid);
		text(name, 0 - tw / 2, th / 2);
		noFill();
		// Declination circles
		for (let de = 20; de < 90; de += 20) {
			let dm = d-(de/90*d);
			// Stereographic projection from the other pole
			//dm *= tan((90 - de) / 2);
			circle(0,0,dm);
			let tx = (name == "SP" ? "-" : "") + de + deg_sup;
			tw = textWidth(tx);
			text(tx, 0 - tw / 2, dm / 2 - 2);
		}
		// Point left (0h)
		rotate(90);
		fill(0);
		for (let h = 0; h < 24; ++h) {
			let tx = h + hang_sup;
			tw = textWidth(tx);
			line(0, r1, 0, r2);
			text(tx, 0 - tw / 2, r2 + th - 2);
			rotate(-15);
		}
		pop();
	}
	
	XdrawStars() {
		this.drawPolarStars(north_pole);
		this.drawPolarStars(south_pole);	
	}

	drawPolarStars(pole) {
		// pole = [x, y, diam, name, stars]
		let d = pole[2] * 0.95;
		let name = pole[3];
		let r = d / 2;
		//let stars = [["Alpha", 1, 20, 0], ["Beta", 2, 40, 0], ["Gamma", 18, 60, 0]];
		let stars = pole[4];
		let mag = sldMag.value();
		push();
		translate(pole[0], pole[1]);
		// Point left (0h)
		rotate(90);

		fill(color_scheme[color_index].star);
		for (st of stars) {
			// st = [Name, RA, Dec, Vmag]
			let Vmag = st[3];
			if (Vmag <= mag) {
				let h = st[1] * 15;
				let de = abs(st[2]);
				const x = 0;
				let y = r - (de/90*r);
				// Stereographic projection from the other pole
				//y *= tan((90 - de) / 2);
				// Magnitude -2 -> diameter 8
				//           -1 -> diameter 7
				//            ...
				//            8 -> diameter 1
				let dm = map(Vmag, -2, 8, 8, 1);
				rotate(-h);
				circle(x, y, dm);
				rotate(h);
			}
		}
		pop();
	}

	// Convert RA and DE to (x,y) canvas coordinates
	RADEtoXY(RA, DE) {
		// pole = [x, y, diam, name, stars]
		const pole = DE < 0 ? south_pole : north_pole;
		const r = pole[2] * 0.475; // * 0.95 / 2
		const d = r - (abs(DE) * r / 90);
		const x = pole[0] - d * cos(RA * 360 / 24);
		const y = pole[1] + d * sin(RA * 360 / 24);
		return [x, y];
	};

	// Convert (x,y) canvas coordinates to RA and DE
	XYtoRADE(x,y) {
		// pole = [x, y, diam, name, stars]
		let RA, DE;
		const pole = x < width / 2 ? north_pole : south_pole;
		const r = pole[2] * 0.475; 			// Chart radius
		const dx = pole[0] - x;
		const dy = y - pole[1];
		const d = sqrt(dx * dx + dy * dy);	// Distance to pole
		if (d < r) {
			DE = ((r - d) * 90) / r;
			const RAa = (atan2(dy, dx) + 360) % 360;
			RA = (RAa * 24) / 360;
			if (pole[3] == "SP") DE = -DE;
		} else {
			RA = -1;
			DE = -1;
		}

		//console.log("RA=",RA,"DE=",DE);
		return [RA, DE];
	};

}
