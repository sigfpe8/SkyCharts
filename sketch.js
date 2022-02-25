let stars = [];
let stars_dic = {};
let bsc;
let iau;

// Controls
let sldMag;			// Magnitude slider
let selChartType;	// Chart type selection
let chartType;
let selColorScheme;	// Color scheme selection
let colorScheme;
let color_index;
let cbxSolarSys;	// Show solar system?
let cbxDrawEcliptic;// Show ecliptic?
let cbxDrawGrid;	// Show grid?

// Degree superscripts
const deg_sup  = "°";
const min_sup  = "'";
const sec_sup  = '"';

// Hour angle superscripts
const hang_sup = "ʰ";
const mang_sup = "ᵐ";
const sang_sup = "ˢ";

// Other symbols
const symb_alpha = "α";
const symb_delta = "δ";

// The Chart objects
let theChart;		// Current active chart
let ellipChart;		// The elliptical chart
let rectChart;		// The rectangular chart
let polarChart;		// The polar chart

// Color scheme
const color_scheme = [
	{ sky: 0, star: 255, star_name: 180, grid: 120, mouse: 180, eclp: 180 },	// Dark (white stars over black sky)
	{ sky: 240, star: 0, star_name: 0, grid: 200, mouse: 200, eclp: 200   },	// Light (black stars over grey sky)
	{ sky: [0, 51, 128], star: 255, star_name: 180, grid: 140, mouse: [126, 192, 238], eclp: [180, 180, 0]  },	// Dark blue
];

// Margins around the inner frame
const xMargins = 8;			// Left and right margins
const yMargins = 8;			// Top and bottom margins

// What to show
let show_grid = true;
let show_ecliptic = true;
let show_solar_system = true;

// Celestial poles [x, y, diam, name, stars, dic]
let north_pole;
let south_pole;

let do_redraw = false;
let hover_star = null;

let cnv;			// The Canvas object
const cpw = 200;	// Control panel width
const cph = 200;	// Control panel height

let dspMag;		// Display current magnitude

const epsln = 23.43642	// 23.43642° = 23°26′11.1″ 
let cose;				// cos(epsln)
let sine;				// sin(epsln)


function preload() {
	// Read in the Bright Star Catalog
	bsc = loadStrings('catalog');
	// Read in the IAU Star Names Catalog
	// https://www.iau.org/public/themes/naming_stars/
	iau = loadStrings('iau_stars.csv');
}

function setup() {
	//loadBSC();
	loadIAU();
	console.log("nstars = ", stars.length);
	angleMode(DEGREES);
	cose = cos(epsln);
	sine = sin(epsln);

	// The Canvas object
	let cvw = windowWidth - cpw;
	if (cvw < 200) cvw = 200;
	cvw = 1000;
	let cnv = createCanvas(cvw, cvw / 2);
	cnv.position(cpw, 0);

	// Dictionaries used to identify a star by cursor hovering near it
	createDics();

	// Create the Chart objects
	ellipChart  = new EllipticalChart();
	rectChart   = new RectangularChart();
	polarChart  = new PolarChart();
	theChart = rectChart;

	// Sliders, check-boxes, etc
	createControls();

	noLoop();
}

function createControls() {
	createP("Chart type")
	selChartType = createSelect();
	selChartType.option("Rectangular");
	selChartType.option("Polar");
	selChartType.option("Elliptical");
	selChartType.style('width', '150px');
	selChartType.value("Rectangular");
	selChartType.changed(chartTypeChanged);
//	chartTypeChanged();
	createP();

	createP("Color scheme")
	selColorScheme = createSelect();
	selColorScheme.option("Dark");
	selColorScheme.option("Light");
	selColorScheme.option("Blue");
	selColorScheme.value("Blue");
	selColorScheme.changed(colorSchemeChanged);
	colorSchemeChanged();
  
	dspMag = createP("Magnitude");
	sldMag = createSlider(-2, 8, 2, 0.2);
	sldMag.input(sldMagChanged);

	createP("<hr>");

	cbxDrawEcliptic = createCheckbox("Show ecliptic", true);
	cbxDrawEcliptic.changed(cbxDrawEclipticChanged);
	cbxDrawEclipticChanged();

	cbxSolarSys = createCheckbox("Show Solar System", true);
	cbxSolarSys.changed(cbxSolarSysChanged);
	cbxSolarSysChanged();

	cbxDrawGrid = createCheckbox("Show grid", true);
	cbxDrawGrid.changed(cbxDrawGridChanged);
	cbxDrawGridChanged();

	createP("<hr>");
}

function loadBSC() {
	for (let st of bsc) {
		const name = st.substr(5-1,10);

		const RAh = int(st.substr(76-1,2));
		const RAm = int(st.substr(78-1,2));
		const RAs = float(st.substr(80-1,4));
		const RA = RAh + (RAm / 60) + (RAs / 3660);

		const DEd = int(st.substr(85-1,2));
		const DEm = int(st.substr(87-1,2));
		const DEs = int(st.substr(89-1,2));
		const DE = DEd + (DEm / 60) + (DEs / 3600);
		if (st.substr(84-1,1) == "-") DE = -DE;

		const Vmag = float(st.substr(103-1,5));

		if (!isNaN(RAh) && !isNaN(DEd)) { // Discard invalid/incomplete entries
			if (Vmag <= 3 && DE <= 80 && DE >= -80)
				stars.push([name, RA, DE, Vmag]);
		}
	}
}

function loadIAU() {
	for (let str of iau) {
		let st = split(str, ',');
		let name = st[0];
		let RA = st[7] * 24 / 360;
		let DE = float(st[8]);
		let Vmag = float(st[6]);

//		if (Vmag <= 5 && DE <= 80 && DE >= -80)
		if (DE <= 89 && DE >= -89)
			stars.push([name, RA, DE, Vmag]);
	}
}

function starHash(ra, de) {
	// Preserve 1 decimal of RA but only the integer part of the DE
	// Key = int(RA * 10) * 1000 + abs(RE)
	const hash = int(ra * 10) * 1000 + int(abs(de));
	return de < 0 ? -hash : hash;
}

function createDics() {
	let north_stars = [];
	let south_stars = [];
	let north_dic = {};
	let south_dic = {};
	let val;

	//const stars = [["Alpha", 1, -20, 0], ["Beta", 2, 40, 0], ["Gamma", 18, 60, 0], ["Delta", 2, -40, 0]];
	for (st of stars) {
		// st = [name, RA, DE, Vmag]
		// Add start to appropriate hemisphere
		let key = starHash(st[1], st[2]);
		if (st[2] >= 0) {
			val = key in north_dic ? north_dic[key] : [];
			val.push(st);
			north_dic[key] = val;
			north_stars.push(st);
		} else {
			val = key in south_dic ? south_dic[key] : [];
			val.push(st);
			south_dic[key] = val;
			south_stars.push(st);
		}
		// Full sky dictionary
		val = key in stars_dic ? stars_dic[key] : [];
		val.push(st);
		stars_dic[key] = val;
	}

	// [x, y, diam, name, stars, dic]
	north_pole = [width / 4, height / 2, height, "NP", north_stars, north_dic];
	south_pole = [(3 * width) / 4, height / 2, height, "SP", south_stars, south_dic];
}

function draw() {
	theChart.drawFrame();
	if (show_grid)
		theChart.drawGrid();
	if (show_ecliptic)
	 	theChart.drawEcliptic();
	theChart.drawStars();
	if (show_solar_system)
		theChart.drawSolarSystem();
	if (hover_star) {
		drawStarLabel();
		hover_star = null;
	}
	dspMag.html("Magnitude <= " + sldMag.value());
}

function drawStarLabel() {
	const RA = hoursToRA(hover_star[1]);
	const DE = degreesToDE(hover_star[2]);
	const M = hover_star[3];
	const [x, y] = theChart.RADEtoXY(hover_star[1],hover_star[2]);
	console.log("drawStarLabel():",hover_star[0],"RA=",RA,"DE=",DE,"x=",mouseX,"y=",mouseY);
	fill(color_scheme[color_index].mouse);
	text(hover_star[0]+"\n"+symb_alpha+"="+RA+"\n"+symb_delta+"="+DE+"\n"+"Mag="+M, x + 10, y);
	do_redraw = true;  // Erase this label when the mouse moves again
}

function sldMagChanged() {
	redraw();
}

function colorSchemeChanged() {
	let newScheme = selColorScheme.value();
	if (newScheme != colorScheme) {
		colorScheme = newScheme;
		switch (colorScheme) {
		case 'Dark':
			color_index = 0;
			break;
		case 'Light':
			color_index = 1;
			break;
		case 'Blue':
			color_index = 2;
			break;
		}
		redraw();
	}
}

function chartTypeChanged() {
	let newType = selChartType.value();
	if (newType != chartType) {
		chartType = newType;
		switch (chartType) {
		case 'Rectangular':
			// draw = rectDraw;
			// mouseMoved = rectMouseMoved;
			theChart = rectChart;
			break;
		case 'Polar':
			// draw = polarDraw;
			// mouseMoved = polarMouseMoved;
			theChart = polarChart;
			break;
		case 'Elliptical':
			// draw = ellipDraw;
			// mouseMoved = ellipMouseMoved;
			theChart = ellipChart;
			break;
		}
		redraw();
	}
	// theChart = selChartType.value();
	// redraw();
}

function cbxSolarSysChanged() {
	show_solar_system = cbxSolarSys.checked();
	redraw();
}

function cbxDrawGridChanged() {
	show_grid = cbxDrawGrid.checked();
	redraw();
}

function cbxDrawEclipticChanged() {
	show_ecliptic = cbxDrawEcliptic.checked();
	redraw();
}

function mouseMoved() {
	if (theChart.checkMouse())
		redraw();
	else if (do_redraw) {
		redraw();
		do_redraw = false;
	}
}


// https://en.wikipedia.org/wiki/Position_of_the_Sun
function sunPosition(jd) {
	const n = jd - 2451545.0;
	const L = (280.460 + 0.9856474 * n + 360) % 360;
	const g = (357.528 + 0.9856003 * n + 360) % 360;
	const l = L + 1.915 * sin(g) + 0.020 * sin(2 * g);
	const e = 23.439 - 0.0000004 * n;
	const RAa = (atan2(cos(e) * sin(l), cos(l)) + 360) % 360;
	const RA = (RAa * 24) / 360;
	const DE = asin(sin(e) * sin(l));
	return [RA,DE];
}

// Return the Easter date for a given year using Gauss's algorithm
// Conceitos de Astronomia, R. Boczko, (1984, p. 25)
//
//   In:  1582 <= year <= 2499
//   Out: [month, day] both starting from 1
//        [0, 0] if invalid year is passed
function gaussEasterDate(year) {
	let m, n;

	if (year < 1582) return [0,0];
	if (year <= 1699)      { m = 22; n = 3; }
	else if (year <= 1799) { m = 23; n = 3; }
	else if (year <= 1899) { m = 23; n = 4; }
	else if (year <= 1999) { m = 24; n = 5; }
	else if (year <= 2099) { m = 24; n = 5; }
	else if (year <= 2199) { m = 24; n = 6; }
	else if (year <= 2299) { m = 25; n = 0; }
	else if (year <= 2399) { m = 26; n = 1; }
	else if (year <= 2499) { m = 25; n = 1; }
	else return [0,0];

	let a = year % 19;
	let b = year % 4;
	let c = year % 7;
	let d = (19 * a + m) % 30;
	let e = (2 * b + 4 * c + 6 * d + n) % 7;

	let day = 22 + d + e;
	let month = 3;	// Assume March

	if (day > 31) {	// April
		month = 4;
		day = d + e - 9;
		if (day > 25)
			day = day - 7;
	}

	return [month, day];
}

// Return the Easter date for a given year
// The Art of Computer Programming - Vol 1 (2nd ed, p 155,156)
//
//   In:  1582 <= year
//   Out: [month, day] both starting from 1
//        [0, 0] if invalid year is passed
function knuthEasterDate(year) {
	if (year < 1582) return [0,0];

	// E1. [Golden number]
	let g = (year % 19) + 1;
	// E2. [Century]
	let c = Math.floor(year / 100) + 1;
	// E3. [Corrections]
	let x = Math.floor(3 * c / 4) - 12;
	let z = Math.floor((8 * c + 5) / 25) - 5;
	// E4. [Find Sunday]
	let d = Math.floor(5 * year / 4) - x - 10;
	// E5. [Epact]
	let e = (11 * g + 20 + z - x) % 30;
	if ((e == 25 && g > 11) || (e == 24)) ++e;
	// E6. [Find full moon]
	let n = 44 - e;
	if (n < 21) n = n + 30;
	// E7. [Advance to Sunday]
	let day = n + 7 - ((d + n) % 7);
	let month = 3; // Assume March

	if (day > 31) { // April
		month = 4;
		day = day - 31;
	}
	
	return [month, day];
}

function hmsToHours(hrs, min, sec) {
	return ((sec / 60) + min) / 60 + hrs;
}

function hoursToRA(hours) {
	let ra = hoursToHms(hours);
	return (ra[0] + hang_sup) + " " + (ra[1] + mang_sup) + " " + (int(ra[2]) + sang_sup); 
}

function degreesToDE(deg) {
	let sg = deg < 0 ? "-" : "";
	let de = hoursToHms(abs(deg));
	return (sg + de[0] + deg_sup) + " " + (de[1] + min_sup) + " " + (int(de[2]) + sec_sup); 
}

function hoursToHms(hours) {
	let hrs = int(hours);
	let tmp = (hours - hrs) * 60; // Decimal minutes
	let min = int(tmp);
	let sec = (tmp - min) * 60

	return [hrs, min, sec];
}
