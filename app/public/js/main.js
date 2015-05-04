(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var App, IS_LIVE, view;

App = require('./App');


/*

WIP - this will ideally change to old format (above) when can figure it out
 */

IS_LIVE = false;

view = IS_LIVE ? {} : window || document;

view.CD = new App(IS_LIVE);

view.CD.init();



},{"./App":6}],2:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
var punycode = require('punycode');
var revEntities = require('./reversed.json');

module.exports = encode;

function encode (str, opts) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected a String');
    }
    if (!opts) opts = {};

    var numeric = true;
    if (opts.named) numeric = false;
    if (opts.numeric !== undefined) numeric = opts.numeric;

    var special = opts.special || {
        '"': true, "'": true,
        '<': true, '>': true,
        '&': true
    };

    var codePoints = punycode.ucs2.decode(str);
    var chars = [];
    for (var i = 0; i < codePoints.length; i++) {
        var cc = codePoints[i];
        var c = punycode.ucs2.encode([ cc ]);
        var e = revEntities[cc];
        if (e && (cc >= 127 || special[c]) && !numeric) {
            chars.push('&' + (/;$/.test(e) ? e : e + ';'));
        }
        else if (cc < 32 || cc >= 127 || special[c]) {
            chars.push('&#' + cc + ';');
        }
        else {
            chars.push(c);
        }
    }
    return chars.join('');
}

},{"./reversed.json":4,"punycode":2}],4:[function(require,module,exports){
module.exports={
    "9": "Tab;",
    "10": "NewLine;",
    "33": "excl;",
    "34": "quot;",
    "35": "num;",
    "36": "dollar;",
    "37": "percnt;",
    "38": "amp;",
    "39": "apos;",
    "40": "lpar;",
    "41": "rpar;",
    "42": "midast;",
    "43": "plus;",
    "44": "comma;",
    "46": "period;",
    "47": "sol;",
    "58": "colon;",
    "59": "semi;",
    "60": "lt;",
    "61": "equals;",
    "62": "gt;",
    "63": "quest;",
    "64": "commat;",
    "91": "lsqb;",
    "92": "bsol;",
    "93": "rsqb;",
    "94": "Hat;",
    "95": "UnderBar;",
    "96": "grave;",
    "123": "lcub;",
    "124": "VerticalLine;",
    "125": "rcub;",
    "160": "NonBreakingSpace;",
    "161": "iexcl;",
    "162": "cent;",
    "163": "pound;",
    "164": "curren;",
    "165": "yen;",
    "166": "brvbar;",
    "167": "sect;",
    "168": "uml;",
    "169": "copy;",
    "170": "ordf;",
    "171": "laquo;",
    "172": "not;",
    "173": "shy;",
    "174": "reg;",
    "175": "strns;",
    "176": "deg;",
    "177": "pm;",
    "178": "sup2;",
    "179": "sup3;",
    "180": "DiacriticalAcute;",
    "181": "micro;",
    "182": "para;",
    "183": "middot;",
    "184": "Cedilla;",
    "185": "sup1;",
    "186": "ordm;",
    "187": "raquo;",
    "188": "frac14;",
    "189": "half;",
    "190": "frac34;",
    "191": "iquest;",
    "192": "Agrave;",
    "193": "Aacute;",
    "194": "Acirc;",
    "195": "Atilde;",
    "196": "Auml;",
    "197": "Aring;",
    "198": "AElig;",
    "199": "Ccedil;",
    "200": "Egrave;",
    "201": "Eacute;",
    "202": "Ecirc;",
    "203": "Euml;",
    "204": "Igrave;",
    "205": "Iacute;",
    "206": "Icirc;",
    "207": "Iuml;",
    "208": "ETH;",
    "209": "Ntilde;",
    "210": "Ograve;",
    "211": "Oacute;",
    "212": "Ocirc;",
    "213": "Otilde;",
    "214": "Ouml;",
    "215": "times;",
    "216": "Oslash;",
    "217": "Ugrave;",
    "218": "Uacute;",
    "219": "Ucirc;",
    "220": "Uuml;",
    "221": "Yacute;",
    "222": "THORN;",
    "223": "szlig;",
    "224": "agrave;",
    "225": "aacute;",
    "226": "acirc;",
    "227": "atilde;",
    "228": "auml;",
    "229": "aring;",
    "230": "aelig;",
    "231": "ccedil;",
    "232": "egrave;",
    "233": "eacute;",
    "234": "ecirc;",
    "235": "euml;",
    "236": "igrave;",
    "237": "iacute;",
    "238": "icirc;",
    "239": "iuml;",
    "240": "eth;",
    "241": "ntilde;",
    "242": "ograve;",
    "243": "oacute;",
    "244": "ocirc;",
    "245": "otilde;",
    "246": "ouml;",
    "247": "divide;",
    "248": "oslash;",
    "249": "ugrave;",
    "250": "uacute;",
    "251": "ucirc;",
    "252": "uuml;",
    "253": "yacute;",
    "254": "thorn;",
    "255": "yuml;",
    "256": "Amacr;",
    "257": "amacr;",
    "258": "Abreve;",
    "259": "abreve;",
    "260": "Aogon;",
    "261": "aogon;",
    "262": "Cacute;",
    "263": "cacute;",
    "264": "Ccirc;",
    "265": "ccirc;",
    "266": "Cdot;",
    "267": "cdot;",
    "268": "Ccaron;",
    "269": "ccaron;",
    "270": "Dcaron;",
    "271": "dcaron;",
    "272": "Dstrok;",
    "273": "dstrok;",
    "274": "Emacr;",
    "275": "emacr;",
    "278": "Edot;",
    "279": "edot;",
    "280": "Eogon;",
    "281": "eogon;",
    "282": "Ecaron;",
    "283": "ecaron;",
    "284": "Gcirc;",
    "285": "gcirc;",
    "286": "Gbreve;",
    "287": "gbreve;",
    "288": "Gdot;",
    "289": "gdot;",
    "290": "Gcedil;",
    "292": "Hcirc;",
    "293": "hcirc;",
    "294": "Hstrok;",
    "295": "hstrok;",
    "296": "Itilde;",
    "297": "itilde;",
    "298": "Imacr;",
    "299": "imacr;",
    "302": "Iogon;",
    "303": "iogon;",
    "304": "Idot;",
    "305": "inodot;",
    "306": "IJlig;",
    "307": "ijlig;",
    "308": "Jcirc;",
    "309": "jcirc;",
    "310": "Kcedil;",
    "311": "kcedil;",
    "312": "kgreen;",
    "313": "Lacute;",
    "314": "lacute;",
    "315": "Lcedil;",
    "316": "lcedil;",
    "317": "Lcaron;",
    "318": "lcaron;",
    "319": "Lmidot;",
    "320": "lmidot;",
    "321": "Lstrok;",
    "322": "lstrok;",
    "323": "Nacute;",
    "324": "nacute;",
    "325": "Ncedil;",
    "326": "ncedil;",
    "327": "Ncaron;",
    "328": "ncaron;",
    "329": "napos;",
    "330": "ENG;",
    "331": "eng;",
    "332": "Omacr;",
    "333": "omacr;",
    "336": "Odblac;",
    "337": "odblac;",
    "338": "OElig;",
    "339": "oelig;",
    "340": "Racute;",
    "341": "racute;",
    "342": "Rcedil;",
    "343": "rcedil;",
    "344": "Rcaron;",
    "345": "rcaron;",
    "346": "Sacute;",
    "347": "sacute;",
    "348": "Scirc;",
    "349": "scirc;",
    "350": "Scedil;",
    "351": "scedil;",
    "352": "Scaron;",
    "353": "scaron;",
    "354": "Tcedil;",
    "355": "tcedil;",
    "356": "Tcaron;",
    "357": "tcaron;",
    "358": "Tstrok;",
    "359": "tstrok;",
    "360": "Utilde;",
    "361": "utilde;",
    "362": "Umacr;",
    "363": "umacr;",
    "364": "Ubreve;",
    "365": "ubreve;",
    "366": "Uring;",
    "367": "uring;",
    "368": "Udblac;",
    "369": "udblac;",
    "370": "Uogon;",
    "371": "uogon;",
    "372": "Wcirc;",
    "373": "wcirc;",
    "374": "Ycirc;",
    "375": "ycirc;",
    "376": "Yuml;",
    "377": "Zacute;",
    "378": "zacute;",
    "379": "Zdot;",
    "380": "zdot;",
    "381": "Zcaron;",
    "382": "zcaron;",
    "402": "fnof;",
    "437": "imped;",
    "501": "gacute;",
    "567": "jmath;",
    "710": "circ;",
    "711": "Hacek;",
    "728": "breve;",
    "729": "dot;",
    "730": "ring;",
    "731": "ogon;",
    "732": "tilde;",
    "733": "DiacriticalDoubleAcute;",
    "785": "DownBreve;",
    "913": "Alpha;",
    "914": "Beta;",
    "915": "Gamma;",
    "916": "Delta;",
    "917": "Epsilon;",
    "918": "Zeta;",
    "919": "Eta;",
    "920": "Theta;",
    "921": "Iota;",
    "922": "Kappa;",
    "923": "Lambda;",
    "924": "Mu;",
    "925": "Nu;",
    "926": "Xi;",
    "927": "Omicron;",
    "928": "Pi;",
    "929": "Rho;",
    "931": "Sigma;",
    "932": "Tau;",
    "933": "Upsilon;",
    "934": "Phi;",
    "935": "Chi;",
    "936": "Psi;",
    "937": "Omega;",
    "945": "alpha;",
    "946": "beta;",
    "947": "gamma;",
    "948": "delta;",
    "949": "epsilon;",
    "950": "zeta;",
    "951": "eta;",
    "952": "theta;",
    "953": "iota;",
    "954": "kappa;",
    "955": "lambda;",
    "956": "mu;",
    "957": "nu;",
    "958": "xi;",
    "959": "omicron;",
    "960": "pi;",
    "961": "rho;",
    "962": "varsigma;",
    "963": "sigma;",
    "964": "tau;",
    "965": "upsilon;",
    "966": "phi;",
    "967": "chi;",
    "968": "psi;",
    "969": "omega;",
    "977": "vartheta;",
    "978": "upsih;",
    "981": "varphi;",
    "982": "varpi;",
    "988": "Gammad;",
    "989": "gammad;",
    "1008": "varkappa;",
    "1009": "varrho;",
    "1013": "varepsilon;",
    "1014": "bepsi;",
    "1025": "IOcy;",
    "1026": "DJcy;",
    "1027": "GJcy;",
    "1028": "Jukcy;",
    "1029": "DScy;",
    "1030": "Iukcy;",
    "1031": "YIcy;",
    "1032": "Jsercy;",
    "1033": "LJcy;",
    "1034": "NJcy;",
    "1035": "TSHcy;",
    "1036": "KJcy;",
    "1038": "Ubrcy;",
    "1039": "DZcy;",
    "1040": "Acy;",
    "1041": "Bcy;",
    "1042": "Vcy;",
    "1043": "Gcy;",
    "1044": "Dcy;",
    "1045": "IEcy;",
    "1046": "ZHcy;",
    "1047": "Zcy;",
    "1048": "Icy;",
    "1049": "Jcy;",
    "1050": "Kcy;",
    "1051": "Lcy;",
    "1052": "Mcy;",
    "1053": "Ncy;",
    "1054": "Ocy;",
    "1055": "Pcy;",
    "1056": "Rcy;",
    "1057": "Scy;",
    "1058": "Tcy;",
    "1059": "Ucy;",
    "1060": "Fcy;",
    "1061": "KHcy;",
    "1062": "TScy;",
    "1063": "CHcy;",
    "1064": "SHcy;",
    "1065": "SHCHcy;",
    "1066": "HARDcy;",
    "1067": "Ycy;",
    "1068": "SOFTcy;",
    "1069": "Ecy;",
    "1070": "YUcy;",
    "1071": "YAcy;",
    "1072": "acy;",
    "1073": "bcy;",
    "1074": "vcy;",
    "1075": "gcy;",
    "1076": "dcy;",
    "1077": "iecy;",
    "1078": "zhcy;",
    "1079": "zcy;",
    "1080": "icy;",
    "1081": "jcy;",
    "1082": "kcy;",
    "1083": "lcy;",
    "1084": "mcy;",
    "1085": "ncy;",
    "1086": "ocy;",
    "1087": "pcy;",
    "1088": "rcy;",
    "1089": "scy;",
    "1090": "tcy;",
    "1091": "ucy;",
    "1092": "fcy;",
    "1093": "khcy;",
    "1094": "tscy;",
    "1095": "chcy;",
    "1096": "shcy;",
    "1097": "shchcy;",
    "1098": "hardcy;",
    "1099": "ycy;",
    "1100": "softcy;",
    "1101": "ecy;",
    "1102": "yucy;",
    "1103": "yacy;",
    "1105": "iocy;",
    "1106": "djcy;",
    "1107": "gjcy;",
    "1108": "jukcy;",
    "1109": "dscy;",
    "1110": "iukcy;",
    "1111": "yicy;",
    "1112": "jsercy;",
    "1113": "ljcy;",
    "1114": "njcy;",
    "1115": "tshcy;",
    "1116": "kjcy;",
    "1118": "ubrcy;",
    "1119": "dzcy;",
    "8194": "ensp;",
    "8195": "emsp;",
    "8196": "emsp13;",
    "8197": "emsp14;",
    "8199": "numsp;",
    "8200": "puncsp;",
    "8201": "ThinSpace;",
    "8202": "VeryThinSpace;",
    "8203": "ZeroWidthSpace;",
    "8204": "zwnj;",
    "8205": "zwj;",
    "8206": "lrm;",
    "8207": "rlm;",
    "8208": "hyphen;",
    "8211": "ndash;",
    "8212": "mdash;",
    "8213": "horbar;",
    "8214": "Vert;",
    "8216": "OpenCurlyQuote;",
    "8217": "rsquor;",
    "8218": "sbquo;",
    "8220": "OpenCurlyDoubleQuote;",
    "8221": "rdquor;",
    "8222": "ldquor;",
    "8224": "dagger;",
    "8225": "ddagger;",
    "8226": "bullet;",
    "8229": "nldr;",
    "8230": "mldr;",
    "8240": "permil;",
    "8241": "pertenk;",
    "8242": "prime;",
    "8243": "Prime;",
    "8244": "tprime;",
    "8245": "bprime;",
    "8249": "lsaquo;",
    "8250": "rsaquo;",
    "8254": "OverBar;",
    "8257": "caret;",
    "8259": "hybull;",
    "8260": "frasl;",
    "8271": "bsemi;",
    "8279": "qprime;",
    "8287": "MediumSpace;",
    "8288": "NoBreak;",
    "8289": "ApplyFunction;",
    "8290": "it;",
    "8291": "InvisibleComma;",
    "8364": "euro;",
    "8411": "TripleDot;",
    "8412": "DotDot;",
    "8450": "Copf;",
    "8453": "incare;",
    "8458": "gscr;",
    "8459": "Hscr;",
    "8460": "Poincareplane;",
    "8461": "quaternions;",
    "8462": "planckh;",
    "8463": "plankv;",
    "8464": "Iscr;",
    "8465": "imagpart;",
    "8466": "Lscr;",
    "8467": "ell;",
    "8469": "Nopf;",
    "8470": "numero;",
    "8471": "copysr;",
    "8472": "wp;",
    "8473": "primes;",
    "8474": "rationals;",
    "8475": "Rscr;",
    "8476": "Rfr;",
    "8477": "Ropf;",
    "8478": "rx;",
    "8482": "trade;",
    "8484": "Zopf;",
    "8487": "mho;",
    "8488": "Zfr;",
    "8489": "iiota;",
    "8492": "Bscr;",
    "8493": "Cfr;",
    "8495": "escr;",
    "8496": "expectation;",
    "8497": "Fscr;",
    "8499": "phmmat;",
    "8500": "oscr;",
    "8501": "aleph;",
    "8502": "beth;",
    "8503": "gimel;",
    "8504": "daleth;",
    "8517": "DD;",
    "8518": "DifferentialD;",
    "8519": "exponentiale;",
    "8520": "ImaginaryI;",
    "8531": "frac13;",
    "8532": "frac23;",
    "8533": "frac15;",
    "8534": "frac25;",
    "8535": "frac35;",
    "8536": "frac45;",
    "8537": "frac16;",
    "8538": "frac56;",
    "8539": "frac18;",
    "8540": "frac38;",
    "8541": "frac58;",
    "8542": "frac78;",
    "8592": "slarr;",
    "8593": "uparrow;",
    "8594": "srarr;",
    "8595": "ShortDownArrow;",
    "8596": "leftrightarrow;",
    "8597": "varr;",
    "8598": "UpperLeftArrow;",
    "8599": "UpperRightArrow;",
    "8600": "searrow;",
    "8601": "swarrow;",
    "8602": "nleftarrow;",
    "8603": "nrightarrow;",
    "8605": "rightsquigarrow;",
    "8606": "twoheadleftarrow;",
    "8607": "Uarr;",
    "8608": "twoheadrightarrow;",
    "8609": "Darr;",
    "8610": "leftarrowtail;",
    "8611": "rightarrowtail;",
    "8612": "mapstoleft;",
    "8613": "UpTeeArrow;",
    "8614": "RightTeeArrow;",
    "8615": "mapstodown;",
    "8617": "larrhk;",
    "8618": "rarrhk;",
    "8619": "looparrowleft;",
    "8620": "rarrlp;",
    "8621": "leftrightsquigarrow;",
    "8622": "nleftrightarrow;",
    "8624": "lsh;",
    "8625": "rsh;",
    "8626": "ldsh;",
    "8627": "rdsh;",
    "8629": "crarr;",
    "8630": "curvearrowleft;",
    "8631": "curvearrowright;",
    "8634": "olarr;",
    "8635": "orarr;",
    "8636": "lharu;",
    "8637": "lhard;",
    "8638": "upharpoonright;",
    "8639": "upharpoonleft;",
    "8640": "RightVector;",
    "8641": "rightharpoondown;",
    "8642": "RightDownVector;",
    "8643": "LeftDownVector;",
    "8644": "rlarr;",
    "8645": "UpArrowDownArrow;",
    "8646": "lrarr;",
    "8647": "llarr;",
    "8648": "uuarr;",
    "8649": "rrarr;",
    "8650": "downdownarrows;",
    "8651": "ReverseEquilibrium;",
    "8652": "rlhar;",
    "8653": "nLeftarrow;",
    "8654": "nLeftrightarrow;",
    "8655": "nRightarrow;",
    "8656": "Leftarrow;",
    "8657": "Uparrow;",
    "8658": "Rightarrow;",
    "8659": "Downarrow;",
    "8660": "Leftrightarrow;",
    "8661": "vArr;",
    "8662": "nwArr;",
    "8663": "neArr;",
    "8664": "seArr;",
    "8665": "swArr;",
    "8666": "Lleftarrow;",
    "8667": "Rrightarrow;",
    "8669": "zigrarr;",
    "8676": "LeftArrowBar;",
    "8677": "RightArrowBar;",
    "8693": "duarr;",
    "8701": "loarr;",
    "8702": "roarr;",
    "8703": "hoarr;",
    "8704": "forall;",
    "8705": "complement;",
    "8706": "PartialD;",
    "8707": "Exists;",
    "8708": "NotExists;",
    "8709": "varnothing;",
    "8711": "nabla;",
    "8712": "isinv;",
    "8713": "notinva;",
    "8715": "SuchThat;",
    "8716": "NotReverseElement;",
    "8719": "Product;",
    "8720": "Coproduct;",
    "8721": "sum;",
    "8722": "minus;",
    "8723": "mp;",
    "8724": "plusdo;",
    "8726": "ssetmn;",
    "8727": "lowast;",
    "8728": "SmallCircle;",
    "8730": "Sqrt;",
    "8733": "vprop;",
    "8734": "infin;",
    "8735": "angrt;",
    "8736": "angle;",
    "8737": "measuredangle;",
    "8738": "angsph;",
    "8739": "VerticalBar;",
    "8740": "nsmid;",
    "8741": "spar;",
    "8742": "nspar;",
    "8743": "wedge;",
    "8744": "vee;",
    "8745": "cap;",
    "8746": "cup;",
    "8747": "Integral;",
    "8748": "Int;",
    "8749": "tint;",
    "8750": "oint;",
    "8751": "DoubleContourIntegral;",
    "8752": "Cconint;",
    "8753": "cwint;",
    "8754": "cwconint;",
    "8755": "CounterClockwiseContourIntegral;",
    "8756": "therefore;",
    "8757": "because;",
    "8758": "ratio;",
    "8759": "Proportion;",
    "8760": "minusd;",
    "8762": "mDDot;",
    "8763": "homtht;",
    "8764": "Tilde;",
    "8765": "bsim;",
    "8766": "mstpos;",
    "8767": "acd;",
    "8768": "wreath;",
    "8769": "nsim;",
    "8770": "esim;",
    "8771": "TildeEqual;",
    "8772": "nsimeq;",
    "8773": "TildeFullEqual;",
    "8774": "simne;",
    "8775": "NotTildeFullEqual;",
    "8776": "TildeTilde;",
    "8777": "NotTildeTilde;",
    "8778": "approxeq;",
    "8779": "apid;",
    "8780": "bcong;",
    "8781": "CupCap;",
    "8782": "HumpDownHump;",
    "8783": "HumpEqual;",
    "8784": "esdot;",
    "8785": "eDot;",
    "8786": "fallingdotseq;",
    "8787": "risingdotseq;",
    "8788": "coloneq;",
    "8789": "eqcolon;",
    "8790": "eqcirc;",
    "8791": "cire;",
    "8793": "wedgeq;",
    "8794": "veeeq;",
    "8796": "trie;",
    "8799": "questeq;",
    "8800": "NotEqual;",
    "8801": "equiv;",
    "8802": "NotCongruent;",
    "8804": "leq;",
    "8805": "GreaterEqual;",
    "8806": "LessFullEqual;",
    "8807": "GreaterFullEqual;",
    "8808": "lneqq;",
    "8809": "gneqq;",
    "8810": "NestedLessLess;",
    "8811": "NestedGreaterGreater;",
    "8812": "twixt;",
    "8813": "NotCupCap;",
    "8814": "NotLess;",
    "8815": "NotGreater;",
    "8816": "NotLessEqual;",
    "8817": "NotGreaterEqual;",
    "8818": "lsim;",
    "8819": "gtrsim;",
    "8820": "NotLessTilde;",
    "8821": "NotGreaterTilde;",
    "8822": "lg;",
    "8823": "gtrless;",
    "8824": "ntlg;",
    "8825": "ntgl;",
    "8826": "Precedes;",
    "8827": "Succeeds;",
    "8828": "PrecedesSlantEqual;",
    "8829": "SucceedsSlantEqual;",
    "8830": "prsim;",
    "8831": "succsim;",
    "8832": "nprec;",
    "8833": "nsucc;",
    "8834": "subset;",
    "8835": "supset;",
    "8836": "nsub;",
    "8837": "nsup;",
    "8838": "SubsetEqual;",
    "8839": "supseteq;",
    "8840": "nsubseteq;",
    "8841": "nsupseteq;",
    "8842": "subsetneq;",
    "8843": "supsetneq;",
    "8845": "cupdot;",
    "8846": "uplus;",
    "8847": "SquareSubset;",
    "8848": "SquareSuperset;",
    "8849": "SquareSubsetEqual;",
    "8850": "SquareSupersetEqual;",
    "8851": "SquareIntersection;",
    "8852": "SquareUnion;",
    "8853": "oplus;",
    "8854": "ominus;",
    "8855": "otimes;",
    "8856": "osol;",
    "8857": "odot;",
    "8858": "ocir;",
    "8859": "oast;",
    "8861": "odash;",
    "8862": "plusb;",
    "8863": "minusb;",
    "8864": "timesb;",
    "8865": "sdotb;",
    "8866": "vdash;",
    "8867": "LeftTee;",
    "8868": "top;",
    "8869": "UpTee;",
    "8871": "models;",
    "8872": "vDash;",
    "8873": "Vdash;",
    "8874": "Vvdash;",
    "8875": "VDash;",
    "8876": "nvdash;",
    "8877": "nvDash;",
    "8878": "nVdash;",
    "8879": "nVDash;",
    "8880": "prurel;",
    "8882": "vltri;",
    "8883": "vrtri;",
    "8884": "trianglelefteq;",
    "8885": "trianglerighteq;",
    "8886": "origof;",
    "8887": "imof;",
    "8888": "mumap;",
    "8889": "hercon;",
    "8890": "intercal;",
    "8891": "veebar;",
    "8893": "barvee;",
    "8894": "angrtvb;",
    "8895": "lrtri;",
    "8896": "xwedge;",
    "8897": "xvee;",
    "8898": "xcap;",
    "8899": "xcup;",
    "8900": "diamond;",
    "8901": "sdot;",
    "8902": "Star;",
    "8903": "divonx;",
    "8904": "bowtie;",
    "8905": "ltimes;",
    "8906": "rtimes;",
    "8907": "lthree;",
    "8908": "rthree;",
    "8909": "bsime;",
    "8910": "cuvee;",
    "8911": "cuwed;",
    "8912": "Subset;",
    "8913": "Supset;",
    "8914": "Cap;",
    "8915": "Cup;",
    "8916": "pitchfork;",
    "8917": "epar;",
    "8918": "ltdot;",
    "8919": "gtrdot;",
    "8920": "Ll;",
    "8921": "ggg;",
    "8922": "LessEqualGreater;",
    "8923": "gtreqless;",
    "8926": "curlyeqprec;",
    "8927": "curlyeqsucc;",
    "8928": "nprcue;",
    "8929": "nsccue;",
    "8930": "nsqsube;",
    "8931": "nsqsupe;",
    "8934": "lnsim;",
    "8935": "gnsim;",
    "8936": "prnsim;",
    "8937": "succnsim;",
    "8938": "ntriangleleft;",
    "8939": "ntriangleright;",
    "8940": "ntrianglelefteq;",
    "8941": "ntrianglerighteq;",
    "8942": "vellip;",
    "8943": "ctdot;",
    "8944": "utdot;",
    "8945": "dtdot;",
    "8946": "disin;",
    "8947": "isinsv;",
    "8948": "isins;",
    "8949": "isindot;",
    "8950": "notinvc;",
    "8951": "notinvb;",
    "8953": "isinE;",
    "8954": "nisd;",
    "8955": "xnis;",
    "8956": "nis;",
    "8957": "notnivc;",
    "8958": "notnivb;",
    "8965": "barwedge;",
    "8966": "doublebarwedge;",
    "8968": "LeftCeiling;",
    "8969": "RightCeiling;",
    "8970": "lfloor;",
    "8971": "RightFloor;",
    "8972": "drcrop;",
    "8973": "dlcrop;",
    "8974": "urcrop;",
    "8975": "ulcrop;",
    "8976": "bnot;",
    "8978": "profline;",
    "8979": "profsurf;",
    "8981": "telrec;",
    "8982": "target;",
    "8988": "ulcorner;",
    "8989": "urcorner;",
    "8990": "llcorner;",
    "8991": "lrcorner;",
    "8994": "sfrown;",
    "8995": "ssmile;",
    "9005": "cylcty;",
    "9006": "profalar;",
    "9014": "topbot;",
    "9021": "ovbar;",
    "9023": "solbar;",
    "9084": "angzarr;",
    "9136": "lmoustache;",
    "9137": "rmoustache;",
    "9140": "tbrk;",
    "9141": "UnderBracket;",
    "9142": "bbrktbrk;",
    "9180": "OverParenthesis;",
    "9181": "UnderParenthesis;",
    "9182": "OverBrace;",
    "9183": "UnderBrace;",
    "9186": "trpezium;",
    "9191": "elinters;",
    "9251": "blank;",
    "9416": "oS;",
    "9472": "HorizontalLine;",
    "9474": "boxv;",
    "9484": "boxdr;",
    "9488": "boxdl;",
    "9492": "boxur;",
    "9496": "boxul;",
    "9500": "boxvr;",
    "9508": "boxvl;",
    "9516": "boxhd;",
    "9524": "boxhu;",
    "9532": "boxvh;",
    "9552": "boxH;",
    "9553": "boxV;",
    "9554": "boxdR;",
    "9555": "boxDr;",
    "9556": "boxDR;",
    "9557": "boxdL;",
    "9558": "boxDl;",
    "9559": "boxDL;",
    "9560": "boxuR;",
    "9561": "boxUr;",
    "9562": "boxUR;",
    "9563": "boxuL;",
    "9564": "boxUl;",
    "9565": "boxUL;",
    "9566": "boxvR;",
    "9567": "boxVr;",
    "9568": "boxVR;",
    "9569": "boxvL;",
    "9570": "boxVl;",
    "9571": "boxVL;",
    "9572": "boxHd;",
    "9573": "boxhD;",
    "9574": "boxHD;",
    "9575": "boxHu;",
    "9576": "boxhU;",
    "9577": "boxHU;",
    "9578": "boxvH;",
    "9579": "boxVh;",
    "9580": "boxVH;",
    "9600": "uhblk;",
    "9604": "lhblk;",
    "9608": "block;",
    "9617": "blk14;",
    "9618": "blk12;",
    "9619": "blk34;",
    "9633": "square;",
    "9642": "squf;",
    "9643": "EmptyVerySmallSquare;",
    "9645": "rect;",
    "9646": "marker;",
    "9649": "fltns;",
    "9651": "xutri;",
    "9652": "utrif;",
    "9653": "utri;",
    "9656": "rtrif;",
    "9657": "triangleright;",
    "9661": "xdtri;",
    "9662": "dtrif;",
    "9663": "triangledown;",
    "9666": "ltrif;",
    "9667": "triangleleft;",
    "9674": "lozenge;",
    "9675": "cir;",
    "9708": "tridot;",
    "9711": "xcirc;",
    "9720": "ultri;",
    "9721": "urtri;",
    "9722": "lltri;",
    "9723": "EmptySmallSquare;",
    "9724": "FilledSmallSquare;",
    "9733": "starf;",
    "9734": "star;",
    "9742": "phone;",
    "9792": "female;",
    "9794": "male;",
    "9824": "spadesuit;",
    "9827": "clubsuit;",
    "9829": "heartsuit;",
    "9830": "diams;",
    "9834": "sung;",
    "9837": "flat;",
    "9838": "natural;",
    "9839": "sharp;",
    "10003": "checkmark;",
    "10007": "cross;",
    "10016": "maltese;",
    "10038": "sext;",
    "10072": "VerticalSeparator;",
    "10098": "lbbrk;",
    "10099": "rbbrk;",
    "10184": "bsolhsub;",
    "10185": "suphsol;",
    "10214": "lobrk;",
    "10215": "robrk;",
    "10216": "LeftAngleBracket;",
    "10217": "RightAngleBracket;",
    "10218": "Lang;",
    "10219": "Rang;",
    "10220": "loang;",
    "10221": "roang;",
    "10229": "xlarr;",
    "10230": "xrarr;",
    "10231": "xharr;",
    "10232": "xlArr;",
    "10233": "xrArr;",
    "10234": "xhArr;",
    "10236": "xmap;",
    "10239": "dzigrarr;",
    "10498": "nvlArr;",
    "10499": "nvrArr;",
    "10500": "nvHarr;",
    "10501": "Map;",
    "10508": "lbarr;",
    "10509": "rbarr;",
    "10510": "lBarr;",
    "10511": "rBarr;",
    "10512": "RBarr;",
    "10513": "DDotrahd;",
    "10514": "UpArrowBar;",
    "10515": "DownArrowBar;",
    "10518": "Rarrtl;",
    "10521": "latail;",
    "10522": "ratail;",
    "10523": "lAtail;",
    "10524": "rAtail;",
    "10525": "larrfs;",
    "10526": "rarrfs;",
    "10527": "larrbfs;",
    "10528": "rarrbfs;",
    "10531": "nwarhk;",
    "10532": "nearhk;",
    "10533": "searhk;",
    "10534": "swarhk;",
    "10535": "nwnear;",
    "10536": "toea;",
    "10537": "tosa;",
    "10538": "swnwar;",
    "10547": "rarrc;",
    "10549": "cudarrr;",
    "10550": "ldca;",
    "10551": "rdca;",
    "10552": "cudarrl;",
    "10553": "larrpl;",
    "10556": "curarrm;",
    "10557": "cularrp;",
    "10565": "rarrpl;",
    "10568": "harrcir;",
    "10569": "Uarrocir;",
    "10570": "lurdshar;",
    "10571": "ldrushar;",
    "10574": "LeftRightVector;",
    "10575": "RightUpDownVector;",
    "10576": "DownLeftRightVector;",
    "10577": "LeftUpDownVector;",
    "10578": "LeftVectorBar;",
    "10579": "RightVectorBar;",
    "10580": "RightUpVectorBar;",
    "10581": "RightDownVectorBar;",
    "10582": "DownLeftVectorBar;",
    "10583": "DownRightVectorBar;",
    "10584": "LeftUpVectorBar;",
    "10585": "LeftDownVectorBar;",
    "10586": "LeftTeeVector;",
    "10587": "RightTeeVector;",
    "10588": "RightUpTeeVector;",
    "10589": "RightDownTeeVector;",
    "10590": "DownLeftTeeVector;",
    "10591": "DownRightTeeVector;",
    "10592": "LeftUpTeeVector;",
    "10593": "LeftDownTeeVector;",
    "10594": "lHar;",
    "10595": "uHar;",
    "10596": "rHar;",
    "10597": "dHar;",
    "10598": "luruhar;",
    "10599": "ldrdhar;",
    "10600": "ruluhar;",
    "10601": "rdldhar;",
    "10602": "lharul;",
    "10603": "llhard;",
    "10604": "rharul;",
    "10605": "lrhard;",
    "10606": "UpEquilibrium;",
    "10607": "ReverseUpEquilibrium;",
    "10608": "RoundImplies;",
    "10609": "erarr;",
    "10610": "simrarr;",
    "10611": "larrsim;",
    "10612": "rarrsim;",
    "10613": "rarrap;",
    "10614": "ltlarr;",
    "10616": "gtrarr;",
    "10617": "subrarr;",
    "10619": "suplarr;",
    "10620": "lfisht;",
    "10621": "rfisht;",
    "10622": "ufisht;",
    "10623": "dfisht;",
    "10629": "lopar;",
    "10630": "ropar;",
    "10635": "lbrke;",
    "10636": "rbrke;",
    "10637": "lbrkslu;",
    "10638": "rbrksld;",
    "10639": "lbrksld;",
    "10640": "rbrkslu;",
    "10641": "langd;",
    "10642": "rangd;",
    "10643": "lparlt;",
    "10644": "rpargt;",
    "10645": "gtlPar;",
    "10646": "ltrPar;",
    "10650": "vzigzag;",
    "10652": "vangrt;",
    "10653": "angrtvbd;",
    "10660": "ange;",
    "10661": "range;",
    "10662": "dwangle;",
    "10663": "uwangle;",
    "10664": "angmsdaa;",
    "10665": "angmsdab;",
    "10666": "angmsdac;",
    "10667": "angmsdad;",
    "10668": "angmsdae;",
    "10669": "angmsdaf;",
    "10670": "angmsdag;",
    "10671": "angmsdah;",
    "10672": "bemptyv;",
    "10673": "demptyv;",
    "10674": "cemptyv;",
    "10675": "raemptyv;",
    "10676": "laemptyv;",
    "10677": "ohbar;",
    "10678": "omid;",
    "10679": "opar;",
    "10681": "operp;",
    "10683": "olcross;",
    "10684": "odsold;",
    "10686": "olcir;",
    "10687": "ofcir;",
    "10688": "olt;",
    "10689": "ogt;",
    "10690": "cirscir;",
    "10691": "cirE;",
    "10692": "solb;",
    "10693": "bsolb;",
    "10697": "boxbox;",
    "10701": "trisb;",
    "10702": "rtriltri;",
    "10703": "LeftTriangleBar;",
    "10704": "RightTriangleBar;",
    "10716": "iinfin;",
    "10717": "infintie;",
    "10718": "nvinfin;",
    "10723": "eparsl;",
    "10724": "smeparsl;",
    "10725": "eqvparsl;",
    "10731": "lozf;",
    "10740": "RuleDelayed;",
    "10742": "dsol;",
    "10752": "xodot;",
    "10753": "xoplus;",
    "10754": "xotime;",
    "10756": "xuplus;",
    "10758": "xsqcup;",
    "10764": "qint;",
    "10765": "fpartint;",
    "10768": "cirfnint;",
    "10769": "awint;",
    "10770": "rppolint;",
    "10771": "scpolint;",
    "10772": "npolint;",
    "10773": "pointint;",
    "10774": "quatint;",
    "10775": "intlarhk;",
    "10786": "pluscir;",
    "10787": "plusacir;",
    "10788": "simplus;",
    "10789": "plusdu;",
    "10790": "plussim;",
    "10791": "plustwo;",
    "10793": "mcomma;",
    "10794": "minusdu;",
    "10797": "loplus;",
    "10798": "roplus;",
    "10799": "Cross;",
    "10800": "timesd;",
    "10801": "timesbar;",
    "10803": "smashp;",
    "10804": "lotimes;",
    "10805": "rotimes;",
    "10806": "otimesas;",
    "10807": "Otimes;",
    "10808": "odiv;",
    "10809": "triplus;",
    "10810": "triminus;",
    "10811": "tritime;",
    "10812": "iprod;",
    "10815": "amalg;",
    "10816": "capdot;",
    "10818": "ncup;",
    "10819": "ncap;",
    "10820": "capand;",
    "10821": "cupor;",
    "10822": "cupcap;",
    "10823": "capcup;",
    "10824": "cupbrcap;",
    "10825": "capbrcup;",
    "10826": "cupcup;",
    "10827": "capcap;",
    "10828": "ccups;",
    "10829": "ccaps;",
    "10832": "ccupssm;",
    "10835": "And;",
    "10836": "Or;",
    "10837": "andand;",
    "10838": "oror;",
    "10839": "orslope;",
    "10840": "andslope;",
    "10842": "andv;",
    "10843": "orv;",
    "10844": "andd;",
    "10845": "ord;",
    "10847": "wedbar;",
    "10854": "sdote;",
    "10858": "simdot;",
    "10861": "congdot;",
    "10862": "easter;",
    "10863": "apacir;",
    "10864": "apE;",
    "10865": "eplus;",
    "10866": "pluse;",
    "10867": "Esim;",
    "10868": "Colone;",
    "10869": "Equal;",
    "10871": "eDDot;",
    "10872": "equivDD;",
    "10873": "ltcir;",
    "10874": "gtcir;",
    "10875": "ltquest;",
    "10876": "gtquest;",
    "10877": "LessSlantEqual;",
    "10878": "GreaterSlantEqual;",
    "10879": "lesdot;",
    "10880": "gesdot;",
    "10881": "lesdoto;",
    "10882": "gesdoto;",
    "10883": "lesdotor;",
    "10884": "gesdotol;",
    "10885": "lessapprox;",
    "10886": "gtrapprox;",
    "10887": "lneq;",
    "10888": "gneq;",
    "10889": "lnapprox;",
    "10890": "gnapprox;",
    "10891": "lesseqqgtr;",
    "10892": "gtreqqless;",
    "10893": "lsime;",
    "10894": "gsime;",
    "10895": "lsimg;",
    "10896": "gsiml;",
    "10897": "lgE;",
    "10898": "glE;",
    "10899": "lesges;",
    "10900": "gesles;",
    "10901": "eqslantless;",
    "10902": "eqslantgtr;",
    "10903": "elsdot;",
    "10904": "egsdot;",
    "10905": "el;",
    "10906": "eg;",
    "10909": "siml;",
    "10910": "simg;",
    "10911": "simlE;",
    "10912": "simgE;",
    "10913": "LessLess;",
    "10914": "GreaterGreater;",
    "10916": "glj;",
    "10917": "gla;",
    "10918": "ltcc;",
    "10919": "gtcc;",
    "10920": "lescc;",
    "10921": "gescc;",
    "10922": "smt;",
    "10923": "lat;",
    "10924": "smte;",
    "10925": "late;",
    "10926": "bumpE;",
    "10927": "preceq;",
    "10928": "succeq;",
    "10931": "prE;",
    "10932": "scE;",
    "10933": "prnE;",
    "10934": "succneqq;",
    "10935": "precapprox;",
    "10936": "succapprox;",
    "10937": "prnap;",
    "10938": "succnapprox;",
    "10939": "Pr;",
    "10940": "Sc;",
    "10941": "subdot;",
    "10942": "supdot;",
    "10943": "subplus;",
    "10944": "supplus;",
    "10945": "submult;",
    "10946": "supmult;",
    "10947": "subedot;",
    "10948": "supedot;",
    "10949": "subseteqq;",
    "10950": "supseteqq;",
    "10951": "subsim;",
    "10952": "supsim;",
    "10955": "subsetneqq;",
    "10956": "supsetneqq;",
    "10959": "csub;",
    "10960": "csup;",
    "10961": "csube;",
    "10962": "csupe;",
    "10963": "subsup;",
    "10964": "supsub;",
    "10965": "subsub;",
    "10966": "supsup;",
    "10967": "suphsub;",
    "10968": "supdsub;",
    "10969": "forkv;",
    "10970": "topfork;",
    "10971": "mlcp;",
    "10980": "DoubleLeftTee;",
    "10982": "Vdashl;",
    "10983": "Barv;",
    "10984": "vBar;",
    "10985": "vBarv;",
    "10987": "Vbar;",
    "10988": "Not;",
    "10989": "bNot;",
    "10990": "rnmid;",
    "10991": "cirmid;",
    "10992": "midcir;",
    "10993": "topcir;",
    "10994": "nhpar;",
    "10995": "parsim;",
    "11005": "parsl;",
    "64256": "fflig;",
    "64257": "filig;",
    "64258": "fllig;",
    "64259": "ffilig;",
    "64260": "ffllig;"
}
},{}],5:[function(require,module,exports){
/*

	Hashids
	http://hashids.org/node-js
	(c) 2013 Ivan Akimov

	https://github.com/ivanakimov/hashids.node.js
	hashids may be freely distributed under the MIT license.

*/

/*jslint node: true, white: true, plusplus: true, nomen: true */

"use strict";

function Hashids(salt, minHashLength, alphabet) {

	var uniqueAlphabet, i, j, len, sepsLength, diff, guardCount;

	if (!(this instanceof Hashids)) {
		return new Hashids(salt, minHashLength, alphabet);
	}

	this.version = "1.0.1";

	/* internal settings */

	this.minAlphabetLength = 16;
	this.sepDiv = 3.5;
	this.guardDiv = 12;

	/* error messages */

	this.errorAlphabetLength = "error: alphabet must contain at least X unique characters";
	this.errorAlphabetSpace = "error: alphabet cannot contain spaces";

	/* alphabet vars */

	this.alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
	this.seps = "cfhistuCFHISTU";
	this.minHashLength = parseInt(minHashLength, 10) > 0 ? minHashLength : 0;
	this.salt = (typeof salt === "string") ? salt : "";

	if (typeof alphabet === "string") {
		this.alphabet = alphabet;
	}

	for (uniqueAlphabet = "", i = 0, len = this.alphabet.length; i !== len; i++) {
		if (uniqueAlphabet.indexOf(this.alphabet[i]) === -1) {
			uniqueAlphabet += this.alphabet[i];
		}
	}

	this.alphabet = uniqueAlphabet;

	if (this.alphabet.length < this.minAlphabetLength) {
		throw this.errorAlphabetLength.replace("X", this.minAlphabetLength);
	}

	if (this.alphabet.search(" ") !== -1) {
		throw this.errorAlphabetSpace;
	}

	/* seps should contain only characters present in alphabet; alphabet should not contains seps */

	for (i = 0, len = this.seps.length; i !== len; i++) {

		j = this.alphabet.indexOf(this.seps[i]);
		if (j === -1) {
			this.seps = this.seps.substr(0, i) + " " + this.seps.substr(i + 1);
		} else {
			this.alphabet = this.alphabet.substr(0, j) + " " + this.alphabet.substr(j + 1);
		}

	}

	this.alphabet = this.alphabet.replace(/ /g, "");

	this.seps = this.seps.replace(/ /g, "");
	this.seps = this.consistentShuffle(this.seps, this.salt);

	if (!this.seps.length || (this.alphabet.length / this.seps.length) > this.sepDiv) {

		sepsLength = Math.ceil(this.alphabet.length / this.sepDiv);

		if (sepsLength === 1) {
			sepsLength++;
		}

		if (sepsLength > this.seps.length) {

			diff = sepsLength - this.seps.length;
			this.seps += this.alphabet.substr(0, diff);
			this.alphabet = this.alphabet.substr(diff);

		} else {
			this.seps = this.seps.substr(0, sepsLength);
		}

	}

	this.alphabet = this.consistentShuffle(this.alphabet, this.salt);
	guardCount = Math.ceil(this.alphabet.length / this.guardDiv);

	if (this.alphabet.length < 3) {
		this.guards = this.seps.substr(0, guardCount);
		this.seps = this.seps.substr(guardCount);
	} else {
		this.guards = this.alphabet.substr(0, guardCount);
		this.alphabet = this.alphabet.substr(guardCount);
	}

}

Hashids.prototype.encode = function() {

	var ret = "",
		i, len,
		numbers = Array.prototype.slice.call(arguments);

	if (!numbers.length) {
		return ret;
	}

	if (numbers[0] instanceof Array) {
		numbers = numbers[0];
	}

	for (i = 0, len = numbers.length; i !== len; i++) {
		if (typeof numbers[i] !== "number" || numbers[i] % 1 !== 0 || numbers[i] < 0) {
			return ret;
		}
	}

	return this._encode(numbers);

};

Hashids.prototype.decode = function(hash) {

	var ret = [];

	if (!hash.length || typeof hash !== "string") {
		return ret;
	}

	return this._decode(hash, this.alphabet);

};

Hashids.prototype.encodeHex = function(str) {

	var i, len, numbers;

	str = str.toString();
	if (!/^[0-9a-fA-F]+$/.test(str)) {
		return "";
	}

	numbers = str.match(/[\w\W]{1,12}/g);

	for (i = 0, len = numbers.length; i !== len; i++) {
		numbers[i] = parseInt("1" + numbers[i], 16);
	}

	return this.encode.apply(this, numbers);

};

Hashids.prototype.decodeHex = function(hash) {

	var ret = "",
		i, len,
		numbers = this.decode(hash);

	for (i = 0, len = numbers.length; i !== len; i++) {
		ret += (numbers[i]).toString(16).substr(1);
	}

	return ret;

};

Hashids.prototype._encode = function(numbers) {

	var ret, lottery, i, len, number, buffer, last, sepsIndex, guardIndex, guard, halfLength, excess,
		alphabet = this.alphabet,
		numbersSize = numbers.length,
		numbersHashInt = 0;

	for (i = 0, len = numbers.length; i !== len; i++) {
		numbersHashInt += (numbers[i] % (i + 100));
	}

	lottery = ret = alphabet[numbersHashInt % alphabet.length];
	for (i = 0, len = numbers.length; i !== len; i++) {

		number = numbers[i];
		buffer = lottery + this.salt + alphabet;

		alphabet = this.consistentShuffle(alphabet, buffer.substr(0, alphabet.length));
		last = this.hash(number, alphabet);

		ret += last;

		if (i + 1 < numbersSize) {
			number %= (last.charCodeAt(0) + i);
			sepsIndex = number % this.seps.length;
			ret += this.seps[sepsIndex];
		}

	}

	if (ret.length < this.minHashLength) {

		guardIndex = (numbersHashInt + ret[0].charCodeAt(0)) % this.guards.length;
		guard = this.guards[guardIndex];

		ret = guard + ret;

		if (ret.length < this.minHashLength) {

			guardIndex = (numbersHashInt + ret[2].charCodeAt(0)) % this.guards.length;
			guard = this.guards[guardIndex];

			ret += guard;

		}

	}

	halfLength = parseInt(alphabet.length / 2, 10);
	while (ret.length < this.minHashLength) {

		alphabet = this.consistentShuffle(alphabet, alphabet);
		ret = alphabet.substr(halfLength) + ret + alphabet.substr(0, halfLength);

		excess = ret.length - this.minHashLength;
		if (excess > 0) {
			ret = ret.substr(excess / 2, this.minHashLength);
		}

	}

	return ret;

};

Hashids.prototype._decode = function(hash, alphabet) {

	var ret = [],
		i = 0,
		lottery, len, subHash, buffer,
		r = new RegExp("[" + this.guards + "]", "g"),
		hashBreakdown = hash.replace(r, " "),
		hashArray = hashBreakdown.split(" ");

	if (hashArray.length === 3 || hashArray.length === 2) {
		i = 1;
	}

	hashBreakdown = hashArray[i];
	if (typeof hashBreakdown[0] !== "undefined") {

		lottery = hashBreakdown[0];
		hashBreakdown = hashBreakdown.substr(1);

		r = new RegExp("[" + this.seps + "]", "g");
		hashBreakdown = hashBreakdown.replace(r, " ");
		hashArray = hashBreakdown.split(" ");

		for (i = 0, len = hashArray.length; i !== len; i++) {

			subHash = hashArray[i];
			buffer = lottery + this.salt + alphabet;

			alphabet = this.consistentShuffle(alphabet, buffer.substr(0, alphabet.length));
			ret.push(this.unhash(subHash, alphabet));

		}

		if (this._encode(ret) !== hash) {
			ret = [];
		}

	}

	return ret;

};

Hashids.prototype.consistentShuffle = function(alphabet, salt) {

	var integer, j, temp, i, v, p;

	if (!salt.length) {
		return alphabet;
	}

	for (i = alphabet.length - 1, v = 0, p = 0; i > 0; i--, v++) {

		v %= salt.length;
		p += integer = salt[v].charCodeAt(0);
		j = (integer + v + p) % i;

		temp = alphabet[j];
		alphabet = alphabet.substr(0, j) + alphabet[i] + alphabet.substr(j + 1);
		alphabet = alphabet.substr(0, i) + temp + alphabet.substr(i + 1);

	}

	return alphabet;

};

Hashids.prototype.hash = function(input, alphabet) {

	var hash = "",
		alphabetLength = alphabet.length;

	do {
		hash = alphabet[input % alphabetLength] + hash;
		input = parseInt(input / alphabetLength, 10);
	} while (input);

	return hash;

};

Hashids.prototype.unhash = function(input, alphabet) {

	var number = 0, pos, i;

	for (i = 0; i < input.length; i++) {
		pos = alphabet.indexOf(input[i]);
		number += pos * Math.pow(alphabet.length, input.length - i - 1);
	}

	return number;

};

module.exports = Hashids;

},{}],6:[function(require,module,exports){
var Analytics, App, AppData, AppView, AuthManager, Facebook, GooglePlus, Locale, MediaQueries, Nav, Router, Share, Templates,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Analytics = require('./utils/Analytics');

AuthManager = require('./utils/AuthManager');

Share = require('./utils/Share');

Facebook = require('./utils/Facebook');

GooglePlus = require('./utils/GooglePlus');

Templates = require('./data/Templates');

Locale = require('./data/Locale');

Router = require('./router/Router');

Nav = require('./router/Nav');

AppData = require('./AppData');

AppView = require('./AppView');

MediaQueries = require('./utils/MediaQueries');

App = (function() {
  App.prototype.LIVE = null;

  App.prototype.BASE_URL = window.config.hostname;

  App.prototype.localeCode = window.config.localeCode;

  App.prototype.objReady = 0;

  App.prototype._toClean = ['objReady', 'setFlags', 'objectComplete', 'init', 'initObjects', 'initSDKs', 'initApp', 'go', 'cleanup', '_toClean'];

  function App(LIVE) {
    this.LIVE = LIVE;
    this.cleanup = __bind(this.cleanup, this);
    this.go = __bind(this.go, this);
    this.initApp = __bind(this.initApp, this);
    this.initSDKs = __bind(this.initSDKs, this);
    this.initObjects = __bind(this.initObjects, this);
    this.init = __bind(this.init, this);
    this.objectComplete = __bind(this.objectComplete, this);
    this.isMobile = __bind(this.isMobile, this);
    this.setFlags = __bind(this.setFlags, this);
    return null;
  }

  App.prototype.setFlags = function() {
    var ua;
    ua = window.navigator.userAgent.toLowerCase();
    MediaQueries.setup();
    this.IS_ANDROID = ua.indexOf('android') > -1;
    this.IS_FIREFOX = ua.indexOf('firefox') > -1;
    this.IS_CHROME_IOS = ua.match('crios') ? true : false;
    return null;
  };

  App.prototype.isMobile = function() {
    return this.IS_IOS || this.IS_ANDROID;
  };

  App.prototype.objectComplete = function() {
    this.objReady++;
    if (this.objReady >= 4) {
      this.initApp();
    }
    return null;
  };

  App.prototype.init = function() {
    this.initObjects();
    return null;
  };

  App.prototype.initObjects = function() {
    this.templates = new Templates("/data/templates" + (this.LIVE ? '.min' : '') + ".xml", this.objectComplete);
    this.locale = new Locale("/data/locales/strings.json", this.objectComplete);
    this.analytics = new Analytics("/data/tracking.json", this.objectComplete);
    this.appData = new AppData(this.objectComplete);
    return null;
  };

  App.prototype.initSDKs = function() {
    Facebook.load();
    GooglePlus.load();
    return null;
  };

  App.prototype.initApp = function() {
    this.setFlags();

    /* Starts application */
    this.appView = new AppView;
    this.router = new Router;
    this.nav = new Nav;
    this.auth = new AuthManager;
    this.share = new Share;
    this.go();
    this.initSDKs();
    return null;
  };

  App.prototype.go = function() {

    /* After everything is loaded, kicks off website */
    this.appView.render();

    /* remove redundant initialisation methods / properties */
    this.cleanup();
    return null;
  };

  App.prototype.cleanup = function() {
    var fn, _i, _len, _ref;
    _ref = this._toClean;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fn = _ref[_i];
      this[fn] = null;
      delete this[fn];
    }
    return null;
  };

  return App;

})();

module.exports = App;



},{"./AppData":7,"./AppView":8,"./data/Locale":16,"./data/Templates":17,"./router/Nav":24,"./router/Router":25,"./utils/Analytics":26,"./utils/AuthManager":27,"./utils/Facebook":29,"./utils/GooglePlus":30,"./utils/MediaQueries":31,"./utils/Share":34}],7:[function(require,module,exports){
var API, AbstractData, AppData, DoodlesCollection, Requester,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('./data/AbstractData');

Requester = require('./utils/Requester');

API = require('./data/API');

DoodlesCollection = require('./collections/doodles/DoodlesCollection');

AppData = (function(_super) {
  __extends(AppData, _super);

  AppData.prototype.callback = null;

  function AppData(callback) {
    this.callback = callback;
    this.onStartDataReceived = __bind(this.onStartDataReceived, this);
    this.getStartData = __bind(this.getStartData, this);

    /*
    
    add all data classes here
     */
    AppData.__super__.constructor.call(this);
    this.doodles = new DoodlesCollection;
    this.getStartData();
    return null;
  }


  /*
  get app bootstrap data - embed in HTML or API endpoint
   */

  AppData.prototype.getStartData = function() {
    var r;
    if (true) {
      r = Requester.request({
        url: this.CD().BASE_URL + '/data/_DUMMY/doodles.json',
        type: 'GET'
      });
      r.done(this.onStartDataReceived);
      r.fail((function(_this) {
        return function() {

          /*
          this is only temporary, while there is no bootstrap data here, normally would handle error / fail
           */
          return typeof _this.callback === "function" ? _this.callback() : void 0;
        };
      })(this));
    } else {
      if (typeof this.callback === "function") {
        this.callback();
      }
    }
    return null;
  };

  AppData.prototype.onStartDataReceived = function(data) {
    var i, toAdd, _i;
    console.log("onStartDataReceived : (data) =>", data);
    toAdd = [];
    for (i = _i = 0; _i < 5; i = ++_i) {
      toAdd = toAdd.concat(data.doodles);
    }
    this.doodles.add(toAdd);

    /*
    
    bootstrap data received, app ready to go
     */
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };

  return AppData;

})(AbstractData);

module.exports = AppData;



},{"./collections/doodles/DoodlesCollection":12,"./data/API":14,"./data/AbstractData":15,"./utils/Requester":33}],8:[function(require,module,exports){
var AbstractView, AppView, Footer, Header, ModalManager, PageTransitioner, Preloader, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./view/AbstractView');

Preloader = require('./view/base/Preloader');

Header = require('./view/base/Header');

Wrapper = require('./view/base/Wrapper');

Footer = require('./view/base/Footer');

PageTransitioner = require('./view/base/PageTransitioner');

ModalManager = require('./view/modals/_ModalManager');

AppView = (function(_super) {
  __extends(AppView, _super);

  AppView.prototype.template = 'main';

  AppView.prototype.$window = null;

  AppView.prototype.$body = null;

  AppView.prototype.wrapper = null;

  AppView.prototype.footer = null;

  AppView.prototype.dims = {
    w: null,
    h: null,
    o: null,
    updateMobile: true,
    lastHeight: null
  };

  AppView.prototype.lastScrollY = 0;

  AppView.prototype.ticking = false;

  AppView.prototype.EVENT_UPDATE_DIMENSIONS = 'EVENT_UPDATE_DIMENSIONS';

  AppView.prototype.EVENT_PRELOADER_HIDE = 'EVENT_PRELOADER_HIDE';

  AppView.prototype.EVENT_ON_SCROLL = 'EVENT_ON_SCROLL';

  AppView.prototype.MOBILE_WIDTH = 700;

  AppView.prototype.MOBILE = 'mobile';

  AppView.prototype.NON_MOBILE = 'non_mobile';

  function AppView() {
    this.handleExternalLink = __bind(this.handleExternalLink, this);
    this.navigateToUrl = __bind(this.navigateToUrl, this);
    this.linkManager = __bind(this.linkManager, this);
    this.getDims = __bind(this.getDims, this);
    this.onResize = __bind(this.onResize, this);
    this.begin = __bind(this.begin, this);
    this.onAllRendered = __bind(this.onAllRendered, this);
    this.scrollUpdate = __bind(this.scrollUpdate, this);
    this.requestTick = __bind(this.requestTick, this);
    this.onScroll = __bind(this.onScroll, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.render = __bind(this.render, this);
    this.enableTouch = __bind(this.enableTouch, this);
    this.disableTouch = __bind(this.disableTouch, this);
    this.$window = $(window);
    this.$body = $('body').eq(0);
    AppView.__super__.constructor.call(this);
  }

  AppView.prototype.disableTouch = function() {
    this.$window.on('touchmove', this.onTouchMove);
    return null;
  };

  AppView.prototype.enableTouch = function() {
    this.$window.off('touchmove', this.onTouchMove);
    return null;
  };

  AppView.prototype.onTouchMove = function(e) {
    e.preventDefault();
    return null;
  };

  AppView.prototype.render = function() {
    this.bindEvents();
    this.preloader = new Preloader;
    this.modalManager = new ModalManager;
    this.header = new Header;
    this.wrapper = new Wrapper;
    this.footer = new Footer;
    this.transitioner = new PageTransitioner;
    this.addChild(this.header).addChild(this.wrapper).addChild(this.footer).addChild(this.transitioner);
    this.onAllRendered();
    return null;
  };

  AppView.prototype.bindEvents = function() {
    this.on('allRendered', this.onAllRendered);
    this.onResize();
    this.onResize = _.debounce(this.onResize, 300);
    this.$window.on('resize orientationchange', this.onResize);
    this.$window.on("scroll", this.onScroll);
    this.$body.on('click', 'a', this.linkManager);
    return null;
  };

  AppView.prototype.onScroll = function() {
    this.lastScrollY = window.scrollY;
    this.requestTick();
    return null;
  };

  AppView.prototype.requestTick = function() {
    if (!this.ticking) {
      requestAnimationFrame(this.scrollUpdate);
      this.ticking = true;
    }
    return null;
  };

  AppView.prototype.scrollUpdate = function() {
    this.ticking = false;
    this.$body.addClass('disable-hover');
    clearTimeout(this.timerScroll);
    this.timerScroll = setTimeout((function(_this) {
      return function() {
        return _this.$body.removeClass('disable-hover');
      };
    })(this), 50);
    this.trigger(this.EVENT_ON_SCROLL);
    return null;
  };

  AppView.prototype.onAllRendered = function() {
    this.$body.prepend(this.$el);
    this.preloader.playIntroAnimation((function(_this) {
      return function() {
        return _this.trigger(_this.EVENT_PRELOADER_HIDE);
      };
    })(this));
    this.begin();
    return null;
  };

  AppView.prototype.begin = function() {
    this.trigger('start');
    this.CD().router.start();
    return null;
  };

  AppView.prototype.onResize = function() {
    this.getDims();
    return null;
  };

  AppView.prototype.getDims = function() {
    var change, h, w;
    w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    change = h / this.dims.lastHeight;
    this.dims = {
      w: w,
      h: h,
      o: h > w ? 'portrait' : 'landscape',
      updateMobile: !this.CD().isMobile() || change < 0.8 || change > 1.2,
      lastHeight: h
    };
    this.trigger(this.EVENT_UPDATE_DIMENSIONS, this.dims);
    return null;
  };

  AppView.prototype.linkManager = function(e) {
    var href;
    href = $(e.currentTarget).attr('href');
    if (!href) {
      return false;
    }
    this.navigateToUrl(href, e);
    return null;
  };

  AppView.prototype.navigateToUrl = function(href, e) {
    var route, section;
    if (e == null) {
      e = null;
    }
    route = href.match(this.CD().BASE_URL) ? href.split(this.CD().BASE_URL)[1] : href;
    section = route.charAt(0) === '/' ? route.split('/')[1].split('/')[0] : route.split('/')[0];
    if (this.CD().nav.getSection(section)) {
      if (e != null) {
        e.preventDefault();
      }
      this.CD().router.navigateTo(route);
    } else {
      this.handleExternalLink(href);
    }
    return null;
  };

  AppView.prototype.handleExternalLink = function(data) {
    console.log("handleExternalLink : (data) => ");

    /*
    
    bind tracking events if necessary
     */
    return null;
  };

  return AppView;

})(AbstractView);

module.exports = AppView;



},{"./view/AbstractView":35,"./view/base/Footer":38,"./view/base/Header":39,"./view/base/PageTransitioner":40,"./view/base/Preloader":41,"./view/base/Wrapper":42,"./view/modals/_ModalManager":50}],9:[function(require,module,exports){
var AbstractCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractCollection = (function(_super) {
  __extends(AbstractCollection, _super);

  function AbstractCollection() {
    this.CD = __bind(this.CD, this);
    return AbstractCollection.__super__.constructor.apply(this, arguments);
  }

  AbstractCollection.prototype.CD = function() {
    return window.CD;
  };

  return AbstractCollection;

})(Backbone.Collection);

module.exports = AbstractCollection;



},{}],10:[function(require,module,exports){
var AbstractCollection, ContributorModel, ContributorsCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractCollection = require('../AbstractCollection');

ContributorModel = require('../../models/contributor/ContributorModel');

ContributorsCollection = (function(_super) {
  __extends(ContributorsCollection, _super);

  function ContributorsCollection() {
    this.getAboutHTML = __bind(this.getAboutHTML, this);
    return ContributorsCollection.__super__.constructor.apply(this, arguments);
  }

  ContributorsCollection.prototype.model = ContributorModel;

  ContributorsCollection.prototype.getAboutHTML = function() {
    var model, peeps, _i, _len, _ref;
    peeps = [];
    _ref = this.models;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      model = _ref[_i];
      peeps.push(model.get('html'));
    }
    return peeps.join(' \\ ');
  };

  return ContributorsCollection;

})(AbstractCollection);

module.exports = ContributorsCollection;



},{"../../models/contributor/ContributorModel":19,"../AbstractCollection":9}],11:[function(require,module,exports){
var TemplateModel, TemplatesCollection,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

TemplateModel = require('../../models/core/TemplateModel');

TemplatesCollection = (function(_super) {
  __extends(TemplatesCollection, _super);

  function TemplatesCollection() {
    return TemplatesCollection.__super__.constructor.apply(this, arguments);
  }

  TemplatesCollection.prototype.model = TemplateModel;

  return TemplatesCollection;

})(Backbone.Collection);

module.exports = TemplatesCollection;



},{"../../models/core/TemplateModel":22}],12:[function(require,module,exports){
var AbstractCollection, DoodleModel, DoodlesCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractCollection = require('../AbstractCollection');

DoodleModel = require('../../models/doodle/DoodleModel');

DoodlesCollection = (function(_super) {
  __extends(DoodlesCollection, _super);

  function DoodlesCollection() {
    this.getNextDoodle = __bind(this.getNextDoodle, this);
    this.getPrevDoodle = __bind(this.getPrevDoodle, this);
    this.getDoodleByNavSection = __bind(this.getDoodleByNavSection, this);
    this.getDoodleBySlug = __bind(this.getDoodleBySlug, this);
    return DoodlesCollection.__super__.constructor.apply(this, arguments);
  }

  DoodlesCollection.prototype.model = DoodleModel;

  DoodlesCollection.prototype.getDoodleBySlug = function(slug) {
    var doodle;
    doodle = this.findWhere({
      slug: slug
    });
    if (!doodle) {
      console.log("y u no doodle?");
    }
    return doodle;
  };

  DoodlesCollection.prototype.getDoodleByNavSection = function(whichSection) {
    var doodle, section;
    section = this.CD().nav[whichSection];
    doodle = this.findWhere({
      slug: "" + section.sub + "/" + section.ter
    });
    return doodle;
  };

  DoodlesCollection.prototype.getPrevDoodle = function(doodle) {
    var index;
    index = this.indexOf(doodle);
    index--;
    if (index < 0) {
      return false;
    } else {
      return this.at(index);
    }
  };

  DoodlesCollection.prototype.getNextDoodle = function(doodle) {
    var index;
    index = this.indexOf(doodle);
    index++;
    if (index > (this.length.length - 1)) {
      return false;
    } else {
      return this.at(index);
    }
  };

  return DoodlesCollection;

})(AbstractCollection);

module.exports = DoodlesCollection;



},{"../../models/doodle/DoodleModel":23,"../AbstractCollection":9}],13:[function(require,module,exports){
var Colors;

Colors = {
  CD_RED: '#EB423E',
  CD_BLUE: '#395CAA',
  CD_BLACK: '#111111',
  OFF_WHITE: '#F1F1F3'
};

module.exports = Colors;



},{}],14:[function(require,module,exports){
var API, APIRouteModel;

APIRouteModel = require('../models/core/APIRouteModel');

API = (function() {
  function API() {}

  API.model = new APIRouteModel;

  API.getContants = function() {
    return {

      /* add more if we wanna use in API strings */
      BASE_URL: API.CD().BASE_URL
    };
  };

  API.get = function(name, vars) {
    vars = $.extend(true, vars, API.getContants());
    return API.supplantString(API.model.get(name), vars);
  };

  API.supplantString = function(str, vals) {
    return str.replace(/{{ ([^{}]*) }}/g, function(a, b) {
      var r;
      return r = vals[b] || (typeof vals[b] === 'number' ? vals[b].toString() : '');
    });
    if (typeof r === "string" || typeof r === "number") {
      return r;
    } else {
      return a;
    }
  };

  API.CD = function() {
    return window.CD;
  };

  return API;

})();

module.exports = API;



},{"../models/core/APIRouteModel":20}],15:[function(require,module,exports){
var AbstractData,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

AbstractData = (function() {
  function AbstractData() {
    this.CD = __bind(this.CD, this);
    _.extend(this, Backbone.Events);
    return null;
  }

  AbstractData.prototype.CD = function() {
    return window.CD;
  };

  return AbstractData;

})();

module.exports = AbstractData;



},{}],16:[function(require,module,exports){
var API, Locale, LocalesModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

LocalesModel = require('../models/core/LocalesModel');

API = require('../data/API');


/*
 * Locale Loader #

Fires back an event when complete
 */

Locale = (function() {
  Locale.prototype.lang = null;

  Locale.prototype.data = null;

  Locale.prototype.callback = null;

  Locale.prototype.backup = null;

  Locale.prototype["default"] = 'en-gb';

  function Locale(data, cb) {
    this.getLocaleImage = __bind(this.getLocaleImage, this);
    this.get = __bind(this.get, this);
    this.loadBackup = __bind(this.loadBackup, this);
    this.onSuccess = __bind(this.onSuccess, this);
    this.getLang = __bind(this.getLang, this);

    /* start Locale Loader, define locale based on browser language */
    this.callback = cb;
    this.backup = data;
    this.lang = this.getLang();
    if (API.get('locale', {
      code: this.lang
    })) {
      $.ajax({
        url: API.get('locale', {
          code: this.lang
        }),
        type: 'GET',
        success: this.onSuccess,
        error: this.loadBackup
      });
    } else {
      this.loadBackup();
    }
    null;
  }

  Locale.prototype.getLang = function() {
    var lang;
    if (window.location.search && window.location.search.match('lang=')) {
      lang = window.location.search.split('lang=')[1].split('&')[0];
    } else if (window.config.localeCode) {
      lang = window.config.localeCode;
    } else {
      lang = this["default"];
    }
    return lang;
  };

  Locale.prototype.onSuccess = function(event) {

    /* Fires back an event once it's complete */
    var d;
    d = null;
    if (event.responseText) {
      d = JSON.parse(event.responseText);
    } else {
      d = event;
    }
    this.data = new LocalesModel(d);
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };

  Locale.prototype.loadBackup = function() {

    /* When API not available, tries to load the static .txt locale */
    $.ajax({
      url: this.backup,
      dataType: 'json',
      complete: this.onSuccess,
      error: (function(_this) {
        return function() {
          return console.log('error on loading backup');
        };
      })(this)
    });
    return null;
  };

  Locale.prototype.get = function(id) {

    /* get String from locale
    + id : string id of the Localised String
     */
    return this.data.getString(id);
  };

  Locale.prototype.getLocaleImage = function(url) {
    return window.config.CDN + "/images/locale/" + window.config.localeCode + "/" + url;
  };

  return Locale;

})();

module.exports = Locale;



},{"../data/API":14,"../models/core/LocalesModel":21}],17:[function(require,module,exports){
var TemplateModel, Templates, TemplatesCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

TemplateModel = require('../models/core/TemplateModel');

TemplatesCollection = require('../collections/core/TemplatesCollection');

Templates = (function() {
  Templates.prototype.templates = null;

  Templates.prototype.cb = null;

  function Templates(templates, callback) {
    this.get = __bind(this.get, this);
    this.parseXML = __bind(this.parseXML, this);
    this.cb = callback;
    $.ajax({
      url: templates,
      success: this.parseXML
    });
    null;
  }

  Templates.prototype.parseXML = function(data) {
    var temp;
    temp = [];
    $(data).find('template').each(function(key, value) {
      var $value;
      $value = $(value);
      return temp.push(new TemplateModel({
        id: $value.attr('id').toString(),
        text: $.trim($value.text())
      }));
    });
    this.templates = new TemplatesCollection(temp);
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Templates.prototype.get = function(id) {
    var t;
    t = this.templates.where({
      id: id
    });
    t = t[0].get('text');
    return $.trim(t);
  };

  return Templates;

})();

module.exports = Templates;



},{"../collections/core/TemplatesCollection":11,"../models/core/TemplateModel":22}],18:[function(require,module,exports){
var AbstractModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModel = (function(_super) {
  __extends(AbstractModel, _super);

  function AbstractModel(attrs, option) {
    this.CD = __bind(this.CD, this);
    this._filterAttrs = __bind(this._filterAttrs, this);
    attrs = this._filterAttrs(attrs);
    return Backbone.DeepModel.apply(this, arguments);
  }

  AbstractModel.prototype.set = function(attrs, options) {
    options || (options = {});
    attrs = this._filterAttrs(attrs);
    options.data = JSON.stringify(attrs);
    return Backbone.DeepModel.prototype.set.call(this, attrs, options);
  };

  AbstractModel.prototype._filterAttrs = function(attrs) {
    return attrs;
  };

  AbstractModel.prototype.CD = function() {
    return window.CD;
  };

  return AbstractModel;

})(Backbone.DeepModel);

module.exports = AbstractModel;



},{}],19:[function(require,module,exports){
var AbstractModel, CodeWordTransitioner, ContributorModel, NumberUtils,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModel = require('../AbstractModel');

NumberUtils = require('../../utils/NumberUtils');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

ContributorModel = (function(_super) {
  __extends(ContributorModel, _super);

  function ContributorModel() {
    this.getHtml = __bind(this.getHtml, this);
    this._filterAttrs = __bind(this._filterAttrs, this);
    return ContributorModel.__super__.constructor.apply(this, arguments);
  }

  ContributorModel.prototype.defaults = {
    "name": "",
    "github": "",
    "website": "",
    "twitter": "",
    "html": ""
  };

  ContributorModel.prototype._filterAttrs = function(attrs) {
    if (attrs.name) {
      attrs.html = this.getHtml(attrs);
    }
    return attrs;
  };

  ContributorModel.prototype.getHtml = function(attrs) {
    var html, links;
    html = "";
    links = [];
    if (attrs.website) {
      html += "<a href=\"" + attrs.website + "\" target=\"_blank\">" + attrs.name + "</a> ";
    } else {
      html += "" + attrs.name + " ";
    }
    if (attrs.twitter) {
      links.push("<a href=\"http://twitter.com/" + attrs.twitter + "\" target=\"_blank\">tw</a>");
    }
    if (attrs.github) {
      links.push("<a href=\"http://github.com/" + attrs.github + "\" target=\"_blank\">gh</a>");
    }
    html += "(" + (links.join(', ')) + ")";
    return html;
  };

  return ContributorModel;

})(AbstractModel);

module.exports = ContributorModel;



},{"../../utils/CodeWordTransitioner":28,"../../utils/NumberUtils":32,"../AbstractModel":18}],20:[function(require,module,exports){
var APIRouteModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

APIRouteModel = (function(_super) {
  __extends(APIRouteModel, _super);

  function APIRouteModel() {
    return APIRouteModel.__super__.constructor.apply(this, arguments);
  }

  APIRouteModel.prototype.defaults = {
    start: "",
    locale: "",
    user: {
      login: "{{ BASE_URL }}/api/user/login",
      register: "{{ BASE_URL }}/api/user/register",
      password: "{{ BASE_URL }}/api/user/password",
      update: "{{ BASE_URL }}/api/user/update",
      logout: "{{ BASE_URL }}/api/user/logout",
      remove: "{{ BASE_URL }}/api/user/remove"
    }
  };

  return APIRouteModel;

})(Backbone.DeepModel);

module.exports = APIRouteModel;



},{}],21:[function(require,module,exports){
var LocalesModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

LocalesModel = (function(_super) {
  __extends(LocalesModel, _super);

  function LocalesModel() {
    this.getString = __bind(this.getString, this);
    this.get_language = __bind(this.get_language, this);
    return LocalesModel.__super__.constructor.apply(this, arguments);
  }

  LocalesModel.prototype.defaults = {
    code: null,
    language: null,
    strings: null
  };

  LocalesModel.prototype.get_language = function() {
    return this.get('language');
  };

  LocalesModel.prototype.getString = function(id) {
    var a, e, k, v, _ref, _ref1;
    _ref = this.get('strings');
    for (k in _ref) {
      v = _ref[k];
      _ref1 = v['strings'];
      for (a in _ref1) {
        e = _ref1[a];
        if (a === id) {
          return e;
        }
      }
    }
    console.warn("Locales -> not found string: " + id);
    return null;
  };

  return LocalesModel;

})(Backbone.Model);

module.exports = LocalesModel;



},{}],22:[function(require,module,exports){
var TemplateModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

TemplateModel = (function(_super) {
  __extends(TemplateModel, _super);

  function TemplateModel() {
    return TemplateModel.__super__.constructor.apply(this, arguments);
  }

  TemplateModel.prototype.defaults = {
    id: "",
    text: ""
  };

  return TemplateModel;

})(Backbone.Model);

module.exports = TemplateModel;



},{}],23:[function(require,module,exports){
var AbstractModel, CodeWordTransitioner, DoodleModel, Hashids, NumberUtils,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModel = require('../AbstractModel');

NumberUtils = require('../../utils/NumberUtils');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

Hashids = require('hashids');

DoodleModel = (function(_super) {
  __extends(DoodleModel, _super);

  function DoodleModel() {
    this.setShortlink = __bind(this.setShortlink, this);
    this.getAuthorHtml = __bind(this.getAuthorHtml, this);
    this.getIndexHTML = __bind(this.getIndexHTML, this);
    this._filterAttrs = __bind(this._filterAttrs, this);
    return DoodleModel.__super__.constructor.apply(this, arguments);
  }

  DoodleModel.prototype.defaults = {
    "name": "",
    "author": {
      "name": "",
      "github": "",
      "website": "",
      "twitter": ""
    },
    "description": "",
    "tags": [],
    "interaction": {
      "mouse": null,
      "keyboard": null,
      "touch": null
    },
    "created": "",
    "slug": "",
    "shortlink": "",
    "colour_scheme": "",
    "index": null,
    "index_padded": "",
    "indexHTML": "",
    "source": "",
    "url": "",
    "scrambled": {
      "name": "",
      "author_name": ""
    }
  };

  DoodleModel.prototype._filterAttrs = function(attrs) {
    if (attrs.slug) {
      attrs.url = window.config.hostname + '/' + window.config.routes.DOODLES + '/' + attrs.slug;
    }
    if (attrs.index) {
      attrs.index_padded = NumberUtils.zeroFill(attrs.index, 3);
      attrs.indexHTML = this.getIndexHTML(attrs.index_padded);
    }
    if (attrs.name && attrs.author.name) {
      attrs.scrambled = {
        name: CodeWordTransitioner.getScrambledWord(attrs.name),
        author_name: CodeWordTransitioner.getScrambledWord(attrs.author.name)
      };
    }
    return attrs;
  };

  DoodleModel.prototype.getIndexHTML = function(index) {
    var char, className, html, _i, _len, _ref;
    html = "";
    _ref = index.split('');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      char = _ref[_i];
      className = char === '0' ? 'index-char-zero' : 'index-char-nonzero';
      html += "<span class=\"" + className + "\">" + char + "</span>";
    }
    return html;
  };

  DoodleModel.prototype.getAuthorHtml = function() {
    var attrs, html, links, portfolio_label;
    portfolio_label = this.CD().locale.get("misc_portfolio_label");
    attrs = this.get('author');
    html = "";
    links = [];
    html += "" + attrs.name + " \\ ";
    if (attrs.website) {
      links.push("<a href=\"" + attrs.website + "\" target=\"_blank\">" + portfolio_label + "</a> ");
    }
    if (attrs.twitter) {
      links.push("<a href=\"http://twitter.com/" + attrs.twitter + "\" target=\"_blank\">tw</a>");
    }
    if (attrs.github) {
      links.push("<a href=\"http://github.com/" + attrs.github + "\" target=\"_blank\">gh</a>");
    }
    html += "" + (links.join(' \\ '));
    return html;
  };

  DoodleModel.prototype.setShortlink = function() {
    var h, shortlink;
    if (this.get('shortlink')) {
      return;
    }
    h = new Hashids(window.config.shortlinks.SALT, 0, window.config.shortlinks.ALPHABET);
    shortlink = h.encode(this.get('index'));
    this.set('shortlink', shortlink);
    return null;
  };

  return DoodleModel;

})(AbstractModel);

module.exports = DoodleModel;



},{"../../utils/CodeWordTransitioner":28,"../../utils/NumberUtils":32,"../AbstractModel":18,"hashids":5}],24:[function(require,module,exports){
var AbstractView, Nav, Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../view/AbstractView');

Router = require('./Router');

Nav = (function(_super) {
  __extends(Nav, _super);

  Nav.EVENT_CHANGE_VIEW = 'EVENT_CHANGE_VIEW';

  Nav.EVENT_CHANGE_SUB_VIEW = 'EVENT_CHANGE_SUB_VIEW';

  Nav.prototype.sections = null;

  Nav.prototype.current = {
    area: null,
    sub: null,
    ter: null
  };

  Nav.prototype.previous = {
    area: null,
    sub: null,
    ter: null
  };

  Nav.prototype.changeViewCount = 0;

  function Nav() {
    this.getPageTitleVars = __bind(this.getPageTitleVars, this);
    this.setPageFavicon = __bind(this.setPageFavicon, this);
    this.setPageTitle = __bind(this.setPageTitle, this);
    this.changeView = __bind(this.changeView, this);
    this.getSection = __bind(this.getSection, this);
    this.sections = window.config.routes;
    this.favicon = document.getElementById('favicon');
    this.CD().router.on(Router.EVENT_HASH_CHANGED, this.changeView);
    return false;
  }

  Nav.prototype.getSection = function(section, strict) {
    var sectionName, uri, _ref;
    if (strict == null) {
      strict = false;
    }
    if (!strict && section === '') {
      return true;
    }
    _ref = this.sections;
    for (sectionName in _ref) {
      uri = _ref[sectionName];
      if (uri === section) {
        return sectionName;
      }
    }
    return false;
  };

  Nav.prototype.changeView = function(area, sub, ter, params) {
    this.changeViewCount++;
    this.previous = this.current;
    this.current = {
      area: area,
      sub: sub,
      ter: ter
    };
    this.trigger(Nav.EVENT_CHANGE_VIEW, this.previous, this.current);
    this.trigger(Nav.EVENT_CHANGE_SUB_VIEW, this.current);
    if (this.CD().appView.modalManager.isOpen()) {
      this.CD().appView.modalManager.hideOpenModal();
    }
    this.setPageTitle(area, sub, ter);
    this.setPageFavicon();
    return null;
  };

  Nav.prototype.setPageTitle = function(area, sub, ter) {
    var section, title, titleTmpl;
    section = area === '' ? 'HOME' : this.CD().nav.getSection(area);
    titleTmpl = this.CD().locale.get("page_title_" + section) || this.CD().locale.get("page_title_HOME");
    title = this.supplantString(titleTmpl, this.getPageTitleVars(area, sub, ter), false);
    if (window.document.title !== title) {
      window.document.title = title;
    }
    return null;
  };

  Nav.prototype.setPageFavicon = function() {
    var colour;
    colour = _.shuffle(['red', 'blue', 'black'])[0];
    setTimeout((function(_this) {
      return function() {
        return _this.favicon.href = "" + (_this.CD().BASE_URL) + "/static/img/icons/favicon/favicon_" + colour + ".png";
      };
    })(this), 0);
    return null;
  };

  Nav.prototype.getPageTitleVars = function(area, sub, ter) {
    var doodle, vars;
    vars = {};
    if (area === this.sections.DOODLES && sub && ter) {
      doodle = this.CD().appData.doodles.findWhere({
        slug: "" + sub + "/" + ter
      });
      if (!doodle) {
        vars.name = "doodle";
      } else {
        vars.name = doodle.get('author.name') + ' \\ ' + doodle.get('name') + ' ';
      }
    }
    return vars;
  };

  return Nav;

})(AbstractView);

module.exports = Nav;



},{"../view/AbstractView":35,"./Router":25}],25:[function(require,module,exports){
var Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    this.CD = __bind(this.CD, this);
    this.navigateTo = __bind(this.navigateTo, this);
    this.hashChanged = __bind(this.hashChanged, this);
    this.start = __bind(this.start, this);
    return Router.__super__.constructor.apply(this, arguments);
  }

  Router.EVENT_HASH_CHANGED = 'EVENT_HASH_CHANGED';

  Router.prototype.FIRST_ROUTE = true;

  Router.prototype.routes = {
    '(/)(:area)(/:sub)(/:ter)(/)': 'hashChanged',
    '*actions': 'navigateTo'
  };

  Router.prototype.area = null;

  Router.prototype.sub = null;

  Router.prototype.ter = null;

  Router.prototype.params = null;

  Router.prototype.start = function() {
    Backbone.history.start({
      pushState: true,
      root: '/'
    });
    return null;
  };

  Router.prototype.hashChanged = function(area, sub, ter) {
    this.area = area != null ? area : null;
    this.sub = sub != null ? sub : null;
    this.ter = ter != null ? ter : null;
    console.log(">> EVENT_HASH_CHANGED @area = " + this.area + ", @sub = " + this.sub + ", @ter = " + this.ter + " <<");
    if (this.FIRST_ROUTE) {
      this.FIRST_ROUTE = false;
    }
    if (!this.area) {
      this.area = this.CD().nav.sections.HOME;
    }
    this.trigger(Router.EVENT_HASH_CHANGED, this.area, this.sub, this.ter, this.params);
    return null;
  };

  Router.prototype.navigateTo = function(where, trigger, replace, params) {
    if (where == null) {
      where = '';
    }
    if (trigger == null) {
      trigger = true;
    }
    if (replace == null) {
      replace = false;
    }
    this.params = params;
    if (where.charAt(0) !== "/") {
      where = "/" + where;
    }
    if (where.charAt(where.length - 1) !== "/") {
      where = "" + where + "/";
    }
    if (!trigger) {
      this.trigger(Router.EVENT_HASH_CHANGED, where, null, this.params);
      return;
    }
    this.navigate(where, {
      trigger: true,
      replace: replace
    });
    return null;
  };

  Router.prototype.CD = function() {
    return window.CD;
  };

  return Router;

})(Backbone.Router);

module.exports = Router;



},{}],26:[function(require,module,exports){

/*
Analytics wrapper
 */
var Analytics,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Analytics = (function() {
  Analytics.prototype.tags = null;

  Analytics.prototype.started = false;

  Analytics.prototype.attempts = 0;

  Analytics.prototype.allowedAttempts = 5;

  function Analytics(tags, callback) {
    this.callback = callback;
    this.track = __bind(this.track, this);
    this.onTagsReceived = __bind(this.onTagsReceived, this);
    $.getJSON(tags, this.onTagsReceived);
    return null;
  }

  Analytics.prototype.onTagsReceived = function(data) {
    this.tags = data;
    this.started = true;
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };


  /*
  @param string id of the tracking tag to be pushed on Analytics
   */

  Analytics.prototype.track = function(param) {
    var arg, args, v, _i, _len;
    if (!this.started) {
      return;
    }
    if (param) {
      v = this.tags[param];
      if (v) {
        args = ['send', 'event'];
        for (_i = 0, _len = v.length; _i < _len; _i++) {
          arg = v[_i];
          args.push(arg);
        }
        if (window.ga) {
          ga.apply(null, args);
        } else if (this.attempts >= this.allowedAttempts) {
          this.started = false;
        } else {
          setTimeout((function(_this) {
            return function() {
              _this.track(param);
              return _this.attempts++;
            };
          })(this), 2000);
        }
      }
    }
    return null;
  };

  return Analytics;

})();

module.exports = Analytics;



},{}],27:[function(require,module,exports){
var AbstractData, AuthManager, Facebook, GooglePlus,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');

Facebook = require('../utils/Facebook');

GooglePlus = require('../utils/GooglePlus');

AuthManager = (function(_super) {
  __extends(AuthManager, _super);

  AuthManager.prototype.userData = null;

  AuthManager.prototype.process = false;

  AuthManager.prototype.processTimer = null;

  AuthManager.prototype.processWait = 5000;

  function AuthManager() {
    this.hideLoader = __bind(this.hideLoader, this);
    this.showLoader = __bind(this.showLoader, this);
    this.authCallback = __bind(this.authCallback, this);
    this.authFail = __bind(this.authFail, this);
    this.authSuccess = __bind(this.authSuccess, this);
    this.login = __bind(this.login, this);
    this.userData = this.CD().appData.USER;
    AuthManager.__super__.constructor.call(this);
    return null;
  }

  AuthManager.prototype.login = function(service, cb) {
    var $dataDfd;
    if (cb == null) {
      cb = null;
    }
    if (this.process) {
      return;
    }
    this.showLoader();
    this.process = true;
    $dataDfd = $.Deferred();
    switch (service) {
      case 'google':
        GooglePlus.login($dataDfd);
        break;
      case 'facebook':
        Facebook.login($dataDfd);
    }
    $dataDfd.done((function(_this) {
      return function(res) {
        return _this.authSuccess(service, res);
      };
    })(this));
    $dataDfd.fail((function(_this) {
      return function(res) {
        return _this.authFail(service, res);
      };
    })(this));
    $dataDfd.always((function(_this) {
      return function() {
        return _this.authCallback(cb);
      };
    })(this));

    /*
    		Unfortunately no callback is fired if user manually closes G+ login modal,
    		so this is to allow them to close window and then subsequently try to log in again...
     */
    this.processTimer = setTimeout(this.authCallback, this.processWait);
    return $dataDfd;
  };

  AuthManager.prototype.authSuccess = function(service, data) {
    return null;
  };

  AuthManager.prototype.authFail = function(service, data) {
    return null;
  };

  AuthManager.prototype.authCallback = function(cb) {
    if (cb == null) {
      cb = null;
    }
    if (!this.process) {
      return;
    }
    clearTimeout(this.processTimer);
    this.hideLoader();
    this.process = false;
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };


  /*
  	show / hide some UI indicator that we are waiting for social network to respond
   */

  AuthManager.prototype.showLoader = function() {
    return null;
  };

  AuthManager.prototype.hideLoader = function() {
    return null;
  };

  return AuthManager;

})(AbstractData);

module.exports = AuthManager;



},{"../data/AbstractData":15,"../utils/Facebook":29,"../utils/GooglePlus":30}],28:[function(require,module,exports){
var CodeWordTransitioner, encode;

encode = require('ent/encode');

CodeWordTransitioner = (function() {
  function CodeWordTransitioner() {}

  CodeWordTransitioner.config = {
    MIN_WRONG_CHARS: 1,
    MAX_WRONG_CHARS: 7,
    MIN_CHAR_IN_DELAY: 40,
    MAX_CHAR_IN_DELAY: 70,
    MIN_CHAR_OUT_DELAY: 40,
    MAX_CHAR_OUT_DELAY: 70,
    CHARS: 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split('').map(function(char) {
      return encode(char);
    }),
    CHAR_TEMPLATE: "<span data-codetext-char=\"{{ char }}\" data-codetext-char-state=\"{{ state }}\">{{ char }}</span>"
  };

  CodeWordTransitioner._wordCache = {};

  CodeWordTransitioner._getWordFromCache = function($el, initialState) {
    var id, word;
    if (initialState == null) {
      initialState = null;
    }
    id = $el.attr('data-codeword-id');
    if (id && CodeWordTransitioner._wordCache[id]) {
      word = CodeWordTransitioner._wordCache[id];
    } else {
      CodeWordTransitioner._wrapChars($el, initialState);
      word = CodeWordTransitioner._addWordToCache($el);
    }
    return word;
  };

  CodeWordTransitioner._addWordToCache = function($el) {
    var chars, id;
    chars = [];
    $el.find('[data-codetext-char]').each(function(i, el) {
      var $charEl;
      $charEl = $(el);
      return chars.push({
        $el: $charEl,
        rightChar: $charEl.attr('data-codetext-char')
      });
    });
    id = _.uniqueId();
    $el.attr('data-codeword-id', id);
    CodeWordTransitioner._wordCache[id] = {
      word: _.pluck(chars, 'rightChar').join(''),
      $el: $el,
      chars: chars,
      visible: true
    };
    return CodeWordTransitioner._wordCache[id];
  };

  CodeWordTransitioner._wrapChars = function($el, initialState) {
    var char, chars, html, state, _i, _len;
    if (initialState == null) {
      initialState = null;
    }
    chars = $el.text().split('');
    state = initialState || $el.attr('data-codeword-initial-state') || "";
    html = [];
    for (_i = 0, _len = chars.length; _i < _len; _i++) {
      char = chars[_i];
      html.push(CodeWordTransitioner._supplantString(CodeWordTransitioner.config.CHAR_TEMPLATE, {
        char: char,
        state: state
      }));
    }
    $el.html(html.join(''));
    return null;
  };

  CodeWordTransitioner._prepareWord = function(word, target, charState) {
    var char, i, targetChar, _i, _len, _ref;
    if (charState == null) {
      charState = '';
    }
    _ref = word.chars;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      char = _ref[i];
      targetChar = (function() {
        switch (true) {
          case target === 'right':
            return char.rightChar;
          case target === 'wrong':
            return this._getRandomChar();
          case target === 'empty':
            return '';
          default:
            return target.charAt(i) || '';
        }
      }).call(CodeWordTransitioner);
      if (targetChar === ' ') {
        targetChar = '&nbsp;';
      }
      char.wrongChars = CodeWordTransitioner._getRandomWrongChars();
      char.targetChar = targetChar;
      char.charState = charState;
    }
    return null;
  };

  CodeWordTransitioner._getRandomWrongChars = function() {
    var charCount, chars, i, _i;
    chars = [];
    charCount = _.random(CodeWordTransitioner.config.MIN_WRONG_CHARS, CodeWordTransitioner.config.MAX_WRONG_CHARS);
    for (i = _i = 0; 0 <= charCount ? _i < charCount : _i > charCount; i = 0 <= charCount ? ++_i : --_i) {
      chars.push({
        char: CodeWordTransitioner._getRandomChar(),
        inDelay: _.random(CodeWordTransitioner.config.MIN_CHAR_IN_DELAY, CodeWordTransitioner.config.MAX_CHAR_IN_DELAY),
        outDelay: _.random(CodeWordTransitioner.config.MIN_CHAR_OUT_DELAY, CodeWordTransitioner.config.MAX_CHAR_OUT_DELAY)
      });
    }
    return chars;
  };

  CodeWordTransitioner._getRandomChar = function() {
    var char;
    char = CodeWordTransitioner.config.CHARS[_.random(0, CodeWordTransitioner.config.CHARS.length - 1)];
    return char;
  };

  CodeWordTransitioner._getLongestCharDuration = function(chars) {
    var char, i, longestTime, longestTimeIdx, time, wrongChar, _i, _j, _len, _len1, _ref;
    longestTime = 0;
    longestTimeIdx = 0;
    for (i = _i = 0, _len = chars.length; _i < _len; i = ++_i) {
      char = chars[i];
      time = 0;
      _ref = char.wrongChars;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        wrongChar = _ref[_j];
        time += wrongChar.inDelay + wrongChar.outDelay;
      }
      if (time > longestTime) {
        longestTime = time;
        longestTimeIdx = i;
      }
    }
    return longestTimeIdx;
  };

  CodeWordTransitioner._animateChars = function(word, sequential, cb) {
    var activeChar, args, char, i, longestCharIdx, _i, _len, _ref;
    activeChar = 0;
    if (sequential) {
      CodeWordTransitioner._animateChar(word.chars, activeChar, true, cb);
    } else {
      longestCharIdx = CodeWordTransitioner._getLongestCharDuration(word.chars);
      _ref = word.chars;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        char = _ref[i];
        args = [word.chars, i, false];
        if (i === longestCharIdx) {
          args.push(cb);
        }
        CodeWordTransitioner._animateChar.apply(CodeWordTransitioner, args);
      }
    }
    return null;
  };

  CodeWordTransitioner._animateChar = function(chars, idx, recurse, cb) {
    var char;
    char = chars[idx];
    if (recurse) {
      CodeWordTransitioner._animateWrongChars(char, function() {
        if (idx === chars.length - 1) {
          return CodeWordTransitioner._animateCharsDone(cb);
        } else {
          return CodeWordTransitioner._animateChar(chars, idx + 1, recurse, cb);
        }
      });
    } else {
      if (typeof cb === 'function') {
        CodeWordTransitioner._animateWrongChars(char, function() {
          return CodeWordTransitioner._animateCharsDone(cb);
        });
      } else {
        CodeWordTransitioner._animateWrongChars(char);
      }
    }
    return null;
  };

  CodeWordTransitioner._animateWrongChars = function(char, cb) {
    var wrongChar;
    if (char.wrongChars.length) {
      wrongChar = char.wrongChars.shift();
      setTimeout(function() {
        char.$el.html(wrongChar.char);
        return setTimeout(function() {
          return CodeWordTransitioner._animateWrongChars(char, cb);
        }, wrongChar.outDelay);
      }, wrongChar.inDelay);
    } else {
      char.$el.attr('data-codetext-char-state', char.charState).html(char.targetChar);
      if (typeof cb === "function") {
        cb();
      }
    }
    return null;
  };

  CodeWordTransitioner._animateCharsDone = function(cb) {
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };

  CodeWordTransitioner._supplantString = function(str, vals) {
    return str.replace(/{{ ([^{}]*) }}/g, function(a, b) {
      var r;
      r = vals[b];
      if (typeof r === "string" || typeof r === "number") {
        return r;
      } else {
        return a;
      }
    });
  };

  CodeWordTransitioner.to = function(targetText, $el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.to(targetText, _$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    word.visible = true;
    CodeWordTransitioner._prepareWord(word, targetText, charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner["in"] = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner["in"](_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    word.visible = true;
    CodeWordTransitioner._prepareWord(word, 'right', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner.out = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.out(_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    if (!word.visible) {
      return;
    }
    word.visible = false;
    CodeWordTransitioner._prepareWord(word, 'empty', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner.scramble = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.scramble(_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    if (!word.visible) {
      return;
    }
    CodeWordTransitioner._prepareWord(word, 'wrong', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner.unscramble = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.unscramble(_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    if (!word.visible) {
      return;
    }
    CodeWordTransitioner._prepareWord(word, 'right', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner.prepare = function($el, initialState) {
    var _$el, _i, _len;
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.prepare(_$el, initialState);
      }
      return;
    }
    CodeWordTransitioner._getWordFromCache($el, initialState);
    return null;
  };

  CodeWordTransitioner.getScrambledWord = function(word) {
    var char, newChars, _i, _len, _ref;
    newChars = [];
    _ref = word.split('');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      char = _ref[_i];
      newChars.push(CodeWordTransitioner._getRandomChar());
    }
    return newChars.join('');
  };

  return CodeWordTransitioner;

})();

module.exports = CodeWordTransitioner;



},{"ent/encode":3}],29:[function(require,module,exports){
var AbstractData, Facebook,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');


/*

Facebook SDK wrapper - load asynchronously, some helper methods
 */

Facebook = (function(_super) {
  __extends(Facebook, _super);

  function Facebook() {
    return Facebook.__super__.constructor.apply(this, arguments);
  }

  Facebook.url = '//connect.facebook.net/en_US/all.js';

  Facebook.permissions = 'email';

  Facebook.$dataDfd = null;

  Facebook.loaded = false;

  Facebook.load = function() {

    /*
    		TO DO
    		include script loader with callback to :init
     */
    return null;
  };

  Facebook.init = function() {
    Facebook.loaded = true;
    FB.init({
      appId: window.config.fb_app_id,
      status: false,
      xfbml: false
    });
    return null;
  };

  Facebook.login = function($dataDfd) {
    Facebook.$dataDfd = $dataDfd;
    if (!Facebook.loaded) {
      return Facebook.$dataDfd.reject('SDK not loaded');
    }
    FB.login(function(res) {
      if (res['status'] === 'connected') {
        return Facebook.getUserData(res['authResponse']['accessToken']);
      } else {
        return Facebook.$dataDfd.reject('no way jose');
      }
    }, {
      scope: Facebook.permissions
    });
    return null;
  };

  Facebook.getUserData = function(token) {
    var $meDfd, $picDfd, userData;
    userData = {};
    userData.access_token = token;
    $meDfd = $.Deferred();
    $picDfd = $.Deferred();
    FB.api('/me', function(res) {
      userData.full_name = res.name;
      userData.social_id = res.id;
      userData.email = res.email || false;
      return $meDfd.resolve();
    });
    FB.api('/me/picture', {
      'width': '200'
    }, function(res) {
      userData.profile_pic = res.data.url;
      return $picDfd.resolve();
    });
    $.when($meDfd, $picDfd).done(function() {
      return Facebook.$dataDfd.resolve(userData);
    });
    return null;
  };

  Facebook.share = function(opts, cb) {
    FB.ui({
      method: opts.method || 'feed',
      name: opts.name || '',
      link: opts.link || '',
      picture: opts.picture || '',
      caption: opts.caption || '',
      description: opts.description || ''
    }, function(response) {
      return typeof cb === "function" ? cb(response) : void 0;
    });
    return null;
  };

  return Facebook;

})(AbstractData);

module.exports = Facebook;



},{"../data/AbstractData":15}],30:[function(require,module,exports){
var AbstractData, GooglePlus,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');


/*

Google+ SDK wrapper - load asynchronously, some helper methods
 */

GooglePlus = (function(_super) {
  __extends(GooglePlus, _super);

  function GooglePlus() {
    return GooglePlus.__super__.constructor.apply(this, arguments);
  }

  GooglePlus.url = 'https://apis.google.com/js/client:plusone.js';

  GooglePlus.params = {
    'clientid': null,
    'callback': null,
    'scope': 'https://www.googleapis.com/auth/userinfo.email',
    'cookiepolicy': 'none'
  };

  GooglePlus.$dataDfd = null;

  GooglePlus.loaded = false;

  GooglePlus.load = function() {

    /*
    		TO DO
    		include script loader with callback to :init
     */
    return null;
  };

  GooglePlus.init = function() {
    GooglePlus.loaded = true;
    GooglePlus.params['clientid'] = window.config.gp_app_id;
    GooglePlus.params['callback'] = GooglePlus.loginCallback;
    return null;
  };

  GooglePlus.login = function($dataDfd) {
    GooglePlus.$dataDfd = $dataDfd;
    if (GooglePlus.loaded) {
      gapi.auth.signIn(GooglePlus.params);
    } else {
      GooglePlus.$dataDfd.reject('SDK not loaded');
    }
    return null;
  };

  GooglePlus.loginCallback = function(res) {
    if (res['status']['signed_in']) {
      GooglePlus.getUserData(res['access_token']);
    } else if (res['error']['access_denied']) {
      GooglePlus.$dataDfd.reject('no way jose');
    }
    return null;
  };

  GooglePlus.getUserData = function(token) {
    gapi.client.load('plus', 'v1', function() {
      var request;
      request = gapi.client.plus.people.get({
        'userId': 'me'
      });
      return request.execute(function(res) {
        var userData;
        userData = {
          access_token: token,
          full_name: res.displayName,
          social_id: res.id,
          email: res.emails[0] ? res.emails[0].value : false,
          profile_pic: res.image.url
        };
        return GooglePlus.$dataDfd.resolve(userData);
      });
    });
    return null;
  };

  return GooglePlus;

})(AbstractData);

module.exports = GooglePlus;



},{"../data/AbstractData":15}],31:[function(require,module,exports){
var MediaQueries;

MediaQueries = (function() {
  function MediaQueries() {}

  MediaQueries.SMALL = "small";

  MediaQueries.IPAD = "ipad";

  MediaQueries.MEDIUM = "medium";

  MediaQueries.LARGE = "large";

  MediaQueries.EXTRA_LARGE = "extra-large";

  MediaQueries.setup = function() {
    MediaQueries.SMALL_BREAKPOINT = {
      name: "Small",
      breakpoints: [MediaQueries.SMALL]
    };
    MediaQueries.MEDIUM_BREAKPOINT = {
      name: "Medium",
      breakpoints: [MediaQueries.MEDIUM]
    };
    MediaQueries.LARGE_BREAKPOINT = {
      name: "Large",
      breakpoints: [MediaQueries.IPAD, MediaQueries.LARGE, MediaQueries.EXTRA_LARGE]
    };
    MediaQueries.BREAKPOINTS = [MediaQueries.SMALL_BREAKPOINT, MediaQueries.MEDIUM_BREAKPOINT, MediaQueries.LARGE_BREAKPOINT];
  };

  MediaQueries.getDeviceState = function() {
    return window.getComputedStyle(document.body, "after").getPropertyValue("content");
  };

  MediaQueries.getBreakpoint = function() {
    var i, state, _i, _ref;
    state = MediaQueries.getDeviceState();
    for (i = _i = 0, _ref = MediaQueries.BREAKPOINTS.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (MediaQueries.BREAKPOINTS[i].breakpoints.indexOf(state) > -1) {
        return MediaQueries.BREAKPOINTS[i].name;
      }
    }
    return "";
  };

  MediaQueries.isBreakpoint = function(breakpoint) {
    var i, _i, _ref;
    for (i = _i = 0, _ref = breakpoint.breakpoints.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (breakpoint.breakpoints[i] === MediaQueries.getDeviceState()) {
        return true;
      }
    }
    return false;
  };

  return MediaQueries;

})();

window.MediaQueries = MediaQueries;

module.exports = MediaQueries;



},{}],32:[function(require,module,exports){
var NumberUtils;

NumberUtils = (function() {
  function NumberUtils() {}

  NumberUtils.MATH_COS = Math.cos;

  NumberUtils.MATH_SIN = Math.sin;

  NumberUtils.MATH_RANDOM = Math.random;

  NumberUtils.MATH_ABS = Math.abs;

  NumberUtils.MATH_ATAN2 = Math.atan2;

  NumberUtils.limit = function(number, min, max) {
    return Math.min(Math.max(min, number), max);
  };

  NumberUtils.getRandomColor = function() {
    var color, i, letters, _i;
    letters = '0123456789ABCDEF'.split('');
    color = '#';
    for (i = _i = 0; _i < 6; i = ++_i) {
      color += letters[Math.round(Math.random() * 15)];
    }
    return color;
  };

  NumberUtils.getTimeStampDiff = function(date1, date2) {
    var date1_ms, date2_ms, difference_ms, one_day, time;
    one_day = 1000 * 60 * 60 * 24;
    time = {};
    date1_ms = date1.getTime();
    date2_ms = date2.getTime();
    difference_ms = date2_ms - date1_ms;
    difference_ms = difference_ms / 1000;
    time.seconds = Math.floor(difference_ms % 60);
    difference_ms = difference_ms / 60;
    time.minutes = Math.floor(difference_ms % 60);
    difference_ms = difference_ms / 60;
    time.hours = Math.floor(difference_ms % 24);
    time.days = Math.floor(difference_ms / 24);
    return time;
  };

  NumberUtils.map = function(num, min1, max1, min2, max2, round, constrainMin, constrainMax) {
    var num1, num2;
    if (round == null) {
      round = false;
    }
    if (constrainMin == null) {
      constrainMin = true;
    }
    if (constrainMax == null) {
      constrainMax = true;
    }
    if (constrainMin && num < min1) {
      return min2;
    }
    if (constrainMax && num > max1) {
      return max2;
    }
    num1 = (num - min1) / (max1 - min1);
    num2 = (num1 * (max2 - min2)) + min2;
    if (round) {
      return Math.round(num2);
    }
    return num2;
  };

  NumberUtils.toRadians = function(degree) {
    return degree * (Math.PI / 180);
  };

  NumberUtils.toDegree = function(radians) {
    return radians * (180 / Math.PI);
  };

  NumberUtils.isInRange = function(num, min, max, canBeEqual) {
    if (canBeEqual) {
      return num >= min && num <= max;
    } else {
      return num >= min && num <= max;
    }
  };

  NumberUtils.getNiceDistance = function(metres) {
    var km;
    if (metres < 1000) {
      return "" + (Math.round(metres)) + "M";
    } else {
      km = (metres / 1000).toFixed(2);
      return "" + km + "KM";
    }
  };

  NumberUtils.zeroFill = function(number, width) {
    var _ref;
    width -= number.toString().length;
    if (width > 0) {
      return new Array(width + ((_ref = /\./.test(number)) != null ? _ref : {
        2: 1
      })).join('0') + number;
    }
    return number + "";
  };

  return NumberUtils;

})();

module.exports = NumberUtils;



},{}],33:[function(require,module,exports){

/*
 * Requester #

Wrapper for `$.ajax` calls
 */
var Requester;

Requester = (function() {
  function Requester() {}

  Requester.requests = [];

  Requester.request = function(data) {

    /*
    `data = {`<br>
    `  url         : String`<br>
    `  type        : "POST/GET/PUT"`<br>
    `  data        : Object`<br>
    `  dataType    : jQuery dataType`<br>
    `  contentType : String`<br>
    `}`
     */
    var r;
    r = $.ajax({
      url: data.url,
      type: data.type ? data.type : "POST",
      data: data.data ? data.data : null,
      dataType: data.dataType ? data.dataType : "json",
      contentType: data.contentType ? data.contentType : "application/x-www-form-urlencoded; charset=UTF-8",
      processData: data.processData !== null && data.processData !== void 0 ? data.processData : true
    });
    r.done(data.done);
    r.fail(data.fail);
    return r;
  };

  Requester.addImage = function(data, done, fail) {

    /*
    ** Usage: <br>
    `data = canvass.toDataURL("image/jpeg").slice("data:image/jpeg;base64,".length)`<br>
    `Requester.addImage data, "zoetrope", @done, @fail`
     */
    Requester.request({
      url: '/api/images/',
      type: 'POST',
      data: {
        image_base64: encodeURI(data)
      },
      done: done,
      fail: fail
    });
    return null;
  };

  Requester.deleteImage = function(id, done, fail) {
    Requester.request({
      url: '/api/images/' + id,
      type: 'DELETE',
      done: done,
      fail: fail
    });
    return null;
  };

  return Requester;

})();

module.exports = Requester;



},{}],34:[function(require,module,exports){

/*
Sharing class for non-SDK loaded social networks.
If SDK is loaded, and provides share methods, then use that class instead, eg. `Facebook.share` instead of `Share.facebook`
 */
var Share,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Share = (function() {
  Share.prototype.url = null;

  function Share() {
    this.CD = __bind(this.CD, this);
    this.weibo = __bind(this.weibo, this);
    this.renren = __bind(this.renren, this);
    this.twitter = __bind(this.twitter, this);
    this.facebook = __bind(this.facebook, this);
    this.tumblr = __bind(this.tumblr, this);
    this.pinterest = __bind(this.pinterest, this);
    this.plus = __bind(this.plus, this);
    this.openWin = __bind(this.openWin, this);
    this.url = this.CD().BASE_URL;
    return null;
  }

  Share.prototype.openWin = function(url, w, h) {
    var left, top;
    left = (screen.availWidth - w) >> 1;
    top = (screen.availHeight - h) >> 1;
    window.open(url, '', 'top=' + top + ',left=' + left + ',width=' + w + ',height=' + h + ',location=no,menubar=no');
    return null;
  };

  Share.prototype.plus = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("https://plus.google.com/share?url=" + url, 650, 385);
    return null;
  };

  Share.prototype.pinterest = function(url, media, descr) {
    url = encodeURIComponent(url || this.url);
    media = encodeURIComponent(media);
    descr = encodeURIComponent(descr);
    this.openWin("http://www.pinterest.com/pin/create/button/?url=" + url + "&media=" + media + "&description=" + descr, 735, 310);
    return null;
  };

  Share.prototype.tumblr = function(url, media, descr) {
    url = encodeURIComponent(url || this.url);
    media = encodeURIComponent(media);
    descr = encodeURIComponent(descr);
    this.openWin("http://www.tumblr.com/share/photo?source=" + media + "&caption=" + descr + "&click_thru=" + url, 450, 430);
    return null;
  };

  Share.prototype.facebook = function(url, copy) {
    var decsr;
    if (copy == null) {
      copy = '';
    }
    url = encodeURIComponent(url || this.url);
    decsr = encodeURIComponent(copy);
    this.openWin("http://www.facebook.com/share.php?u=" + url + "&t=" + decsr, 600, 300);
    return null;
  };

  Share.prototype.twitter = function(url, copy) {
    var descr;
    if (copy == null) {
      copy = '';
    }
    console.log("twitter : ( url , copy = '') =>", url, copy);
    url = encodeURIComponent(url || this.url);
    if (copy === '') {
      copy = this.CD().locale.get('seo_twitter_card_description');
    }
    descr = encodeURIComponent(copy);
    this.openWin("http://twitter.com/intent/tweet/?text=" + descr + "&url=" + url, 600, 300);
    return null;
  };

  Share.prototype.renren = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("http://share.renren.com/share/buttonshare.do?link=" + url, 600, 300);
    return null;
  };

  Share.prototype.weibo = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("http://service.weibo.com/share/share.php?url=" + url + "&language=zh_cn", 600, 300);
    return null;
  };

  Share.prototype.CD = function() {
    return window.CD;
  };

  return Share;

})();

module.exports = Share;



},{}],35:[function(require,module,exports){
var AbstractView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = (function(_super) {
  __extends(AbstractView, _super);

  function AbstractView() {
    this.CD = __bind(this.CD, this);
    this.dispose = __bind(this.dispose, this);
    this.callChildrenAndSelf = __bind(this.callChildrenAndSelf, this);
    this.callChildren = __bind(this.callChildren, this);
    this.triggerChildren = __bind(this.triggerChildren, this);
    this.removeAllChildren = __bind(this.removeAllChildren, this);
    this.muteAll = __bind(this.muteAll, this);
    this.unMuteAll = __bind(this.unMuteAll, this);
    this.CSSTranslate = __bind(this.CSSTranslate, this);
    this.mouseEnabled = __bind(this.mouseEnabled, this);
    this.onResize = __bind(this.onResize, this);
    this.remove = __bind(this.remove, this);
    this.replace = __bind(this.replace, this);
    this.addChild = __bind(this.addChild, this);
    this.render = __bind(this.render, this);
    this.update = __bind(this.update, this);
    this.init = __bind(this.init, this);
    return AbstractView.__super__.constructor.apply(this, arguments);
  }

  AbstractView.prototype.el = null;

  AbstractView.prototype.id = null;

  AbstractView.prototype.children = null;

  AbstractView.prototype.template = null;

  AbstractView.prototype.templateVars = null;

  AbstractView.prototype.initialize = function() {
    var tmpHTML;
    this.children = [];
    if (this.template) {
      tmpHTML = _.template(this.CD().templates.get(this.template));
      this.setElement(tmpHTML(this.templateVars));
    }
    if (this.id) {
      this.$el.attr('id', this.id);
    }
    if (this.className) {
      this.$el.addClass(this.className);
    }
    this.init();
    this.paused = false;
    return null;
  };

  AbstractView.prototype.init = function() {
    return null;
  };

  AbstractView.prototype.update = function() {
    return null;
  };

  AbstractView.prototype.render = function() {
    return null;
  };

  AbstractView.prototype.addChild = function(child, prepend) {
    var c, target;
    if (prepend == null) {
      prepend = false;
    }
    if (child.el) {
      this.children.push(child);
    }
    target = this.addToSelector ? this.$el.find(this.addToSelector).eq(0) : this.$el;
    c = child.el ? child.$el : child;
    if (!prepend) {
      target.append(c);
    } else {
      target.prepend(c);
    }
    return this;
  };

  AbstractView.prototype.replace = function(dom, child) {
    var c;
    if (child.el) {
      this.children.push(child);
    }
    c = child.el ? child.$el : child;
    this.$el.children(dom).replaceWith(c);
    return null;
  };

  AbstractView.prototype.remove = function(child) {
    var c;
    if (child == null) {
      return;
    }
    c = child.el ? child.$el : $(child);
    if (c && child.dispose) {
      child.dispose();
    }
    if (c && this.children.indexOf(child) !== -1) {
      this.children.splice(this.children.indexOf(child), 1);
    }
    c.remove();
    return null;
  };

  AbstractView.prototype.onResize = function(event) {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (child.onResize) {
        child.onResize();
      }
    }
    return null;
  };

  AbstractView.prototype.mouseEnabled = function(enabled) {
    this.$el.css({
      "pointer-events": enabled ? "auto" : "none"
    });
    return null;
  };

  AbstractView.prototype.CSSTranslate = function(x, y, value, scale) {
    var str;
    if (value == null) {
      value = '%';
    }
    if (Modernizr.csstransforms3d) {
      str = "translate3d(" + (x + value) + ", " + (y + value) + ", 0)";
    } else {
      str = "translate(" + (x + value) + ", " + (y + value) + ")";
    }
    if (scale) {
      str = "" + str + " scale(" + scale + ")";
    }
    return str;
  };

  AbstractView.prototype.unMuteAll = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (typeof child.unMute === "function") {
        child.unMute();
      }
      if (child.children.length) {
        child.unMuteAll();
      }
    }
    return null;
  };

  AbstractView.prototype.muteAll = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (typeof child.mute === "function") {
        child.mute();
      }
      if (child.children.length) {
        child.muteAll();
      }
    }
    return null;
  };

  AbstractView.prototype.removeAllChildren = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      this.remove(child);
    }
    return null;
  };

  AbstractView.prototype.triggerChildren = function(msg, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      child.trigger(msg);
      if (child.children.length) {
        this.triggerChildren(msg, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.callChildren = function(method, params, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      if (typeof child[method] === "function") {
        child[method](params);
      }
      if (child.children.length) {
        this.callChildren(method, params, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.callChildrenAndSelf = function(method, params, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    if (typeof this[method] === "function") {
      this[method](params);
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      if (typeof child[method] === "function") {
        child[method](params);
      }
      if (child.children.length) {
        this.callChildren(method, params, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.supplantString = function(str, vals, allowSpaces) {
    var re;
    if (allowSpaces == null) {
      allowSpaces = true;
    }
    re = allowSpaces ? new RegExp('{{ ([^{}]*) }}', 'g') : new RegExp('{{([^{}]*)}}', 'g');
    return str.replace(re, function(a, b) {
      var r;
      r = vals[b];
      if (typeof r === "string" || typeof r === "number") {
        return r;
      } else {
        return a;
      }
    });
  };

  AbstractView.prototype.dispose = function() {

    /*
    		override on per view basis - unbind event handlers etc
     */
    return null;
  };

  AbstractView.prototype.CD = function() {
    return window.CD;
  };

  return AbstractView;

})(Backbone.View);

module.exports = AbstractView;



},{}],36:[function(require,module,exports){
var AbstractView, AbstractViewPage,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./AbstractView');

AbstractViewPage = (function(_super) {
  __extends(AbstractViewPage, _super);

  function AbstractViewPage() {
    this.animateIn = __bind(this.animateIn, this);
    this.setListeners = __bind(this.setListeners, this);
    this.dispose = __bind(this.dispose, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    return AbstractViewPage.__super__.constructor.apply(this, arguments);
  }

  AbstractViewPage.prototype._shown = false;

  AbstractViewPage.prototype._listening = false;

  AbstractViewPage.prototype.show = function(cb) {
    if (!!this._shown) {
      return;
    }
    this._shown = true;

    /*
    		CHANGE HERE - 'page' views are always in DOM - to save having to re-initialise gmap events (PITA). No longer require :dispose method
     */
    this.CD().appView.wrapper.addChild(this);
    this.callChildrenAndSelf('setListeners', 'on');

    /* replace with some proper transition if we can */
    this.$el.css({
      'visibility': 'visible'
    });
    if (typeof cb === "function") {
      cb();
    }
    if (this.CD().nav.changeViewCount === 1) {
      this.CD().appView.on(this.CD().appView.EVENT_PRELOADER_HIDE, this.animateIn);
    } else {
      this.animateIn();
    }
    return null;
  };

  AbstractViewPage.prototype.hide = function(cb) {
    if (!this._shown) {
      return;
    }
    this._shown = false;

    /*
    		CHANGE HERE - 'page' views are always in DOM - to save having to re-initialise gmap events (PITA). No longer require :dispose method
     */
    this.CD().appView.wrapper.remove(this);

    /* replace with some proper transition if we can */
    this.$el.css({
      'visibility': 'hidden'
    });
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };

  AbstractViewPage.prototype.dispose = function() {
    this.callChildrenAndSelf('setListeners', 'off');
    return null;
  };

  AbstractViewPage.prototype.setListeners = function(setting) {
    if (setting === this._listening) {
      return;
    }
    this._listening = setting;
    return null;
  };

  AbstractViewPage.prototype.animateIn = function() {

    /*
    		stubbed here, override in used page classes
     */
    return null;
  };

  return AbstractViewPage;

})(AbstractView);

module.exports = AbstractViewPage;



},{"./AbstractView":35}],37:[function(require,module,exports){
var API, AboutPageView, AbstractViewPage, ContributorsCollection, Requester,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

ContributorsCollection = require('../../collections/contributors/ContributorsCollection');

Requester = require('../../utils/Requester');

API = require('../../data/API');

AboutPageView = (function(_super) {
  __extends(AboutPageView, _super);

  AboutPageView.prototype.template = 'page-about';

  function AboutPageView() {
    this.getContributorsContent = __bind(this.getContributorsContent, this);
    this.getWhatContent = __bind(this.getWhatContent, this);
    this.contributors = new ContributorsCollection;
    this.templateVars = {
      label_what: this.CD().locale.get("about_label_what"),
      content_what: this.getWhatContent(),
      label_contact: this.CD().locale.get("about_label_contact"),
      content_contact: this.CD().locale.get("about_content_contact"),
      label_who: this.CD().locale.get("about_label_who")
    };
    AboutPageView.__super__.constructor.apply(this, arguments);
    this.getContributorsContent();
    return null;
  }

  AboutPageView.prototype.getWhatContent = function() {
    var contribute_url;
    contribute_url = this.CD().BASE_URL + '/' + this.CD().nav.sections.CONTRIBUTE;
    return this.supplantString(this.CD().locale.get("about_content_what"), {
      contribute_url: contribute_url
    }, false);
  };

  AboutPageView.prototype.getContributorsContent = function() {
    var r;
    r = Requester.request({
      url: this.CD().BASE_URL + '/data/_DUMMY/contributors.json',
      type: 'GET'
    });
    r.done((function(_this) {
      return function(res) {
        _this.contributors.add(res.contributors);
        return _this.$el.find('[data-contributors]').html(_this.contributors.getAboutHTML());
      };
    })(this));
    r.fail((function(_this) {
      return function(res) {
        return console.error("problem getting the contributors", res);
      };
    })(this));
    return null;
  };

  return AboutPageView;

})(AbstractViewPage);

module.exports = AboutPageView;



},{"../../collections/contributors/ContributorsCollection":10,"../../data/API":14,"../../utils/Requester":33,"../AbstractViewPage":36}],38:[function(require,module,exports){
var AbstractView, Footer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Footer = (function(_super) {
  __extends(Footer, _super);

  Footer.prototype.template = 'site-footer';

  function Footer() {
    this.templateVars = {};
    Footer.__super__.constructor.call(this);
    return null;
  }

  return Footer;

})(AbstractView);

module.exports = Footer;



},{"../AbstractView":35}],39:[function(require,module,exports){
var AbstractView, CodeWordTransitioner, Header, Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Router = require('../../router/Router');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

Header = (function(_super) {
  __extends(Header, _super);

  Header.prototype.template = 'site-header';

  Header.prototype.FIRST_HASHCHANGE = true;

  Header.prototype.DOODLE_INFO_OPEN = false;

  Header.prototype.EVENT_DOODLE_INFO_OPEN = 'EVENT_DOODLE_INFO_OPEN';

  Header.prototype.EVENT_DOODLE_INFO_CLOSE = 'EVENT_DOODLE_INFO_CLOSE';

  Header.prototype.EVENT_HOME_SCROLL_TO_TOP = 'EVENT_HOME_SCROLL_TO_TOP';

  function Header() {
    this.hideDoodleInfo = __bind(this.hideDoodleInfo, this);
    this.showDoodleInfo = __bind(this.showDoodleInfo, this);
    this.onKeyup = __bind(this.onKeyup, this);
    this.onCloseBtnClick = __bind(this.onCloseBtnClick, this);
    this.onInfoBtnClick = __bind(this.onInfoBtnClick, this);
    this.onLogoClick = __bind(this.onLogoClick, this);
    this.onWordLeave = __bind(this.onWordLeave, this);
    this.onWordEnter = __bind(this.onWordEnter, this);
    this.animateTextIn = __bind(this.animateTextIn, this);
    this._getDoodleColourScheme = __bind(this._getDoodleColourScheme, this);
    this.getSectionColour = __bind(this.getSectionColour, this);
    this.onAreaChange = __bind(this.onAreaChange, this);
    this.onHashChange = __bind(this.onHashChange, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.init = __bind(this.init, this);
    this.templateVars = {
      home: {
        label: this.CD().locale.get('header_logo_label'),
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.HOME
      },
      about: {
        label: this.CD().locale.get('header_about_label'),
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.ABOUT,
        section: this.CD().nav.sections.ABOUT
      },
      contribute: {
        label: this.CD().locale.get('header_contribute_label'),
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.CONTRIBUTE,
        section: this.CD().nav.sections.CONTRIBUTE
      },
      close_label: this.CD().locale.get('header_close_label'),
      info_label: this.CD().locale.get('header_info_label')
    };
    Header.__super__.constructor.call(this);
    this.bindEvents();
    return null;
  }

  Header.prototype.init = function() {
    this.$logo = this.$el.find('.logo__link');
    this.$navLinkAbout = this.$el.find('.about-btn');
    this.$navLinkContribute = this.$el.find('.contribute-btn');
    this.$infoBtn = this.$el.find('.info-btn');
    this.$closeBtn = this.$el.find('.close-btn');
    return null;
  };

  Header.prototype.bindEvents = function() {
    this.CD().appView.on(this.CD().appView.EVENT_PRELOADER_HIDE, this.animateTextIn);
    this.CD().router.on(Router.EVENT_HASH_CHANGED, this.onHashChange);
    this.$el.on('mouseenter', '[data-codeword]', this.onWordEnter);
    this.$el.on('mouseleave', '[data-codeword]', this.onWordLeave);
    this.$infoBtn.on('click', this.onInfoBtnClick);
    this.$closeBtn.on('click', this.onCloseBtnClick);
    this.$el.on('click', '[data-logo]', this.onLogoClick);
    this.CD().appView.$window.on('keyup', this.onKeyup);
    return null;
  };

  Header.prototype.onHashChange = function(where) {
    if (this.FIRST_HASHCHANGE) {
      this.FIRST_HASHCHANGE = false;
      return;
    }
    this.onAreaChange(where);
    return null;
  };

  Header.prototype.onAreaChange = function(section) {
    var colour;
    this.activeSection = section;
    colour = this.getSectionColour(section);
    this.$el.attr('data-section', section);
    CodeWordTransitioner["in"](this.$logo, colour);
    if (section === this.CD().nav.sections.HOME) {
      CodeWordTransitioner["in"]([this.$navLinkAbout, this.$navLinkContribute], colour);
      CodeWordTransitioner.out([this.$closeBtn, this.$infoBtn], colour);
    } else if (section === this.CD().nav.sections.DOODLES) {
      CodeWordTransitioner["in"]([this.$closeBtn, this.$infoBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$navLinkContribute], colour);
    } else if (section === this.CD().nav.sections.ABOUT) {
      CodeWordTransitioner["in"]([this.$navLinkContribute, this.$closeBtn], colour);
      CodeWordTransitioner["in"]([this.$navLinkAbout], 'black-white-bg');
      CodeWordTransitioner.out([this.$infoBtn], colour);
    } else if (section === this.CD().nav.sections.CONTRIBUTE) {
      CodeWordTransitioner["in"]([this.$navLinkAbout, this.$closeBtn], colour);
      CodeWordTransitioner["in"]([this.$navLinkContribute], 'black-white-bg');
      CodeWordTransitioner.out([this.$infoBtn], colour);
    } else if (section === 'doodle-info') {
      CodeWordTransitioner["in"]([this.$closeBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$navLinkContribute], colour);
      CodeWordTransitioner["in"]([this.$infoBtn], 'offwhite-red-bg');
    } else {
      CodeWordTransitioner["in"]([this.$closeBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$navLinkContribute, this.$infoBtn], colour);
    }
    return null;
  };

  Header.prototype.getSectionColour = function(section, wordSection) {
    var colour;
    if (wordSection == null) {
      wordSection = null;
    }
    section = section || this.CD().nav.current.area || 'home';
    if (wordSection && section === wordSection) {
      if (wordSection === 'doodle-info') {
        return 'offwhite-red-bg';
      } else {
        return 'black-white-bg';
      }
    }
    colour = (function() {
      switch (section) {
        case 'home':
        case 'doodle-info':
          return 'red';
        case this.CD().nav.sections.ABOUT:
          return 'white';
        case this.CD().nav.sections.CONTRIBUTE:
          return 'white';
        case this.CD().nav.sections.DOODLES:
          return this._getDoodleColourScheme();
        default:
          return 'white';
      }
    }).call(this);
    return colour;
  };

  Header.prototype._getDoodleColourScheme = function() {
    var colour, doodle;
    doodle = this.CD().appData.doodles.getDoodleByNavSection('current');
    colour = doodle && doodle.get('colour_scheme') === 'light' ? 'black' : 'white';
    return colour;
  };

  Header.prototype.animateTextIn = function() {
    this.onAreaChange(this.CD().nav.current.area);
    return null;
  };

  Header.prototype.onWordEnter = function(e) {
    var $el, wordSection;
    $el = $(e.currentTarget);
    wordSection = $el.attr('data-word-section');
    CodeWordTransitioner.scramble($el, this.getSectionColour(this.activeSection, wordSection));
    return null;
  };

  Header.prototype.onWordLeave = function(e) {
    var $el, wordSection;
    $el = $(e.currentTarget);
    wordSection = $el.attr('data-word-section');
    CodeWordTransitioner.unscramble($el, this.getSectionColour(this.activeSection, wordSection));
    return null;
  };

  Header.prototype.onLogoClick = function() {
    if (this.CD().nav.current.area === this.CD().nav.sections.HOME) {
      this.trigger(this.EVENT_HOME_SCROLL_TO_TOP);
    }
    return null;
  };

  Header.prototype.onInfoBtnClick = function(e) {
    e.preventDefault();
    if (this.CD().nav.current.area !== this.CD().nav.sections.DOODLES) {
      return;
    }
    if (!this.DOODLE_INFO_OPEN) {
      this.showDoodleInfo();
    }
    return null;
  };

  Header.prototype.onCloseBtnClick = function(e) {
    if (this.DOODLE_INFO_OPEN) {
      e.preventDefault();
      e.stopPropagation();
      this.hideDoodleInfo();
    }
    return null;
  };

  Header.prototype.onKeyup = function(e) {
    if (e.keyCode === 27 && this.CD().nav.current.area === this.CD().nav.sections.DOODLES) {
      this.hideDoodleInfo();
    }
    return null;
  };

  Header.prototype.showDoodleInfo = function() {
    if (!!this.DOODLE_INFO_OPEN) {
      return;
    }
    this.onAreaChange('doodle-info');
    this.trigger(this.EVENT_DOODLE_INFO_OPEN);
    this.DOODLE_INFO_OPEN = true;
    return null;
  };

  Header.prototype.hideDoodleInfo = function() {
    if (!this.DOODLE_INFO_OPEN) {
      return;
    }
    this.onAreaChange(this.CD().nav.current.area);
    this.trigger(this.EVENT_DOODLE_INFO_CLOSE);
    this.DOODLE_INFO_OPEN = false;
    return null;
  };

  return Header;

})(AbstractView);

module.exports = Header;



},{"../../router/Router":25,"../../utils/CodeWordTransitioner":28,"../AbstractView":35}],40:[function(require,module,exports){
var AbstractView, Colors, HomeView, PageTransitioner,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

HomeView = require('../home/HomeView');

Colors = require('../../config/Colors');

PageTransitioner = (function(_super) {
  __extends(PageTransitioner, _super);

  PageTransitioner.prototype.template = 'page-transitioner';

  PageTransitioner.prototype.pageLabels = null;

  PageTransitioner.prototype.palettes = {
    HOME: [Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED],
    ABOUT: [Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE],
    CONTRIBUTE: [Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED],
    DOODLES: [Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE]
  };

  PageTransitioner.prototype.activeConfig = null;

  PageTransitioner.prototype.configPresets = {
    bottomToTop: {
      finalTransform: 'translate3d(0, -100%, 0)',
      start: {
        visibility: 'visible',
        transform: 'translate3d(0, 100%, 0)'
      },
      end: {
        visibility: 'visible',
        transform: 'none'
      }
    },
    topToBottom: {
      finalTransform: 'translate3d(0, 100%, 0)',
      start: {
        visibility: 'visible',
        transform: 'translate3d(0, -100%, 0)'
      },
      end: {
        visibility: 'visible',
        transform: 'none'
      }
    },
    leftToRight: {
      finalTransform: 'translate3d(100%, 0, 0)',
      start: {
        visibility: 'visible',
        transform: 'translate3d(-100%, 0, 0)'
      },
      end: {
        visibility: 'visible',
        transform: 'none'
      }
    },
    rightToLeft: {
      finalTransform: 'translate3d(-100%, 0, 0)',
      start: {
        visibility: 'visible',
        transform: 'translate3d(100%, 0, 0)'
      },
      end: {
        visibility: 'visible',
        transform: 'none'
      }
    }
  };

  PageTransitioner.prototype.TRANSITION_TIME = 0.5;

  PageTransitioner.prototype.EVENT_TRANSITIONER_OUT_DONE = 'EVENT_TRANSITIONER_OUT_DONE';

  function PageTransitioner() {
    this.out = __bind(this.out, this);
    this["in"] = __bind(this["in"], this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    this.applyLabelConfig = __bind(this.applyLabelConfig, this);
    this.applyConfig = __bind(this.applyConfig, this);
    this._getRandomConfig = __bind(this._getRandomConfig, this);
    this._getDoodleToDoodleConfig = __bind(this._getDoodleToDoodleConfig, this);
    this.getConfig = __bind(this.getConfig, this);
    this.applyPalette = __bind(this.applyPalette, this);
    this.getPalette = __bind(this.getPalette, this);
    this.applyLabel = __bind(this.applyLabel, this);
    this.getDoodleLabel = __bind(this.getDoodleLabel, this);
    this.getAreaLabel = __bind(this.getAreaLabel, this);
    this.resetPanes = __bind(this.resetPanes, this);
    this.prepare = __bind(this.prepare, this);
    this.init = __bind(this.init, this);
    this.templateVars = {
      pageLabels: {
        HOME: this.CD().locale.get("page_transitioner_label_HOME"),
        ABOUT: this.CD().locale.get("page_transitioner_label_ABOUT"),
        CONTRIBUTE: this.CD().locale.get("page_transitioner_label_CONTRIBUTE")
      },
      pageLabelPrefix: this.CD().locale.get("page_transitioner_label_prefix")
    };
    PageTransitioner.__super__.constructor.call(this);
    return null;
  }

  PageTransitioner.prototype.init = function() {
    this.$panes = this.$el.find('[data-pane]');
    this.$labelPane = this.$el.find('[data-label-pane]');
    this.$label = this.$el.find('[data-label]');
    return null;
  };

  PageTransitioner.prototype.prepare = function(fromArea, toArea) {
    this.resetPanes();
    this.applyPalette(this.getPalette(toArea));
    this.activeConfig = this.getConfig(fromArea, toArea);
    this.applyConfig(this.activeConfig.start, toArea);
    this.applyLabelConfig(this.activeConfig.finalTransform);
    this.applyLabel(this.getAreaLabel(toArea));
    return null;
  };

  PageTransitioner.prototype.resetPanes = function() {
    this.$panes.attr({
      'style': ''
    });
    return null;
  };

  PageTransitioner.prototype.getAreaLabel = function(area, direction) {
    var label, section;
    if (direction == null) {
      direction = 'to';
    }
    section = this.CD().nav.getSection(area, true);
    if (section === 'DOODLES') {
      label = this.getDoodleLabel(direction);
    } else {
      label = this.templateVars.pageLabels[section];
    }
    return label;
  };

  PageTransitioner.prototype.getDoodleLabel = function(direction) {
    var doodle, label, section;
    section = direction === 'to' ? 'current' : 'previous';
    doodle = this.CD().appData.doodles.getDoodleByNavSection(section);
    if (doodle) {
      label = doodle.get('author.name') + ' \\ ' + doodle.get('name');
    } else {
      label = 'doodle';
    }
    return label;
  };

  PageTransitioner.prototype.applyLabel = function(toLabel) {
    this.$label.html(this.templateVars.pageLabelPrefix + ' ' + toLabel + '...');
    return null;
  };

  PageTransitioner.prototype.getPalette = function(area) {
    var section;
    section = this.CD().nav.getSection(area, true);
    return this.palettes[section] || this.palettes.HOME;
  };

  PageTransitioner.prototype.applyPalette = function(palette) {
    this.$panes.each((function(_this) {
      return function(i) {
        return _this.$panes.eq(i).css({
          'background-color': palette[i]
        });
      };
    })(this));
    return null;
  };

  PageTransitioner.prototype.getConfig = function(fromArea, toArea) {
    var config;
    if (!HomeView.visitedThisSession && toArea === this.CD().nav.sections.HOME) {
      config = this.configPresets.bottomToTop;
    } else if (fromArea === this.CD().nav.sections.DOODLES && toArea === this.CD().nav.sections.DOODLES) {
      config = this._getDoodleToDoodleConfig();
    } else if (toArea === this.CD().nav.sections.ABOUT || toArea === this.CD().nav.sections.CONTRIBUTE) {
      config = this._getRandomConfig();
    } else {
      config = this._getRandomConfig();
    }
    return config;
  };

  PageTransitioner.prototype._getDoodleToDoodleConfig = function(prevSlug, nextSlug) {
    var currentDoodle, currentDoodleIdx, previousDoodle, previousDoodleIdx, _config;
    previousDoodle = this.CD().appData.doodles.getDoodleByNavSection('previous');
    previousDoodleIdx = this.CD().appData.doodles.indexOf(previousDoodle);
    currentDoodle = this.CD().appData.doodles.getDoodleByNavSection('current');
    currentDoodleIdx = this.CD().appData.doodles.indexOf(currentDoodle);
    _config = previousDoodleIdx > currentDoodleIdx ? this.configPresets.leftToRight : this.configPresets.rightToLeft;
    return _config;
  };

  PageTransitioner.prototype._getRandomConfig = function() {
    var _config;
    _config = _.shuffle(this.configPresets)[0];
    return _config;
  };

  PageTransitioner.prototype.applyConfig = function(config, toArea) {
    var classChange;
    if (toArea == null) {
      toArea = null;
    }
    this.$panes.css(config);
    classChange = toArea === this.CD().nav.sections.DOODLES ? 'addClass' : 'removeClass';
    this.$el[classChange]('show-dots');
    return null;
  };

  PageTransitioner.prototype.applyLabelConfig = function(transformValue) {
    this.$labelPane.css({
      'transform': transformValue
    });
    return null;
  };

  PageTransitioner.prototype.show = function() {
    this.$el.addClass('show');
    return null;
  };

  PageTransitioner.prototype.hide = function() {
    this.$el.removeClass('show');
    return null;
  };

  PageTransitioner.prototype["in"] = function(cb) {
    var commonParams, labelParams;
    this.show();
    commonParams = {
      transform: 'none',
      ease: Expo.easeOut,
      force3D: true
    };
    this.$panes.each((function(_this) {
      return function(i, el) {
        var params;
        params = _.extend({}, commonParams, {
          delay: i * 0.05
        });
        if (i === 2) {
          params.onComplete = function() {
            _this.applyConfig(_this.activeConfig.end);
            return typeof cb === "function" ? cb() : void 0;
          };
        }
        return TweenLite.to($(el), _this.TRANSITION_TIME, params);
      };
    })(this));
    labelParams = _.extend({}, commonParams, {
      delay: 0.1
    });
    TweenLite.to(this.$labelPane, this.TRANSITION_TIME, labelParams);
    return null;
  };

  PageTransitioner.prototype.out = function(cb) {
    var commonParams, labelParams;
    commonParams = {
      ease: Expo.easeOut,
      force3D: true,
      clearProps: 'all'
    };
    this.$panes.each((function(_this) {
      return function(i, el) {
        var params;
        params = _.extend({}, commonParams, {
          delay: 0.1 - (0.05 * i),
          transform: _this.activeConfig.finalTransform
        });
        if (i === 0) {
          params.onComplete = function() {
            _this.hide();
            if (typeof cb === "function") {
              cb();
            }
            _this.trigger(_this.EVENT_TRANSITIONER_OUT_DONE);
            return console.log("@trigger @EVENT_TRANSITIONER_OUT_DONE");
          };
        }
        return TweenLite.to($(el), _this.TRANSITION_TIME, params);
      };
    })(this));
    labelParams = _.extend({}, commonParams, {
      transform: this.activeConfig.start.transform
    });
    TweenLite.to(this.$labelPane, this.TRANSITION_TIME, labelParams);
    return null;
  };

  return PageTransitioner;

})(AbstractView);

module.exports = PageTransitioner;



},{"../../config/Colors":13,"../AbstractView":35,"../home/HomeView":47}],41:[function(require,module,exports){
var AbstractView, CodeWordTransitioner, Preloader,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

Preloader = (function(_super) {
  __extends(Preloader, _super);

  Preloader.prototype.cb = null;

  Preloader.prototype.TRANSITION_TIME = 0.5;

  Preloader.prototype.MIN_WRONG_CHARS = 0;

  Preloader.prototype.MAX_WRONG_CHARS = 4;

  Preloader.prototype.MIN_CHAR_IN_DELAY = 30;

  Preloader.prototype.MAX_CHAR_IN_DELAY = 100;

  Preloader.prototype.MIN_CHAR_OUT_DELAY = 30;

  Preloader.prototype.MAX_CHAR_OUT_DELAY = 100;

  Preloader.prototype.CHARS = 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split('');

  function Preloader() {
    this.animateBgOut = __bind(this.animateBgOut, this);
    this.animateOut = __bind(this.animateOut, this);
    this.onHideComplete = __bind(this.onHideComplete, this);
    this.hide = __bind(this.hide, this);
    this.onShowComplete = __bind(this.onShowComplete, this);
    this.playIntroAnimation = __bind(this.playIntroAnimation, this);
    this.init = __bind(this.init, this);
    this.setElement($('#preloader'));
    Preloader.__super__.constructor.call(this);
    return null;
  }

  Preloader.prototype.init = function() {
    this.$codeWord = this.$el.find('[data-codeword]');
    this.$bg1 = this.$el.find('[data-bg="1"]');
    this.$bg2 = this.$el.find('[data-bg="2"]');
    return null;
  };

  Preloader.prototype.playIntroAnimation = function(cb) {
    this.cb = cb;
    console.log("show : (@cb) =>");
    this.$el.find('[data-dots]').remove().end().addClass('show-preloader');
    CodeWordTransitioner["in"](this.$codeWord, 'white', false, this.hide);
    return null;
  };

  Preloader.prototype.onShowComplete = function() {
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Preloader.prototype.hide = function() {
    this.animateOut(this.onHideComplete);
    return null;
  };

  Preloader.prototype.onHideComplete = function() {
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Preloader.prototype.animateOut = function(cb) {
    setTimeout((function(_this) {
      return function() {
        var anagram;
        anagram = _.shuffle('codedoodl.es'.split('')).join('');
        return CodeWordTransitioner.to(anagram, _this.$codeWord, 'white', false, function() {
          return _this.animateBgOut(cb);
        });
      };
    })(this), 2000);
    return null;
  };

  Preloader.prototype.animateBgOut = function(cb) {
    TweenLite.to(this.$bg1, 0.5, {
      delay: 0.2,
      width: "100%",
      ease: Expo.easeOut
    });
    TweenLite.to(this.$bg1, 0.6, {
      delay: 0.7,
      height: "100%",
      ease: Expo.easeOut
    });
    TweenLite.to(this.$bg2, 0.4, {
      delay: 0.4,
      width: "100%",
      ease: Expo.easeOut
    });
    TweenLite.to(this.$bg2, 0.5, {
      delay: 0.8,
      height: "100%",
      ease: Expo.easeOut,
      onComplete: cb
    });
    setTimeout((function(_this) {
      return function() {
        return CodeWordTransitioner["in"](_this.$codeWord, '', false);
      };
    })(this), 400);
    setTimeout((function(_this) {
      return function() {
        return _this.$el.removeClass('show-preloader');
      };
    })(this), 1200);
    return null;
  };

  return Preloader;

})(AbstractView);

module.exports = Preloader;



},{"../../utils/CodeWordTransitioner":28,"../AbstractView":35}],42:[function(require,module,exports){
var AboutPageView, AbstractView, ContributePageView, DoodlePageView, FourOhFourPageView, HomeView, Nav, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

HomeView = require('../home/HomeView');

AboutPageView = require('../aboutPage/AboutPageView');

ContributePageView = require('../contributePage/ContributePageView');

DoodlePageView = require('../doodlePage/DoodlePageView');

FourOhFourPageView = require('../fourOhFourPage/FourOhFourPageView');

Nav = require('../../router/Nav');

Wrapper = (function(_super) {
  __extends(Wrapper, _super);

  Wrapper.prototype.VIEW_TYPE_PAGE = 'page';

  Wrapper.prototype.template = 'wrapper';

  Wrapper.prototype.views = null;

  Wrapper.prototype.previousView = null;

  Wrapper.prototype.currentView = null;

  Wrapper.prototype.pageSwitchDfd = null;

  function Wrapper() {
    this.transitionViews = __bind(this.transitionViews, this);
    this.changeSubView = __bind(this.changeSubView, this);
    this.changeView = __bind(this.changeView, this);
    this.updateDims = __bind(this.updateDims, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.start = __bind(this.start, this);
    this.init = __bind(this.init, this);
    this.getViewByRoute = __bind(this.getViewByRoute, this);
    this.addClasses = __bind(this.addClasses, this);
    this.createClasses = __bind(this.createClasses, this);
    this.views = {
      home: {
        classRef: HomeView,
        route: this.CD().nav.sections.HOME,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      about: {
        classRef: AboutPageView,
        route: this.CD().nav.sections.ABOUT,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      contribute: {
        classRef: ContributePageView,
        route: this.CD().nav.sections.CONTRIBUTE,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      doodle: {
        classRef: DoodlePageView,
        route: this.CD().nav.sections.DOODLES,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      fourOhFour: {
        classRef: FourOhFourPageView,
        route: false,
        view: null,
        type: this.VIEW_TYPE_PAGE
      }
    };
    this.createClasses();
    Wrapper.__super__.constructor.call(this);
    return null;
  }

  Wrapper.prototype.createClasses = function() {
    var data, name, _ref;
    _ref = this.views;
    for (name in _ref) {
      data = _ref[name];
      this.views[name].view = new this.views[name].classRef;
    }
    return null;
  };

  Wrapper.prototype.addClasses = function() {
    var data, name, _ref, _results;
    _ref = this.views;
    _results = [];
    for (name in _ref) {
      data = _ref[name];
      if (data.type === this.VIEW_TYPE_PAGE) {
        _results.push(this.addChild(data.view));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  null;

  Wrapper.prototype.getViewByRoute = function(route) {
    var data, name, _ref;
    _ref = this.views;
    for (name in _ref) {
      data = _ref[name];
      if (route === this.views[name].route) {
        return this.views[name];
      }
    }
    if (route) {
      return this.views.fourOhFour;
    }
    return null;
  };

  Wrapper.prototype.init = function() {
    this.CD().appView.on('start', this.start);
    return null;
  };

  Wrapper.prototype.start = function() {
    this.CD().appView.off('start', this.start);
    this.bindEvents();
    this.updateDims();
    return null;
  };

  Wrapper.prototype.bindEvents = function() {
    this.CD().nav.on(Nav.EVENT_CHANGE_VIEW, this.changeView);
    this.CD().nav.on(Nav.EVENT_CHANGE_SUB_VIEW, this.changeSubView);
    this.CD().appView.on(this.CD().appView.EVENT_UPDATE_DIMENSIONS, this.updateDims);
    return null;
  };

  Wrapper.prototype.updateDims = function() {
    this.$el.css('min-height', this.CD().appView.dims.h);
    return null;
  };

  Wrapper.prototype.changeView = function(previous, current) {
    if (this.pageSwitchDfd && this.pageSwitchDfd.state() !== 'resolved') {
      (function(_this) {
        return (function(previous, current) {
          return _this.pageSwitchDfd.done(function() {
            return _this.changeView(previous, current);
          });
        });
      })(this)(previous, current);
      return;
    }
    this.previousView = this.getViewByRoute(previous.area);
    this.currentView = this.getViewByRoute(current.area);
    if (!this.previousView) {
      this.transitionViews(false, this.currentView);
    } else {
      this.transitionViews(this.previousView, this.currentView);
    }
    return null;
  };

  Wrapper.prototype.changeSubView = function(current) {
    this.currentView.view.trigger(Nav.EVENT_CHANGE_SUB_VIEW, current.sub);
    return null;
  };

  Wrapper.prototype.transitionViews = function(from, to) {
    this.pageSwitchDfd = $.Deferred();
    if (from && to) {
      this.CD().appView.transitioner.prepare(from.route, to.route);
      this.CD().appView.transitioner["in"]((function(_this) {
        return function() {
          return from.view.hide(function() {
            return to.view.show(function() {
              return _this.CD().appView.transitioner.out(function() {
                return _this.pageSwitchDfd.resolve();
              });
            });
          });
        };
      })(this));
    } else if (from) {
      from.view.hide(this.pageSwitchDfd.resolve);
    } else if (to) {
      to.view.show(this.pageSwitchDfd.resolve);
    }
    return null;
  };

  return Wrapper;

})(AbstractView);

module.exports = Wrapper;



},{"../../router/Nav":24,"../AbstractView":35,"../aboutPage/AboutPageView":37,"../contributePage/ContributePageView":43,"../doodlePage/DoodlePageView":44,"../fourOhFourPage/FourOhFourPageView":45,"../home/HomeView":47}],43:[function(require,module,exports){
var AbstractViewPage, ContributePageView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

ContributePageView = (function(_super) {
  __extends(ContributePageView, _super);

  ContributePageView.prototype.template = 'page-contribute';

  function ContributePageView() {
    this.templateVars = {
      label_submit: this.CD().locale.get("contribute_label_submit"),
      content_submit: this.CD().locale.get("contribute_content_submit"),
      label_contact: this.CD().locale.get("contribute_label_contact"),
      content_contact: this.CD().locale.get("contribute_content_contact")
    };
    ContributePageView.__super__.constructor.apply(this, arguments);
    return null;
  }

  return ContributePageView;

})(AbstractViewPage);

module.exports = ContributePageView;



},{"../AbstractViewPage":36}],44:[function(require,module,exports){
var AbstractViewPage, DoodlePageView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

DoodlePageView = (function(_super) {
  __extends(DoodlePageView, _super);

  DoodlePageView.prototype.template = 'page-doodle';

  DoodlePageView.prototype.model = null;

  function DoodlePageView() {
    this.getShareDesc = __bind(this.getShareDesc, this);
    this.onShareBtnClick = __bind(this.onShareBtnClick, this);
    this.onInfoClose = __bind(this.onInfoClose, this);
    this.onInfoOpen = __bind(this.onInfoOpen, this);
    this._getInteractionContent = __bind(this._getInteractionContent, this);
    this.getDoodleInfoContent = __bind(this.getDoodleInfoContent, this);
    this.getDoodle = __bind(this.getDoodle, this);
    this.showFrame = __bind(this.showFrame, this);
    this.setupNavLinks = __bind(this.setupNavLinks, this);
    this.setupUI = __bind(this.setupUI, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    this.setListeners = __bind(this.setListeners, this);
    this.init = __bind(this.init, this);
    this.templateVars = {};
    DoodlePageView.__super__.constructor.call(this);
    return null;
  }

  DoodlePageView.prototype.init = function() {
    this.$frame = this.$el.find('[data-doodle-frame]');
    this.$infoContent = this.$el.find('[data-doodle-info]');
    this.$mouse = this.$el.find('[data-indicator="mouse"]');
    this.$keyboard = this.$el.find('[data-indicator="keyboard"]');
    this.$touch = this.$el.find('[data-indicator="touch"]');
    this.$prevDoodleNav = this.$el.find('[data-doodle-nav="prev"]');
    this.$nextDoodleNav = this.$el.find('[data-doodle-nav="next"]');
    return null;
  };

  DoodlePageView.prototype.setListeners = function(setting) {
    this.CD().appView.header[setting](this.CD().appView.header.EVENT_DOODLE_INFO_OPEN, this.onInfoOpen);
    this.CD().appView.header[setting](this.CD().appView.header.EVENT_DOODLE_INFO_CLOSE, this.onInfoClose);
    this.$el[setting]('click', '[data-share-btn]', this.onShareBtnClick);
    return null;
  };

  DoodlePageView.prototype.show = function(cb) {
    this.model = this.getDoodle();
    this.setupUI();
    DoodlePageView.__super__.show.apply(this, arguments);
    if (this.CD().nav.changeViewCount === 1) {
      this.showFrame(false);
    } else {
      this.CD().appView.transitioner.on(this.CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, this.showFrame);
    }
    return null;
  };

  DoodlePageView.prototype.hide = function(cb) {
    this.CD().appView.header.hideDoodleInfo();
    DoodlePageView.__super__.hide.apply(this, arguments);
    return null;
  };

  DoodlePageView.prototype.setupUI = function() {
    this.$infoContent.html(this.getDoodleInfoContent());
    this.$el.attr('data-color-scheme', this.model.get('colour_scheme'));
    this.$frame.attr('src', '').removeClass('show');
    this.$mouse.attr('disabled', !this.model.get('interaction.mouse'));
    this.$keyboard.attr('disabled', !this.model.get('interaction.keyboard'));
    this.$touch.attr('disabled', !this.model.get('interaction.touch'));
    this.setupNavLinks();
    return null;
  };

  DoodlePageView.prototype.setupNavLinks = function() {
    var nextDoodle, prevDoodle;
    prevDoodle = this.CD().appData.doodles.getPrevDoodle(this.model);
    nextDoodle = this.CD().appData.doodles.getNextDoodle(this.model);
    if (prevDoodle) {
      this.$prevDoodleNav.attr('href', prevDoodle.get('url')).addClass('show');
    } else {
      this.$prevDoodleNav.removeClass('show');
    }
    if (nextDoodle) {
      this.$nextDoodleNav.attr('href', nextDoodle.get('url')).addClass('show');
    } else {
      this.$nextDoodleNav.removeClass('show');
    }
    return null;
  };

  DoodlePageView.prototype.showFrame = function(removeEvent) {
    var srcDir;
    if (removeEvent == null) {
      removeEvent = true;
    }
    if (removeEvent) {
      this.CD().appView.transitioner.off(this.CD().appView.transitioner.EVENT_TRANSITIONER_OUT_DONE, this.showFrame);
    }
    srcDir = this.model.get('colour_scheme') === 'light' ? 'shape-stream-light' : 'shape-stream';
    this.$frame.attr('src', "http://source.codedoodl.es/sample_doodles/" + srcDir + "/index.html");
    this.$frame.one('load', (function(_this) {
      return function() {
        return _this.$frame.addClass('show');
      };
    })(this));
    return null;
  };

  DoodlePageView.prototype.getDoodle = function() {
    var doodle;
    doodle = this.CD().appData.doodles.getDoodleBySlug(this.CD().nav.current.sub + '/' + this.CD().nav.current.ter);
    return doodle;
  };

  DoodlePageView.prototype.getDoodleInfoContent = function() {
    var doodleInfoContent, doodleInfoVars;
    this.model.setShortlink();
    doodleInfoVars = {
      indexHTML: this.model.get('indexHTML'),
      label_author: this.CD().locale.get("doodle_label_author"),
      content_author: this.model.getAuthorHtml(),
      label_doodle_name: this.CD().locale.get("doodle_label_doodle_name"),
      content_doodle_name: this.model.get('name'),
      label_description: this.CD().locale.get("doodle_label_description"),
      content_description: this.model.get('description'),
      label_tags: this.CD().locale.get("doodle_label_tags"),
      content_tags: this.model.get('tags').join(', '),
      label_interaction: this.CD().locale.get("doodle_label_interaction"),
      content_interaction: this._getInteractionContent(),
      label_share: this.CD().locale.get("doodle_label_share"),
      share_url: this.CD().BASE_URL + '/' + this.model.get('shortlink'),
      share_url_text: this.CD().BASE_URL.replace('http://', '') + '/' + this.model.get('shortlink')
    };
    doodleInfoContent = _.template(this.CD().templates.get('doodle-info'))(doodleInfoVars);
    return doodleInfoContent;
  };

  DoodlePageView.prototype._getInteractionContent = function() {
    var interactions;
    interactions = [];
    if (this.model.get('interaction.mouse')) {
      interactions.push(this.CD().locale.get("doodle_label_interaction_mouse"));
    }
    if (this.model.get('interaction.keyboard')) {
      interactions.push(this.CD().locale.get("doodle_label_interaction_keyboard"));
    }
    if (this.model.get('interaction.touch')) {
      interactions.push(this.CD().locale.get("doodle_label_interaction_touch"));
    }
    return interactions.join(', ') || this.CD().locale.get("doodle_label_interaction_none");
  };

  DoodlePageView.prototype.onInfoOpen = function() {
    this.$el.addClass('show-info');
    return null;
  };

  DoodlePageView.prototype.onInfoClose = function() {
    this.$el.removeClass('show-info');
    return null;
  };

  DoodlePageView.prototype.onShareBtnClick = function(e) {
    var desc, shareMethod, url;
    e.preventDefault();
    url = ' ';
    desc = this.getShareDesc();
    shareMethod = $(e.currentTarget).attr('data-share-btn');
    this.CD().share[shareMethod](url, desc);
    return null;
  };

  DoodlePageView.prototype.getShareDesc = function() {
    var desc, vars;
    vars = {
      doodle_name: this.model.get('name'),
      doodle_author: this.model.get('author.twitter') ? "@" + (this.model.get('author.twitter')) : this.model.get('author.name'),
      share_url: this.CD().BASE_URL + '/' + this.model.get('shortlink'),
      doodle_tags: _.map(this.model.get('tags'), function(tag) {
        return '#' + tag;
      }).join(' ')
    };
    desc = this.supplantString(this.CD().locale.get('doodle_share_text_tmpl'), vars, false);
    return desc.replace(/&nbsp;/g, ' ');
  };

  return DoodlePageView;

})(AbstractViewPage);

module.exports = DoodlePageView;



},{"../AbstractViewPage":36}],45:[function(require,module,exports){
var AbstractViewPage, FourOhFourPageView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

FourOhFourPageView = (function(_super) {
  __extends(FourOhFourPageView, _super);

  FourOhFourPageView.prototype.template = 'page-four-oh-four';

  function FourOhFourPageView() {
    this.templateVars = {
      text: this.CD().locale.get("four_oh_four_page_text")
    };
    FourOhFourPageView.__super__.constructor.apply(this, arguments);
    return null;
  }

  return FourOhFourPageView;

})(AbstractViewPage);

module.exports = FourOhFourPageView;



},{"../AbstractViewPage":36}],46:[function(require,module,exports){
var AbstractView, CodeWordTransitioner, HomeGridItem, HomeView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

HomeView = require('./HomeView');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

HomeGridItem = (function(_super) {
  __extends(HomeGridItem, _super);

  HomeGridItem.prototype.template = 'home-grid-item';

  HomeGridItem.prototype.visible = false;

  HomeGridItem.prototype.offset = 0;

  HomeGridItem.prototype.maxOffset = null;

  HomeGridItem.prototype.acceleration = null;

  HomeGridItem.prototype.ease = null;

  HomeGridItem.prototype.ITEM_MIN_OFFSET = 50;

  HomeGridItem.prototype.ITEM_MAX_OFFSET = 200;

  HomeGridItem.prototype.ITEM_MIN_EASE = 100;

  HomeGridItem.prototype.ITEM_MAX_EASE = 400;

  function HomeGridItem(model, parentGrid) {
    this.model = model;
    this.parentGrid = parentGrid;
    this.onTick = __bind(this.onTick, this);
    this.onMouseOver = __bind(this.onMouseOver, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    this.setListeners = __bind(this.setListeners, this);
    this.init = __bind(this.init, this);
    this.setOffsetAndEase = __bind(this.setOffsetAndEase, this);
    this.templateVars = _.extend({}, this.model.toJSON());
    HomeGridItem.__super__.constructor.apply(this, arguments);
    return null;
  }

  HomeGridItem.prototype.setOffsetAndEase = function(idx, colCount) {
    this.maxOffset = (((idx % colCount) + 1) * this.ITEM_MIN_OFFSET) / 10;
    this.ease = (((idx % colCount) + 1) * this.ITEM_MIN_EASE) / 100;
    return null;
  };

  HomeGridItem.prototype.init = function() {
    this.$authorName = this.$el.find('[data-codeword="author_name"]');
    this.$doodleName = this.$el.find('[data-codeword="name"]');
    return null;
  };

  HomeGridItem.prototype.setListeners = function(setting) {
    this.$el[setting]('mouseover', this.onMouseOver);
    this.parentGrid[setting](this.parentGrid.EVENT_TICK, this.onTick);
    return null;
  };

  HomeGridItem.prototype.show = function(animateText) {
    if (animateText == null) {
      animateText = false;
    }
    this.visible = true;
    this.$el.addClass('show-item');
    if (animateText) {
      CodeWordTransitioner.to(this.model.get('author.name'), this.$authorName, 'blue');
      CodeWordTransitioner.to(this.model.get('name'), this.$doodleName, 'blue');
    }
    return null;
  };

  HomeGridItem.prototype.hide = function() {
    this.visible = false;
    this.$el.removeClass('show-item');
    return null;
  };

  HomeGridItem.prototype.onMouseOver = function() {
    CodeWordTransitioner.to(this.model.get('author.name'), this.$authorName, 'blue');
    CodeWordTransitioner.to(this.model.get('name'), this.$doodleName, 'blue');
    return null;
  };

  HomeGridItem.prototype.onTick = function(scrollDelta) {
    scrollDelta = scrollDelta *= 0.4;
    if (scrollDelta > this.maxOffset) {
      scrollDelta = this.maxOffset;
    } else if (scrollDelta < -this.maxOffset) {
      scrollDelta = -this.maxOffset;
    } else {
      scrollDelta = (scrollDelta / this.maxOffset) * this.maxOffset;
    }
    this.offset = scrollDelta * this.ease;
    this.$el.css({
      'transform': this.CSSTranslate(0, this.offset, 'px')
    });
    return null;
  };

  return HomeGridItem;

})(AbstractView);

module.exports = HomeGridItem;



},{"../../utils/CodeWordTransitioner":28,"../AbstractView":35,"./HomeView":47}],47:[function(require,module,exports){
var AbstractViewPage, HomeGridItem, HomeView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

HomeGridItem = require('./HomeGridItem');

HomeView = (function(_super) {
  __extends(HomeView, _super);

  HomeView.visitedThisSession = false;

  HomeView.gridItems = [];

  HomeView.dims = {
    item: {
      h: 268,
      w: 200,
      margin: 20,
      a: 0
    },
    container: {
      h: 0,
      w: 0,
      a: 0,
      pt: 25
    }
  };

  HomeView.colCount = 0;

  HomeView.scrollDelta = 0;

  HomeView.scrollDistance = 0;

  HomeView.ticking = false;

  HomeView.SHOW_ROW_THRESHOLD = 0.3;

  HomeView.prototype.EVENT_TICK = 'EVENT_TICK';

  HomeView.prototype.template = 'page-home';

  HomeView.prototype.addToSelector = '[data-home-grid]';

  HomeView.prototype.allDoodles = null;

  function HomeView() {
    this.animateItemIn = __bind(this.animateItemIn, this);
    this.animateInInitialItems = __bind(this.animateInInitialItems, this);
    this.getRequiredDoodleCountByArea = __bind(this.getRequiredDoodleCountByArea, this);
    this._getItemPositionDataByIndex = __bind(this._getItemPositionDataByIndex, this);
    this.checkItemsForVisibility = __bind(this.checkItemsForVisibility, this);
    this.setVisibleItemsAsShown = __bind(this.setVisibleItemsAsShown, this);
    this.animateIn = __bind(this.animateIn, this);
    this.startScroller = __bind(this.startScroller, this);
    this.show = __bind(this.show, this);
    this.scrollToTop = __bind(this.scrollToTop, this);
    this.onTick = __bind(this.onTick, this);
    this.onScroll = __bind(this.onScroll, this);
    this.onScrollEnd = __bind(this.onScrollEnd, this);
    this.onScrollStart = __bind(this.onScrollStart, this);
    this.onResize = __bind(this.onResize, this);
    this.setItemsOffsetAndEase = __bind(this.setItemsOffsetAndEase, this);
    this.setupIScroll = __bind(this.setupIScroll, this);
    this.setupDims = __bind(this.setupDims, this);
    this.setListeners = __bind(this.setListeners, this);
    this.init = __bind(this.init, this);
    this.addGridItems = __bind(this.addGridItems, this);
    this.templateVars = {};
    this.allDoodles = this.CD().appData.doodles;
    HomeView.__super__.constructor.call(this);
    this.addGridItems();
    return null;
  }

  HomeView.prototype.addGridItems = function() {
    var doodle, item, _i, _len, _ref;
    _ref = this.allDoodles.models;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      doodle = _ref[_i];
      item = new HomeGridItem(doodle, this);
      HomeView.gridItems.push(item);
      this.addChild(item);
    }
    return null;
  };

  HomeView.prototype.init = function() {
    this.$grid = this.$el.find('[data-home-grid]');
    return null;
  };

  HomeView.prototype.setListeners = function(setting) {
    this.CD().appView[setting](this.CD().appView.EVENT_UPDATE_DIMENSIONS, this.onResize);
    this.CD().appView.header[setting](this.CD().appView.header.EVENT_HOME_SCROLL_TO_TOP, this.scrollToTop);
    if (setting === 'off') {
      this.scroller.off('scroll', this.onScroll);
      this.scroller.off('scrollStart', this.onScrollStart);
      this.scroller.off('scrollEnd', this.onScrollEnd);
      this.scroller.destroy();
      this.scroller = null;
    }
    return null;
  };

  HomeView.prototype.setupDims = function() {
    var gridWidth;
    gridWidth = this.$grid.outerWidth();
    HomeView.colCount = Math.round(gridWidth / HomeView.dims.item.w);
    HomeView.dims.container = {
      h: this.CD().appView.dims.h,
      w: gridWidth,
      a: this.CD().appView.dims.h * gridWidth,
      pt: 25
    };
    HomeView.dims.item.a = HomeView.dims.item.h * (HomeView.dims.item.w + ((HomeView.dims.item.margin * (HomeView.colCount - 1)) / HomeView.colCount));
    return null;
  };

  HomeView.prototype.setupIScroll = function() {
    var iScrollOpts;
    iScrollOpts = {
      probeType: 3,
      mouseWheel: true,
      scrollbars: true,
      interactiveScrollbars: true,
      fadeScrollbars: true,
      momentum: false,
      bounce: false
    };
    this.scroller = new IScroll(this.$el[0], iScrollOpts);
    this.scroller.on('scroll', this.onScroll);
    this.scroller.on('scrollStart', this.onScrollStart);
    this.scroller.on('scrollEnd', this.onScrollEnd);
    return null;
  };

  HomeView.prototype.setItemsOffsetAndEase = function() {
    var i, item, _i, _len, _ref;
    _ref = HomeView.gridItems;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      item = _ref[i];
      item.setOffsetAndEase(i, HomeView.colCount);
    }
    return null;
  };

  HomeView.prototype.onResize = function() {
    this.setupDims();
    this.setItemsOffsetAndEase();
    if (this.scroller) {
      this.onScroll();
      this.onScrollEnd();
    }
    return null;
  };

  HomeView.prototype.onScrollStart = function() {
    this.$grid.removeClass('enable-grid-item-hover');
    if (!this.ticking) {
      this.ticking = true;
      requestAnimationFrame(this.onTick);
    }
    return null;
  };

  HomeView.prototype.onScrollEnd = function() {
    this.$grid.addClass('enable-grid-item-hover');
    HomeView.scrollDelta = 0;
    this.setVisibleItemsAsShown();
    return null;
  };

  HomeView.prototype.onScroll = function() {
    if (this.scroller) {
      HomeView.scrollDelta = -this.scroller.y - HomeView.scrollDistance;
      HomeView.scrollDistance = -this.scroller.y;
    } else {
      HomeView.scrollDelta = HomeView.scrollDistance = 0;
    }
    this.checkItemsForVisibility();
    return null;
  };

  HomeView.prototype.onTick = function() {
    var i, item, shouldTick, _i, _len, _ref;
    this.trigger(this.EVENT_TICK, HomeView.scrollDelta);
    shouldTick = false;
    _ref = HomeView.gridItems;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      item = _ref[i];
      if (item.offset !== 0) {
        shouldTick = true;
        break;
      }
    }
    if (shouldTick) {
      requestAnimationFrame(this.onTick);
    } else {
      this.ticking = false;
    }
    return null;
  };

  HomeView.prototype.scrollToTop = function() {
    if (!this.scroller) {
      return;
    }
    this.scroller.scrollTo(0, 0, 700, IScroll.utils.ease.quadratic);
    return null;
  };

  HomeView.prototype.show = function() {
    HomeView.__super__.show.apply(this, arguments);
    return null;
  };

  HomeView.prototype.startScroller = function() {
    this.setupDims();
    this.setupIScroll();
    this.scroller.scrollTo(0, -HomeView.scrollDistance);
    this.setItemsOffsetAndEase();
    this.onScroll();
    this.onScrollEnd();
    return null;
  };

  HomeView.prototype.animateIn = function() {
    this.setupDims();
    if (!HomeView.visitedThisSession) {
      HomeView.visitedThisSession = true;
      this.animateInInitialItems(this.startScroller);
    } else {
      this.startScroller();
    }
    return null;
  };

  HomeView.prototype.setVisibleItemsAsShown = function() {
    var i, item, itemsToShow, position, _fn, _i, _j, _len, _len1, _ref;
    itemsToShow = [];
    _ref = HomeView.gridItems;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      item = _ref[i];
      position = this._getItemPositionDataByIndex(i);
      if (position.visibility > 0) {
        itemsToShow.push(item);
      } else {
        item.hide();
      }
    }
    _fn = (function(_this) {
      return function(item, i) {
        return setTimeout(item.show, (500 * 0.1) * i);
      };
    })(this);
    for (i = _j = 0, _len1 = itemsToShow.length; _j < _len1; i = ++_j) {
      item = itemsToShow[i];
      _fn(item, i);
    }
    return null;
  };

  HomeView.prototype.checkItemsForVisibility = function() {
    var i, item, offset, position, _i, _len, _ref;
    _ref = HomeView.gridItems;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      item = _ref[i];
      position = this._getItemPositionDataByIndex(i);
      offset = item.maxOffset - (position.visibility * item.maxOffset);
      item.$el.css({
        'visibility': position.visibility > 0 ? 'visible' : 'hidden',
        'opacity': position.visibility > 0 ? 1 : 0
      });
    }
    return null;
  };

  HomeView.prototype._getItemPositionDataByIndex = function(idx) {
    var perc, position, verticalOffset;
    verticalOffset = (Math.floor(idx / HomeView.colCount) * HomeView.dims.item.h) + HomeView.dims.container.pt;
    position = {
      visibility: 1,
      transform: '+'
    };
    if (verticalOffset + HomeView.dims.item.h < HomeView.scrollDistance || verticalOffset > HomeView.scrollDistance + HomeView.dims.container.h) {
      position = {
        visibility: 0,
        transform: '+'
      };
    } else if (verticalOffset > HomeView.scrollDistance && verticalOffset + HomeView.dims.item.h < HomeView.scrollDistance + HomeView.dims.container.h) {
      position = {
        visibility: 1,
        transform: '+'
      };
    } else if (verticalOffset < HomeView.scrollDistance && verticalOffset + HomeView.dims.item.h > HomeView.scrollDistance) {
      perc = 1 - ((HomeView.scrollDistance - verticalOffset) / HomeView.dims.item.h);
      position = {
        visibility: perc,
        transform: '-'
      };
    } else if (verticalOffset < HomeView.scrollDistance + HomeView.dims.container.h && verticalOffset + HomeView.dims.item.h > HomeView.scrollDistance + HomeView.dims.container.h) {
      perc = ((HomeView.scrollDistance + HomeView.dims.container.h) - verticalOffset) / HomeView.dims.item.h;
      position = {
        visibility: perc,
        transform: '+'
      };
    }
    return position;
  };

  HomeView.prototype.getRequiredDoodleCountByArea = function() {
    var targetItems, targetRows, totalArea;
    totalArea = HomeView.dims.container.a + (HomeView.scrollDistance * HomeView.dims.container.w);
    targetRows = (totalArea / HomeView.dims.item.a) / HomeView.colCount;
    targetItems = Math.floor(targetRows) * HomeView.colCount;
    targetItems = (targetRows % 1) > HomeView.SHOW_ROW_THRESHOLD ? targetItems + HomeView.colCount : targetItems;
    return targetItems;
  };

  HomeView.prototype.animateInInitialItems = function(cb) {
    var i, itemCount, params, _i;
    itemCount = this.getRequiredDoodleCountByArea();
    console.log("itemCount = @getRequiredDoodleCountByArea()", itemCount);
    for (i = _i = 0; 0 <= itemCount ? _i < itemCount : _i > itemCount; i = 0 <= itemCount ? ++_i : --_i) {
      params = [HomeView.gridItems[i], i, true];
      if (i === itemCount - 1) {
        params.push(cb);
      }
      this.animateItemIn.apply(this, params);
    }
    return null;
  };

  HomeView.prototype.animateItemIn = function(item, index, fullPageTransition, cb) {
    var duration, fromParams, toParams;
    if (fullPageTransition == null) {
      fullPageTransition = false;
    }
    if (cb == null) {
      cb = null;
    }
    duration = 0.4;
    fromParams = {
      y: (fullPageTransition ? window.innerHeight : 0),
      opacity: 0,
      scale: 0.6
    };
    toParams = {
      delay: (duration * 0.2) * index,
      y: 0,
      opacity: 1,
      scale: 1,
      ease: Expo.easeOut
    };
    if (cb) {
      toParams.onComplete = (function(_this) {
        return function() {
          _this.$grid.removeClass('before-intro-animation');
          return cb();
        };
      })(this);
    }
    TweenLite.fromTo(item.$el, duration, fromParams, toParams);
    return null;
  };

  return HomeView;

})(AbstractViewPage);

window.HomeView = HomeView;

module.exports = HomeView;



},{"../AbstractViewPage":36,"./HomeGridItem":46}],48:[function(require,module,exports){
var AbstractModal, AbstractView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

AbstractModal = (function(_super) {
  __extends(AbstractModal, _super);

  AbstractModal.prototype.$window = null;


  /* override in individual classes */

  AbstractModal.prototype.name = null;

  AbstractModal.prototype.template = null;

  function AbstractModal() {
    this.closeClick = __bind(this.closeClick, this);
    this.animateOut = __bind(this.animateOut, this);
    this.animateIn = __bind(this.animateIn, this);
    this.onKeyUp = __bind(this.onKeyUp, this);
    this.setListeners = __bind(this.setListeners, this);
    this.dispose = __bind(this.dispose, this);
    this.hide = __bind(this.hide, this);
    this.$window = $(window);
    AbstractModal.__super__.constructor.call(this);
    this.CD().appView.addChild(this);
    this.setListeners('on');
    this.animateIn();
    return null;
  }

  AbstractModal.prototype.hide = function() {
    this.animateOut((function(_this) {
      return function() {
        return _this.CD().appView.remove(_this);
      };
    })(this));
    return null;
  };

  AbstractModal.prototype.dispose = function() {
    this.setListeners('off');
    this.CD().appView.modalManager.modals[this.name].view = null;
    return null;
  };

  AbstractModal.prototype.setListeners = function(setting) {
    this.$window[setting]('keyup', this.onKeyUp);
    this.$('[data-close]')[setting]('click', this.closeClick);
    return null;
  };

  AbstractModal.prototype.onKeyUp = function(e) {
    if (e.keyCode === 27) {
      this.hide();
    }
    return null;
  };

  AbstractModal.prototype.animateIn = function() {
    TweenLite.to(this.$el, 0.3, {
      'visibility': 'visible',
      'opacity': 1,
      ease: Quad.easeOut
    });
    TweenLite.to(this.$el.find('.inner'), 0.3, {
      delay: 0.15,
      'transform': 'scale(1)',
      'visibility': 'visible',
      'opacity': 1,
      ease: Back.easeOut
    });
    return null;
  };

  AbstractModal.prototype.animateOut = function(callback) {
    TweenLite.to(this.$el, 0.3, {
      delay: 0.15,
      'opacity': 0,
      ease: Quad.easeOut,
      onComplete: callback
    });
    TweenLite.to(this.$el.find('.inner'), 0.3, {
      'transform': 'scale(0.8)',
      'opacity': 0,
      ease: Back.easeIn
    });
    return null;
  };

  AbstractModal.prototype.closeClick = function(e) {
    e.preventDefault();
    this.hide();
    return null;
  };

  return AbstractModal;

})(AbstractView);

module.exports = AbstractModal;



},{"../AbstractView":35}],49:[function(require,module,exports){
var AbstractModal, OrientationModal,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModal = require('./AbstractModal');

OrientationModal = (function(_super) {
  __extends(OrientationModal, _super);

  OrientationModal.prototype.name = 'orientationModal';

  OrientationModal.prototype.template = 'orientation-modal';

  OrientationModal.prototype.cb = null;

  function OrientationModal(cb) {
    this.cb = cb;
    this.onUpdateDims = __bind(this.onUpdateDims, this);
    this.setListeners = __bind(this.setListeners, this);
    this.hide = __bind(this.hide, this);
    this.init = __bind(this.init, this);
    this.templateVars = {
      name: this.name
    };
    OrientationModal.__super__.constructor.call(this);
    return null;
  }

  OrientationModal.prototype.init = function() {
    return null;
  };

  OrientationModal.prototype.hide = function(stillLandscape) {
    if (stillLandscape == null) {
      stillLandscape = true;
    }
    this.animateOut((function(_this) {
      return function() {
        _this.CD().appView.remove(_this);
        if (!stillLandscape) {
          return typeof _this.cb === "function" ? _this.cb() : void 0;
        }
      };
    })(this));
    return null;
  };

  OrientationModal.prototype.setListeners = function(setting) {
    OrientationModal.__super__.setListeners.apply(this, arguments);
    this.CD().appView[setting]('updateDims', this.onUpdateDims);
    this.$el[setting]('touchend click', this.hide);
    return null;
  };

  OrientationModal.prototype.onUpdateDims = function(dims) {
    if (dims.o === 'portrait') {
      this.hide(false);
    }
    return null;
  };

  return OrientationModal;

})(AbstractModal);

module.exports = OrientationModal;



},{"./AbstractModal":48}],50:[function(require,module,exports){
var AbstractView, ModalManager, OrientationModal,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

OrientationModal = require('./OrientationModal');

ModalManager = (function(_super) {
  __extends(ModalManager, _super);

  ModalManager.prototype.modals = {
    orientationModal: {
      classRef: OrientationModal,
      view: null
    }
  };

  function ModalManager() {
    this.showModal = __bind(this.showModal, this);
    this.hideOpenModal = __bind(this.hideOpenModal, this);
    this.isOpen = __bind(this.isOpen, this);
    this.init = __bind(this.init, this);
    ModalManager.__super__.constructor.call(this);
    return null;
  }

  ModalManager.prototype.init = function() {
    return null;
  };

  ModalManager.prototype.isOpen = function() {
    var modal, name, _ref;
    _ref = this.modals;
    for (name in _ref) {
      modal = _ref[name];
      if (this.modals[name].view) {
        return true;
      }
    }
    return false;
  };

  ModalManager.prototype.hideOpenModal = function() {
    var modal, name, openModal, _ref;
    _ref = this.modals;
    for (name in _ref) {
      modal = _ref[name];
      if (this.modals[name].view) {
        openModal = this.modals[name].view;
      }
    }
    if (openModal != null) {
      openModal.hide();
    }
    return null;
  };

  ModalManager.prototype.showModal = function(name, cb) {
    if (cb == null) {
      cb = null;
    }
    if (this.modals[name].view) {
      return;
    }
    this.modals[name].view = new this.modals[name].classRef(cb);
    return null;
  };

  return ModalManager;

})(AbstractView);

module.exports = ModalManager;



},{"../AbstractView":35,"./OrientationModal":49}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50L2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9lbnQvcmV2ZXJzZWQuanNvbiIsIm5vZGVfbW9kdWxlcy9oYXNoaWRzL2xpYi9oYXNoaWRzLmpzIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvQXBwRGF0YS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvQXBwVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvQWJzdHJhY3RDb2xsZWN0aW9uLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb2xsZWN0aW9ucy9jb250cmlidXRvcnMvQ29udHJpYnV0b3JzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvY29yZS9UZW1wbGF0ZXNDb2xsZWN0aW9uLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb2xsZWN0aW9ucy9kb29kbGVzL0Rvb2RsZXNDb2xsZWN0aW9uLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb25maWcvQ29sb3JzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0FQSS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BYnN0cmFjdERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvTG9jYWxlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL1RlbXBsYXRlcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL0Fic3RyYWN0TW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb250cmlidXRvci9Db250cmlidXRvck1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9kb29kbGUvRG9vZGxlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9OYXYuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0FuYWx5dGljcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQXV0aE1hbmFnZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9GYWNlYm9vay5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvR29vZ2xlUGx1cy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvTWVkaWFRdWVyaWVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9OdW1iZXJVdGlscy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvUmVxdWVzdGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9TaGFyZS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9BYnN0cmFjdFZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvQWJzdHJhY3RWaWV3UGFnZS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9hYm91dFBhZ2UvQWJvdXRQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9iYXNlL0Zvb3Rlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9iYXNlL0hlYWRlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9iYXNlL1BhZ2VUcmFuc2l0aW9uZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9QcmVsb2FkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9XcmFwcGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9kb29kbGVQYWdlL0Rvb2RsZVBhZ2VWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2ZvdXJPaEZvdXJQYWdlL0ZvdXJPaEZvdXJQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVHcmlkSXRlbS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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Q0FBSyxDQUFDLElBQWQsR0FBeUIsSUFBQSxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLFFBQWQsQ0FBdUIsRUFBdkIsQ0FGekIsQ0FBQTtXQUlBLEtBTlc7RUFBQSxDQTNCWixDQUFBOztzQkFBQTs7R0FIMEIsYUFIM0IsQ0FBQTs7QUFBQSxNQXlDTSxDQUFDLE9BQVAsR0FBaUIsWUF6Q2pCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwID0gcmVxdWlyZSAnLi9BcHAnXG5cbiMgUFJPRFVDVElPTiBFTlZJUk9OTUVOVCAtIG1heSB3YW50IHRvIHVzZSBzZXJ2ZXItc2V0IHZhcmlhYmxlcyBoZXJlXG4jIElTX0xJVkUgPSBkbyAtPiByZXR1cm4gaWYgd2luZG93LmxvY2F0aW9uLmhvc3QuaW5kZXhPZignbG9jYWxob3N0JykgPiAtMSBvciB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGlzICc/ZCcgdGhlbiBmYWxzZSBlbHNlIHRydWVcblxuIyMjXG5cbldJUCAtIHRoaXMgd2lsbCBpZGVhbGx5IGNoYW5nZSB0byBvbGQgZm9ybWF0IChhYm92ZSkgd2hlbiBjYW4gZmlndXJlIGl0IG91dFxuXG4jIyNcblxuSVNfTElWRSA9IGZhbHNlXG5cbiMgT05MWSBFWFBPU0UgQVBQIEdMT0JBTExZIElGIExPQ0FMIE9SIERFVidJTkdcbnZpZXcgPSBpZiBJU19MSVZFIHRoZW4ge30gZWxzZSAod2luZG93IG9yIGRvY3VtZW50KVxuXG4jIERFQ0xBUkUgTUFJTiBBUFBMSUNBVElPTlxudmlldy5DRCA9IG5ldyBBcHAgSVNfTElWRVxudmlldy5DRC5pbml0KClcbiIsIi8qISBodHRwOi8vbXRocy5iZS9wdW55Y29kZSB2MS4yLjQgYnkgQG1hdGhpYXMgKi9cbjsoZnVuY3Rpb24ocm9vdCkge1xuXG5cdC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgKi9cblx0dmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cztcblx0dmFyIGZyZWVNb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJlxuXHRcdG1vZHVsZS5leHBvcnRzID09IGZyZWVFeHBvcnRzICYmIG1vZHVsZTtcblx0dmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcblx0aWYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsKSB7XG5cdFx0cm9vdCA9IGZyZWVHbG9iYWw7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGBwdW55Y29kZWAgb2JqZWN0LlxuXHQgKiBAbmFtZSBwdW55Y29kZVxuXHQgKiBAdHlwZSBPYmplY3Rcblx0ICovXG5cdHZhciBwdW55Y29kZSxcblxuXHQvKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cdG1heEludCA9IDIxNDc0ODM2NDcsIC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuXHQvKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG5cdGJhc2UgPSAzNixcblx0dE1pbiA9IDEsXG5cdHRNYXggPSAyNixcblx0c2tldyA9IDM4LFxuXHRkYW1wID0gNzAwLFxuXHRpbml0aWFsQmlhcyA9IDcyLFxuXHRpbml0aWFsTiA9IDEyOCwgLy8gMHg4MFxuXHRkZWxpbWl0ZXIgPSAnLScsIC8vICdcXHgyRCdcblxuXHQvKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xuXHRyZWdleFB1bnljb2RlID0gL154bi0tLyxcblx0cmVnZXhOb25BU0NJSSA9IC9bXiAtfl0vLCAvLyB1bnByaW50YWJsZSBBU0NJSSBjaGFycyArIG5vbi1BU0NJSSBjaGFyc1xuXHRyZWdleFNlcGFyYXRvcnMgPSAvXFx4MkV8XFx1MzAwMnxcXHVGRjBFfFxcdUZGNjEvZywgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG5cdC8qKiBFcnJvciBtZXNzYWdlcyAqL1xuXHRlcnJvcnMgPSB7XG5cdFx0J292ZXJmbG93JzogJ092ZXJmbG93OiBpbnB1dCBuZWVkcyB3aWRlciBpbnRlZ2VycyB0byBwcm9jZXNzJyxcblx0XHQnbm90LWJhc2ljJzogJ0lsbGVnYWwgaW5wdXQgPj0gMHg4MCAobm90IGEgYmFzaWMgY29kZSBwb2ludCknLFxuXHRcdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG5cdH0sXG5cblx0LyoqIENvbnZlbmllbmNlIHNob3J0Y3V0cyAqL1xuXHRiYXNlTWludXNUTWluID0gYmFzZSAtIHRNaW4sXG5cdGZsb29yID0gTWF0aC5mbG9vcixcblx0c3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZSxcblxuXHQvKiogVGVtcG9yYXJ5IHZhcmlhYmxlICovXG5cdGtleTtcblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGVycm9yIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBlcnJvciB0eXBlLlxuXHQgKiBAcmV0dXJucyB7RXJyb3J9IFRocm93cyBhIGBSYW5nZUVycm9yYCB3aXRoIHRoZSBhcHBsaWNhYmxlIGVycm9yIG1lc3NhZ2UuXG5cdCAqL1xuXHRmdW5jdGlvbiBlcnJvcih0eXBlKSB7XG5cdFx0dGhyb3cgUmFuZ2VFcnJvcihlcnJvcnNbdHlwZV0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBgQXJyYXkjbWFwYCB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnkgYXJyYXlcblx0ICogaXRlbS5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSBvZiB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHRcdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdFx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0XHRhcnJheVtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdFx0fVxuXHRcdHJldHVybiBhcnJheTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3MuXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnlcblx0ICogY2hhcmFjdGVyLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuXHQgKiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdFx0cmV0dXJuIG1hcChzdHJpbmcuc3BsaXQocmVnZXhTZXBhcmF0b3JzKSwgZm4pLmpvaW4oJy4nKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIG51bWVyaWMgY29kZSBwb2ludHMgb2YgZWFjaCBVbmljb2RlXG5cdCAqIGNoYXJhY3RlciBpbiB0aGUgc3RyaW5nLiBXaGlsZSBKYXZhU2NyaXB0IHVzZXMgVUNTLTIgaW50ZXJuYWxseSxcblx0ICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcblx0ICogVUNTLTIgZXhwb3NlcyBhcyBzZXBhcmF0ZSBjaGFyYWN0ZXJzKSBpbnRvIGEgc2luZ2xlIGNvZGUgcG9pbnQsXG5cdCAqIG1hdGNoaW5nIFVURi0xNi5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG5cdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGRlY29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBVbmljb2RlIGlucHV0IHN0cmluZyAoVUNTLTIpLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZGVjb2RlKHN0cmluZykge1xuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgY291bnRlciA9IDAsXG5cdFx0ICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG5cdFx0ICAgIHZhbHVlLFxuXHRcdCAgICBleHRyYTtcblx0XHR3aGlsZSAoY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0dmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0XHQvLyBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcblx0XHRcdFx0ZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHsgLy8gbG93IHN1cnJvZ2F0ZVxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlIG5leHRcblx0XHRcdFx0XHQvLyBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXJcblx0XHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdFx0Y291bnRlci0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIHN0cmluZyBiYXNlZCBvbiBhbiBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZW5jb2RlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBuZXcgVW5pY29kZSBzdHJpbmcgKFVDUy0yKS5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJlbmNvZGUoYXJyYXkpIHtcblx0XHRyZXR1cm4gbWFwKGFycmF5LCBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdFx0aWYgKHZhbHVlID4gMHhGRkZGKSB7XG5cdFx0XHRcdHZhbHVlIC09IDB4MTAwMDA7XG5cdFx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdFx0XHR2YWx1ZSA9IDB4REMwMCB8IHZhbHVlICYgMHgzRkY7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBiYXNpYyBjb2RlIHBvaW50IGludG8gYSBkaWdpdC9pbnRlZ2VyLlxuXHQgKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVQb2ludCBUaGUgYmFzaWMgbnVtZXJpYyBjb2RlIHBvaW50IHZhbHVlLlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpbiB0aGUgcmFuZ2UgYDBgIHRvIGBiYXNlIC0gMWAsIG9yIGBiYXNlYCBpZlxuXHQgKiB0aGUgY29kZSBwb2ludCBkb2VzIG5vdCByZXByZXNlbnQgYSB2YWx1ZS5cblx0ICovXG5cdGZ1bmN0aW9uIGJhc2ljVG9EaWdpdChjb2RlUG9pbnQpIHtcblx0XHRpZiAoY29kZVBvaW50IC0gNDggPCAxMCkge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDIyO1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gNjUgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDY1O1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gOTcgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDk3O1xuXHRcdH1cblx0XHRyZXR1cm4gYmFzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGRpZ2l0L2ludGVnZXIgaW50byBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEBzZWUgYGJhc2ljVG9EaWdpdCgpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gZGlnaXQgVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYmFzaWMgY29kZSBwb2ludCB3aG9zZSB2YWx1ZSAod2hlbiB1c2VkIGZvclxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuXHQgKiBgMGAgdG8gYGJhc2UgLSAxYC4gSWYgYGZsYWdgIGlzIG5vbi16ZXJvLCB0aGUgdXBwZXJjYXNlIGZvcm0gaXNcblx0ICogdXNlZDsgZWxzZSwgdGhlIGxvd2VyY2FzZSBmb3JtIGlzIHVzZWQuIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWRcblx0ICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cblx0ICovXG5cdGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHRcdC8vICAwLi4yNSBtYXAgdG8gQVNDSUkgYS4ueiBvciBBLi5aXG5cdFx0Ly8gMjYuLjM1IG1hcCB0byBBU0NJSSAwLi45XG5cdFx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBCaWFzIGFkYXB0YXRpb24gZnVuY3Rpb24gYXMgcGVyIHNlY3Rpb24gMy40IG9mIFJGQyAzNDkyLlxuXHQgKiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0XHR2YXIgayA9IDA7XG5cdFx0ZGVsdGEgPSBmaXJzdFRpbWUgPyBmbG9vcihkZWx0YSAvIGRhbXApIDogZGVsdGEgPj4gMTtcblx0XHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdFx0Zm9yICgvKiBubyBpbml0aWFsaXphdGlvbiAqLzsgZGVsdGEgPiBiYXNlTWludXNUTWluICogdE1heCA+PiAxOyBrICs9IGJhc2UpIHtcblx0XHRcdGRlbHRhID0gZmxvb3IoZGVsdGEgLyBiYXNlTWludXNUTWluKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZsb29yKGsgKyAoYmFzZU1pbnVzVE1pbiArIDEpICogZGVsdGEgLyAoZGVsdGEgKyBza2V3KSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzIHRvIGEgc3RyaW5nIG9mIFVuaWNvZGVcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdFx0Ly8gRG9uJ3QgdXNlIFVDUy0yXG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0XHQgICAgb3V0LFxuXHRcdCAgICBpID0gMCxcblx0XHQgICAgbiA9IGluaXRpYWxOLFxuXHRcdCAgICBiaWFzID0gaW5pdGlhbEJpYXMsXG5cdFx0ICAgIGJhc2ljLFxuXHRcdCAgICBqLFxuXHRcdCAgICBpbmRleCxcblx0XHQgICAgb2xkaSxcblx0XHQgICAgdyxcblx0XHQgICAgayxcblx0XHQgICAgZGlnaXQsXG5cdFx0ICAgIHQsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBiYXNlTWludXNUO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50czogbGV0IGBiYXNpY2AgYmUgdGhlIG51bWJlciBvZiBpbnB1dCBjb2RlXG5cdFx0Ly8gcG9pbnRzIGJlZm9yZSB0aGUgbGFzdCBkZWxpbWl0ZXIsIG9yIGAwYCBpZiB0aGVyZSBpcyBub25lLCB0aGVuIGNvcHlcblx0XHQvLyB0aGUgZmlyc3QgYmFzaWMgY29kZSBwb2ludHMgdG8gdGhlIG91dHB1dC5cblxuXHRcdGJhc2ljID0gaW5wdXQubGFzdEluZGV4T2YoZGVsaW1pdGVyKTtcblx0XHRpZiAoYmFzaWMgPCAwKSB7XG5cdFx0XHRiYXNpYyA9IDA7XG5cdFx0fVxuXG5cdFx0Zm9yIChqID0gMDsgaiA8IGJhc2ljOyArK2opIHtcblx0XHRcdC8vIGlmIGl0J3Mgbm90IGEgYmFzaWMgY29kZSBwb2ludFxuXHRcdFx0aWYgKGlucHV0LmNoYXJDb2RlQXQoaikgPj0gMHg4MCkge1xuXHRcdFx0XHRlcnJvcignbm90LWJhc2ljJyk7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQucHVzaChpbnB1dC5jaGFyQ29kZUF0KGopKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGRlY29kaW5nIGxvb3A6IHN0YXJ0IGp1c3QgYWZ0ZXIgdGhlIGxhc3QgZGVsaW1pdGVyIGlmIGFueSBiYXNpYyBjb2RlXG5cdFx0Ly8gcG9pbnRzIHdlcmUgY29waWVkOyBzdGFydCBhdCB0aGUgYmVnaW5uaW5nIG90aGVyd2lzZS5cblxuXHRcdGZvciAoaW5kZXggPSBiYXNpYyA+IDAgPyBiYXNpYyArIDEgOiAwOyBpbmRleCA8IGlucHV0TGVuZ3RoOyAvKiBubyBmaW5hbCBleHByZXNzaW9uICovKSB7XG5cblx0XHRcdC8vIGBpbmRleGAgaXMgdGhlIGluZGV4IG9mIHRoZSBuZXh0IGNoYXJhY3RlciB0byBiZSBjb25zdW1lZC5cblx0XHRcdC8vIERlY29kZSBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyIGludG8gYGRlbHRhYCxcblx0XHRcdC8vIHdoaWNoIGdldHMgYWRkZWQgdG8gYGlgLiBUaGUgb3ZlcmZsb3cgY2hlY2tpbmcgaXMgZWFzaWVyXG5cdFx0XHQvLyBpZiB3ZSBpbmNyZWFzZSBgaWAgYXMgd2UgZ28sIHRoZW4gc3VidHJhY3Qgb2ZmIGl0cyBzdGFydGluZ1xuXHRcdFx0Ly8gdmFsdWUgYXQgdGhlIGVuZCB0byBvYnRhaW4gYGRlbHRhYC5cblx0XHRcdGZvciAob2xkaSA9IGksIHcgPSAxLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblxuXHRcdFx0XHRpZiAoaW5kZXggPj0gaW5wdXRMZW5ndGgpIHtcblx0XHRcdFx0XHRlcnJvcignaW52YWxpZC1pbnB1dCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGlnaXQgPSBiYXNpY1RvRGlnaXQoaW5wdXQuY2hhckNvZGVBdChpbmRleCsrKSk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0ID49IGJhc2UgfHwgZGlnaXQgPiBmbG9vcigobWF4SW50IC0gaSkgLyB3KSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aSArPSBkaWdpdCAqIHc7XG5cdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA8IHQpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0aWYgKHcgPiBmbG9vcihtYXhJbnQgLyBiYXNlTWludXNUKSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dyAqPSBiYXNlTWludXNUO1xuXG5cdFx0XHR9XG5cblx0XHRcdG91dCA9IG91dHB1dC5sZW5ndGggKyAxO1xuXHRcdFx0YmlhcyA9IGFkYXB0KGkgLSBvbGRpLCBvdXQsIG9sZGkgPT0gMCk7XG5cblx0XHRcdC8vIGBpYCB3YXMgc3VwcG9zZWQgdG8gd3JhcCBhcm91bmQgZnJvbSBgb3V0YCB0byBgMGAsXG5cdFx0XHQvLyBpbmNyZW1lbnRpbmcgYG5gIGVhY2ggdGltZSwgc28gd2UnbGwgZml4IHRoYXQgbm93OlxuXHRcdFx0aWYgKGZsb29yKGkgLyBvdXQpID4gbWF4SW50IC0gbikge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0biArPSBmbG9vcihpIC8gb3V0KTtcblx0XHRcdGkgJT0gb3V0O1xuXG5cdFx0XHQvLyBJbnNlcnQgYG5gIGF0IHBvc2l0aW9uIGBpYCBvZiB0aGUgb3V0cHV0XG5cdFx0XHRvdXRwdXQuc3BsaWNlKGkrKywgMCwgbik7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdWNzMmVuY29kZShvdXRwdXQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scyB0byBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5XG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGVuY29kZShpbnB1dCkge1xuXHRcdHZhciBuLFxuXHRcdCAgICBkZWx0YSxcblx0XHQgICAgaGFuZGxlZENQQ291bnQsXG5cdFx0ICAgIGJhc2ljTGVuZ3RoLFxuXHRcdCAgICBiaWFzLFxuXHRcdCAgICBqLFxuXHRcdCAgICBtLFxuXHRcdCAgICBxLFxuXHRcdCAgICBrLFxuXHRcdCAgICB0LFxuXHRcdCAgICBjdXJyZW50VmFsdWUsXG5cdFx0ICAgIG91dHB1dCA9IFtdLFxuXHRcdCAgICAvKiogYGlucHV0TGVuZ3RoYCB3aWxsIGhvbGQgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyBpbiBgaW5wdXRgLiAqL1xuXHRcdCAgICBpbnB1dExlbmd0aCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50UGx1c09uZSxcblx0XHQgICAgYmFzZU1pbnVzVCxcblx0XHQgICAgcU1pbnVzVDtcblxuXHRcdC8vIENvbnZlcnQgdGhlIGlucHV0IGluIFVDUy0yIHRvIFVuaWNvZGVcblx0XHRpbnB1dCA9IHVjczJkZWNvZGUoaW5wdXQpO1xuXG5cdFx0Ly8gQ2FjaGUgdGhlIGxlbmd0aFxuXHRcdGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0aGUgc3RhdGVcblx0XHRuID0gaW5pdGlhbE47XG5cdFx0ZGVsdGEgPSAwO1xuXHRcdGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHNcblx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgMHg4MCkge1xuXHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoY3VycmVudFZhbHVlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aGFuZGxlZENQQ291bnQgPSBiYXNpY0xlbmd0aCA9IG91dHB1dC5sZW5ndGg7XG5cblx0XHQvLyBgaGFuZGxlZENQQ291bnRgIGlzIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgdGhhdCBoYXZlIGJlZW4gaGFuZGxlZDtcblx0XHQvLyBgYmFzaWNMZW5ndGhgIGlzIHRoZSBudW1iZXIgb2YgYmFzaWMgY29kZSBwb2ludHMuXG5cblx0XHQvLyBGaW5pc2ggdGhlIGJhc2ljIHN0cmluZyAtIGlmIGl0IGlzIG5vdCBlbXB0eSAtIHdpdGggYSBkZWxpbWl0ZXJcblx0XHRpZiAoYmFzaWNMZW5ndGgpIHtcblx0XHRcdG91dHB1dC5wdXNoKGRlbGltaXRlcik7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBlbmNvZGluZyBsb29wOlxuXHRcdHdoaWxlIChoYW5kbGVkQ1BDb3VudCA8IGlucHV0TGVuZ3RoKSB7XG5cblx0XHRcdC8vIEFsbCBub24tYmFzaWMgY29kZSBwb2ludHMgPCBuIGhhdmUgYmVlbiBoYW5kbGVkIGFscmVhZHkuIEZpbmQgdGhlIG5leHRcblx0XHRcdC8vIGxhcmdlciBvbmU6XG5cdFx0XHRmb3IgKG0gPSBtYXhJbnQsIGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA+PSBuICYmIGN1cnJlbnRWYWx1ZSA8IG0pIHtcblx0XHRcdFx0XHRtID0gY3VycmVudFZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluY3JlYXNlIGBkZWx0YWAgZW5vdWdoIHRvIGFkdmFuY2UgdGhlIGRlY29kZXIncyA8bixpPiBzdGF0ZSB0byA8bSwwPixcblx0XHRcdC8vIGJ1dCBndWFyZCBhZ2FpbnN0IG92ZXJmbG93XG5cdFx0XHRoYW5kbGVkQ1BDb3VudFBsdXNPbmUgPSBoYW5kbGVkQ1BDb3VudCArIDE7XG5cdFx0XHRpZiAobSAtIG4gPiBmbG9vcigobWF4SW50IC0gZGVsdGEpIC8gaGFuZGxlZENQQ291bnRQbHVzT25lKSkge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0ZGVsdGEgKz0gKG0gLSBuKSAqIGhhbmRsZWRDUENvdW50UGx1c09uZTtcblx0XHRcdG4gPSBtO1xuXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgbiAmJiArK2RlbHRhID4gbWF4SW50KSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID09IG4pIHtcblx0XHRcdFx0XHQvLyBSZXByZXNlbnQgZGVsdGEgYXMgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlclxuXHRcdFx0XHRcdGZvciAocSA9IGRlbHRhLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblx0XHRcdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXHRcdFx0XHRcdFx0aWYgKHEgPCB0KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cU1pbnVzVCA9IHEgLSB0O1xuXHRcdFx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0XHRcdHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWModCArIHFNaW51c1QgJSBiYXNlTWludXNULCAwKSlcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRxID0gZmxvb3IocU1pbnVzVCAvIGJhc2VNaW51c1QpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWMocSwgMCkpKTtcblx0XHRcdFx0XHRiaWFzID0gYWRhcHQoZGVsdGEsIGhhbmRsZWRDUENvdW50UGx1c09uZSwgaGFuZGxlZENQQ291bnQgPT0gYmFzaWNMZW5ndGgpO1xuXHRcdFx0XHRcdGRlbHRhID0gMDtcblx0XHRcdFx0XHQrK2hhbmRsZWRDUENvdW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCsrZGVsdGE7XG5cdFx0XHQrK247XG5cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dC5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBVbmljb2RlLiBPbmx5IHRoZVxuXHQgKiBQdW55Y29kZWQgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IG9uIGEgc3RyaW5nIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb252ZXJ0ZWQgdG9cblx0ICogVW5pY29kZS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIFB1bnljb2RlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQgdG8gVW5pY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG5cdCAqIHN0cmluZy5cblx0ICovXG5cdGZ1bmN0aW9uIHRvVW5pY29kZShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhQdW55Y29kZS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyBkZWNvZGUoc3RyaW5nLnNsaWNlKDQpLnRvTG93ZXJDYXNlKCkpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgVW5pY29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gUHVueWNvZGUuIE9ubHkgdGhlXG5cdCAqIG5vbi1BU0NJSSBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0J3MgYWxyZWFkeSBpbiBBU0NJSS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQsIGFzIGEgVW5pY29kZSBzdHJpbmcuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBQdW55Y29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gZG9tYWluIG5hbWUuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b0FTQ0lJKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleE5vbkFTQ0lJLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/ICd4bi0tJyArIGVuY29kZShzdHJpbmcpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqIERlZmluZSB0aGUgcHVibGljIEFQSSAqL1xuXHRwdW55Y29kZSA9IHtcblx0XHQvKipcblx0XHQgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgUHVueWNvZGUuanMgdmVyc2lvbiBudW1iZXIuXG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgU3RyaW5nXG5cdFx0ICovXG5cdFx0J3ZlcnNpb24nOiAnMS4yLjQnLFxuXHRcdC8qKlxuXHRcdCAqIEFuIG9iamVjdCBvZiBtZXRob2RzIHRvIGNvbnZlcnQgZnJvbSBKYXZhU2NyaXB0J3MgaW50ZXJuYWwgY2hhcmFjdGVyXG5cdFx0ICogcmVwcmVzZW50YXRpb24gKFVDUy0yKSB0byBVbmljb2RlIGNvZGUgcG9pbnRzLCBhbmQgYmFjay5cblx0XHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIE9iamVjdFxuXHRcdCAqL1xuXHRcdCd1Y3MyJzoge1xuXHRcdFx0J2RlY29kZSc6IHVjczJkZWNvZGUsXG5cdFx0XHQnZW5jb2RlJzogdWNzMmVuY29kZVxuXHRcdH0sXG5cdFx0J2RlY29kZSc6IGRlY29kZSxcblx0XHQnZW5jb2RlJzogZW5jb2RlLFxuXHRcdCd0b0FTQ0lJJzogdG9BU0NJSSxcblx0XHQndG9Vbmljb2RlJzogdG9Vbmljb2RlXG5cdH07XG5cblx0LyoqIEV4cG9zZSBgcHVueWNvZGVgICovXG5cdC8vIFNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJuc1xuXHQvLyBsaWtlIHRoZSBmb2xsb3dpbmc6XG5cdGlmIChcblx0XHR0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiZcblx0XHR0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJlxuXHRcdGRlZmluZS5hbWRcblx0KSB7XG5cdFx0ZGVmaW5lKCdwdW55Y29kZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHB1bnljb2RlO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmICFmcmVlRXhwb3J0cy5ub2RlVHlwZSkge1xuXHRcdGlmIChmcmVlTW9kdWxlKSB7IC8vIGluIE5vZGUuanMgb3IgUmluZ29KUyB2MC44LjArXG5cdFx0XHRmcmVlTW9kdWxlLmV4cG9ydHMgPSBwdW55Y29kZTtcblx0XHR9IGVsc2UgeyAvLyBpbiBOYXJ3aGFsIG9yIFJpbmdvSlMgdjAuNy4wLVxuXHRcdFx0Zm9yIChrZXkgaW4gcHVueWNvZGUpIHtcblx0XHRcdFx0cHVueWNvZGUuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAoZnJlZUV4cG9ydHNba2V5XSA9IHB1bnljb2RlW2tleV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHsgLy8gaW4gUmhpbm8gb3IgYSB3ZWIgYnJvd3NlclxuXHRcdHJvb3QucHVueWNvZGUgPSBwdW55Y29kZTtcblx0fVxuXG59KHRoaXMpKTtcbiIsInZhciBwdW55Y29kZSA9IHJlcXVpcmUoJ3B1bnljb2RlJyk7XG52YXIgcmV2RW50aXRpZXMgPSByZXF1aXJlKCcuL3JldmVyc2VkLmpzb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbmNvZGU7XG5cbmZ1bmN0aW9uIGVuY29kZSAoc3RyLCBvcHRzKSB7XG4gICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgU3RyaW5nJyk7XG4gICAgfVxuICAgIGlmICghb3B0cykgb3B0cyA9IHt9O1xuXG4gICAgdmFyIG51bWVyaWMgPSB0cnVlO1xuICAgIGlmIChvcHRzLm5hbWVkKSBudW1lcmljID0gZmFsc2U7XG4gICAgaWYgKG9wdHMubnVtZXJpYyAhPT0gdW5kZWZpbmVkKSBudW1lcmljID0gb3B0cy5udW1lcmljO1xuXG4gICAgdmFyIHNwZWNpYWwgPSBvcHRzLnNwZWNpYWwgfHwge1xuICAgICAgICAnXCInOiB0cnVlLCBcIidcIjogdHJ1ZSxcbiAgICAgICAgJzwnOiB0cnVlLCAnPic6IHRydWUsXG4gICAgICAgICcmJzogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgY29kZVBvaW50cyA9IHB1bnljb2RlLnVjczIuZGVjb2RlKHN0cik7XG4gICAgdmFyIGNoYXJzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2RlUG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjYyA9IGNvZGVQb2ludHNbaV07XG4gICAgICAgIHZhciBjID0gcHVueWNvZGUudWNzMi5lbmNvZGUoWyBjYyBdKTtcbiAgICAgICAgdmFyIGUgPSByZXZFbnRpdGllc1tjY107XG4gICAgICAgIGlmIChlICYmIChjYyA+PSAxMjcgfHwgc3BlY2lhbFtjXSkgJiYgIW51bWVyaWMpIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goJyYnICsgKC87JC8udGVzdChlKSA/IGUgOiBlICsgJzsnKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY2MgPCAzMiB8fCBjYyA+PSAxMjcgfHwgc3BlY2lhbFtjXSkge1xuICAgICAgICAgICAgY2hhcnMucHVzaCgnJiMnICsgY2MgKyAnOycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2hhcnMucHVzaChjKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCI5XCI6IFwiVGFiO1wiLFxuICAgIFwiMTBcIjogXCJOZXdMaW5lO1wiLFxuICAgIFwiMzNcIjogXCJleGNsO1wiLFxuICAgIFwiMzRcIjogXCJxdW90O1wiLFxuICAgIFwiMzVcIjogXCJudW07XCIsXG4gICAgXCIzNlwiOiBcImRvbGxhcjtcIixcbiAgICBcIjM3XCI6IFwicGVyY250O1wiLFxuICAgIFwiMzhcIjogXCJhbXA7XCIsXG4gICAgXCIzOVwiOiBcImFwb3M7XCIsXG4gICAgXCI0MFwiOiBcImxwYXI7XCIsXG4gICAgXCI0MVwiOiBcInJwYXI7XCIsXG4gICAgXCI0MlwiOiBcIm1pZGFzdDtcIixcbiAgICBcIjQzXCI6IFwicGx1cztcIixcbiAgICBcIjQ0XCI6IFwiY29tbWE7XCIsXG4gICAgXCI0NlwiOiBcInBlcmlvZDtcIixcbiAgICBcIjQ3XCI6IFwic29sO1wiLFxuICAgIFwiNThcIjogXCJjb2xvbjtcIixcbiAgICBcIjU5XCI6IFwic2VtaTtcIixcbiAgICBcIjYwXCI6IFwibHQ7XCIsXG4gICAgXCI2MVwiOiBcImVxdWFscztcIixcbiAgICBcIjYyXCI6IFwiZ3Q7XCIsXG4gICAgXCI2M1wiOiBcInF1ZXN0O1wiLFxuICAgIFwiNjRcIjogXCJjb21tYXQ7XCIsXG4gICAgXCI5MVwiOiBcImxzcWI7XCIsXG4gICAgXCI5MlwiOiBcImJzb2w7XCIsXG4gICAgXCI5M1wiOiBcInJzcWI7XCIsXG4gICAgXCI5NFwiOiBcIkhhdDtcIixcbiAgICBcIjk1XCI6IFwiVW5kZXJCYXI7XCIsXG4gICAgXCI5NlwiOiBcImdyYXZlO1wiLFxuICAgIFwiMTIzXCI6IFwibGN1YjtcIixcbiAgICBcIjEyNFwiOiBcIlZlcnRpY2FsTGluZTtcIixcbiAgICBcIjEyNVwiOiBcInJjdWI7XCIsXG4gICAgXCIxNjBcIjogXCJOb25CcmVha2luZ1NwYWNlO1wiLFxuICAgIFwiMTYxXCI6IFwiaWV4Y2w7XCIsXG4gICAgXCIxNjJcIjogXCJjZW50O1wiLFxuICAgIFwiMTYzXCI6IFwicG91bmQ7XCIsXG4gICAgXCIxNjRcIjogXCJjdXJyZW47XCIsXG4gICAgXCIxNjVcIjogXCJ5ZW47XCIsXG4gICAgXCIxNjZcIjogXCJicnZiYXI7XCIsXG4gICAgXCIxNjdcIjogXCJzZWN0O1wiLFxuICAgIFwiMTY4XCI6IFwidW1sO1wiLFxuICAgIFwiMTY5XCI6IFwiY29weTtcIixcbiAgICBcIjE3MFwiOiBcIm9yZGY7XCIsXG4gICAgXCIxNzFcIjogXCJsYXF1bztcIixcbiAgICBcIjE3MlwiOiBcIm5vdDtcIixcbiAgICBcIjE3M1wiOiBcInNoeTtcIixcbiAgICBcIjE3NFwiOiBcInJlZztcIixcbiAgICBcIjE3NVwiOiBcInN0cm5zO1wiLFxuICAgIFwiMTc2XCI6IFwiZGVnO1wiLFxuICAgIFwiMTc3XCI6IFwicG07XCIsXG4gICAgXCIxNzhcIjogXCJzdXAyO1wiLFxuICAgIFwiMTc5XCI6IFwic3VwMztcIixcbiAgICBcIjE4MFwiOiBcIkRpYWNyaXRpY2FsQWN1dGU7XCIsXG4gICAgXCIxODFcIjogXCJtaWNybztcIixcbiAgICBcIjE4MlwiOiBcInBhcmE7XCIsXG4gICAgXCIxODNcIjogXCJtaWRkb3Q7XCIsXG4gICAgXCIxODRcIjogXCJDZWRpbGxhO1wiLFxuICAgIFwiMTg1XCI6IFwic3VwMTtcIixcbiAgICBcIjE4NlwiOiBcIm9yZG07XCIsXG4gICAgXCIxODdcIjogXCJyYXF1bztcIixcbiAgICBcIjE4OFwiOiBcImZyYWMxNDtcIixcbiAgICBcIjE4OVwiOiBcImhhbGY7XCIsXG4gICAgXCIxOTBcIjogXCJmcmFjMzQ7XCIsXG4gICAgXCIxOTFcIjogXCJpcXVlc3Q7XCIsXG4gICAgXCIxOTJcIjogXCJBZ3JhdmU7XCIsXG4gICAgXCIxOTNcIjogXCJBYWN1dGU7XCIsXG4gICAgXCIxOTRcIjogXCJBY2lyYztcIixcbiAgICBcIjE5NVwiOiBcIkF0aWxkZTtcIixcbiAgICBcIjE5NlwiOiBcIkF1bWw7XCIsXG4gICAgXCIxOTdcIjogXCJBcmluZztcIixcbiAgICBcIjE5OFwiOiBcIkFFbGlnO1wiLFxuICAgIFwiMTk5XCI6IFwiQ2NlZGlsO1wiLFxuICAgIFwiMjAwXCI6IFwiRWdyYXZlO1wiLFxuICAgIFwiMjAxXCI6IFwiRWFjdXRlO1wiLFxuICAgIFwiMjAyXCI6IFwiRWNpcmM7XCIsXG4gICAgXCIyMDNcIjogXCJFdW1sO1wiLFxuICAgIFwiMjA0XCI6IFwiSWdyYXZlO1wiLFxuICAgIFwiMjA1XCI6IFwiSWFjdXRlO1wiLFxuICAgIFwiMjA2XCI6IFwiSWNpcmM7XCIsXG4gICAgXCIyMDdcIjogXCJJdW1sO1wiLFxuICAgIFwiMjA4XCI6IFwiRVRIO1wiLFxuICAgIFwiMjA5XCI6IFwiTnRpbGRlO1wiLFxuICAgIFwiMjEwXCI6IFwiT2dyYXZlO1wiLFxuICAgIFwiMjExXCI6IFwiT2FjdXRlO1wiLFxuICAgIFwiMjEyXCI6IFwiT2NpcmM7XCIsXG4gICAgXCIyMTNcIjogXCJPdGlsZGU7XCIsXG4gICAgXCIyMTRcIjogXCJPdW1sO1wiLFxuICAgIFwiMjE1XCI6IFwidGltZXM7XCIsXG4gICAgXCIyMTZcIjogXCJPc2xhc2g7XCIsXG4gICAgXCIyMTdcIjogXCJVZ3JhdmU7XCIsXG4gICAgXCIyMThcIjogXCJVYWN1dGU7XCIsXG4gICAgXCIyMTlcIjogXCJVY2lyYztcIixcbiAgICBcIjIyMFwiOiBcIlV1bWw7XCIsXG4gICAgXCIyMjFcIjogXCJZYWN1dGU7XCIsXG4gICAgXCIyMjJcIjogXCJUSE9STjtcIixcbiAgICBcIjIyM1wiOiBcInN6bGlnO1wiLFxuICAgIFwiMjI0XCI6IFwiYWdyYXZlO1wiLFxuICAgIFwiMjI1XCI6IFwiYWFjdXRlO1wiLFxuICAgIFwiMjI2XCI6IFwiYWNpcmM7XCIsXG4gICAgXCIyMjdcIjogXCJhdGlsZGU7XCIsXG4gICAgXCIyMjhcIjogXCJhdW1sO1wiLFxuICAgIFwiMjI5XCI6IFwiYXJpbmc7XCIsXG4gICAgXCIyMzBcIjogXCJhZWxpZztcIixcbiAgICBcIjIzMVwiOiBcImNjZWRpbDtcIixcbiAgICBcIjIzMlwiOiBcImVncmF2ZTtcIixcbiAgICBcIjIzM1wiOiBcImVhY3V0ZTtcIixcbiAgICBcIjIzNFwiOiBcImVjaXJjO1wiLFxuICAgIFwiMjM1XCI6IFwiZXVtbDtcIixcbiAgICBcIjIzNlwiOiBcImlncmF2ZTtcIixcbiAgICBcIjIzN1wiOiBcImlhY3V0ZTtcIixcbiAgICBcIjIzOFwiOiBcImljaXJjO1wiLFxuICAgIFwiMjM5XCI6IFwiaXVtbDtcIixcbiAgICBcIjI0MFwiOiBcImV0aDtcIixcbiAgICBcIjI0MVwiOiBcIm50aWxkZTtcIixcbiAgICBcIjI0MlwiOiBcIm9ncmF2ZTtcIixcbiAgICBcIjI0M1wiOiBcIm9hY3V0ZTtcIixcbiAgICBcIjI0NFwiOiBcIm9jaXJjO1wiLFxuICAgIFwiMjQ1XCI6IFwib3RpbGRlO1wiLFxuICAgIFwiMjQ2XCI6IFwib3VtbDtcIixcbiAgICBcIjI0N1wiOiBcImRpdmlkZTtcIixcbiAgICBcIjI0OFwiOiBcIm9zbGFzaDtcIixcbiAgICBcIjI0OVwiOiBcInVncmF2ZTtcIixcbiAgICBcIjI1MFwiOiBcInVhY3V0ZTtcIixcbiAgICBcIjI1MVwiOiBcInVjaXJjO1wiLFxuICAgIFwiMjUyXCI6IFwidXVtbDtcIixcbiAgICBcIjI1M1wiOiBcInlhY3V0ZTtcIixcbiAgICBcIjI1NFwiOiBcInRob3JuO1wiLFxuICAgIFwiMjU1XCI6IFwieXVtbDtcIixcbiAgICBcIjI1NlwiOiBcIkFtYWNyO1wiLFxuICAgIFwiMjU3XCI6IFwiYW1hY3I7XCIsXG4gICAgXCIyNThcIjogXCJBYnJldmU7XCIsXG4gICAgXCIyNTlcIjogXCJhYnJldmU7XCIsXG4gICAgXCIyNjBcIjogXCJBb2dvbjtcIixcbiAgICBcIjI2MVwiOiBcImFvZ29uO1wiLFxuICAgIFwiMjYyXCI6IFwiQ2FjdXRlO1wiLFxuICAgIFwiMjYzXCI6IFwiY2FjdXRlO1wiLFxuICAgIFwiMjY0XCI6IFwiQ2NpcmM7XCIsXG4gICAgXCIyNjVcIjogXCJjY2lyYztcIixcbiAgICBcIjI2NlwiOiBcIkNkb3Q7XCIsXG4gICAgXCIyNjdcIjogXCJjZG90O1wiLFxuICAgIFwiMjY4XCI6IFwiQ2Nhcm9uO1wiLFxuICAgIFwiMjY5XCI6IFwiY2Nhcm9uO1wiLFxuICAgIFwiMjcwXCI6IFwiRGNhcm9uO1wiLFxuICAgIFwiMjcxXCI6IFwiZGNhcm9uO1wiLFxuICAgIFwiMjcyXCI6IFwiRHN0cm9rO1wiLFxuICAgIFwiMjczXCI6IFwiZHN0cm9rO1wiLFxuICAgIFwiMjc0XCI6IFwiRW1hY3I7XCIsXG4gICAgXCIyNzVcIjogXCJlbWFjcjtcIixcbiAgICBcIjI3OFwiOiBcIkVkb3Q7XCIsXG4gICAgXCIyNzlcIjogXCJlZG90O1wiLFxuICAgIFwiMjgwXCI6IFwiRW9nb247XCIsXG4gICAgXCIyODFcIjogXCJlb2dvbjtcIixcbiAgICBcIjI4MlwiOiBcIkVjYXJvbjtcIixcbiAgICBcIjI4M1wiOiBcImVjYXJvbjtcIixcbiAgICBcIjI4NFwiOiBcIkdjaXJjO1wiLFxuICAgIFwiMjg1XCI6IFwiZ2NpcmM7XCIsXG4gICAgXCIyODZcIjogXCJHYnJldmU7XCIsXG4gICAgXCIyODdcIjogXCJnYnJldmU7XCIsXG4gICAgXCIyODhcIjogXCJHZG90O1wiLFxuICAgIFwiMjg5XCI6IFwiZ2RvdDtcIixcbiAgICBcIjI5MFwiOiBcIkdjZWRpbDtcIixcbiAgICBcIjI5MlwiOiBcIkhjaXJjO1wiLFxuICAgIFwiMjkzXCI6IFwiaGNpcmM7XCIsXG4gICAgXCIyOTRcIjogXCJIc3Ryb2s7XCIsXG4gICAgXCIyOTVcIjogXCJoc3Ryb2s7XCIsXG4gICAgXCIyOTZcIjogXCJJdGlsZGU7XCIsXG4gICAgXCIyOTdcIjogXCJpdGlsZGU7XCIsXG4gICAgXCIyOThcIjogXCJJbWFjcjtcIixcbiAgICBcIjI5OVwiOiBcImltYWNyO1wiLFxuICAgIFwiMzAyXCI6IFwiSW9nb247XCIsXG4gICAgXCIzMDNcIjogXCJpb2dvbjtcIixcbiAgICBcIjMwNFwiOiBcIklkb3Q7XCIsXG4gICAgXCIzMDVcIjogXCJpbm9kb3Q7XCIsXG4gICAgXCIzMDZcIjogXCJJSmxpZztcIixcbiAgICBcIjMwN1wiOiBcImlqbGlnO1wiLFxuICAgIFwiMzA4XCI6IFwiSmNpcmM7XCIsXG4gICAgXCIzMDlcIjogXCJqY2lyYztcIixcbiAgICBcIjMxMFwiOiBcIktjZWRpbDtcIixcbiAgICBcIjMxMVwiOiBcImtjZWRpbDtcIixcbiAgICBcIjMxMlwiOiBcImtncmVlbjtcIixcbiAgICBcIjMxM1wiOiBcIkxhY3V0ZTtcIixcbiAgICBcIjMxNFwiOiBcImxhY3V0ZTtcIixcbiAgICBcIjMxNVwiOiBcIkxjZWRpbDtcIixcbiAgICBcIjMxNlwiOiBcImxjZWRpbDtcIixcbiAgICBcIjMxN1wiOiBcIkxjYXJvbjtcIixcbiAgICBcIjMxOFwiOiBcImxjYXJvbjtcIixcbiAgICBcIjMxOVwiOiBcIkxtaWRvdDtcIixcbiAgICBcIjMyMFwiOiBcImxtaWRvdDtcIixcbiAgICBcIjMyMVwiOiBcIkxzdHJvaztcIixcbiAgICBcIjMyMlwiOiBcImxzdHJvaztcIixcbiAgICBcIjMyM1wiOiBcIk5hY3V0ZTtcIixcbiAgICBcIjMyNFwiOiBcIm5hY3V0ZTtcIixcbiAgICBcIjMyNVwiOiBcIk5jZWRpbDtcIixcbiAgICBcIjMyNlwiOiBcIm5jZWRpbDtcIixcbiAgICBcIjMyN1wiOiBcIk5jYXJvbjtcIixcbiAgICBcIjMyOFwiOiBcIm5jYXJvbjtcIixcbiAgICBcIjMyOVwiOiBcIm5hcG9zO1wiLFxuICAgIFwiMzMwXCI6IFwiRU5HO1wiLFxuICAgIFwiMzMxXCI6IFwiZW5nO1wiLFxuICAgIFwiMzMyXCI6IFwiT21hY3I7XCIsXG4gICAgXCIzMzNcIjogXCJvbWFjcjtcIixcbiAgICBcIjMzNlwiOiBcIk9kYmxhYztcIixcbiAgICBcIjMzN1wiOiBcIm9kYmxhYztcIixcbiAgICBcIjMzOFwiOiBcIk9FbGlnO1wiLFxuICAgIFwiMzM5XCI6IFwib2VsaWc7XCIsXG4gICAgXCIzNDBcIjogXCJSYWN1dGU7XCIsXG4gICAgXCIzNDFcIjogXCJyYWN1dGU7XCIsXG4gICAgXCIzNDJcIjogXCJSY2VkaWw7XCIsXG4gICAgXCIzNDNcIjogXCJyY2VkaWw7XCIsXG4gICAgXCIzNDRcIjogXCJSY2Fyb247XCIsXG4gICAgXCIzNDVcIjogXCJyY2Fyb247XCIsXG4gICAgXCIzNDZcIjogXCJTYWN1dGU7XCIsXG4gICAgXCIzNDdcIjogXCJzYWN1dGU7XCIsXG4gICAgXCIzNDhcIjogXCJTY2lyYztcIixcbiAgICBcIjM0OVwiOiBcInNjaXJjO1wiLFxuICAgIFwiMzUwXCI6IFwiU2NlZGlsO1wiLFxuICAgIFwiMzUxXCI6IFwic2NlZGlsO1wiLFxuICAgIFwiMzUyXCI6IFwiU2Nhcm9uO1wiLFxuICAgIFwiMzUzXCI6IFwic2Nhcm9uO1wiLFxuICAgIFwiMzU0XCI6IFwiVGNlZGlsO1wiLFxuICAgIFwiMzU1XCI6IFwidGNlZGlsO1wiLFxuICAgIFwiMzU2XCI6IFwiVGNhcm9uO1wiLFxuICAgIFwiMzU3XCI6IFwidGNhcm9uO1wiLFxuICAgIFwiMzU4XCI6IFwiVHN0cm9rO1wiLFxuICAgIFwiMzU5XCI6IFwidHN0cm9rO1wiLFxuICAgIFwiMzYwXCI6IFwiVXRpbGRlO1wiLFxuICAgIFwiMzYxXCI6IFwidXRpbGRlO1wiLFxuICAgIFwiMzYyXCI6IFwiVW1hY3I7XCIsXG4gICAgXCIzNjNcIjogXCJ1bWFjcjtcIixcbiAgICBcIjM2NFwiOiBcIlVicmV2ZTtcIixcbiAgICBcIjM2NVwiOiBcInVicmV2ZTtcIixcbiAgICBcIjM2NlwiOiBcIlVyaW5nO1wiLFxuICAgIFwiMzY3XCI6IFwidXJpbmc7XCIsXG4gICAgXCIzNjhcIjogXCJVZGJsYWM7XCIsXG4gICAgXCIzNjlcIjogXCJ1ZGJsYWM7XCIsXG4gICAgXCIzNzBcIjogXCJVb2dvbjtcIixcbiAgICBcIjM3MVwiOiBcInVvZ29uO1wiLFxuICAgIFwiMzcyXCI6IFwiV2NpcmM7XCIsXG4gICAgXCIzNzNcIjogXCJ3Y2lyYztcIixcbiAgICBcIjM3NFwiOiBcIlljaXJjO1wiLFxuICAgIFwiMzc1XCI6IFwieWNpcmM7XCIsXG4gICAgXCIzNzZcIjogXCJZdW1sO1wiLFxuICAgIFwiMzc3XCI6IFwiWmFjdXRlO1wiLFxuICAgIFwiMzc4XCI6IFwiemFjdXRlO1wiLFxuICAgIFwiMzc5XCI6IFwiWmRvdDtcIixcbiAgICBcIjM4MFwiOiBcInpkb3Q7XCIsXG4gICAgXCIzODFcIjogXCJaY2Fyb247XCIsXG4gICAgXCIzODJcIjogXCJ6Y2Fyb247XCIsXG4gICAgXCI0MDJcIjogXCJmbm9mO1wiLFxuICAgIFwiNDM3XCI6IFwiaW1wZWQ7XCIsXG4gICAgXCI1MDFcIjogXCJnYWN1dGU7XCIsXG4gICAgXCI1NjdcIjogXCJqbWF0aDtcIixcbiAgICBcIjcxMFwiOiBcImNpcmM7XCIsXG4gICAgXCI3MTFcIjogXCJIYWNlaztcIixcbiAgICBcIjcyOFwiOiBcImJyZXZlO1wiLFxuICAgIFwiNzI5XCI6IFwiZG90O1wiLFxuICAgIFwiNzMwXCI6IFwicmluZztcIixcbiAgICBcIjczMVwiOiBcIm9nb247XCIsXG4gICAgXCI3MzJcIjogXCJ0aWxkZTtcIixcbiAgICBcIjczM1wiOiBcIkRpYWNyaXRpY2FsRG91YmxlQWN1dGU7XCIsXG4gICAgXCI3ODVcIjogXCJEb3duQnJldmU7XCIsXG4gICAgXCI5MTNcIjogXCJBbHBoYTtcIixcbiAgICBcIjkxNFwiOiBcIkJldGE7XCIsXG4gICAgXCI5MTVcIjogXCJHYW1tYTtcIixcbiAgICBcIjkxNlwiOiBcIkRlbHRhO1wiLFxuICAgIFwiOTE3XCI6IFwiRXBzaWxvbjtcIixcbiAgICBcIjkxOFwiOiBcIlpldGE7XCIsXG4gICAgXCI5MTlcIjogXCJFdGE7XCIsXG4gICAgXCI5MjBcIjogXCJUaGV0YTtcIixcbiAgICBcIjkyMVwiOiBcIklvdGE7XCIsXG4gICAgXCI5MjJcIjogXCJLYXBwYTtcIixcbiAgICBcIjkyM1wiOiBcIkxhbWJkYTtcIixcbiAgICBcIjkyNFwiOiBcIk11O1wiLFxuICAgIFwiOTI1XCI6IFwiTnU7XCIsXG4gICAgXCI5MjZcIjogXCJYaTtcIixcbiAgICBcIjkyN1wiOiBcIk9taWNyb247XCIsXG4gICAgXCI5MjhcIjogXCJQaTtcIixcbiAgICBcIjkyOVwiOiBcIlJobztcIixcbiAgICBcIjkzMVwiOiBcIlNpZ21hO1wiLFxuICAgIFwiOTMyXCI6IFwiVGF1O1wiLFxuICAgIFwiOTMzXCI6IFwiVXBzaWxvbjtcIixcbiAgICBcIjkzNFwiOiBcIlBoaTtcIixcbiAgICBcIjkzNVwiOiBcIkNoaTtcIixcbiAgICBcIjkzNlwiOiBcIlBzaTtcIixcbiAgICBcIjkzN1wiOiBcIk9tZWdhO1wiLFxuICAgIFwiOTQ1XCI6IFwiYWxwaGE7XCIsXG4gICAgXCI5NDZcIjogXCJiZXRhO1wiLFxuICAgIFwiOTQ3XCI6IFwiZ2FtbWE7XCIsXG4gICAgXCI5NDhcIjogXCJkZWx0YTtcIixcbiAgICBcIjk0OVwiOiBcImVwc2lsb247XCIsXG4gICAgXCI5NTBcIjogXCJ6ZXRhO1wiLFxuICAgIFwiOTUxXCI6IFwiZXRhO1wiLFxuICAgIFwiOTUyXCI6IFwidGhldGE7XCIsXG4gICAgXCI5NTNcIjogXCJpb3RhO1wiLFxuICAgIFwiOTU0XCI6IFwia2FwcGE7XCIsXG4gICAgXCI5NTVcIjogXCJsYW1iZGE7XCIsXG4gICAgXCI5NTZcIjogXCJtdTtcIixcbiAgICBcIjk1N1wiOiBcIm51O1wiLFxuICAgIFwiOTU4XCI6IFwieGk7XCIsXG4gICAgXCI5NTlcIjogXCJvbWljcm9uO1wiLFxuICAgIFwiOTYwXCI6IFwicGk7XCIsXG4gICAgXCI5NjFcIjogXCJyaG87XCIsXG4gICAgXCI5NjJcIjogXCJ2YXJzaWdtYTtcIixcbiAgICBcIjk2M1wiOiBcInNpZ21hO1wiLFxuICAgIFwiOTY0XCI6IFwidGF1O1wiLFxuICAgIFwiOTY1XCI6IFwidXBzaWxvbjtcIixcbiAgICBcIjk2NlwiOiBcInBoaTtcIixcbiAgICBcIjk2N1wiOiBcImNoaTtcIixcbiAgICBcIjk2OFwiOiBcInBzaTtcIixcbiAgICBcIjk2OVwiOiBcIm9tZWdhO1wiLFxuICAgIFwiOTc3XCI6IFwidmFydGhldGE7XCIsXG4gICAgXCI5NzhcIjogXCJ1cHNpaDtcIixcbiAgICBcIjk4MVwiOiBcInZhcnBoaTtcIixcbiAgICBcIjk4MlwiOiBcInZhcnBpO1wiLFxuICAgIFwiOTg4XCI6IFwiR2FtbWFkO1wiLFxuICAgIFwiOTg5XCI6IFwiZ2FtbWFkO1wiLFxuICAgIFwiMTAwOFwiOiBcInZhcmthcHBhO1wiLFxuICAgIFwiMTAwOVwiOiBcInZhcnJobztcIixcbiAgICBcIjEwMTNcIjogXCJ2YXJlcHNpbG9uO1wiLFxuICAgIFwiMTAxNFwiOiBcImJlcHNpO1wiLFxuICAgIFwiMTAyNVwiOiBcIklPY3k7XCIsXG4gICAgXCIxMDI2XCI6IFwiREpjeTtcIixcbiAgICBcIjEwMjdcIjogXCJHSmN5O1wiLFxuICAgIFwiMTAyOFwiOiBcIkp1a2N5O1wiLFxuICAgIFwiMTAyOVwiOiBcIkRTY3k7XCIsXG4gICAgXCIxMDMwXCI6IFwiSXVrY3k7XCIsXG4gICAgXCIxMDMxXCI6IFwiWUljeTtcIixcbiAgICBcIjEwMzJcIjogXCJKc2VyY3k7XCIsXG4gICAgXCIxMDMzXCI6IFwiTEpjeTtcIixcbiAgICBcIjEwMzRcIjogXCJOSmN5O1wiLFxuICAgIFwiMTAzNVwiOiBcIlRTSGN5O1wiLFxuICAgIFwiMTAzNlwiOiBcIktKY3k7XCIsXG4gICAgXCIxMDM4XCI6IFwiVWJyY3k7XCIsXG4gICAgXCIxMDM5XCI6IFwiRFpjeTtcIixcbiAgICBcIjEwNDBcIjogXCJBY3k7XCIsXG4gICAgXCIxMDQxXCI6IFwiQmN5O1wiLFxuICAgIFwiMTA0MlwiOiBcIlZjeTtcIixcbiAgICBcIjEwNDNcIjogXCJHY3k7XCIsXG4gICAgXCIxMDQ0XCI6IFwiRGN5O1wiLFxuICAgIFwiMTA0NVwiOiBcIklFY3k7XCIsXG4gICAgXCIxMDQ2XCI6IFwiWkhjeTtcIixcbiAgICBcIjEwNDdcIjogXCJaY3k7XCIsXG4gICAgXCIxMDQ4XCI6IFwiSWN5O1wiLFxuICAgIFwiMTA0OVwiOiBcIkpjeTtcIixcbiAgICBcIjEwNTBcIjogXCJLY3k7XCIsXG4gICAgXCIxMDUxXCI6IFwiTGN5O1wiLFxuICAgIFwiMTA1MlwiOiBcIk1jeTtcIixcbiAgICBcIjEwNTNcIjogXCJOY3k7XCIsXG4gICAgXCIxMDU0XCI6IFwiT2N5O1wiLFxuICAgIFwiMTA1NVwiOiBcIlBjeTtcIixcbiAgICBcIjEwNTZcIjogXCJSY3k7XCIsXG4gICAgXCIxMDU3XCI6IFwiU2N5O1wiLFxuICAgIFwiMTA1OFwiOiBcIlRjeTtcIixcbiAgICBcIjEwNTlcIjogXCJVY3k7XCIsXG4gICAgXCIxMDYwXCI6IFwiRmN5O1wiLFxuICAgIFwiMTA2MVwiOiBcIktIY3k7XCIsXG4gICAgXCIxMDYyXCI6IFwiVFNjeTtcIixcbiAgICBcIjEwNjNcIjogXCJDSGN5O1wiLFxuICAgIFwiMTA2NFwiOiBcIlNIY3k7XCIsXG4gICAgXCIxMDY1XCI6IFwiU0hDSGN5O1wiLFxuICAgIFwiMTA2NlwiOiBcIkhBUkRjeTtcIixcbiAgICBcIjEwNjdcIjogXCJZY3k7XCIsXG4gICAgXCIxMDY4XCI6IFwiU09GVGN5O1wiLFxuICAgIFwiMTA2OVwiOiBcIkVjeTtcIixcbiAgICBcIjEwNzBcIjogXCJZVWN5O1wiLFxuICAgIFwiMTA3MVwiOiBcIllBY3k7XCIsXG4gICAgXCIxMDcyXCI6IFwiYWN5O1wiLFxuICAgIFwiMTA3M1wiOiBcImJjeTtcIixcbiAgICBcIjEwNzRcIjogXCJ2Y3k7XCIsXG4gICAgXCIxMDc1XCI6IFwiZ2N5O1wiLFxuICAgIFwiMTA3NlwiOiBcImRjeTtcIixcbiAgICBcIjEwNzdcIjogXCJpZWN5O1wiLFxuICAgIFwiMTA3OFwiOiBcInpoY3k7XCIsXG4gICAgXCIxMDc5XCI6IFwiemN5O1wiLFxuICAgIFwiMTA4MFwiOiBcImljeTtcIixcbiAgICBcIjEwODFcIjogXCJqY3k7XCIsXG4gICAgXCIxMDgyXCI6IFwia2N5O1wiLFxuICAgIFwiMTA4M1wiOiBcImxjeTtcIixcbiAgICBcIjEwODRcIjogXCJtY3k7XCIsXG4gICAgXCIxMDg1XCI6IFwibmN5O1wiLFxuICAgIFwiMTA4NlwiOiBcIm9jeTtcIixcbiAgICBcIjEwODdcIjogXCJwY3k7XCIsXG4gICAgXCIxMDg4XCI6IFwicmN5O1wiLFxuICAgIFwiMTA4OVwiOiBcInNjeTtcIixcbiAgICBcIjEwOTBcIjogXCJ0Y3k7XCIsXG4gICAgXCIxMDkxXCI6IFwidWN5O1wiLFxuICAgIFwiMTA5MlwiOiBcImZjeTtcIixcbiAgICBcIjEwOTNcIjogXCJraGN5O1wiLFxuICAgIFwiMTA5NFwiOiBcInRzY3k7XCIsXG4gICAgXCIxMDk1XCI6IFwiY2hjeTtcIixcbiAgICBcIjEwOTZcIjogXCJzaGN5O1wiLFxuICAgIFwiMTA5N1wiOiBcInNoY2hjeTtcIixcbiAgICBcIjEwOThcIjogXCJoYXJkY3k7XCIsXG4gICAgXCIxMDk5XCI6IFwieWN5O1wiLFxuICAgIFwiMTEwMFwiOiBcInNvZnRjeTtcIixcbiAgICBcIjExMDFcIjogXCJlY3k7XCIsXG4gICAgXCIxMTAyXCI6IFwieXVjeTtcIixcbiAgICBcIjExMDNcIjogXCJ5YWN5O1wiLFxuICAgIFwiMTEwNVwiOiBcImlvY3k7XCIsXG4gICAgXCIxMTA2XCI6IFwiZGpjeTtcIixcbiAgICBcIjExMDdcIjogXCJnamN5O1wiLFxuICAgIFwiMTEwOFwiOiBcImp1a2N5O1wiLFxuICAgIFwiMTEwOVwiOiBcImRzY3k7XCIsXG4gICAgXCIxMTEwXCI6IFwiaXVrY3k7XCIsXG4gICAgXCIxMTExXCI6IFwieWljeTtcIixcbiAgICBcIjExMTJcIjogXCJqc2VyY3k7XCIsXG4gICAgXCIxMTEzXCI6IFwibGpjeTtcIixcbiAgICBcIjExMTRcIjogXCJuamN5O1wiLFxuICAgIFwiMTExNVwiOiBcInRzaGN5O1wiLFxuICAgIFwiMTExNlwiOiBcImtqY3k7XCIsXG4gICAgXCIxMTE4XCI6IFwidWJyY3k7XCIsXG4gICAgXCIxMTE5XCI6IFwiZHpjeTtcIixcbiAgICBcIjgxOTRcIjogXCJlbnNwO1wiLFxuICAgIFwiODE5NVwiOiBcImVtc3A7XCIsXG4gICAgXCI4MTk2XCI6IFwiZW1zcDEzO1wiLFxuICAgIFwiODE5N1wiOiBcImVtc3AxNDtcIixcbiAgICBcIjgxOTlcIjogXCJudW1zcDtcIixcbiAgICBcIjgyMDBcIjogXCJwdW5jc3A7XCIsXG4gICAgXCI4MjAxXCI6IFwiVGhpblNwYWNlO1wiLFxuICAgIFwiODIwMlwiOiBcIlZlcnlUaGluU3BhY2U7XCIsXG4gICAgXCI4MjAzXCI6IFwiWmVyb1dpZHRoU3BhY2U7XCIsXG4gICAgXCI4MjA0XCI6IFwienduajtcIixcbiAgICBcIjgyMDVcIjogXCJ6d2o7XCIsXG4gICAgXCI4MjA2XCI6IFwibHJtO1wiLFxuICAgIFwiODIwN1wiOiBcInJsbTtcIixcbiAgICBcIjgyMDhcIjogXCJoeXBoZW47XCIsXG4gICAgXCI4MjExXCI6IFwibmRhc2g7XCIsXG4gICAgXCI4MjEyXCI6IFwibWRhc2g7XCIsXG4gICAgXCI4MjEzXCI6IFwiaG9yYmFyO1wiLFxuICAgIFwiODIxNFwiOiBcIlZlcnQ7XCIsXG4gICAgXCI4MjE2XCI6IFwiT3BlbkN1cmx5UXVvdGU7XCIsXG4gICAgXCI4MjE3XCI6IFwicnNxdW9yO1wiLFxuICAgIFwiODIxOFwiOiBcInNicXVvO1wiLFxuICAgIFwiODIyMFwiOiBcIk9wZW5DdXJseURvdWJsZVF1b3RlO1wiLFxuICAgIFwiODIyMVwiOiBcInJkcXVvcjtcIixcbiAgICBcIjgyMjJcIjogXCJsZHF1b3I7XCIsXG4gICAgXCI4MjI0XCI6IFwiZGFnZ2VyO1wiLFxuICAgIFwiODIyNVwiOiBcImRkYWdnZXI7XCIsXG4gICAgXCI4MjI2XCI6IFwiYnVsbGV0O1wiLFxuICAgIFwiODIyOVwiOiBcIm5sZHI7XCIsXG4gICAgXCI4MjMwXCI6IFwibWxkcjtcIixcbiAgICBcIjgyNDBcIjogXCJwZXJtaWw7XCIsXG4gICAgXCI4MjQxXCI6IFwicGVydGVuaztcIixcbiAgICBcIjgyNDJcIjogXCJwcmltZTtcIixcbiAgICBcIjgyNDNcIjogXCJQcmltZTtcIixcbiAgICBcIjgyNDRcIjogXCJ0cHJpbWU7XCIsXG4gICAgXCI4MjQ1XCI6IFwiYnByaW1lO1wiLFxuICAgIFwiODI0OVwiOiBcImxzYXF1bztcIixcbiAgICBcIjgyNTBcIjogXCJyc2FxdW87XCIsXG4gICAgXCI4MjU0XCI6IFwiT3ZlckJhcjtcIixcbiAgICBcIjgyNTdcIjogXCJjYXJldDtcIixcbiAgICBcIjgyNTlcIjogXCJoeWJ1bGw7XCIsXG4gICAgXCI4MjYwXCI6IFwiZnJhc2w7XCIsXG4gICAgXCI4MjcxXCI6IFwiYnNlbWk7XCIsXG4gICAgXCI4Mjc5XCI6IFwicXByaW1lO1wiLFxuICAgIFwiODI4N1wiOiBcIk1lZGl1bVNwYWNlO1wiLFxuICAgIFwiODI4OFwiOiBcIk5vQnJlYWs7XCIsXG4gICAgXCI4Mjg5XCI6IFwiQXBwbHlGdW5jdGlvbjtcIixcbiAgICBcIjgyOTBcIjogXCJpdDtcIixcbiAgICBcIjgyOTFcIjogXCJJbnZpc2libGVDb21tYTtcIixcbiAgICBcIjgzNjRcIjogXCJldXJvO1wiLFxuICAgIFwiODQxMVwiOiBcIlRyaXBsZURvdDtcIixcbiAgICBcIjg0MTJcIjogXCJEb3REb3Q7XCIsXG4gICAgXCI4NDUwXCI6IFwiQ29wZjtcIixcbiAgICBcIjg0NTNcIjogXCJpbmNhcmU7XCIsXG4gICAgXCI4NDU4XCI6IFwiZ3NjcjtcIixcbiAgICBcIjg0NTlcIjogXCJIc2NyO1wiLFxuICAgIFwiODQ2MFwiOiBcIlBvaW5jYXJlcGxhbmU7XCIsXG4gICAgXCI4NDYxXCI6IFwicXVhdGVybmlvbnM7XCIsXG4gICAgXCI4NDYyXCI6IFwicGxhbmNraDtcIixcbiAgICBcIjg0NjNcIjogXCJwbGFua3Y7XCIsXG4gICAgXCI4NDY0XCI6IFwiSXNjcjtcIixcbiAgICBcIjg0NjVcIjogXCJpbWFncGFydDtcIixcbiAgICBcIjg0NjZcIjogXCJMc2NyO1wiLFxuICAgIFwiODQ2N1wiOiBcImVsbDtcIixcbiAgICBcIjg0NjlcIjogXCJOb3BmO1wiLFxuICAgIFwiODQ3MFwiOiBcIm51bWVybztcIixcbiAgICBcIjg0NzFcIjogXCJjb3B5c3I7XCIsXG4gICAgXCI4NDcyXCI6IFwid3A7XCIsXG4gICAgXCI4NDczXCI6IFwicHJpbWVzO1wiLFxuICAgIFwiODQ3NFwiOiBcInJhdGlvbmFscztcIixcbiAgICBcIjg0NzVcIjogXCJSc2NyO1wiLFxuICAgIFwiODQ3NlwiOiBcIlJmcjtcIixcbiAgICBcIjg0NzdcIjogXCJSb3BmO1wiLFxuICAgIFwiODQ3OFwiOiBcInJ4O1wiLFxuICAgIFwiODQ4MlwiOiBcInRyYWRlO1wiLFxuICAgIFwiODQ4NFwiOiBcIlpvcGY7XCIsXG4gICAgXCI4NDg3XCI6IFwibWhvO1wiLFxuICAgIFwiODQ4OFwiOiBcIlpmcjtcIixcbiAgICBcIjg0ODlcIjogXCJpaW90YTtcIixcbiAgICBcIjg0OTJcIjogXCJCc2NyO1wiLFxuICAgIFwiODQ5M1wiOiBcIkNmcjtcIixcbiAgICBcIjg0OTVcIjogXCJlc2NyO1wiLFxuICAgIFwiODQ5NlwiOiBcImV4cGVjdGF0aW9uO1wiLFxuICAgIFwiODQ5N1wiOiBcIkZzY3I7XCIsXG4gICAgXCI4NDk5XCI6IFwicGhtbWF0O1wiLFxuICAgIFwiODUwMFwiOiBcIm9zY3I7XCIsXG4gICAgXCI4NTAxXCI6IFwiYWxlcGg7XCIsXG4gICAgXCI4NTAyXCI6IFwiYmV0aDtcIixcbiAgICBcIjg1MDNcIjogXCJnaW1lbDtcIixcbiAgICBcIjg1MDRcIjogXCJkYWxldGg7XCIsXG4gICAgXCI4NTE3XCI6IFwiREQ7XCIsXG4gICAgXCI4NTE4XCI6IFwiRGlmZmVyZW50aWFsRDtcIixcbiAgICBcIjg1MTlcIjogXCJleHBvbmVudGlhbGU7XCIsXG4gICAgXCI4NTIwXCI6IFwiSW1hZ2luYXJ5STtcIixcbiAgICBcIjg1MzFcIjogXCJmcmFjMTM7XCIsXG4gICAgXCI4NTMyXCI6IFwiZnJhYzIzO1wiLFxuICAgIFwiODUzM1wiOiBcImZyYWMxNTtcIixcbiAgICBcIjg1MzRcIjogXCJmcmFjMjU7XCIsXG4gICAgXCI4NTM1XCI6IFwiZnJhYzM1O1wiLFxuICAgIFwiODUzNlwiOiBcImZyYWM0NTtcIixcbiAgICBcIjg1MzdcIjogXCJmcmFjMTY7XCIsXG4gICAgXCI4NTM4XCI6IFwiZnJhYzU2O1wiLFxuICAgIFwiODUzOVwiOiBcImZyYWMxODtcIixcbiAgICBcIjg1NDBcIjogXCJmcmFjMzg7XCIsXG4gICAgXCI4NTQxXCI6IFwiZnJhYzU4O1wiLFxuICAgIFwiODU0MlwiOiBcImZyYWM3ODtcIixcbiAgICBcIjg1OTJcIjogXCJzbGFycjtcIixcbiAgICBcIjg1OTNcIjogXCJ1cGFycm93O1wiLFxuICAgIFwiODU5NFwiOiBcInNyYXJyO1wiLFxuICAgIFwiODU5NVwiOiBcIlNob3J0RG93bkFycm93O1wiLFxuICAgIFwiODU5NlwiOiBcImxlZnRyaWdodGFycm93O1wiLFxuICAgIFwiODU5N1wiOiBcInZhcnI7XCIsXG4gICAgXCI4NTk4XCI6IFwiVXBwZXJMZWZ0QXJyb3c7XCIsXG4gICAgXCI4NTk5XCI6IFwiVXBwZXJSaWdodEFycm93O1wiLFxuICAgIFwiODYwMFwiOiBcInNlYXJyb3c7XCIsXG4gICAgXCI4NjAxXCI6IFwic3dhcnJvdztcIixcbiAgICBcIjg2MDJcIjogXCJubGVmdGFycm93O1wiLFxuICAgIFwiODYwM1wiOiBcIm5yaWdodGFycm93O1wiLFxuICAgIFwiODYwNVwiOiBcInJpZ2h0c3F1aWdhcnJvdztcIixcbiAgICBcIjg2MDZcIjogXCJ0d29oZWFkbGVmdGFycm93O1wiLFxuICAgIFwiODYwN1wiOiBcIlVhcnI7XCIsXG4gICAgXCI4NjA4XCI6IFwidHdvaGVhZHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjA5XCI6IFwiRGFycjtcIixcbiAgICBcIjg2MTBcIjogXCJsZWZ0YXJyb3d0YWlsO1wiLFxuICAgIFwiODYxMVwiOiBcInJpZ2h0YXJyb3d0YWlsO1wiLFxuICAgIFwiODYxMlwiOiBcIm1hcHN0b2xlZnQ7XCIsXG4gICAgXCI4NjEzXCI6IFwiVXBUZWVBcnJvdztcIixcbiAgICBcIjg2MTRcIjogXCJSaWdodFRlZUFycm93O1wiLFxuICAgIFwiODYxNVwiOiBcIm1hcHN0b2Rvd247XCIsXG4gICAgXCI4NjE3XCI6IFwibGFycmhrO1wiLFxuICAgIFwiODYxOFwiOiBcInJhcnJoaztcIixcbiAgICBcIjg2MTlcIjogXCJsb29wYXJyb3dsZWZ0O1wiLFxuICAgIFwiODYyMFwiOiBcInJhcnJscDtcIixcbiAgICBcIjg2MjFcIjogXCJsZWZ0cmlnaHRzcXVpZ2Fycm93O1wiLFxuICAgIFwiODYyMlwiOiBcIm5sZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2MjRcIjogXCJsc2g7XCIsXG4gICAgXCI4NjI1XCI6IFwicnNoO1wiLFxuICAgIFwiODYyNlwiOiBcImxkc2g7XCIsXG4gICAgXCI4NjI3XCI6IFwicmRzaDtcIixcbiAgICBcIjg2MjlcIjogXCJjcmFycjtcIixcbiAgICBcIjg2MzBcIjogXCJjdXJ2ZWFycm93bGVmdDtcIixcbiAgICBcIjg2MzFcIjogXCJjdXJ2ZWFycm93cmlnaHQ7XCIsXG4gICAgXCI4NjM0XCI6IFwib2xhcnI7XCIsXG4gICAgXCI4NjM1XCI6IFwib3JhcnI7XCIsXG4gICAgXCI4NjM2XCI6IFwibGhhcnU7XCIsXG4gICAgXCI4NjM3XCI6IFwibGhhcmQ7XCIsXG4gICAgXCI4NjM4XCI6IFwidXBoYXJwb29ucmlnaHQ7XCIsXG4gICAgXCI4NjM5XCI6IFwidXBoYXJwb29ubGVmdDtcIixcbiAgICBcIjg2NDBcIjogXCJSaWdodFZlY3RvcjtcIixcbiAgICBcIjg2NDFcIjogXCJyaWdodGhhcnBvb25kb3duO1wiLFxuICAgIFwiODY0MlwiOiBcIlJpZ2h0RG93blZlY3RvcjtcIixcbiAgICBcIjg2NDNcIjogXCJMZWZ0RG93blZlY3RvcjtcIixcbiAgICBcIjg2NDRcIjogXCJybGFycjtcIixcbiAgICBcIjg2NDVcIjogXCJVcEFycm93RG93bkFycm93O1wiLFxuICAgIFwiODY0NlwiOiBcImxyYXJyO1wiLFxuICAgIFwiODY0N1wiOiBcImxsYXJyO1wiLFxuICAgIFwiODY0OFwiOiBcInV1YXJyO1wiLFxuICAgIFwiODY0OVwiOiBcInJyYXJyO1wiLFxuICAgIFwiODY1MFwiOiBcImRvd25kb3duYXJyb3dzO1wiLFxuICAgIFwiODY1MVwiOiBcIlJldmVyc2VFcXVpbGlicml1bTtcIixcbiAgICBcIjg2NTJcIjogXCJybGhhcjtcIixcbiAgICBcIjg2NTNcIjogXCJuTGVmdGFycm93O1wiLFxuICAgIFwiODY1NFwiOiBcIm5MZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTVcIjogXCJuUmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTZcIjogXCJMZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjU3XCI6IFwiVXBhcnJvdztcIixcbiAgICBcIjg2NThcIjogXCJSaWdodGFycm93O1wiLFxuICAgIFwiODY1OVwiOiBcIkRvd25hcnJvdztcIixcbiAgICBcIjg2NjBcIjogXCJMZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2NjFcIjogXCJ2QXJyO1wiLFxuICAgIFwiODY2MlwiOiBcIm53QXJyO1wiLFxuICAgIFwiODY2M1wiOiBcIm5lQXJyO1wiLFxuICAgIFwiODY2NFwiOiBcInNlQXJyO1wiLFxuICAgIFwiODY2NVwiOiBcInN3QXJyO1wiLFxuICAgIFwiODY2NlwiOiBcIkxsZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjY3XCI6IFwiUnJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjY5XCI6IFwiemlncmFycjtcIixcbiAgICBcIjg2NzZcIjogXCJMZWZ0QXJyb3dCYXI7XCIsXG4gICAgXCI4Njc3XCI6IFwiUmlnaHRBcnJvd0JhcjtcIixcbiAgICBcIjg2OTNcIjogXCJkdWFycjtcIixcbiAgICBcIjg3MDFcIjogXCJsb2FycjtcIixcbiAgICBcIjg3MDJcIjogXCJyb2FycjtcIixcbiAgICBcIjg3MDNcIjogXCJob2FycjtcIixcbiAgICBcIjg3MDRcIjogXCJmb3JhbGw7XCIsXG4gICAgXCI4NzA1XCI6IFwiY29tcGxlbWVudDtcIixcbiAgICBcIjg3MDZcIjogXCJQYXJ0aWFsRDtcIixcbiAgICBcIjg3MDdcIjogXCJFeGlzdHM7XCIsXG4gICAgXCI4NzA4XCI6IFwiTm90RXhpc3RzO1wiLFxuICAgIFwiODcwOVwiOiBcInZhcm5vdGhpbmc7XCIsXG4gICAgXCI4NzExXCI6IFwibmFibGE7XCIsXG4gICAgXCI4NzEyXCI6IFwiaXNpbnY7XCIsXG4gICAgXCI4NzEzXCI6IFwibm90aW52YTtcIixcbiAgICBcIjg3MTVcIjogXCJTdWNoVGhhdDtcIixcbiAgICBcIjg3MTZcIjogXCJOb3RSZXZlcnNlRWxlbWVudDtcIixcbiAgICBcIjg3MTlcIjogXCJQcm9kdWN0O1wiLFxuICAgIFwiODcyMFwiOiBcIkNvcHJvZHVjdDtcIixcbiAgICBcIjg3MjFcIjogXCJzdW07XCIsXG4gICAgXCI4NzIyXCI6IFwibWludXM7XCIsXG4gICAgXCI4NzIzXCI6IFwibXA7XCIsXG4gICAgXCI4NzI0XCI6IFwicGx1c2RvO1wiLFxuICAgIFwiODcyNlwiOiBcInNzZXRtbjtcIixcbiAgICBcIjg3MjdcIjogXCJsb3dhc3Q7XCIsXG4gICAgXCI4NzI4XCI6IFwiU21hbGxDaXJjbGU7XCIsXG4gICAgXCI4NzMwXCI6IFwiU3FydDtcIixcbiAgICBcIjg3MzNcIjogXCJ2cHJvcDtcIixcbiAgICBcIjg3MzRcIjogXCJpbmZpbjtcIixcbiAgICBcIjg3MzVcIjogXCJhbmdydDtcIixcbiAgICBcIjg3MzZcIjogXCJhbmdsZTtcIixcbiAgICBcIjg3MzdcIjogXCJtZWFzdXJlZGFuZ2xlO1wiLFxuICAgIFwiODczOFwiOiBcImFuZ3NwaDtcIixcbiAgICBcIjg3MzlcIjogXCJWZXJ0aWNhbEJhcjtcIixcbiAgICBcIjg3NDBcIjogXCJuc21pZDtcIixcbiAgICBcIjg3NDFcIjogXCJzcGFyO1wiLFxuICAgIFwiODc0MlwiOiBcIm5zcGFyO1wiLFxuICAgIFwiODc0M1wiOiBcIndlZGdlO1wiLFxuICAgIFwiODc0NFwiOiBcInZlZTtcIixcbiAgICBcIjg3NDVcIjogXCJjYXA7XCIsXG4gICAgXCI4NzQ2XCI6IFwiY3VwO1wiLFxuICAgIFwiODc0N1wiOiBcIkludGVncmFsO1wiLFxuICAgIFwiODc0OFwiOiBcIkludDtcIixcbiAgICBcIjg3NDlcIjogXCJ0aW50O1wiLFxuICAgIFwiODc1MFwiOiBcIm9pbnQ7XCIsXG4gICAgXCI4NzUxXCI6IFwiRG91YmxlQ29udG91ckludGVncmFsO1wiLFxuICAgIFwiODc1MlwiOiBcIkNjb25pbnQ7XCIsXG4gICAgXCI4NzUzXCI6IFwiY3dpbnQ7XCIsXG4gICAgXCI4NzU0XCI6IFwiY3djb25pbnQ7XCIsXG4gICAgXCI4NzU1XCI6IFwiQ291bnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NTZcIjogXCJ0aGVyZWZvcmU7XCIsXG4gICAgXCI4NzU3XCI6IFwiYmVjYXVzZTtcIixcbiAgICBcIjg3NThcIjogXCJyYXRpbztcIixcbiAgICBcIjg3NTlcIjogXCJQcm9wb3J0aW9uO1wiLFxuICAgIFwiODc2MFwiOiBcIm1pbnVzZDtcIixcbiAgICBcIjg3NjJcIjogXCJtRERvdDtcIixcbiAgICBcIjg3NjNcIjogXCJob210aHQ7XCIsXG4gICAgXCI4NzY0XCI6IFwiVGlsZGU7XCIsXG4gICAgXCI4NzY1XCI6IFwiYnNpbTtcIixcbiAgICBcIjg3NjZcIjogXCJtc3Rwb3M7XCIsXG4gICAgXCI4NzY3XCI6IFwiYWNkO1wiLFxuICAgIFwiODc2OFwiOiBcIndyZWF0aDtcIixcbiAgICBcIjg3NjlcIjogXCJuc2ltO1wiLFxuICAgIFwiODc3MFwiOiBcImVzaW07XCIsXG4gICAgXCI4NzcxXCI6IFwiVGlsZGVFcXVhbDtcIixcbiAgICBcIjg3NzJcIjogXCJuc2ltZXE7XCIsXG4gICAgXCI4NzczXCI6IFwiVGlsZGVGdWxsRXF1YWw7XCIsXG4gICAgXCI4Nzc0XCI6IFwic2ltbmU7XCIsXG4gICAgXCI4Nzc1XCI6IFwiTm90VGlsZGVGdWxsRXF1YWw7XCIsXG4gICAgXCI4Nzc2XCI6IFwiVGlsZGVUaWxkZTtcIixcbiAgICBcIjg3NzdcIjogXCJOb3RUaWxkZVRpbGRlO1wiLFxuICAgIFwiODc3OFwiOiBcImFwcHJveGVxO1wiLFxuICAgIFwiODc3OVwiOiBcImFwaWQ7XCIsXG4gICAgXCI4NzgwXCI6IFwiYmNvbmc7XCIsXG4gICAgXCI4NzgxXCI6IFwiQ3VwQ2FwO1wiLFxuICAgIFwiODc4MlwiOiBcIkh1bXBEb3duSHVtcDtcIixcbiAgICBcIjg3ODNcIjogXCJIdW1wRXF1YWw7XCIsXG4gICAgXCI4Nzg0XCI6IFwiZXNkb3Q7XCIsXG4gICAgXCI4Nzg1XCI6IFwiZURvdDtcIixcbiAgICBcIjg3ODZcIjogXCJmYWxsaW5nZG90c2VxO1wiLFxuICAgIFwiODc4N1wiOiBcInJpc2luZ2RvdHNlcTtcIixcbiAgICBcIjg3ODhcIjogXCJjb2xvbmVxO1wiLFxuICAgIFwiODc4OVwiOiBcImVxY29sb247XCIsXG4gICAgXCI4NzkwXCI6IFwiZXFjaXJjO1wiLFxuICAgIFwiODc5MVwiOiBcImNpcmU7XCIsXG4gICAgXCI4NzkzXCI6IFwid2VkZ2VxO1wiLFxuICAgIFwiODc5NFwiOiBcInZlZWVxO1wiLFxuICAgIFwiODc5NlwiOiBcInRyaWU7XCIsXG4gICAgXCI4Nzk5XCI6IFwicXVlc3RlcTtcIixcbiAgICBcIjg4MDBcIjogXCJOb3RFcXVhbDtcIixcbiAgICBcIjg4MDFcIjogXCJlcXVpdjtcIixcbiAgICBcIjg4MDJcIjogXCJOb3RDb25ncnVlbnQ7XCIsXG4gICAgXCI4ODA0XCI6IFwibGVxO1wiLFxuICAgIFwiODgwNVwiOiBcIkdyZWF0ZXJFcXVhbDtcIixcbiAgICBcIjg4MDZcIjogXCJMZXNzRnVsbEVxdWFsO1wiLFxuICAgIFwiODgwN1wiOiBcIkdyZWF0ZXJGdWxsRXF1YWw7XCIsXG4gICAgXCI4ODA4XCI6IFwibG5lcXE7XCIsXG4gICAgXCI4ODA5XCI6IFwiZ25lcXE7XCIsXG4gICAgXCI4ODEwXCI6IFwiTmVzdGVkTGVzc0xlc3M7XCIsXG4gICAgXCI4ODExXCI6IFwiTmVzdGVkR3JlYXRlckdyZWF0ZXI7XCIsXG4gICAgXCI4ODEyXCI6IFwidHdpeHQ7XCIsXG4gICAgXCI4ODEzXCI6IFwiTm90Q3VwQ2FwO1wiLFxuICAgIFwiODgxNFwiOiBcIk5vdExlc3M7XCIsXG4gICAgXCI4ODE1XCI6IFwiTm90R3JlYXRlcjtcIixcbiAgICBcIjg4MTZcIjogXCJOb3RMZXNzRXF1YWw7XCIsXG4gICAgXCI4ODE3XCI6IFwiTm90R3JlYXRlckVxdWFsO1wiLFxuICAgIFwiODgxOFwiOiBcImxzaW07XCIsXG4gICAgXCI4ODE5XCI6IFwiZ3Ryc2ltO1wiLFxuICAgIFwiODgyMFwiOiBcIk5vdExlc3NUaWxkZTtcIixcbiAgICBcIjg4MjFcIjogXCJOb3RHcmVhdGVyVGlsZGU7XCIsXG4gICAgXCI4ODIyXCI6IFwibGc7XCIsXG4gICAgXCI4ODIzXCI6IFwiZ3RybGVzcztcIixcbiAgICBcIjg4MjRcIjogXCJudGxnO1wiLFxuICAgIFwiODgyNVwiOiBcIm50Z2w7XCIsXG4gICAgXCI4ODI2XCI6IFwiUHJlY2VkZXM7XCIsXG4gICAgXCI4ODI3XCI6IFwiU3VjY2VlZHM7XCIsXG4gICAgXCI4ODI4XCI6IFwiUHJlY2VkZXNTbGFudEVxdWFsO1wiLFxuICAgIFwiODgyOVwiOiBcIlN1Y2NlZWRzU2xhbnRFcXVhbDtcIixcbiAgICBcIjg4MzBcIjogXCJwcnNpbTtcIixcbiAgICBcIjg4MzFcIjogXCJzdWNjc2ltO1wiLFxuICAgIFwiODgzMlwiOiBcIm5wcmVjO1wiLFxuICAgIFwiODgzM1wiOiBcIm5zdWNjO1wiLFxuICAgIFwiODgzNFwiOiBcInN1YnNldDtcIixcbiAgICBcIjg4MzVcIjogXCJzdXBzZXQ7XCIsXG4gICAgXCI4ODM2XCI6IFwibnN1YjtcIixcbiAgICBcIjg4MzdcIjogXCJuc3VwO1wiLFxuICAgIFwiODgzOFwiOiBcIlN1YnNldEVxdWFsO1wiLFxuICAgIFwiODgzOVwiOiBcInN1cHNldGVxO1wiLFxuICAgIFwiODg0MFwiOiBcIm5zdWJzZXRlcTtcIixcbiAgICBcIjg4NDFcIjogXCJuc3Vwc2V0ZXE7XCIsXG4gICAgXCI4ODQyXCI6IFwic3Vic2V0bmVxO1wiLFxuICAgIFwiODg0M1wiOiBcInN1cHNldG5lcTtcIixcbiAgICBcIjg4NDVcIjogXCJjdXBkb3Q7XCIsXG4gICAgXCI4ODQ2XCI6IFwidXBsdXM7XCIsXG4gICAgXCI4ODQ3XCI6IFwiU3F1YXJlU3Vic2V0O1wiLFxuICAgIFwiODg0OFwiOiBcIlNxdWFyZVN1cGVyc2V0O1wiLFxuICAgIFwiODg0OVwiOiBcIlNxdWFyZVN1YnNldEVxdWFsO1wiLFxuICAgIFwiODg1MFwiOiBcIlNxdWFyZVN1cGVyc2V0RXF1YWw7XCIsXG4gICAgXCI4ODUxXCI6IFwiU3F1YXJlSW50ZXJzZWN0aW9uO1wiLFxuICAgIFwiODg1MlwiOiBcIlNxdWFyZVVuaW9uO1wiLFxuICAgIFwiODg1M1wiOiBcIm9wbHVzO1wiLFxuICAgIFwiODg1NFwiOiBcIm9taW51cztcIixcbiAgICBcIjg4NTVcIjogXCJvdGltZXM7XCIsXG4gICAgXCI4ODU2XCI6IFwib3NvbDtcIixcbiAgICBcIjg4NTdcIjogXCJvZG90O1wiLFxuICAgIFwiODg1OFwiOiBcIm9jaXI7XCIsXG4gICAgXCI4ODU5XCI6IFwib2FzdDtcIixcbiAgICBcIjg4NjFcIjogXCJvZGFzaDtcIixcbiAgICBcIjg4NjJcIjogXCJwbHVzYjtcIixcbiAgICBcIjg4NjNcIjogXCJtaW51c2I7XCIsXG4gICAgXCI4ODY0XCI6IFwidGltZXNiO1wiLFxuICAgIFwiODg2NVwiOiBcInNkb3RiO1wiLFxuICAgIFwiODg2NlwiOiBcInZkYXNoO1wiLFxuICAgIFwiODg2N1wiOiBcIkxlZnRUZWU7XCIsXG4gICAgXCI4ODY4XCI6IFwidG9wO1wiLFxuICAgIFwiODg2OVwiOiBcIlVwVGVlO1wiLFxuICAgIFwiODg3MVwiOiBcIm1vZGVscztcIixcbiAgICBcIjg4NzJcIjogXCJ2RGFzaDtcIixcbiAgICBcIjg4NzNcIjogXCJWZGFzaDtcIixcbiAgICBcIjg4NzRcIjogXCJWdmRhc2g7XCIsXG4gICAgXCI4ODc1XCI6IFwiVkRhc2g7XCIsXG4gICAgXCI4ODc2XCI6IFwibnZkYXNoO1wiLFxuICAgIFwiODg3N1wiOiBcIm52RGFzaDtcIixcbiAgICBcIjg4NzhcIjogXCJuVmRhc2g7XCIsXG4gICAgXCI4ODc5XCI6IFwiblZEYXNoO1wiLFxuICAgIFwiODg4MFwiOiBcInBydXJlbDtcIixcbiAgICBcIjg4ODJcIjogXCJ2bHRyaTtcIixcbiAgICBcIjg4ODNcIjogXCJ2cnRyaTtcIixcbiAgICBcIjg4ODRcIjogXCJ0cmlhbmdsZWxlZnRlcTtcIixcbiAgICBcIjg4ODVcIjogXCJ0cmlhbmdsZXJpZ2h0ZXE7XCIsXG4gICAgXCI4ODg2XCI6IFwib3JpZ29mO1wiLFxuICAgIFwiODg4N1wiOiBcImltb2Y7XCIsXG4gICAgXCI4ODg4XCI6IFwibXVtYXA7XCIsXG4gICAgXCI4ODg5XCI6IFwiaGVyY29uO1wiLFxuICAgIFwiODg5MFwiOiBcImludGVyY2FsO1wiLFxuICAgIFwiODg5MVwiOiBcInZlZWJhcjtcIixcbiAgICBcIjg4OTNcIjogXCJiYXJ2ZWU7XCIsXG4gICAgXCI4ODk0XCI6IFwiYW5ncnR2YjtcIixcbiAgICBcIjg4OTVcIjogXCJscnRyaTtcIixcbiAgICBcIjg4OTZcIjogXCJ4d2VkZ2U7XCIsXG4gICAgXCI4ODk3XCI6IFwieHZlZTtcIixcbiAgICBcIjg4OThcIjogXCJ4Y2FwO1wiLFxuICAgIFwiODg5OVwiOiBcInhjdXA7XCIsXG4gICAgXCI4OTAwXCI6IFwiZGlhbW9uZDtcIixcbiAgICBcIjg5MDFcIjogXCJzZG90O1wiLFxuICAgIFwiODkwMlwiOiBcIlN0YXI7XCIsXG4gICAgXCI4OTAzXCI6IFwiZGl2b254O1wiLFxuICAgIFwiODkwNFwiOiBcImJvd3RpZTtcIixcbiAgICBcIjg5MDVcIjogXCJsdGltZXM7XCIsXG4gICAgXCI4OTA2XCI6IFwicnRpbWVzO1wiLFxuICAgIFwiODkwN1wiOiBcImx0aHJlZTtcIixcbiAgICBcIjg5MDhcIjogXCJydGhyZWU7XCIsXG4gICAgXCI4OTA5XCI6IFwiYnNpbWU7XCIsXG4gICAgXCI4OTEwXCI6IFwiY3V2ZWU7XCIsXG4gICAgXCI4OTExXCI6IFwiY3V3ZWQ7XCIsXG4gICAgXCI4OTEyXCI6IFwiU3Vic2V0O1wiLFxuICAgIFwiODkxM1wiOiBcIlN1cHNldDtcIixcbiAgICBcIjg5MTRcIjogXCJDYXA7XCIsXG4gICAgXCI4OTE1XCI6IFwiQ3VwO1wiLFxuICAgIFwiODkxNlwiOiBcInBpdGNoZm9yaztcIixcbiAgICBcIjg5MTdcIjogXCJlcGFyO1wiLFxuICAgIFwiODkxOFwiOiBcImx0ZG90O1wiLFxuICAgIFwiODkxOVwiOiBcImd0cmRvdDtcIixcbiAgICBcIjg5MjBcIjogXCJMbDtcIixcbiAgICBcIjg5MjFcIjogXCJnZ2c7XCIsXG4gICAgXCI4OTIyXCI6IFwiTGVzc0VxdWFsR3JlYXRlcjtcIixcbiAgICBcIjg5MjNcIjogXCJndHJlcWxlc3M7XCIsXG4gICAgXCI4OTI2XCI6IFwiY3VybHllcXByZWM7XCIsXG4gICAgXCI4OTI3XCI6IFwiY3VybHllcXN1Y2M7XCIsXG4gICAgXCI4OTI4XCI6IFwibnByY3VlO1wiLFxuICAgIFwiODkyOVwiOiBcIm5zY2N1ZTtcIixcbiAgICBcIjg5MzBcIjogXCJuc3FzdWJlO1wiLFxuICAgIFwiODkzMVwiOiBcIm5zcXN1cGU7XCIsXG4gICAgXCI4OTM0XCI6IFwibG5zaW07XCIsXG4gICAgXCI4OTM1XCI6IFwiZ25zaW07XCIsXG4gICAgXCI4OTM2XCI6IFwicHJuc2ltO1wiLFxuICAgIFwiODkzN1wiOiBcInN1Y2Nuc2ltO1wiLFxuICAgIFwiODkzOFwiOiBcIm50cmlhbmdsZWxlZnQ7XCIsXG4gICAgXCI4OTM5XCI6IFwibnRyaWFuZ2xlcmlnaHQ7XCIsXG4gICAgXCI4OTQwXCI6IFwibnRyaWFuZ2xlbGVmdGVxO1wiLFxuICAgIFwiODk0MVwiOiBcIm50cmlhbmdsZXJpZ2h0ZXE7XCIsXG4gICAgXCI4OTQyXCI6IFwidmVsbGlwO1wiLFxuICAgIFwiODk0M1wiOiBcImN0ZG90O1wiLFxuICAgIFwiODk0NFwiOiBcInV0ZG90O1wiLFxuICAgIFwiODk0NVwiOiBcImR0ZG90O1wiLFxuICAgIFwiODk0NlwiOiBcImRpc2luO1wiLFxuICAgIFwiODk0N1wiOiBcImlzaW5zdjtcIixcbiAgICBcIjg5NDhcIjogXCJpc2lucztcIixcbiAgICBcIjg5NDlcIjogXCJpc2luZG90O1wiLFxuICAgIFwiODk1MFwiOiBcIm5vdGludmM7XCIsXG4gICAgXCI4OTUxXCI6IFwibm90aW52YjtcIixcbiAgICBcIjg5NTNcIjogXCJpc2luRTtcIixcbiAgICBcIjg5NTRcIjogXCJuaXNkO1wiLFxuICAgIFwiODk1NVwiOiBcInhuaXM7XCIsXG4gICAgXCI4OTU2XCI6IFwibmlzO1wiLFxuICAgIFwiODk1N1wiOiBcIm5vdG5pdmM7XCIsXG4gICAgXCI4OTU4XCI6IFwibm90bml2YjtcIixcbiAgICBcIjg5NjVcIjogXCJiYXJ3ZWRnZTtcIixcbiAgICBcIjg5NjZcIjogXCJkb3VibGViYXJ3ZWRnZTtcIixcbiAgICBcIjg5NjhcIjogXCJMZWZ0Q2VpbGluZztcIixcbiAgICBcIjg5NjlcIjogXCJSaWdodENlaWxpbmc7XCIsXG4gICAgXCI4OTcwXCI6IFwibGZsb29yO1wiLFxuICAgIFwiODk3MVwiOiBcIlJpZ2h0Rmxvb3I7XCIsXG4gICAgXCI4OTcyXCI6IFwiZHJjcm9wO1wiLFxuICAgIFwiODk3M1wiOiBcImRsY3JvcDtcIixcbiAgICBcIjg5NzRcIjogXCJ1cmNyb3A7XCIsXG4gICAgXCI4OTc1XCI6IFwidWxjcm9wO1wiLFxuICAgIFwiODk3NlwiOiBcImJub3Q7XCIsXG4gICAgXCI4OTc4XCI6IFwicHJvZmxpbmU7XCIsXG4gICAgXCI4OTc5XCI6IFwicHJvZnN1cmY7XCIsXG4gICAgXCI4OTgxXCI6IFwidGVscmVjO1wiLFxuICAgIFwiODk4MlwiOiBcInRhcmdldDtcIixcbiAgICBcIjg5ODhcIjogXCJ1bGNvcm5lcjtcIixcbiAgICBcIjg5ODlcIjogXCJ1cmNvcm5lcjtcIixcbiAgICBcIjg5OTBcIjogXCJsbGNvcm5lcjtcIixcbiAgICBcIjg5OTFcIjogXCJscmNvcm5lcjtcIixcbiAgICBcIjg5OTRcIjogXCJzZnJvd247XCIsXG4gICAgXCI4OTk1XCI6IFwic3NtaWxlO1wiLFxuICAgIFwiOTAwNVwiOiBcImN5bGN0eTtcIixcbiAgICBcIjkwMDZcIjogXCJwcm9mYWxhcjtcIixcbiAgICBcIjkwMTRcIjogXCJ0b3Bib3Q7XCIsXG4gICAgXCI5MDIxXCI6IFwib3ZiYXI7XCIsXG4gICAgXCI5MDIzXCI6IFwic29sYmFyO1wiLFxuICAgIFwiOTA4NFwiOiBcImFuZ3phcnI7XCIsXG4gICAgXCI5MTM2XCI6IFwibG1vdXN0YWNoZTtcIixcbiAgICBcIjkxMzdcIjogXCJybW91c3RhY2hlO1wiLFxuICAgIFwiOTE0MFwiOiBcInRicms7XCIsXG4gICAgXCI5MTQxXCI6IFwiVW5kZXJCcmFja2V0O1wiLFxuICAgIFwiOTE0MlwiOiBcImJicmt0YnJrO1wiLFxuICAgIFwiOTE4MFwiOiBcIk92ZXJQYXJlbnRoZXNpcztcIixcbiAgICBcIjkxODFcIjogXCJVbmRlclBhcmVudGhlc2lzO1wiLFxuICAgIFwiOTE4MlwiOiBcIk92ZXJCcmFjZTtcIixcbiAgICBcIjkxODNcIjogXCJVbmRlckJyYWNlO1wiLFxuICAgIFwiOTE4NlwiOiBcInRycGV6aXVtO1wiLFxuICAgIFwiOTE5MVwiOiBcImVsaW50ZXJzO1wiLFxuICAgIFwiOTI1MVwiOiBcImJsYW5rO1wiLFxuICAgIFwiOTQxNlwiOiBcIm9TO1wiLFxuICAgIFwiOTQ3MlwiOiBcIkhvcml6b250YWxMaW5lO1wiLFxuICAgIFwiOTQ3NFwiOiBcImJveHY7XCIsXG4gICAgXCI5NDg0XCI6IFwiYm94ZHI7XCIsXG4gICAgXCI5NDg4XCI6IFwiYm94ZGw7XCIsXG4gICAgXCI5NDkyXCI6IFwiYm94dXI7XCIsXG4gICAgXCI5NDk2XCI6IFwiYm94dWw7XCIsXG4gICAgXCI5NTAwXCI6IFwiYm94dnI7XCIsXG4gICAgXCI5NTA4XCI6IFwiYm94dmw7XCIsXG4gICAgXCI5NTE2XCI6IFwiYm94aGQ7XCIsXG4gICAgXCI5NTI0XCI6IFwiYm94aHU7XCIsXG4gICAgXCI5NTMyXCI6IFwiYm94dmg7XCIsXG4gICAgXCI5NTUyXCI6IFwiYm94SDtcIixcbiAgICBcIjk1NTNcIjogXCJib3hWO1wiLFxuICAgIFwiOTU1NFwiOiBcImJveGRSO1wiLFxuICAgIFwiOTU1NVwiOiBcImJveERyO1wiLFxuICAgIFwiOTU1NlwiOiBcImJveERSO1wiLFxuICAgIFwiOTU1N1wiOiBcImJveGRMO1wiLFxuICAgIFwiOTU1OFwiOiBcImJveERsO1wiLFxuICAgIFwiOTU1OVwiOiBcImJveERMO1wiLFxuICAgIFwiOTU2MFwiOiBcImJveHVSO1wiLFxuICAgIFwiOTU2MVwiOiBcImJveFVyO1wiLFxuICAgIFwiOTU2MlwiOiBcImJveFVSO1wiLFxuICAgIFwiOTU2M1wiOiBcImJveHVMO1wiLFxuICAgIFwiOTU2NFwiOiBcImJveFVsO1wiLFxuICAgIFwiOTU2NVwiOiBcImJveFVMO1wiLFxuICAgIFwiOTU2NlwiOiBcImJveHZSO1wiLFxuICAgIFwiOTU2N1wiOiBcImJveFZyO1wiLFxuICAgIFwiOTU2OFwiOiBcImJveFZSO1wiLFxuICAgIFwiOTU2OVwiOiBcImJveHZMO1wiLFxuICAgIFwiOTU3MFwiOiBcImJveFZsO1wiLFxuICAgIFwiOTU3MVwiOiBcImJveFZMO1wiLFxuICAgIFwiOTU3MlwiOiBcImJveEhkO1wiLFxuICAgIFwiOTU3M1wiOiBcImJveGhEO1wiLFxuICAgIFwiOTU3NFwiOiBcImJveEhEO1wiLFxuICAgIFwiOTU3NVwiOiBcImJveEh1O1wiLFxuICAgIFwiOTU3NlwiOiBcImJveGhVO1wiLFxuICAgIFwiOTU3N1wiOiBcImJveEhVO1wiLFxuICAgIFwiOTU3OFwiOiBcImJveHZIO1wiLFxuICAgIFwiOTU3OVwiOiBcImJveFZoO1wiLFxuICAgIFwiOTU4MFwiOiBcImJveFZIO1wiLFxuICAgIFwiOTYwMFwiOiBcInVoYmxrO1wiLFxuICAgIFwiOTYwNFwiOiBcImxoYmxrO1wiLFxuICAgIFwiOTYwOFwiOiBcImJsb2NrO1wiLFxuICAgIFwiOTYxN1wiOiBcImJsazE0O1wiLFxuICAgIFwiOTYxOFwiOiBcImJsazEyO1wiLFxuICAgIFwiOTYxOVwiOiBcImJsazM0O1wiLFxuICAgIFwiOTYzM1wiOiBcInNxdWFyZTtcIixcbiAgICBcIjk2NDJcIjogXCJzcXVmO1wiLFxuICAgIFwiOTY0M1wiOiBcIkVtcHR5VmVyeVNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTY0NVwiOiBcInJlY3Q7XCIsXG4gICAgXCI5NjQ2XCI6IFwibWFya2VyO1wiLFxuICAgIFwiOTY0OVwiOiBcImZsdG5zO1wiLFxuICAgIFwiOTY1MVwiOiBcInh1dHJpO1wiLFxuICAgIFwiOTY1MlwiOiBcInV0cmlmO1wiLFxuICAgIFwiOTY1M1wiOiBcInV0cmk7XCIsXG4gICAgXCI5NjU2XCI6IFwicnRyaWY7XCIsXG4gICAgXCI5NjU3XCI6IFwidHJpYW5nbGVyaWdodDtcIixcbiAgICBcIjk2NjFcIjogXCJ4ZHRyaTtcIixcbiAgICBcIjk2NjJcIjogXCJkdHJpZjtcIixcbiAgICBcIjk2NjNcIjogXCJ0cmlhbmdsZWRvd247XCIsXG4gICAgXCI5NjY2XCI6IFwibHRyaWY7XCIsXG4gICAgXCI5NjY3XCI6IFwidHJpYW5nbGVsZWZ0O1wiLFxuICAgIFwiOTY3NFwiOiBcImxvemVuZ2U7XCIsXG4gICAgXCI5Njc1XCI6IFwiY2lyO1wiLFxuICAgIFwiOTcwOFwiOiBcInRyaWRvdDtcIixcbiAgICBcIjk3MTFcIjogXCJ4Y2lyYztcIixcbiAgICBcIjk3MjBcIjogXCJ1bHRyaTtcIixcbiAgICBcIjk3MjFcIjogXCJ1cnRyaTtcIixcbiAgICBcIjk3MjJcIjogXCJsbHRyaTtcIixcbiAgICBcIjk3MjNcIjogXCJFbXB0eVNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTcyNFwiOiBcIkZpbGxlZFNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTczM1wiOiBcInN0YXJmO1wiLFxuICAgIFwiOTczNFwiOiBcInN0YXI7XCIsXG4gICAgXCI5NzQyXCI6IFwicGhvbmU7XCIsXG4gICAgXCI5NzkyXCI6IFwiZmVtYWxlO1wiLFxuICAgIFwiOTc5NFwiOiBcIm1hbGU7XCIsXG4gICAgXCI5ODI0XCI6IFwic3BhZGVzdWl0O1wiLFxuICAgIFwiOTgyN1wiOiBcImNsdWJzdWl0O1wiLFxuICAgIFwiOTgyOVwiOiBcImhlYXJ0c3VpdDtcIixcbiAgICBcIjk4MzBcIjogXCJkaWFtcztcIixcbiAgICBcIjk4MzRcIjogXCJzdW5nO1wiLFxuICAgIFwiOTgzN1wiOiBcImZsYXQ7XCIsXG4gICAgXCI5ODM4XCI6IFwibmF0dXJhbDtcIixcbiAgICBcIjk4MzlcIjogXCJzaGFycDtcIixcbiAgICBcIjEwMDAzXCI6IFwiY2hlY2ttYXJrO1wiLFxuICAgIFwiMTAwMDdcIjogXCJjcm9zcztcIixcbiAgICBcIjEwMDE2XCI6IFwibWFsdGVzZTtcIixcbiAgICBcIjEwMDM4XCI6IFwic2V4dDtcIixcbiAgICBcIjEwMDcyXCI6IFwiVmVydGljYWxTZXBhcmF0b3I7XCIsXG4gICAgXCIxMDA5OFwiOiBcImxiYnJrO1wiLFxuICAgIFwiMTAwOTlcIjogXCJyYmJyaztcIixcbiAgICBcIjEwMTg0XCI6IFwiYnNvbGhzdWI7XCIsXG4gICAgXCIxMDE4NVwiOiBcInN1cGhzb2w7XCIsXG4gICAgXCIxMDIxNFwiOiBcImxvYnJrO1wiLFxuICAgIFwiMTAyMTVcIjogXCJyb2JyaztcIixcbiAgICBcIjEwMjE2XCI6IFwiTGVmdEFuZ2xlQnJhY2tldDtcIixcbiAgICBcIjEwMjE3XCI6IFwiUmlnaHRBbmdsZUJyYWNrZXQ7XCIsXG4gICAgXCIxMDIxOFwiOiBcIkxhbmc7XCIsXG4gICAgXCIxMDIxOVwiOiBcIlJhbmc7XCIsXG4gICAgXCIxMDIyMFwiOiBcImxvYW5nO1wiLFxuICAgIFwiMTAyMjFcIjogXCJyb2FuZztcIixcbiAgICBcIjEwMjI5XCI6IFwieGxhcnI7XCIsXG4gICAgXCIxMDIzMFwiOiBcInhyYXJyO1wiLFxuICAgIFwiMTAyMzFcIjogXCJ4aGFycjtcIixcbiAgICBcIjEwMjMyXCI6IFwieGxBcnI7XCIsXG4gICAgXCIxMDIzM1wiOiBcInhyQXJyO1wiLFxuICAgIFwiMTAyMzRcIjogXCJ4aEFycjtcIixcbiAgICBcIjEwMjM2XCI6IFwieG1hcDtcIixcbiAgICBcIjEwMjM5XCI6IFwiZHppZ3JhcnI7XCIsXG4gICAgXCIxMDQ5OFwiOiBcIm52bEFycjtcIixcbiAgICBcIjEwNDk5XCI6IFwibnZyQXJyO1wiLFxuICAgIFwiMTA1MDBcIjogXCJudkhhcnI7XCIsXG4gICAgXCIxMDUwMVwiOiBcIk1hcDtcIixcbiAgICBcIjEwNTA4XCI6IFwibGJhcnI7XCIsXG4gICAgXCIxMDUwOVwiOiBcInJiYXJyO1wiLFxuICAgIFwiMTA1MTBcIjogXCJsQmFycjtcIixcbiAgICBcIjEwNTExXCI6IFwickJhcnI7XCIsXG4gICAgXCIxMDUxMlwiOiBcIlJCYXJyO1wiLFxuICAgIFwiMTA1MTNcIjogXCJERG90cmFoZDtcIixcbiAgICBcIjEwNTE0XCI6IFwiVXBBcnJvd0JhcjtcIixcbiAgICBcIjEwNTE1XCI6IFwiRG93bkFycm93QmFyO1wiLFxuICAgIFwiMTA1MThcIjogXCJSYXJydGw7XCIsXG4gICAgXCIxMDUyMVwiOiBcImxhdGFpbDtcIixcbiAgICBcIjEwNTIyXCI6IFwicmF0YWlsO1wiLFxuICAgIFwiMTA1MjNcIjogXCJsQXRhaWw7XCIsXG4gICAgXCIxMDUyNFwiOiBcInJBdGFpbDtcIixcbiAgICBcIjEwNTI1XCI6IFwibGFycmZzO1wiLFxuICAgIFwiMTA1MjZcIjogXCJyYXJyZnM7XCIsXG4gICAgXCIxMDUyN1wiOiBcImxhcnJiZnM7XCIsXG4gICAgXCIxMDUyOFwiOiBcInJhcnJiZnM7XCIsXG4gICAgXCIxMDUzMVwiOiBcIm53YXJoaztcIixcbiAgICBcIjEwNTMyXCI6IFwibmVhcmhrO1wiLFxuICAgIFwiMTA1MzNcIjogXCJzZWFyaGs7XCIsXG4gICAgXCIxMDUzNFwiOiBcInN3YXJoaztcIixcbiAgICBcIjEwNTM1XCI6IFwibnduZWFyO1wiLFxuICAgIFwiMTA1MzZcIjogXCJ0b2VhO1wiLFxuICAgIFwiMTA1MzdcIjogXCJ0b3NhO1wiLFxuICAgIFwiMTA1MzhcIjogXCJzd253YXI7XCIsXG4gICAgXCIxMDU0N1wiOiBcInJhcnJjO1wiLFxuICAgIFwiMTA1NDlcIjogXCJjdWRhcnJyO1wiLFxuICAgIFwiMTA1NTBcIjogXCJsZGNhO1wiLFxuICAgIFwiMTA1NTFcIjogXCJyZGNhO1wiLFxuICAgIFwiMTA1NTJcIjogXCJjdWRhcnJsO1wiLFxuICAgIFwiMTA1NTNcIjogXCJsYXJycGw7XCIsXG4gICAgXCIxMDU1NlwiOiBcImN1cmFycm07XCIsXG4gICAgXCIxMDU1N1wiOiBcImN1bGFycnA7XCIsXG4gICAgXCIxMDU2NVwiOiBcInJhcnJwbDtcIixcbiAgICBcIjEwNTY4XCI6IFwiaGFycmNpcjtcIixcbiAgICBcIjEwNTY5XCI6IFwiVWFycm9jaXI7XCIsXG4gICAgXCIxMDU3MFwiOiBcImx1cmRzaGFyO1wiLFxuICAgIFwiMTA1NzFcIjogXCJsZHJ1c2hhcjtcIixcbiAgICBcIjEwNTc0XCI6IFwiTGVmdFJpZ2h0VmVjdG9yO1wiLFxuICAgIFwiMTA1NzVcIjogXCJSaWdodFVwRG93blZlY3RvcjtcIixcbiAgICBcIjEwNTc2XCI6IFwiRG93bkxlZnRSaWdodFZlY3RvcjtcIixcbiAgICBcIjEwNTc3XCI6IFwiTGVmdFVwRG93blZlY3RvcjtcIixcbiAgICBcIjEwNTc4XCI6IFwiTGVmdFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTc5XCI6IFwiUmlnaHRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MFwiOiBcIlJpZ2h0VXBWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MVwiOiBcIlJpZ2h0RG93blZlY3RvckJhcjtcIixcbiAgICBcIjEwNTgyXCI6IFwiRG93bkxlZnRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4M1wiOiBcIkRvd25SaWdodFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg0XCI6IFwiTGVmdFVwVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODVcIjogXCJMZWZ0RG93blZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg2XCI6IFwiTGVmdFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTg3XCI6IFwiUmlnaHRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4OFwiOiBcIlJpZ2h0VXBUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4OVwiOiBcIlJpZ2h0RG93blRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkwXCI6IFwiRG93bkxlZnRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MVwiOiBcIkRvd25SaWdodFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkyXCI6IFwiTGVmdFVwVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTNcIjogXCJMZWZ0RG93blRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTk0XCI6IFwibEhhcjtcIixcbiAgICBcIjEwNTk1XCI6IFwidUhhcjtcIixcbiAgICBcIjEwNTk2XCI6IFwickhhcjtcIixcbiAgICBcIjEwNTk3XCI6IFwiZEhhcjtcIixcbiAgICBcIjEwNTk4XCI6IFwibHVydWhhcjtcIixcbiAgICBcIjEwNTk5XCI6IFwibGRyZGhhcjtcIixcbiAgICBcIjEwNjAwXCI6IFwicnVsdWhhcjtcIixcbiAgICBcIjEwNjAxXCI6IFwicmRsZGhhcjtcIixcbiAgICBcIjEwNjAyXCI6IFwibGhhcnVsO1wiLFxuICAgIFwiMTA2MDNcIjogXCJsbGhhcmQ7XCIsXG4gICAgXCIxMDYwNFwiOiBcInJoYXJ1bDtcIixcbiAgICBcIjEwNjA1XCI6IFwibHJoYXJkO1wiLFxuICAgIFwiMTA2MDZcIjogXCJVcEVxdWlsaWJyaXVtO1wiLFxuICAgIFwiMTA2MDdcIjogXCJSZXZlcnNlVXBFcXVpbGlicml1bTtcIixcbiAgICBcIjEwNjA4XCI6IFwiUm91bmRJbXBsaWVzO1wiLFxuICAgIFwiMTA2MDlcIjogXCJlcmFycjtcIixcbiAgICBcIjEwNjEwXCI6IFwic2ltcmFycjtcIixcbiAgICBcIjEwNjExXCI6IFwibGFycnNpbTtcIixcbiAgICBcIjEwNjEyXCI6IFwicmFycnNpbTtcIixcbiAgICBcIjEwNjEzXCI6IFwicmFycmFwO1wiLFxuICAgIFwiMTA2MTRcIjogXCJsdGxhcnI7XCIsXG4gICAgXCIxMDYxNlwiOiBcImd0cmFycjtcIixcbiAgICBcIjEwNjE3XCI6IFwic3VicmFycjtcIixcbiAgICBcIjEwNjE5XCI6IFwic3VwbGFycjtcIixcbiAgICBcIjEwNjIwXCI6IFwibGZpc2h0O1wiLFxuICAgIFwiMTA2MjFcIjogXCJyZmlzaHQ7XCIsXG4gICAgXCIxMDYyMlwiOiBcInVmaXNodDtcIixcbiAgICBcIjEwNjIzXCI6IFwiZGZpc2h0O1wiLFxuICAgIFwiMTA2MjlcIjogXCJsb3BhcjtcIixcbiAgICBcIjEwNjMwXCI6IFwicm9wYXI7XCIsXG4gICAgXCIxMDYzNVwiOiBcImxicmtlO1wiLFxuICAgIFwiMTA2MzZcIjogXCJyYnJrZTtcIixcbiAgICBcIjEwNjM3XCI6IFwibGJya3NsdTtcIixcbiAgICBcIjEwNjM4XCI6IFwicmJya3NsZDtcIixcbiAgICBcIjEwNjM5XCI6IFwibGJya3NsZDtcIixcbiAgICBcIjEwNjQwXCI6IFwicmJya3NsdTtcIixcbiAgICBcIjEwNjQxXCI6IFwibGFuZ2Q7XCIsXG4gICAgXCIxMDY0MlwiOiBcInJhbmdkO1wiLFxuICAgIFwiMTA2NDNcIjogXCJscGFybHQ7XCIsXG4gICAgXCIxMDY0NFwiOiBcInJwYXJndDtcIixcbiAgICBcIjEwNjQ1XCI6IFwiZ3RsUGFyO1wiLFxuICAgIFwiMTA2NDZcIjogXCJsdHJQYXI7XCIsXG4gICAgXCIxMDY1MFwiOiBcInZ6aWd6YWc7XCIsXG4gICAgXCIxMDY1MlwiOiBcInZhbmdydDtcIixcbiAgICBcIjEwNjUzXCI6IFwiYW5ncnR2YmQ7XCIsXG4gICAgXCIxMDY2MFwiOiBcImFuZ2U7XCIsXG4gICAgXCIxMDY2MVwiOiBcInJhbmdlO1wiLFxuICAgIFwiMTA2NjJcIjogXCJkd2FuZ2xlO1wiLFxuICAgIFwiMTA2NjNcIjogXCJ1d2FuZ2xlO1wiLFxuICAgIFwiMTA2NjRcIjogXCJhbmdtc2RhYTtcIixcbiAgICBcIjEwNjY1XCI6IFwiYW5nbXNkYWI7XCIsXG4gICAgXCIxMDY2NlwiOiBcImFuZ21zZGFjO1wiLFxuICAgIFwiMTA2NjdcIjogXCJhbmdtc2RhZDtcIixcbiAgICBcIjEwNjY4XCI6IFwiYW5nbXNkYWU7XCIsXG4gICAgXCIxMDY2OVwiOiBcImFuZ21zZGFmO1wiLFxuICAgIFwiMTA2NzBcIjogXCJhbmdtc2RhZztcIixcbiAgICBcIjEwNjcxXCI6IFwiYW5nbXNkYWg7XCIsXG4gICAgXCIxMDY3MlwiOiBcImJlbXB0eXY7XCIsXG4gICAgXCIxMDY3M1wiOiBcImRlbXB0eXY7XCIsXG4gICAgXCIxMDY3NFwiOiBcImNlbXB0eXY7XCIsXG4gICAgXCIxMDY3NVwiOiBcInJhZW1wdHl2O1wiLFxuICAgIFwiMTA2NzZcIjogXCJsYWVtcHR5djtcIixcbiAgICBcIjEwNjc3XCI6IFwib2hiYXI7XCIsXG4gICAgXCIxMDY3OFwiOiBcIm9taWQ7XCIsXG4gICAgXCIxMDY3OVwiOiBcIm9wYXI7XCIsXG4gICAgXCIxMDY4MVwiOiBcIm9wZXJwO1wiLFxuICAgIFwiMTA2ODNcIjogXCJvbGNyb3NzO1wiLFxuICAgIFwiMTA2ODRcIjogXCJvZHNvbGQ7XCIsXG4gICAgXCIxMDY4NlwiOiBcIm9sY2lyO1wiLFxuICAgIFwiMTA2ODdcIjogXCJvZmNpcjtcIixcbiAgICBcIjEwNjg4XCI6IFwib2x0O1wiLFxuICAgIFwiMTA2ODlcIjogXCJvZ3Q7XCIsXG4gICAgXCIxMDY5MFwiOiBcImNpcnNjaXI7XCIsXG4gICAgXCIxMDY5MVwiOiBcImNpckU7XCIsXG4gICAgXCIxMDY5MlwiOiBcInNvbGI7XCIsXG4gICAgXCIxMDY5M1wiOiBcImJzb2xiO1wiLFxuICAgIFwiMTA2OTdcIjogXCJib3hib3g7XCIsXG4gICAgXCIxMDcwMVwiOiBcInRyaXNiO1wiLFxuICAgIFwiMTA3MDJcIjogXCJydHJpbHRyaTtcIixcbiAgICBcIjEwNzAzXCI6IFwiTGVmdFRyaWFuZ2xlQmFyO1wiLFxuICAgIFwiMTA3MDRcIjogXCJSaWdodFRyaWFuZ2xlQmFyO1wiLFxuICAgIFwiMTA3MTZcIjogXCJpaW5maW47XCIsXG4gICAgXCIxMDcxN1wiOiBcImluZmludGllO1wiLFxuICAgIFwiMTA3MThcIjogXCJudmluZmluO1wiLFxuICAgIFwiMTA3MjNcIjogXCJlcGFyc2w7XCIsXG4gICAgXCIxMDcyNFwiOiBcInNtZXBhcnNsO1wiLFxuICAgIFwiMTA3MjVcIjogXCJlcXZwYXJzbDtcIixcbiAgICBcIjEwNzMxXCI6IFwibG96ZjtcIixcbiAgICBcIjEwNzQwXCI6IFwiUnVsZURlbGF5ZWQ7XCIsXG4gICAgXCIxMDc0MlwiOiBcImRzb2w7XCIsXG4gICAgXCIxMDc1MlwiOiBcInhvZG90O1wiLFxuICAgIFwiMTA3NTNcIjogXCJ4b3BsdXM7XCIsXG4gICAgXCIxMDc1NFwiOiBcInhvdGltZTtcIixcbiAgICBcIjEwNzU2XCI6IFwieHVwbHVzO1wiLFxuICAgIFwiMTA3NThcIjogXCJ4c3FjdXA7XCIsXG4gICAgXCIxMDc2NFwiOiBcInFpbnQ7XCIsXG4gICAgXCIxMDc2NVwiOiBcImZwYXJ0aW50O1wiLFxuICAgIFwiMTA3NjhcIjogXCJjaXJmbmludDtcIixcbiAgICBcIjEwNzY5XCI6IFwiYXdpbnQ7XCIsXG4gICAgXCIxMDc3MFwiOiBcInJwcG9saW50O1wiLFxuICAgIFwiMTA3NzFcIjogXCJzY3BvbGludDtcIixcbiAgICBcIjEwNzcyXCI6IFwibnBvbGludDtcIixcbiAgICBcIjEwNzczXCI6IFwicG9pbnRpbnQ7XCIsXG4gICAgXCIxMDc3NFwiOiBcInF1YXRpbnQ7XCIsXG4gICAgXCIxMDc3NVwiOiBcImludGxhcmhrO1wiLFxuICAgIFwiMTA3ODZcIjogXCJwbHVzY2lyO1wiLFxuICAgIFwiMTA3ODdcIjogXCJwbHVzYWNpcjtcIixcbiAgICBcIjEwNzg4XCI6IFwic2ltcGx1cztcIixcbiAgICBcIjEwNzg5XCI6IFwicGx1c2R1O1wiLFxuICAgIFwiMTA3OTBcIjogXCJwbHVzc2ltO1wiLFxuICAgIFwiMTA3OTFcIjogXCJwbHVzdHdvO1wiLFxuICAgIFwiMTA3OTNcIjogXCJtY29tbWE7XCIsXG4gICAgXCIxMDc5NFwiOiBcIm1pbnVzZHU7XCIsXG4gICAgXCIxMDc5N1wiOiBcImxvcGx1cztcIixcbiAgICBcIjEwNzk4XCI6IFwicm9wbHVzO1wiLFxuICAgIFwiMTA3OTlcIjogXCJDcm9zcztcIixcbiAgICBcIjEwODAwXCI6IFwidGltZXNkO1wiLFxuICAgIFwiMTA4MDFcIjogXCJ0aW1lc2JhcjtcIixcbiAgICBcIjEwODAzXCI6IFwic21hc2hwO1wiLFxuICAgIFwiMTA4MDRcIjogXCJsb3RpbWVzO1wiLFxuICAgIFwiMTA4MDVcIjogXCJyb3RpbWVzO1wiLFxuICAgIFwiMTA4MDZcIjogXCJvdGltZXNhcztcIixcbiAgICBcIjEwODA3XCI6IFwiT3RpbWVzO1wiLFxuICAgIFwiMTA4MDhcIjogXCJvZGl2O1wiLFxuICAgIFwiMTA4MDlcIjogXCJ0cmlwbHVzO1wiLFxuICAgIFwiMTA4MTBcIjogXCJ0cmltaW51cztcIixcbiAgICBcIjEwODExXCI6IFwidHJpdGltZTtcIixcbiAgICBcIjEwODEyXCI6IFwiaXByb2Q7XCIsXG4gICAgXCIxMDgxNVwiOiBcImFtYWxnO1wiLFxuICAgIFwiMTA4MTZcIjogXCJjYXBkb3Q7XCIsXG4gICAgXCIxMDgxOFwiOiBcIm5jdXA7XCIsXG4gICAgXCIxMDgxOVwiOiBcIm5jYXA7XCIsXG4gICAgXCIxMDgyMFwiOiBcImNhcGFuZDtcIixcbiAgICBcIjEwODIxXCI6IFwiY3Vwb3I7XCIsXG4gICAgXCIxMDgyMlwiOiBcImN1cGNhcDtcIixcbiAgICBcIjEwODIzXCI6IFwiY2FwY3VwO1wiLFxuICAgIFwiMTA4MjRcIjogXCJjdXBicmNhcDtcIixcbiAgICBcIjEwODI1XCI6IFwiY2FwYnJjdXA7XCIsXG4gICAgXCIxMDgyNlwiOiBcImN1cGN1cDtcIixcbiAgICBcIjEwODI3XCI6IFwiY2FwY2FwO1wiLFxuICAgIFwiMTA4MjhcIjogXCJjY3VwcztcIixcbiAgICBcIjEwODI5XCI6IFwiY2NhcHM7XCIsXG4gICAgXCIxMDgzMlwiOiBcImNjdXBzc207XCIsXG4gICAgXCIxMDgzNVwiOiBcIkFuZDtcIixcbiAgICBcIjEwODM2XCI6IFwiT3I7XCIsXG4gICAgXCIxMDgzN1wiOiBcImFuZGFuZDtcIixcbiAgICBcIjEwODM4XCI6IFwib3JvcjtcIixcbiAgICBcIjEwODM5XCI6IFwib3JzbG9wZTtcIixcbiAgICBcIjEwODQwXCI6IFwiYW5kc2xvcGU7XCIsXG4gICAgXCIxMDg0MlwiOiBcImFuZHY7XCIsXG4gICAgXCIxMDg0M1wiOiBcIm9ydjtcIixcbiAgICBcIjEwODQ0XCI6IFwiYW5kZDtcIixcbiAgICBcIjEwODQ1XCI6IFwib3JkO1wiLFxuICAgIFwiMTA4NDdcIjogXCJ3ZWRiYXI7XCIsXG4gICAgXCIxMDg1NFwiOiBcInNkb3RlO1wiLFxuICAgIFwiMTA4NThcIjogXCJzaW1kb3Q7XCIsXG4gICAgXCIxMDg2MVwiOiBcImNvbmdkb3Q7XCIsXG4gICAgXCIxMDg2MlwiOiBcImVhc3RlcjtcIixcbiAgICBcIjEwODYzXCI6IFwiYXBhY2lyO1wiLFxuICAgIFwiMTA4NjRcIjogXCJhcEU7XCIsXG4gICAgXCIxMDg2NVwiOiBcImVwbHVzO1wiLFxuICAgIFwiMTA4NjZcIjogXCJwbHVzZTtcIixcbiAgICBcIjEwODY3XCI6IFwiRXNpbTtcIixcbiAgICBcIjEwODY4XCI6IFwiQ29sb25lO1wiLFxuICAgIFwiMTA4NjlcIjogXCJFcXVhbDtcIixcbiAgICBcIjEwODcxXCI6IFwiZUREb3Q7XCIsXG4gICAgXCIxMDg3MlwiOiBcImVxdWl2REQ7XCIsXG4gICAgXCIxMDg3M1wiOiBcImx0Y2lyO1wiLFxuICAgIFwiMTA4NzRcIjogXCJndGNpcjtcIixcbiAgICBcIjEwODc1XCI6IFwibHRxdWVzdDtcIixcbiAgICBcIjEwODc2XCI6IFwiZ3RxdWVzdDtcIixcbiAgICBcIjEwODc3XCI6IFwiTGVzc1NsYW50RXF1YWw7XCIsXG4gICAgXCIxMDg3OFwiOiBcIkdyZWF0ZXJTbGFudEVxdWFsO1wiLFxuICAgIFwiMTA4NzlcIjogXCJsZXNkb3Q7XCIsXG4gICAgXCIxMDg4MFwiOiBcImdlc2RvdDtcIixcbiAgICBcIjEwODgxXCI6IFwibGVzZG90bztcIixcbiAgICBcIjEwODgyXCI6IFwiZ2VzZG90bztcIixcbiAgICBcIjEwODgzXCI6IFwibGVzZG90b3I7XCIsXG4gICAgXCIxMDg4NFwiOiBcImdlc2RvdG9sO1wiLFxuICAgIFwiMTA4ODVcIjogXCJsZXNzYXBwcm94O1wiLFxuICAgIFwiMTA4ODZcIjogXCJndHJhcHByb3g7XCIsXG4gICAgXCIxMDg4N1wiOiBcImxuZXE7XCIsXG4gICAgXCIxMDg4OFwiOiBcImduZXE7XCIsXG4gICAgXCIxMDg4OVwiOiBcImxuYXBwcm94O1wiLFxuICAgIFwiMTA4OTBcIjogXCJnbmFwcHJveDtcIixcbiAgICBcIjEwODkxXCI6IFwibGVzc2VxcWd0cjtcIixcbiAgICBcIjEwODkyXCI6IFwiZ3RyZXFxbGVzcztcIixcbiAgICBcIjEwODkzXCI6IFwibHNpbWU7XCIsXG4gICAgXCIxMDg5NFwiOiBcImdzaW1lO1wiLFxuICAgIFwiMTA4OTVcIjogXCJsc2ltZztcIixcbiAgICBcIjEwODk2XCI6IFwiZ3NpbWw7XCIsXG4gICAgXCIxMDg5N1wiOiBcImxnRTtcIixcbiAgICBcIjEwODk4XCI6IFwiZ2xFO1wiLFxuICAgIFwiMTA4OTlcIjogXCJsZXNnZXM7XCIsXG4gICAgXCIxMDkwMFwiOiBcImdlc2xlcztcIixcbiAgICBcIjEwOTAxXCI6IFwiZXFzbGFudGxlc3M7XCIsXG4gICAgXCIxMDkwMlwiOiBcImVxc2xhbnRndHI7XCIsXG4gICAgXCIxMDkwM1wiOiBcImVsc2RvdDtcIixcbiAgICBcIjEwOTA0XCI6IFwiZWdzZG90O1wiLFxuICAgIFwiMTA5MDVcIjogXCJlbDtcIixcbiAgICBcIjEwOTA2XCI6IFwiZWc7XCIsXG4gICAgXCIxMDkwOVwiOiBcInNpbWw7XCIsXG4gICAgXCIxMDkxMFwiOiBcInNpbWc7XCIsXG4gICAgXCIxMDkxMVwiOiBcInNpbWxFO1wiLFxuICAgIFwiMTA5MTJcIjogXCJzaW1nRTtcIixcbiAgICBcIjEwOTEzXCI6IFwiTGVzc0xlc3M7XCIsXG4gICAgXCIxMDkxNFwiOiBcIkdyZWF0ZXJHcmVhdGVyO1wiLFxuICAgIFwiMTA5MTZcIjogXCJnbGo7XCIsXG4gICAgXCIxMDkxN1wiOiBcImdsYTtcIixcbiAgICBcIjEwOTE4XCI6IFwibHRjYztcIixcbiAgICBcIjEwOTE5XCI6IFwiZ3RjYztcIixcbiAgICBcIjEwOTIwXCI6IFwibGVzY2M7XCIsXG4gICAgXCIxMDkyMVwiOiBcImdlc2NjO1wiLFxuICAgIFwiMTA5MjJcIjogXCJzbXQ7XCIsXG4gICAgXCIxMDkyM1wiOiBcImxhdDtcIixcbiAgICBcIjEwOTI0XCI6IFwic210ZTtcIixcbiAgICBcIjEwOTI1XCI6IFwibGF0ZTtcIixcbiAgICBcIjEwOTI2XCI6IFwiYnVtcEU7XCIsXG4gICAgXCIxMDkyN1wiOiBcInByZWNlcTtcIixcbiAgICBcIjEwOTI4XCI6IFwic3VjY2VxO1wiLFxuICAgIFwiMTA5MzFcIjogXCJwckU7XCIsXG4gICAgXCIxMDkzMlwiOiBcInNjRTtcIixcbiAgICBcIjEwOTMzXCI6IFwicHJuRTtcIixcbiAgICBcIjEwOTM0XCI6IFwic3VjY25lcXE7XCIsXG4gICAgXCIxMDkzNVwiOiBcInByZWNhcHByb3g7XCIsXG4gICAgXCIxMDkzNlwiOiBcInN1Y2NhcHByb3g7XCIsXG4gICAgXCIxMDkzN1wiOiBcInBybmFwO1wiLFxuICAgIFwiMTA5MzhcIjogXCJzdWNjbmFwcHJveDtcIixcbiAgICBcIjEwOTM5XCI6IFwiUHI7XCIsXG4gICAgXCIxMDk0MFwiOiBcIlNjO1wiLFxuICAgIFwiMTA5NDFcIjogXCJzdWJkb3Q7XCIsXG4gICAgXCIxMDk0MlwiOiBcInN1cGRvdDtcIixcbiAgICBcIjEwOTQzXCI6IFwic3VicGx1cztcIixcbiAgICBcIjEwOTQ0XCI6IFwic3VwcGx1cztcIixcbiAgICBcIjEwOTQ1XCI6IFwic3VibXVsdDtcIixcbiAgICBcIjEwOTQ2XCI6IFwic3VwbXVsdDtcIixcbiAgICBcIjEwOTQ3XCI6IFwic3ViZWRvdDtcIixcbiAgICBcIjEwOTQ4XCI6IFwic3VwZWRvdDtcIixcbiAgICBcIjEwOTQ5XCI6IFwic3Vic2V0ZXFxO1wiLFxuICAgIFwiMTA5NTBcIjogXCJzdXBzZXRlcXE7XCIsXG4gICAgXCIxMDk1MVwiOiBcInN1YnNpbTtcIixcbiAgICBcIjEwOTUyXCI6IFwic3Vwc2ltO1wiLFxuICAgIFwiMTA5NTVcIjogXCJzdWJzZXRuZXFxO1wiLFxuICAgIFwiMTA5NTZcIjogXCJzdXBzZXRuZXFxO1wiLFxuICAgIFwiMTA5NTlcIjogXCJjc3ViO1wiLFxuICAgIFwiMTA5NjBcIjogXCJjc3VwO1wiLFxuICAgIFwiMTA5NjFcIjogXCJjc3ViZTtcIixcbiAgICBcIjEwOTYyXCI6IFwiY3N1cGU7XCIsXG4gICAgXCIxMDk2M1wiOiBcInN1YnN1cDtcIixcbiAgICBcIjEwOTY0XCI6IFwic3Vwc3ViO1wiLFxuICAgIFwiMTA5NjVcIjogXCJzdWJzdWI7XCIsXG4gICAgXCIxMDk2NlwiOiBcInN1cHN1cDtcIixcbiAgICBcIjEwOTY3XCI6IFwic3VwaHN1YjtcIixcbiAgICBcIjEwOTY4XCI6IFwic3VwZHN1YjtcIixcbiAgICBcIjEwOTY5XCI6IFwiZm9ya3Y7XCIsXG4gICAgXCIxMDk3MFwiOiBcInRvcGZvcms7XCIsXG4gICAgXCIxMDk3MVwiOiBcIm1sY3A7XCIsXG4gICAgXCIxMDk4MFwiOiBcIkRvdWJsZUxlZnRUZWU7XCIsXG4gICAgXCIxMDk4MlwiOiBcIlZkYXNobDtcIixcbiAgICBcIjEwOTgzXCI6IFwiQmFydjtcIixcbiAgICBcIjEwOTg0XCI6IFwidkJhcjtcIixcbiAgICBcIjEwOTg1XCI6IFwidkJhcnY7XCIsXG4gICAgXCIxMDk4N1wiOiBcIlZiYXI7XCIsXG4gICAgXCIxMDk4OFwiOiBcIk5vdDtcIixcbiAgICBcIjEwOTg5XCI6IFwiYk5vdDtcIixcbiAgICBcIjEwOTkwXCI6IFwicm5taWQ7XCIsXG4gICAgXCIxMDk5MVwiOiBcImNpcm1pZDtcIixcbiAgICBcIjEwOTkyXCI6IFwibWlkY2lyO1wiLFxuICAgIFwiMTA5OTNcIjogXCJ0b3BjaXI7XCIsXG4gICAgXCIxMDk5NFwiOiBcIm5ocGFyO1wiLFxuICAgIFwiMTA5OTVcIjogXCJwYXJzaW07XCIsXG4gICAgXCIxMTAwNVwiOiBcInBhcnNsO1wiLFxuICAgIFwiNjQyNTZcIjogXCJmZmxpZztcIixcbiAgICBcIjY0MjU3XCI6IFwiZmlsaWc7XCIsXG4gICAgXCI2NDI1OFwiOiBcImZsbGlnO1wiLFxuICAgIFwiNjQyNTlcIjogXCJmZmlsaWc7XCIsXG4gICAgXCI2NDI2MFwiOiBcImZmbGxpZztcIlxufSIsIi8qXG5cblx0SGFzaGlkc1xuXHRodHRwOi8vaGFzaGlkcy5vcmcvbm9kZS1qc1xuXHQoYykgMjAxMyBJdmFuIEFraW1vdlxuXG5cdGh0dHBzOi8vZ2l0aHViLmNvbS9pdmFuYWtpbW92L2hhc2hpZHMubm9kZS5qc1xuXHRoYXNoaWRzIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4qL1xuXG4vKmpzbGludCBub2RlOiB0cnVlLCB3aGl0ZTogdHJ1ZSwgcGx1c3BsdXM6IHRydWUsIG5vbWVuOiB0cnVlICovXG5cblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBIYXNoaWRzKHNhbHQsIG1pbkhhc2hMZW5ndGgsIGFscGhhYmV0KSB7XG5cblx0dmFyIHVuaXF1ZUFscGhhYmV0LCBpLCBqLCBsZW4sIHNlcHNMZW5ndGgsIGRpZmYsIGd1YXJkQ291bnQ7XG5cblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIEhhc2hpZHMpKSB7XG5cdFx0cmV0dXJuIG5ldyBIYXNoaWRzKHNhbHQsIG1pbkhhc2hMZW5ndGgsIGFscGhhYmV0KTtcblx0fVxuXG5cdHRoaXMudmVyc2lvbiA9IFwiMS4wLjFcIjtcblxuXHQvKiBpbnRlcm5hbCBzZXR0aW5ncyAqL1xuXG5cdHRoaXMubWluQWxwaGFiZXRMZW5ndGggPSAxNjtcblx0dGhpcy5zZXBEaXYgPSAzLjU7XG5cdHRoaXMuZ3VhcmREaXYgPSAxMjtcblxuXHQvKiBlcnJvciBtZXNzYWdlcyAqL1xuXG5cdHRoaXMuZXJyb3JBbHBoYWJldExlbmd0aCA9IFwiZXJyb3I6IGFscGhhYmV0IG11c3QgY29udGFpbiBhdCBsZWFzdCBYIHVuaXF1ZSBjaGFyYWN0ZXJzXCI7XG5cdHRoaXMuZXJyb3JBbHBoYWJldFNwYWNlID0gXCJlcnJvcjogYWxwaGFiZXQgY2Fubm90IGNvbnRhaW4gc3BhY2VzXCI7XG5cblx0LyogYWxwaGFiZXQgdmFycyAqL1xuXG5cdHRoaXMuYWxwaGFiZXQgPSBcImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVoxMjM0NTY3ODkwXCI7XG5cdHRoaXMuc2VwcyA9IFwiY2ZoaXN0dUNGSElTVFVcIjtcblx0dGhpcy5taW5IYXNoTGVuZ3RoID0gcGFyc2VJbnQobWluSGFzaExlbmd0aCwgMTApID4gMCA/IG1pbkhhc2hMZW5ndGggOiAwO1xuXHR0aGlzLnNhbHQgPSAodHlwZW9mIHNhbHQgPT09IFwic3RyaW5nXCIpID8gc2FsdCA6IFwiXCI7XG5cblx0aWYgKHR5cGVvZiBhbHBoYWJldCA9PT0gXCJzdHJpbmdcIikge1xuXHRcdHRoaXMuYWxwaGFiZXQgPSBhbHBoYWJldDtcblx0fVxuXG5cdGZvciAodW5pcXVlQWxwaGFiZXQgPSBcIlwiLCBpID0gMCwgbGVuID0gdGhpcy5hbHBoYWJldC5sZW5ndGg7IGkgIT09IGxlbjsgaSsrKSB7XG5cdFx0aWYgKHVuaXF1ZUFscGhhYmV0LmluZGV4T2YodGhpcy5hbHBoYWJldFtpXSkgPT09IC0xKSB7XG5cdFx0XHR1bmlxdWVBbHBoYWJldCArPSB0aGlzLmFscGhhYmV0W2ldO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuYWxwaGFiZXQgPSB1bmlxdWVBbHBoYWJldDtcblxuXHRpZiAodGhpcy5hbHBoYWJldC5sZW5ndGggPCB0aGlzLm1pbkFscGhhYmV0TGVuZ3RoKSB7XG5cdFx0dGhyb3cgdGhpcy5lcnJvckFscGhhYmV0TGVuZ3RoLnJlcGxhY2UoXCJYXCIsIHRoaXMubWluQWxwaGFiZXRMZW5ndGgpO1xuXHR9XG5cblx0aWYgKHRoaXMuYWxwaGFiZXQuc2VhcmNoKFwiIFwiKSAhPT0gLTEpIHtcblx0XHR0aHJvdyB0aGlzLmVycm9yQWxwaGFiZXRTcGFjZTtcblx0fVxuXG5cdC8qIHNlcHMgc2hvdWxkIGNvbnRhaW4gb25seSBjaGFyYWN0ZXJzIHByZXNlbnQgaW4gYWxwaGFiZXQ7IGFscGhhYmV0IHNob3VsZCBub3QgY29udGFpbnMgc2VwcyAqL1xuXG5cdGZvciAoaSA9IDAsIGxlbiA9IHRoaXMuc2Vwcy5sZW5ndGg7IGkgIT09IGxlbjsgaSsrKSB7XG5cblx0XHRqID0gdGhpcy5hbHBoYWJldC5pbmRleE9mKHRoaXMuc2Vwc1tpXSk7XG5cdFx0aWYgKGogPT09IC0xKSB7XG5cdFx0XHR0aGlzLnNlcHMgPSB0aGlzLnNlcHMuc3Vic3RyKDAsIGkpICsgXCIgXCIgKyB0aGlzLnNlcHMuc3Vic3RyKGkgKyAxKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5hbHBoYWJldCA9IHRoaXMuYWxwaGFiZXQuc3Vic3RyKDAsIGopICsgXCIgXCIgKyB0aGlzLmFscGhhYmV0LnN1YnN0cihqICsgMSk7XG5cdFx0fVxuXG5cdH1cblxuXHR0aGlzLmFscGhhYmV0ID0gdGhpcy5hbHBoYWJldC5yZXBsYWNlKC8gL2csIFwiXCIpO1xuXG5cdHRoaXMuc2VwcyA9IHRoaXMuc2Vwcy5yZXBsYWNlKC8gL2csIFwiXCIpO1xuXHR0aGlzLnNlcHMgPSB0aGlzLmNvbnNpc3RlbnRTaHVmZmxlKHRoaXMuc2VwcywgdGhpcy5zYWx0KTtcblxuXHRpZiAoIXRoaXMuc2Vwcy5sZW5ndGggfHwgKHRoaXMuYWxwaGFiZXQubGVuZ3RoIC8gdGhpcy5zZXBzLmxlbmd0aCkgPiB0aGlzLnNlcERpdikge1xuXG5cdFx0c2Vwc0xlbmd0aCA9IE1hdGguY2VpbCh0aGlzLmFscGhhYmV0Lmxlbmd0aCAvIHRoaXMuc2VwRGl2KTtcblxuXHRcdGlmIChzZXBzTGVuZ3RoID09PSAxKSB7XG5cdFx0XHRzZXBzTGVuZ3RoKys7XG5cdFx0fVxuXG5cdFx0aWYgKHNlcHNMZW5ndGggPiB0aGlzLnNlcHMubGVuZ3RoKSB7XG5cblx0XHRcdGRpZmYgPSBzZXBzTGVuZ3RoIC0gdGhpcy5zZXBzLmxlbmd0aDtcblx0XHRcdHRoaXMuc2VwcyArPSB0aGlzLmFscGhhYmV0LnN1YnN0cigwLCBkaWZmKTtcblx0XHRcdHRoaXMuYWxwaGFiZXQgPSB0aGlzLmFscGhhYmV0LnN1YnN0cihkaWZmKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnNlcHMgPSB0aGlzLnNlcHMuc3Vic3RyKDAsIHNlcHNMZW5ndGgpO1xuXHRcdH1cblxuXHR9XG5cblx0dGhpcy5hbHBoYWJldCA9IHRoaXMuY29uc2lzdGVudFNodWZmbGUodGhpcy5hbHBoYWJldCwgdGhpcy5zYWx0KTtcblx0Z3VhcmRDb3VudCA9IE1hdGguY2VpbCh0aGlzLmFscGhhYmV0Lmxlbmd0aCAvIHRoaXMuZ3VhcmREaXYpO1xuXG5cdGlmICh0aGlzLmFscGhhYmV0Lmxlbmd0aCA8IDMpIHtcblx0XHR0aGlzLmd1YXJkcyA9IHRoaXMuc2Vwcy5zdWJzdHIoMCwgZ3VhcmRDb3VudCk7XG5cdFx0dGhpcy5zZXBzID0gdGhpcy5zZXBzLnN1YnN0cihndWFyZENvdW50KTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLmd1YXJkcyA9IHRoaXMuYWxwaGFiZXQuc3Vic3RyKDAsIGd1YXJkQ291bnQpO1xuXHRcdHRoaXMuYWxwaGFiZXQgPSB0aGlzLmFscGhhYmV0LnN1YnN0cihndWFyZENvdW50KTtcblx0fVxuXG59XG5cbkhhc2hpZHMucHJvdG90eXBlLmVuY29kZSA9IGZ1bmN0aW9uKCkge1xuXG5cdHZhciByZXQgPSBcIlwiLFxuXHRcdGksIGxlbixcblx0XHRudW1iZXJzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuXHRpZiAoIW51bWJlcnMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHJldDtcblx0fVxuXG5cdGlmIChudW1iZXJzWzBdIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRudW1iZXJzID0gbnVtYmVyc1swXTtcblx0fVxuXG5cdGZvciAoaSA9IDAsIGxlbiA9IG51bWJlcnMubGVuZ3RoOyBpICE9PSBsZW47IGkrKykge1xuXHRcdGlmICh0eXBlb2YgbnVtYmVyc1tpXSAhPT0gXCJudW1iZXJcIiB8fCBudW1iZXJzW2ldICUgMSAhPT0gMCB8fCBudW1iZXJzW2ldIDwgMCkge1xuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fZW5jb2RlKG51bWJlcnMpO1xuXG59O1xuXG5IYXNoaWRzLnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbihoYXNoKSB7XG5cblx0dmFyIHJldCA9IFtdO1xuXG5cdGlmICghaGFzaC5sZW5ndGggfHwgdHlwZW9mIGhhc2ggIT09IFwic3RyaW5nXCIpIHtcblx0XHRyZXR1cm4gcmV0O1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2RlY29kZShoYXNoLCB0aGlzLmFscGhhYmV0KTtcblxufTtcblxuSGFzaGlkcy5wcm90b3R5cGUuZW5jb2RlSGV4ID0gZnVuY3Rpb24oc3RyKSB7XG5cblx0dmFyIGksIGxlbiwgbnVtYmVycztcblxuXHRzdHIgPSBzdHIudG9TdHJpbmcoKTtcblx0aWYgKCEvXlswLTlhLWZBLUZdKyQvLnRlc3Qoc3RyKSkge1xuXHRcdHJldHVybiBcIlwiO1xuXHR9XG5cblx0bnVtYmVycyA9IHN0ci5tYXRjaCgvW1xcd1xcV117MSwxMn0vZyk7XG5cblx0Zm9yIChpID0gMCwgbGVuID0gbnVtYmVycy5sZW5ndGg7IGkgIT09IGxlbjsgaSsrKSB7XG5cdFx0bnVtYmVyc1tpXSA9IHBhcnNlSW50KFwiMVwiICsgbnVtYmVyc1tpXSwgMTYpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuZW5jb2RlLmFwcGx5KHRoaXMsIG51bWJlcnMpO1xuXG59O1xuXG5IYXNoaWRzLnByb3RvdHlwZS5kZWNvZGVIZXggPSBmdW5jdGlvbihoYXNoKSB7XG5cblx0dmFyIHJldCA9IFwiXCIsXG5cdFx0aSwgbGVuLFxuXHRcdG51bWJlcnMgPSB0aGlzLmRlY29kZShoYXNoKTtcblxuXHRmb3IgKGkgPSAwLCBsZW4gPSBudW1iZXJzLmxlbmd0aDsgaSAhPT0gbGVuOyBpKyspIHtcblx0XHRyZXQgKz0gKG51bWJlcnNbaV0pLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG5cdH1cblxuXHRyZXR1cm4gcmV0O1xuXG59O1xuXG5IYXNoaWRzLnByb3RvdHlwZS5fZW5jb2RlID0gZnVuY3Rpb24obnVtYmVycykge1xuXG5cdHZhciByZXQsIGxvdHRlcnksIGksIGxlbiwgbnVtYmVyLCBidWZmZXIsIGxhc3QsIHNlcHNJbmRleCwgZ3VhcmRJbmRleCwgZ3VhcmQsIGhhbGZMZW5ndGgsIGV4Y2Vzcyxcblx0XHRhbHBoYWJldCA9IHRoaXMuYWxwaGFiZXQsXG5cdFx0bnVtYmVyc1NpemUgPSBudW1iZXJzLmxlbmd0aCxcblx0XHRudW1iZXJzSGFzaEludCA9IDA7XG5cblx0Zm9yIChpID0gMCwgbGVuID0gbnVtYmVycy5sZW5ndGg7IGkgIT09IGxlbjsgaSsrKSB7XG5cdFx0bnVtYmVyc0hhc2hJbnQgKz0gKG51bWJlcnNbaV0gJSAoaSArIDEwMCkpO1xuXHR9XG5cblx0bG90dGVyeSA9IHJldCA9IGFscGhhYmV0W251bWJlcnNIYXNoSW50ICUgYWxwaGFiZXQubGVuZ3RoXTtcblx0Zm9yIChpID0gMCwgbGVuID0gbnVtYmVycy5sZW5ndGg7IGkgIT09IGxlbjsgaSsrKSB7XG5cblx0XHRudW1iZXIgPSBudW1iZXJzW2ldO1xuXHRcdGJ1ZmZlciA9IGxvdHRlcnkgKyB0aGlzLnNhbHQgKyBhbHBoYWJldDtcblxuXHRcdGFscGhhYmV0ID0gdGhpcy5jb25zaXN0ZW50U2h1ZmZsZShhbHBoYWJldCwgYnVmZmVyLnN1YnN0cigwLCBhbHBoYWJldC5sZW5ndGgpKTtcblx0XHRsYXN0ID0gdGhpcy5oYXNoKG51bWJlciwgYWxwaGFiZXQpO1xuXG5cdFx0cmV0ICs9IGxhc3Q7XG5cblx0XHRpZiAoaSArIDEgPCBudW1iZXJzU2l6ZSkge1xuXHRcdFx0bnVtYmVyICU9IChsYXN0LmNoYXJDb2RlQXQoMCkgKyBpKTtcblx0XHRcdHNlcHNJbmRleCA9IG51bWJlciAlIHRoaXMuc2Vwcy5sZW5ndGg7XG5cdFx0XHRyZXQgKz0gdGhpcy5zZXBzW3NlcHNJbmRleF07XG5cdFx0fVxuXG5cdH1cblxuXHRpZiAocmV0Lmxlbmd0aCA8IHRoaXMubWluSGFzaExlbmd0aCkge1xuXG5cdFx0Z3VhcmRJbmRleCA9IChudW1iZXJzSGFzaEludCArIHJldFswXS5jaGFyQ29kZUF0KDApKSAlIHRoaXMuZ3VhcmRzLmxlbmd0aDtcblx0XHRndWFyZCA9IHRoaXMuZ3VhcmRzW2d1YXJkSW5kZXhdO1xuXG5cdFx0cmV0ID0gZ3VhcmQgKyByZXQ7XG5cblx0XHRpZiAocmV0Lmxlbmd0aCA8IHRoaXMubWluSGFzaExlbmd0aCkge1xuXG5cdFx0XHRndWFyZEluZGV4ID0gKG51bWJlcnNIYXNoSW50ICsgcmV0WzJdLmNoYXJDb2RlQXQoMCkpICUgdGhpcy5ndWFyZHMubGVuZ3RoO1xuXHRcdFx0Z3VhcmQgPSB0aGlzLmd1YXJkc1tndWFyZEluZGV4XTtcblxuXHRcdFx0cmV0ICs9IGd1YXJkO1xuXG5cdFx0fVxuXG5cdH1cblxuXHRoYWxmTGVuZ3RoID0gcGFyc2VJbnQoYWxwaGFiZXQubGVuZ3RoIC8gMiwgMTApO1xuXHR3aGlsZSAocmV0Lmxlbmd0aCA8IHRoaXMubWluSGFzaExlbmd0aCkge1xuXG5cdFx0YWxwaGFiZXQgPSB0aGlzLmNvbnNpc3RlbnRTaHVmZmxlKGFscGhhYmV0LCBhbHBoYWJldCk7XG5cdFx0cmV0ID0gYWxwaGFiZXQuc3Vic3RyKGhhbGZMZW5ndGgpICsgcmV0ICsgYWxwaGFiZXQuc3Vic3RyKDAsIGhhbGZMZW5ndGgpO1xuXG5cdFx0ZXhjZXNzID0gcmV0Lmxlbmd0aCAtIHRoaXMubWluSGFzaExlbmd0aDtcblx0XHRpZiAoZXhjZXNzID4gMCkge1xuXHRcdFx0cmV0ID0gcmV0LnN1YnN0cihleGNlc3MgLyAyLCB0aGlzLm1pbkhhc2hMZW5ndGgpO1xuXHRcdH1cblxuXHR9XG5cblx0cmV0dXJuIHJldDtcblxufTtcblxuSGFzaGlkcy5wcm90b3R5cGUuX2RlY29kZSA9IGZ1bmN0aW9uKGhhc2gsIGFscGhhYmV0KSB7XG5cblx0dmFyIHJldCA9IFtdLFxuXHRcdGkgPSAwLFxuXHRcdGxvdHRlcnksIGxlbiwgc3ViSGFzaCwgYnVmZmVyLFxuXHRcdHIgPSBuZXcgUmVnRXhwKFwiW1wiICsgdGhpcy5ndWFyZHMgKyBcIl1cIiwgXCJnXCIpLFxuXHRcdGhhc2hCcmVha2Rvd24gPSBoYXNoLnJlcGxhY2UociwgXCIgXCIpLFxuXHRcdGhhc2hBcnJheSA9IGhhc2hCcmVha2Rvd24uc3BsaXQoXCIgXCIpO1xuXG5cdGlmIChoYXNoQXJyYXkubGVuZ3RoID09PSAzIHx8IGhhc2hBcnJheS5sZW5ndGggPT09IDIpIHtcblx0XHRpID0gMTtcblx0fVxuXG5cdGhhc2hCcmVha2Rvd24gPSBoYXNoQXJyYXlbaV07XG5cdGlmICh0eXBlb2YgaGFzaEJyZWFrZG93blswXSAhPT0gXCJ1bmRlZmluZWRcIikge1xuXG5cdFx0bG90dGVyeSA9IGhhc2hCcmVha2Rvd25bMF07XG5cdFx0aGFzaEJyZWFrZG93biA9IGhhc2hCcmVha2Rvd24uc3Vic3RyKDEpO1xuXG5cdFx0ciA9IG5ldyBSZWdFeHAoXCJbXCIgKyB0aGlzLnNlcHMgKyBcIl1cIiwgXCJnXCIpO1xuXHRcdGhhc2hCcmVha2Rvd24gPSBoYXNoQnJlYWtkb3duLnJlcGxhY2UociwgXCIgXCIpO1xuXHRcdGhhc2hBcnJheSA9IGhhc2hCcmVha2Rvd24uc3BsaXQoXCIgXCIpO1xuXG5cdFx0Zm9yIChpID0gMCwgbGVuID0gaGFzaEFycmF5Lmxlbmd0aDsgaSAhPT0gbGVuOyBpKyspIHtcblxuXHRcdFx0c3ViSGFzaCA9IGhhc2hBcnJheVtpXTtcblx0XHRcdGJ1ZmZlciA9IGxvdHRlcnkgKyB0aGlzLnNhbHQgKyBhbHBoYWJldDtcblxuXHRcdFx0YWxwaGFiZXQgPSB0aGlzLmNvbnNpc3RlbnRTaHVmZmxlKGFscGhhYmV0LCBidWZmZXIuc3Vic3RyKDAsIGFscGhhYmV0Lmxlbmd0aCkpO1xuXHRcdFx0cmV0LnB1c2godGhpcy51bmhhc2goc3ViSGFzaCwgYWxwaGFiZXQpKTtcblxuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9lbmNvZGUocmV0KSAhPT0gaGFzaCkge1xuXHRcdFx0cmV0ID0gW107XG5cdFx0fVxuXG5cdH1cblxuXHRyZXR1cm4gcmV0O1xuXG59O1xuXG5IYXNoaWRzLnByb3RvdHlwZS5jb25zaXN0ZW50U2h1ZmZsZSA9IGZ1bmN0aW9uKGFscGhhYmV0LCBzYWx0KSB7XG5cblx0dmFyIGludGVnZXIsIGosIHRlbXAsIGksIHYsIHA7XG5cblx0aWYgKCFzYWx0Lmxlbmd0aCkge1xuXHRcdHJldHVybiBhbHBoYWJldDtcblx0fVxuXG5cdGZvciAoaSA9IGFscGhhYmV0Lmxlbmd0aCAtIDEsIHYgPSAwLCBwID0gMDsgaSA+IDA7IGktLSwgdisrKSB7XG5cblx0XHR2ICU9IHNhbHQubGVuZ3RoO1xuXHRcdHAgKz0gaW50ZWdlciA9IHNhbHRbdl0uY2hhckNvZGVBdCgwKTtcblx0XHRqID0gKGludGVnZXIgKyB2ICsgcCkgJSBpO1xuXG5cdFx0dGVtcCA9IGFscGhhYmV0W2pdO1xuXHRcdGFscGhhYmV0ID0gYWxwaGFiZXQuc3Vic3RyKDAsIGopICsgYWxwaGFiZXRbaV0gKyBhbHBoYWJldC5zdWJzdHIoaiArIDEpO1xuXHRcdGFscGhhYmV0ID0gYWxwaGFiZXQuc3Vic3RyKDAsIGkpICsgdGVtcCArIGFscGhhYmV0LnN1YnN0cihpICsgMSk7XG5cblx0fVxuXG5cdHJldHVybiBhbHBoYWJldDtcblxufTtcblxuSGFzaGlkcy5wcm90b3R5cGUuaGFzaCA9IGZ1bmN0aW9uKGlucHV0LCBhbHBoYWJldCkge1xuXG5cdHZhciBoYXNoID0gXCJcIixcblx0XHRhbHBoYWJldExlbmd0aCA9IGFscGhhYmV0Lmxlbmd0aDtcblxuXHRkbyB7XG5cdFx0aGFzaCA9IGFscGhhYmV0W2lucHV0ICUgYWxwaGFiZXRMZW5ndGhdICsgaGFzaDtcblx0XHRpbnB1dCA9IHBhcnNlSW50KGlucHV0IC8gYWxwaGFiZXRMZW5ndGgsIDEwKTtcblx0fSB3aGlsZSAoaW5wdXQpO1xuXG5cdHJldHVybiBoYXNoO1xuXG59O1xuXG5IYXNoaWRzLnByb3RvdHlwZS51bmhhc2ggPSBmdW5jdGlvbihpbnB1dCwgYWxwaGFiZXQpIHtcblxuXHR2YXIgbnVtYmVyID0gMCwgcG9zLCBpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuXHRcdHBvcyA9IGFscGhhYmV0LmluZGV4T2YoaW5wdXRbaV0pO1xuXHRcdG51bWJlciArPSBwb3MgKiBNYXRoLnBvdyhhbHBoYWJldC5sZW5ndGgsIGlucHV0Lmxlbmd0aCAtIGkgLSAxKTtcblx0fVxuXG5cdHJldHVybiBudW1iZXI7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGFzaGlkcztcbiIsIkFuYWx5dGljcyAgICA9IHJlcXVpcmUgJy4vdXRpbHMvQW5hbHl0aWNzJ1xuQXV0aE1hbmFnZXIgID0gcmVxdWlyZSAnLi91dGlscy9BdXRoTWFuYWdlcidcblNoYXJlICAgICAgICA9IHJlcXVpcmUgJy4vdXRpbHMvU2hhcmUnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi91dGlscy9Hb29nbGVQbHVzJ1xuVGVtcGxhdGVzICAgID0gcmVxdWlyZSAnLi9kYXRhL1RlbXBsYXRlcydcbkxvY2FsZSAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9Mb2NhbGUnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9Sb3V0ZXInXG5OYXYgICAgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9OYXYnXG5BcHBEYXRhICAgICAgPSByZXF1aXJlICcuL0FwcERhdGEnXG5BcHBWaWV3ICAgICAgPSByZXF1aXJlICcuL0FwcFZpZXcnXG5NZWRpYVF1ZXJpZXMgPSByZXF1aXJlICcuL3V0aWxzL01lZGlhUXVlcmllcydcblxuY2xhc3MgQXBwXG5cbiAgICBMSVZFICAgICAgIDogbnVsbFxuICAgIEJBU0VfVVJMICAgOiB3aW5kb3cuY29uZmlnLmhvc3RuYW1lXG4gICAgbG9jYWxlQ29kZSA6IHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuICAgIG9ialJlYWR5ICAgOiAwXG5cbiAgICBfdG9DbGVhbiAgIDogWydvYmpSZWFkeScsICdzZXRGbGFncycsICdvYmplY3RDb21wbGV0ZScsICdpbml0JywgJ2luaXRPYmplY3RzJywgJ2luaXRTREtzJywgJ2luaXRBcHAnLCAnZ28nLCAnY2xlYW51cCcsICdfdG9DbGVhbiddXG5cbiAgICBjb25zdHJ1Y3RvciA6IChATElWRSkgLT5cblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgc2V0RmxhZ3MgOiA9PlxuXG4gICAgICAgIHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5zZXR1cCgpO1xuXG4gICAgICAgIEBJU19BTkRST0lEICAgID0gdWEuaW5kZXhPZignYW5kcm9pZCcpID4gLTFcbiAgICAgICAgQElTX0ZJUkVGT1ggICAgPSB1YS5pbmRleE9mKCdmaXJlZm94JykgPiAtMVxuICAgICAgICBASVNfQ0hST01FX0lPUyA9IGlmIHVhLm1hdGNoKCdjcmlvcycpIHRoZW4gdHJ1ZSBlbHNlIGZhbHNlICMgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTM4MDgwNTNcblxuICAgICAgICBudWxsXG5cbiAgICBpc01vYmlsZSA6ID0+XG5cbiAgICAgICAgcmV0dXJuIEBJU19JT1Mgb3IgQElTX0FORFJPSURcblxuICAgIG9iamVjdENvbXBsZXRlIDogPT5cblxuICAgICAgICBAb2JqUmVhZHkrK1xuICAgICAgICBAaW5pdEFwcCgpIGlmIEBvYmpSZWFkeSA+PSA0XG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdCA6ID0+XG5cbiAgICAgICAgQGluaXRPYmplY3RzKClcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0T2JqZWN0cyA6ID0+XG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXMgXCIvZGF0YS90ZW1wbGF0ZXMjeyhpZiBATElWRSB0aGVuICcubWluJyBlbHNlICcnKX0ueG1sXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAbG9jYWxlICAgID0gbmV3IExvY2FsZSBcIi9kYXRhL2xvY2FsZXMvc3RyaW5ncy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYW5hbHl0aWNzID0gbmV3IEFuYWx5dGljcyBcIi9kYXRhL3RyYWNraW5nLmpzb25cIiwgQG9iamVjdENvbXBsZXRlXG4gICAgICAgIEBhcHBEYXRhICAgPSBuZXcgQXBwRGF0YSBAb2JqZWN0Q29tcGxldGVcblxuICAgICAgICAjIGlmIG5ldyBvYmplY3RzIGFyZSBhZGRlZCBkb24ndCBmb3JnZXQgdG8gY2hhbmdlIHRoZSBgQG9iamVjdENvbXBsZXRlYCBmdW5jdGlvblxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXRTREtzIDogPT5cblxuICAgICAgICBGYWNlYm9vay5sb2FkKClcbiAgICAgICAgR29vZ2xlUGx1cy5sb2FkKClcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0QXBwIDogPT5cblxuICAgICAgICBAc2V0RmxhZ3MoKVxuXG4gICAgICAgICMjIyBTdGFydHMgYXBwbGljYXRpb24gIyMjXG4gICAgICAgIEBhcHBWaWV3ID0gbmV3IEFwcFZpZXdcbiAgICAgICAgQHJvdXRlciAgPSBuZXcgUm91dGVyXG4gICAgICAgIEBuYXYgICAgID0gbmV3IE5hdlxuICAgICAgICBAYXV0aCAgICA9IG5ldyBBdXRoTWFuYWdlclxuICAgICAgICBAc2hhcmUgICA9IG5ldyBTaGFyZVxuXG4gICAgICAgIEBnbygpXG5cbiAgICAgICAgQGluaXRTREtzKClcblxuICAgICAgICBudWxsXG5cbiAgICBnbyA6ID0+XG5cbiAgICAgICAgIyMjIEFmdGVyIGV2ZXJ5dGhpbmcgaXMgbG9hZGVkLCBraWNrcyBvZmYgd2Vic2l0ZSAjIyNcbiAgICAgICAgQGFwcFZpZXcucmVuZGVyKClcblxuICAgICAgICAjIyMgcmVtb3ZlIHJlZHVuZGFudCBpbml0aWFsaXNhdGlvbiBtZXRob2RzIC8gcHJvcGVydGllcyAjIyNcbiAgICAgICAgQGNsZWFudXAoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGNsZWFudXAgOiA9PlxuXG4gICAgICAgIGZvciBmbiBpbiBAX3RvQ2xlYW5cbiAgICAgICAgICAgIEBbZm5dID0gbnVsbFxuICAgICAgICAgICAgZGVsZXRlIEBbZm5dXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxuIiwiQWJzdHJhY3REYXRhICAgICAgPSByZXF1aXJlICcuL2RhdGEvQWJzdHJhY3REYXRhJ1xuUmVxdWVzdGVyICAgICAgICAgPSByZXF1aXJlICcuL3V0aWxzL1JlcXVlc3RlcidcbkFQSSAgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0FQSSdcbkRvb2RsZXNDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi9jb2xsZWN0aW9ucy9kb29kbGVzL0Rvb2RsZXNDb2xsZWN0aW9uJ1xuXG5jbGFzcyBBcHBEYXRhIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cbiAgICBjYWxsYmFjayA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKEBjYWxsYmFjaykgLT5cblxuICAgICAgICAjIyNcblxuICAgICAgICBhZGQgYWxsIGRhdGEgY2xhc3NlcyBoZXJlXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIEBkb29kbGVzID0gbmV3IERvb2RsZXNDb2xsZWN0aW9uXG5cbiAgICAgICAgQGdldFN0YXJ0RGF0YSgpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgICMjI1xuICAgIGdldCBhcHAgYm9vdHN0cmFwIGRhdGEgLSBlbWJlZCBpbiBIVE1MIG9yIEFQSSBlbmRwb2ludFxuICAgICMjI1xuICAgIGdldFN0YXJ0RGF0YSA6ID0+XG4gICAgICAgIFxuICAgICAgICAjIGlmIEFQSS5nZXQoJ3N0YXJ0JylcbiAgICAgICAgaWYgdHJ1ZVxuXG4gICAgICAgICAgICByID0gUmVxdWVzdGVyLnJlcXVlc3RcbiAgICAgICAgICAgICAgICAjIHVybCAgOiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgICAgICAgICAgdXJsICA6IEBDRCgpLkJBU0VfVVJMICsgJy9kYXRhL19EVU1NWS9kb29kbGVzLmpzb24nXG4gICAgICAgICAgICAgICAgdHlwZSA6ICdHRVQnXG5cbiAgICAgICAgICAgIHIuZG9uZSBAb25TdGFydERhdGFSZWNlaXZlZFxuICAgICAgICAgICAgci5mYWlsID0+XG5cbiAgICAgICAgICAgICAgICAjIGNvbnNvbGUuZXJyb3IgXCJlcnJvciBsb2FkaW5nIGFwaSBzdGFydCBkYXRhXCJcblxuICAgICAgICAgICAgICAgICMjI1xuICAgICAgICAgICAgICAgIHRoaXMgaXMgb25seSB0ZW1wb3JhcnksIHdoaWxlIHRoZXJlIGlzIG5vIGJvb3RzdHJhcCBkYXRhIGhlcmUsIG5vcm1hbGx5IHdvdWxkIGhhbmRsZSBlcnJvciAvIGZhaWxcbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uU3RhcnREYXRhUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIm9uU3RhcnREYXRhUmVjZWl2ZWQgOiAoZGF0YSkgPT5cIiwgZGF0YVxuXG4gICAgICAgIHRvQWRkID0gW11cbiAgICAgICAgKHRvQWRkID0gdG9BZGQuY29uY2F0IGRhdGEuZG9vZGxlcykgZm9yIGkgaW4gWzAuLi41XVxuXG4gICAgICAgIEBkb29kbGVzLmFkZCB0b0FkZFxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJvb3RzdHJhcCBkYXRhIHJlY2VpdmVkLCBhcHAgcmVhZHkgdG8gZ29cblxuICAgICAgICAjIyNcblxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwRGF0YVxuIiwiQWJzdHJhY3RWaWV3ICAgICA9IHJlcXVpcmUgJy4vdmlldy9BYnN0cmFjdFZpZXcnXG5QcmVsb2FkZXIgICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUHJlbG9hZGVyJ1xuSGVhZGVyICAgICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0hlYWRlcidcbldyYXBwZXIgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9XcmFwcGVyJ1xuRm9vdGVyICAgICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0Zvb3RlcidcblBhZ2VUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9QYWdlVHJhbnNpdGlvbmVyJ1xuTW9kYWxNYW5hZ2VyICAgICA9IHJlcXVpcmUgJy4vdmlldy9tb2RhbHMvX01vZGFsTWFuYWdlcidcblxuY2xhc3MgQXBwVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnbWFpbidcblxuICAgICR3aW5kb3cgIDogbnVsbFxuICAgICRib2R5ICAgIDogbnVsbFxuXG4gICAgd3JhcHBlciAgOiBudWxsXG4gICAgZm9vdGVyICAgOiBudWxsXG5cbiAgICBkaW1zIDpcbiAgICAgICAgdyA6IG51bGxcbiAgICAgICAgaCA6IG51bGxcbiAgICAgICAgbyA6IG51bGxcbiAgICAgICAgdXBkYXRlTW9iaWxlIDogdHJ1ZVxuICAgICAgICBsYXN0SGVpZ2h0ICAgOiBudWxsXG5cbiAgICBsYXN0U2Nyb2xsWSA6IDBcbiAgICB0aWNraW5nICAgICA6IGZhbHNlXG5cbiAgICBFVkVOVF9VUERBVEVfRElNRU5TSU9OUyA6ICdFVkVOVF9VUERBVEVfRElNRU5TSU9OUydcbiAgICBFVkVOVF9QUkVMT0FERVJfSElERSAgICA6ICdFVkVOVF9QUkVMT0FERVJfSElERSdcbiAgICBFVkVOVF9PTl9TQ1JPTEwgICAgICAgICA6ICdFVkVOVF9PTl9TQ1JPTEwnXG5cbiAgICBNT0JJTEVfV0lEVEggOiA3MDBcbiAgICBNT0JJTEUgICAgICAgOiAnbW9iaWxlJ1xuICAgIE5PTl9NT0JJTEUgICA6ICdub25fbW9iaWxlJ1xuXG4gICAgY29uc3RydWN0b3IgOiAtPlxuXG4gICAgICAgIEAkd2luZG93ID0gJCh3aW5kb3cpXG4gICAgICAgIEAkYm9keSAgID0gJCgnYm9keScpLmVxKDApXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgZGlzYWJsZVRvdWNoOiA9PlxuXG4gICAgICAgIEAkd2luZG93Lm9uICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcblxuICAgICAgICBudWxsXG5cbiAgICBlbmFibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vZmYgJ3RvdWNobW92ZScsIEBvblRvdWNoTW92ZVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uVG91Y2hNb3ZlOiAoIGUgKSAtPlxuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIHJlbmRlciA6ID0+XG5cbiAgICAgICAgQGJpbmRFdmVudHMoKVxuXG4gICAgICAgIEBwcmVsb2FkZXIgICAgPSBuZXcgUHJlbG9hZGVyXG4gICAgICAgIEBtb2RhbE1hbmFnZXIgPSBuZXcgTW9kYWxNYW5hZ2VyXG5cbiAgICAgICAgQGhlYWRlciAgICAgICA9IG5ldyBIZWFkZXJcbiAgICAgICAgQHdyYXBwZXIgICAgICA9IG5ldyBXcmFwcGVyXG4gICAgICAgIEBmb290ZXIgICAgICAgPSBuZXcgRm9vdGVyXG4gICAgICAgIEB0cmFuc2l0aW9uZXIgPSBuZXcgUGFnZVRyYW5zaXRpb25lclxuXG4gICAgICAgIEBcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAaGVhZGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQHdyYXBwZXJcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAZm9vdGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQHRyYW5zaXRpb25lclxuXG4gICAgICAgIEBvbkFsbFJlbmRlcmVkKClcblxuICAgICAgICBudWxsXG5cbiAgICBiaW5kRXZlbnRzIDogPT5cblxuICAgICAgICBAb24gJ2FsbFJlbmRlcmVkJywgQG9uQWxsUmVuZGVyZWRcblxuICAgICAgICBAb25SZXNpemUoKVxuXG4gICAgICAgIEBvblJlc2l6ZSA9IF8uZGVib3VuY2UgQG9uUmVzaXplLCAzMDBcbiAgICAgICAgQCR3aW5kb3cub24gJ3Jlc2l6ZSBvcmllbnRhdGlvbmNoYW5nZScsIEBvblJlc2l6ZVxuICAgICAgICBAJHdpbmRvdy5vbiBcInNjcm9sbFwiLCBAb25TY3JvbGxcblxuICAgICAgICBAJGJvZHkub24gJ2NsaWNrJywgJ2EnLCBAbGlua01hbmFnZXJcblxuICAgICAgICBudWxsXG5cbiAgICBvblNjcm9sbCA6ID0+XG5cbiAgICAgICAgQGxhc3RTY3JvbGxZID0gd2luZG93LnNjcm9sbFlcbiAgICAgICAgQHJlcXVlc3RUaWNrKClcblxuICAgICAgICBudWxsXG5cbiAgICByZXF1ZXN0VGljayA6ID0+XG5cbiAgICAgICAgaWYgIUB0aWNraW5nXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgQHNjcm9sbFVwZGF0ZVxuICAgICAgICAgICAgQHRpY2tpbmcgPSB0cnVlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2Nyb2xsVXBkYXRlIDogPT5cblxuICAgICAgICBAdGlja2luZyA9IGZhbHNlXG5cbiAgICAgICAgQCRib2R5LmFkZENsYXNzKCdkaXNhYmxlLWhvdmVyJylcblxuICAgICAgICBjbGVhclRpbWVvdXQgQHRpbWVyU2Nyb2xsXG5cbiAgICAgICAgQHRpbWVyU2Nyb2xsID0gc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgQCRib2R5LnJlbW92ZUNsYXNzKCdkaXNhYmxlLWhvdmVyJylcbiAgICAgICAgLCA1MFxuXG4gICAgICAgIEB0cmlnZ2VyIEBFVkVOVF9PTl9TQ1JPTExcblxuICAgICAgICBudWxsXG5cbiAgICBvbkFsbFJlbmRlcmVkIDogPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwib25BbGxSZW5kZXJlZCA6ID0+XCJcblxuICAgICAgICBAJGJvZHkucHJlcGVuZCBAJGVsXG5cbiAgICAgICAgQHByZWxvYWRlci5wbGF5SW50cm9BbmltYXRpb24gPT4gQHRyaWdnZXIgQEVWRU5UX1BSRUxPQURFUl9ISURFXG5cbiAgICAgICAgQGJlZ2luKClcblxuICAgICAgICBudWxsXG5cbiAgICBiZWdpbiA6ID0+XG5cbiAgICAgICAgQHRyaWdnZXIgJ3N0YXJ0J1xuXG4gICAgICAgIEBDRCgpLnJvdXRlci5zdGFydCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25SZXNpemUgOiA9PlxuXG4gICAgICAgIEBnZXREaW1zKClcblxuICAgICAgICBudWxsXG5cbiAgICBnZXREaW1zIDogPT5cblxuICAgICAgICB3ID0gd2luZG93LmlubmVyV2lkdGggb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIG9yIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgICAgICAgaCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0XG5cbiAgICAgICAgY2hhbmdlID0gaCAvIEBkaW1zLmxhc3RIZWlnaHRcblxuICAgICAgICBAZGltcyA9XG4gICAgICAgICAgICB3IDogd1xuICAgICAgICAgICAgaCA6IGhcbiAgICAgICAgICAgIG8gOiBpZiBoID4gdyB0aGVuICdwb3J0cmFpdCcgZWxzZSAnbGFuZHNjYXBlJ1xuICAgICAgICAgICAgdXBkYXRlTW9iaWxlIDogIUBDRCgpLmlzTW9iaWxlKCkgb3IgY2hhbmdlIDwgMC44IG9yIGNoYW5nZSA+IDEuMlxuICAgICAgICAgICAgbGFzdEhlaWdodCAgIDogaFxuXG4gICAgICAgIEB0cmlnZ2VyIEBFVkVOVF9VUERBVEVfRElNRU5TSU9OUywgQGRpbXNcblxuICAgICAgICBudWxsXG5cbiAgICBsaW5rTWFuYWdlciA6IChlKSA9PlxuXG4gICAgICAgIGhyZWYgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaHJlZicpXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBocmVmXG5cbiAgICAgICAgQG5hdmlnYXRlVG9VcmwgaHJlZiwgZVxuXG4gICAgICAgIG51bGxcblxuICAgIG5hdmlnYXRlVG9VcmwgOiAoIGhyZWYsIGUgPSBudWxsICkgPT5cblxuICAgICAgICByb3V0ZSAgID0gaWYgaHJlZi5tYXRjaChAQ0QoKS5CQVNFX1VSTCkgdGhlbiBocmVmLnNwbGl0KEBDRCgpLkJBU0VfVVJMKVsxXSBlbHNlIGhyZWZcbiAgICAgICAgc2VjdGlvbiA9IGlmIHJvdXRlLmNoYXJBdCgwKSBpcyAnLycgdGhlbiByb3V0ZS5zcGxpdCgnLycpWzFdLnNwbGl0KCcvJylbMF0gZWxzZSByb3V0ZS5zcGxpdCgnLycpWzBdXG5cbiAgICAgICAgaWYgQENEKCkubmF2LmdldFNlY3Rpb24gc2VjdGlvblxuICAgICAgICAgICAgZT8ucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgQENEKCkucm91dGVyLm5hdmlnYXRlVG8gcm91dGVcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIEBoYW5kbGVFeHRlcm5hbExpbmsgaHJlZlxuXG4gICAgICAgIG51bGxcblxuICAgIGhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PlxuXG4gICAgICAgIGNvbnNvbGUubG9nIFwiaGFuZGxlRXh0ZXJuYWxMaW5rIDogKGRhdGEpID0+IFwiXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYmluZCB0cmFja2luZyBldmVudHMgaWYgbmVjZXNzYXJ5XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXdcbiIsImNsYXNzIEFic3RyYWN0Q29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb25cblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RDb2xsZWN0aW9uXG4iLCJBYnN0cmFjdENvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9BYnN0cmFjdENvbGxlY3Rpb24nXG5Db250cmlidXRvck1vZGVsICAgPSByZXF1aXJlICcuLi8uLi9tb2RlbHMvY29udHJpYnV0b3IvQ29udHJpYnV0b3JNb2RlbCdcblxuY2xhc3MgQ29udHJpYnV0b3JzQ29sbGVjdGlvbiBleHRlbmRzIEFic3RyYWN0Q29sbGVjdGlvblxuXG5cdG1vZGVsIDogQ29udHJpYnV0b3JNb2RlbFxuXG5cdGdldEFib3V0SFRNTCA6ID0+XG5cblx0XHRwZWVwcyA9IFtdXG5cblx0XHQocGVlcHMucHVzaCBtb2RlbC5nZXQoJ2h0bWwnKSkgZm9yIG1vZGVsIGluIEBtb2RlbHNcblxuXHRcdHBlZXBzLmpvaW4oJyBcXFxcICcpXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0b3JzQ29sbGVjdGlvblxuIiwiVGVtcGxhdGVNb2RlbCA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5cbmNsYXNzIFRlbXBsYXRlc0NvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0bW9kZWwgOiBUZW1wbGF0ZU1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzQ29sbGVjdGlvblxuIiwiQWJzdHJhY3RDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RDb2xsZWN0aW9uJ1xuRG9vZGxlTW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2Rvb2RsZS9Eb29kbGVNb2RlbCdcblxuY2xhc3MgRG9vZGxlc0NvbGxlY3Rpb24gZXh0ZW5kcyBBYnN0cmFjdENvbGxlY3Rpb25cblxuXHRtb2RlbCA6IERvb2RsZU1vZGVsXG5cblx0Z2V0RG9vZGxlQnlTbHVnIDogKHNsdWcpID0+XG5cblx0XHRkb29kbGUgPSBAZmluZFdoZXJlIHNsdWcgOiBzbHVnXG5cblx0XHRpZiAhZG9vZGxlXG5cdFx0XHRjb25zb2xlLmxvZyBcInkgdSBubyBkb29kbGU/XCJcblxuXHRcdHJldHVybiBkb29kbGVcblxuXHRnZXREb29kbGVCeU5hdlNlY3Rpb24gOiAod2hpY2hTZWN0aW9uKSA9PlxuXG5cdFx0c2VjdGlvbiA9IEBDRCgpLm5hdlt3aGljaFNlY3Rpb25dXG5cblx0XHRkb29kbGUgPSBAZmluZFdoZXJlIHNsdWcgOiBcIiN7c2VjdGlvbi5zdWJ9LyN7c2VjdGlvbi50ZXJ9XCJcblxuXHRcdGRvb2RsZVxuXG5cdGdldFByZXZEb29kbGUgOiAoZG9vZGxlKSA9PlxuXG5cdFx0aW5kZXggPSBAaW5kZXhPZiBkb29kbGVcblx0XHRpbmRleC0tXG5cblx0XHRpZiBpbmRleCA8IDBcblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdGVsc2Vcblx0XHRcdHJldHVybiBAYXQgaW5kZXhcblxuXHRnZXROZXh0RG9vZGxlIDogKGRvb2RsZSkgPT5cblxuXHRcdGluZGV4ID0gQGluZGV4T2YgZG9vZGxlXG5cdFx0aW5kZXgrK1xuXG5cdFx0aWYgaW5kZXggPiAoQGxlbmd0aC5sZW5ndGgtMSlcblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdGVsc2Vcblx0XHRcdHJldHVybiBAYXQgaW5kZXhcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVzQ29sbGVjdGlvblxuIiwiQ29sb3JzID1cblxuXHRDRF9SRUQgICAgOiAnI0VCNDIzRSdcblx0Q0RfQkxVRSAgIDogJyMzOTVDQUEnXG5cdENEX0JMQUNLICA6ICcjMTExMTExJ1xuXHRPRkZfV0hJVEUgOiAnI0YxRjFGMydcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcnNcbiIsIkFQSVJvdXRlTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsJ1xuXG5jbGFzcyBBUElcblxuXHRAbW9kZWwgOiBuZXcgQVBJUm91dGVNb2RlbFxuXG5cdEBnZXRDb250YW50cyA6ID0+XG5cblx0XHQjIyMgYWRkIG1vcmUgaWYgd2Ugd2FubmEgdXNlIGluIEFQSSBzdHJpbmdzICMjI1xuXHRcdEJBU0VfVVJMIDogQENEKCkuQkFTRV9VUkxcblxuXHRAZ2V0IDogKG5hbWUsIHZhcnMpID0+XG5cblx0XHR2YXJzID0gJC5leHRlbmQgdHJ1ZSwgdmFycywgQGdldENvbnRhbnRzKClcblx0XHRyZXR1cm4gQHN1cHBsYW50U3RyaW5nIEBtb2RlbC5nZXQobmFtZSksIHZhcnNcblxuXHRAc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdIG9yIGlmIHR5cGVvZiB2YWxzW2JdIGlzICdudW1iZXInIHRoZW4gdmFsc1tiXS50b1N0cmluZygpIGVsc2UgJydcblx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBUElcbiIsImNsYXNzIEFic3RyYWN0RGF0YVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdF8uZXh0ZW5kIEAsIEJhY2tib25lLkV2ZW50c1xuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3REYXRhXG4iLCJMb2NhbGVzTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwnXG5BUEkgICAgICAgICAgPSByZXF1aXJlICcuLi9kYXRhL0FQSSdcblxuIyMjXG4jIExvY2FsZSBMb2FkZXIgI1xuXG5GaXJlcyBiYWNrIGFuIGV2ZW50IHdoZW4gY29tcGxldGVcblxuIyMjXG5jbGFzcyBMb2NhbGVcblxuICAgIGxhbmcgICAgIDogbnVsbFxuICAgIGRhdGEgICAgIDogbnVsbFxuICAgIGNhbGxiYWNrIDogbnVsbFxuICAgIGJhY2t1cCAgIDogbnVsbFxuICAgIGRlZmF1bHQgIDogJ2VuLWdiJ1xuXG4gICAgY29uc3RydWN0b3IgOiAoZGF0YSwgY2IpIC0+XG5cbiAgICAgICAgIyMjIHN0YXJ0IExvY2FsZSBMb2FkZXIsIGRlZmluZSBsb2NhbGUgYmFzZWQgb24gYnJvd3NlciBsYW5ndWFnZSAjIyNcblxuICAgICAgICBAY2FsbGJhY2sgPSBjYlxuICAgICAgICBAYmFja3VwID0gZGF0YVxuXG4gICAgICAgIEBsYW5nID0gQGdldExhbmcoKVxuXG4gICAgICAgIGlmIEFQSS5nZXQoJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0pXG5cbiAgICAgICAgICAgICQuYWpheFxuICAgICAgICAgICAgICAgIHVybCAgICAgOiBBUEkuZ2V0KCAnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSApXG4gICAgICAgICAgICAgICAgdHlwZSAgICA6ICdHRVQnXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgICAgICBlcnJvciAgIDogQGxvYWRCYWNrdXBcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBsb2FkQmFja3VwKClcblxuICAgICAgICBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRMYW5nIDogPT5cblxuICAgICAgICBpZiB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGFuZCB3aW5kb3cubG9jYXRpb24uc2VhcmNoLm1hdGNoKCdsYW5nPScpXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KCdsYW5nPScpWzFdLnNwbGl0KCcmJylbMF1cblxuICAgICAgICBlbHNlIGlmIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBsYW5nID0gQGRlZmF1bHRcblxuICAgICAgICBsYW5nXG5cbiAgICBvblN1Y2Nlc3MgOiAoZXZlbnQpID0+XG5cbiAgICAgICAgIyMjIEZpcmVzIGJhY2sgYW4gZXZlbnQgb25jZSBpdCdzIGNvbXBsZXRlICMjI1xuXG4gICAgICAgIGQgPSBudWxsXG5cbiAgICAgICAgaWYgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgICAgICBkID0gSlNPTi5wYXJzZSBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIGQgPSBldmVudFxuXG4gICAgICAgIEBkYXRhID0gbmV3IExvY2FsZXNNb2RlbCBkXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIGxvYWRCYWNrdXAgOiA9PlxuXG4gICAgICAgICMjIyBXaGVuIEFQSSBub3QgYXZhaWxhYmxlLCB0cmllcyB0byBsb2FkIHRoZSBzdGF0aWMgLnR4dCBsb2NhbGUgIyMjXG5cbiAgICAgICAgJC5hamF4IFxuICAgICAgICAgICAgdXJsICAgICAgOiBAYmFja3VwXG4gICAgICAgICAgICBkYXRhVHlwZSA6ICdqc29uJ1xuICAgICAgICAgICAgY29tcGxldGUgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICBlcnJvciAgICA6ID0+IGNvbnNvbGUubG9nICdlcnJvciBvbiBsb2FkaW5nIGJhY2t1cCdcblxuICAgICAgICBudWxsXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgIyMjIGdldCBTdHJpbmcgZnJvbSBsb2NhbGVcbiAgICAgICAgKyBpZCA6IHN0cmluZyBpZCBvZiB0aGUgTG9jYWxpc2VkIFN0cmluZ1xuICAgICAgICAjIyNcblxuICAgICAgICByZXR1cm4gQGRhdGEuZ2V0U3RyaW5nIGlkXG5cbiAgICBnZXRMb2NhbGVJbWFnZSA6ICh1cmwpID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5jb25maWcuQ0ROICsgXCIvaW1hZ2VzL2xvY2FsZS9cIiArIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZSArIFwiL1wiICsgdXJsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlXG4iLCJUZW1wbGF0ZU1vZGVsICAgICAgID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblRlbXBsYXRlc0NvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24nXG5cbmNsYXNzIFRlbXBsYXRlc1xuXG4gICAgdGVtcGxhdGVzIDogbnVsbFxuICAgIGNiICAgICAgICA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKHRlbXBsYXRlcywgY2FsbGJhY2spIC0+XG5cbiAgICAgICAgQGNiID0gY2FsbGJhY2tcblxuICAgICAgICAkLmFqYXggdXJsIDogdGVtcGxhdGVzLCBzdWNjZXNzIDogQHBhcnNlWE1MXG4gICAgICAgICAgIFxuICAgICAgICBudWxsXG5cbiAgICBwYXJzZVhNTCA6IChkYXRhKSA9PlxuXG4gICAgICAgIHRlbXAgPSBbXVxuXG4gICAgICAgICQoZGF0YSkuZmluZCgndGVtcGxhdGUnKS5lYWNoIChrZXksIHZhbHVlKSAtPlxuICAgICAgICAgICAgJHZhbHVlID0gJCh2YWx1ZSlcbiAgICAgICAgICAgIHRlbXAucHVzaCBuZXcgVGVtcGxhdGVNb2RlbFxuICAgICAgICAgICAgICAgIGlkICAgOiAkdmFsdWUuYXR0cignaWQnKS50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgdGV4dCA6ICQudHJpbSAkdmFsdWUudGV4dCgpXG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXNDb2xsZWN0aW9uIHRlbXBcblxuICAgICAgICBAY2I/KClcbiAgICAgICAgXG4gICAgICAgIG51bGwgICAgICAgIFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgIHQgPSBAdGVtcGxhdGVzLndoZXJlIGlkIDogaWRcbiAgICAgICAgdCA9IHRbMF0uZ2V0ICd0ZXh0J1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICQudHJpbSB0XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzXG4iLCJjbGFzcyBBYnN0cmFjdE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cblx0Y29uc3RydWN0b3IgOiAoYXR0cnMsIG9wdGlvbikgLT5cblxuXHRcdGF0dHJzID0gQF9maWx0ZXJBdHRycyBhdHRyc1xuXG5cdFx0cmV0dXJuIEJhY2tib25lLkRlZXBNb2RlbC5hcHBseSBALCBhcmd1bWVudHNcblxuXHRzZXQgOiAoYXR0cnMsIG9wdGlvbnMpIC0+XG5cblx0XHRvcHRpb25zIG9yIChvcHRpb25zID0ge30pXG5cblx0XHRhdHRycyA9IEBfZmlsdGVyQXR0cnMgYXR0cnNcblxuXHRcdG9wdGlvbnMuZGF0YSA9IEpTT04uc3RyaW5naWZ5IGF0dHJzXG5cblx0XHRyZXR1cm4gQmFja2JvbmUuRGVlcE1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCBALCBhdHRycywgb3B0aW9uc1xuXG5cdF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuXHRcdGF0dHJzXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0TW9kZWxcbiIsIkFic3RyYWN0TW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RNb2RlbCdcbk51bWJlclV0aWxzICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvTnVtYmVyVXRpbHMnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBDb250cmlidXRvck1vZGVsIGV4dGVuZHMgQWJzdHJhY3RNb2RlbFxuXG4gICAgZGVmYXVsdHMgOiBcbiAgICAgICAgXCJuYW1lXCIgICAgOiBcIlwiXG4gICAgICAgIFwiZ2l0aHViXCIgIDogXCJcIlxuICAgICAgICBcIndlYnNpdGVcIiA6IFwiXCJcbiAgICAgICAgXCJ0d2l0dGVyXCIgOiBcIlwiXG4gICAgICAgIFwiaHRtbFwiICAgIDogXCJcIlxuXG4gICAgX2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG4gICAgICAgIGlmIGF0dHJzLm5hbWVcbiAgICAgICAgICAgIGF0dHJzLmh0bWwgPSBAZ2V0SHRtbCBhdHRyc1xuXG4gICAgICAgIGF0dHJzXG5cbiAgICBnZXRIdG1sIDogKGF0dHJzKSA9PlxuXG4gICAgICAgIGh0bWwgID0gXCJcIlxuICAgICAgICBsaW5rcyA9IFtdXG5cbiAgICAgICAgaWYgYXR0cnMud2Vic2l0ZVxuICAgICAgICAgICAgaHRtbCArPSBcIjxhIGhyZWY9XFxcIiN7YXR0cnMud2Vic2l0ZX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj4je2F0dHJzLm5hbWV9PC9hPiBcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBodG1sICs9IFwiI3thdHRycy5uYW1lfSBcIlxuXG4gICAgICAgIGlmIGF0dHJzLnR3aXR0ZXIgdGhlbiBsaW5rcy5wdXNoIFwiPGEgaHJlZj1cXFwiaHR0cDovL3R3aXR0ZXIuY29tLyN7YXR0cnMudHdpdHRlcn1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj50dzwvYT5cIlxuICAgICAgICBpZiBhdHRycy5naXRodWIgdGhlbiBsaW5rcy5wdXNoIFwiPGEgaHJlZj1cXFwiaHR0cDovL2dpdGh1Yi5jb20vI3thdHRycy5naXRodWJ9XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+Z2g8L2E+XCJcblxuICAgICAgICBodG1sICs9IFwiKCN7bGlua3Muam9pbignLCAnKX0pXCJcblxuICAgICAgICBodG1sXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0b3JNb2RlbFxuIiwiY2xhc3MgQVBJUm91dGVNb2RlbCBleHRlbmRzIEJhY2tib25lLkRlZXBNb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuXG4gICAgICAgIHN0YXJ0ICAgICAgICAgOiBcIlwiICMgRWc6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3N0YXJ0XCJcblxuICAgICAgICBsb2NhbGUgICAgICAgIDogXCJcIiAjIEVnOiBcInt7IEJBU0VfVVJMIH19L2FwaS9sMTBuL3t7IGNvZGUgfX1cIlxuXG4gICAgICAgIHVzZXIgICAgICAgICAgOlxuICAgICAgICAgICAgbG9naW4gICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvbG9naW5cIlxuICAgICAgICAgICAgcmVnaXN0ZXIgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcmVnaXN0ZXJcIlxuICAgICAgICAgICAgcGFzc3dvcmQgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcGFzc3dvcmRcIlxuICAgICAgICAgICAgdXBkYXRlICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvdXBkYXRlXCJcbiAgICAgICAgICAgIGxvZ291dCAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL2xvZ291dFwiXG4gICAgICAgICAgICByZW1vdmUgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9yZW1vdmVcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IEFQSVJvdXRlTW9kZWxcbiIsImNsYXNzIExvY2FsZXNNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG4gICAgICAgIGNvZGUgICAgIDogbnVsbFxuICAgICAgICBsYW5ndWFnZSA6IG51bGxcbiAgICAgICAgc3RyaW5ncyAgOiBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRfbGFuZ3VhZ2UgOiA9PlxuICAgICAgICByZXR1cm4gQGdldCgnbGFuZ3VhZ2UnKVxuXG4gICAgZ2V0U3RyaW5nIDogKGlkKSA9PlxuICAgICAgICAoKHJldHVybiBlIGlmKGEgaXMgaWQpKSBmb3IgYSwgZSBvZiB2WydzdHJpbmdzJ10pIGZvciBrLCB2IG9mIEBnZXQoJ3N0cmluZ3MnKVxuICAgICAgICBjb25zb2xlLndhcm4gXCJMb2NhbGVzIC0+IG5vdCBmb3VuZCBzdHJpbmc6ICN7aWR9XCJcbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZXNNb2RlbFxuIiwiY2xhc3MgVGVtcGxhdGVNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cblx0ZGVmYXVsdHMgOiBcblxuXHRcdGlkICAgOiBcIlwiXG5cdFx0dGV4dCA6IFwiXCJcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZU1vZGVsXG4iLCJBYnN0cmFjdE1vZGVsICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0TW9kZWwnXG5OdW1iZXJVdGlscyAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL051bWJlclV0aWxzJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcbkhhc2hpZHMgICAgICAgICAgICAgID0gcmVxdWlyZSAnaGFzaGlkcydcblxuY2xhc3MgRG9vZGxlTW9kZWwgZXh0ZW5kcyBBYnN0cmFjdE1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG4gICAgICAgICMgZnJvbSBtYW5pZmVzdFxuICAgICAgICBcIm5hbWVcIiA6IFwiXCJcbiAgICAgICAgXCJhdXRob3JcIiA6XG4gICAgICAgICAgICBcIm5hbWVcIiAgICA6IFwiXCJcbiAgICAgICAgICAgIFwiZ2l0aHViXCIgIDogXCJcIlxuICAgICAgICAgICAgXCJ3ZWJzaXRlXCIgOiBcIlwiXG4gICAgICAgICAgICBcInR3aXR0ZXJcIiA6IFwiXCJcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlwiXG4gICAgICAgIFwidGFnc1wiIDogW11cbiAgICAgICAgXCJpbnRlcmFjdGlvblwiIDpcbiAgICAgICAgICAgIFwibW91c2VcIiAgICA6IG51bGxcbiAgICAgICAgICAgIFwia2V5Ym9hcmRcIiA6IG51bGxcbiAgICAgICAgICAgIFwidG91Y2hcIiAgICA6IG51bGxcbiAgICAgICAgXCJjcmVhdGVkXCIgOiBcIlwiXG4gICAgICAgIFwic2x1Z1wiIDogXCJcIlxuICAgICAgICBcInNob3J0bGlua1wiIDogXCJcIlxuICAgICAgICBcImNvbG91cl9zY2hlbWVcIiA6IFwiXCJcbiAgICAgICAgXCJpbmRleFwiOiBudWxsXG4gICAgICAgIFwiaW5kZXhfcGFkZGVkXCIgOiBcIlwiXG4gICAgICAgICMgc2l0ZS1vbmx5XG4gICAgICAgIFwiaW5kZXhIVE1MXCIgOiBcIlwiXG4gICAgICAgIFwic291cmNlXCIgICAgOiBcIlwiXG4gICAgICAgIFwidXJsXCIgICAgICAgOiBcIlwiXG4gICAgICAgIFwic2NyYW1ibGVkXCIgOlxuICAgICAgICAgICAgXCJuYW1lXCIgICAgICAgIDogXCJcIlxuICAgICAgICAgICAgXCJhdXRob3JfbmFtZVwiIDogXCJcIlxuXG4gICAgX2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG4gICAgICAgIGlmIGF0dHJzLnNsdWdcbiAgICAgICAgICAgIGF0dHJzLnVybCA9IHdpbmRvdy5jb25maWcuaG9zdG5hbWUgKyAnLycgKyB3aW5kb3cuY29uZmlnLnJvdXRlcy5ET09ETEVTICsgJy8nICsgYXR0cnMuc2x1Z1xuXG4gICAgICAgIGlmIGF0dHJzLmluZGV4XG4gICAgICAgICAgICBhdHRycy5pbmRleF9wYWRkZWQgPSBOdW1iZXJVdGlscy56ZXJvRmlsbCBhdHRycy5pbmRleCwgM1xuICAgICAgICAgICAgYXR0cnMuaW5kZXhIVE1MICAgID0gQGdldEluZGV4SFRNTCBhdHRycy5pbmRleF9wYWRkZWRcblxuICAgICAgICBpZiBhdHRycy5uYW1lIGFuZCBhdHRycy5hdXRob3IubmFtZVxuICAgICAgICAgICAgYXR0cnMuc2NyYW1ibGVkID1cbiAgICAgICAgICAgICAgICBuYW1lICAgICAgICA6IENvZGVXb3JkVHJhbnNpdGlvbmVyLmdldFNjcmFtYmxlZFdvcmQgYXR0cnMubmFtZVxuICAgICAgICAgICAgICAgIGF1dGhvcl9uYW1lIDogQ29kZVdvcmRUcmFuc2l0aW9uZXIuZ2V0U2NyYW1ibGVkV29yZCBhdHRycy5hdXRob3IubmFtZVxuXG4gICAgICAgIGF0dHJzXG5cbiAgICBnZXRJbmRleEhUTUwgOiAoaW5kZXgpID0+XG5cbiAgICAgICAgaHRtbCA9IFwiXCJcblxuICAgICAgICBmb3IgY2hhciBpbiBpbmRleC5zcGxpdCgnJylcbiAgICAgICAgICAgIGNsYXNzTmFtZSA9IGlmIGNoYXIgaXMgJzAnIHRoZW4gJ2luZGV4LWNoYXItemVybycgZWxzZSAnaW5kZXgtY2hhci1ub256ZXJvJ1xuICAgICAgICAgICAgaHRtbCArPSBcIjxzcGFuIGNsYXNzPVxcXCIje2NsYXNzTmFtZX1cXFwiPiN7Y2hhcn08L3NwYW4+XCJcblxuICAgICAgICBodG1sXG5cbiAgICBnZXRBdXRob3JIdG1sIDogPT5cblxuICAgICAgICBwb3J0Zm9saW9fbGFiZWwgPSBAQ0QoKS5sb2NhbGUuZ2V0IFwibWlzY19wb3J0Zm9saW9fbGFiZWxcIlxuXG4gICAgICAgIGF0dHJzID0gQGdldCgnYXV0aG9yJylcbiAgICAgICAgaHRtbCAgPSBcIlwiXG4gICAgICAgIGxpbmtzID0gW11cblxuICAgICAgICBodG1sICs9IFwiI3thdHRycy5uYW1lfSBcXFxcIFwiXG5cbiAgICAgICAgaWYgYXR0cnMud2Vic2l0ZSB0aGVuIGxpbmtzLnB1c2ggXCI8YSBocmVmPVxcXCIje2F0dHJzLndlYnNpdGV9XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+I3twb3J0Zm9saW9fbGFiZWx9PC9hPiBcIlxuICAgICAgICBpZiBhdHRycy50d2l0dGVyIHRoZW4gbGlua3MucHVzaCBcIjxhIGhyZWY9XFxcImh0dHA6Ly90d2l0dGVyLmNvbS8je2F0dHJzLnR3aXR0ZXJ9XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+dHc8L2E+XCJcbiAgICAgICAgaWYgYXR0cnMuZ2l0aHViIHRoZW4gbGlua3MucHVzaCBcIjxhIGhyZWY9XFxcImh0dHA6Ly9naXRodWIuY29tLyN7YXR0cnMuZ2l0aHVifVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPmdoPC9hPlwiXG5cbiAgICAgICAgaHRtbCArPSBcIiN7bGlua3Muam9pbignIFxcXFwgJyl9XCJcblxuICAgICAgICBodG1sXG5cbiAgICAjIG5vIG5lZWQgdG8gZG8gdGhpcyBmb3IgZXZlcnkgZG9vZGxlIC0gb25seSBkbyBpdCBpZiB3ZSB2aWV3IHRoZSBpbmZvIHBhbmUgZm9yIGEgcGFydGljdWxhciBkb29kbGVcbiAgICBzZXRTaG9ydGxpbmsgOiA9PlxuXG4gICAgICAgIHJldHVybiBpZiBAZ2V0ICdzaG9ydGxpbmsnXG5cbiAgICAgICAgaCA9IG5ldyBIYXNoaWRzIHdpbmRvdy5jb25maWcuc2hvcnRsaW5rcy5TQUxULCAwLCB3aW5kb3cuY29uZmlnLnNob3J0bGlua3MuQUxQSEFCRVRcbiAgICAgICAgc2hvcnRsaW5rID0gaC5lbmNvZGUgQGdldCAnaW5kZXgnXG4gICAgICAgIEBzZXQgJ3Nob3J0bGluaycsIHNob3J0bGlua1xuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVNb2RlbFxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vdmlldy9BYnN0cmFjdFZpZXcnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL1JvdXRlcidcblxuY2xhc3MgTmF2IGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICBARVZFTlRfQ0hBTkdFX1ZJRVcgICAgIDogJ0VWRU5UX0NIQU5HRV9WSUVXJ1xuICAgIEBFVkVOVF9DSEFOR0VfU1VCX1ZJRVcgOiAnRVZFTlRfQ0hBTkdFX1NVQl9WSUVXJ1xuXG4gICAgc2VjdGlvbnMgOiBudWxsICMgc2V0IHZpYSB3aW5kb3cuY29uZmlnIGRhdGEsIHNvIGNhbiBiZSBjb25zaXN0ZW50IHdpdGggYmFja2VuZFxuXG4gICAgY3VycmVudCAgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbCwgdGVyIDogbnVsbFxuICAgIHByZXZpb3VzIDogYXJlYSA6IG51bGwsIHN1YiA6IG51bGwsIHRlciA6IG51bGxcblxuICAgIGNoYW5nZVZpZXdDb3VudCA6IDBcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEBzZWN0aW9ucyA9IHdpbmRvdy5jb25maWcucm91dGVzXG4gICAgICAgIEBmYXZpY29uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zhdmljb24nKVxuXG4gICAgICAgIEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAY2hhbmdlVmlld1xuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZ2V0U2VjdGlvbiA6IChzZWN0aW9uLCBzdHJpY3Q9ZmFsc2UpID0+XG5cbiAgICAgICAgaWYgIXN0cmljdCBhbmQgc2VjdGlvbiBpcyAnJyB0aGVuIHJldHVybiB0cnVlXG5cbiAgICAgICAgZm9yIHNlY3Rpb25OYW1lLCB1cmkgb2YgQHNlY3Rpb25zXG4gICAgICAgICAgICBpZiB1cmkgaXMgc2VjdGlvbiB0aGVuIHJldHVybiBzZWN0aW9uTmFtZVxuXG4gICAgICAgIGZhbHNlXG5cbiAgICBjaGFuZ2VWaWV3OiAoYXJlYSwgc3ViLCB0ZXIsIHBhcmFtcykgPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwiYXJlYVwiLGFyZWFcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInN1YlwiLHN1YlxuICAgICAgICAjIGNvbnNvbGUubG9nIFwidGVyXCIsdGVyXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJwYXJhbXNcIixwYXJhbXNcblxuICAgICAgICBAY2hhbmdlVmlld0NvdW50KytcblxuICAgICAgICBAcHJldmlvdXMgPSBAY3VycmVudFxuICAgICAgICBAY3VycmVudCAgPSBhcmVhIDogYXJlYSwgc3ViIDogc3ViLCB0ZXIgOiB0ZXJcblxuICAgICAgICBAdHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBwcmV2aW91cywgQGN1cnJlbnRcbiAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGN1cnJlbnRcblxuICAgICAgICBpZiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5pc09wZW4oKSB0aGVuIEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLmhpZGVPcGVuTW9kYWwoKVxuXG4gICAgICAgIEBzZXRQYWdlVGl0bGUgYXJlYSwgc3ViLCB0ZXJcbiAgICAgICAgQHNldFBhZ2VGYXZpY29uKClcblxuICAgICAgICBudWxsXG5cbiAgICBzZXRQYWdlVGl0bGU6IChhcmVhLCBzdWIsIHRlcikgPT5cblxuICAgICAgICBzZWN0aW9uICAgPSBpZiBhcmVhIGlzICcnIHRoZW4gJ0hPTUUnIGVsc2UgQENEKCkubmF2LmdldFNlY3Rpb24gYXJlYVxuICAgICAgICB0aXRsZVRtcGwgPSBAQ0QoKS5sb2NhbGUuZ2V0KFwicGFnZV90aXRsZV8je3NlY3Rpb259XCIpIG9yIEBDRCgpLmxvY2FsZS5nZXQoXCJwYWdlX3RpdGxlX0hPTUVcIilcbiAgICAgICAgdGl0bGUgPSBAc3VwcGxhbnRTdHJpbmcgdGl0bGVUbXBsLCBAZ2V0UGFnZVRpdGxlVmFycyhhcmVhLCBzdWIsIHRlciksIGZhbHNlXG5cbiAgICAgICAgaWYgd2luZG93LmRvY3VtZW50LnRpdGxlIGlzbnQgdGl0bGUgdGhlbiB3aW5kb3cuZG9jdW1lbnQudGl0bGUgPSB0aXRsZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNldFBhZ2VGYXZpY29uOiA9PlxuXG4gICAgICAgIGNvbG91ciA9IF8uc2h1ZmZsZShbJ3JlZCcsICdibHVlJywgJ2JsYWNrJ10pWzBdXG5cbiAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgQGZhdmljb24uaHJlZiA9IFwiI3tAQ0QoKS5CQVNFX1VSTH0vc3RhdGljL2ltZy9pY29ucy9mYXZpY29uL2Zhdmljb25fI3tjb2xvdXJ9LnBuZ1wiXG4gICAgICAgICwgMFxuXG4gICAgICAgIG51bGxcblxuICAgIGdldFBhZ2VUaXRsZVZhcnM6IChhcmVhLCBzdWIsIHRlcikgPT5cblxuICAgICAgICB2YXJzID0ge31cblxuICAgICAgICBpZiBhcmVhIGlzIEBzZWN0aW9ucy5ET09ETEVTIGFuZCBzdWIgYW5kIHRlclxuICAgICAgICAgICAgZG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmZpbmRXaGVyZSBzbHVnOiBcIiN7c3VifS8je3Rlcn1cIlxuXG4gICAgICAgICAgICBpZiAhZG9vZGxlXG4gICAgICAgICAgICAgICAgdmFycy5uYW1lID0gXCJkb29kbGVcIlxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHZhcnMubmFtZSA9IGRvb2RsZS5nZXQoJ2F1dGhvci5uYW1lJykgKyAnIFxcXFwgJyArIGRvb2RsZS5nZXQoJ25hbWUnKSArICcgJ1xuXG4gICAgICAgIHZhcnNcblxubW9kdWxlLmV4cG9ydHMgPSBOYXZcbiIsImNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4gICAgQEVWRU5UX0hBU0hfQ0hBTkdFRCA6ICdFVkVOVF9IQVNIX0NIQU5HRUQnXG5cbiAgICBGSVJTVF9ST1VURSA6IHRydWVcblxuICAgIHJvdXRlcyA6XG4gICAgICAgICcoLykoOmFyZWEpKC86c3ViKSgvOnRlcikoLyknIDogJ2hhc2hDaGFuZ2VkJ1xuICAgICAgICAnKmFjdGlvbnMnICAgICAgICAgICAgICAgICAgICA6ICduYXZpZ2F0ZVRvJ1xuXG4gICAgYXJlYSAgIDogbnVsbFxuICAgIHN1YiAgICA6IG51bGxcbiAgICB0ZXIgICAgOiBudWxsXG4gICAgcGFyYW1zIDogbnVsbFxuXG4gICAgc3RhcnQgOiA9PlxuXG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQgXG4gICAgICAgICAgICBwdXNoU3RhdGUgOiB0cnVlXG4gICAgICAgICAgICByb290ICAgICAgOiAnLydcblxuICAgICAgICBudWxsXG5cbiAgICBoYXNoQ2hhbmdlZCA6IChAYXJlYSA9IG51bGwsIEBzdWIgPSBudWxsLCBAdGVyID0gbnVsbCkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIj4+IEVWRU5UX0hBU0hfQ0hBTkdFRCBAYXJlYSA9ICN7QGFyZWF9LCBAc3ViID0gI3tAc3VifSwgQHRlciA9ICN7QHRlcn0gPDxcIlxuXG4gICAgICAgIGlmIEBGSVJTVF9ST1VURSB0aGVuIEBGSVJTVF9ST1VURSA9IGZhbHNlXG5cbiAgICAgICAgaWYgIUBhcmVhIHRoZW4gQGFyZWEgPSBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXG4gICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBhcmVhLCBAc3ViLCBAdGVyLCBAcGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbmF2aWdhdGVUbyA6ICh3aGVyZSA9ICcnLCB0cmlnZ2VyID0gdHJ1ZSwgcmVwbGFjZSA9IGZhbHNlLCBAcGFyYW1zKSA9PlxuXG4gICAgICAgIGlmIHdoZXJlLmNoYXJBdCgwKSBpc250IFwiL1wiXG4gICAgICAgICAgICB3aGVyZSA9IFwiLyN7d2hlcmV9XCJcbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KCB3aGVyZS5sZW5ndGgtMSApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIje3doZXJlfS9cIlxuXG4gICAgICAgIGlmICF0cmlnZ2VyXG4gICAgICAgICAgICBAdHJpZ2dlciBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCB3aGVyZSwgbnVsbCwgQHBhcmFtc1xuICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgQG5hdmlnYXRlIHdoZXJlLCB0cmlnZ2VyOiB0cnVlLCByZXBsYWNlOiByZXBsYWNlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQ0QgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXJcbiIsIiMjI1xuQW5hbHl0aWNzIHdyYXBwZXJcbiMjI1xuY2xhc3MgQW5hbHl0aWNzXG5cbiAgICB0YWdzICAgIDogbnVsbFxuICAgIHN0YXJ0ZWQgOiBmYWxzZVxuXG4gICAgYXR0ZW1wdHMgICAgICAgIDogMFxuICAgIGFsbG93ZWRBdHRlbXB0cyA6IDVcblxuICAgIGNvbnN0cnVjdG9yIDogKHRhZ3MsIEBjYWxsYmFjaykgLT5cblxuICAgICAgICAkLmdldEpTT04gdGFncywgQG9uVGFnc1JlY2VpdmVkXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIG9uVGFnc1JlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgQHRhZ3MgICAgPSBkYXRhXG4gICAgICAgIEBzdGFydGVkID0gdHJ1ZVxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICAjIyNcbiAgICBAcGFyYW0gc3RyaW5nIGlkIG9mIHRoZSB0cmFja2luZyB0YWcgdG8gYmUgcHVzaGVkIG9uIEFuYWx5dGljcyBcbiAgICAjIyNcbiAgICB0cmFjayA6IChwYXJhbSkgPT5cblxuICAgICAgICByZXR1cm4gaWYgIUBzdGFydGVkXG5cbiAgICAgICAgaWYgcGFyYW1cblxuICAgICAgICAgICAgdiA9IEB0YWdzW3BhcmFtXVxuXG4gICAgICAgICAgICBpZiB2XG5cbiAgICAgICAgICAgICAgICBhcmdzID0gWydzZW5kJywgJ2V2ZW50J11cbiAgICAgICAgICAgICAgICAoIGFyZ3MucHVzaChhcmcpICkgZm9yIGFyZyBpbiB2XG5cbiAgICAgICAgICAgICAgICAjIGxvYWRpbmcgR0EgYWZ0ZXIgbWFpbiBhcHAgSlMsIHNvIGV4dGVybmFsIHNjcmlwdCBtYXkgbm90IGJlIGhlcmUgeWV0XG4gICAgICAgICAgICAgICAgaWYgd2luZG93LmdhXG4gICAgICAgICAgICAgICAgICAgIGdhLmFwcGx5IG51bGwsIGFyZ3NcbiAgICAgICAgICAgICAgICBlbHNlIGlmIEBhdHRlbXB0cyA+PSBAYWxsb3dlZEF0dGVtcHRzXG4gICAgICAgICAgICAgICAgICAgIEBzdGFydGVkID0gZmFsc2VcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIEB0cmFjayBwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgQGF0dGVtcHRzKytcbiAgICAgICAgICAgICAgICAgICAgLCAyMDAwXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5dGljc1xuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0dvb2dsZVBsdXMnXG5cbmNsYXNzIEF1dGhNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0dXNlckRhdGEgIDogbnVsbFxuXG5cdCMgQHByb2Nlc3MgdHJ1ZSBkdXJpbmcgbG9naW4gcHJvY2Vzc1xuXHRwcm9jZXNzICAgICAgOiBmYWxzZVxuXHRwcm9jZXNzVGltZXIgOiBudWxsXG5cdHByb2Nlc3NXYWl0ICA6IDUwMDBcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdXNlckRhdGEgID0gQENEKCkuYXBwRGF0YS5VU0VSXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGxvZ2luIDogKHNlcnZpY2UsIGNiPW51bGwpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwiKysrKyBQUk9DRVNTIFwiLEBwcm9jZXNzXG5cblx0XHRyZXR1cm4gaWYgQHByb2Nlc3NcblxuXHRcdEBzaG93TG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IHRydWVcblxuXHRcdCRkYXRhRGZkID0gJC5EZWZlcnJlZCgpXG5cblx0XHRzd2l0Y2ggc2VydmljZVxuXHRcdFx0d2hlbiAnZ29vZ2xlJ1xuXHRcdFx0XHRHb29nbGVQbHVzLmxvZ2luICRkYXRhRGZkXG5cdFx0XHR3aGVuICdmYWNlYm9vaydcblx0XHRcdFx0RmFjZWJvb2subG9naW4gJGRhdGFEZmRcblxuXHRcdCRkYXRhRGZkLmRvbmUgKHJlcykgPT4gQGF1dGhTdWNjZXNzIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmZhaWwgKHJlcykgPT4gQGF1dGhGYWlsIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmFsd2F5cyAoKSA9PiBAYXV0aENhbGxiYWNrIGNiXG5cblx0XHQjIyNcblx0XHRVbmZvcnR1bmF0ZWx5IG5vIGNhbGxiYWNrIGlzIGZpcmVkIGlmIHVzZXIgbWFudWFsbHkgY2xvc2VzIEcrIGxvZ2luIG1vZGFsLFxuXHRcdHNvIHRoaXMgaXMgdG8gYWxsb3cgdGhlbSB0byBjbG9zZSB3aW5kb3cgYW5kIHRoZW4gc3Vic2VxdWVudGx5IHRyeSB0byBsb2cgaW4gYWdhaW4uLi5cblx0XHQjIyNcblx0XHRAcHJvY2Vzc1RpbWVyID0gc2V0VGltZW91dCBAYXV0aENhbGxiYWNrLCBAcHJvY2Vzc1dhaXRcblxuXHRcdCRkYXRhRGZkXG5cblx0YXV0aFN1Y2Nlc3MgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBjYWxsYmFjayBmb3IgI3tzZXJ2aWNlfSwgZGF0YSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhGYWlsIDogKHNlcnZpY2UsIGRhdGEpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwibG9naW4gZmFpbCBmb3IgI3tzZXJ2aWNlfSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhDYWxsYmFjayA6IChjYj1udWxsKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAcHJvY2Vzc1xuXG5cdFx0Y2xlYXJUaW1lb3V0IEBwcm9jZXNzVGltZXJcblxuXHRcdEBoaWRlTG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IGZhbHNlXG5cblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdCMjI1xuXHRzaG93IC8gaGlkZSBzb21lIFVJIGluZGljYXRvciB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBzb2NpYWwgbmV0d29yayB0byByZXNwb25kXG5cdCMjI1xuXHRzaG93TG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJzaG93TG9hZGVyXCJcblxuXHRcdG51bGxcblxuXHRoaWRlTG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJoaWRlTG9hZGVyXCJcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRoTWFuYWdlclxuIiwiZW5jb2RlID0gcmVxdWlyZSAnZW50L2VuY29kZSdcblxuY2xhc3MgQ29kZVdvcmRUcmFuc2l0aW9uZXJcblxuXHRAY29uZmlnIDpcblx0XHRNSU5fV1JPTkdfQ0hBUlMgOiAxXG5cdFx0TUFYX1dST05HX0NIQVJTIDogN1xuXG5cdFx0TUlOX0NIQVJfSU5fREVMQVkgOiA0MFxuXHRcdE1BWF9DSEFSX0lOX0RFTEFZIDogNzBcblxuXHRcdE1JTl9DSEFSX09VVF9ERUxBWSA6IDQwXG5cdFx0TUFYX0NIQVJfT1VUX0RFTEFZIDogNzBcblxuXHRcdENIQVJTIDogJ2FiY2RlZmhpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5IT8qKClAwqMkJV4mXy0rPVtde306O1xcJ1wiXFxcXHw8PiwuL35gJy5zcGxpdCgnJykubWFwKChjaGFyKSA9PiByZXR1cm4gZW5jb2RlKGNoYXIpKVxuXG5cdFx0Q0hBUl9URU1QTEFURSA6IFwiPHNwYW4gZGF0YS1jb2RldGV4dC1jaGFyPVxcXCJ7eyBjaGFyIH19XFxcIiBkYXRhLWNvZGV0ZXh0LWNoYXItc3RhdGU9XFxcInt7IHN0YXRlIH19XFxcIj57eyBjaGFyIH19PC9zcGFuPlwiXG5cblx0QF93b3JkQ2FjaGUgOiB7fVxuXG5cdEBfZ2V0V29yZEZyb21DYWNoZSA6ICgkZWwsIGluaXRpYWxTdGF0ZT1udWxsKSA9PlxuXG5cdFx0aWQgPSAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pZCcpXG5cblx0XHRpZiBpZCBhbmQgQF93b3JkQ2FjaGVbIGlkIF1cblx0XHRcdHdvcmQgPSBAX3dvcmRDYWNoZVsgaWQgXVxuXHRcdGVsc2Vcblx0XHRcdEBfd3JhcENoYXJzICRlbCwgaW5pdGlhbFN0YXRlXG5cdFx0XHR3b3JkID0gQF9hZGRXb3JkVG9DYWNoZSAkZWxcblxuXHRcdHdvcmRcblxuXHRAX2FkZFdvcmRUb0NhY2hlIDogKCRlbCkgPT5cblxuXHRcdGNoYXJzID0gW11cblxuXHRcdCRlbC5maW5kKCdbZGF0YS1jb2RldGV4dC1jaGFyXScpLmVhY2ggKGksIGVsKSA9PlxuXHRcdFx0JGNoYXJFbCA9ICQoZWwpXG5cdFx0XHRjaGFycy5wdXNoXG5cdFx0XHRcdCRlbCAgICAgICAgOiAkY2hhckVsXG5cdFx0XHRcdHJpZ2h0Q2hhciAgOiAkY2hhckVsLmF0dHIoJ2RhdGEtY29kZXRleHQtY2hhcicpXG5cblx0XHRpZCA9IF8udW5pcXVlSWQoKVxuXHRcdCRlbC5hdHRyICdkYXRhLWNvZGV3b3JkLWlkJywgaWRcblxuXHRcdEBfd29yZENhY2hlWyBpZCBdID1cblx0XHRcdHdvcmQgICAgOiBfLnBsdWNrKGNoYXJzLCAncmlnaHRDaGFyJykuam9pbignJylcblx0XHRcdCRlbCAgICAgOiAkZWxcblx0XHRcdGNoYXJzICAgOiBjaGFyc1xuXHRcdFx0dmlzaWJsZSA6IHRydWVcblxuXHRcdEBfd29yZENhY2hlWyBpZCBdXG5cblx0QF93cmFwQ2hhcnMgOiAoJGVsLCBpbml0aWFsU3RhdGU9bnVsbCkgPT5cblxuXHRcdGNoYXJzID0gJGVsLnRleHQoKS5zcGxpdCgnJylcblx0XHRzdGF0ZSA9IGluaXRpYWxTdGF0ZSBvciAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pbml0aWFsLXN0YXRlJykgb3IgXCJcIlxuXHRcdGh0bWwgPSBbXVxuXHRcdGZvciBjaGFyIGluIGNoYXJzXG5cdFx0XHRodG1sLnB1c2ggQF9zdXBwbGFudFN0cmluZyBAY29uZmlnLkNIQVJfVEVNUExBVEUsIGNoYXIgOiBjaGFyLCBzdGF0ZTogc3RhdGVcblxuXHRcdCRlbC5odG1sIGh0bWwuam9pbignJylcblxuXHRcdG51bGxcblxuXHQjIEBwYXJhbSB0YXJnZXQgPSAncmlnaHQnLCAnd3JvbmcnLCAnZW1wdHknXG5cdEBfcHJlcGFyZVdvcmQgOiAod29yZCwgdGFyZ2V0LCBjaGFyU3RhdGU9JycpID0+XG5cblx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cblx0XHRcdHRhcmdldENoYXIgPSBzd2l0Y2ggdHJ1ZVxuXHRcdFx0XHR3aGVuIHRhcmdldCBpcyAncmlnaHQnIHRoZW4gY2hhci5yaWdodENoYXJcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ3dyb25nJyB0aGVuIEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICdlbXB0eScgdGhlbiAnJ1xuXHRcdFx0XHRlbHNlIHRhcmdldC5jaGFyQXQoaSkgb3IgJydcblxuXHRcdFx0aWYgdGFyZ2V0Q2hhciBpcyAnICcgdGhlbiB0YXJnZXRDaGFyID0gJyZuYnNwOydcblxuXHRcdFx0Y2hhci53cm9uZ0NoYXJzID0gQF9nZXRSYW5kb21Xcm9uZ0NoYXJzKClcblx0XHRcdGNoYXIudGFyZ2V0Q2hhciA9IHRhcmdldENoYXJcblx0XHRcdGNoYXIuY2hhclN0YXRlICA9IGNoYXJTdGF0ZVxuXG5cdFx0bnVsbFxuXG5cdEBfZ2V0UmFuZG9tV3JvbmdDaGFycyA6ID0+XG5cblx0XHRjaGFycyA9IFtdXG5cblx0XHRjaGFyQ291bnQgPSBfLnJhbmRvbSBAY29uZmlnLk1JTl9XUk9OR19DSEFSUywgQGNvbmZpZy5NQVhfV1JPTkdfQ0hBUlNcblxuXHRcdGZvciBpIGluIFswLi4uY2hhckNvdW50XVxuXHRcdFx0Y2hhcnMucHVzaFxuXHRcdFx0XHRjaGFyICAgICA6IEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdGluRGVsYXkgIDogXy5yYW5kb20gQGNvbmZpZy5NSU5fQ0hBUl9JTl9ERUxBWSwgQGNvbmZpZy5NQVhfQ0hBUl9JTl9ERUxBWVxuXHRcdFx0XHRvdXREZWxheSA6IF8ucmFuZG9tIEBjb25maWcuTUlOX0NIQVJfT1VUX0RFTEFZLCBAY29uZmlnLk1BWF9DSEFSX09VVF9ERUxBWVxuXG5cdFx0Y2hhcnNcblxuXHRAX2dldFJhbmRvbUNoYXIgOiA9PlxuXG5cdFx0Y2hhciA9IEBjb25maWcuQ0hBUlNbIF8ucmFuZG9tKDAsIEBjb25maWcuQ0hBUlMubGVuZ3RoLTEpIF1cblxuXHRcdGNoYXJcblxuXHRAX2dldExvbmdlc3RDaGFyRHVyYXRpb24gOiAoY2hhcnMpID0+XG5cblx0XHRsb25nZXN0VGltZSA9IDBcblx0XHRsb25nZXN0VGltZUlkeCA9IDBcblxuXHRcdGZvciBjaGFyLCBpIGluIGNoYXJzXG5cblx0XHRcdHRpbWUgPSAwXG5cdFx0XHQodGltZSArPSB3cm9uZ0NoYXIuaW5EZWxheSArIHdyb25nQ2hhci5vdXREZWxheSkgZm9yIHdyb25nQ2hhciBpbiBjaGFyLndyb25nQ2hhcnNcblx0XHRcdGlmIHRpbWUgPiBsb25nZXN0VGltZVxuXHRcdFx0XHRsb25nZXN0VGltZSA9IHRpbWVcblx0XHRcdFx0bG9uZ2VzdFRpbWVJZHggPSBpXG5cblx0XHRsb25nZXN0VGltZUlkeFxuXG5cdEBfYW5pbWF0ZUNoYXJzIDogKHdvcmQsIHNlcXVlbnRpYWwsIGNiKSA9PlxuXG5cdFx0YWN0aXZlQ2hhciA9IDBcblxuXHRcdGlmIHNlcXVlbnRpYWxcblx0XHRcdEBfYW5pbWF0ZUNoYXIgd29yZC5jaGFycywgYWN0aXZlQ2hhciwgdHJ1ZSwgY2Jcblx0XHRlbHNlXG5cdFx0XHRsb25nZXN0Q2hhcklkeCA9IEBfZ2V0TG9uZ2VzdENoYXJEdXJhdGlvbiB3b3JkLmNoYXJzXG5cdFx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cdFx0XHRcdGFyZ3MgPSBbIHdvcmQuY2hhcnMsIGksIGZhbHNlIF1cblx0XHRcdFx0aWYgaSBpcyBsb25nZXN0Q2hhcklkeCB0aGVuIGFyZ3MucHVzaCBjYlxuXHRcdFx0XHRAX2FuaW1hdGVDaGFyLmFwcGx5IEAsIGFyZ3NcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVDaGFyIDogKGNoYXJzLCBpZHgsIHJlY3Vyc2UsIGNiKSA9PlxuXG5cdFx0Y2hhciA9IGNoYXJzW2lkeF1cblxuXHRcdGlmIHJlY3Vyc2VcblxuXHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyLCA9PlxuXG5cdFx0XHRcdGlmIGlkeCBpcyBjaGFycy5sZW5ndGgtMVxuXHRcdFx0XHRcdEBfYW5pbWF0ZUNoYXJzRG9uZSBjYlxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0QF9hbmltYXRlQ2hhciBjaGFycywgaWR4KzEsIHJlY3Vyc2UsIGNiXG5cblx0XHRlbHNlXG5cblx0XHRcdGlmIHR5cGVvZiBjYiBpcyAnZnVuY3Rpb24nXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgPT4gQF9hbmltYXRlQ2hhcnNEb25lIGNiXG5cdFx0XHRlbHNlXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhclxuXG5cdFx0bnVsbFxuXG5cdEBfYW5pbWF0ZVdyb25nQ2hhcnMgOiAoY2hhciwgY2IpID0+XG5cblx0XHRpZiBjaGFyLndyb25nQ2hhcnMubGVuZ3RoXG5cblx0XHRcdHdyb25nQ2hhciA9IGNoYXIud3JvbmdDaGFycy5zaGlmdCgpXG5cblx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0Y2hhci4kZWwuaHRtbCB3cm9uZ0NoYXIuY2hhclxuXG5cdFx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsIGNiXG5cdFx0XHRcdCwgd3JvbmdDaGFyLm91dERlbGF5XG5cblx0XHRcdCwgd3JvbmdDaGFyLmluRGVsYXlcblxuXHRcdGVsc2VcblxuXHRcdFx0Y2hhci4kZWxcblx0XHRcdFx0LmF0dHIoJ2RhdGEtY29kZXRleHQtY2hhci1zdGF0ZScsIGNoYXIuY2hhclN0YXRlKVxuXHRcdFx0XHQuaHRtbChjaGFyLnRhcmdldENoYXIpXG5cblx0XHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlQ2hhcnNEb25lIDogKGNiKSA9PlxuXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRAX3N1cHBsYW50U3RyaW5nIDogKHN0ciwgdmFscykgPT5cblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSAve3sgKFtee31dKikgfX0vZywgKGEsIGIpID0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdEB0byA6ICh0YXJnZXRUZXh0LCAkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAdG8odGFyZ2V0VGV4dCwgXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXHRcdHdvcmQudmlzaWJsZSA9IHRydWVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgdGFyZ2V0VGV4dCwgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAaW4gOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQGluKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHR3b3JkLnZpc2libGUgPSB0cnVlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdyaWdodCcsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QG91dCA6ICgkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAb3V0KF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0d29yZC52aXNpYmxlID0gZmFsc2VcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ2VtcHR5JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHNjcmFtYmxlKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICd3cm9uZycsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QHVuc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHVuc2NyYW1ibGUoXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ3JpZ2h0JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAcHJlcGFyZSA6ICgkZWwsIGluaXRpYWxTdGF0ZSkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAcHJlcGFyZShfJGVsLCBpbml0aWFsU3RhdGUpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0QF9nZXRXb3JkRnJvbUNhY2hlICRlbCwgaW5pdGlhbFN0YXRlXG5cblx0XHRudWxsXG5cblx0QGdldFNjcmFtYmxlZFdvcmQgOiAod29yZCkgPT5cblxuXHRcdG5ld0NoYXJzID0gW11cblx0XHQobmV3Q2hhcnMucHVzaCBAX2dldFJhbmRvbUNoYXIoKSkgZm9yIGNoYXIgaW4gd29yZC5zcGxpdCgnJylcblxuXHRcdHJldHVybiBuZXdDaGFycy5qb2luKCcnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVXb3JkVHJhbnNpdGlvbmVyXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkZhY2Vib29rIFNESyB3cmFwcGVyIC0gbG9hZCBhc3luY2hyb25vdXNseSwgc29tZSBoZWxwZXIgbWV0aG9kc1xuXG4jIyNcbmNsYXNzIEZhY2Vib29rIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgICAgIDogJy8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvYWxsLmpzJ1xuXG5cdEBwZXJtaXNzaW9ucyA6ICdlbWFpbCdcblxuXHRAJGRhdGFEZmQgICAgOiBudWxsXG5cdEBsb2FkZWQgICAgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEZCLmluaXRcblx0XHRcdGFwcElkICA6IHdpbmRvdy5jb25maWcuZmJfYXBwX2lkXG5cdFx0XHRzdGF0dXMgOiBmYWxzZVxuXHRcdFx0eGZibWwgIDogZmFsc2VcblxuXHRcdG51bGxcblxuXHRAbG9naW4gOiAoQCRkYXRhRGZkKSA9PlxuXG5cdFx0aWYgIUBsb2FkZWQgdGhlbiByZXR1cm4gQCRkYXRhRGZkLnJlamVjdCAnU0RLIG5vdCBsb2FkZWQnXG5cblx0XHRGQi5sb2dpbiAoIHJlcyApID0+XG5cblx0XHRcdGlmIHJlc1snc3RhdHVzJ10gaXMgJ2Nvbm5lY3RlZCdcblx0XHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYXV0aFJlc3BvbnNlJ11bJ2FjY2Vzc1Rva2VuJ11cblx0XHRcdGVsc2Vcblx0XHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnbm8gd2F5IGpvc2UnXG5cblx0XHQsIHsgc2NvcGU6IEBwZXJtaXNzaW9ucyB9XG5cblx0XHRudWxsXG5cblx0QGdldFVzZXJEYXRhIDogKHRva2VuKSA9PlxuXG5cdFx0dXNlckRhdGEgPSB7fVxuXHRcdHVzZXJEYXRhLmFjY2Vzc190b2tlbiA9IHRva2VuXG5cblx0XHQkbWVEZmQgICA9ICQuRGVmZXJyZWQoKVxuXHRcdCRwaWNEZmQgID0gJC5EZWZlcnJlZCgpXG5cblx0XHRGQi5hcGkgJy9tZScsIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLmZ1bGxfbmFtZSA9IHJlcy5uYW1lXG5cdFx0XHR1c2VyRGF0YS5zb2NpYWxfaWQgPSByZXMuaWRcblx0XHRcdHVzZXJEYXRhLmVtYWlsICAgICA9IHJlcy5lbWFpbCBvciBmYWxzZVxuXHRcdFx0JG1lRGZkLnJlc29sdmUoKVxuXG5cdFx0RkIuYXBpICcvbWUvcGljdHVyZScsIHsgJ3dpZHRoJzogJzIwMCcgfSwgKHJlcykgLT5cblxuXHRcdFx0dXNlckRhdGEucHJvZmlsZV9waWMgPSByZXMuZGF0YS51cmxcblx0XHRcdCRwaWNEZmQucmVzb2x2ZSgpXG5cblx0XHQkLndoZW4oJG1lRGZkLCAkcGljRGZkKS5kb25lID0+IEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cblx0QHNoYXJlIDogKG9wdHMsIGNiKSA9PlxuXG5cdFx0RkIudWkge1xuXHRcdFx0bWV0aG9kICAgICAgOiBvcHRzLm1ldGhvZCBvciAnZmVlZCdcblx0XHRcdG5hbWUgICAgICAgIDogb3B0cy5uYW1lIG9yICcnXG5cdFx0XHRsaW5rICAgICAgICA6IG9wdHMubGluayBvciAnJ1xuXHRcdFx0cGljdHVyZSAgICAgOiBvcHRzLnBpY3R1cmUgb3IgJydcblx0XHRcdGNhcHRpb24gICAgIDogb3B0cy5jYXB0aW9uIG9yICcnXG5cdFx0XHRkZXNjcmlwdGlvbiA6IG9wdHMuZGVzY3JpcHRpb24gb3IgJydcblx0XHR9LCAocmVzcG9uc2UpIC0+XG5cdFx0XHRjYj8ocmVzcG9uc2UpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZWJvb2tcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuXG4jIyNcblxuR29vZ2xlKyBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBHb29nbGVQbHVzIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgIDogJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudDpwbHVzb25lLmpzJ1xuXG5cdEBwYXJhbXMgICA6XG5cdFx0J2NsaWVudGlkJyAgICAgOiBudWxsXG5cdFx0J2NhbGxiYWNrJyAgICAgOiBudWxsXG5cdFx0J3Njb3BlJyAgICAgICAgOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5lbWFpbCdcblx0XHQnY29va2llcG9saWN5JyA6ICdub25lJ1xuXG5cdEAkZGF0YURmZCA6IG51bGxcblx0QGxvYWRlZCAgIDogZmFsc2VcblxuXHRAbG9hZCA6ID0+XG5cblx0XHQjIyNcblx0XHRUTyBET1xuXHRcdGluY2x1ZGUgc2NyaXB0IGxvYWRlciB3aXRoIGNhbGxiYWNrIHRvIDppbml0XG5cdFx0IyMjXG5cdFx0IyByZXF1aXJlIFtAdXJsXSwgQGluaXRcblxuXHRcdG51bGxcblxuXHRAaW5pdCA6ID0+XG5cblx0XHRAbG9hZGVkID0gdHJ1ZVxuXG5cdFx0QHBhcmFtc1snY2xpZW50aWQnXSA9IHdpbmRvdy5jb25maWcuZ3BfYXBwX2lkXG5cdFx0QHBhcmFtc1snY2FsbGJhY2snXSA9IEBsb2dpbkNhbGxiYWNrXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmIEBsb2FkZWRcblx0XHRcdGdhcGkuYXV0aC5zaWduSW4gQHBhcmFtc1xuXHRcdGVsc2Vcblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbkNhbGxiYWNrIDogKHJlcykgPT5cblxuXHRcdGlmIHJlc1snc3RhdHVzJ11bJ3NpZ25lZF9pbiddXG5cdFx0XHRAZ2V0VXNlckRhdGEgcmVzWydhY2Nlc3NfdG9rZW4nXVxuXHRcdGVsc2UgaWYgcmVzWydlcnJvciddWydhY2Nlc3NfZGVuaWVkJ11cblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdGdhcGkuY2xpZW50LmxvYWQgJ3BsdXMnLCd2MScsID0+XG5cblx0XHRcdHJlcXVlc3QgPSBnYXBpLmNsaWVudC5wbHVzLnBlb3BsZS5nZXQgJ3VzZXJJZCc6ICdtZSdcblx0XHRcdHJlcXVlc3QuZXhlY3V0ZSAocmVzKSA9PlxuXG5cdFx0XHRcdHVzZXJEYXRhID1cblx0XHRcdFx0XHRhY2Nlc3NfdG9rZW4gOiB0b2tlblxuXHRcdFx0XHRcdGZ1bGxfbmFtZSAgICA6IHJlcy5kaXNwbGF5TmFtZVxuXHRcdFx0XHRcdHNvY2lhbF9pZCAgICA6IHJlcy5pZFxuXHRcdFx0XHRcdGVtYWlsICAgICAgICA6IGlmIHJlcy5lbWFpbHNbMF0gdGhlbiByZXMuZW1haWxzWzBdLnZhbHVlIGVsc2UgZmFsc2Vcblx0XHRcdFx0XHRwcm9maWxlX3BpYyAgOiByZXMuaW1hZ2UudXJsXG5cblx0XHRcdFx0QCRkYXRhRGZkLnJlc29sdmUgdXNlckRhdGFcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVQbHVzXG4iLCIjICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jICAgTWVkaWEgUXVlcmllcyBNYW5hZ2VyIFxuIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIFxuIyAgIEBhdXRob3IgOiBGw6FiaW8gQXpldmVkbyA8ZmFiaW8uYXpldmVkb0B1bml0OS5jb20+IFVOSVQ5XG4jICAgQGRhdGUgICA6IFNlcHRlbWJlciAxNFxuIyAgIFxuIyAgIEluc3RydWN0aW9ucyBhcmUgb24gL3Byb2plY3Qvc2Fzcy91dGlscy9fcmVzcG9uc2l2ZS5zY3NzLlxuXG5jbGFzcyBNZWRpYVF1ZXJpZXNcblxuICAgICMgQnJlYWtwb2ludHNcbiAgICBAU01BTEwgICAgICAgOiBcInNtYWxsXCJcbiAgICBASVBBRCAgICAgICAgOiBcImlwYWRcIlxuICAgIEBNRURJVU0gICAgICA6IFwibWVkaXVtXCJcbiAgICBATEFSR0UgICAgICAgOiBcImxhcmdlXCJcbiAgICBARVhUUkFfTEFSR0UgOiBcImV4dHJhLWxhcmdlXCJcblxuICAgIEBzZXR1cCA6ID0+XG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLlNNQUxMX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiU21hbGxcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuU01BTExdfVxuICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlQgPSB7bmFtZTogXCJNZWRpdW1cIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuTUVESVVNXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLkxBUkdFX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiTGFyZ2VcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuSVBBRCwgTWVkaWFRdWVyaWVzLkxBUkdFLCBNZWRpYVF1ZXJpZXMuRVhUUkFfTEFSR0VdfVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUyA9IFtcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlRcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UXG4gICAgICAgIF1cbiAgICAgICAgcmV0dXJuXG5cbiAgICBAZ2V0RGV2aWNlU3RhdGUgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBcImFmdGVyXCIpLmdldFByb3BlcnR5VmFsdWUoXCJjb250ZW50XCIpO1xuXG4gICAgQGdldEJyZWFrcG9pbnQgOiA9PlxuXG4gICAgICAgIHN0YXRlID0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcblxuICAgICAgICBmb3IgaSBpbiBbMC4uLk1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUy5sZW5ndGhdXG4gICAgICAgICAgICBpZiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0uYnJlYWtwb2ludHMuaW5kZXhPZihzdGF0ZSkgPiAtMVxuICAgICAgICAgICAgICAgIHJldHVybiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0ubmFtZVxuXG4gICAgICAgIHJldHVybiBcIlwiXG5cbiAgICBAaXNCcmVha3BvaW50IDogKGJyZWFrcG9pbnQpID0+XG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5icmVha3BvaW50LmJyZWFrcG9pbnRzLmxlbmd0aF1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgYnJlYWtwb2ludC5icmVha3BvaW50c1tpXSA9PSBNZWRpYVF1ZXJpZXMuZ2V0RGV2aWNlU3RhdGUoKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbndpbmRvdy5NZWRpYVF1ZXJpZXMgPSBNZWRpYVF1ZXJpZXNcblxubW9kdWxlLmV4cG9ydHMgPSBNZWRpYVF1ZXJpZXNcbiIsImNsYXNzIE51bWJlclV0aWxzXG5cbiAgICBATUFUSF9DT1M6IE1hdGguY29zIFxuICAgIEBNQVRIX1NJTjogTWF0aC5zaW4gXG4gICAgQE1BVEhfUkFORE9NOiBNYXRoLnJhbmRvbSBcbiAgICBATUFUSF9BQlM6IE1hdGguYWJzXG4gICAgQE1BVEhfQVRBTjI6IE1hdGguYXRhbjJcblxuICAgIEBsaW1pdDoobnVtYmVyLCBtaW4sIG1heCktPlxuICAgICAgICByZXR1cm4gTWF0aC5taW4oIE1hdGgubWF4KG1pbixudW1iZXIpLCBtYXggKVxuXG4gICAgQGdldFJhbmRvbUNvbG9yOiAtPlxuXG4gICAgICAgIGxldHRlcnMgPSAnMDEyMzQ1Njc4OUFCQ0RFRicuc3BsaXQoJycpXG4gICAgICAgIGNvbG9yID0gJyMnXG4gICAgICAgIGZvciBpIGluIFswLi4uNl1cbiAgICAgICAgICAgIGNvbG9yICs9IGxldHRlcnNbTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTUpXVxuICAgICAgICBjb2xvclxuXG4gICAgQGdldFRpbWVTdGFtcERpZmYgOiAoZGF0ZTEsIGRhdGUyKSAtPlxuXG4gICAgICAgICMgR2V0IDEgZGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAgICBvbmVfZGF5ID0gMTAwMCo2MCo2MCoyNFxuICAgICAgICB0aW1lICAgID0ge31cblxuICAgICAgICAjIENvbnZlcnQgYm90aCBkYXRlcyB0byBtaWxsaXNlY29uZHNcbiAgICAgICAgZGF0ZTFfbXMgPSBkYXRlMS5nZXRUaW1lKClcbiAgICAgICAgZGF0ZTJfbXMgPSBkYXRlMi5nZXRUaW1lKClcblxuICAgICAgICAjIENhbGN1bGF0ZSB0aGUgZGlmZmVyZW5jZSBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRhdGUyX21zIC0gZGF0ZTFfbXNcblxuICAgICAgICAjIHRha2Ugb3V0IG1pbGxpc2Vjb25kc1xuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy8xMDAwXG4gICAgICAgIHRpbWUuc2Vjb25kcyAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMgJSA2MClcblxuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy82MCBcbiAgICAgICAgdGltZS5taW51dGVzICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcyAlIDYwKVxuXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkaWZmZXJlbmNlX21zLzYwIFxuICAgICAgICB0aW1lLmhvdXJzICAgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zICUgMjQpICBcblxuICAgICAgICB0aW1lLmRheXMgICAgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zLzI0KVxuXG4gICAgICAgIHRpbWVcblxuICAgIEBtYXA6ICggbnVtLCBtaW4xLCBtYXgxLCBtaW4yLCBtYXgyLCByb3VuZCA9IGZhbHNlLCBjb25zdHJhaW5NaW4gPSB0cnVlLCBjb25zdHJhaW5NYXggPSB0cnVlICkgLT5cbiAgICAgICAgaWYgY29uc3RyYWluTWluIGFuZCBudW0gPCBtaW4xIHRoZW4gcmV0dXJuIG1pbjJcbiAgICAgICAgaWYgY29uc3RyYWluTWF4IGFuZCBudW0gPiBtYXgxIHRoZW4gcmV0dXJuIG1heDJcbiAgICAgICAgXG4gICAgICAgIG51bTEgPSAobnVtIC0gbWluMSkgLyAobWF4MSAtIG1pbjEpXG4gICAgICAgIG51bTIgPSAobnVtMSAqIChtYXgyIC0gbWluMikpICsgbWluMlxuICAgICAgICBpZiByb3VuZCB0aGVuIHJldHVybiBNYXRoLnJvdW5kKG51bTIpXG5cbiAgICAgICAgcmV0dXJuIG51bTJcblxuICAgIEB0b1JhZGlhbnM6ICggZGVncmVlICkgLT5cbiAgICAgICAgcmV0dXJuIGRlZ3JlZSAqICggTWF0aC5QSSAvIDE4MCApXG5cbiAgICBAdG9EZWdyZWU6ICggcmFkaWFucyApIC0+XG4gICAgICAgIHJldHVybiByYWRpYW5zICogKCAxODAgLyBNYXRoLlBJIClcblxuICAgIEBpc0luUmFuZ2U6ICggbnVtLCBtaW4sIG1heCwgY2FuQmVFcXVhbCApIC0+XG4gICAgICAgIGlmIGNhbkJlRXF1YWwgdGhlbiByZXR1cm4gbnVtID49IG1pbiAmJiBudW0gPD0gbWF4XG4gICAgICAgIGVsc2UgcmV0dXJuIG51bSA+PSBtaW4gJiYgbnVtIDw9IG1heFxuXG4gICAgIyBjb252ZXJ0IG1ldHJlcyBpbiB0byBtIC8gS01cbiAgICBAZ2V0TmljZURpc3RhbmNlOiAobWV0cmVzKSA9PlxuXG4gICAgICAgIGlmIG1ldHJlcyA8IDEwMDBcblxuICAgICAgICAgICAgcmV0dXJuIFwiI3tNYXRoLnJvdW5kKG1ldHJlcyl9TVwiXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBrbSA9IChtZXRyZXMvMTAwMCkudG9GaXhlZCgyKVxuICAgICAgICAgICAgcmV0dXJuIFwiI3trbX1LTVwiXG5cbiAgICAjIGZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTI2NzMzOFxuICAgIEB6ZXJvRmlsbDogKCBudW1iZXIsIHdpZHRoICkgPT5cblxuICAgICAgICB3aWR0aCAtPSBudW1iZXIudG9TdHJpbmcoKS5sZW5ndGhcblxuICAgICAgICBpZiB3aWR0aCA+IDBcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXJyYXkoIHdpZHRoICsgKC9cXC4vLnRlc3QoIG51bWJlciApID8gMiA6IDEpICkuam9pbiggJzAnICkgKyBudW1iZXJcblxuICAgICAgICByZXR1cm4gbnVtYmVyICsgXCJcIiAjIGFsd2F5cyByZXR1cm4gYSBzdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJVdGlsc1xuIiwiIyMjXG4jIFJlcXVlc3RlciAjXG5cbldyYXBwZXIgZm9yIGAkLmFqYXhgIGNhbGxzXG5cbiMjI1xuY2xhc3MgUmVxdWVzdGVyXG5cbiAgICBAcmVxdWVzdHMgOiBbXVxuXG4gICAgQHJlcXVlc3Q6ICggZGF0YSApID0+XG4gICAgICAgICMjI1xuICAgICAgICBgZGF0YSA9IHtgPGJyPlxuICAgICAgICBgICB1cmwgICAgICAgICA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGAgIHR5cGUgICAgICAgIDogXCJQT1NUL0dFVC9QVVRcImA8YnI+XG4gICAgICAgIGAgIGRhdGEgICAgICAgIDogT2JqZWN0YDxicj5cbiAgICAgICAgYCAgZGF0YVR5cGUgICAgOiBqUXVlcnkgZGF0YVR5cGVgPGJyPlxuICAgICAgICBgICBjb250ZW50VHlwZSA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGB9YFxuICAgICAgICAjIyNcblxuICAgICAgICByID0gJC5hamF4IHtcblxuICAgICAgICAgICAgdXJsICAgICAgICAgOiBkYXRhLnVybFxuICAgICAgICAgICAgdHlwZSAgICAgICAgOiBpZiBkYXRhLnR5cGUgdGhlbiBkYXRhLnR5cGUgZWxzZSBcIlBPU1RcIixcbiAgICAgICAgICAgIGRhdGEgICAgICAgIDogaWYgZGF0YS5kYXRhIHRoZW4gZGF0YS5kYXRhIGVsc2UgbnVsbCxcbiAgICAgICAgICAgIGRhdGFUeXBlICAgIDogaWYgZGF0YS5kYXRhVHlwZSB0aGVuIGRhdGEuZGF0YVR5cGUgZWxzZSBcImpzb25cIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlIDogaWYgZGF0YS5jb250ZW50VHlwZSB0aGVuIGRhdGEuY29udGVudFR5cGUgZWxzZSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOFwiLFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGEgOiBpZiBkYXRhLnByb2Nlc3NEYXRhICE9IG51bGwgYW5kIGRhdGEucHJvY2Vzc0RhdGEgIT0gdW5kZWZpbmVkIHRoZW4gZGF0YS5wcm9jZXNzRGF0YSBlbHNlIHRydWVcblxuICAgICAgICB9XG5cbiAgICAgICAgci5kb25lIGRhdGEuZG9uZVxuICAgICAgICByLmZhaWwgZGF0YS5mYWlsXG4gICAgICAgIFxuICAgICAgICByXG5cbiAgICBAYWRkSW1hZ2UgOiAoZGF0YSwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgIyMjXG4gICAgICAgICoqIFVzYWdlOiA8YnI+XG4gICAgICAgIGBkYXRhID0gY2FudmFzcy50b0RhdGFVUkwoXCJpbWFnZS9qcGVnXCIpLnNsaWNlKFwiZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCxcIi5sZW5ndGgpYDxicj5cbiAgICAgICAgYFJlcXVlc3Rlci5hZGRJbWFnZSBkYXRhLCBcInpvZXRyb3BlXCIsIEBkb25lLCBAZmFpbGBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nXG4gICAgICAgICAgICB0eXBlICAgOiAnUE9TVCdcbiAgICAgICAgICAgIGRhdGEgICA6IHtpbWFnZV9iYXNlNjQgOiBlbmNvZGVVUkkoZGF0YSl9XG4gICAgICAgICAgICBkb25lICAgOiBkb25lXG4gICAgICAgICAgICBmYWlsICAgOiBmYWlsXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQGRlbGV0ZUltYWdlIDogKGlkLCBkb25lLCBmYWlsKSA9PlxuICAgICAgICBcbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nK2lkXG4gICAgICAgICAgICB0eXBlICAgOiAnREVMRVRFJ1xuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0ZXJcbiIsIiMjI1xuU2hhcmluZyBjbGFzcyBmb3Igbm9uLVNESyBsb2FkZWQgc29jaWFsIG5ldHdvcmtzLlxuSWYgU0RLIGlzIGxvYWRlZCwgYW5kIHByb3ZpZGVzIHNoYXJlIG1ldGhvZHMsIHRoZW4gdXNlIHRoYXQgY2xhc3MgaW5zdGVhZCwgZWcuIGBGYWNlYm9vay5zaGFyZWAgaW5zdGVhZCBvZiBgU2hhcmUuZmFjZWJvb2tgXG4jIyNcbmNsYXNzIFNoYXJlXG5cbiAgICB1cmwgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IC0+XG5cbiAgICAgICAgQHVybCA9IEBDRCgpLkJBU0VfVVJMXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIG9wZW5XaW4gOiAodXJsLCB3LCBoKSA9PlxuXG4gICAgICAgIGxlZnQgPSAoIHNjcmVlbi5hdmFpbFdpZHRoICAtIHcgKSA+PiAxXG4gICAgICAgIHRvcCAgPSAoIHNjcmVlbi5hdmFpbEhlaWdodCAtIGggKSA+PiAxXG5cbiAgICAgICAgd2luZG93Lm9wZW4gdXJsLCAnJywgJ3RvcD0nK3RvcCsnLGxlZnQ9JytsZWZ0Kycsd2lkdGg9Jyt3KycsaGVpZ2h0PScraCsnLGxvY2F0aW9uPW5vLG1lbnViYXI9bm8nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcGx1cyA6ICggdXJsICkgPT5cblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwczovL3BsdXMuZ29vZ2xlLmNvbS9zaGFyZT91cmw9I3t1cmx9XCIsIDY1MCwgMzg1XG5cbiAgICAgICAgbnVsbFxuXG4gICAgcGludGVyZXN0IDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnBpbnRlcmVzdC5jb20vcGluL2NyZWF0ZS9idXR0b24vP3VybD0je3VybH0mbWVkaWE9I3ttZWRpYX0mZGVzY3JpcHRpb249I3tkZXNjcn1cIiwgNzM1LCAzMTBcblxuICAgICAgICBudWxsXG5cbiAgICB0dW1ibHIgOiAodXJsLCBtZWRpYSwgZGVzY3IpID0+XG5cbiAgICAgICAgdXJsICAgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG4gICAgICAgIG1lZGlhID0gZW5jb2RlVVJJQ29tcG9uZW50KG1lZGlhKVxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChkZXNjcilcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cudHVtYmxyLmNvbS9zaGFyZS9waG90bz9zb3VyY2U9I3ttZWRpYX0mY2FwdGlvbj0je2Rlc2NyfSZjbGlja190aHJ1PSN7dXJsfVwiLCA0NTAsIDQzMFxuXG4gICAgICAgIG51bGxcblxuICAgIGZhY2Vib29rIDogKCB1cmwgLCBjb3B5ID0gJycpID0+IFxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBkZWNzciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5mYWNlYm9vay5jb20vc2hhcmUucGhwP3U9I3t1cmx9JnQ9I3tkZWNzcn1cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICB0d2l0dGVyIDogKCB1cmwgLCBjb3B5ID0gJycpID0+XG5cbiAgICAgICAgY29uc29sZS5sb2cgXCJ0d2l0dGVyIDogKCB1cmwgLCBjb3B5ID0gJycpID0+XCIsIHVybCwgY29weVxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBpZiBjb3B5IGlzICcnXG4gICAgICAgICAgICBjb3B5ID0gQENEKCkubG9jYWxlLmdldCAnc2VvX3R3aXR0ZXJfY2FyZF9kZXNjcmlwdGlvbidcbiAgICAgICAgICAgIFxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldC8/dGV4dD0je2Rlc2NyfSZ1cmw9I3t1cmx9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVucmVuIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2hhcmUucmVucmVuLmNvbS9zaGFyZS9idXR0b25zaGFyZS5kbz9saW5rPVwiICsgdXJsLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHdlaWJvIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2VydmljZS53ZWliby5jb20vc2hhcmUvc2hhcmUucGhwP3VybD0je3VybH0mbGFuZ3VhZ2U9emhfY25cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlXG4iLCJjbGFzcyBBYnN0cmFjdFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblx0ZWwgICAgICAgICAgIDogbnVsbFxuXHRpZCAgICAgICAgICAgOiBudWxsXG5cdGNoaWxkcmVuICAgICA6IG51bGxcblx0dGVtcGxhdGUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZVZhcnMgOiBudWxsXG5cdFxuXHRpbml0aWFsaXplIDogLT5cblx0XHRcblx0XHRAY2hpbGRyZW4gPSBbXVxuXG5cdFx0aWYgQHRlbXBsYXRlXG5cdFx0XHR0bXBIVE1MID0gXy50ZW1wbGF0ZSBAQ0QoKS50ZW1wbGF0ZXMuZ2V0IEB0ZW1wbGF0ZVxuXHRcdFx0QHNldEVsZW1lbnQgdG1wSFRNTCBAdGVtcGxhdGVWYXJzXG5cblx0XHRAJGVsLmF0dHIgJ2lkJywgQGlkIGlmIEBpZFxuXHRcdEAkZWwuYWRkQ2xhc3MgQGNsYXNzTmFtZSBpZiBAY2xhc3NOYW1lXG5cdFx0XG5cdFx0QGluaXQoKVxuXG5cdFx0QHBhdXNlZCA9IGZhbHNlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0dXBkYXRlIDogPT5cblxuXHRcdG51bGxcblxuXHRyZW5kZXIgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGFkZENoaWxkIDogKGNoaWxkLCBwcmVwZW5kID0gZmFsc2UpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdHRhcmdldCA9IGlmIEBhZGRUb1NlbGVjdG9yIHRoZW4gQCRlbC5maW5kKEBhZGRUb1NlbGVjdG9yKS5lcSgwKSBlbHNlIEAkZWxcblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXG5cdFx0aWYgIXByZXBlbmQgXG5cdFx0XHR0YXJnZXQuYXBwZW5kIGNcblx0XHRlbHNlIFxuXHRcdFx0dGFyZ2V0LnByZXBlbmQgY1xuXG5cdFx0QFxuXG5cdHJlcGxhY2UgOiAoZG9tLCBjaGlsZCkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblx0XHRAJGVsLmNoaWxkcmVuKGRvbSkucmVwbGFjZVdpdGgoYylcblxuXHRcdG51bGxcblxuXHRyZW1vdmUgOiAoY2hpbGQpID0+XG5cblx0XHR1bmxlc3MgY2hpbGQ/XG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSAkKGNoaWxkKVxuXHRcdGNoaWxkLmRpc3Bvc2UoKSBpZiBjIGFuZCBjaGlsZC5kaXNwb3NlXG5cblx0XHRpZiBjICYmIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPSAtMVxuXHRcdFx0QGNoaWxkcmVuLnNwbGljZSggQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxIClcblxuXHRcdGMucmVtb3ZlKClcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6IChldmVudCkgPT5cblxuXHRcdChpZiBjaGlsZC5vblJlc2l6ZSB0aGVuIGNoaWxkLm9uUmVzaXplKCkpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRtb3VzZUVuYWJsZWQgOiAoIGVuYWJsZWQgKSA9PlxuXG5cdFx0QCRlbC5jc3Ncblx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogaWYgZW5hYmxlZCB0aGVuIFwiYXV0b1wiIGVsc2UgXCJub25lXCJcblxuXHRcdG51bGxcblxuXHRDU1NUcmFuc2xhdGUgOiAoeCwgeSwgdmFsdWU9JyUnLCBzY2FsZSkgPT5cblxuXHRcdGlmIE1vZGVybml6ci5jc3N0cmFuc2Zvcm1zM2Rcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlM2QoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSwgMClcIlxuXHRcdGVsc2Vcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0pXCJcblxuXHRcdGlmIHNjYWxlIHRoZW4gc3RyID0gXCIje3N0cn0gc2NhbGUoI3tzY2FsZX0pXCJcblxuXHRcdHN0clxuXG5cdHVuTXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnVuTXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC51bk11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC5tdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLm11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZUFsbENoaWxkcmVuOiA9PlxuXG5cdFx0QHJlbW92ZSBjaGlsZCBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0dHJpZ2dlckNoaWxkcmVuIDogKG1zZywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnRyaWdnZXIgbXNnXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEB0cmlnZ2VyQ2hpbGRyZW4gbXNnLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbkFuZFNlbGYgOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdEBbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0c3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzLCBhbGxvd1NwYWNlcz10cnVlKSAtPlxuXG5cdFx0cmUgPSBpZiBhbGxvd1NwYWNlcyB0aGVuIG5ldyBSZWdFeHAoJ3t7IChbXnt9XSopIH19JywgJ2cnKSBlbHNlIG5ldyBSZWdFeHAoJ3t7KFtee31dKil9fScsICdnJylcblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSByZSwgKGEsIGIpIC0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0IyMjXG5cdFx0b3ZlcnJpZGUgb24gcGVyIHZpZXcgYmFzaXMgLSB1bmJpbmQgZXZlbnQgaGFuZGxlcnMgZXRjXG5cdFx0IyMjXG5cblx0XHRudWxsXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1xuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0Vmlld1BhZ2UgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHRfc2hvd24gICAgIDogZmFsc2Vcblx0X2xpc3RlbmluZyA6IGZhbHNlXG5cblx0c2hvdyA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgIUBfc2hvd25cblx0XHRAX3Nob3duID0gdHJ1ZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLmFkZENoaWxkIEBcblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29uJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAndmlzaWJsZSdcblx0XHRjYj8oKVxuXG5cdFx0aWYgQENEKCkubmF2LmNoYW5nZVZpZXdDb3VudCBpcyAxXG5cdFx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfUFJFTE9BREVSX0hJREUsIEBhbmltYXRlSW5cblx0XHRlbHNlXG5cdFx0XHRAYW5pbWF0ZUluKClcblxuXHRcdG51bGxcblxuXHRoaWRlIDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAX3Nob3duXG5cdFx0QF9zaG93biA9IGZhbHNlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIucmVtb3ZlIEBcblxuXHRcdCMgQGNhbGxDaGlsZHJlbkFuZFNlbGYgJ3NldExpc3RlbmVycycsICdvZmYnXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICdoaWRkZW4nXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRkaXNwb3NlIDogPT5cblxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBzZXR0aW5nIGlzbnQgQF9saXN0ZW5pbmdcblx0XHRAX2xpc3RlbmluZyA9IHNldHRpbmdcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0IyMjXG5cdFx0c3R1YmJlZCBoZXJlLCBvdmVycmlkZSBpbiB1c2VkIHBhZ2UgY2xhc3Nlc1xuXHRcdCMjI1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1BhZ2VcbiIsIkFic3RyYWN0Vmlld1BhZ2UgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuQ29udHJpYnV0b3JzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4uLy4uL2NvbGxlY3Rpb25zL2NvbnRyaWJ1dG9ycy9Db250cmlidXRvcnNDb2xsZWN0aW9uJ1xuUmVxdWVzdGVyICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL1JlcXVlc3RlcidcbkFQSSAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9kYXRhL0FQSSdcblxuY2xhc3MgQWJvdXRQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWFib3V0J1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEBjb250cmlidXRvcnMgPSBuZXcgQ29udHJpYnV0b3JzQ29sbGVjdGlvblxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0bGFiZWxfd2hhdCAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2xhYmVsX3doYXRcIlxuXHRcdFx0Y29udGVudF93aGF0ICAgIDogQGdldFdoYXRDb250ZW50KClcblx0XHRcdGxhYmVsX2NvbnRhY3QgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9sYWJlbF9jb250YWN0XCJcblx0XHRcdGNvbnRlbnRfY29udGFjdCA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9jb250ZW50X2NvbnRhY3RcIlxuXHRcdFx0bGFiZWxfd2hvICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2xhYmVsX3dob1wiXG5cblx0XHRzdXBlclxuXG5cdFx0QGdldENvbnRyaWJ1dG9yc0NvbnRlbnQoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRnZXRXaGF0Q29udGVudCA6ID0+XG5cblx0XHRjb250cmlidXRlX3VybCA9IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEVcblxuXHRcdHJldHVybiBAc3VwcGxhbnRTdHJpbmcgQENEKCkubG9jYWxlLmdldChcImFib3V0X2NvbnRlbnRfd2hhdFwiKSwgeyBjb250cmlidXRlX3VybCA6IGNvbnRyaWJ1dGVfdXJsIH0sIGZhbHNlXG5cblx0Z2V0Q29udHJpYnV0b3JzQ29udGVudCA6ID0+XG5cblx0XHRyID0gUmVxdWVzdGVyLnJlcXVlc3RcbiAgICAgICAgICAgICMgdXJsICA6IEFQSS5nZXQoJ3N0YXJ0JylcbiAgICAgICAgICAgIHVybCAgOiBAQ0QoKS5CQVNFX1VSTCArICcvZGF0YS9fRFVNTVkvY29udHJpYnV0b3JzLmpzb24nXG4gICAgICAgICAgICB0eXBlIDogJ0dFVCdcblxuICAgICAgICByLmRvbmUgKHJlcykgPT5cbiAgICAgICAgXHRAY29udHJpYnV0b3JzLmFkZCByZXMuY29udHJpYnV0b3JzXG4gICAgICAgIFx0QCRlbC5maW5kKCdbZGF0YS1jb250cmlidXRvcnNdJykuaHRtbCBAY29udHJpYnV0b3JzLmdldEFib3V0SFRNTCgpXG5cbiAgICAgICAgci5mYWlsIChyZXMpID0+IGNvbnNvbGUuZXJyb3IgXCJwcm9ibGVtIGdldHRpbmcgdGhlIGNvbnRyaWJ1dG9yc1wiLCByZXNcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYm91dFBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEZvb3RlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnc2l0ZS1mb290ZXInXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0ge31cblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGb290ZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuUm91dGVyICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvUm91dGVyJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgSGVhZGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0dGVtcGxhdGUgOiAnc2l0ZS1oZWFkZXInXG5cblx0RklSU1RfSEFTSENIQU5HRSA6IHRydWVcblx0RE9PRExFX0lORk9fT1BFTiA6IGZhbHNlXG5cblx0RVZFTlRfRE9PRExFX0lORk9fT1BFTiAgIDogJ0VWRU5UX0RPT0RMRV9JTkZPX09QRU4nXG5cdEVWRU5UX0RPT0RMRV9JTkZPX0NMT1NFICA6ICdFVkVOVF9ET09ETEVfSU5GT19DTE9TRSdcblx0RVZFTlRfSE9NRV9TQ1JPTExfVE9fVE9QIDogJ0VWRU5UX0hPTUVfU0NST0xMX1RPX1RPUCdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID1cblx0XHRcdGhvbWUgICAgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfbG9nb19sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0YWJvdXQgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfYWJvdXRfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUXG5cdFx0XHRcdHNlY3Rpb24gIDogQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUXG5cdFx0XHRjb250cmlidXRlIDogXG5cdFx0XHRcdGxhYmVsICAgIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2NvbnRyaWJ1dGVfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEVcblx0XHRcdFx0c2VjdGlvbiAgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0Y2xvc2VfbGFiZWwgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY2xvc2VfbGFiZWwnKVxuXHRcdFx0aW5mb19sYWJlbCA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9pbmZvX2xhYmVsJylcblxuXHRcdHN1cGVyKClcblxuXHRcdEBiaW5kRXZlbnRzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGxvZ28gICAgICAgICAgICAgID0gQCRlbC5maW5kKCcubG9nb19fbGluaycpXG5cdFx0QCRuYXZMaW5rQWJvdXQgICAgICA9IEAkZWwuZmluZCgnLmFib3V0LWJ0bicpXG5cdFx0QCRuYXZMaW5rQ29udHJpYnV0ZSA9IEAkZWwuZmluZCgnLmNvbnRyaWJ1dGUtYnRuJylcblx0XHRAJGluZm9CdG4gICAgICAgICAgID0gQCRlbC5maW5kKCcuaW5mby1idG4nKVxuXHRcdEAkY2xvc2VCdG4gICAgICAgICAgPSBAJGVsLmZpbmQoJy5jbG9zZS1idG4nKVxuXG5cdFx0bnVsbFxuXG5cdGJpbmRFdmVudHMgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1BSRUxPQURFUl9ISURFLCBAYW5pbWF0ZVRleHRJblxuXHRcdEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAb25IYXNoQ2hhbmdlXG5cblx0XHRAJGVsLm9uICdtb3VzZWVudGVyJywgJ1tkYXRhLWNvZGV3b3JkXScsIEBvbldvcmRFbnRlclxuXHRcdEAkZWwub24gJ21vdXNlbGVhdmUnLCAnW2RhdGEtY29kZXdvcmRdJywgQG9uV29yZExlYXZlXG5cblx0XHRAJGluZm9CdG4ub24gJ2NsaWNrJywgQG9uSW5mb0J0bkNsaWNrXG5cdFx0QCRjbG9zZUJ0bi5vbiAnY2xpY2snLCBAb25DbG9zZUJ0bkNsaWNrXG5cblx0XHRAJGVsLm9uICdjbGljaycsICdbZGF0YS1sb2dvXScsIEBvbkxvZ29DbGlja1xuXG5cdFx0QENEKCkuYXBwVmlldy4kd2luZG93Lm9uICdrZXl1cCcsIEBvbktleXVwXG5cblx0XHRudWxsXG5cblx0b25IYXNoQ2hhbmdlIDogKHdoZXJlKSA9PlxuXG5cdFx0aWYgQEZJUlNUX0hBU0hDSEFOR0Vcblx0XHRcdEBGSVJTVF9IQVNIQ0hBTkdFID0gZmFsc2Vcblx0XHRcdHJldHVyblxuXHRcdFxuXHRcdEBvbkFyZWFDaGFuZ2Ugd2hlcmVcblxuXHRcdG51bGxcblxuXHRvbkFyZWFDaGFuZ2UgOiAoc2VjdGlvbikgPT5cblxuXHRcdEBhY3RpdmVTZWN0aW9uID0gc2VjdGlvblxuXHRcdFxuXHRcdGNvbG91ciA9IEBnZXRTZWN0aW9uQ29sb3VyIHNlY3Rpb25cblxuXHRcdEAkZWwuYXR0ciAnZGF0YS1zZWN0aW9uJywgc2VjdGlvblxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRsb2dvLCBjb2xvdXJcblxuXHRcdCMgdGhpcyBqdXN0IGZvciB0ZXN0aW5nLCB0aWR5IGxhdGVyXG5cdFx0aWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFU1xuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZV0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVRcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJG5hdkxpbmtDb250cmlidXRlLCBAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQWJvdXRdLCAnYmxhY2std2hpdGUtYmcnXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkaW5mb0J0bl0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0Fib3V0LCBAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQ29udHJpYnV0ZV0sICdibGFjay13aGl0ZS1iZydcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0ZWxzZSBpZiBzZWN0aW9uIGlzICdkb29kbGUtaW5mbydcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRpbmZvQnRuXSwgJ29mZndoaXRlLXJlZC1iZydcblx0XHRlbHNlXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRjbG9zZUJ0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZSwgQCRpbmZvQnRuXSwgY29sb3VyXG5cblx0XHRudWxsXG5cblx0Z2V0U2VjdGlvbkNvbG91ciA6IChzZWN0aW9uLCB3b3JkU2VjdGlvbj1udWxsKSA9PlxuXG5cdFx0c2VjdGlvbiA9IHNlY3Rpb24gb3IgQENEKCkubmF2LmN1cnJlbnQuYXJlYSBvciAnaG9tZSdcblxuXHRcdGlmIHdvcmRTZWN0aW9uIGFuZCBzZWN0aW9uIGlzIHdvcmRTZWN0aW9uXG5cdFx0XHRpZiB3b3JkU2VjdGlvbiBpcyAnZG9vZGxlLWluZm8nXG5cdFx0XHRcdHJldHVybiAnb2Zmd2hpdGUtcmVkLWJnJ1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRyZXR1cm4gJ2JsYWNrLXdoaXRlLWJnJ1xuXG5cdFx0Y29sb3VyID0gc3dpdGNoIHNlY3Rpb25cblx0XHRcdHdoZW4gJ2hvbWUnLCAnZG9vZGxlLWluZm8nIHRoZW4gJ3JlZCdcblx0XHRcdHdoZW4gQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUIHRoZW4gJ3doaXRlJ1xuXHRcdFx0d2hlbiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURSB0aGVuICd3aGl0ZSdcblx0XHRcdHdoZW4gQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMgdGhlbiBAX2dldERvb2RsZUNvbG91clNjaGVtZSgpXG5cdFx0XHRlbHNlICd3aGl0ZSdcblxuXHRcdGNvbG91clxuXG5cdF9nZXREb29kbGVDb2xvdXJTY2hlbWUgOiA9PlxuXG5cdFx0ZG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmdldERvb2RsZUJ5TmF2U2VjdGlvbiAnY3VycmVudCdcblx0XHRjb2xvdXIgPSBpZiBkb29kbGUgYW5kIGRvb2RsZS5nZXQoJ2NvbG91cl9zY2hlbWUnKSBpcyAnbGlnaHQnIHRoZW4gJ2JsYWNrJyBlbHNlICd3aGl0ZSdcblxuXHRcdGNvbG91clxuXG5cdGFuaW1hdGVUZXh0SW4gOiA9PlxuXG5cdFx0QG9uQXJlYUNoYW5nZSBAQ0QoKS5uYXYuY3VycmVudC5hcmVhXG5cblx0XHRudWxsXG5cblx0b25Xb3JkRW50ZXIgOiAoZSkgPT5cblxuXHRcdCRlbCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXHRcdHdvcmRTZWN0aW9uID0gJGVsLmF0dHIoJ2RhdGEtd29yZC1zZWN0aW9uJylcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIoQGFjdGl2ZVNlY3Rpb24sIHdvcmRTZWN0aW9uKVxuXG5cdFx0bnVsbFxuXG5cdG9uV29yZExlYXZlIDogKGUpID0+XG5cblx0XHQkZWwgPSAkKGUuY3VycmVudFRhcmdldClcblx0XHR3b3JkU2VjdGlvbiA9ICRlbC5hdHRyKCdkYXRhLXdvcmQtc2VjdGlvbicpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci51bnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIoQGFjdGl2ZVNlY3Rpb24sIHdvcmRTZWN0aW9uKVxuXG5cdFx0bnVsbFxuXG5cdG9uTG9nb0NsaWNrIDogPT5cblxuXHRcdGlmIEBDRCgpLm5hdi5jdXJyZW50LmFyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcblx0XHRcdEB0cmlnZ2VyIEBFVkVOVF9IT01FX1NDUk9MTF9UT19UT1BcblxuXHRcdG51bGxcblxuXHRvbkluZm9CdG5DbGljayA6IChlKSA9PlxuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRyZXR1cm4gdW5sZXNzIEBDRCgpLm5hdi5jdXJyZW50LmFyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVNcblxuXHRcdGlmICFARE9PRExFX0lORk9fT1BFTiB0aGVuIEBzaG93RG9vZGxlSW5mbygpXG5cblx0XHRudWxsXG5cblx0b25DbG9zZUJ0bkNsaWNrIDogKGUpID0+XG5cblx0XHRpZiBARE9PRExFX0lORk9fT1BFTlxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0XHRAaGlkZURvb2RsZUluZm8oKVxuXG5cdFx0bnVsbFxuXG5cdG9uS2V5dXAgOiAoZSkgPT5cblxuXHRcdGlmIGUua2V5Q29kZSBpcyAyNyBhbmQgQENEKCkubmF2LmN1cnJlbnQuYXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFUyB0aGVuIEBoaWRlRG9vZGxlSW5mbygpXG5cblx0XHRudWxsXG5cblx0c2hvd0Rvb2RsZUluZm8gOiA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyAhQERPT0RMRV9JTkZPX09QRU5cblxuXHRcdEBvbkFyZWFDaGFuZ2UgJ2Rvb2RsZS1pbmZvJ1xuXHRcdEB0cmlnZ2VyIEBFVkVOVF9ET09ETEVfSU5GT19PUEVOXG5cdFx0QERPT0RMRV9JTkZPX09QRU4gPSB0cnVlXG5cblx0XHRudWxsXG5cblx0aGlkZURvb2RsZUluZm8gOiA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBARE9PRExFX0lORk9fT1BFTlxuXG5cdFx0QG9uQXJlYUNoYW5nZSBAQ0QoKS5uYXYuY3VycmVudC5hcmVhXG5cdFx0QHRyaWdnZXIgQEVWRU5UX0RPT0RMRV9JTkZPX0NMT1NFXG5cdFx0QERPT0RMRV9JTkZPX09QRU4gPSBmYWxzZVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWRlclxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuSG9tZVZpZXcgICAgID0gcmVxdWlyZSAnLi4vaG9tZS9Ib21lVmlldydcbkNvbG9ycyAgICAgICA9IHJlcXVpcmUgJy4uLy4uL2NvbmZpZy9Db2xvcnMnXG5cbmNsYXNzIFBhZ2VUcmFuc2l0aW9uZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ3BhZ2UtdHJhbnNpdGlvbmVyJ1xuXG4gICAgcGFnZUxhYmVscyA6IG51bGxcblxuICAgIHBhbGV0dGVzIDpcbiAgICAgICAgSE9NRSAgICAgICA6IFsgQ29sb3JzLkNEX0JMVUUsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9SRUQgXVxuICAgICAgICBBQk9VVCAgICAgIDogWyBDb2xvcnMuQ0RfUkVELCBDb2xvcnMuT0ZGX1dISVRFLCBDb2xvcnMuQ0RfQkxVRSBdXG4gICAgICAgIENPTlRSSUJVVEUgOiBbIENvbG9ycy5DRF9CTFVFLCBDb2xvcnMuT0ZGX1dISVRFLCBDb2xvcnMuQ0RfUkVEIF1cbiAgICAgICAgRE9PRExFUyAgICA6IFsgQ29sb3JzLkNEX1JFRCwgQ29sb3JzLk9GRl9XSElURSwgQ29sb3JzLkNEX0JMVUUgXVxuXG4gICAgYWN0aXZlQ29uZmlnIDogbnVsbFxuXG4gICAgY29uZmlnUHJlc2V0cyA6XG4gICAgICAgIGJvdHRvbVRvVG9wIDpcbiAgICAgICAgICAgIGZpbmFsVHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKDAsIC0xMDAlLCAwKSdcbiAgICAgICAgICAgIHN0YXJ0IDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgwLCAxMDAlLCAwKSdcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAnbm9uZSdcbiAgICAgICAgdG9wVG9Cb3R0b20gOlxuICAgICAgICAgICAgZmluYWxUcmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoMCwgMTAwJSwgMCknXG4gICAgICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoMCwgLTEwMCUsIDApJ1xuICAgICAgICAgICAgZW5kIDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICdub25lJ1xuICAgICAgICBsZWZ0VG9SaWdodCA6XG4gICAgICAgICAgICBmaW5hbFRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgxMDAlLCAwLCAwKSdcbiAgICAgICAgICAgIHN0YXJ0IDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgtMTAwJSwgMCwgMCknXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ25vbmUnXG4gICAgICAgIHJpZ2h0VG9MZWZ0IDpcbiAgICAgICAgICAgIGZpbmFsVHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKC0xMDAlLCAwLCAwKSdcbiAgICAgICAgICAgIHN0YXJ0IDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgxMDAlLCAwLCAwKSdcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAnbm9uZSdcblxuICAgIFRSQU5TSVRJT05fVElNRSA6IDAuNVxuICAgIEVWRU5UX1RSQU5TSVRJT05FUl9PVVRfRE9ORSA6ICdFVkVOVF9UUkFOU0lUSU9ORVJfT1VUX0RPTkUnXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0gXG4gICAgICAgICAgICBwYWdlTGFiZWxzIDpcbiAgICAgICAgICAgICAgICBIT01FICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcInBhZ2VfdHJhbnNpdGlvbmVyX2xhYmVsX0hPTUVcIlxuICAgICAgICAgICAgICAgIEFCT1VUICAgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfQUJPVVRcIlxuICAgICAgICAgICAgICAgIENPTlRSSUJVVEUgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfQ09OVFJJQlVURVwiXG4gICAgICAgICAgICBwYWdlTGFiZWxQcmVmaXggOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfcHJlZml4XCJcblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEAkcGFuZXMgICAgID0gQCRlbC5maW5kKCdbZGF0YS1wYW5lXScpXG4gICAgICAgIEAkbGFiZWxQYW5lID0gQCRlbC5maW5kKCdbZGF0YS1sYWJlbC1wYW5lXScpXG4gICAgICAgIEAkbGFiZWwgICAgID0gQCRlbC5maW5kKCdbZGF0YS1sYWJlbF0nKVxuXG4gICAgICAgIG51bGxcblxuICAgIHByZXBhcmUgOiAoZnJvbUFyZWEsIHRvQXJlYSkgPT5cblxuICAgICAgICBAcmVzZXRQYW5lcygpXG5cbiAgICAgICAgQGFwcGx5UGFsZXR0ZSBAZ2V0UGFsZXR0ZSB0b0FyZWFcblxuICAgICAgICBAYWN0aXZlQ29uZmlnID0gQGdldENvbmZpZyhmcm9tQXJlYSwgdG9BcmVhKVxuXG4gICAgICAgIEBhcHBseUNvbmZpZyBAYWN0aXZlQ29uZmlnLnN0YXJ0LCB0b0FyZWFcbiAgICAgICAgQGFwcGx5TGFiZWxDb25maWcgQGFjdGl2ZUNvbmZpZy5maW5hbFRyYW5zZm9ybVxuXG4gICAgICAgIEBhcHBseUxhYmVsIEBnZXRBcmVhTGFiZWwgdG9BcmVhXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVzZXRQYW5lcyA6ID0+XG5cbiAgICAgICAgQCRwYW5lcy5hdHRyICdzdHlsZSc6ICcnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0QXJlYUxhYmVsIDogKGFyZWEsIGRpcmVjdGlvbj0ndG8nKSA9PlxuXG4gICAgICAgIHNlY3Rpb24gPSBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBhcmVhLCB0cnVlXG5cbiAgICAgICAgaWYgc2VjdGlvbiBpcyAnRE9PRExFUydcbiAgICAgICAgICAgIGxhYmVsID0gQGdldERvb2RsZUxhYmVsIGRpcmVjdGlvblxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYWJlbCA9IEB0ZW1wbGF0ZVZhcnMucGFnZUxhYmVsc1tzZWN0aW9uXVxuXG4gICAgICAgIGxhYmVsXG5cbiAgICBnZXREb29kbGVMYWJlbCA6IChkaXJlY3Rpb24pID0+XG5cbiAgICAgICAgc2VjdGlvbiA9IGlmIGRpcmVjdGlvbiBpcyAndG8nIHRoZW4gJ2N1cnJlbnQnIGVsc2UgJ3ByZXZpb3VzJ1xuICAgICAgICBkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZ2V0RG9vZGxlQnlOYXZTZWN0aW9uIHNlY3Rpb25cblxuICAgICAgICBpZiBkb29kbGVcbiAgICAgICAgICAgIGxhYmVsID0gZG9vZGxlLmdldCgnYXV0aG9yLm5hbWUnKSArICcgXFxcXCAnICsgZG9vZGxlLmdldCgnbmFtZScpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxhYmVsID0gJ2Rvb2RsZSdcblxuICAgICAgICBsYWJlbFxuXG4gICAgYXBwbHlMYWJlbCA6ICh0b0xhYmVsKSA9PlxuXG4gICAgICAgIEAkbGFiZWwuaHRtbCBAdGVtcGxhdGVWYXJzLnBhZ2VMYWJlbFByZWZpeCArICcgJyArIHRvTGFiZWwgKyAnLi4uJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGdldFBhbGV0dGUgOiAoYXJlYSkgPT5cblxuICAgICAgICBzZWN0aW9uID0gQENEKCkubmF2LmdldFNlY3Rpb24gYXJlYSwgdHJ1ZVxuXG4gICAgICAgIEBwYWxldHRlc1tzZWN0aW9uXSBvciBAcGFsZXR0ZXMuSE9NRVxuXG4gICAgYXBwbHlQYWxldHRlIDogKHBhbGV0dGUpID0+XG5cbiAgICAgICAgQCRwYW5lcy5lYWNoIChpKSA9PiBAJHBhbmVzLmVxKGkpLmNzcyAnYmFja2dyb3VuZC1jb2xvcicgOiBwYWxldHRlW2ldXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0Q29uZmlnIDogKGZyb21BcmVhLCB0b0FyZWEpID0+XG5cbiAgICAgICAgaWYgIUhvbWVWaWV3LnZpc2l0ZWRUaGlzU2Vzc2lvbiBhbmQgdG9BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG4gICAgICAgICAgICBjb25maWcgPSBAY29uZmlnUHJlc2V0cy5ib3R0b21Ub1RvcFxuXG4gICAgICAgIGVsc2UgaWYgZnJvbUFyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMgYW5kIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFU1xuICAgICAgICAgICAgY29uZmlnID0gQF9nZXREb29kbGVUb0Rvb2RsZUNvbmZpZygpXG5cbiAgICAgICAgZWxzZSBpZiB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUIG9yIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuICAgICAgICAgICAgIyBjb25maWcgPSBAY29uZmlnUHJlc2V0cy50b3BUb0JvdHRvbVxuICAgICAgICAgICAgY29uZmlnID0gQF9nZXRSYW5kb21Db25maWcoKVxuXG4gICAgICAgICMgZWxzZSBpZiBmcm9tQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRSBvciB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgIyBjb25maWcgPSBAY29uZmlnUHJlc2V0cy5ib3R0b21Ub1RvcFxuICAgICAgICAgICAgY29uZmlnID0gQF9nZXRSYW5kb21Db25maWcoKVxuXG4gICAgICAgIGNvbmZpZ1xuXG4gICAgX2dldERvb2RsZVRvRG9vZGxlQ29uZmlnIDogKHByZXZTbHVnLCBuZXh0U2x1ZykgPT5cblxuICAgICAgICBwcmV2aW91c0Rvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5nZXREb29kbGVCeU5hdlNlY3Rpb24gJ3ByZXZpb3VzJ1xuICAgICAgICBwcmV2aW91c0Rvb2RsZUlkeCA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5pbmRleE9mIHByZXZpb3VzRG9vZGxlXG5cbiAgICAgICAgY3VycmVudERvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5nZXREb29kbGVCeU5hdlNlY3Rpb24gJ2N1cnJlbnQnXG4gICAgICAgIGN1cnJlbnREb29kbGVJZHggPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuaW5kZXhPZiBjdXJyZW50RG9vZGxlXG5cbiAgICAgICAgX2NvbmZpZyA9IGlmIHByZXZpb3VzRG9vZGxlSWR4ID4gY3VycmVudERvb2RsZUlkeCB0aGVuIEBjb25maWdQcmVzZXRzLmxlZnRUb1JpZ2h0IGVsc2UgQGNvbmZpZ1ByZXNldHMucmlnaHRUb0xlZnRcblxuICAgICAgICBfY29uZmlnXG5cbiAgICBfZ2V0UmFuZG9tQ29uZmlnIDogPT5cblxuICAgICAgICBfY29uZmlnID0gXy5zaHVmZmxlKEBjb25maWdQcmVzZXRzKVswXVxuXG4gICAgICAgIF9jb25maWdcblxuICAgIGFwcGx5Q29uZmlnIDogKGNvbmZpZywgdG9BcmVhPW51bGwpID0+XG5cbiAgICAgICAgQCRwYW5lcy5jc3MgY29uZmlnXG5cbiAgICAgICAgY2xhc3NDaGFuZ2UgPSBpZiB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMgdGhlbiAnYWRkQ2xhc3MnIGVsc2UgJ3JlbW92ZUNsYXNzJ1xuICAgICAgICBAJGVsW2NsYXNzQ2hhbmdlXSAnc2hvdy1kb3RzJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGFwcGx5TGFiZWxDb25maWcgOiAodHJhbnNmb3JtVmFsdWUpID0+XG5cbiAgICAgICAgQCRsYWJlbFBhbmUuY3NzICd0cmFuc2Zvcm0nIDogdHJhbnNmb3JtVmFsdWVcblxuICAgICAgICBudWxsXG5cbiAgICBzaG93IDogPT5cblxuICAgICAgICBAJGVsLmFkZENsYXNzICdzaG93J1xuXG4gICAgICAgIG51bGxcblxuICAgIGhpZGUgOiA9PlxuXG4gICAgICAgIEAkZWwucmVtb3ZlQ2xhc3MgJ3Nob3cnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW4gOiAoY2IpID0+XG5cbiAgICAgICAgQHNob3coKVxuXG4gICAgICAgIGNvbW1vblBhcmFtcyA9IHRyYW5zZm9ybSA6ICdub25lJywgZWFzZSA6IEV4cG8uZWFzZU91dCwgZm9yY2UzRDogdHJ1ZVxuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSwgZWwpID0+XG4gICAgICAgICAgICBwYXJhbXMgPSBfLmV4dGVuZCB7fSwgY29tbW9uUGFyYW1zLFxuICAgICAgICAgICAgICAgIGRlbGF5IDogaSAqIDAuMDVcbiAgICAgICAgICAgIGlmIGkgaXMgMiB0aGVuIHBhcmFtcy5vbkNvbXBsZXRlID0gPT5cbiAgICAgICAgICAgICAgICBAYXBwbHlDb25maWcgQGFjdGl2ZUNvbmZpZy5lbmRcbiAgICAgICAgICAgICAgICBjYj8oKVxuXG4gICAgICAgICAgICBUd2VlbkxpdGUudG8gJChlbCksIEBUUkFOU0lUSU9OX1RJTUUsIHBhcmFtc1xuXG4gICAgICAgIGxhYmVsUGFyYW1zID0gXy5leHRlbmQge30sIGNvbW1vblBhcmFtcywgZGVsYXkgOiAwLjFcbiAgICAgICAgVHdlZW5MaXRlLnRvIEAkbGFiZWxQYW5lLCBAVFJBTlNJVElPTl9USU1FLCBsYWJlbFBhcmFtc1xuXG4gICAgICAgIG51bGxcblxuICAgIG91dCA6IChjYikgPT5cblxuICAgICAgICBjb21tb25QYXJhbXMgPSBlYXNlIDogRXhwby5lYXNlT3V0LCBmb3JjZTNEOiB0cnVlLCBjbGVhclByb3BzOiAnYWxsJ1xuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSwgZWwpID0+XG4gICAgICAgICAgICBwYXJhbXMgPSBfLmV4dGVuZCB7fSwgY29tbW9uUGFyYW1zLCAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRlbGF5ICAgICA6IDAuMSAtICgwLjA1ICogaSlcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm0gOiBAYWN0aXZlQ29uZmlnLmZpbmFsVHJhbnNmb3JtXG4gICAgICAgICAgICBpZiBpIGlzIDAgdGhlbiBwYXJhbXMub25Db21wbGV0ZSA9ID0+XG4gICAgICAgICAgICAgICAgQGhpZGUoKVxuICAgICAgICAgICAgICAgIGNiPygpXG4gICAgICAgICAgICAgICAgQHRyaWdnZXIgQEVWRU5UX1RSQU5TSVRJT05FUl9PVVRfRE9ORVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nIFwiQHRyaWdnZXIgQEVWRU5UX1RSQU5TSVRJT05FUl9PVVRfRE9ORVwiXG5cbiAgICAgICAgICAgIFR3ZWVuTGl0ZS50byAkKGVsKSwgQFRSQU5TSVRJT05fVElNRSwgcGFyYW1zXG5cbiAgICAgICAgbGFiZWxQYXJhbXMgPSBfLmV4dGVuZCB7fSwgY29tbW9uUGFyYW1zLCB0cmFuc2Zvcm0gOiBAYWN0aXZlQ29uZmlnLnN0YXJ0LnRyYW5zZm9ybVxuICAgICAgICBUd2VlbkxpdGUudG8gQCRsYWJlbFBhbmUsIEBUUkFOU0lUSU9OX1RJTUUsIGxhYmVsUGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhZ2VUcmFuc2l0aW9uZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgUHJlbG9hZGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cdFxuXHRjYiAgICAgICAgICAgICAgOiBudWxsXG5cdFxuXHRUUkFOU0lUSU9OX1RJTUUgOiAwLjVcblxuXHRNSU5fV1JPTkdfQ0hBUlMgOiAwXG5cdE1BWF9XUk9OR19DSEFSUyA6IDRcblxuXHRNSU5fQ0hBUl9JTl9ERUxBWSA6IDMwXG5cdE1BWF9DSEFSX0lOX0RFTEFZIDogMTAwXG5cblx0TUlOX0NIQVJfT1VUX0RFTEFZIDogMzBcblx0TUFYX0NIQVJfT1VUX0RFTEFZIDogMTAwXG5cblx0Q0hBUlMgOiAnYWJjZGVmaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhPyooKUDCoyQlXiZfLSs9W117fTo7XFwnXCJcXFxcfDw+LC4vfmAnLnNwbGl0KCcnKVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEBzZXRFbGVtZW50ICQoJyNwcmVsb2FkZXInKVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkY29kZVdvcmQgPSBAJGVsLmZpbmQoJ1tkYXRhLWNvZGV3b3JkXScpXG5cdFx0QCRiZzEgPSBAJGVsLmZpbmQoJ1tkYXRhLWJnPVwiMVwiXScpXG5cdFx0QCRiZzIgPSBAJGVsLmZpbmQoJ1tkYXRhLWJnPVwiMlwiXScpXG5cblx0XHRudWxsXG5cblx0cGxheUludHJvQW5pbWF0aW9uIDogKEBjYikgPT5cblxuXHRcdGNvbnNvbGUubG9nIFwic2hvdyA6IChAY2IpID0+XCJcblxuXHRcdCMgREVCVUchXG5cdFx0IyBAJGVsLnJlbW92ZUNsYXNzKCdzaG93LXByZWxvYWRlcicpXG5cdFx0IyByZXR1cm4gQG9uSGlkZUNvbXBsZXRlKClcblxuXHRcdEAkZWxcblx0XHRcdC5maW5kKCdbZGF0YS1kb3RzXScpXG5cdFx0XHRcdC5yZW1vdmUoKVxuXHRcdFx0XHQuZW5kKClcblx0XHRcdC5hZGRDbGFzcygnc2hvdy1wcmVsb2FkZXInKVxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRjb2RlV29yZCwgJ3doaXRlJywgZmFsc2UsIEBoaWRlXG5cblx0XHRudWxsXG5cblx0b25TaG93Q29tcGxldGUgOiA9PlxuXG5cdFx0QGNiPygpXG5cblx0XHRudWxsXG5cblx0aGlkZSA6ID0+XG5cblx0XHRAYW5pbWF0ZU91dCBAb25IaWRlQ29tcGxldGVcblxuXHRcdG51bGxcblxuXHRvbkhpZGVDb21wbGV0ZSA6ID0+XG5cblx0XHRAY2I/KClcblxuXHRcdG51bGxcblxuXHRhbmltYXRlT3V0IDogKGNiKSA9PlxuXG5cdFx0IyBAYW5pbWF0ZUNoYXJzT3V0KClcblxuXHRcdCMgdGhhdCdsbCBkb1xuXHRcdCMgc2V0VGltZW91dCBjYiwgMjIwMFxuXG5cdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0YW5hZ3JhbSA9IF8uc2h1ZmZsZSgnY29kZWRvb2RsLmVzJy5zcGxpdCgnJykpLmpvaW4oJycpXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBhbmFncmFtLCBAJGNvZGVXb3JkLCAnd2hpdGUnLCBmYWxzZSwgPT4gQGFuaW1hdGVCZ091dCBjYlxuXHRcdCwgMjAwMFxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVCZ091dCA6IChjYikgPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMSwgMC41LCB7IGRlbGF5IDogMC4yLCB3aWR0aCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0IH1cblx0XHRUd2VlbkxpdGUudG8gQCRiZzEsIDAuNiwgeyBkZWxheSA6IDAuNywgaGVpZ2h0IDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQgfVxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcyLCAwLjQsIHsgZGVsYXkgOiAwLjQsIHdpZHRoIDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMiwgMC41LCB7IGRlbGF5IDogMC44LCBoZWlnaHQgOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCwgb25Db21wbGV0ZSA6IGNiIH1cblxuXHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIEAkY29kZVdvcmQsICcnLCBmYWxzZVxuXHRcdCwgNDAwXG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRAJGVsLnJlbW92ZUNsYXNzKCdzaG93LXByZWxvYWRlcicpXG5cdFx0LCAxMjAwXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUHJlbG9hZGVyXG4iLCJBYnN0cmFjdFZpZXcgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Ib21lVmlldyAgICAgICAgICAgPSByZXF1aXJlICcuLi9ob21lL0hvbWVWaWV3J1xuQWJvdXRQYWdlVmlldyAgICAgID0gcmVxdWlyZSAnLi4vYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcnXG5Db250cmlidXRlUGFnZVZpZXcgPSByZXF1aXJlICcuLi9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcnXG5Eb29kbGVQYWdlVmlldyAgICAgPSByZXF1aXJlICcuLi9kb29kbGVQYWdlL0Rvb2RsZVBhZ2VWaWV3J1xuRm91ck9oRm91clBhZ2VWaWV3ID0gcmVxdWlyZSAnLi4vZm91ck9oRm91clBhZ2UvRm91ck9oRm91clBhZ2VWaWV3J1xuTmF2ICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vcm91dGVyL05hdidcblxuY2xhc3MgV3JhcHBlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdFZJRVdfVFlQRV9QQUdFICA6ICdwYWdlJ1xuXG5cdHRlbXBsYXRlIDogJ3dyYXBwZXInXG5cblx0dmlld3MgICAgICAgICAgOiBudWxsXG5cdHByZXZpb3VzVmlldyAgIDogbnVsbFxuXHRjdXJyZW50VmlldyAgICA6IG51bGxcblxuXHRwYWdlU3dpdGNoRGZkIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB2aWV3cyA9XG5cdFx0XHRob21lICAgICAgIDogY2xhc3NSZWYgOiBIb21lVmlldywgICAgICAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkhPTUUsICAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRhYm91dCAgICAgIDogY2xhc3NSZWYgOiBBYm91dFBhZ2VWaWV3LCAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkFCT1VULCAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRjb250cmlidXRlIDogY2xhc3NSZWYgOiBDb250cmlidXRlUGFnZVZpZXcsIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEUsIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRkb29kbGUgICAgIDogY2xhc3NSZWYgOiBEb29kbGVQYWdlVmlldywgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMsICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRmb3VyT2hGb3VyIDogY2xhc3NSZWYgOiBGb3VyT2hGb3VyUGFnZVZpZXcsIHJvdXRlIDogZmFsc2UsIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cblx0XHRAY3JlYXRlQ2xhc3NlcygpXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIGRlY2lkZSBpZiB5b3Ugd2FudCB0byBhZGQgYWxsIGNvcmUgRE9NIHVwIGZyb250LCBvciBhZGQgb25seSB3aGVuIHJlcXVpcmVkLCBzZWUgY29tbWVudHMgaW4gQWJzdHJhY3RWaWV3UGFnZS5jb2ZmZWVcblx0XHQjIEBhZGRDbGFzc2VzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0Y3JlYXRlQ2xhc3NlcyA6ID0+XG5cblx0XHQoQHZpZXdzW25hbWVdLnZpZXcgPSBuZXcgQHZpZXdzW25hbWVdLmNsYXNzUmVmKSBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3NcblxuXHRcdG51bGxcblxuXHRhZGRDbGFzc2VzIDogPT5cblxuXHRcdCBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHQgXHRpZiBkYXRhLnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIHRoZW4gQGFkZENoaWxkIGRhdGEudmlld1xuXG5cdFx0bnVsbFxuXG5cdCMgZ2V0Vmlld0J5Um91dGUgOiAocm91dGUpID0+XG5cblx0IyBcdGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXHQjIFx0XHR2aWV3ID0gQHZpZXdzW25hbWVdIGlmIHJvdXRlIGlzIEB2aWV3c1tuYW1lXS5yb3V0ZVxuXG5cdCMgXHRpZiAhdmlldyB0aGVuIHJldHVybiBAdmlld3MuZm91ck9oRm91clxuXG5cdCMgXHR2aWV3XG5cblx0Z2V0Vmlld0J5Um91dGUgOiAocm91dGUpID0+XG5cblx0XHRmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHRcdHJldHVybiBAdmlld3NbbmFtZV0gaWYgcm91dGUgaXMgQHZpZXdzW25hbWVdLnJvdXRlXG5cblx0XHRpZiByb3V0ZSB0aGVuIHJldHVybiBAdmlld3MuZm91ck9oRm91clxuXG5cdFx0bnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdG51bGxcblxuXHRzdGFydCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9mZiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdEBiaW5kRXZlbnRzKClcblx0XHRAdXBkYXRlRGltcygpXG5cblx0XHRudWxsXG5cblx0YmluZEV2ZW50cyA6ID0+XG5cblx0XHRAQ0QoKS5uYXYub24gTmF2LkVWRU5UX0NIQU5HRV9WSUVXLCBAY2hhbmdlVmlld1xuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBAY2hhbmdlU3ViVmlld1xuXG5cdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1VQREFURV9ESU1FTlNJT05TLCBAdXBkYXRlRGltc1xuXG5cdFx0bnVsbFxuXG5cdHVwZGF0ZURpbXMgOiA9PlxuXG5cdFx0QCRlbC5jc3MgJ21pbi1oZWlnaHQnLCBAQ0QoKS5hcHBWaWV3LmRpbXMuaFxuXG5cdFx0bnVsbFxuXG5cdGNoYW5nZVZpZXcgOiAocHJldmlvdXMsIGN1cnJlbnQpID0+XG5cblx0XHRpZiBAcGFnZVN3aXRjaERmZCBhbmQgQHBhZ2VTd2l0Y2hEZmQuc3RhdGUoKSBpc250ICdyZXNvbHZlZCdcblx0XHRcdGRvIChwcmV2aW91cywgY3VycmVudCkgPT4gQHBhZ2VTd2l0Y2hEZmQuZG9uZSA9PiBAY2hhbmdlVmlldyBwcmV2aW91cywgY3VycmVudFxuXHRcdFx0cmV0dXJuXG5cblx0XHRAcHJldmlvdXNWaWV3ID0gQGdldFZpZXdCeVJvdXRlIHByZXZpb3VzLmFyZWFcblx0XHRAY3VycmVudFZpZXcgID0gQGdldFZpZXdCeVJvdXRlIGN1cnJlbnQuYXJlYVxuXG5cdFx0aWYgIUBwcmV2aW91c1ZpZXdcblx0XHRcdEB0cmFuc2l0aW9uVmlld3MgZmFsc2UsIEBjdXJyZW50Vmlld1xuXHRcdGVsc2Vcblx0XHRcdEB0cmFuc2l0aW9uVmlld3MgQHByZXZpb3VzVmlldywgQGN1cnJlbnRWaWV3XG5cblx0XHRudWxsXG5cblx0Y2hhbmdlU3ViVmlldyA6IChjdXJyZW50KSA9PlxuXG5cdFx0QGN1cnJlbnRWaWV3LnZpZXcudHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBjdXJyZW50LnN1YlxuXG5cdFx0bnVsbFxuXG5cdHRyYW5zaXRpb25WaWV3cyA6IChmcm9tLCB0bykgPT5cblxuXHRcdEBwYWdlU3dpdGNoRGZkID0gJC5EZWZlcnJlZCgpXG5cblx0XHRpZiBmcm9tIGFuZCB0b1xuXHRcdFx0QENEKCkuYXBwVmlldy50cmFuc2l0aW9uZXIucHJlcGFyZSBmcm9tLnJvdXRlLCB0by5yb3V0ZVxuXHRcdFx0QENEKCkuYXBwVmlldy50cmFuc2l0aW9uZXIuaW4gPT4gZnJvbS52aWV3LmhpZGUgPT4gdG8udmlldy5zaG93ID0+IEBDRCgpLmFwcFZpZXcudHJhbnNpdGlvbmVyLm91dCA9PiBAcGFnZVN3aXRjaERmZC5yZXNvbHZlKClcblx0XHRlbHNlIGlmIGZyb21cblx0XHRcdGZyb20udmlldy5oaWRlIEBwYWdlU3dpdGNoRGZkLnJlc29sdmVcblx0XHRlbHNlIGlmIHRvXG5cdFx0XHR0by52aWV3LnNob3cgQHBhZ2VTd2l0Y2hEZmQucmVzb2x2ZVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyYXBwZXJcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBDb250cmlidXRlUGFnZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1jb250cmlidXRlJ1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGxhYmVsX3N1Ym1pdCAgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2xhYmVsX3N1Ym1pdFwiXG5cdFx0XHRjb250ZW50X3N1Ym1pdCAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiY29udHJpYnV0ZV9jb250ZW50X3N1Ym1pdFwiXG5cdFx0XHRsYWJlbF9jb250YWN0ICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiY29udHJpYnV0ZV9sYWJlbF9jb250YWN0XCJcblx0XHRcdGNvbnRlbnRfY29udGFjdCA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2NvbnRlbnRfY29udGFjdFwiXG5cblx0XHRzdXBlclxuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cmlidXRlUGFnZVZpZXdcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBEb29kbGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWRvb2RsZSdcblx0bW9kZWwgICAgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IHt9XG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRmcmFtZSAgICAgICA9IEAkZWwuZmluZCgnW2RhdGEtZG9vZGxlLWZyYW1lXScpXG5cdFx0QCRpbmZvQ29udGVudCA9IEAkZWwuZmluZCgnW2RhdGEtZG9vZGxlLWluZm9dJylcblxuXHRcdEAkbW91c2UgICAgPSBAJGVsLmZpbmQoJ1tkYXRhLWluZGljYXRvcj1cIm1vdXNlXCJdJylcblx0XHRAJGtleWJvYXJkID0gQCRlbC5maW5kKCdbZGF0YS1pbmRpY2F0b3I9XCJrZXlib2FyZFwiXScpXG5cdFx0QCR0b3VjaCAgICA9IEAkZWwuZmluZCgnW2RhdGEtaW5kaWNhdG9yPVwidG91Y2hcIl0nKVxuXG5cdFx0QCRwcmV2RG9vZGxlTmF2ID0gQCRlbC5maW5kKCdbZGF0YS1kb29kbGUtbmF2PVwicHJldlwiXScpXG5cdFx0QCRuZXh0RG9vZGxlTmF2ID0gQCRlbC5maW5kKCdbZGF0YS1kb29kbGUtbmF2PVwibmV4dFwiXScpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3LmhlYWRlcltzZXR0aW5nXSBAQ0QoKS5hcHBWaWV3LmhlYWRlci5FVkVOVF9ET09ETEVfSU5GT19PUEVOLCBAb25JbmZvT3BlblxuXHRcdEBDRCgpLmFwcFZpZXcuaGVhZGVyW3NldHRpbmddIEBDRCgpLmFwcFZpZXcuaGVhZGVyLkVWRU5UX0RPT0RMRV9JTkZPX0NMT1NFLCBAb25JbmZvQ2xvc2Vcblx0XHRAJGVsW3NldHRpbmddICdjbGljaycsICdbZGF0YS1zaGFyZS1idG5dJywgQG9uU2hhcmVCdG5DbGlja1xuXG5cdFx0bnVsbFxuXG5cdHNob3cgOiAoY2IpID0+XG5cblx0XHRAbW9kZWwgPSBAZ2V0RG9vZGxlKClcblxuXHRcdEBzZXR1cFVJKClcblxuXHRcdHN1cGVyXG5cblx0XHRpZiBAQ0QoKS5uYXYuY2hhbmdlVmlld0NvdW50IGlzIDFcblx0XHRcdEBzaG93RnJhbWUgZmFsc2Vcblx0XHRlbHNlXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5vbiBAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5FVkVOVF9UUkFOU0lUSU9ORVJfT1VUX0RPTkUsIEBzaG93RnJhbWVcblxuXHRcdG51bGxcblxuXHRoaWRlIDogKGNiKSA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5oZWFkZXIuaGlkZURvb2RsZUluZm8oKVxuXG5cdFx0c3VwZXJcblxuXHRcdG51bGxcblxuXHRzZXR1cFVJIDogPT5cblxuXHRcdEAkaW5mb0NvbnRlbnQuaHRtbCBAZ2V0RG9vZGxlSW5mb0NvbnRlbnQoKVxuXG5cdFx0QCRlbC5hdHRyICdkYXRhLWNvbG9yLXNjaGVtZScsIEBtb2RlbC5nZXQoJ2NvbG91cl9zY2hlbWUnKVxuXHRcdEAkZnJhbWUuYXR0cignc3JjJywgJycpLnJlbW92ZUNsYXNzKCdzaG93Jylcblx0XHRAJG1vdXNlLmF0dHIgJ2Rpc2FibGVkJywgIUBtb2RlbC5nZXQoJ2ludGVyYWN0aW9uLm1vdXNlJylcblx0XHRAJGtleWJvYXJkLmF0dHIgJ2Rpc2FibGVkJywgIUBtb2RlbC5nZXQoJ2ludGVyYWN0aW9uLmtleWJvYXJkJylcblx0XHRAJHRvdWNoLmF0dHIgJ2Rpc2FibGVkJywgIUBtb2RlbC5nZXQoJ2ludGVyYWN0aW9uLnRvdWNoJylcblxuXHRcdEBzZXR1cE5hdkxpbmtzKClcblxuXHRcdG51bGxcblxuXHRzZXR1cE5hdkxpbmtzIDogPT5cblxuXHRcdHByZXZEb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZ2V0UHJldkRvb2RsZSBAbW9kZWxcblx0XHRuZXh0RG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmdldE5leHREb29kbGUgQG1vZGVsXG5cblx0XHRpZiBwcmV2RG9vZGxlXG5cdFx0XHRAJHByZXZEb29kbGVOYXYuYXR0cignaHJlZicsIHByZXZEb29kbGUuZ2V0KCd1cmwnKSkuYWRkQ2xhc3MoJ3Nob3cnKVxuXHRcdGVsc2Vcblx0XHRcdEAkcHJldkRvb2RsZU5hdi5yZW1vdmVDbGFzcygnc2hvdycpXG5cblx0XHRpZiBuZXh0RG9vZGxlXG5cdFx0XHRAJG5leHREb29kbGVOYXYuYXR0cignaHJlZicsIG5leHREb29kbGUuZ2V0KCd1cmwnKSkuYWRkQ2xhc3MoJ3Nob3cnKVxuXHRcdGVsc2Vcblx0XHRcdEAkbmV4dERvb2RsZU5hdi5yZW1vdmVDbGFzcygnc2hvdycpXG5cblx0XHRudWxsXG5cblx0c2hvd0ZyYW1lIDogKHJlbW92ZUV2ZW50PXRydWUpID0+XG5cblx0XHRpZiByZW1vdmVFdmVudCB0aGVuIEBDRCgpLmFwcFZpZXcudHJhbnNpdGlvbmVyLm9mZiBAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5FVkVOVF9UUkFOU0lUSU9ORVJfT1VUX0RPTkUsIEBzaG93RnJhbWVcblxuXHRcdCMgVEVNUCwgT0JWWlxuXHRcdHNyY0RpciA9IGlmIEBtb2RlbC5nZXQoJ2NvbG91cl9zY2hlbWUnKSBpcyAnbGlnaHQnIHRoZW4gJ3NoYXBlLXN0cmVhbS1saWdodCcgZWxzZSAnc2hhcGUtc3RyZWFtJ1xuXG5cdFx0QCRmcmFtZS5hdHRyICdzcmMnLCBcImh0dHA6Ly9zb3VyY2UuY29kZWRvb2RsLmVzL3NhbXBsZV9kb29kbGVzLyN7c3JjRGlyfS9pbmRleC5odG1sXCJcblx0XHRAJGZyYW1lLm9uZSAnbG9hZCcsID0+IEAkZnJhbWUuYWRkQ2xhc3MoJ3Nob3cnKVxuXG5cdFx0bnVsbFxuXG5cdGdldERvb2RsZSA6ID0+XG5cblx0XHRkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZ2V0RG9vZGxlQnlTbHVnIEBDRCgpLm5hdi5jdXJyZW50LnN1YisnLycrQENEKCkubmF2LmN1cnJlbnQudGVyXG5cblx0XHRkb29kbGVcblxuXHRnZXREb29kbGVJbmZvQ29udGVudCA6ID0+XG5cblx0XHQjIG5vIG5lZWQgdG8gZG8gdGhpcyBmb3IgZXZlcnkgZG9vZGxlIC0gb25seSBkbyBpdCBpZiB3ZSB2aWV3IHRoZSBpbmZvIHBhbmUgZm9yIGEgcGFydGljdWxhciBkb29kbGVcblx0XHRAbW9kZWwuc2V0U2hvcnRsaW5rKClcblxuXHRcdGRvb2RsZUluZm9WYXJzID1cblx0XHRcdGluZGV4SFRNTCAgICAgICAgICAgICAgICAgIDogQG1vZGVsLmdldCgnaW5kZXhIVE1MJylcblx0XHRcdGxhYmVsX2F1dGhvciAgICAgICAgICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9sYWJlbF9hdXRob3JcIlxuXHRcdFx0Y29udGVudF9hdXRob3IgICAgICAgICAgICAgOiBAbW9kZWwuZ2V0QXV0aG9ySHRtbCgpXG5cdFx0XHRsYWJlbF9kb29kbGVfbmFtZSAgICAgICAgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJkb29kbGVfbGFiZWxfZG9vZGxlX25hbWVcIlxuXHRcdFx0Y29udGVudF9kb29kbGVfbmFtZSAgICAgICAgOiBAbW9kZWwuZ2V0KCduYW1lJylcblx0XHRcdGxhYmVsX2Rlc2NyaXB0aW9uICAgICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9sYWJlbF9kZXNjcmlwdGlvblwiXG5cdFx0XHRjb250ZW50X2Rlc2NyaXB0aW9uICAgICAgICA6IEBtb2RlbC5nZXQoJ2Rlc2NyaXB0aW9uJylcblx0XHRcdGxhYmVsX3RhZ3MgICAgICAgICAgICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9sYWJlbF90YWdzXCJcblx0XHRcdGNvbnRlbnRfdGFncyAgICAgICAgICAgICAgIDogQG1vZGVsLmdldCgndGFncycpLmpvaW4oJywgJylcblx0XHRcdGxhYmVsX2ludGVyYWN0aW9uICAgICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9sYWJlbF9pbnRlcmFjdGlvblwiXG5cdFx0XHRjb250ZW50X2ludGVyYWN0aW9uICAgICAgICA6IEBfZ2V0SW50ZXJhY3Rpb25Db250ZW50KClcblx0XHRcdGxhYmVsX3NoYXJlICAgICAgICAgICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9sYWJlbF9zaGFyZVwiXG5cdFx0XHRzaGFyZV91cmwgICAgICAgICAgICAgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQG1vZGVsLmdldCgnc2hvcnRsaW5rJylcblx0XHRcdHNoYXJlX3VybF90ZXh0ICAgICAgICAgICAgIDogQENEKCkuQkFTRV9VUkwucmVwbGFjZSgnaHR0cDovLycsICcnKSArICcvJyArIEBtb2RlbC5nZXQoJ3Nob3J0bGluaycpXG5cblx0XHRkb29kbGVJbmZvQ29udGVudCA9IF8udGVtcGxhdGUoQENEKCkudGVtcGxhdGVzLmdldCgnZG9vZGxlLWluZm8nKSkoZG9vZGxlSW5mb1ZhcnMpXG5cblx0XHRkb29kbGVJbmZvQ29udGVudFxuXG5cdF9nZXRJbnRlcmFjdGlvbkNvbnRlbnQgOiA9PlxuXG5cdFx0aW50ZXJhY3Rpb25zID0gW11cblxuXHRcdGlmIEBtb2RlbC5nZXQoJ2ludGVyYWN0aW9uLm1vdXNlJykgdGhlbiBpbnRlcmFjdGlvbnMucHVzaCBAQ0QoKS5sb2NhbGUuZ2V0IFwiZG9vZGxlX2xhYmVsX2ludGVyYWN0aW9uX21vdXNlXCJcblx0XHRpZiBAbW9kZWwuZ2V0KCdpbnRlcmFjdGlvbi5rZXlib2FyZCcpIHRoZW4gaW50ZXJhY3Rpb25zLnB1c2ggQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9sYWJlbF9pbnRlcmFjdGlvbl9rZXlib2FyZFwiXG5cdFx0aWYgQG1vZGVsLmdldCgnaW50ZXJhY3Rpb24udG91Y2gnKSB0aGVuIGludGVyYWN0aW9ucy5wdXNoIEBDRCgpLmxvY2FsZS5nZXQgXCJkb29kbGVfbGFiZWxfaW50ZXJhY3Rpb25fdG91Y2hcIlxuXG5cdFx0aW50ZXJhY3Rpb25zLmpvaW4oJywgJykgb3IgQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9sYWJlbF9pbnRlcmFjdGlvbl9ub25lXCJcblxuXHRvbkluZm9PcGVuIDogPT5cblxuXHRcdEAkZWwuYWRkQ2xhc3MoJ3Nob3ctaW5mbycpXG5cblx0XHRudWxsXG5cblx0b25JbmZvQ2xvc2UgOiA9PlxuXG5cdFx0QCRlbC5yZW1vdmVDbGFzcygnc2hvdy1pbmZvJylcblxuXHRcdG51bGxcblxuXHRvblNoYXJlQnRuQ2xpY2sgOiAoZSkgPT5cblxuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXG5cdFx0dXJsICAgICAgICAgPSAnICdcblx0XHRkZXNjICAgICAgICA9IEBnZXRTaGFyZURlc2MoKVxuXHRcdHNoYXJlTWV0aG9kID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtc2hhcmUtYnRuJylcblxuXHRcdEBDRCgpLnNoYXJlW3NoYXJlTWV0aG9kXSB1cmwsIGRlc2NcblxuXHRcdG51bGxcblxuXHRnZXRTaGFyZURlc2MgOiA9PlxuXG5cdFx0dmFycyA9XG5cdFx0XHRkb29kbGVfbmFtZSAgIDogQG1vZGVsLmdldCAnbmFtZSdcblx0XHRcdGRvb2RsZV9hdXRob3IgOiBpZiBAbW9kZWwuZ2V0KCdhdXRob3IudHdpdHRlcicpIHRoZW4gXCJAI3tAbW9kZWwuZ2V0KCdhdXRob3IudHdpdHRlcicpfVwiIGVsc2UgQG1vZGVsLmdldCgnYXV0aG9yLm5hbWUnKVxuXHRcdFx0c2hhcmVfdXJsICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQG1vZGVsLmdldCgnc2hvcnRsaW5rJylcblx0XHRcdGRvb2RsZV90YWdzICAgOiBfLm1hcChAbW9kZWwuZ2V0KCd0YWdzJyksICh0YWcpIC0+ICcjJyArIHRhZykuam9pbignICcpXG5cblx0XHRkZXNjID0gQHN1cHBsYW50U3RyaW5nIEBDRCgpLmxvY2FsZS5nZXQoJ2Rvb2RsZV9zaGFyZV90ZXh0X3RtcGwnKSwgdmFycywgZmFsc2VcblxuXHRcdGRlc2MucmVwbGFjZSgvJm5ic3A7L2csICcgJylcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIEZvdXJPaEZvdXJQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWZvdXItb2gtZm91cidcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID1cblx0XHRcdHRleHQgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiZm91cl9vaF9mb3VyX3BhZ2VfdGV4dFwiXG5cblx0XHRzdXBlclxuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGb3VyT2hGb3VyUGFnZVZpZXdcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuSG9tZVZpZXcgICAgICAgICAgICAgPSByZXF1aXJlICcuL0hvbWVWaWV3J1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgSG9tZUdyaWRJdGVtIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0dGVtcGxhdGUgOiAnaG9tZS1ncmlkLWl0ZW0nXG5cblx0dmlzaWJsZSA6IGZhbHNlXG5cblx0b2Zmc2V0ICAgICAgIDogMFxuXG5cdG1heE9mZnNldCAgICA6IG51bGxcblx0YWNjZWxlcmF0aW9uIDogbnVsbFxuXHRlYXNlICAgICAgICAgOiBudWxsXG5cblx0SVRFTV9NSU5fT0ZGU0VUIDogNTBcblx0SVRFTV9NQVhfT0ZGU0VUIDogMjAwXG5cdCMgSVRFTV9NSU5fQUNDRUwgIDogNVxuXHQjIElURU1fTUFYX0FDQ0VMICA6IDUwXG5cdElURU1fTUlOX0VBU0UgICA6IDEwMFxuXHRJVEVNX01BWF9FQVNFICAgOiA0MDBcblxuXHRjb25zdHJ1Y3RvciA6IChAbW9kZWwsIEBwYXJlbnRHcmlkKSAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IF8uZXh0ZW5kIHt9LCBAbW9kZWwudG9KU09OKClcblxuXHRcdCMgQG1heE9mZnNldCAgICA9IChfLnJhbmRvbSBASVRFTV9NSU5fT0ZGU0VULCBASVRFTV9NQVhfT0ZGU0VUKSAvIDEwXG5cdFx0IyBAYWNjZWxlcmF0aW9uID0gKF8ucmFuZG9tIEBJVEVNX01JTl9BQ0NFTCwgQElURU1fTUFYX0FDQ0VMKSAvIDEwXG5cdFx0IyBAZWFzZSAgICAgICAgID0gKF8ucmFuZG9tIEBJVEVNX01JTl9FQVNFLCBASVRFTV9NQVhfRUFTRSkgLyAxMDBcblxuXHRcdHN1cGVyXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdHNldE9mZnNldEFuZEVhc2UgOiAoaWR4LCBjb2xDb3VudCkgPT5cblxuXHRcdCMgaWR4ID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmluZGV4T2YgQG1vZGVsXG5cdFx0QG1heE9mZnNldCA9ICgoKGlkeCAlIGNvbENvdW50KSArIDEpICogQElURU1fTUlOX09GRlNFVCkgLyAxMFxuXHRcdEBlYXNlID0gKCgoaWR4ICUgY29sQ291bnQpICsgMSkgKiBASVRFTV9NSU5fRUFTRSkgLyAxMDBcblxuXHRcdG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkYXV0aG9yTmFtZSA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmQ9XCJhdXRob3JfbmFtZVwiXScpXG5cdFx0QCRkb29kbGVOYW1lID0gQCRlbC5maW5kKCdbZGF0YS1jb2Rld29yZD1cIm5hbWVcIl0nKVxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QCRlbFtzZXR0aW5nXSAnbW91c2VvdmVyJywgQG9uTW91c2VPdmVyXG5cdFx0QHBhcmVudEdyaWRbc2V0dGluZ10gQHBhcmVudEdyaWQuRVZFTlRfVElDSywgQG9uVGlja1xuXG5cdFx0bnVsbFxuXG5cdHNob3cgOiAoYW5pbWF0ZVRleHQ9ZmFsc2UpID0+XG5cblx0XHRAdmlzaWJsZSA9IHRydWVcblx0XHRAJGVsLmFkZENsYXNzICdzaG93LWl0ZW0nXG5cblx0XHRpZiBhbmltYXRlVGV4dFxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnYXV0aG9yLm5hbWUnKSwgQCRhdXRob3JOYW1lLCAnYmx1ZSdcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ25hbWUnKSwgQCRkb29kbGVOYW1lLCAnYmx1ZSdcblxuXHRcdCMgQHNldExpc3RlbmVycyAnb24nXG5cblx0XHRudWxsXG5cblx0aGlkZSA6ID0+XG5cblx0XHRAdmlzaWJsZSA9IGZhbHNlXG5cdFx0QCRlbC5yZW1vdmVDbGFzcyAnc2hvdy1pdGVtJ1xuXG5cdFx0bnVsbFxuXG5cdG9uTW91c2VPdmVyIDogPT5cblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ2F1dGhvci5uYW1lJyksIEAkYXV0aG9yTmFtZSwgJ2JsdWUnXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnbmFtZScpLCBAJGRvb2RsZU5hbWUsICdibHVlJ1xuXG5cdFx0bnVsbFxuXG5cdG9uVGljayA6IChzY3JvbGxEZWx0YSkgPT5cblxuXHRcdCMgaWYgIUB2aXNpYmxlIHRoZW4gcmV0dXJuIEBvZmZzZXQgPSAwXG5cblx0XHRzY3JvbGxEZWx0YSA9IHNjcm9sbERlbHRhICo9IDAuNFxuXG5cdFx0IyBtYXhEZWx0YSA9IDEwMFxuXHRcdGlmIHNjcm9sbERlbHRhID4gQG1heE9mZnNldFxuXHRcdFx0c2Nyb2xsRGVsdGEgPSBAbWF4T2Zmc2V0XG5cdFx0ZWxzZSBpZiBzY3JvbGxEZWx0YSA8IC1AbWF4T2Zmc2V0XG5cdFx0XHRzY3JvbGxEZWx0YSA9IC1AbWF4T2Zmc2V0XG5cdFx0ZWxzZVxuXHRcdFx0c2Nyb2xsRGVsdGEgPSAoc2Nyb2xsRGVsdGEgLyBAbWF4T2Zmc2V0KSAqIEBtYXhPZmZzZXRcblxuXHRcdCMgZmFjdG9yID0gc2Nyb2xsRGVsdGEgLyBtYXhEZWx0YVxuXG5cdFx0IyBAb2Zmc2V0ID0gQG9mZnNldCAtPSAoQGFjY2VsZXJhdGlvbiAqIGZhY3Rvcilcblx0XHQjIGlmIHNjcm9sbERlbHRhID4gMVxuXHRcdCMgXHRAb2Zmc2V0IC09IEBhY2NlbGVyYXRpb25cblx0XHQjIGVsc2UgaWYgc2Nyb2xsRGVsdGEgPCAtMVxuXHRcdCMgXHRAb2Zmc2V0ICs9IEBhY2NlbGVyYXRpb25cblx0XHQjIGVsc2UgaWYgQG9mZnNldCA+IDFcblx0XHQjIFx0QG9mZnNldCAtPSBAYWNjZWxlcmF0aW9uXG5cdFx0IyBlbHNlIGlmIEBvZmZzZXQgPCAtMVxuXHRcdCMgXHRAb2Zmc2V0ICs9IEBhY2NlbGVyYXRpb25cblx0XHQjIGVsc2Vcblx0XHQjIFx0QG9mZnNldCA9IDBcblxuXHRcdCMgQG9mZnNldCA9IGZhY3RvciAqIEBtYXhPZmZzZXRcblx0XHQjIGlmIEBvZmZzZXQgPD0gMSBhbmQgQG9mZnNldCA+PSAtMSB0aGVuIEBvZmZzZXQgPSAwXG5cblx0XHRAb2Zmc2V0ID0gc2Nyb2xsRGVsdGEgKiBAZWFzZVxuXG5cdFx0IyBjb25zb2xlLmxvZyBcInVwZGF0ZURyYWcgOiAoc2Nyb2xsRGVsdGEpID0+XCIsIEBvZmZzZXRcblxuXHRcdEAkZWwuY3NzICd0cmFuc2Zvcm0nIDogQENTU1RyYW5zbGF0ZSAwLCBAb2Zmc2V0LCAncHgnXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZUdyaWRJdGVtXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcbkhvbWVHcmlkSXRlbSAgICAgPSByZXF1aXJlICcuL0hvbWVHcmlkSXRlbSdcblxuY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0IyBtYW5hZ2Ugc3RhdGUgZm9yIGhvbWVWaWV3IG9uIHBlci1zZXNzaW9uIGJhc2lzLCBhbGxvdyBudW1iZXIgb2Zcblx0IyBncmlkIGl0ZW1zLCBhbmQgc2Nyb2xsIHBvc2l0aW9uIG9mIGhvbWUgZ3JpZCB0byBiZSBwZXJzaXN0ZWRcblx0QHZpc2l0ZWRUaGlzU2Vzc2lvbiA6IGZhbHNlXG5cdEBncmlkSXRlbXMgOiBbXVxuXHRAZGltcyA6XG5cdFx0aXRlbSAgICAgIDogaDogMjY4LCB3OiAyMDAsIG1hcmdpbjogMjAsIGE6IDBcblx0XHRjb250YWluZXIgOiBoOiAwLCB3OiAwLCBhOiAwLCBwdDogMjVcblx0QGNvbENvdW50IDogMFxuXG5cdEBzY3JvbGxEZWx0YSAgICA6IDBcblx0QHNjcm9sbERpc3RhbmNlIDogMFxuXG5cdCMgckFGXG5cdEB0aWNraW5nIDogZmFsc2VcblxuXHRAU0hPV19ST1dfVEhSRVNIT0xEIDogMC4zICMgaG93IG11Y2ggb2YgYSBncmlkIHJvdyAoc2NhbGUgMCAtPiAxKSBtdXN0IGJlIHZpc2libGUgYmVmb3JlIGl0IGlzIFwic2hvd25cIlxuXG5cdEVWRU5UX1RJQ0sgOiAnRVZFTlRfVElDSydcblxuXHR0ZW1wbGF0ZSAgICAgIDogJ3BhZ2UtaG9tZSdcblx0YWRkVG9TZWxlY3RvciA6ICdbZGF0YS1ob21lLWdyaWRdJ1xuXG5cdGFsbERvb2RsZXMgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IHt9XG5cblx0XHRAYWxsRG9vZGxlcyA9IEBDRCgpLmFwcERhdGEuZG9vZGxlc1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0QGFkZEdyaWRJdGVtcygpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGFkZEdyaWRJdGVtcyA6ID0+XG5cblx0XHRmb3IgZG9vZGxlIGluIEBhbGxEb29kbGVzLm1vZGVsc1xuXG5cdFx0XHRpdGVtID0gbmV3IEhvbWVHcmlkSXRlbSBkb29kbGUsIEBcblx0XHRcdEhvbWVWaWV3LmdyaWRJdGVtcy5wdXNoIGl0ZW1cblx0XHRcdEBhZGRDaGlsZCBpdGVtXG5cblx0XHRudWxsXG5cblx0IyBwb3NpdGlvbkdyaWRJdGVtcyA6ID0+XG5cblx0IyBcdGZvciBpdGVtLCBpZHggaW4gSG9tZVZpZXcuZ3JpZEl0ZW1zXG5cblx0IyBcdFx0dG9wID0gKE1hdGguZmxvb3IoaWR4IC8gSG9tZVZpZXcuY29sQ291bnQpICogSG9tZVZpZXcuZGltcy5pdGVtLmgpICsgSG9tZVZpZXcuZGltcy5jb250YWluZXIucHRcblx0IyBcdFx0bGVmdCA9ICgoaWR4ICUgSG9tZVZpZXcuY29sQ291bnQpICogSG9tZVZpZXcuZGltcy5pdGVtLncpICsgKGlkeCAlIEhvbWVWaWV3LmNvbENvdW50KSAqIEhvbWVWaWV3LmRpbXMuaXRlbS5tYXJnaW5cblxuXHQjIFx0XHRpdGVtLiRlbC5jc3Ncblx0IyBcdFx0XHQndG9wJzogdG9wXG5cdCMgXHRcdFx0J2xlZnQnOiBsZWZ0XG5cblx0IyBcdEAkZ3JpZC5jc3MgJ2hlaWdodCc6IE1hdGguY2VpbChIb21lVmlldy5ncmlkSXRlbXMubGVuZ3RoIC8gSG9tZVZpZXcuY29sQ291bnQpICogSG9tZVZpZXcuZGltcy5pdGVtLmhcblxuXHQjIFx0bnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRncmlkID0gQCRlbC5maW5kKCdbZGF0YS1ob21lLWdyaWRdJylcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEBDRCgpLmFwcFZpZXdbc2V0dGluZ10gQENEKCkuYXBwVmlldy5FVkVOVF9VUERBVEVfRElNRU5TSU9OUywgQG9uUmVzaXplXG5cdFx0IyBAQ0QoKS5hcHBWaWV3W3NldHRpbmddIEBDRCgpLmFwcFZpZXcuRVZFTlRfT05fU0NST0xMLCBAb25TY3JvbGxcblxuXHRcdEBDRCgpLmFwcFZpZXcuaGVhZGVyW3NldHRpbmddIEBDRCgpLmFwcFZpZXcuaGVhZGVyLkVWRU5UX0hPTUVfU0NST0xMX1RPX1RPUCwgQHNjcm9sbFRvVG9wXG5cblx0XHRpZiBzZXR0aW5nIGlzICdvZmYnXG5cdFx0XHRAc2Nyb2xsZXIub2ZmICdzY3JvbGwnLCBAb25TY3JvbGxcblx0XHRcdEBzY3JvbGxlci5vZmYgJ3Njcm9sbFN0YXJ0JywgQG9uU2Nyb2xsU3RhcnRcblx0XHRcdEBzY3JvbGxlci5vZmYgJ3Njcm9sbEVuZCcsIEBvblNjcm9sbEVuZFxuXHRcdFx0QHNjcm9sbGVyLmRlc3Ryb3koKVxuXHRcdFx0QHNjcm9sbGVyID0gbnVsbFxuXG5cdFx0bnVsbFxuXG5cdHNldHVwRGltcyA6ID0+XG5cblx0XHRncmlkV2lkdGggPSBAJGdyaWQub3V0ZXJXaWR0aCgpXG5cblx0XHRIb21lVmlldy5jb2xDb3VudCA9IE1hdGgucm91bmQgZ3JpZFdpZHRoIC8gSG9tZVZpZXcuZGltcy5pdGVtLndcblx0XHRcblx0XHRIb21lVmlldy5kaW1zLmNvbnRhaW5lciA9XG5cdFx0XHRoOiBAQ0QoKS5hcHBWaWV3LmRpbXMuaCwgdzogZ3JpZFdpZHRoLCBhOiAoQENEKCkuYXBwVmlldy5kaW1zLmggKiBncmlkV2lkdGgpLCBwdDogMjVcblxuXHRcdEhvbWVWaWV3LmRpbXMuaXRlbS5hID0gSG9tZVZpZXcuZGltcy5pdGVtLmggKiAoSG9tZVZpZXcuZGltcy5pdGVtLncgKyAoKEhvbWVWaWV3LmRpbXMuaXRlbS5tYXJnaW4gKiAoSG9tZVZpZXcuY29sQ291bnQgLSAxKSkgLyBIb21lVmlldy5jb2xDb3VudCkpXG5cblx0XHRudWxsXG5cblx0c2V0dXBJU2Nyb2xsIDogPT5cblxuXHRcdGlTY3JvbGxPcHRzID0gXG5cdFx0XHRwcm9iZVR5cGUgICAgICAgICAgICAgOiAzXG5cdFx0XHRtb3VzZVdoZWVsICAgICAgICAgICAgOiB0cnVlXG5cdFx0XHRzY3JvbGxiYXJzICAgICAgICAgICAgOiB0cnVlXG5cdFx0XHRpbnRlcmFjdGl2ZVNjcm9sbGJhcnMgOiB0cnVlXG5cdFx0XHRmYWRlU2Nyb2xsYmFycyAgICAgICAgOiB0cnVlXG5cdFx0XHRtb21lbnR1bSAgICAgICAgICAgICAgOiBmYWxzZVxuXHRcdFx0Ym91bmNlICAgICAgICAgICAgICAgIDogZmFsc2VcblxuXHRcdEBzY3JvbGxlciA9IG5ldyBJU2Nyb2xsIEAkZWxbMF0sIGlTY3JvbGxPcHRzXG5cblx0XHRAc2Nyb2xsZXIub24gJ3Njcm9sbCcsIEBvblNjcm9sbFxuXHRcdEBzY3JvbGxlci5vbiAnc2Nyb2xsU3RhcnQnLCBAb25TY3JvbGxTdGFydFxuXHRcdEBzY3JvbGxlci5vbiAnc2Nyb2xsRW5kJywgQG9uU2Nyb2xsRW5kXG5cblx0XHRudWxsXG5cblx0c2V0SXRlbXNPZmZzZXRBbmRFYXNlIDogPT5cblxuXHRcdChpdGVtLnNldE9mZnNldEFuZEVhc2UgaSwgSG9tZVZpZXcuY29sQ291bnQpIGZvciBpdGVtLCBpIGluIEhvbWVWaWV3LmdyaWRJdGVtc1xuXG5cdFx0bnVsbFxuXG5cdG9uUmVzaXplIDogPT5cblxuXHRcdEBzZXR1cERpbXMoKVxuXHRcdEBzZXRJdGVtc09mZnNldEFuZEVhc2UoKVxuXG5cdFx0aWYgQHNjcm9sbGVyXG5cdFx0XHRAb25TY3JvbGwoKVxuXHRcdFx0QG9uU2Nyb2xsRW5kKClcblxuXHRcdG51bGxcblxuXHRvblNjcm9sbFN0YXJ0IDogPT5cblxuXHRcdEAkZ3JpZC5yZW1vdmVDbGFzcyAnZW5hYmxlLWdyaWQtaXRlbS1ob3ZlcidcblxuXHRcdGlmICFAdGlja2luZ1xuXHRcdFx0QHRpY2tpbmcgPSB0cnVlXG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgQG9uVGlja1xuXG5cdFx0bnVsbFxuXG5cdG9uU2Nyb2xsRW5kIDogPT5cblxuXHRcdEAkZ3JpZC5hZGRDbGFzcyAnZW5hYmxlLWdyaWQtaXRlbS1ob3Zlcidcblx0XHRIb21lVmlldy5zY3JvbGxEZWx0YSA9IDBcblxuXHRcdEBzZXRWaXNpYmxlSXRlbXNBc1Nob3duKClcblxuXHRcdG51bGxcblxuXHRvblNjcm9sbCA6ID0+XG5cblx0XHQjIHJldHVybiBmYWxzZVxuXG5cdFx0IyBIb21lVmlldy5zY3JvbGxEaXN0YW5jZSA9IEBDRCgpLmFwcFZpZXcubGFzdFNjcm9sbFlcblx0XHRpZiBAc2Nyb2xsZXJcblx0XHRcdEhvbWVWaWV3LnNjcm9sbERlbHRhID0gLUBzY3JvbGxlci55IC0gSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2Vcblx0XHRcdEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlID0gLUBzY3JvbGxlci55XG5cdFx0ZWxzZVxuXHRcdFx0SG9tZVZpZXcuc2Nyb2xsRGVsdGEgPSBIb21lVmlldy5zY3JvbGxEaXN0YW5jZSA9IDBcblxuXHRcdCMgY29uc29sZS5sb2cgJ2RlbHRyb25nJywgSG9tZVZpZXcuc2Nyb2xsRGVsdGFcblxuXHRcdCMgaXRlbXNUb1Nob3cgPSBAZ2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSgpXG5cdFx0IyBpZiBpdGVtc1RvU2hvdyA+IDAgdGhlbiBAYWRkRG9vZGxlcyBpdGVtc1RvU2hvd1xuXG5cdFx0QGNoZWNrSXRlbXNGb3JWaXNpYmlsaXR5KClcblxuXHRcdG51bGxcblxuXHRvblRpY2sgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcInRpY2suLi5cIlxuXHRcdEB0cmlnZ2VyIEBFVkVOVF9USUNLLCBIb21lVmlldy5zY3JvbGxEZWx0YVxuXG5cdFx0c2hvdWxkVGljayA9IGZhbHNlXG5cdFx0Zm9yIGl0ZW0sIGkgaW4gSG9tZVZpZXcuZ3JpZEl0ZW1zXG5cdFx0XHRpZiBpdGVtLm9mZnNldCBpc250IDBcblx0XHRcdFx0c2hvdWxkVGljayA9IHRydWUgXG5cdFx0XHRcdGJyZWFrXG5cblx0XHRpZiBzaG91bGRUaWNrXG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUgQG9uVGlja1xuXHRcdGVsc2Vcblx0XHRcdEB0aWNraW5nID0gZmFsc2VcblxuXHRcdG51bGxcblxuXHRzY3JvbGxUb1RvcCA6ID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIEBzY3JvbGxlclxuXHRcdEBzY3JvbGxlci5zY3JvbGxUbyAwLCAwLCA3MDAsIElTY3JvbGwudXRpbHMuZWFzZS5xdWFkcmF0aWNcblxuXHRcdG51bGxcblxuXHRzaG93IDogPT5cblxuXHRcdHN1cGVyXG5cblx0XHRudWxsXG5cblx0c3RhcnRTY3JvbGxlciA6ID0+XG5cblx0XHRAc2V0dXBEaW1zKClcblxuXHRcdEBzZXR1cElTY3JvbGwoKVxuXHRcdEBzY3JvbGxlci5zY3JvbGxUbyAwLCAtSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2Vcblx0XHRAc2V0SXRlbXNPZmZzZXRBbmRFYXNlKClcblxuXHRcdEBvblNjcm9sbCgpXG5cdFx0QG9uU2Nyb2xsRW5kKClcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0QHNldHVwRGltcygpXG5cdFx0IyBAcG9zaXRpb25HcmlkSXRlbXMoKVxuXG5cdFx0aWYgIUhvbWVWaWV3LnZpc2l0ZWRUaGlzU2Vzc2lvblxuXHRcdFx0IyBAYWRkRG9vZGxlcyBAZ2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSgpLCB0cnVlXG5cdFx0XHRIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb24gPSB0cnVlXG5cdFx0XHRAYW5pbWF0ZUluSW5pdGlhbEl0ZW1zIEBzdGFydFNjcm9sbGVyXG5cdFx0ZWxzZVxuXHRcdFx0QHN0YXJ0U2Nyb2xsZXIoKVxuXG5cdFx0bnVsbFxuXG5cdHNldFZpc2libGVJdGVtc0FzU2hvd24gOiA9PlxuXG5cdFx0aXRlbXNUb1Nob3cgPSBbXVxuXHRcdGZvciBpdGVtLCBpIGluIEhvbWVWaWV3LmdyaWRJdGVtc1xuXG5cdFx0XHRwb3NpdGlvbiA9IEBfZ2V0SXRlbVBvc2l0aW9uRGF0YUJ5SW5kZXggaVxuXG5cdFx0XHRpZiBwb3NpdGlvbi52aXNpYmlsaXR5ID4gMFxuXHRcdFx0XHRpdGVtc1RvU2hvdy5wdXNoIGl0ZW1cblx0XHRcdGVsc2Vcblx0XHRcdFx0aXRlbS5oaWRlKClcblxuXHRcdGZvciBpdGVtLCBpIGluIGl0ZW1zVG9TaG93XG5cblx0XHRcdGRvIChpdGVtLCBpKSA9PlxuXHRcdFx0XHRzZXRUaW1lb3V0IGl0ZW0uc2hvdywgKDUwMCAqIDAuMSkgKiBpXG5cblx0XHRudWxsXG5cblx0Y2hlY2tJdGVtc0ZvclZpc2liaWxpdHkgOiA9PlxuXG5cdFx0Zm9yIGl0ZW0sIGkgaW4gSG9tZVZpZXcuZ3JpZEl0ZW1zXG5cblx0XHRcdHBvc2l0aW9uID0gQF9nZXRJdGVtUG9zaXRpb25EYXRhQnlJbmRleCBpXG5cdFx0XHRvZmZzZXQgPSBpdGVtLm1heE9mZnNldCAtIChwb3NpdGlvbi52aXNpYmlsaXR5ICogaXRlbS5tYXhPZmZzZXQpXG5cblx0XHRcdGl0ZW0uJGVsLmNzc1xuXHRcdFx0XHQndmlzaWJpbGl0eScgOiBpZiBwb3NpdGlvbi52aXNpYmlsaXR5ID4gMCB0aGVuICd2aXNpYmxlJyBlbHNlICdoaWRkZW4nXG5cdFx0XHRcdCdvcGFjaXR5JyA6IGlmIHBvc2l0aW9uLnZpc2liaWxpdHkgPiAwIHRoZW4gMSBlbHNlIDBcblx0XHRcdFx0IyAnb3BhY2l0eScgOiBpZiBwb3NpdGlvbi52aXNpYmlsaXR5ID4gMCB0aGVuIHBvc2l0aW9uLnZpc2liaWxpdHkgKyAwLjMgZWxzZSAwXG5cdFx0XHRcdCMgJ3RyYW5zZm9ybScgOiBcInRyYW5zbGF0ZTNkKDAsICN7cG9zaXRpb24udHJhbnNmb3JtfSN7b2Zmc2V0fXB4LCAwKVwiXG5cblx0XHRcdCMgaXRlbS4kZWwuZmluZCgnLmdyaWQtaXRlbS10aHVtYi1ob2xkZXInKS5jc3Ncblx0XHRcdCMgXHQnb3BhY2l0eScgOiBpZiBwb3NpdGlvbi52aXNpYmlsaXR5ID4gMCB0aGVuIHBvc2l0aW9uLnZpc2liaWxpdHkgZWxzZSAwXG5cdFx0XHQjIFx0J3RyYW5zZm9ybScgOiBcInNjYWxlKCN7cG9zaXRpb24udmlzaWJpbGl0eX0pIHRyYW5zbGF0ZSgtNTAlLCAtNTAlKVwiXG5cblx0XHRudWxsXG5cblx0X2dldEl0ZW1Qb3NpdGlvbkRhdGFCeUluZGV4IDogKGlkeCkgPT5cblxuXHRcdHZlcnRpY2FsT2Zmc2V0ID0gKE1hdGguZmxvb3IoaWR4IC8gSG9tZVZpZXcuY29sQ291bnQpICogSG9tZVZpZXcuZGltcy5pdGVtLmgpICsgSG9tZVZpZXcuZGltcy5jb250YWluZXIucHRcblx0XHRwb3NpdGlvbiA9IHZpc2liaWxpdHk6IDEsIHRyYW5zZm9ybTogJysnXG5cblx0XHRpZiB2ZXJ0aWNhbE9mZnNldCArIEhvbWVWaWV3LmRpbXMuaXRlbS5oIDwgSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2Ugb3IgdmVydGljYWxPZmZzZXQgPiBIb21lVmlldy5zY3JvbGxEaXN0YW5jZSArIEhvbWVWaWV3LmRpbXMuY29udGFpbmVyLmhcblx0XHRcdHBvc2l0aW9uID0gdmlzaWJpbGl0eTogMCwgdHJhbnNmb3JtOiAnKydcblx0XHRlbHNlIGlmIHZlcnRpY2FsT2Zmc2V0ID4gSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2UgYW5kIHZlcnRpY2FsT2Zmc2V0ICsgSG9tZVZpZXcuZGltcy5pdGVtLmggPCBIb21lVmlldy5zY3JvbGxEaXN0YW5jZSArIEhvbWVWaWV3LmRpbXMuY29udGFpbmVyLmhcblx0XHRcdHBvc2l0aW9uID0gdmlzaWJpbGl0eTogMSwgdHJhbnNmb3JtOiAnKydcblx0XHRlbHNlIGlmIHZlcnRpY2FsT2Zmc2V0IDwgSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2UgYW5kIHZlcnRpY2FsT2Zmc2V0ICsgSG9tZVZpZXcuZGltcy5pdGVtLmggPiBIb21lVmlldy5zY3JvbGxEaXN0YW5jZVxuXHRcdFx0cGVyYyA9IDEgLSAoKEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlIC0gdmVydGljYWxPZmZzZXQpIC8gSG9tZVZpZXcuZGltcy5pdGVtLmgpXG5cdFx0XHRwb3NpdGlvbiA9IHZpc2liaWxpdHk6IHBlcmMsIHRyYW5zZm9ybTogJy0nXG5cdFx0ZWxzZSBpZiB2ZXJ0aWNhbE9mZnNldCA8IEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlICsgSG9tZVZpZXcuZGltcy5jb250YWluZXIuaCBhbmQgdmVydGljYWxPZmZzZXQgKyBIb21lVmlldy5kaW1zLml0ZW0uaCA+IEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlICsgSG9tZVZpZXcuZGltcy5jb250YWluZXIuaFxuXHRcdFx0cGVyYyA9ICgoSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2UgKyBIb21lVmlldy5kaW1zLmNvbnRhaW5lci5oKSAtIHZlcnRpY2FsT2Zmc2V0KSAvIEhvbWVWaWV3LmRpbXMuaXRlbS5oXG5cdFx0XHRwb3NpdGlvbiA9IHZpc2liaWxpdHk6IHBlcmMsIHRyYW5zZm9ybTogJysnXG5cblx0XHRwb3NpdGlvblxuXG5cdGdldFJlcXVpcmVkRG9vZGxlQ291bnRCeUFyZWEgOiA9PlxuXG5cdFx0dG90YWxBcmVhICA9IEhvbWVWaWV3LmRpbXMuY29udGFpbmVyLmEgKyAoSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2UgKiBIb21lVmlldy5kaW1zLmNvbnRhaW5lci53KVxuXHRcdHRhcmdldFJvd3MgPSAodG90YWxBcmVhIC8gSG9tZVZpZXcuZGltcy5pdGVtLmEpIC8gSG9tZVZpZXcuY29sQ291bnRcblxuXHRcdHRhcmdldEl0ZW1zID0gTWF0aC5mbG9vcih0YXJnZXRSb3dzKSAqIEhvbWVWaWV3LmNvbENvdW50XG5cdFx0dGFyZ2V0SXRlbXMgPSBpZiAodGFyZ2V0Um93cyAlIDEpID4gSG9tZVZpZXcuU0hPV19ST1dfVEhSRVNIT0xEIHRoZW4gdGFyZ2V0SXRlbXMgKyBIb21lVmlldy5jb2xDb3VudCBlbHNlIHRhcmdldEl0ZW1zXG5cblx0XHQjIHJldHVybiB0YXJnZXRJdGVtcyAtIEhvbWVWaWV3LmdyaWRJdGVtcy5sZW5ndGhcblx0XHRyZXR1cm4gdGFyZ2V0SXRlbXNcblxuXHQjIGFkZERvb2RsZXMgOiAoY291bnQsIGZ1bGxQYWdlVHJhbnNpdGlvbj1mYWxzZSkgPT5cblxuXHQjIFx0Y29uc29sZS5sb2cgXCJhZGRpbmcgZG9vZGxlcy4uLiB4I3tjb3VudH1cIlxuXG5cdCMgXHRuZXdJdGVtcyA9IFtdXG5cblx0IyBcdGZvciBpZHggaW4gW0hvbWVWaWV3LmdyaWRJdGVtcy5sZW5ndGguLi5Ib21lVmlldy5ncmlkSXRlbXMubGVuZ3RoK2NvdW50XVxuXG5cdCMgXHRcdGRvb2RsZSA9IEBhbGxEb29kbGVzLmF0IGlkeFxuXHQjIFx0XHRicmVhayBpZiAhZG9vZGxlXG5cblx0IyBcdFx0bmV3SXRlbXMucHVzaCBuZXcgSG9tZUdyaWRJdGVtIGRvb2RsZVxuXG5cdCMgXHRIb21lVmlldy5ncmlkSXRlbXMgPSBIb21lVmlldy5ncmlkSXRlbXMuY29uY2F0IG5ld0l0ZW1zXG5cblx0IyBcdGZvciBpdGVtLCBpZHggaW4gbmV3SXRlbXNcblxuXHQjIFx0XHRAYWRkQ2hpbGQgaXRlbVxuXHQjIFx0XHRAYW5pbWF0ZUl0ZW1JbiBpdGVtLCBpZHgsIGZ1bGxQYWdlVHJhbnNpdGlvblxuXG5cdCMgXHRudWxsXG5cblx0YW5pbWF0ZUluSW5pdGlhbEl0ZW1zIDogKGNiKSA9PlxuXG5cdFx0aXRlbUNvdW50ID0gQGdldFJlcXVpcmVkRG9vZGxlQ291bnRCeUFyZWEoKVxuXG5cdFx0Y29uc29sZS5sb2cgXCJpdGVtQ291bnQgPSBAZ2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSgpXCIsIGl0ZW1Db3VudFxuXG5cdFx0Zm9yIGkgaW4gWzAuLi5pdGVtQ291bnRdXG5cdFx0XHRwYXJhbXMgPSBbSG9tZVZpZXcuZ3JpZEl0ZW1zW2ldLCBpLCB0cnVlXVxuXHRcdFx0aWYgaSBpcyBpdGVtQ291bnQtMSB0aGVuIHBhcmFtcy5wdXNoIGNiXG5cdFx0XHRAYW5pbWF0ZUl0ZW1Jbi5hcHBseSBALCBwYXJhbXNcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSXRlbUluIDogKGl0ZW0sIGluZGV4LCBmdWxsUGFnZVRyYW5zaXRpb249ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRkdXJhdGlvbiAgID0gMC40XG5cdFx0ZnJvbVBhcmFtcyA9IHkgOiAoaWYgZnVsbFBhZ2VUcmFuc2l0aW9uIHRoZW4gd2luZG93LmlubmVySGVpZ2h0IGVsc2UgMCksIG9wYWNpdHkgOiAwLCBzY2FsZSA6IDAuNlxuXHRcdHRvUGFyYW1zICAgPSBkZWxheSA6IChkdXJhdGlvbiAqIDAuMikgKiBpbmRleCwgeSA6IDAsIG9wYWNpdHkgOiAxLCBzY2FsZSA6IDEgLCBlYXNlIDogRXhwby5lYXNlT3V0XG5cblx0XHRpZiBjYiB0aGVuIHRvUGFyYW1zLm9uQ29tcGxldGUgPSA9PlxuXHRcdFx0QCRncmlkLnJlbW92ZUNsYXNzICdiZWZvcmUtaW50cm8tYW5pbWF0aW9uJ1xuXHRcdFx0Y2IoKVxuXG5cdFx0VHdlZW5MaXRlLmZyb21UbyBpdGVtLiRlbCwgZHVyYXRpb24sIGZyb21QYXJhbXMsIHRvUGFyYW1zXG5cblx0XHRudWxsXG5cbndpbmRvdy5Ib21lVmlldyA9IEhvbWVWaWV3XG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZVZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RNb2RhbCBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCR3aW5kb3cgOiBudWxsXG5cblx0IyMjIG92ZXJyaWRlIGluIGluZGl2aWR1YWwgY2xhc3NlcyAjIyNcblx0bmFtZSAgICAgOiBudWxsXG5cdHRlbXBsYXRlIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEAkd2luZG93ID0gJCh3aW5kb3cpXG5cblx0XHRzdXBlcigpXG5cblx0XHRAQ0QoKS5hcHBWaWV3LmFkZENoaWxkIEBcblx0XHRAc2V0TGlzdGVuZXJzICdvbidcblx0XHRAYW5pbWF0ZUluKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aGlkZSA6ID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PiBAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAc2V0TGlzdGVuZXJzICdvZmYnXG5cdFx0QENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIubW9kYWxzW0BuYW1lXS52aWV3ID0gbnVsbFxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QCR3aW5kb3dbc2V0dGluZ10gJ2tleXVwJywgQG9uS2V5VXBcblx0XHRAJCgnW2RhdGEtY2xvc2VdJylbc2V0dGluZ10gJ2NsaWNrJywgQGNsb3NlQ2xpY2tcblxuXHRcdG51bGxcblxuXHRvbktleVVwIDogKGUpID0+XG5cblx0XHRpZiBlLmtleUNvZGUgaXMgMjcgdGhlbiBAaGlkZSgpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IFF1YWQuZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwuZmluZCgnLmlubmVyJyksIDAuMywgeyBkZWxheSA6IDAuMTUsICd0cmFuc2Zvcm0nOiAnc2NhbGUoMSknLCAndmlzaWJpbGl0eSc6ICd2aXNpYmxlJywgJ29wYWNpdHknOiAxLCBlYXNlIDogQmFjay5lYXNlT3V0IH1cblxuXHRcdG51bGxcblxuXHRhbmltYXRlT3V0IDogKGNhbGxiYWNrKSA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwsIDAuMywgeyBkZWxheSA6IDAuMTUsICdvcGFjaXR5JzogMCwgZWFzZSA6IFF1YWQuZWFzZU91dCwgb25Db21wbGV0ZTogY2FsbGJhY2sgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgJ3RyYW5zZm9ybSc6ICdzY2FsZSgwLjgpJywgJ29wYWNpdHknOiAwLCBlYXNlIDogQmFjay5lYXNlSW4gfVxuXG5cdFx0bnVsbFxuXG5cdGNsb3NlQ2xpY2s6ICggZSApID0+XG5cblx0XHRlLnByZXZlbnREZWZhdWx0KClcblxuXHRcdEBoaWRlKClcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdE1vZGFsXG4iLCJBYnN0cmFjdE1vZGFsID0gcmVxdWlyZSAnLi9BYnN0cmFjdE1vZGFsJ1xuXG5jbGFzcyBPcmllbnRhdGlvbk1vZGFsIGV4dGVuZHMgQWJzdHJhY3RNb2RhbFxuXG5cdG5hbWUgICAgIDogJ29yaWVudGF0aW9uTW9kYWwnXG5cdHRlbXBsYXRlIDogJ29yaWVudGF0aW9uLW1vZGFsJ1xuXG5cdGNiICAgICAgIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogKEBjYikgLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSB7QG5hbWV9XG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiAoc3RpbGxMYW5kc2NhcGU9dHJ1ZSkgPT5cblxuXHRcdEBhbmltYXRlT3V0ID0+XG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cdFx0XHRpZiAhc3RpbGxMYW5kc2NhcGUgdGhlbiBAY2I/KClcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHN1cGVyXG5cblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddICd1cGRhdGVEaW1zJywgQG9uVXBkYXRlRGltc1xuXHRcdEAkZWxbc2V0dGluZ10gJ3RvdWNoZW5kIGNsaWNrJywgQGhpZGVcblxuXHRcdG51bGxcblxuXHRvblVwZGF0ZURpbXMgOiAoZGltcykgPT5cblxuXHRcdGlmIGRpbXMubyBpcyAncG9ydHJhaXQnIHRoZW4gQGhpZGUgZmFsc2VcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBPcmllbnRhdGlvbk1vZGFsXG4iLCJBYnN0cmFjdFZpZXcgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuT3JpZW50YXRpb25Nb2RhbCA9IHJlcXVpcmUgJy4vT3JpZW50YXRpb25Nb2RhbCdcblxuY2xhc3MgTW9kYWxNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0IyB3aGVuIG5ldyBtb2RhbCBjbGFzc2VzIGFyZSBjcmVhdGVkLCBhZGQgaGVyZSwgd2l0aCByZWZlcmVuY2UgdG8gY2xhc3MgbmFtZVxuXHRtb2RhbHMgOlxuXHRcdG9yaWVudGF0aW9uTW9kYWwgOiBjbGFzc1JlZiA6IE9yaWVudGF0aW9uTW9kYWwsIHZpZXcgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRpc09wZW4gOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiByZXR1cm4gdHJ1ZSApIGZvciBuYW1lLCBtb2RhbCBvZiBAbW9kYWxzXG5cblx0XHRmYWxzZVxuXG5cdGhpZGVPcGVuTW9kYWwgOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiBvcGVuTW9kYWwgPSBAbW9kYWxzW25hbWVdLnZpZXcgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0b3Blbk1vZGFsPy5oaWRlKClcblxuXHRcdG51bGxcblxuXHRzaG93TW9kYWwgOiAobmFtZSwgY2I9bnVsbCkgPT5cblxuXHRcdHJldHVybiBpZiBAbW9kYWxzW25hbWVdLnZpZXdcblxuXHRcdEBtb2RhbHNbbmFtZV0udmlldyA9IG5ldyBAbW9kYWxzW25hbWVdLmNsYXNzUmVmIGNiXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxNYW5hZ2VyXG4iXX0=
