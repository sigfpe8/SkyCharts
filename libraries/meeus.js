// All functions in this library are based on
//   "Astronomical Algorithms", Jean Meeus, 1991

// Return the Julian Day for a given date
//   or -1 if bad date
//
//   year 0 = 1 B.C.E, year -1 = 2 B.C.E, etc.
//   JD 0.0 = year -4712, month = 1, day = 1.5
//
//   The day can include fractions and the JD for a date
//   begins at noon.
function JD(year, month, day) {
	if (year < -4712 || month < 1 || month > 12 || day > 32)
		return -1;

	if (month < 3) {
		--year;
		month += 12;
	}

	let a = int(year / 100);
	let b = 2 - a + int(a / 4);

	// Julian Calendar?
	if (year < 1582 ||
		(year == 1582 &&
			(month < 10 ||
			(month == 10 && day < 5))))
		b = 0;

	return int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + b - 1524.5;
}

// Return the Modified Julian Day for a given date
//   or -1 if bad date
//   MJD starts at midnight of November 17, 1858.
function MJD(year, month, day) {
	let jd = JD(year, month, day);
	return jd < 0 ? -1 : jd - 2400000.5;
}

// Return the weekday for a given date
//  0 = Sunday, 1 = Monday, ... 6 = Saturday
//  or -1 if bad date
function weekDay(year, month, day) {
	let jd = JD(year, month, int(day));
	if (jd < 0) return -1;

	return (jd + 1.5) % 7;
}

// Return the calendar day for a given Julian Day (JD)
//  [year,month,day]
//  or [0,0,0] if invalid JD
function dateFromJD(jd) {
	if (jd < 0) return [0,0,0];

	jd += 0.5;
	let z = int(jd);
	let f = jd - z;

	let a;
	if (z < 2299161) {
		a = z;
	} else {
		let alpha = int((z - 1867216.25) / 36524.25);
		a = z + 1 + alpha - int(alpha / 4);
	}

	let b = a + 1524;
	let c = int((b - 122.1) / 365.25);
	let d = int(365.25 * c);
	let e = int((b - d) / 30.6001);

	let day = b - d - int(30.6001 * e) + f;
	let month = e < 14 ? e - 1 : e - 13;
	let year = month > 2 ? c - 4716 : c - 4715;

	return [year, month, day];
}
