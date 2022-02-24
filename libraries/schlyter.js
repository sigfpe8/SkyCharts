// Algorithms from
//   http://www.stjarnhimlen.se/comp/ppcomp.html
//   http://www.stjarnhimlen.se/comp/tutorial.html

class Body {
	// Some of the Sun's variables, ajusted for day number 'd', used by other bodies
	static d;
	static xSun;
	static ySun;
	static MSun;
	static LSun;

	constructor(name,N,i,w,a,e,M) {
		// The primary orbital elements of the Body
		// 	 N = longitude of the ascending node (Ω)
		// 	 i = inclination to the ecliptic (plane of the Earth's orbit)
		// 	 w = argument of perihelion (ω)
		// 	 a = semi-major axis, or mean distance from Sun
		// 	 e = eccentricity (0=circle, 0-1=ellipse, 1=parabola)
		// 	 M = mean anomaly (0 at perihelion; increases uniformly with time)
		//
		// The value of `a` is given in AU for the planets and in Earth radii for the Moon.
		// The arguments to the constructor are actually pairs of values [v0,v1] such that
		// the desired element value can be calculated at a given day number `d` as
		//      v = v0 + v1 * d
		this.name = name;
		this.N0 = N[0];
		this.N1 = N[1];
		this.i0 = i[0];
		this.i1 = i[1];
		this.w0 = w[0];
		this.w1 = w[1];
		this.a0 = a[0];
		this.a1 = a[1];
		this.e0 = e[0];
		this.e1 = e[1];
		this.M0 = M[0];
		this.M1 = M[1];
	}

	// Return the body's orbital elements adjusted for day number 'd'
	// All angles are reduced to the range [0, 360)
	N(d) { return (((this.N0 + this.N1 * d) % 360) + 360) % 360; }
	i(d) { return (((this.i0 + this.i1 * d) % 360) + 360) % 360; }
	w(d) { return (((this.w0 + this.w1 * d) % 360) + 360) % 360; }
	a(d) { return this.a0 + this.a1 * d; }
	e(d) { return this.e0 + this.e1 * d; }
	M(d) { return (((this.M0 + this.M1 * d) % 360) + 360) % 360; }

	// Return the body's position as [RA,DE] for day number 'd'
	Position(d) {
		// Adjusted orbital elements
		const N = this.N(d);
		const w = this.w(d);
		const e = this.e(d);
		const M = this.M(d);
		const a = this.a(d);
		const i = this.i(d);

		// Obliquity of the ecliptic
		const oblecl = 23.4393 - 3.563E-7 * d;

		// Eccentric anomaly
		// E0 = M + (180_deg/pi) * e * sin(M) * (1 + e * cos(M))
		// E1 = E0 - (E0 - (180_deg/pi) * e * sin(E0) - M) / (1 - e * cos(E0))
		let E0 = M + (180 / PI) * e * sin(M) * (1 + e * cos(M));
		let E = E0 - (E0 - (180 / PI) * e * sin(E0) - M) / (1 - e * cos(E0));
		let niters = 0;
		while (abs(E - E0) > 0.005 && niters < 20) {
			E0 = E;
			E = E0 - (E0 - (180 / PI) * e * sin(E0) - M) / (1 - e * cos(E0));
			++niters;
		}
		//console.log("E=",E,"niters=",niters);

		// Compute the body's rectangular coordinates in the plane of the ecliptic
		const xv = a * (cos(E) - e);
		const yv = a * (sqrt(1.0 - e * e) * sin(E));

		// Compute distance and true anomaly
		let   r = sqrt(xv * xv + yv * yv);
		const v = atan2(yv, xv);
		//console.log("r=",r,"v=",v);

		// Compute the body's position in 3-D space
		// Heliocentric for the planets, geocentric for the Moon
		let xh = r * (cos(N) * cos(v+w) - sin(N) * sin(v+w) * cos(i));
		let yh = r * (sin(N) * cos(v+w) + cos(N) * sin(v+w) * cos(i));
		let zh = r * (sin(v+w) * sin(i));
		//console.log("xh=",xh,"yh=",yh,"zh=",zh);

		// Ecliptical coordinates
		let lon = (atan2(yh, xh) + 360) % 360;
		let lat = atan2(zh, sqrt(xh*xh + yh*yh));
		//console.log(this.name, "lon=",lon, "lat=",lat, "r=",r);

		// The Sun's elements must be calculated before those of the other bodies
		if (Body.xSun == null && this.name != 'Sun') {
			Sun.Position(d);
			console.log("Initialized the Sun: x=",Body.xSun,"y=",Body.ySun);
		}

		// Calculate main perturbations to the Moon, Jupiter, Saturn and Uranus

		let xg, yg, zg;			// Geocentric coordinates
		let Mm, Mj, Ms, Mu;		// Mean anomaly for Moon/Jupiter/Saturn/Sun/Uranus
		let Nm;					// Longitude of the Moon's node
		let ws, wm;				// Argument of perihelion for the Sun and the Moon
		let Ls;					// Mean longitude of the Sun
		let Lm;					// Mean longitude of the Moon
		let D;					// Mean elongation of the Moon
		let F;					// Argument of latutude for the moon
		let lon_pert, lat_pert;	// Longitude/latitude perturbations
		let dis_pert;			// Distance perturbations

		switch (this.name) {
		case 'Sun':
			// Remember these parameters for the other bodies
			Body.d = d;
			Body.xSun = xh;
			Body.ySun = yh;
			// zSun = 0 so we don't need to store it
			Body.MSun = M;
			Body.wSun = w;
			Body.LSun = (((w + M) % 360) + 360) % 360;
			break;
		case 'Moon':
			// The Moon's position is already geocentric, but we need
			// to add the perturbations to lon and lat.
			Ms = Body.MSun;
			ws = Body.wSun;
			Mm = M;
			Nm = N;
			wm = w;
			Ls = Ms + ws;
			Lm = Mm + wm + Nm;
			D = Lm - Ls;
			F = Lm - Nm;
			lon_pert = 
				-1.274 * sin(Mm - 2*D)			// The Evection
				+0.658 * sin(2*D)				// The Variation
				-0.186 * sin(Ms)				// The Yearly Equation
				-0.059 * sin(2*Mm - 2*D)
				-0.057 * sin(Mm - 2*D + Ms)
				+0.053 * sin(Mm + 2*D)
				+0.046 * sin(2*D - Ms)
				+0.041 * sin(Mm - Ms)
				-0.035 * sin(D)					// The Parallactic Equation
				-0.031 * sin(Mm + Ms)
				-0.015 * sin(2*F - 2*D)
				+0.011 * sin(Mm - 4*D);
			lat_pert =
				-0.173 * sin(F - 2*D)
				-0.055 * sin(Mm - F - 2*D)
				-0.046 * sin(Mm + F - 2*D)
				+0.033 * sin(F + 2*D)
				+0.017 * sin(2*Mm + F);
			dis_pert =
				-0.58 * cos(Mm - 2*D)
				-0.46 * cos(2*D);
			lon += lon_pert;
			lat += lat_pert;
			// r += dis_pert;
			// console.log("Moon: lon=",lon,"lat=",lat,"r=",r);
			// r = 1.0;
			xg = cos(lon) * cos(lat);
			yg = sin(lon) * cos(lat);
			zg = sin(lat);
			break;
		case 'Jupiter':
			// Add longitude perturbations
			Mj = M;
			Ms = Saturn.M(d);
			lon_pert =
				-0.332 * sin(2*Mj - 5*Ms - 67.6)
				-0.056 * sin(2*Mj - 2*Ms + 21)
				+0.042 * sin(3*Mj - 5*Ms + 21)
				-0.036 * sin(Mj - 2*Ms)
				+0.022 * cos(Mj - Ms)
				+0.023 * sin(2*Mj - 3*Ms + 52)
				-0.016 * sin(Mj - 5*Ms - 69)
			lon += lon_pert;
			xh = r * cos(lon) * cos(lat);
			yh = r * sin(lon) * cos(lat);
			zh = r * sin(lat);
			break;
		case 'Saturn':
			// Add longitude and latitude perturbations
			Mj = Jupiter.M(d);
			Ms = M;
			lon_pert =
				+0.812 * sin(2*Mj - 5*Ms - 67.6)
				-0.229 * cos(2*Mj - 4*Ms - 2)
				+0.119 * sin(Mj - 2*Ms - 3)
				+0.046 * sin(2*Mj - 6*Ms - 69)
				+0.014 * sin(Mj - 3*Ms + 32);
			lat_pert =
				-0.020 * cos(2*Mj - 4*Ms - 2)
				+0.018 * sin(2*Mj - 6*Ms - 49);
			lon += lon_pert;
			lat += lat_pert;
			xh = r * cos(lon) * cos(lat);
			yh = r * sin(lon) * cos(lat);
			zh = r * sin(lat);
			break;
		case 'Uranus':
			// Add longitude perturbations
			Mj = Jupiter.M(d);
			Ms = Saturn.M(d);
			Mu = M;
			lon_pert =
				+0.040 * sin(Ms - 2*Mu + 6)
				+0.035 * sin(Ms - 3*Mu + 33)
				-0.015 * sin(Mj - Mu + 20);
			lon += lon_pert;
			break;
		}

		if (this.name != 'Moon') {
			xg = xh + Body.xSun;
			yg = yh + Body.ySun;
			zg = zh;
		}

		// Geocentric rectangular to equatorial coordinates
		const xeqt = xg;
		const yeqt = yg * cos(oblecl) - zg * sin(oblecl);
		const zeqt = yg * sin(oblecl) + zg * cos(oblecl);

		// Convert to RA and DE:
		const RAa = (atan2(yeqt, xeqt) + 360) % 360;
		const RA = (RAa * 24) / 360;
		const DE  = atan2(zeqt, sqrt(xeqt*xeqt + yeqt*yeqt));

		//console.log(this.name, RA, DE);

		return [RA, DE];
	}

}

const Sun = new Body("Sun",
			[0, 0],						// N
			[0, 0],						// i
			[282.9404, 4.70935E-5],		// w
			[1.000000, 0],				// a
			[0.016709, -1.151E-9],		// e
			[356.0470, 0.9856002585]);	// M

const Moon = new Body("Moon",
			[125.1228, -0.0529538083],	// N
			[5.1454, 0],				// i
			[318.0634, 0.1643573223],	// w
			[60.2666, 0],				// a (Earth radii)
			[0.054900, 0],				// e
			[115.3654, 13.0649929509]);	// M

const Mercury = new Body("Mercury",
			[48.3313, 3.24587E-5],		// N
			[7.0047, 5.00E-8],			// i
			[29.1241, 1.01444E-5],		// w
			[0.387098, 0],				// a
			[0.205635, 5.59E-10],		// e
			[168.6562, 4.0923344368]);	// M

const Venus = new Body("Venus",
			[76.6799, 2.46590E-5],		// N
			[3.3946, 2.75E-8],			// i
			[54.8910, 1.38374E-5],		// w
			[0.723330, 0],				// a
			[0.006773, -1.302E-9],		// e
			[48.0052, 1.6021302244]);	// M

const Mars = new Body("Mars",
			[49.5574, 2.11081E-5],		// N
			[1.8497, -1.78E-8],			// i
			[286.5016, 2.92961E-5],		// w
			[1.523688, 0],				// a
			[0.093405, 2.516E-9],		// e
			[18.6021, 0.5240207766]);	// M

const Jupiter = new Body("Jupiter",
			[100.4542, 2.76854E-5],		// N
			[1.3030, -1.557E-7],		// i
			[273.8777, 1.64505E-5],		// w
			[5.20256, 0],				// a
			[0.048498, 4.469E-9],		// e
			[19.8950, 0.0830853001]);	// M

const Saturn = new Body("Saturn",
			[113.6634, 2.38980E-5],		// N
			[2.4886, -1.081E-7],		// i
			[339.3939, 2.97661E-5],		// w
			[9.55475, 0],				// a
			[0.055546, -9.499E-9],		// e
			[316.9670, 0.0334442282]);	// M

const Uranus = new Body("Uranus",
			[74.0005, 1.3978E-5],		// N
			[0.7733, 1.9E-8],			// i
			[96.6612, 3.0565E-5],		// w
			[19.18171, -1.55E-8],		// a
			[0.047318, 7.45E-9],		// e
			[142.5905, 0.011725806]);	// M

const Neptune = new Body("Neptune",
			[131.7806, 3.0173E-5],		// N
			[1.7700, -2.55E-7],			// i
			[272.8461, -6.027E-6],		// w
			[30.05826, 3.313E-8],		// a
			[0.008606, 2.15E-9],		// e
			[260.2471, 0.005995147]);	// M

const solarSystem = [Sun, Mercury, Venus, Moon, Mars, Jupiter, Saturn, Uranus, Neptune];

// Return number of days since 2000 Jan 0.0 TDT
// Day 0 = 1999-12-31 00:00:00 aka 2000-01-00 00:00:00
// For simplicity, ignore the difference between UT and TDT
function dayNumber(year, month, day, ut) {
	// dn = 367*y - 7 * ( y + (m+9)/12 ) / 4 - 3 * ( ( y + (m-9)/7 ) / 100 + 1 ) / 4 + 275*m/9 + D - 730515
	// Use integer division everywhere except for the ut fraction
	const d1 = 367 * year;
	const d2 = int(7 * (year + int((month + 9) / 12)) / 4);
	const d3 = 3 * int((int(( year + int((month-9)/7)  ) / 100) + 1 ) / 4);
	const d4 = int(275 * month / 9);
	const dn = d1 - d2 - d3 + d4 + day - 730515 + ut / 24;
	//console.log(d1,d2,d3,d4,dn); 
	return dn;
}

