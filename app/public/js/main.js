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



},{"./App":5}],2:[function(require,module,exports){
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



},{"./AppData":6,"./AppView":7,"./data/Locale":15,"./data/Templates":16,"./router/Nav":23,"./router/Router":24,"./utils/Analytics":25,"./utils/AuthManager":26,"./utils/Facebook":28,"./utils/GooglePlus":29,"./utils/MediaQueries":30,"./utils/Share":33}],6:[function(require,module,exports){
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



},{"./collections/doodles/DoodlesCollection":11,"./data/API":13,"./data/AbstractData":14,"./utils/Requester":32}],7:[function(require,module,exports){
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



},{"./view/AbstractView":34,"./view/base/Footer":37,"./view/base/Header":38,"./view/base/PageTransitioner":39,"./view/base/Preloader":40,"./view/base/Wrapper":41,"./view/modals/_ModalManager":48}],8:[function(require,module,exports){
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



},{}],9:[function(require,module,exports){
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



},{"../../models/contributor/ContributorModel":18,"../AbstractCollection":8}],10:[function(require,module,exports){
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



},{"../../models/core/TemplateModel":21}],11:[function(require,module,exports){
var AbstractCollection, DoodleModel, DoodlesCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractCollection = require('../AbstractCollection');

DoodleModel = require('../../models/doodle/DoodleModel');

DoodlesCollection = (function(_super) {
  __extends(DoodlesCollection, _super);

  function DoodlesCollection() {
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

  return DoodlesCollection;

})(AbstractCollection);

module.exports = DoodlesCollection;



},{"../../models/doodle/DoodleModel":22,"../AbstractCollection":8}],12:[function(require,module,exports){
var Colors;

Colors = {
  CD_RED: '#EB423E',
  CD_BLUE: '#395CAA',
  CD_BLACK: '#111111',
  OFF_WHITE: '#F1F1F3'
};

module.exports = Colors;



},{}],13:[function(require,module,exports){
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



},{"../models/core/APIRouteModel":19}],14:[function(require,module,exports){
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



},{}],15:[function(require,module,exports){
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



},{"../data/API":13,"../models/core/LocalesModel":20}],16:[function(require,module,exports){
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



},{"../collections/core/TemplatesCollection":10,"../models/core/TemplateModel":21}],17:[function(require,module,exports){
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



},{}],18:[function(require,module,exports){
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
      links.push("<a href=\"http://twitter.com/" + attrs.twitter + "\">tw</a>");
    }
    if (attrs.github) {
      links.push("<a href=\"http://github.com/" + attrs.github + "\">gh</a>");
    }
    html += "(" + (links.join(', ')) + ")";
    return html;
  };

  return ContributorModel;

})(AbstractModel);

module.exports = ContributorModel;



},{"../../utils/CodeWordTransitioner":27,"../../utils/NumberUtils":31,"../AbstractModel":17}],19:[function(require,module,exports){
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



},{}],20:[function(require,module,exports){
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



},{}],21:[function(require,module,exports){
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



},{}],22:[function(require,module,exports){
var AbstractModel, CodeWordTransitioner, DoodleModel, NumberUtils,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModel = require('../AbstractModel');

NumberUtils = require('../../utils/NumberUtils');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

DoodleModel = (function(_super) {
  __extends(DoodleModel, _super);

  function DoodleModel() {
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
    "index": null,
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
      attrs.index = NumberUtils.zeroFill(attrs.index, 3);
    }
    if (attrs.name && attrs.author.name) {
      attrs.scrambled = {
        name: CodeWordTransitioner.getScrambledWord(attrs.name),
        author_name: CodeWordTransitioner.getScrambledWord(attrs.author.name)
      };
    }
    if (attrs.index) {
      attrs.indexHTML = this.getIndexHTML(attrs.index);
    }
    return attrs;
  };

  DoodleModel.prototype.getIndexHTML = function(index) {
    var HTML, char, className, _i, _len, _ref;
    HTML = "";
    _ref = index.split('');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      char = _ref[_i];
      className = char === '0' ? 'index-char-zero' : 'index-char-nonzero';
      HTML += "<span class=\"" + className + "\">" + char + "</span>";
    }
    return HTML;
  };

  return DoodleModel;

})(AbstractModel);

module.exports = DoodleModel;



},{"../../utils/CodeWordTransitioner":27,"../../utils/NumberUtils":31,"../AbstractModel":17}],23:[function(require,module,exports){
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
    this.setPageFavicon(area);
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

  Nav.prototype.setPageFavicon = function(area) {
    var colour;
    colour = (function() {
      switch (area) {
        case this.sections.HOME:
          return 'red';
        case this.sections.ABOUT:
        case this.sections.CONTRIBUTE:
          return 'black';
        case this.sections.DOODLES:
          return 'blue';
        default:
          return 'red';
      }
    }).call(this);
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



},{"../view/AbstractView":34,"./Router":24}],24:[function(require,module,exports){
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



},{}],25:[function(require,module,exports){

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



},{}],26:[function(require,module,exports){
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



},{"../data/AbstractData":14,"../utils/Facebook":28,"../utils/GooglePlus":29}],27:[function(require,module,exports){
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

  CodeWordTransitioner._getWordFromCache = function($el) {
    var id, word;
    id = $el.attr('data-codeword-id');
    if (id && CodeWordTransitioner._wordCache[id]) {
      word = CodeWordTransitioner._wordCache[id];
    } else {
      CodeWordTransitioner._wrapChars($el);
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

  CodeWordTransitioner._wrapChars = function($el) {
    var char, chars, html, state, _i, _len;
    chars = $el.text().split('');
    state = $el.attr('data-codeword-initial-state') || "";
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

  CodeWordTransitioner._isWordEmpty = function(word) {
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

window.CodeWordTransitioner = CodeWordTransitioner;



},{"ent/encode":3}],28:[function(require,module,exports){
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



},{"../data/AbstractData":14}],29:[function(require,module,exports){
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



},{"../data/AbstractData":14}],30:[function(require,module,exports){
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



},{}],31:[function(require,module,exports){
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



},{}],32:[function(require,module,exports){

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



},{}],33:[function(require,module,exports){

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



},{}],34:[function(require,module,exports){
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



},{}],35:[function(require,module,exports){
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



},{"./AbstractView":34}],36:[function(require,module,exports){
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
    this.contributors = new ContributorsCollection;
    this.templateVars = {
      label_what: this.CD().locale.get("about_label_what"),
      content_what: this.CD().locale.get("about_content_what"),
      label_contact: this.CD().locale.get("about_label_contact"),
      content_contact: this.CD().locale.get("about_content_contact"),
      label_who: this.CD().locale.get("about_label_who")
    };
    AboutPageView.__super__.constructor.apply(this, arguments);
    this.getContributorsContent();
    return null;
  }

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



},{"../../collections/contributors/ContributorsCollection":9,"../../data/API":13,"../../utils/Requester":32,"../AbstractViewPage":35}],37:[function(require,module,exports){
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



},{"../AbstractView":34}],38:[function(require,module,exports){
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

  function Header() {
    this.onWordLeave = __bind(this.onWordLeave, this);
    this.onWordEnter = __bind(this.onWordEnter, this);
    this.animateTextIn = __bind(this.animateTextIn, this);
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
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.ABOUT
      },
      contribute: {
        label: this.CD().locale.get('header_contribute_label'),
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.CONTRIBUTE
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
    colour = this.getSectionColour(section);
    this.$el.attr('data-section', section);
    CodeWordTransitioner["in"](this.$logo, colour);
    if (section === this.CD().nav.sections.HOME) {
      CodeWordTransitioner["in"]([this.$navLinkAbout, this.$navLinkContribute], colour);
      CodeWordTransitioner.out([this.$closeBtn, this.$infoBtn], colour);
    } else if (section === this.CD().nav.sections.DOODLES) {
      CodeWordTransitioner["in"]([this.$closeBtn, this.$infoBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$navLinkContribute], colour);
    } else {
      CodeWordTransitioner["in"]([this.$closeBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$navLinkContribute, this.$infoBtn], colour);
    }
    return null;
  };

  Header.prototype.getSectionColour = function(section) {
    var colour;
    section = section || this.CD().nav.current.area || 'home';
    colour = (function() {
      switch (section) {
        case 'home':
          return 'red';
        case this.CD().nav.sections.ABOUT:
          return 'white';
        case this.CD().nav.sections.CONTRIBUTE:
          return 'white';
        default:
          return 'white';
      }
    }).call(this);
    return colour;
  };

  Header.prototype.animateTextIn = function() {
    this.onAreaChange(this.CD().nav.current.area);
    return null;
  };

  Header.prototype.onWordEnter = function(e) {
    var $el;
    $el = $(e.currentTarget);
    CodeWordTransitioner.scramble($el, this.getSectionColour());
    return null;
  };

  Header.prototype.onWordLeave = function(e) {
    var $el;
    $el = $(e.currentTarget);
    CodeWordTransitioner.unscramble($el, this.getSectionColour());
    return null;
  };

  return Header;

})(AbstractView);

module.exports = Header;



},{"../../router/Router":24,"../../utils/CodeWordTransitioner":27,"../AbstractView":34}],39:[function(require,module,exports){
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

  PageTransitioner.prototype.palettes = {
    HOME: [Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED],
    ABOUT: [Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE],
    CONTRIBUTE: [Colors.CD_BLUE, Colors.OFF_WHITE, Colors.CD_RED],
    DOODLES: [Colors.CD_RED, Colors.OFF_WHITE, Colors.CD_BLUE]
  };

  PageTransitioner.prototype.activeConfig = {
    prop: null,
    start: {
      top: null,
      bottom: null,
      left: null,
      right: null,
      width: null,
      height: null
    },
    end: {
      top: null,
      bottom: null,
      left: null,
      right: null,
      width: null,
      height: null
    }
  };

  PageTransitioner.prototype.configPresets = {
    bottomToTop: {
      prop: 'height',
      start: {
        top: 'auto',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: 0
      },
      end: {
        top: 0,
        bottom: 'auto',
        left: 0,
        right: 0,
        width: '100%',
        height: '100%'
      }
    },
    topToBottom: {
      prop: 'height',
      start: {
        top: 0,
        bottom: 'auto',
        left: 0,
        right: 0,
        width: '100%',
        height: 0
      },
      end: {
        top: 'auto',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100%'
      }
    },
    leftToRight: {
      prop: 'width',
      start: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 'auto',
        width: 0,
        height: '100%'
      },
      end: {
        top: 0,
        bottom: 0,
        left: 'auto',
        right: 0,
        width: '100%',
        height: '100%'
      }
    },
    rightToLeft: {
      prop: 'width',
      start: {
        top: 0,
        bottom: 0,
        left: 'auto',
        right: 0,
        width: 0,
        height: '100%'
      },
      end: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 'auto',
        width: '100%',
        height: '100%'
      }
    }
  };

  function PageTransitioner() {
    this.out = __bind(this.out, this);
    this["in"] = __bind(this["in"], this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    this.applyConfig = __bind(this.applyConfig, this);
    this._getRandomConfig = __bind(this._getRandomConfig, this);
    this._getDoodleToDoodleConfig = __bind(this._getDoodleToDoodleConfig, this);
    this.getConfig = __bind(this.getConfig, this);
    this.applyPalette = __bind(this.applyPalette, this);
    this.getPalette = __bind(this.getPalette, this);
    this.resetPanes = __bind(this.resetPanes, this);
    this.prepare = __bind(this.prepare, this);
    this.init = __bind(this.init, this);
    this.templateVars = {};
    PageTransitioner.__super__.constructor.call(this);
    return null;
  }

  PageTransitioner.prototype.init = function() {
    this.$panes = this.$el.find('[data-pane]');
    return null;
  };

  PageTransitioner.prototype.prepare = function(fromArea, toArea) {
    this.resetPanes();
    this.applyPalette(this.getPalette(toArea));
    this.activeConfig = this.getConfig(fromArea, toArea);
    this.applyConfig(this.activeConfig.start);
    return null;
  };

  PageTransitioner.prototype.resetPanes = function() {
    this.$panes.attr({
      'style': ''
    });
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
      config = this._getDoodleToDoodleConfig("" + (this.CD().nav.previous.sub) + "/" + (this.CD().nav.previous.ter), "" + (this.CD().nav.current.sub) + "/" + (this.CD().nav.current.ter));
    } else if (toArea === this.CD().nav.sections.ABOUT || toArea === this.CD().nav.sections.CONTRIBUTE) {
      config = this._getRandomConfig();
    } else {
      config = this._getRandomConfig();
    }
    return config;
  };

  PageTransitioner.prototype._getDoodleToDoodleConfig = function(prevSlug, nextSlug) {
    var currentDoodle, currentDoodleIdx, previousDoodle, previousDoodleIdx, _config;
    previousDoodle = this.CD().appData.doodles.findWhere({
      slug: prevSlug
    });
    previousDoodleIdx = this.CD().appData.doodles.indexOf(previousDoodle);
    currentDoodle = this.CD().appData.doodles.findWhere({
      slug: nextSlug
    });
    currentDoodleIdx = this.CD().appData.doodles.indexOf(currentDoodle);
    _config = previousDoodleIdx > currentDoodleIdx ? this.configPresets.leftToRight : this.configPresets.rightToLeft;
    return _config;
  };

  PageTransitioner.prototype._getRandomConfig = function() {
    var _config;
    _config = _.shuffle(this.configPresets)[0];
    return _config;
  };

  PageTransitioner.prototype.applyConfig = function(config) {
    this.$panes.css(config);
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
    this.show();
    this.$panes.each((function(_this) {
      return function(i, el) {
        var params;
        params = {
          ease: Expo.easeOut
        };
        params.delay = i * 0.1;
        params[_this.activeConfig.prop] = '100%';
        if (i === 2) {
          params.onComplete = function() {
            _this.applyConfig(_this.activeConfig.end);
            return typeof cb === "function" ? cb() : void 0;
          };
        }
        return TweenLite.to($(el), 0.5, params);
      };
    })(this));
    return null;
  };

  PageTransitioner.prototype.out = function(cb) {
    this.$panes.each((function(_this) {
      return function(i, el) {
        var params;
        params = {
          ease: Expo.easeOut
        };
        params.delay = 0.2 - (0.1 * i);
        params[_this.activeConfig.prop] = '0';
        if (i === 0) {
          params.onComplete = function() {
            _this.hide();
            return typeof cb === "function" ? cb() : void 0;
          };
        }
        return TweenLite.to($(el), 0.5, params);
      };
    })(this));
    return null;
  };

  return PageTransitioner;

})(AbstractView);

module.exports = PageTransitioner;



},{"../../config/Colors":12,"../AbstractView":34,"../home/HomeView":45}],40:[function(require,module,exports){
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



},{"../../utils/CodeWordTransitioner":27,"../AbstractView":34}],41:[function(require,module,exports){
var AboutPageView, AbstractView, ContributePageView, DoodlePageView, HomeView, Nav, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

HomeView = require('../home/HomeView');

AboutPageView = require('../aboutPage/AboutPageView');

ContributePageView = require('../contributePage/ContributePageView');

DoodlePageView = require('../doodlePage/DoodlePageView');

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



},{"../../router/Nav":23,"../AbstractView":34,"../aboutPage/AboutPageView":36,"../contributePage/ContributePageView":42,"../doodlePage/DoodlePageView":43,"../home/HomeView":45}],42:[function(require,module,exports){
var AbstractViewPage, ContributePageView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

ContributePageView = (function(_super) {
  __extends(ContributePageView, _super);

  ContributePageView.prototype.template = 'page-contribute';

  function ContributePageView() {
    this.templateVars = {
      desc: this.CD().locale.get("contribute_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    ContributePageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  return ContributePageView;

})(AbstractViewPage);

module.exports = ContributePageView;



},{"../AbstractViewPage":35}],43:[function(require,module,exports){
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
    this.getDoodle = __bind(this.getDoodle, this);
    this.show = __bind(this.show, this);
    this.templateVars = {
      desc: this.CD().locale.get("doodle_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    DoodlePageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  DoodlePageView.prototype.show = function() {
    this.model = this.getDoodle();
    DoodlePageView.__super__.show.apply(this, arguments);
    return null;
  };

  DoodlePageView.prototype.getDoodle = function() {
    var doodle;
    doodle = this.CD().appData.doodles.getDoodleBySlug(this.CD().nav.current.sub + '/' + this.CD().nav.current.ter);
    return doodle;
  };

  return DoodlePageView;

})(AbstractViewPage);

module.exports = DoodlePageView;



},{"../AbstractViewPage":35}],44:[function(require,module,exports){
var AbstractView, CodeWordTransitioner, HomeGridItem,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

HomeGridItem = (function(_super) {
  __extends(HomeGridItem, _super);

  HomeGridItem.prototype.template = 'home-grid-item';

  function HomeGridItem(model, fullPageTransition) {
    this.model = model;
    this.fullPageTransition = fullPageTransition;
    this.onMouseOver = __bind(this.onMouseOver, this);
    this.show = __bind(this.show, this);
    this.setListeners = __bind(this.setListeners, this);
    this.init = __bind(this.init, this);
    this.templateVars = _.extend({}, this.model.toJSON());
    HomeGridItem.__super__.constructor.apply(this, arguments);
    return null;
  }

  HomeGridItem.prototype.init = function() {
    this.$authorName = this.$el.find('[data-codeword="author_name"]');
    this.$doodleName = this.$el.find('[data-codeword="name"]');
    return null;
  };

  HomeGridItem.prototype.setListeners = function(setting) {
    this.$el[setting]('mouseover', this.onMouseOver);
    return null;
  };

  HomeGridItem.prototype.show = function() {
    this.$el.addClass('show-item');
    CodeWordTransitioner.to(this.model.get('author.name'), this.$authorName, 'blue');
    CodeWordTransitioner.to(this.model.get('name'), this.$doodleName, 'blue');
    this.setListeners('on');
    return null;
  };

  HomeGridItem.prototype.onMouseOver = function() {
    CodeWordTransitioner.to(this.model.get('author.name'), this.$authorName, 'blue');
    CodeWordTransitioner.to(this.model.get('name'), this.$doodleName, 'blue');
    return null;
  };

  return HomeGridItem;

})(AbstractView);

module.exports = HomeGridItem;



},{"../../utils/CodeWordTransitioner":27,"../AbstractView":34}],45:[function(require,module,exports){
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
      a: 0
    }
  };

  HomeView.colCount = 0;

  HomeView.scrollDistance = 0;

  HomeView.SHOW_ROW_THRESHOLD = 0.3;

  HomeView.prototype.template = 'page-home';

  HomeView.prototype.addToSelector = '[data-home-grid]';

  HomeView.prototype.allDoodles = null;

  function HomeView() {
    this.animateItemIn = __bind(this.animateItemIn, this);
    this.addDoodles = __bind(this.addDoodles, this);
    this.getRequiredDoodleCountByArea = __bind(this.getRequiredDoodleCountByArea, this);
    this.animateIn = __bind(this.animateIn, this);
    this.show = __bind(this.show, this);
    this.onScroll = __bind(this.onScroll, this);
    this.onResize = __bind(this.onResize, this);
    this.setListeners = __bind(this.setListeners, this);
    this.setupDims = __bind(this.setupDims, this);
    this.init = __bind(this.init, this);
    this.templateVars = {
      desc: this.CD().locale.get("home_desc")
    };
    this.allDoodles = this.CD().appData.doodles;
    HomeView.__super__.constructor.call(this);
    return null;
  }

  HomeView.prototype.init = function() {
    this.$grid = this.$el.find('[data-home-grid]');
    return null;
  };

  HomeView.prototype.setupDims = function() {
    var gridWidth;
    gridWidth = this.$grid.outerWidth();
    HomeView.colCount = Math.round(gridWidth / HomeView.dims.item.w);
    HomeView.dims.container = {
      h: this.CD().appView.dims.h,
      w: gridWidth,
      a: this.CD().appView.dims.h * gridWidth
    };
    HomeView.dims.item.a = HomeView.dims.item.h * (HomeView.dims.item.w + ((HomeView.dims.item.margin * (HomeView.colCount - 1)) / HomeView.colCount));
    return null;
  };

  HomeView.prototype.setListeners = function(setting) {
    this.CD().appView[setting](this.CD().appView.EVENT_UPDATE_DIMENSIONS, this.onResize);
    this.CD().appView[setting](this.CD().appView.EVENT_ON_SCROLL, this.onScroll);
    return null;
  };

  HomeView.prototype.onResize = function() {
    this.setupDims();
    this.onScroll();
    return null;
  };

  HomeView.prototype.onScroll = function() {
    var itemsToShow;
    HomeView.scrollDistance = this.CD().appView.lastScrollY;
    itemsToShow = this.getRequiredDoodleCountByArea();
    if (itemsToShow > 0) {
      this.addDoodles(itemsToShow);
    }
    return null;
  };

  HomeView.prototype.show = function() {
    HomeView.__super__.show.apply(this, arguments);
    return null;
  };

  HomeView.prototype.animateIn = function() {
    this.setupDims();
    if (!HomeView.visitedThisSession) {
      this.addDoodles(this.getRequiredDoodleCountByArea(), true);
      HomeView.visitedThisSession = true;
    } else {
      this.CD().appView.$window.scrollTop(HomeView.scrollDistance);
    }
    return null;
  };

  HomeView.prototype.getRequiredDoodleCountByArea = function() {
    var targetItems, targetRows, totalArea;
    totalArea = HomeView.dims.container.a + (HomeView.scrollDistance * HomeView.dims.container.w);
    targetRows = (totalArea / HomeView.dims.item.a) / HomeView.colCount;
    targetItems = Math.floor(targetRows) * HomeView.colCount;
    targetItems = (targetRows % 1) > HomeView.SHOW_ROW_THRESHOLD ? targetItems + HomeView.colCount : targetItems;
    return targetItems - HomeView.gridItems.length;
  };

  HomeView.prototype.addDoodles = function(count, fullPageTransition) {
    var doodle, idx, item, newItems, _i, _j, _len, _ref, _ref1;
    if (fullPageTransition == null) {
      fullPageTransition = false;
    }
    console.log("adding doodles... x" + count);
    newItems = [];
    for (idx = _i = _ref = HomeView.gridItems.length, _ref1 = HomeView.gridItems.length + count; _ref <= _ref1 ? _i < _ref1 : _i > _ref1; idx = _ref <= _ref1 ? ++_i : --_i) {
      doodle = this.allDoodles.at(idx);
      if (!doodle) {
        break;
      }
      newItems.push(new HomeGridItem(doodle, fullPageTransition));
    }
    HomeView.gridItems = HomeView.gridItems.concat(newItems);
    for (idx = _j = 0, _len = newItems.length; _j < _len; idx = ++_j) {
      item = newItems[idx];
      this.addChild(item);
      this.animateItemIn(item, idx, fullPageTransition);
    }
    return null;
  };

  HomeView.prototype.animateItemIn = function(item, index, fullPageTransition) {
    var duration, fromParams, toParams;
    if (fullPageTransition == null) {
      fullPageTransition = false;
    }
    duration = 0.5;
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
      ease: Expo.easeOut,
      onComplete: item.show
    };
    TweenLite.fromTo(item.$el, duration, fromParams, toParams);
    return null;
  };

  return HomeView;

})(AbstractViewPage);

module.exports = HomeView;



},{"../AbstractViewPage":35,"./HomeGridItem":44}],46:[function(require,module,exports){
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



},{"../AbstractView":34}],47:[function(require,module,exports){
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



},{"./AbstractModal":46}],48:[function(require,module,exports){
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



},{"../AbstractView":34,"./OrientationModal":47}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50L2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9lbnQvcmV2ZXJzZWQuanNvbiIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHAuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcFZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL0Fic3RyYWN0Q29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvY29udHJpYnV0b3JzL0NvbnRyaWJ1dG9yc0NvbGxlY3Rpb24uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL2NvcmUvVGVtcGxhdGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29uZmlnL0NvbG9ycy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BUEkuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvQWJzdHJhY3REYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0xvY2FsZS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9UZW1wbGF0ZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9BYnN0cmFjdE1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29udHJpYnV0b3IvQ29udHJpYnV0b3JNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvQVBJUm91dGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvTG9jYWxlc01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvZG9vZGxlL0Rvb2RsZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvTmF2LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9BbmFseXRpY3MuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0F1dGhNYW5hZ2VyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvRmFjZWJvb2suY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0dvb2dsZVBsdXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL01lZGlhUXVlcmllcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvTnVtYmVyVXRpbHMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1JlcXVlc3Rlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvU2hhcmUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvQWJzdHJhY3RWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlld1BhZ2UuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9Gb290ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9IZWFkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9QYWdlVHJhbnNpdGlvbmVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvUHJlbG9hZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvV3JhcHBlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVHcmlkSXRlbS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x5Q0EsSUFBQSx3SEFBQTtFQUFBLGtGQUFBOztBQUFBLFNBQUEsR0FBZSxPQUFBLENBQVEsbUJBQVIsQ0FBZixDQUFBOztBQUFBLFdBQ0EsR0FBZSxPQUFBLENBQVEscUJBQVIsQ0FEZixDQUFBOztBQUFBLEtBRUEsR0FBZSxPQUFBLENBQVEsZUFBUixDQUZmLENBQUE7O0FBQUEsUUFHQSxHQUFlLE9BQUEsQ0FBUSxrQkFBUixDQUhmLENBQUE7O0FBQUEsVUFJQSxHQUFlLE9BQUEsQ0FBUSxvQkFBUixDQUpmLENBQUE7O0FBQUEsU0FLQSxHQUFlLE9BQUEsQ0FBUSxrQkFBUixDQUxmLENBQUE7O0FBQUEsTUFNQSxHQUFlLE9BQUEsQ0FBUSxlQUFSLENBTmYsQ0FBQTs7QUFBQSxNQU9BLEdBQWUsT0FBQSxDQUFRLGlCQUFSLENBUGYsQ0FBQTs7QUFBQSxHQVFBLEdBQWUsT0FBQSxDQUFRLGNBQVIsQ0FSZixDQUFBOztBQUFBLE9BU0EsR0FBZSxPQUFBLENBQVEsV0FBUixDQVRmLENBQUE7O0FBQUEsT0FVQSxHQUFlLE9BQUEsQ0FBUSxXQUFSLENBVmYsQ0FBQTs7QUFBQSxZQVdBLEdBQWUsT0FBQSxDQUFRLHNCQUFSLENBWGYsQ0FBQTs7QUFBQTtBQWVJLGdCQUFBLElBQUEsR0FBYSxJQUFiLENBQUE7O0FBQUEsZ0JBQ0EsUUFBQSxHQUFhLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFEM0IsQ0FBQTs7QUFBQSxnQkFFQSxVQUFBLEdBQWEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUYzQixDQUFBOztBQUFBLGdCQUdBLFFBQUEsR0FBYSxDQUhiLENBQUE7O0FBQUEsZ0JBS0EsUUFBQSxHQUFhLENBQUMsVUFBRCxFQUFhLFVBQWIsRUFBeUIsZ0JBQXpCLEVBQTJDLE1BQTNDLEVBQW1ELGFBQW5ELEVBQWtFLFVBQWxFLEVBQThFLFNBQTlFLEVBQXlGLElBQXpGLEVBQStGLFNBQS9GLEVBQTBHLFVBQTFHLENBTGIsQ0FBQTs7QUFPYyxFQUFBLGFBQUUsSUFBRixHQUFBO0FBRVYsSUFGVyxJQUFDLENBQUEsT0FBQSxJQUVaLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsbUNBQUEsQ0FBQTtBQUFBLDZDQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEscURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSxXQUFPLElBQVAsQ0FGVTtFQUFBLENBUGQ7O0FBQUEsZ0JBV0EsUUFBQSxHQUFXLFNBQUEsR0FBQTtBQUVQLFFBQUEsRUFBQTtBQUFBLElBQUEsRUFBQSxHQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQTNCLENBQUEsQ0FBTCxDQUFBO0FBQUEsSUFFQSxZQUFZLENBQUMsS0FBYixDQUFBLENBRkEsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFVBQUQsR0FBaUIsRUFBRSxDQUFDLE9BQUgsQ0FBVyxTQUFYLENBQUEsR0FBd0IsQ0FBQSxDQUp6QyxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsVUFBRCxHQUFpQixFQUFFLENBQUMsT0FBSCxDQUFXLFNBQVgsQ0FBQSxHQUF3QixDQUFBLENBTHpDLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxhQUFELEdBQW9CLEVBQUUsQ0FBQyxLQUFILENBQVMsT0FBVCxDQUFILEdBQTBCLElBQTFCLEdBQW9DLEtBTnJELENBQUE7V0FRQSxLQVZPO0VBQUEsQ0FYWCxDQUFBOztBQUFBLGdCQXVCQSxRQUFBLEdBQVcsU0FBQSxHQUFBO0FBRVAsV0FBTyxJQUFDLENBQUEsTUFBRCxJQUFXLElBQUMsQ0FBQSxVQUFuQixDQUZPO0VBQUEsQ0F2QlgsQ0FBQTs7QUFBQSxnQkEyQkEsY0FBQSxHQUFpQixTQUFBLEdBQUE7QUFFYixJQUFBLElBQUMsQ0FBQSxRQUFELEVBQUEsQ0FBQTtBQUNBLElBQUEsSUFBYyxJQUFDLENBQUEsUUFBRCxJQUFhLENBQTNCO0FBQUEsTUFBQSxJQUFDLENBQUEsT0FBRCxDQUFBLENBQUEsQ0FBQTtLQURBO1dBR0EsS0FMYTtFQUFBLENBM0JqQixDQUFBOztBQUFBLGdCQWtDQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRUgsSUFBQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBQUEsQ0FBQTtXQUVBLEtBSkc7RUFBQSxDQWxDUCxDQUFBOztBQUFBLGdCQXdDQSxXQUFBLEdBQWMsU0FBQSxHQUFBO0FBRVYsSUFBQSxJQUFDLENBQUEsU0FBRCxHQUFpQixJQUFBLFNBQUEsQ0FBVyxpQkFBQSxHQUFpQixDQUFJLElBQUMsQ0FBQSxJQUFKLEdBQWMsTUFBZCxHQUEwQixFQUEzQixDQUFqQixHQUFnRCxNQUEzRCxFQUFrRSxJQUFDLENBQUEsY0FBbkUsQ0FBakIsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE1BQUQsR0FBaUIsSUFBQSxNQUFBLENBQU8sNEJBQVAsRUFBcUMsSUFBQyxDQUFBLGNBQXRDLENBRGpCLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxTQUFELEdBQWlCLElBQUEsU0FBQSxDQUFVLHFCQUFWLEVBQWlDLElBQUMsQ0FBQSxjQUFsQyxDQUZqQixDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsT0FBRCxHQUFpQixJQUFBLE9BQUEsQ0FBUSxJQUFDLENBQUEsY0FBVCxDQUhqQixDQUFBO1dBT0EsS0FUVTtFQUFBLENBeENkLENBQUE7O0FBQUEsZ0JBbURBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFUCxJQUFBLFFBQVEsQ0FBQyxJQUFULENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFDQSxVQUFVLENBQUMsSUFBWCxDQUFBLENBREEsQ0FBQTtXQUdBLEtBTE87RUFBQSxDQW5EWCxDQUFBOztBQUFBLGdCQTBEQSxPQUFBLEdBQVUsU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsUUFBRCxDQUFBLENBQUEsQ0FBQTtBQUVBO0FBQUEsNEJBRkE7QUFBQSxJQUdBLElBQUMsQ0FBQSxPQUFELEdBQVcsR0FBQSxDQUFBLE9BSFgsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLE1BQUQsR0FBVyxHQUFBLENBQUEsTUFKWCxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsR0FBRCxHQUFXLEdBQUEsQ0FBQSxHQUxYLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxJQUFELEdBQVcsR0FBQSxDQUFBLFdBTlgsQ0FBQTtBQUFBLElBT0EsSUFBQyxDQUFBLEtBQUQsR0FBVyxHQUFBLENBQUEsS0FQWCxDQUFBO0FBQUEsSUFTQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBVEEsQ0FBQTtBQUFBLElBV0EsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQVhBLENBQUE7V0FhQSxLQWZNO0VBQUEsQ0ExRFYsQ0FBQTs7QUFBQSxnQkEyRUEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVEO0FBQUEsdURBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsTUFBVCxDQUFBLENBREEsQ0FBQTtBQUdBO0FBQUEsOERBSEE7QUFBQSxJQUlBLElBQUMsQ0FBQSxPQUFELENBQUEsQ0FKQSxDQUFBO1dBTUEsS0FSQztFQUFBLENBM0VMLENBQUE7O0FBQUEsZ0JBcUZBLE9BQUEsR0FBVSxTQUFBLEdBQUE7QUFFTixRQUFBLGtCQUFBO0FBQUE7QUFBQSxTQUFBLDJDQUFBO29CQUFBO0FBQ0ksTUFBQSxJQUFFLENBQUEsRUFBQSxDQUFGLEdBQVEsSUFBUixDQUFBO0FBQUEsTUFDQSxNQUFBLENBQUEsSUFBUyxDQUFBLEVBQUEsQ0FEVCxDQURKO0FBQUEsS0FBQTtXQUlBLEtBTk07RUFBQSxDQXJGVixDQUFBOzthQUFBOztJQWZKLENBQUE7O0FBQUEsTUE0R00sQ0FBQyxPQUFQLEdBQWlCLEdBNUdqQixDQUFBOzs7OztBQ0FBLElBQUEsd0RBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUFvQixPQUFBLENBQVEscUJBQVIsQ0FBcEIsQ0FBQTs7QUFBQSxTQUNBLEdBQW9CLE9BQUEsQ0FBUSxtQkFBUixDQURwQixDQUFBOztBQUFBLEdBRUEsR0FBb0IsT0FBQSxDQUFRLFlBQVIsQ0FGcEIsQ0FBQTs7QUFBQSxpQkFHQSxHQUFvQixPQUFBLENBQVEseUNBQVIsQ0FIcEIsQ0FBQTs7QUFBQTtBQU9JLDRCQUFBLENBQUE7O0FBQUEsb0JBQUEsUUFBQSxHQUFXLElBQVgsQ0FBQTs7QUFFYyxFQUFBLGlCQUFFLFFBQUYsR0FBQTtBQUVWLElBRlcsSUFBQyxDQUFBLFdBQUEsUUFFWixDQUFBO0FBQUEscUVBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQTtBQUFBOzs7T0FBQTtBQUFBLElBTUEsdUNBQUEsQ0FOQSxDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsT0FBRCxHQUFXLEdBQUEsQ0FBQSxpQkFSWCxDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsWUFBRCxDQUFBLENBVkEsQ0FBQTtBQVlBLFdBQU8sSUFBUCxDQWRVO0VBQUEsQ0FGZDs7QUFrQkE7QUFBQTs7S0FsQkE7O0FBQUEsb0JBcUJBLFlBQUEsR0FBZSxTQUFBLEdBQUE7QUFHWCxRQUFBLENBQUE7QUFBQSxJQUFBLElBQUcsSUFBSDtBQUVJLE1BQUEsQ0FBQSxHQUFJLFNBQVMsQ0FBQyxPQUFWLENBRUE7QUFBQSxRQUFBLEdBQUEsRUFBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFOLEdBQWlCLDJCQUF4QjtBQUFBLFFBQ0EsSUFBQSxFQUFPLEtBRFA7T0FGQSxDQUFKLENBQUE7QUFBQSxNQUtBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLG1CQUFSLENBTEEsQ0FBQTtBQUFBLE1BTUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxDQUFBLFNBQUEsS0FBQSxHQUFBO2VBQUEsU0FBQSxHQUFBO0FBSUg7QUFBQTs7YUFBQTt3REFHQSxLQUFDLENBQUEsb0JBUEU7UUFBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFQLENBTkEsQ0FGSjtLQUFBLE1BQUE7O1FBbUJJLElBQUMsQ0FBQTtPQW5CTDtLQUFBO1dBcUJBLEtBeEJXO0VBQUEsQ0FyQmYsQ0FBQTs7QUFBQSxvQkErQ0EsbUJBQUEsR0FBc0IsU0FBQyxJQUFELEdBQUE7QUFFbEIsUUFBQSxZQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLGlDQUFaLEVBQStDLElBQS9DLENBQUEsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFRLEVBRlIsQ0FBQTtBQUdBLFNBQTZDLDRCQUE3QyxHQUFBO0FBQUEsTUFBQyxLQUFBLEdBQVEsS0FBSyxDQUFDLE1BQU4sQ0FBYSxJQUFJLENBQUMsT0FBbEIsQ0FBVCxDQUFBO0FBQUEsS0FIQTtBQUFBLElBS0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxHQUFULENBQWEsS0FBYixDQUxBLENBQUE7QUFPQTtBQUFBOzs7T0FQQTs7TUFhQSxJQUFDLENBQUE7S0FiRDtXQWVBLEtBakJrQjtFQUFBLENBL0N0QixDQUFBOztpQkFBQTs7R0FGa0IsYUFMdEIsQ0FBQTs7QUFBQSxNQXlFTSxDQUFDLE9BQVAsR0FBaUIsT0F6RWpCLENBQUE7Ozs7O0FDQUEsSUFBQSx5RkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUFuQixDQUFBOztBQUFBLFNBQ0EsR0FBbUIsT0FBQSxDQUFRLHVCQUFSLENBRG5CLENBQUE7O0FBQUEsTUFFQSxHQUFtQixPQUFBLENBQVEsb0JBQVIsQ0FGbkIsQ0FBQTs7QUFBQSxPQUdBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUhuQixDQUFBOztBQUFBLE1BSUEsR0FBbUIsT0FBQSxDQUFRLG9CQUFSLENBSm5CLENBQUE7O0FBQUEsZ0JBS0EsR0FBbUIsT0FBQSxDQUFRLDhCQUFSLENBTG5CLENBQUE7O0FBQUEsWUFNQSxHQUFtQixPQUFBLENBQVEsNkJBQVIsQ0FObkIsQ0FBQTs7QUFBQTtBQVVJLDRCQUFBLENBQUE7O0FBQUEsb0JBQUEsUUFBQSxHQUFXLE1BQVgsQ0FBQTs7QUFBQSxvQkFFQSxPQUFBLEdBQVcsSUFGWCxDQUFBOztBQUFBLG9CQUdBLEtBQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsb0JBS0EsT0FBQSxHQUFXLElBTFgsQ0FBQTs7QUFBQSxvQkFNQSxNQUFBLEdBQVcsSUFOWCxDQUFBOztBQUFBLG9CQVFBLElBQUEsR0FDSTtBQUFBLElBQUEsQ0FBQSxFQUFJLElBQUo7QUFBQSxJQUNBLENBQUEsRUFBSSxJQURKO0FBQUEsSUFFQSxDQUFBLEVBQUksSUFGSjtBQUFBLElBR0EsWUFBQSxFQUFlLElBSGY7QUFBQSxJQUlBLFVBQUEsRUFBZSxJQUpmO0dBVEosQ0FBQTs7QUFBQSxvQkFlQSxXQUFBLEdBQWMsQ0FmZCxDQUFBOztBQUFBLG9CQWdCQSxPQUFBLEdBQWMsS0FoQmQsQ0FBQTs7QUFBQSxvQkFrQkEsdUJBQUEsR0FBMEIseUJBbEIxQixDQUFBOztBQUFBLG9CQW1CQSxvQkFBQSxHQUEwQixzQkFuQjFCLENBQUE7O0FBQUEsb0JBb0JBLGVBQUEsR0FBMEIsaUJBcEIxQixDQUFBOztBQUFBLG9CQXNCQSxZQUFBLEdBQWUsR0F0QmYsQ0FBQTs7QUFBQSxvQkF1QkEsTUFBQSxHQUFlLFFBdkJmLENBQUE7O0FBQUEsb0JBd0JBLFVBQUEsR0FBZSxZQXhCZixDQUFBOztBQTBCYyxFQUFBLGlCQUFBLEdBQUE7QUFFVixtRUFBQSxDQUFBO0FBQUEseURBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLDJDQUFBLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxDQUFBLENBQUUsTUFBRixDQUFYLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxLQUFELEdBQVcsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLEVBQVYsQ0FBYSxDQUFiLENBRFgsQ0FBQTtBQUFBLElBR0EsdUNBQUEsQ0FIQSxDQUZVO0VBQUEsQ0ExQmQ7O0FBQUEsb0JBaUNBLFlBQUEsR0FBYyxTQUFBLEdBQUE7QUFFVixJQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLFdBQVosRUFBeUIsSUFBQyxDQUFBLFdBQTFCLENBQUEsQ0FBQTtXQUVBLEtBSlU7RUFBQSxDQWpDZCxDQUFBOztBQUFBLG9CQXVDQSxXQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVQsSUFBQSxJQUFDLENBQUEsT0FBTyxDQUFDLEdBQVQsQ0FBYSxXQUFiLEVBQTBCLElBQUMsQ0FBQSxXQUEzQixDQUFBLENBQUE7V0FFQSxLQUpTO0VBQUEsQ0F2Q2IsQ0FBQTs7QUFBQSxvQkE2Q0EsV0FBQSxHQUFhLFNBQUUsQ0FBRixHQUFBO0FBRVQsSUFBQSxDQUFDLENBQUMsY0FBRixDQUFBLENBQUEsQ0FBQTtXQUVBLEtBSlM7RUFBQSxDQTdDYixDQUFBOztBQUFBLG9CQW1EQSxNQUFBLEdBQVMsU0FBQSxHQUFBO0FBRUwsSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFNBQUQsR0FBZ0IsR0FBQSxDQUFBLFNBRmhCLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxZQUFELEdBQWdCLEdBQUEsQ0FBQSxZQUhoQixDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsTUFBRCxHQUFnQixHQUFBLENBQUEsTUFMaEIsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLE9BQUQsR0FBZ0IsR0FBQSxDQUFBLE9BTmhCLENBQUE7QUFBQSxJQU9BLElBQUMsQ0FBQSxNQUFELEdBQWdCLEdBQUEsQ0FBQSxNQVBoQixDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsWUFBRCxHQUFnQixHQUFBLENBQUEsZ0JBUmhCLENBQUE7QUFBQSxJQVVBLElBQ0ksQ0FBQyxRQURMLENBQ2MsSUFBQyxDQUFBLE1BRGYsQ0FFSSxDQUFDLFFBRkwsQ0FFYyxJQUFDLENBQUEsT0FGZixDQUdJLENBQUMsUUFITCxDQUdjLElBQUMsQ0FBQSxNQUhmLENBSUksQ0FBQyxRQUpMLENBSWMsSUFBQyxDQUFBLFlBSmYsQ0FWQSxDQUFBO0FBQUEsSUFnQkEsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQWhCQSxDQUFBO1dBa0JBLEtBcEJLO0VBQUEsQ0FuRFQsQ0FBQTs7QUFBQSxvQkF5RUEsVUFBQSxHQUFhLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBSSxhQUFKLEVBQW1CLElBQUMsQ0FBQSxhQUFwQixDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FGQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsUUFBRCxHQUFZLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLFFBQVosRUFBc0IsR0FBdEIsQ0FKWixDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSwwQkFBWixFQUF3QyxJQUFDLENBQUEsUUFBekMsQ0FMQSxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSxRQUFaLEVBQXNCLElBQUMsQ0FBQSxRQUF2QixDQU5BLENBQUE7QUFBQSxJQVFBLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxDQUFVLE9BQVYsRUFBbUIsR0FBbkIsRUFBd0IsSUFBQyxDQUFBLFdBQXpCLENBUkEsQ0FBQTtXQVVBLEtBWlM7RUFBQSxDQXpFYixDQUFBOztBQUFBLG9CQXVGQSxRQUFBLEdBQVcsU0FBQSxHQUFBO0FBRVAsSUFBQSxJQUFDLENBQUEsV0FBRCxHQUFlLE1BQU0sQ0FBQyxPQUF0QixDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBREEsQ0FBQTtXQUdBLEtBTE87RUFBQSxDQXZGWCxDQUFBOztBQUFBLG9CQThGQSxXQUFBLEdBQWMsU0FBQSxHQUFBO0FBRVYsSUFBQSxJQUFHLENBQUEsSUFBRSxDQUFBLE9BQUw7QUFDSSxNQUFBLHFCQUFBLENBQXNCLElBQUMsQ0FBQSxZQUF2QixDQUFBLENBQUE7QUFBQSxNQUNBLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFEWCxDQURKO0tBQUE7V0FJQSxLQU5VO0VBQUEsQ0E5RmQsQ0FBQTs7QUFBQSxvQkFzR0EsWUFBQSxHQUFlLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxLQUFYLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxDQUFnQixlQUFoQixDQUZBLENBQUE7QUFBQSxJQUlBLFlBQUEsQ0FBYSxJQUFDLENBQUEsV0FBZCxDQUpBLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxXQUFELEdBQWUsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFDdEIsS0FBQyxDQUFBLEtBQUssQ0FBQyxXQUFQLENBQW1CLGVBQW5CLEVBRHNCO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWCxFQUViLEVBRmEsQ0FOZixDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsT0FBRCxDQUFTLElBQUMsQ0FBQSxlQUFWLENBVkEsQ0FBQTtXQVlBLEtBZFc7RUFBQSxDQXRHZixDQUFBOztBQUFBLG9CQXNIQSxhQUFBLEdBQWdCLFNBQUEsR0FBQTtBQUlaLElBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFQLENBQWUsSUFBQyxDQUFBLEdBQWhCLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFNBQVMsQ0FBQyxrQkFBWCxDQUE4QixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQUcsS0FBQyxDQUFBLE9BQUQsQ0FBUyxLQUFDLENBQUEsb0JBQVYsRUFBSDtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCLENBRkEsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLEtBQUQsQ0FBQSxDQUpBLENBQUE7V0FNQSxLQVZZO0VBQUEsQ0F0SGhCLENBQUE7O0FBQUEsb0JBa0lBLEtBQUEsR0FBUSxTQUFBLEdBQUE7QUFFSixJQUFBLElBQUMsQ0FBQSxPQUFELENBQVMsT0FBVCxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFiLENBQUEsQ0FGQSxDQUFBO1dBSUEsS0FOSTtFQUFBLENBbElSLENBQUE7O0FBQUEsb0JBMElBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFUCxJQUFBLElBQUMsQ0FBQSxPQUFELENBQUEsQ0FBQSxDQUFBO1dBRUEsS0FKTztFQUFBLENBMUlYLENBQUE7O0FBQUEsb0JBZ0pBLE9BQUEsR0FBVSxTQUFBLEdBQUE7QUFFTixRQUFBLFlBQUE7QUFBQSxJQUFBLENBQUEsR0FBSSxNQUFNLENBQUMsVUFBUCxJQUFxQixRQUFRLENBQUMsZUFBZSxDQUFDLFdBQTlDLElBQTZELFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBL0UsQ0FBQTtBQUFBLElBQ0EsQ0FBQSxHQUFJLE1BQU0sQ0FBQyxXQUFQLElBQXNCLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBL0MsSUFBK0QsUUFBUSxDQUFDLElBQUksQ0FBQyxZQURqRixDQUFBO0FBQUEsSUFHQSxNQUFBLEdBQVMsQ0FBQSxHQUFJLElBQUMsQ0FBQSxJQUFJLENBQUMsVUFIbkIsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLElBQUQsR0FDSTtBQUFBLE1BQUEsQ0FBQSxFQUFJLENBQUo7QUFBQSxNQUNBLENBQUEsRUFBSSxDQURKO0FBQUEsTUFFQSxDQUFBLEVBQU8sQ0FBQSxHQUFJLENBQVAsR0FBYyxVQUFkLEdBQThCLFdBRmxDO0FBQUEsTUFHQSxZQUFBLEVBQWUsQ0FBQSxJQUFFLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFOLENBQUEsQ0FBRCxJQUFxQixNQUFBLEdBQVMsR0FBOUIsSUFBcUMsTUFBQSxHQUFTLEdBSDdEO0FBQUEsTUFJQSxVQUFBLEVBQWUsQ0FKZjtLQU5KLENBQUE7QUFBQSxJQVlBLElBQUMsQ0FBQSxPQUFELENBQVMsSUFBQyxDQUFBLHVCQUFWLEVBQW1DLElBQUMsQ0FBQSxJQUFwQyxDQVpBLENBQUE7V0FjQSxLQWhCTTtFQUFBLENBaEpWLENBQUE7O0FBQUEsb0JBa0tBLFdBQUEsR0FBYyxTQUFDLENBQUQsR0FBQTtBQUVWLFFBQUEsSUFBQTtBQUFBLElBQUEsSUFBQSxHQUFPLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUFrQixDQUFDLElBQW5CLENBQXdCLE1BQXhCLENBQVAsQ0FBQTtBQUVBLElBQUEsSUFBQSxDQUFBLElBQUE7QUFBQSxhQUFPLEtBQVAsQ0FBQTtLQUZBO0FBQUEsSUFJQSxJQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsQ0FBckIsQ0FKQSxDQUFBO1dBTUEsS0FSVTtFQUFBLENBbEtkLENBQUE7O0FBQUEsb0JBNEtBLGFBQUEsR0FBZ0IsU0FBRSxJQUFGLEVBQVEsQ0FBUixHQUFBO0FBRVosUUFBQSxjQUFBOztNQUZvQixJQUFJO0tBRXhCO0FBQUEsSUFBQSxLQUFBLEdBQWEsSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFqQixDQUFILEdBQW1DLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBakIsQ0FBMkIsQ0FBQSxDQUFBLENBQTlELEdBQXNFLElBQWhGLENBQUE7QUFBQSxJQUNBLE9BQUEsR0FBYSxLQUFLLENBQUMsTUFBTixDQUFhLENBQWIsQ0FBQSxLQUFtQixHQUF0QixHQUErQixLQUFLLENBQUMsS0FBTixDQUFZLEdBQVosQ0FBaUIsQ0FBQSxDQUFBLENBQUUsQ0FBQyxLQUFwQixDQUEwQixHQUExQixDQUErQixDQUFBLENBQUEsQ0FBOUQsR0FBc0UsS0FBSyxDQUFDLEtBQU4sQ0FBWSxHQUFaLENBQWlCLENBQUEsQ0FBQSxDQURqRyxDQUFBO0FBR0EsSUFBQSxJQUFHLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFWLENBQXFCLE9BQXJCLENBQUg7O1FBQ0ksQ0FBQyxDQUFFLGNBQUgsQ0FBQTtPQUFBO0FBQUEsTUFDQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsVUFBYixDQUF3QixLQUF4QixDQURBLENBREo7S0FBQSxNQUFBO0FBSUksTUFBQSxJQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsQ0FBQSxDQUpKO0tBSEE7V0FTQSxLQVhZO0VBQUEsQ0E1S2hCLENBQUE7O0FBQUEsb0JBeUxBLGtCQUFBLEdBQXFCLFNBQUMsSUFBRCxHQUFBO0FBRWpCLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxpQ0FBWixDQUFBLENBQUE7QUFFQTtBQUFBOzs7T0FGQTtXQVFBLEtBVmlCO0VBQUEsQ0F6THJCLENBQUE7O2lCQUFBOztHQUZrQixhQVJ0QixDQUFBOztBQUFBLE1BK01NLENBQUMsT0FBUCxHQUFpQixPQS9NakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGtCQUFBO0VBQUE7O2lTQUFBOztBQUFBO0FBRUMsdUNBQUEsQ0FBQTs7Ozs7R0FBQTs7QUFBQSwrQkFBQSxFQUFBLEdBQUssU0FBQSxHQUFBO0FBRUosV0FBTyxNQUFNLENBQUMsRUFBZCxDQUZJO0VBQUEsQ0FBTCxDQUFBOzs0QkFBQTs7R0FGZ0MsUUFBUSxDQUFDLFdBQTFDLENBQUE7O0FBQUEsTUFNTSxDQUFDLE9BQVAsR0FBaUIsa0JBTmpCLENBQUE7Ozs7O0FDQUEsSUFBQSw0REFBQTtFQUFBOztpU0FBQTs7QUFBQSxrQkFBQSxHQUFxQixPQUFBLENBQVEsdUJBQVIsQ0FBckIsQ0FBQTs7QUFBQSxnQkFDQSxHQUFxQixPQUFBLENBQVEsMkNBQVIsQ0FEckIsQ0FBQTs7QUFBQTtBQUtDLDJDQUFBLENBQUE7Ozs7O0dBQUE7O0FBQUEsbUNBQUEsS0FBQSxHQUFRLGdCQUFSLENBQUE7O0FBQUEsbUNBRUEsWUFBQSxHQUFlLFNBQUEsR0FBQTtBQUVkLFFBQUEsNEJBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxFQUFSLENBQUE7QUFFQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7QUFBQSxNQUFDLEtBQUssQ0FBQyxJQUFOLENBQVcsS0FBSyxDQUFDLEdBQU4sQ0FBVSxNQUFWLENBQVgsQ0FBRCxDQUFBO0FBQUEsS0FGQTtXQUlBLEtBQUssQ0FBQyxJQUFOLENBQVcsTUFBWCxFQU5jO0VBQUEsQ0FGZixDQUFBOztnQ0FBQTs7R0FGb0MsbUJBSHJDLENBQUE7O0FBQUEsTUFlTSxDQUFDLE9BQVAsR0FBaUIsc0JBZmpCLENBQUE7Ozs7O0FDQUEsSUFBQSxrQ0FBQTtFQUFBO2lTQUFBOztBQUFBLGFBQUEsR0FBZ0IsT0FBQSxDQUFRLGlDQUFSLENBQWhCLENBQUE7O0FBQUE7QUFJQyx3Q0FBQSxDQUFBOzs7O0dBQUE7O0FBQUEsZ0NBQUEsS0FBQSxHQUFRLGFBQVIsQ0FBQTs7NkJBQUE7O0dBRmlDLFFBQVEsQ0FBQyxXQUYzQyxDQUFBOztBQUFBLE1BTU0sQ0FBQyxPQUFQLEdBQWlCLG1CQU5qQixDQUFBOzs7OztBQ0FBLElBQUEsa0RBQUE7RUFBQTs7aVNBQUE7O0FBQUEsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHVCQUFSLENBQXJCLENBQUE7O0FBQUEsV0FDQSxHQUFxQixPQUFBLENBQVEsaUNBQVIsQ0FEckIsQ0FBQTs7QUFBQTtBQUtDLHNDQUFBLENBQUE7Ozs7O0dBQUE7O0FBQUEsOEJBQUEsS0FBQSxHQUFRLFdBQVIsQ0FBQTs7QUFBQSw4QkFFQSxlQUFBLEdBQWtCLFNBQUMsSUFBRCxHQUFBO0FBRWpCLFFBQUEsTUFBQTtBQUFBLElBQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSxTQUFELENBQVc7QUFBQSxNQUFBLElBQUEsRUFBTyxJQUFQO0tBQVgsQ0FBVCxDQUFBO0FBRUEsSUFBQSxJQUFHLENBQUEsTUFBSDtBQUNDLE1BQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxnQkFBWixDQUFBLENBREQ7S0FGQTtBQUtBLFdBQU8sTUFBUCxDQVBpQjtFQUFBLENBRmxCLENBQUE7OzJCQUFBOztHQUYrQixtQkFIaEMsQ0FBQTs7QUFBQSxNQWdCTSxDQUFDLE9BQVAsR0FBaUIsaUJBaEJqQixDQUFBOzs7OztBQ0FBLElBQUEsTUFBQTs7QUFBQSxNQUFBLEdBRUM7QUFBQSxFQUFBLE1BQUEsRUFBWSxTQUFaO0FBQUEsRUFDQSxPQUFBLEVBQVksU0FEWjtBQUFBLEVBRUEsUUFBQSxFQUFZLFNBRlo7QUFBQSxFQUdBLFNBQUEsRUFBWSxTQUhaO0NBRkQsQ0FBQTs7QUFBQSxNQU9NLENBQUMsT0FBUCxHQUFpQixNQVBqQixDQUFBOzs7OztBQ0FBLElBQUEsa0JBQUE7O0FBQUEsYUFBQSxHQUFnQixPQUFBLENBQVEsOEJBQVIsQ0FBaEIsQ0FBQTs7QUFBQTttQkFJQzs7QUFBQSxFQUFBLEdBQUMsQ0FBQSxLQUFELEdBQVMsR0FBQSxDQUFBLGFBQVQsQ0FBQTs7QUFBQSxFQUVBLEdBQUMsQ0FBQSxXQUFELEdBQWUsU0FBQSxHQUFBO1dBRWQ7QUFBQTtBQUFBLG1EQUFBO0FBQUEsTUFDQSxRQUFBLEVBQVcsR0FBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFEakI7TUFGYztFQUFBLENBRmYsQ0FBQTs7QUFBQSxFQU9BLEdBQUMsQ0FBQSxHQUFELEdBQU8sU0FBQyxJQUFELEVBQU8sSUFBUCxHQUFBO0FBRU4sSUFBQSxJQUFBLEdBQU8sQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULEVBQWUsSUFBZixFQUFxQixHQUFDLENBQUEsV0FBRCxDQUFBLENBQXJCLENBQVAsQ0FBQTtBQUNBLFdBQU8sR0FBQyxDQUFBLGNBQUQsQ0FBZ0IsR0FBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsSUFBWCxDQUFoQixFQUFrQyxJQUFsQyxDQUFQLENBSE07RUFBQSxDQVBQLENBQUE7O0FBQUEsRUFZQSxHQUFDLENBQUEsY0FBRCxHQUFrQixTQUFDLEdBQUQsRUFBTSxJQUFOLEdBQUE7QUFFakIsV0FBTyxHQUFHLENBQUMsT0FBSixDQUFZLGlCQUFaLEVBQStCLFNBQUMsQ0FBRCxFQUFJLENBQUosR0FBQTtBQUNyQyxVQUFBLENBQUE7YUFBQSxDQUFBLEdBQUksSUFBSyxDQUFBLENBQUEsQ0FBTCxJQUFXLENBQUcsTUFBQSxDQUFBLElBQVksQ0FBQSxDQUFBLENBQVosS0FBa0IsUUFBckIsR0FBbUMsSUFBSyxDQUFBLENBQUEsQ0FBRSxDQUFDLFFBQVIsQ0FBQSxDQUFuQyxHQUEyRCxFQUEzRCxFQURzQjtJQUFBLENBQS9CLENBQVAsQ0FBQTtBQUVDLElBQUEsSUFBRyxNQUFBLENBQUEsQ0FBQSxLQUFZLFFBQVosSUFBd0IsTUFBQSxDQUFBLENBQUEsS0FBWSxRQUF2QzthQUFxRCxFQUFyRDtLQUFBLE1BQUE7YUFBNEQsRUFBNUQ7S0FKZ0I7RUFBQSxDQVpsQixDQUFBOztBQUFBLEVBa0JBLEdBQUMsQ0FBQSxFQUFELEdBQU0sU0FBQSxHQUFBO0FBRUwsV0FBTyxNQUFNLENBQUMsRUFBZCxDQUZLO0VBQUEsQ0FsQk4sQ0FBQTs7YUFBQTs7SUFKRCxDQUFBOztBQUFBLE1BMEJNLENBQUMsT0FBUCxHQUFpQixHQTFCakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLFlBQUE7RUFBQSxrRkFBQTs7QUFBQTtBQUVlLEVBQUEsc0JBQUEsR0FBQTtBQUViLG1DQUFBLENBQUE7QUFBQSxJQUFBLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBVCxFQUFZLFFBQVEsQ0FBQyxNQUFyQixDQUFBLENBQUE7QUFFQSxXQUFPLElBQVAsQ0FKYTtFQUFBLENBQWQ7O0FBQUEseUJBTUEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVKLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSTtFQUFBLENBTkwsQ0FBQTs7c0JBQUE7O0lBRkQsQ0FBQTs7QUFBQSxNQVlNLENBQUMsT0FBUCxHQUFpQixZQVpqQixDQUFBOzs7OztBQ0FBLElBQUEseUJBQUE7RUFBQSxrRkFBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLDZCQUFSLENBQWYsQ0FBQTs7QUFBQSxHQUNBLEdBQWUsT0FBQSxDQUFRLGFBQVIsQ0FEZixDQUFBOztBQUdBO0FBQUE7Ozs7R0FIQTs7QUFBQTtBQVdJLG1CQUFBLElBQUEsR0FBVyxJQUFYLENBQUE7O0FBQUEsbUJBQ0EsSUFBQSxHQUFXLElBRFgsQ0FBQTs7QUFBQSxtQkFFQSxRQUFBLEdBQVcsSUFGWCxDQUFBOztBQUFBLG1CQUdBLE1BQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsbUJBSUEsVUFBQSxHQUFXLE9BSlgsQ0FBQTs7QUFNYyxFQUFBLGdCQUFDLElBQUQsRUFBTyxFQUFQLEdBQUE7QUFFViwyREFBQSxDQUFBO0FBQUEscUNBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSxpREFBQSxDQUFBO0FBQUEsNkNBQUEsQ0FBQTtBQUFBO0FBQUEsc0VBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxRQUFELEdBQVksRUFGWixDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsTUFBRCxHQUFVLElBSFYsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsT0FBRCxDQUFBLENBTFIsQ0FBQTtBQU9BLElBQUEsSUFBRyxHQUFHLENBQUMsR0FBSixDQUFRLFFBQVIsRUFBa0I7QUFBQSxNQUFFLElBQUEsRUFBTyxJQUFDLENBQUEsSUFBVjtLQUFsQixDQUFIO0FBRUksTUFBQSxDQUFDLENBQUMsSUFBRixDQUNJO0FBQUEsUUFBQSxHQUFBLEVBQVUsR0FBRyxDQUFDLEdBQUosQ0FBUyxRQUFULEVBQW1CO0FBQUEsVUFBRSxJQUFBLEVBQU8sSUFBQyxDQUFBLElBQVY7U0FBbkIsQ0FBVjtBQUFBLFFBQ0EsSUFBQSxFQUFVLEtBRFY7QUFBQSxRQUVBLE9BQUEsRUFBVSxJQUFDLENBQUEsU0FGWDtBQUFBLFFBR0EsS0FBQSxFQUFVLElBQUMsQ0FBQSxVQUhYO09BREosQ0FBQSxDQUZKO0tBQUEsTUFBQTtBQVVJLE1BQUEsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFBLENBVko7S0FQQTtBQUFBLElBbUJBLElBbkJBLENBRlU7RUFBQSxDQU5kOztBQUFBLG1CQTZCQSxPQUFBLEdBQVUsU0FBQSxHQUFBO0FBRU4sUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBaEIsSUFBMkIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBdkIsQ0FBNkIsT0FBN0IsQ0FBOUI7QUFFSSxNQUFBLElBQUEsR0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUF2QixDQUE2QixPQUE3QixDQUFzQyxDQUFBLENBQUEsQ0FBRSxDQUFDLEtBQXpDLENBQStDLEdBQS9DLENBQW9ELENBQUEsQ0FBQSxDQUEzRCxDQUZKO0tBQUEsTUFJSyxJQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBakI7QUFFRCxNQUFBLElBQUEsR0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQXJCLENBRkM7S0FBQSxNQUFBO0FBTUQsTUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLFNBQUEsQ0FBUixDQU5DO0tBSkw7V0FZQSxLQWRNO0VBQUEsQ0E3QlYsQ0FBQTs7QUFBQSxtQkE2Q0EsU0FBQSxHQUFZLFNBQUMsS0FBRCxHQUFBO0FBRVI7QUFBQSxnREFBQTtBQUFBLFFBQUEsQ0FBQTtBQUFBLElBRUEsQ0FBQSxHQUFJLElBRkosQ0FBQTtBQUlBLElBQUEsSUFBRyxLQUFLLENBQUMsWUFBVDtBQUNJLE1BQUEsQ0FBQSxHQUFJLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBSyxDQUFDLFlBQWpCLENBQUosQ0FESjtLQUFBLE1BQUE7QUFHSSxNQUFBLENBQUEsR0FBSSxLQUFKLENBSEo7S0FKQTtBQUFBLElBU0EsSUFBQyxDQUFBLElBQUQsR0FBWSxJQUFBLFlBQUEsQ0FBYSxDQUFiLENBVFosQ0FBQTs7TUFVQSxJQUFDLENBQUE7S0FWRDtXQVlBLEtBZFE7RUFBQSxDQTdDWixDQUFBOztBQUFBLG1CQTZEQSxVQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVQ7QUFBQSxzRUFBQTtBQUFBLElBRUEsQ0FBQyxDQUFDLElBQUYsQ0FDSTtBQUFBLE1BQUEsR0FBQSxFQUFXLElBQUMsQ0FBQSxNQUFaO0FBQUEsTUFDQSxRQUFBLEVBQVcsTUFEWDtBQUFBLE1BRUEsUUFBQSxFQUFXLElBQUMsQ0FBQSxTQUZaO0FBQUEsTUFHQSxLQUFBLEVBQVcsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtpQkFBRyxPQUFPLENBQUMsR0FBUixDQUFZLHlCQUFaLEVBQUg7UUFBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUhYO0tBREosQ0FGQSxDQUFBO1dBUUEsS0FWUztFQUFBLENBN0RiLENBQUE7O0FBQUEsbUJBeUVBLEdBQUEsR0FBTSxTQUFDLEVBQUQsR0FBQTtBQUVGO0FBQUE7O09BQUE7QUFJQSxXQUFPLElBQUMsQ0FBQSxJQUFJLENBQUMsU0FBTixDQUFnQixFQUFoQixDQUFQLENBTkU7RUFBQSxDQXpFTixDQUFBOztBQUFBLG1CQWlGQSxjQUFBLEdBQWlCLFNBQUMsR0FBRCxHQUFBO0FBRWIsV0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQWQsR0FBb0IsaUJBQXBCLEdBQXdDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBdEQsR0FBbUUsR0FBbkUsR0FBeUUsR0FBaEYsQ0FGYTtFQUFBLENBakZqQixDQUFBOztnQkFBQTs7SUFYSixDQUFBOztBQUFBLE1BZ0dNLENBQUMsT0FBUCxHQUFpQixNQWhHakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLDZDQUFBO0VBQUEsa0ZBQUE7O0FBQUEsYUFBQSxHQUFzQixPQUFBLENBQVEsOEJBQVIsQ0FBdEIsQ0FBQTs7QUFBQSxtQkFDQSxHQUFzQixPQUFBLENBQVEseUNBQVIsQ0FEdEIsQ0FBQTs7QUFBQTtBQUtJLHNCQUFBLFNBQUEsR0FBWSxJQUFaLENBQUE7O0FBQUEsc0JBQ0EsRUFBQSxHQUFZLElBRFosQ0FBQTs7QUFHYyxFQUFBLG1CQUFDLFNBQUQsRUFBWSxRQUFaLEdBQUE7QUFFVixxQ0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLEVBQUQsR0FBTSxRQUFOLENBQUE7QUFBQSxJQUVBLENBQUMsQ0FBQyxJQUFGLENBQU87QUFBQSxNQUFBLEdBQUEsRUFBTSxTQUFOO0FBQUEsTUFBaUIsT0FBQSxFQUFVLElBQUMsQ0FBQSxRQUE1QjtLQUFQLENBRkEsQ0FBQTtBQUFBLElBSUEsSUFKQSxDQUZVO0VBQUEsQ0FIZDs7QUFBQSxzQkFXQSxRQUFBLEdBQVcsU0FBQyxJQUFELEdBQUE7QUFFUCxRQUFBLElBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxFQUFQLENBQUE7QUFBQSxJQUVBLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixDQUF3QixDQUFDLElBQXpCLENBQThCLFNBQUMsR0FBRCxFQUFNLEtBQU4sR0FBQTtBQUMxQixVQUFBLE1BQUE7QUFBQSxNQUFBLE1BQUEsR0FBUyxDQUFBLENBQUUsS0FBRixDQUFULENBQUE7YUFDQSxJQUFJLENBQUMsSUFBTCxDQUFjLElBQUEsYUFBQSxDQUNWO0FBQUEsUUFBQSxFQUFBLEVBQU8sTUFBTSxDQUFDLElBQVAsQ0FBWSxJQUFaLENBQWlCLENBQUMsUUFBbEIsQ0FBQSxDQUFQO0FBQUEsUUFDQSxJQUFBLEVBQU8sQ0FBQyxDQUFDLElBQUYsQ0FBTyxNQUFNLENBQUMsSUFBUCxDQUFBLENBQVAsQ0FEUDtPQURVLENBQWQsRUFGMEI7SUFBQSxDQUE5QixDQUZBLENBQUE7QUFBQSxJQVFBLElBQUMsQ0FBQSxTQUFELEdBQWlCLElBQUEsbUJBQUEsQ0FBb0IsSUFBcEIsQ0FSakIsQ0FBQTs7TUFVQSxJQUFDLENBQUE7S0FWRDtXQVlBLEtBZE87RUFBQSxDQVhYLENBQUE7O0FBQUEsc0JBMkJBLEdBQUEsR0FBTSxTQUFDLEVBQUQsR0FBQTtBQUVGLFFBQUEsQ0FBQTtBQUFBLElBQUEsQ0FBQSxHQUFJLElBQUMsQ0FBQSxTQUFTLENBQUMsS0FBWCxDQUFpQjtBQUFBLE1BQUEsRUFBQSxFQUFLLEVBQUw7S0FBakIsQ0FBSixDQUFBO0FBQUEsSUFDQSxDQUFBLEdBQUksQ0FBRSxDQUFBLENBQUEsQ0FBRSxDQUFDLEdBQUwsQ0FBUyxNQUFULENBREosQ0FBQTtBQUdBLFdBQU8sQ0FBQyxDQUFDLElBQUYsQ0FBTyxDQUFQLENBQVAsQ0FMRTtFQUFBLENBM0JOLENBQUE7O21CQUFBOztJQUxKLENBQUE7O0FBQUEsTUF1Q00sQ0FBQyxPQUFQLEdBQWlCLFNBdkNqQixDQUFBOzs7OztBQ0FBLElBQUEsYUFBQTtFQUFBOztpU0FBQTs7QUFBQTtBQUVDLGtDQUFBLENBQUE7O0FBQWMsRUFBQSx1QkFBQyxLQUFELEVBQVEsTUFBUixHQUFBO0FBRWIsbUNBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxJQUFDLENBQUEsWUFBRCxDQUFjLEtBQWQsQ0FBUixDQUFBO0FBRUEsV0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQW5CLENBQXlCLElBQXpCLEVBQTRCLFNBQTVCLENBQVAsQ0FKYTtFQUFBLENBQWQ7O0FBQUEsMEJBTUEsR0FBQSxHQUFNLFNBQUMsS0FBRCxFQUFRLE9BQVIsR0FBQTtBQUVMLElBQUEsT0FBQSxJQUFXLENBQUMsT0FBQSxHQUFVLEVBQVgsQ0FBWCxDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxLQUFkLENBRlIsQ0FBQTtBQUFBLElBSUEsT0FBTyxDQUFDLElBQVIsR0FBZSxJQUFJLENBQUMsU0FBTCxDQUFlLEtBQWYsQ0FKZixDQUFBO0FBTUEsV0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBakMsQ0FBc0MsSUFBdEMsRUFBeUMsS0FBekMsRUFBZ0QsT0FBaEQsQ0FBUCxDQVJLO0VBQUEsQ0FOTixDQUFBOztBQUFBLDBCQWdCQSxZQUFBLEdBQWUsU0FBQyxLQUFELEdBQUE7V0FFZCxNQUZjO0VBQUEsQ0FoQmYsQ0FBQTs7QUFBQSwwQkFvQkEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVKLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSTtFQUFBLENBcEJMLENBQUE7O3VCQUFBOztHQUYyQixRQUFRLENBQUMsVUFBckMsQ0FBQTs7QUFBQSxNQTBCTSxDQUFDLE9BQVAsR0FBaUIsYUExQmpCLENBQUE7Ozs7O0FDQUEsSUFBQSxrRUFBQTtFQUFBOztpU0FBQTs7QUFBQSxhQUFBLEdBQXVCLE9BQUEsQ0FBUSxrQkFBUixDQUF2QixDQUFBOztBQUFBLFdBQ0EsR0FBdUIsT0FBQSxDQUFRLHlCQUFSLENBRHZCLENBQUE7O0FBQUEsb0JBRUEsR0FBdUIsT0FBQSxDQUFRLGtDQUFSLENBRnZCLENBQUE7O0FBQUE7QUFNSSxxQ0FBQSxDQUFBOzs7Ozs7R0FBQTs7QUFBQSw2QkFBQSxRQUFBLEdBQ0k7QUFBQSxJQUFBLE1BQUEsRUFBWSxFQUFaO0FBQUEsSUFDQSxRQUFBLEVBQVksRUFEWjtBQUFBLElBRUEsU0FBQSxFQUFZLEVBRlo7QUFBQSxJQUdBLFNBQUEsRUFBWSxFQUhaO0FBQUEsSUFJQSxNQUFBLEVBQVksRUFKWjtHQURKLENBQUE7O0FBQUEsNkJBT0EsWUFBQSxHQUFlLFNBQUMsS0FBRCxHQUFBO0FBRVgsSUFBQSxJQUFHLEtBQUssQ0FBQyxJQUFUO0FBQ0ksTUFBQSxLQUFLLENBQUMsSUFBTixHQUFhLElBQUMsQ0FBQSxPQUFELENBQVMsS0FBVCxDQUFiLENBREo7S0FBQTtXQUdBLE1BTFc7RUFBQSxDQVBmLENBQUE7O0FBQUEsNkJBY0EsT0FBQSxHQUFVLFNBQUMsS0FBRCxHQUFBO0FBRU4sUUFBQSxXQUFBO0FBQUEsSUFBQSxJQUFBLEdBQVEsRUFBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsRUFEUixDQUFBO0FBR0EsSUFBQSxJQUFHLEtBQUssQ0FBQyxPQUFUO0FBQ0ksTUFBQSxJQUFBLElBQVMsWUFBQSxHQUFZLEtBQUssQ0FBQyxPQUFsQixHQUEwQix1QkFBMUIsR0FBaUQsS0FBSyxDQUFDLElBQXZELEdBQTRELE9BQXJFLENBREo7S0FBQSxNQUFBO0FBR0ksTUFBQSxJQUFBLElBQVEsRUFBQSxHQUFHLEtBQUssQ0FBQyxJQUFULEdBQWMsR0FBdEIsQ0FISjtLQUhBO0FBUUEsSUFBQSxJQUFHLEtBQUssQ0FBQyxPQUFUO0FBQXNCLE1BQUEsS0FBSyxDQUFDLElBQU4sQ0FBWSwrQkFBQSxHQUErQixLQUFLLENBQUMsT0FBckMsR0FBNkMsV0FBekQsQ0FBQSxDQUF0QjtLQVJBO0FBU0EsSUFBQSxJQUFHLEtBQUssQ0FBQyxNQUFUO0FBQXFCLE1BQUEsS0FBSyxDQUFDLElBQU4sQ0FBWSw4QkFBQSxHQUE4QixLQUFLLENBQUMsTUFBcEMsR0FBMkMsV0FBdkQsQ0FBQSxDQUFyQjtLQVRBO0FBQUEsSUFXQSxJQUFBLElBQVMsR0FBQSxHQUFFLENBQUMsS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFYLENBQUQsQ0FBRixHQUFvQixHQVg3QixDQUFBO1dBYUEsS0FmTTtFQUFBLENBZFYsQ0FBQTs7MEJBQUE7O0dBRjJCLGNBSi9CLENBQUE7O0FBQUEsTUFxQ00sQ0FBQyxPQUFQLEdBQWlCLGdCQXJDakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGFBQUE7RUFBQTtpU0FBQTs7QUFBQTtBQUVJLGtDQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSwwQkFBQSxRQUFBLEdBRUk7QUFBQSxJQUFBLEtBQUEsRUFBZ0IsRUFBaEI7QUFBQSxJQUVBLE1BQUEsRUFBZ0IsRUFGaEI7QUFBQSxJQUlBLElBQUEsRUFDSTtBQUFBLE1BQUEsS0FBQSxFQUFhLCtCQUFiO0FBQUEsTUFDQSxRQUFBLEVBQWEsa0NBRGI7QUFBQSxNQUVBLFFBQUEsRUFBYSxrQ0FGYjtBQUFBLE1BR0EsTUFBQSxFQUFhLGdDQUhiO0FBQUEsTUFJQSxNQUFBLEVBQWEsZ0NBSmI7QUFBQSxNQUtBLE1BQUEsRUFBYSxnQ0FMYjtLQUxKO0dBRkosQ0FBQTs7dUJBQUE7O0dBRndCLFFBQVEsQ0FBQyxVQUFyQyxDQUFBOztBQUFBLE1BZ0JNLENBQUMsT0FBUCxHQUFpQixhQWhCakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLFlBQUE7RUFBQTs7aVNBQUE7O0FBQUE7QUFFSSxpQ0FBQSxDQUFBOzs7Ozs7R0FBQTs7QUFBQSx5QkFBQSxRQUFBLEdBQ0k7QUFBQSxJQUFBLElBQUEsRUFBVyxJQUFYO0FBQUEsSUFDQSxRQUFBLEVBQVcsSUFEWDtBQUFBLElBRUEsT0FBQSxFQUFXLElBRlg7R0FESixDQUFBOztBQUFBLHlCQUtBLFlBQUEsR0FBZSxTQUFBLEdBQUE7QUFDWCxXQUFPLElBQUMsQ0FBQSxHQUFELENBQUssVUFBTCxDQUFQLENBRFc7RUFBQSxDQUxmLENBQUE7O0FBQUEseUJBUUEsU0FBQSxHQUFZLFNBQUMsRUFBRCxHQUFBO0FBQ1IsUUFBQSx1QkFBQTtBQUFBO0FBQUEsU0FBQSxTQUFBO2tCQUFBO0FBQUM7QUFBQSxXQUFBLFVBQUE7cUJBQUE7QUFBQyxRQUFBLElBQVksQ0FBQSxLQUFLLEVBQWpCO0FBQUEsaUJBQU8sQ0FBUCxDQUFBO1NBQUQ7QUFBQSxPQUFEO0FBQUEsS0FBQTtBQUFBLElBQ0EsT0FBTyxDQUFDLElBQVIsQ0FBYywrQkFBQSxHQUErQixFQUE3QyxDQURBLENBQUE7V0FFQSxLQUhRO0VBQUEsQ0FSWixDQUFBOztzQkFBQTs7R0FGdUIsUUFBUSxDQUFDLE1BQXBDLENBQUE7O0FBQUEsTUFlTSxDQUFDLE9BQVAsR0FBaUIsWUFmakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGFBQUE7RUFBQTtpU0FBQTs7QUFBQTtBQUVDLGtDQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSwwQkFBQSxRQUFBLEdBRUM7QUFBQSxJQUFBLEVBQUEsRUFBTyxFQUFQO0FBQUEsSUFDQSxJQUFBLEVBQU8sRUFEUDtHQUZELENBQUE7O3VCQUFBOztHQUYyQixRQUFRLENBQUMsTUFBckMsQ0FBQTs7QUFBQSxNQU9NLENBQUMsT0FBUCxHQUFpQixhQVBqQixDQUFBOzs7OztBQ0FBLElBQUEsNkRBQUE7RUFBQTs7aVNBQUE7O0FBQUEsYUFBQSxHQUF1QixPQUFBLENBQVEsa0JBQVIsQ0FBdkIsQ0FBQTs7QUFBQSxXQUNBLEdBQXVCLE9BQUEsQ0FBUSx5QkFBUixDQUR2QixDQUFBOztBQUFBLG9CQUVBLEdBQXVCLE9BQUEsQ0FBUSxrQ0FBUixDQUZ2QixDQUFBOztBQUFBO0FBTUMsZ0NBQUEsQ0FBQTs7Ozs7O0dBQUE7O0FBQUEsd0JBQUEsUUFBQSxHQUVDO0FBQUEsSUFBQSxNQUFBLEVBQVMsRUFBVDtBQUFBLElBQ0EsUUFBQSxFQUNDO0FBQUEsTUFBQSxNQUFBLEVBQVksRUFBWjtBQUFBLE1BQ0EsUUFBQSxFQUFZLEVBRFo7QUFBQSxNQUVBLFNBQUEsRUFBWSxFQUZaO0FBQUEsTUFHQSxTQUFBLEVBQVksRUFIWjtLQUZEO0FBQUEsSUFNQSxhQUFBLEVBQWUsRUFOZjtBQUFBLElBT0EsTUFBQSxFQUFTLEVBUFQ7QUFBQSxJQVFBLGFBQUEsRUFDQztBQUFBLE1BQUEsT0FBQSxFQUFhLElBQWI7QUFBQSxNQUNBLFVBQUEsRUFBYSxJQURiO0FBQUEsTUFFQSxPQUFBLEVBQWEsSUFGYjtLQVREO0FBQUEsSUFZQSxTQUFBLEVBQVksRUFaWjtBQUFBLElBYUEsTUFBQSxFQUFTLEVBYlQ7QUFBQSxJQWNBLE9BQUEsRUFBUyxJQWRUO0FBQUEsSUFnQkEsV0FBQSxFQUFjLEVBaEJkO0FBQUEsSUFpQkEsUUFBQSxFQUFjLEVBakJkO0FBQUEsSUFrQkEsS0FBQSxFQUFjLEVBbEJkO0FBQUEsSUFtQkEsV0FBQSxFQUNDO0FBQUEsTUFBQSxNQUFBLEVBQWdCLEVBQWhCO0FBQUEsTUFDQSxhQUFBLEVBQWdCLEVBRGhCO0tBcEJEO0dBRkQsQ0FBQTs7QUFBQSx3QkF5QkEsWUFBQSxHQUFlLFNBQUMsS0FBRCxHQUFBO0FBRWQsSUFBQSxJQUFHLEtBQUssQ0FBQyxJQUFUO0FBQ0MsTUFBQSxLQUFLLENBQUMsR0FBTixHQUFZLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBZCxHQUF5QixHQUF6QixHQUErQixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFwRCxHQUE4RCxHQUE5RCxHQUFvRSxLQUFLLENBQUMsSUFBdEYsQ0FERDtLQUFBO0FBR0EsSUFBQSxJQUFHLEtBQUssQ0FBQyxLQUFUO0FBQ0MsTUFBQSxLQUFLLENBQUMsS0FBTixHQUFjLFdBQVcsQ0FBQyxRQUFaLENBQXFCLEtBQUssQ0FBQyxLQUEzQixFQUFrQyxDQUFsQyxDQUFkLENBREQ7S0FIQTtBQU1BLElBQUEsSUFBRyxLQUFLLENBQUMsSUFBTixJQUFlLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBL0I7QUFDQyxNQUFBLEtBQUssQ0FBQyxTQUFOLEdBQ0M7QUFBQSxRQUFBLElBQUEsRUFBYyxvQkFBb0IsQ0FBQyxnQkFBckIsQ0FBc0MsS0FBSyxDQUFDLElBQTVDLENBQWQ7QUFBQSxRQUNBLFdBQUEsRUFBYyxvQkFBb0IsQ0FBQyxnQkFBckIsQ0FBc0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFuRCxDQURkO09BREQsQ0FERDtLQU5BO0FBV0EsSUFBQSxJQUFHLEtBQUssQ0FBQyxLQUFUO0FBQ0MsTUFBQSxLQUFLLENBQUMsU0FBTixHQUFrQixJQUFDLENBQUEsWUFBRCxDQUFjLEtBQUssQ0FBQyxLQUFwQixDQUFsQixDQUREO0tBWEE7V0FjQSxNQWhCYztFQUFBLENBekJmLENBQUE7O0FBQUEsd0JBMkNBLFlBQUEsR0FBZSxTQUFDLEtBQUQsR0FBQTtBQUVkLFFBQUEscUNBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxFQUFQLENBQUE7QUFFQTtBQUFBLFNBQUEsMkNBQUE7c0JBQUE7QUFDQyxNQUFBLFNBQUEsR0FBZSxJQUFBLEtBQVEsR0FBWCxHQUFvQixpQkFBcEIsR0FBMkMsb0JBQXZELENBQUE7QUFBQSxNQUNBLElBQUEsSUFBUyxnQkFBQSxHQUFnQixTQUFoQixHQUEwQixLQUExQixHQUErQixJQUEvQixHQUFvQyxTQUQ3QyxDQUREO0FBQUEsS0FGQTtXQU1BLEtBUmM7RUFBQSxDQTNDZixDQUFBOztxQkFBQTs7R0FGeUIsY0FKMUIsQ0FBQTs7QUFBQSxNQTJETSxDQUFDLE9BQVAsR0FBaUIsV0EzRGpCLENBQUE7Ozs7O0FDQUEsSUFBQSx5QkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLHNCQUFSLENBQWYsQ0FBQTs7QUFBQSxNQUNBLEdBQWUsT0FBQSxDQUFRLFVBQVIsQ0FEZixDQUFBOztBQUFBO0FBS0ksd0JBQUEsQ0FBQTs7QUFBQSxFQUFBLEdBQUMsQ0FBQSxpQkFBRCxHQUF5QixtQkFBekIsQ0FBQTs7QUFBQSxFQUNBLEdBQUMsQ0FBQSxxQkFBRCxHQUF5Qix1QkFEekIsQ0FBQTs7QUFBQSxnQkFHQSxRQUFBLEdBQVcsSUFIWCxDQUFBOztBQUFBLGdCQUtBLE9BQUEsR0FBVztBQUFBLElBQUEsSUFBQSxFQUFPLElBQVA7QUFBQSxJQUFhLEdBQUEsRUFBTSxJQUFuQjtBQUFBLElBQXlCLEdBQUEsRUFBTSxJQUEvQjtHQUxYLENBQUE7O0FBQUEsZ0JBTUEsUUFBQSxHQUFXO0FBQUEsSUFBQSxJQUFBLEVBQU8sSUFBUDtBQUFBLElBQWEsR0FBQSxFQUFNLElBQW5CO0FBQUEsSUFBeUIsR0FBQSxFQUFNLElBQS9CO0dBTlgsQ0FBQTs7QUFBQSxnQkFRQSxlQUFBLEdBQWtCLENBUmxCLENBQUE7O0FBVWEsRUFBQSxhQUFBLEdBQUE7QUFFVCwrREFBQSxDQUFBO0FBQUEsMkRBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFFBQUQsR0FBWSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQTFCLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxPQUFELEdBQVcsUUFBUSxDQUFDLGNBQVQsQ0FBd0IsU0FBeEIsQ0FEWCxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsRUFBYixDQUFnQixNQUFNLENBQUMsa0JBQXZCLEVBQTJDLElBQUMsQ0FBQSxVQUE1QyxDQUhBLENBQUE7QUFLQSxXQUFPLEtBQVAsQ0FQUztFQUFBLENBVmI7O0FBQUEsZ0JBbUJBLFVBQUEsR0FBYSxTQUFDLE9BQUQsRUFBVSxNQUFWLEdBQUE7QUFFVCxRQUFBLHNCQUFBOztNQUZtQixTQUFPO0tBRTFCO0FBQUEsSUFBQSxJQUFHLENBQUEsTUFBQSxJQUFZLE9BQUEsS0FBVyxFQUExQjtBQUFrQyxhQUFPLElBQVAsQ0FBbEM7S0FBQTtBQUVBO0FBQUEsU0FBQSxtQkFBQTs4QkFBQTtBQUNJLE1BQUEsSUFBRyxHQUFBLEtBQU8sT0FBVjtBQUF1QixlQUFPLFdBQVAsQ0FBdkI7T0FESjtBQUFBLEtBRkE7V0FLQSxNQVBTO0VBQUEsQ0FuQmIsQ0FBQTs7QUFBQSxnQkE0QkEsVUFBQSxHQUFZLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxHQUFaLEVBQWlCLE1BQWpCLEdBQUE7QUFPUixJQUFBLElBQUMsQ0FBQSxlQUFELEVBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFFBQUQsR0FBWSxJQUFDLENBQUEsT0FGYixDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsT0FBRCxHQUFZO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBUDtBQUFBLE1BQWEsR0FBQSxFQUFNLEdBQW5CO0FBQUEsTUFBd0IsR0FBQSxFQUFNLEdBQTlCO0tBSFosQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLE9BQUQsQ0FBUyxHQUFHLENBQUMsaUJBQWIsRUFBZ0MsSUFBQyxDQUFBLFFBQWpDLEVBQTJDLElBQUMsQ0FBQSxPQUE1QyxDQUxBLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxPQUFELENBQVMsR0FBRyxDQUFDLHFCQUFiLEVBQW9DLElBQUMsQ0FBQSxPQUFyQyxDQU5BLENBQUE7QUFRQSxJQUFBLElBQUcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUEzQixDQUFBLENBQUg7QUFBNEMsTUFBQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQTNCLENBQUEsQ0FBQSxDQUE1QztLQVJBO0FBQUEsSUFVQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQsRUFBb0IsR0FBcEIsRUFBeUIsR0FBekIsQ0FWQSxDQUFBO0FBQUEsSUFXQSxJQUFDLENBQUEsY0FBRCxDQUFnQixJQUFoQixDQVhBLENBQUE7V0FhQSxLQXBCUTtFQUFBLENBNUJaLENBQUE7O0FBQUEsZ0JBa0RBLFlBQUEsR0FBYyxTQUFDLElBQUQsRUFBTyxHQUFQLEVBQVksR0FBWixHQUFBO0FBRVYsUUFBQSx5QkFBQTtBQUFBLElBQUEsT0FBQSxHQUFlLElBQUEsS0FBUSxFQUFYLEdBQW1CLE1BQW5CLEdBQStCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFWLENBQXFCLElBQXJCLENBQTNDLENBQUE7QUFBQSxJQUNBLFNBQUEsR0FBWSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFrQixhQUFBLEdBQWEsT0FBL0IsQ0FBQSxJQUE2QyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixpQkFBakIsQ0FEekQsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFRLElBQUMsQ0FBQSxjQUFELENBQWdCLFNBQWhCLEVBQTJCLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixJQUFsQixFQUF3QixHQUF4QixFQUE2QixHQUE3QixDQUEzQixFQUE4RCxLQUE5RCxDQUZSLENBQUE7QUFJQSxJQUFBLElBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFoQixLQUEyQixLQUE5QjtBQUF5QyxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBaEIsR0FBd0IsS0FBeEIsQ0FBekM7S0FKQTtXQU1BLEtBUlU7RUFBQSxDQWxEZCxDQUFBOztBQUFBLGdCQTREQSxjQUFBLEdBQWdCLFNBQUMsSUFBRCxHQUFBO0FBRVosUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBO0FBQVMsY0FBTyxJQUFQO0FBQUEsYUFDQSxJQUFDLENBQUEsUUFBUSxDQUFDLElBRFY7aUJBQ29CLE1BRHBCO0FBQUEsYUFFQSxJQUFDLENBQUEsUUFBUSxDQUFDLEtBRlY7QUFBQSxhQUVpQixJQUFDLENBQUEsUUFBUSxDQUFDLFVBRjNCO2lCQUUyQyxRQUYzQztBQUFBLGFBR0EsSUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUhWO2lCQUd1QixPQUh2QjtBQUFBO2lCQUlBLE1BSkE7QUFBQTtpQkFBVCxDQUFBO0FBQUEsSUFNQSxVQUFBLENBQVcsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUEsR0FBQTtlQUNQLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxHQUFnQixFQUFBLEdBQUUsQ0FBQyxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFQLENBQUYsR0FBa0Isb0NBQWxCLEdBQXNELE1BQXRELEdBQTZELE9BRHRFO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWCxFQUVFLENBRkYsQ0FOQSxDQUFBO1dBVUEsS0FaWTtFQUFBLENBNURoQixDQUFBOztBQUFBLGdCQTBFQSxnQkFBQSxHQUFrQixTQUFDLElBQUQsRUFBTyxHQUFQLEVBQVksR0FBWixHQUFBO0FBRWQsUUFBQSxZQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sRUFBUCxDQUFBO0FBRUEsSUFBQSxJQUFHLElBQUEsS0FBUSxJQUFDLENBQUEsUUFBUSxDQUFDLE9BQWxCLElBQThCLEdBQTlCLElBQXNDLEdBQXpDO0FBQ0ksTUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUF0QixDQUFnQztBQUFBLFFBQUEsSUFBQSxFQUFNLEVBQUEsR0FBRyxHQUFILEdBQU8sR0FBUCxHQUFVLEdBQWhCO09BQWhDLENBQVQsQ0FBQTtBQUVBLE1BQUEsSUFBRyxDQUFBLE1BQUg7QUFDSSxRQUFBLElBQUksQ0FBQyxJQUFMLEdBQVksUUFBWixDQURKO09BQUEsTUFBQTtBQUdJLFFBQUEsSUFBSSxDQUFDLElBQUwsR0FBWSxNQUFNLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBQSxHQUE0QixNQUE1QixHQUFxQyxNQUFNLENBQUMsR0FBUCxDQUFXLE1BQVgsQ0FBckMsR0FBMEQsR0FBdEUsQ0FISjtPQUhKO0tBRkE7V0FVQSxLQVpjO0VBQUEsQ0ExRWxCLENBQUE7O2FBQUE7O0dBRmMsYUFIbEIsQ0FBQTs7QUFBQSxNQTZGTSxDQUFDLE9BQVAsR0FBaUIsR0E3RmpCLENBQUE7Ozs7O0FDQUEsSUFBQSxNQUFBO0VBQUE7O2lTQUFBOztBQUFBO0FBRUksMkJBQUEsQ0FBQTs7Ozs7Ozs7R0FBQTs7QUFBQSxFQUFBLE1BQUMsQ0FBQSxrQkFBRCxHQUFzQixvQkFBdEIsQ0FBQTs7QUFBQSxtQkFFQSxXQUFBLEdBQWMsSUFGZCxDQUFBOztBQUFBLG1CQUlBLE1BQUEsR0FDSTtBQUFBLElBQUEsNkJBQUEsRUFBZ0MsYUFBaEM7QUFBQSxJQUNBLFVBQUEsRUFBZ0MsWUFEaEM7R0FMSixDQUFBOztBQUFBLG1CQVFBLElBQUEsR0FBUyxJQVJULENBQUE7O0FBQUEsbUJBU0EsR0FBQSxHQUFTLElBVFQsQ0FBQTs7QUFBQSxtQkFVQSxHQUFBLEdBQVMsSUFWVCxDQUFBOztBQUFBLG1CQVdBLE1BQUEsR0FBUyxJQVhULENBQUE7O0FBQUEsbUJBYUEsS0FBQSxHQUFRLFNBQUEsR0FBQTtBQUVKLElBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFqQixDQUNJO0FBQUEsTUFBQSxTQUFBLEVBQVksSUFBWjtBQUFBLE1BQ0EsSUFBQSxFQUFZLEdBRFo7S0FESixDQUFBLENBQUE7V0FJQSxLQU5JO0VBQUEsQ0FiUixDQUFBOztBQUFBLG1CQXFCQSxXQUFBLEdBQWMsU0FBRSxJQUFGLEVBQWdCLEdBQWhCLEVBQTZCLEdBQTdCLEdBQUE7QUFFVixJQUZXLElBQUMsQ0FBQSxzQkFBQSxPQUFPLElBRW5CLENBQUE7QUFBQSxJQUZ5QixJQUFDLENBQUEsb0JBQUEsTUFBTSxJQUVoQyxDQUFBO0FBQUEsSUFGc0MsSUFBQyxDQUFBLG9CQUFBLE1BQU0sSUFFN0MsQ0FBQTtBQUFBLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBYSxnQ0FBQSxHQUFnQyxJQUFDLENBQUEsSUFBakMsR0FBc0MsV0FBdEMsR0FBaUQsSUFBQyxDQUFBLEdBQWxELEdBQXNELFdBQXRELEdBQWlFLElBQUMsQ0FBQSxHQUFsRSxHQUFzRSxLQUFuRixDQUFBLENBQUE7QUFFQSxJQUFBLElBQUcsSUFBQyxDQUFBLFdBQUo7QUFBcUIsTUFBQSxJQUFDLENBQUEsV0FBRCxHQUFlLEtBQWYsQ0FBckI7S0FGQTtBQUlBLElBQUEsSUFBRyxDQUFBLElBQUUsQ0FBQSxJQUFMO0FBQWUsTUFBQSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBM0IsQ0FBZjtLQUpBO0FBQUEsSUFNQSxJQUFDLENBQUEsT0FBRCxDQUFTLE1BQU0sQ0FBQyxrQkFBaEIsRUFBb0MsSUFBQyxDQUFBLElBQXJDLEVBQTJDLElBQUMsQ0FBQSxHQUE1QyxFQUFpRCxJQUFDLENBQUEsR0FBbEQsRUFBdUQsSUFBQyxDQUFBLE1BQXhELENBTkEsQ0FBQTtXQVFBLEtBVlU7RUFBQSxDQXJCZCxDQUFBOztBQUFBLG1CQWlDQSxVQUFBLEdBQWEsU0FBQyxLQUFELEVBQWEsT0FBYixFQUE2QixPQUE3QixFQUErQyxNQUEvQyxHQUFBOztNQUFDLFFBQVE7S0FFbEI7O01BRnNCLFVBQVU7S0FFaEM7O01BRnNDLFVBQVU7S0FFaEQ7QUFBQSxJQUZ1RCxJQUFDLENBQUEsU0FBQSxNQUV4RCxDQUFBO0FBQUEsSUFBQSxJQUFHLEtBQUssQ0FBQyxNQUFOLENBQWEsQ0FBYixDQUFBLEtBQXFCLEdBQXhCO0FBQ0ksTUFBQSxLQUFBLEdBQVMsR0FBQSxHQUFHLEtBQVosQ0FESjtLQUFBO0FBRUEsSUFBQSxJQUFHLEtBQUssQ0FBQyxNQUFOLENBQWMsS0FBSyxDQUFDLE1BQU4sR0FBYSxDQUEzQixDQUFBLEtBQW9DLEdBQXZDO0FBQ0ksTUFBQSxLQUFBLEdBQVEsRUFBQSxHQUFHLEtBQUgsR0FBUyxHQUFqQixDQURKO0tBRkE7QUFLQSxJQUFBLElBQUcsQ0FBQSxPQUFIO0FBQ0ksTUFBQSxJQUFDLENBQUEsT0FBRCxDQUFTLE1BQU0sQ0FBQyxrQkFBaEIsRUFBb0MsS0FBcEMsRUFBMkMsSUFBM0MsRUFBaUQsSUFBQyxDQUFBLE1BQWxELENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FGSjtLQUxBO0FBQUEsSUFTQSxJQUFDLENBQUEsUUFBRCxDQUFVLEtBQVYsRUFBaUI7QUFBQSxNQUFBLE9BQUEsRUFBUyxJQUFUO0FBQUEsTUFBZSxPQUFBLEVBQVMsT0FBeEI7S0FBakIsQ0FUQSxDQUFBO1dBV0EsS0FiUztFQUFBLENBakNiLENBQUE7O0FBQUEsbUJBZ0RBLEVBQUEsR0FBSyxTQUFBLEdBQUE7QUFFRCxXQUFPLE1BQU0sQ0FBQyxFQUFkLENBRkM7RUFBQSxDQWhETCxDQUFBOztnQkFBQTs7R0FGaUIsUUFBUSxDQUFDLE9BQTlCLENBQUE7O0FBQUEsTUFzRE0sQ0FBQyxPQUFQLEdBQWlCLE1BdERqQixDQUFBOzs7OztBQ0FBO0FBQUE7O0dBQUE7QUFBQSxJQUFBLFNBQUE7RUFBQSxrRkFBQTs7QUFBQTtBQUtJLHNCQUFBLElBQUEsR0FBVSxJQUFWLENBQUE7O0FBQUEsc0JBQ0EsT0FBQSxHQUFVLEtBRFYsQ0FBQTs7QUFBQSxzQkFHQSxRQUFBLEdBQWtCLENBSGxCLENBQUE7O0FBQUEsc0JBSUEsZUFBQSxHQUFrQixDQUpsQixDQUFBOztBQU1jLEVBQUEsbUJBQUMsSUFBRCxFQUFRLFFBQVIsR0FBQTtBQUVWLElBRmlCLElBQUMsQ0FBQSxXQUFBLFFBRWxCLENBQUE7QUFBQSx5Q0FBQSxDQUFBO0FBQUEsMkRBQUEsQ0FBQTtBQUFBLElBQUEsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxJQUFWLEVBQWdCLElBQUMsQ0FBQSxjQUFqQixDQUFBLENBQUE7QUFFQSxXQUFPLElBQVAsQ0FKVTtFQUFBLENBTmQ7O0FBQUEsc0JBWUEsY0FBQSxHQUFpQixTQUFDLElBQUQsR0FBQTtBQUViLElBQUEsSUFBQyxDQUFBLElBQUQsR0FBVyxJQUFYLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFEWCxDQUFBOztNQUVBLElBQUMsQ0FBQTtLQUZEO1dBSUEsS0FOYTtFQUFBLENBWmpCLENBQUE7O0FBb0JBO0FBQUE7O0tBcEJBOztBQUFBLHNCQXVCQSxLQUFBLEdBQVEsU0FBQyxLQUFELEdBQUE7QUFFSixRQUFBLHNCQUFBO0FBQUEsSUFBQSxJQUFVLENBQUEsSUFBRSxDQUFBLE9BQVo7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUVBLElBQUEsSUFBRyxLQUFIO0FBRUksTUFBQSxDQUFBLEdBQUksSUFBQyxDQUFBLElBQUssQ0FBQSxLQUFBLENBQVYsQ0FBQTtBQUVBLE1BQUEsSUFBRyxDQUFIO0FBRUksUUFBQSxJQUFBLEdBQU8sQ0FBQyxNQUFELEVBQVMsT0FBVCxDQUFQLENBQUE7QUFDQSxhQUFBLHdDQUFBO3NCQUFBO0FBQUEsVUFBRSxJQUFJLENBQUMsSUFBTCxDQUFVLEdBQVYsQ0FBRixDQUFBO0FBQUEsU0FEQTtBQUlBLFFBQUEsSUFBRyxNQUFNLENBQUMsRUFBVjtBQUNJLFVBQUEsRUFBRSxDQUFDLEtBQUgsQ0FBUyxJQUFULEVBQWUsSUFBZixDQUFBLENBREo7U0FBQSxNQUVLLElBQUcsSUFBQyxDQUFBLFFBQUQsSUFBYSxJQUFDLENBQUEsZUFBakI7QUFDRCxVQUFBLElBQUMsQ0FBQSxPQUFELEdBQVcsS0FBWCxDQURDO1NBQUEsTUFBQTtBQUdELFVBQUEsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7bUJBQUEsU0FBQSxHQUFBO0FBQ1AsY0FBQSxLQUFDLENBQUEsS0FBRCxDQUFPLEtBQVAsQ0FBQSxDQUFBO3FCQUNBLEtBQUMsQ0FBQSxRQUFELEdBRk87WUFBQSxFQUFBO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBR0UsSUFIRixDQUFBLENBSEM7U0FSVDtPQUpKO0tBRkE7V0FzQkEsS0F4Qkk7RUFBQSxDQXZCUixDQUFBOzttQkFBQTs7SUFMSixDQUFBOztBQUFBLE1Bc0RNLENBQUMsT0FBUCxHQUFpQixTQXREakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLCtDQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsc0JBQVIsQ0FBZixDQUFBOztBQUFBLFFBQ0EsR0FBZSxPQUFBLENBQVEsbUJBQVIsQ0FEZixDQUFBOztBQUFBLFVBRUEsR0FBZSxPQUFBLENBQVEscUJBQVIsQ0FGZixDQUFBOztBQUFBO0FBTUMsZ0NBQUEsQ0FBQTs7QUFBQSx3QkFBQSxRQUFBLEdBQVksSUFBWixDQUFBOztBQUFBLHdCQUdBLE9BQUEsR0FBZSxLQUhmLENBQUE7O0FBQUEsd0JBSUEsWUFBQSxHQUFlLElBSmYsQ0FBQTs7QUFBQSx3QkFLQSxXQUFBLEdBQWUsSUFMZixDQUFBOztBQU9jLEVBQUEscUJBQUEsR0FBQTtBQUViLG1EQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEseUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFFBQUQsR0FBYSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsSUFBM0IsQ0FBQTtBQUFBLElBRUEsMkNBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTmE7RUFBQSxDQVBkOztBQUFBLHdCQWVBLEtBQUEsR0FBUSxTQUFDLE9BQUQsRUFBVSxFQUFWLEdBQUE7QUFJUCxRQUFBLFFBQUE7O01BSmlCLEtBQUc7S0FJcEI7QUFBQSxJQUFBLElBQVUsSUFBQyxDQUFBLE9BQVg7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUZBLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFIWCxDQUFBO0FBQUEsSUFLQSxRQUFBLEdBQVcsQ0FBQyxDQUFDLFFBQUYsQ0FBQSxDQUxYLENBQUE7QUFPQSxZQUFPLE9BQVA7QUFBQSxXQUNNLFFBRE47QUFFRSxRQUFBLFVBQVUsQ0FBQyxLQUFYLENBQWlCLFFBQWpCLENBQUEsQ0FGRjtBQUNNO0FBRE4sV0FHTSxVQUhOO0FBSUUsUUFBQSxRQUFRLENBQUMsS0FBVCxDQUFlLFFBQWYsQ0FBQSxDQUpGO0FBQUEsS0FQQTtBQUFBLElBYUEsUUFBUSxDQUFDLElBQVQsQ0FBYyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxHQUFELEdBQUE7ZUFBUyxLQUFDLENBQUEsV0FBRCxDQUFhLE9BQWIsRUFBc0IsR0FBdEIsRUFBVDtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWQsQ0FiQSxDQUFBO0FBQUEsSUFjQSxRQUFRLENBQUMsSUFBVCxDQUFjLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLEdBQUQsR0FBQTtlQUFTLEtBQUMsQ0FBQSxRQUFELENBQVUsT0FBVixFQUFtQixHQUFuQixFQUFUO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBZCxDQWRBLENBQUE7QUFBQSxJQWVBLFFBQVEsQ0FBQyxNQUFULENBQWdCLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFBTSxLQUFDLENBQUEsWUFBRCxDQUFjLEVBQWQsRUFBTjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWhCLENBZkEsQ0FBQTtBQWlCQTtBQUFBOzs7T0FqQkE7QUFBQSxJQXFCQSxJQUFDLENBQUEsWUFBRCxHQUFnQixVQUFBLENBQVcsSUFBQyxDQUFBLFlBQVosRUFBMEIsSUFBQyxDQUFBLFdBQTNCLENBckJoQixDQUFBO1dBdUJBLFNBM0JPO0VBQUEsQ0FmUixDQUFBOztBQUFBLHdCQTRDQSxXQUFBLEdBQWMsU0FBQyxPQUFELEVBQVUsSUFBVixHQUFBO1dBSWIsS0FKYTtFQUFBLENBNUNkLENBQUE7O0FBQUEsd0JBa0RBLFFBQUEsR0FBVyxTQUFDLE9BQUQsRUFBVSxJQUFWLEdBQUE7V0FJVixLQUpVO0VBQUEsQ0FsRFgsQ0FBQTs7QUFBQSx3QkF3REEsWUFBQSxHQUFlLFNBQUMsRUFBRCxHQUFBOztNQUFDLEtBQUc7S0FFbEI7QUFBQSxJQUFBLElBQUEsQ0FBQSxJQUFlLENBQUEsT0FBZjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFFQSxZQUFBLENBQWEsSUFBQyxDQUFBLFlBQWQsQ0FGQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBSkEsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLE9BQUQsR0FBVyxLQUxYLENBQUE7O01BT0E7S0FQQTtXQVNBLEtBWGM7RUFBQSxDQXhEZixDQUFBOztBQXFFQTtBQUFBOztLQXJFQTs7QUFBQSx3QkF3RUEsVUFBQSxHQUFhLFNBQUEsR0FBQTtXQUlaLEtBSlk7RUFBQSxDQXhFYixDQUFBOztBQUFBLHdCQThFQSxVQUFBLEdBQWEsU0FBQSxHQUFBO1dBSVosS0FKWTtFQUFBLENBOUViLENBQUE7O3FCQUFBOztHQUZ5QixhQUoxQixDQUFBOztBQUFBLE1BMEZNLENBQUMsT0FBUCxHQUFpQixXQTFGakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLDRCQUFBOztBQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsWUFBUixDQUFULENBQUE7O0FBQUE7b0NBSUM7O0FBQUEsRUFBQSxvQkFBQyxDQUFBLE1BQUQsR0FDQztBQUFBLElBQUEsZUFBQSxFQUFrQixDQUFsQjtBQUFBLElBQ0EsZUFBQSxFQUFrQixDQURsQjtBQUFBLElBR0EsaUJBQUEsRUFBb0IsRUFIcEI7QUFBQSxJQUlBLGlCQUFBLEVBQW9CLEVBSnBCO0FBQUEsSUFNQSxrQkFBQSxFQUFxQixFQU5yQjtBQUFBLElBT0Esa0JBQUEsRUFBcUIsRUFQckI7QUFBQSxJQVNBLEtBQUEsRUFBUSx1RUFBdUUsQ0FBQyxLQUF4RSxDQUE4RSxFQUE5RSxDQUFpRixDQUFDLEdBQWxGLENBQXNGLFNBQUMsSUFBRCxHQUFBO0FBQVUsYUFBTyxNQUFBLENBQU8sSUFBUCxDQUFQLENBQVY7SUFBQSxDQUF0RixDQVRSO0FBQUEsSUFXQSxhQUFBLEVBQWdCLG9HQVhoQjtHQURELENBQUE7O0FBQUEsRUFjQSxvQkFBQyxDQUFBLFVBQUQsR0FBYyxFQWRkLENBQUE7O0FBQUEsRUFnQkEsb0JBQUMsQ0FBQSxpQkFBRCxHQUFxQixTQUFDLEdBQUQsR0FBQTtBQUVwQixRQUFBLFFBQUE7QUFBQSxJQUFBLEVBQUEsR0FBSyxHQUFHLENBQUMsSUFBSixDQUFTLGtCQUFULENBQUwsQ0FBQTtBQUVBLElBQUEsSUFBRyxFQUFBLElBQU8sb0JBQUMsQ0FBQSxVQUFZLENBQUEsRUFBQSxDQUF2QjtBQUNDLE1BQUEsSUFBQSxHQUFPLG9CQUFDLENBQUEsVUFBWSxDQUFBLEVBQUEsQ0FBcEIsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLG9CQUFDLENBQUEsVUFBRCxDQUFZLEdBQVosQ0FBQSxDQUFBO0FBQUEsTUFDQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxlQUFELENBQWlCLEdBQWpCLENBRFAsQ0FIRDtLQUZBO1dBUUEsS0FWb0I7RUFBQSxDQWhCckIsQ0FBQTs7QUFBQSxFQTRCQSxvQkFBQyxDQUFBLGVBQUQsR0FBbUIsU0FBQyxHQUFELEdBQUE7QUFFbEIsUUFBQSxTQUFBO0FBQUEsSUFBQSxLQUFBLEdBQVEsRUFBUixDQUFBO0FBQUEsSUFFQSxHQUFHLENBQUMsSUFBSixDQUFTLHNCQUFULENBQWdDLENBQUMsSUFBakMsQ0FBc0MsU0FBQyxDQUFELEVBQUksRUFBSixHQUFBO0FBQ3JDLFVBQUEsT0FBQTtBQUFBLE1BQUEsT0FBQSxHQUFVLENBQUEsQ0FBRSxFQUFGLENBQVYsQ0FBQTthQUNBLEtBQUssQ0FBQyxJQUFOLENBQ0M7QUFBQSxRQUFBLEdBQUEsRUFBYSxPQUFiO0FBQUEsUUFDQSxTQUFBLEVBQWEsT0FBTyxDQUFDLElBQVIsQ0FBYSxvQkFBYixDQURiO09BREQsRUFGcUM7SUFBQSxDQUF0QyxDQUZBLENBQUE7QUFBQSxJQVFBLEVBQUEsR0FBSyxDQUFDLENBQUMsUUFBRixDQUFBLENBUkwsQ0FBQTtBQUFBLElBU0EsR0FBRyxDQUFDLElBQUosQ0FBUyxrQkFBVCxFQUE2QixFQUE3QixDQVRBLENBQUE7QUFBQSxJQVdBLG9CQUFDLENBQUEsVUFBWSxDQUFBLEVBQUEsQ0FBYixHQUNDO0FBQUEsTUFBQSxJQUFBLEVBQVUsQ0FBQyxDQUFDLEtBQUYsQ0FBUSxLQUFSLEVBQWUsV0FBZixDQUEyQixDQUFDLElBQTVCLENBQWlDLEVBQWpDLENBQVY7QUFBQSxNQUNBLEdBQUEsRUFBVSxHQURWO0FBQUEsTUFFQSxLQUFBLEVBQVUsS0FGVjtBQUFBLE1BR0EsT0FBQSxFQUFVLElBSFY7S0FaRCxDQUFBO1dBaUJBLG9CQUFDLENBQUEsVUFBWSxDQUFBLEVBQUEsRUFuQks7RUFBQSxDQTVCbkIsQ0FBQTs7QUFBQSxFQWlEQSxvQkFBQyxDQUFBLFVBQUQsR0FBYyxTQUFDLEdBQUQsR0FBQTtBQUViLFFBQUEsa0NBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxHQUFHLENBQUMsSUFBSixDQUFBLENBQVUsQ0FBQyxLQUFYLENBQWlCLEVBQWpCLENBQVIsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLEdBQUcsQ0FBQyxJQUFKLENBQVMsNkJBQVQsQ0FBQSxJQUEyQyxFQURuRCxDQUFBO0FBQUEsSUFFQSxJQUFBLEdBQU8sRUFGUCxDQUFBO0FBR0EsU0FBQSw0Q0FBQTt1QkFBQTtBQUNDLE1BQUEsSUFBSSxDQUFDLElBQUwsQ0FBVSxvQkFBQyxDQUFBLGVBQUQsQ0FBaUIsb0JBQUMsQ0FBQSxNQUFNLENBQUMsYUFBekIsRUFBd0M7QUFBQSxRQUFBLElBQUEsRUFBTyxJQUFQO0FBQUEsUUFBYSxLQUFBLEVBQU8sS0FBcEI7T0FBeEMsQ0FBVixDQUFBLENBREQ7QUFBQSxLQUhBO0FBQUEsSUFNQSxHQUFHLENBQUMsSUFBSixDQUFTLElBQUksQ0FBQyxJQUFMLENBQVUsRUFBVixDQUFULENBTkEsQ0FBQTtXQVFBLEtBVmE7RUFBQSxDQWpEZCxDQUFBOztBQUFBLEVBNkRBLG9CQUFDLENBQUEsWUFBRCxHQUFnQixTQUFDLElBQUQsR0FBQTtXQUVmLEtBRmU7RUFBQSxDQTdEaEIsQ0FBQTs7QUFBQSxFQWtFQSxvQkFBQyxDQUFBLFlBQUQsR0FBZ0IsU0FBQyxJQUFELEVBQU8sTUFBUCxFQUFlLFNBQWYsR0FBQTtBQUVmLFFBQUEsbUNBQUE7O01BRjhCLFlBQVU7S0FFeEM7QUFBQTtBQUFBLFNBQUEsbURBQUE7cUJBQUE7QUFFQyxNQUFBLFVBQUE7QUFBYSxnQkFBTyxJQUFQO0FBQUEsZUFDUCxNQUFBLEtBQVUsT0FESDttQkFDZ0IsSUFBSSxDQUFDLFVBRHJCO0FBQUEsZUFFUCxNQUFBLEtBQVUsT0FGSDttQkFFZ0IsSUFBQyxDQUFBLGNBQUQsQ0FBQSxFQUZoQjtBQUFBLGVBR1AsTUFBQSxLQUFVLE9BSEg7bUJBR2dCLEdBSGhCO0FBQUE7bUJBSVAsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFkLENBQUEsSUFBb0IsR0FKYjtBQUFBO21DQUFiLENBQUE7QUFNQSxNQUFBLElBQUcsVUFBQSxLQUFjLEdBQWpCO0FBQTBCLFFBQUEsVUFBQSxHQUFhLFFBQWIsQ0FBMUI7T0FOQTtBQUFBLE1BUUEsSUFBSSxDQUFDLFVBQUwsR0FBa0Isb0JBQUMsQ0FBQSxvQkFBRCxDQUFBLENBUmxCLENBQUE7QUFBQSxNQVNBLElBQUksQ0FBQyxVQUFMLEdBQWtCLFVBVGxCLENBQUE7QUFBQSxNQVVBLElBQUksQ0FBQyxTQUFMLEdBQWtCLFNBVmxCLENBRkQ7QUFBQSxLQUFBO1dBY0EsS0FoQmU7RUFBQSxDQWxFaEIsQ0FBQTs7QUFBQSxFQW9GQSxvQkFBQyxDQUFBLG9CQUFELEdBQXdCLFNBQUEsR0FBQTtBQUV2QixRQUFBLHVCQUFBO0FBQUEsSUFBQSxLQUFBLEdBQVEsRUFBUixDQUFBO0FBQUEsSUFFQSxTQUFBLEdBQVksQ0FBQyxDQUFDLE1BQUYsQ0FBUyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxlQUFqQixFQUFrQyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxlQUExQyxDQUZaLENBQUE7QUFJQSxTQUFTLDhGQUFULEdBQUE7QUFDQyxNQUFBLEtBQUssQ0FBQyxJQUFOLENBQ0M7QUFBQSxRQUFBLElBQUEsRUFBVyxvQkFBQyxDQUFBLGNBQUQsQ0FBQSxDQUFYO0FBQUEsUUFDQSxPQUFBLEVBQVcsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxpQkFBakIsRUFBb0Msb0JBQUMsQ0FBQSxNQUFNLENBQUMsaUJBQTVDLENBRFg7QUFBQSxRQUVBLFFBQUEsRUFBVyxDQUFDLENBQUMsTUFBRixDQUFTLG9CQUFDLENBQUEsTUFBTSxDQUFDLGtCQUFqQixFQUFxQyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxrQkFBN0MsQ0FGWDtPQURELENBQUEsQ0FERDtBQUFBLEtBSkE7V0FVQSxNQVp1QjtFQUFBLENBcEZ4QixDQUFBOztBQUFBLEVBa0dBLG9CQUFDLENBQUEsY0FBRCxHQUFrQixTQUFBLEdBQUE7QUFFakIsUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxNQUFNLENBQUMsS0FBTyxDQUFBLENBQUMsQ0FBQyxNQUFGLENBQVMsQ0FBVCxFQUFZLG9CQUFDLENBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFkLEdBQXFCLENBQWpDLENBQUEsQ0FBdEIsQ0FBQTtXQUVBLEtBSmlCO0VBQUEsQ0FsR2xCLENBQUE7O0FBQUEsRUF3R0Esb0JBQUMsQ0FBQSx1QkFBRCxHQUEyQixTQUFDLEtBQUQsR0FBQTtBQUUxQixRQUFBLGdGQUFBO0FBQUEsSUFBQSxXQUFBLEdBQWMsQ0FBZCxDQUFBO0FBQUEsSUFDQSxjQUFBLEdBQWlCLENBRGpCLENBQUE7QUFHQSxTQUFBLG9EQUFBO3NCQUFBO0FBRUMsTUFBQSxJQUFBLEdBQU8sQ0FBUCxDQUFBO0FBQ0E7QUFBQSxXQUFBLDZDQUFBOzZCQUFBO0FBQUEsUUFBQyxJQUFBLElBQVEsU0FBUyxDQUFDLE9BQVYsR0FBb0IsU0FBUyxDQUFDLFFBQXZDLENBQUE7QUFBQSxPQURBO0FBRUEsTUFBQSxJQUFHLElBQUEsR0FBTyxXQUFWO0FBQ0MsUUFBQSxXQUFBLEdBQWMsSUFBZCxDQUFBO0FBQUEsUUFDQSxjQUFBLEdBQWlCLENBRGpCLENBREQ7T0FKRDtBQUFBLEtBSEE7V0FXQSxlQWIwQjtFQUFBLENBeEczQixDQUFBOztBQUFBLEVBdUhBLG9CQUFDLENBQUEsYUFBRCxHQUFpQixTQUFDLElBQUQsRUFBTyxVQUFQLEVBQW1CLEVBQW5CLEdBQUE7QUFFaEIsUUFBQSx5REFBQTtBQUFBLElBQUEsVUFBQSxHQUFhLENBQWIsQ0FBQTtBQUVBLElBQUEsSUFBRyxVQUFIO0FBQ0MsTUFBQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFJLENBQUMsS0FBbkIsRUFBMEIsVUFBMUIsRUFBc0MsSUFBdEMsRUFBNEMsRUFBNUMsQ0FBQSxDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsY0FBQSxHQUFpQixvQkFBQyxDQUFBLHVCQUFELENBQXlCLElBQUksQ0FBQyxLQUE5QixDQUFqQixDQUFBO0FBQ0E7QUFBQSxXQUFBLG1EQUFBO3VCQUFBO0FBQ0MsUUFBQSxJQUFBLEdBQU8sQ0FBRSxJQUFJLENBQUMsS0FBUCxFQUFjLENBQWQsRUFBaUIsS0FBakIsQ0FBUCxDQUFBO0FBQ0EsUUFBQSxJQUFHLENBQUEsS0FBSyxjQUFSO0FBQTRCLFVBQUEsSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFWLENBQUEsQ0FBNUI7U0FEQTtBQUFBLFFBRUEsb0JBQUMsQ0FBQSxZQUFZLENBQUMsS0FBZCxDQUFvQixvQkFBcEIsRUFBdUIsSUFBdkIsQ0FGQSxDQUREO0FBQUEsT0FKRDtLQUZBO1dBV0EsS0FiZ0I7RUFBQSxDQXZIakIsQ0FBQTs7QUFBQSxFQXNJQSxvQkFBQyxDQUFBLFlBQUQsR0FBZ0IsU0FBQyxLQUFELEVBQVEsR0FBUixFQUFhLE9BQWIsRUFBc0IsRUFBdEIsR0FBQTtBQUVmLFFBQUEsSUFBQTtBQUFBLElBQUEsSUFBQSxHQUFPLEtBQU0sQ0FBQSxHQUFBLENBQWIsQ0FBQTtBQUVBLElBQUEsSUFBRyxPQUFIO0FBRUMsTUFBQSxvQkFBQyxDQUFBLGtCQUFELENBQW9CLElBQXBCLEVBQTBCLFNBQUEsR0FBQTtBQUV6QixRQUFBLElBQUcsR0FBQSxLQUFPLEtBQUssQ0FBQyxNQUFOLEdBQWEsQ0FBdkI7aUJBQ0Msb0JBQUMsQ0FBQSxpQkFBRCxDQUFtQixFQUFuQixFQUREO1NBQUEsTUFBQTtpQkFHQyxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxLQUFkLEVBQXFCLEdBQUEsR0FBSSxDQUF6QixFQUE0QixPQUE1QixFQUFxQyxFQUFyQyxFQUhEO1NBRnlCO01BQUEsQ0FBMUIsQ0FBQSxDQUZEO0tBQUEsTUFBQTtBQVdDLE1BQUEsSUFBRyxNQUFBLENBQUEsRUFBQSxLQUFhLFVBQWhCO0FBQ0MsUUFBQSxvQkFBQyxDQUFBLGtCQUFELENBQW9CLElBQXBCLEVBQTBCLFNBQUEsR0FBQTtpQkFBRyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEVBQW5CLEVBQUg7UUFBQSxDQUExQixDQUFBLENBREQ7T0FBQSxNQUFBO0FBR0MsUUFBQSxvQkFBQyxDQUFBLGtCQUFELENBQW9CLElBQXBCLENBQUEsQ0FIRDtPQVhEO0tBRkE7V0FrQkEsS0FwQmU7RUFBQSxDQXRJaEIsQ0FBQTs7QUFBQSxFQTRKQSxvQkFBQyxDQUFBLGtCQUFELEdBQXNCLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTtBQUVyQixRQUFBLFNBQUE7QUFBQSxJQUFBLElBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFuQjtBQUVDLE1BQUEsU0FBQSxHQUFZLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBaEIsQ0FBQSxDQUFaLENBQUE7QUFBQSxNQUVBLFVBQUEsQ0FBVyxTQUFBLEdBQUE7QUFDVixRQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBVCxDQUFjLFNBQVMsQ0FBQyxJQUF4QixDQUFBLENBQUE7ZUFFQSxVQUFBLENBQVcsU0FBQSxHQUFBO2lCQUNWLG9CQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsRUFBMEIsRUFBMUIsRUFEVTtRQUFBLENBQVgsRUFFRSxTQUFTLENBQUMsUUFGWixFQUhVO01BQUEsQ0FBWCxFQU9FLFNBQVMsQ0FBQyxPQVBaLENBRkEsQ0FGRDtLQUFBLE1BQUE7QUFlQyxNQUFBLElBQUksQ0FBQyxHQUNKLENBQUMsSUFERixDQUNPLDBCQURQLEVBQ21DLElBQUksQ0FBQyxTQUR4QyxDQUVDLENBQUMsSUFGRixDQUVPLElBQUksQ0FBQyxVQUZaLENBQUEsQ0FBQTs7UUFJQTtPQW5CRDtLQUFBO1dBcUJBLEtBdkJxQjtFQUFBLENBNUp0QixDQUFBOztBQUFBLEVBcUxBLG9CQUFDLENBQUEsaUJBQUQsR0FBcUIsU0FBQyxFQUFELEdBQUE7O01BRXBCO0tBQUE7V0FFQSxLQUpvQjtFQUFBLENBckxyQixDQUFBOztBQUFBLEVBMkxBLG9CQUFDLENBQUEsZUFBRCxHQUFtQixTQUFDLEdBQUQsRUFBTSxJQUFOLEdBQUE7QUFFbEIsV0FBTyxHQUFHLENBQUMsT0FBSixDQUFZLGlCQUFaLEVBQStCLFNBQUMsQ0FBRCxFQUFJLENBQUosR0FBQTtBQUNyQyxVQUFBLENBQUE7QUFBQSxNQUFBLENBQUEsR0FBSSxJQUFLLENBQUEsQ0FBQSxDQUFULENBQUE7QUFDQyxNQUFBLElBQUcsTUFBQSxDQUFBLENBQUEsS0FBWSxRQUFaLElBQXdCLE1BQUEsQ0FBQSxDQUFBLEtBQVksUUFBdkM7ZUFBcUQsRUFBckQ7T0FBQSxNQUFBO2VBQTRELEVBQTVEO09BRm9DO0lBQUEsQ0FBL0IsQ0FBUCxDQUZrQjtFQUFBLENBM0xuQixDQUFBOztBQUFBLEVBaU1BLG9CQUFDLENBQUEsRUFBRCxHQUFNLFNBQUMsVUFBRCxFQUFhLEdBQWIsRUFBa0IsU0FBbEIsRUFBNkIsVUFBN0IsRUFBK0MsRUFBL0MsR0FBQTtBQUVMLFFBQUEsb0JBQUE7O01BRmtDLGFBQVc7S0FFN0M7O01BRm9ELEtBQUc7S0FFdkQ7QUFBQSxJQUFBLElBQUcsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxHQUFWLENBQUg7QUFDQyxXQUFBLDBDQUFBO3VCQUFBO0FBQUEsUUFBQyxvQkFBQyxDQUFBLEVBQUQsQ0FBSSxVQUFKLEVBQWdCLElBQWhCLEVBQXNCLFNBQXRCLEVBQWlDLEVBQWpDLENBQUQsQ0FBQTtBQUFBLE9BQUE7QUFDQSxZQUFBLENBRkQ7S0FBQTtBQUFBLElBSUEsSUFBQSxHQUFPLG9CQUFDLENBQUEsaUJBQUQsQ0FBbUIsR0FBbkIsQ0FKUCxDQUFBO0FBQUEsSUFLQSxJQUFJLENBQUMsT0FBTCxHQUFlLElBTGYsQ0FBQTtBQUFBLElBT0Esb0JBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixVQUFwQixFQUFnQyxTQUFoQyxDQVBBLENBQUE7QUFBQSxJQVFBLG9CQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsVUFBckIsRUFBaUMsRUFBakMsQ0FSQSxDQUFBO1dBVUEsS0FaSztFQUFBLENBak1OLENBQUE7O0FBQUEsRUErTUEsb0JBQUMsQ0FBQSxJQUFBLENBQUQsR0FBTSxTQUFDLEdBQUQsRUFBTSxTQUFOLEVBQWlCLFVBQWpCLEVBQW1DLEVBQW5DLEdBQUE7QUFFTCxRQUFBLG9CQUFBOztNQUZzQixhQUFXO0tBRWpDOztNQUZ3QyxLQUFHO0tBRTNDO0FBQUEsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLENBQVUsR0FBVixDQUFIO0FBQ0MsV0FBQSwwQ0FBQTt1QkFBQTtBQUFBLFFBQUMsb0JBQUMsQ0FBQSxJQUFBLENBQUQsQ0FBSSxJQUFKLEVBQVUsU0FBVixFQUFxQixFQUFyQixDQUFELENBQUE7QUFBQSxPQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEdBQW5CLENBSlAsQ0FBQTtBQUFBLElBS0EsSUFBSSxDQUFDLE9BQUwsR0FBZSxJQUxmLENBQUE7QUFBQSxJQU9BLG9CQUFDLENBQUEsWUFBRCxDQUFjLElBQWQsRUFBb0IsT0FBcEIsRUFBNkIsU0FBN0IsQ0FQQSxDQUFBO0FBQUEsSUFRQSxvQkFBQyxDQUFBLGFBQUQsQ0FBZSxJQUFmLEVBQXFCLFVBQXJCLEVBQWlDLEVBQWpDLENBUkEsQ0FBQTtXQVVBLEtBWks7RUFBQSxDQS9NTixDQUFBOztBQUFBLEVBNk5BLG9CQUFDLENBQUEsR0FBRCxHQUFPLFNBQUMsR0FBRCxFQUFNLFNBQU4sRUFBaUIsVUFBakIsRUFBbUMsRUFBbkMsR0FBQTtBQUVOLFFBQUEsb0JBQUE7O01BRnVCLGFBQVc7S0FFbEM7O01BRnlDLEtBQUc7S0FFNUM7QUFBQSxJQUFBLElBQUcsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxHQUFWLENBQUg7QUFDQyxXQUFBLDBDQUFBO3VCQUFBO0FBQUEsUUFBQyxvQkFBQyxDQUFBLEdBQUQsQ0FBSyxJQUFMLEVBQVcsU0FBWCxFQUFzQixFQUF0QixDQUFELENBQUE7QUFBQSxPQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEdBQW5CLENBSlAsQ0FBQTtBQUtBLElBQUEsSUFBVSxDQUFBLElBQUssQ0FBQyxPQUFoQjtBQUFBLFlBQUEsQ0FBQTtLQUxBO0FBQUEsSUFPQSxJQUFJLENBQUMsT0FBTCxHQUFlLEtBUGYsQ0FBQTtBQUFBLElBU0Esb0JBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixPQUFwQixFQUE2QixTQUE3QixDQVRBLENBQUE7QUFBQSxJQVVBLG9CQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsVUFBckIsRUFBaUMsRUFBakMsQ0FWQSxDQUFBO1dBWUEsS0FkTTtFQUFBLENBN05QLENBQUE7O0FBQUEsRUE2T0Esb0JBQUMsQ0FBQSxRQUFELEdBQVksU0FBQyxHQUFELEVBQU0sU0FBTixFQUFpQixVQUFqQixFQUFtQyxFQUFuQyxHQUFBO0FBRVgsUUFBQSxvQkFBQTs7TUFGNEIsYUFBVztLQUV2Qzs7TUFGOEMsS0FBRztLQUVqRDtBQUFBLElBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixDQUFVLEdBQVYsQ0FBSDtBQUNDLFdBQUEsMENBQUE7dUJBQUE7QUFBQSxRQUFDLG9CQUFDLENBQUEsUUFBRCxDQUFVLElBQVYsRUFBZ0IsU0FBaEIsRUFBMkIsRUFBM0IsQ0FBRCxDQUFBO0FBQUEsT0FBQTtBQUNBLFlBQUEsQ0FGRDtLQUFBO0FBQUEsSUFJQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxpQkFBRCxDQUFtQixHQUFuQixDQUpQLENBQUE7QUFNQSxJQUFBLElBQVUsQ0FBQSxJQUFLLENBQUMsT0FBaEI7QUFBQSxZQUFBLENBQUE7S0FOQTtBQUFBLElBUUEsb0JBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixPQUFwQixFQUE2QixTQUE3QixDQVJBLENBQUE7QUFBQSxJQVNBLG9CQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsVUFBckIsRUFBaUMsRUFBakMsQ0FUQSxDQUFBO1dBV0EsS0FiVztFQUFBLENBN09aLENBQUE7O0FBQUEsRUE0UEEsb0JBQUMsQ0FBQSxVQUFELEdBQWMsU0FBQyxHQUFELEVBQU0sU0FBTixFQUFpQixVQUFqQixFQUFtQyxFQUFuQyxHQUFBO0FBRWIsUUFBQSxvQkFBQTs7TUFGOEIsYUFBVztLQUV6Qzs7TUFGZ0QsS0FBRztLQUVuRDtBQUFBLElBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixDQUFVLEdBQVYsQ0FBSDtBQUNDLFdBQUEsMENBQUE7dUJBQUE7QUFBQSxRQUFDLG9CQUFDLENBQUEsVUFBRCxDQUFZLElBQVosRUFBa0IsU0FBbEIsRUFBNkIsRUFBN0IsQ0FBRCxDQUFBO0FBQUEsT0FBQTtBQUNBLFlBQUEsQ0FGRDtLQUFBO0FBQUEsSUFJQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxpQkFBRCxDQUFtQixHQUFuQixDQUpQLENBQUE7QUFNQSxJQUFBLElBQVUsQ0FBQSxJQUFLLENBQUMsT0FBaEI7QUFBQSxZQUFBLENBQUE7S0FOQTtBQUFBLElBUUEsb0JBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixPQUFwQixFQUE2QixTQUE3QixDQVJBLENBQUE7QUFBQSxJQVNBLG9CQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsVUFBckIsRUFBaUMsRUFBakMsQ0FUQSxDQUFBO1dBV0EsS0FiYTtFQUFBLENBNVBkLENBQUE7O0FBQUEsRUEyUUEsb0JBQUMsQ0FBQSxnQkFBRCxHQUFvQixTQUFDLElBQUQsR0FBQTtBQUVuQixRQUFBLDhCQUFBO0FBQUEsSUFBQSxRQUFBLEdBQVcsRUFBWCxDQUFBO0FBQ0E7QUFBQSxTQUFBLDJDQUFBO3NCQUFBO0FBQUEsTUFBQyxRQUFRLENBQUMsSUFBVCxDQUFjLG9CQUFDLENBQUEsY0FBRCxDQUFBLENBQWQsQ0FBRCxDQUFBO0FBQUEsS0FEQTtBQUdBLFdBQU8sUUFBUSxDQUFDLElBQVQsQ0FBYyxFQUFkLENBQVAsQ0FMbUI7RUFBQSxDQTNRcEIsQ0FBQTs7OEJBQUE7O0lBSkQsQ0FBQTs7QUFBQSxNQXNSTSxDQUFDLE9BQVAsR0FBaUIsb0JBdFJqQixDQUFBOztBQUFBLE1Bd1JNLENBQUMsb0JBQVAsR0FBNkIsb0JBeFI3QixDQUFBOzs7OztBQ0FBLElBQUEsc0JBQUE7RUFBQTtpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLHNCQUFSLENBQWYsQ0FBQTs7QUFFQTtBQUFBOzs7R0FGQTs7QUFBQTtBQVNDLDZCQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSxFQUFBLFFBQUMsQ0FBQSxHQUFELEdBQWUscUNBQWYsQ0FBQTs7QUFBQSxFQUVBLFFBQUMsQ0FBQSxXQUFELEdBQWUsT0FGZixDQUFBOztBQUFBLEVBSUEsUUFBQyxDQUFBLFFBQUQsR0FBZSxJQUpmLENBQUE7O0FBQUEsRUFLQSxRQUFDLENBQUEsTUFBRCxHQUFlLEtBTGYsQ0FBQTs7QUFBQSxFQU9BLFFBQUMsQ0FBQSxJQUFELEdBQVEsU0FBQSxHQUFBO0FBRVA7QUFBQTs7O09BQUE7V0FNQSxLQVJPO0VBQUEsQ0FQUixDQUFBOztBQUFBLEVBaUJBLFFBQUMsQ0FBQSxJQUFELEdBQVEsU0FBQSxHQUFBO0FBRVAsSUFBQSxRQUFDLENBQUEsTUFBRCxHQUFVLElBQVYsQ0FBQTtBQUFBLElBRUEsRUFBRSxDQUFDLElBQUgsQ0FDQztBQUFBLE1BQUEsS0FBQSxFQUFTLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBdkI7QUFBQSxNQUNBLE1BQUEsRUFBUyxLQURUO0FBQUEsTUFFQSxLQUFBLEVBQVMsS0FGVDtLQURELENBRkEsQ0FBQTtXQU9BLEtBVE87RUFBQSxDQWpCUixDQUFBOztBQUFBLEVBNEJBLFFBQUMsQ0FBQSxLQUFELEdBQVMsU0FBRSxRQUFGLEdBQUE7QUFFUixJQUZTLFFBQUMsQ0FBQSxXQUFBLFFBRVYsQ0FBQTtBQUFBLElBQUEsSUFBRyxDQUFBLFFBQUUsQ0FBQSxNQUFMO0FBQWlCLGFBQU8sUUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLENBQWlCLGdCQUFqQixDQUFQLENBQWpCO0tBQUE7QUFBQSxJQUVBLEVBQUUsQ0FBQyxLQUFILENBQVMsU0FBRSxHQUFGLEdBQUE7QUFFUixNQUFBLElBQUcsR0FBSSxDQUFBLFFBQUEsQ0FBSixLQUFpQixXQUFwQjtlQUNDLFFBQUMsQ0FBQSxXQUFELENBQWEsR0FBSSxDQUFBLGNBQUEsQ0FBZ0IsQ0FBQSxhQUFBLENBQWpDLEVBREQ7T0FBQSxNQUFBO2VBR0MsUUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLENBQWlCLGFBQWpCLEVBSEQ7T0FGUTtJQUFBLENBQVQsRUFPRTtBQUFBLE1BQUUsS0FBQSxFQUFPLFFBQUMsQ0FBQSxXQUFWO0tBUEYsQ0FGQSxDQUFBO1dBV0EsS0FiUTtFQUFBLENBNUJULENBQUE7O0FBQUEsRUEyQ0EsUUFBQyxDQUFBLFdBQUQsR0FBZSxTQUFDLEtBQUQsR0FBQTtBQUVkLFFBQUEseUJBQUE7QUFBQSxJQUFBLFFBQUEsR0FBVyxFQUFYLENBQUE7QUFBQSxJQUNBLFFBQVEsQ0FBQyxZQUFULEdBQXdCLEtBRHhCLENBQUE7QUFBQSxJQUdBLE1BQUEsR0FBVyxDQUFDLENBQUMsUUFBRixDQUFBLENBSFgsQ0FBQTtBQUFBLElBSUEsT0FBQSxHQUFXLENBQUMsQ0FBQyxRQUFGLENBQUEsQ0FKWCxDQUFBO0FBQUEsSUFNQSxFQUFFLENBQUMsR0FBSCxDQUFPLEtBQVAsRUFBYyxTQUFDLEdBQUQsR0FBQTtBQUViLE1BQUEsUUFBUSxDQUFDLFNBQVQsR0FBcUIsR0FBRyxDQUFDLElBQXpCLENBQUE7QUFBQSxNQUNBLFFBQVEsQ0FBQyxTQUFULEdBQXFCLEdBQUcsQ0FBQyxFQUR6QixDQUFBO0FBQUEsTUFFQSxRQUFRLENBQUMsS0FBVCxHQUFxQixHQUFHLENBQUMsS0FBSixJQUFhLEtBRmxDLENBQUE7YUFHQSxNQUFNLENBQUMsT0FBUCxDQUFBLEVBTGE7SUFBQSxDQUFkLENBTkEsQ0FBQTtBQUFBLElBYUEsRUFBRSxDQUFDLEdBQUgsQ0FBTyxhQUFQLEVBQXNCO0FBQUEsTUFBRSxPQUFBLEVBQVMsS0FBWDtLQUF0QixFQUEwQyxTQUFDLEdBQUQsR0FBQTtBQUV6QyxNQUFBLFFBQVEsQ0FBQyxXQUFULEdBQXVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBaEMsQ0FBQTthQUNBLE9BQU8sQ0FBQyxPQUFSLENBQUEsRUFIeUM7SUFBQSxDQUExQyxDQWJBLENBQUE7QUFBQSxJQWtCQSxDQUFDLENBQUMsSUFBRixDQUFPLE1BQVAsRUFBZSxPQUFmLENBQXVCLENBQUMsSUFBeEIsQ0FBNkIsU0FBQSxHQUFBO2FBQUcsUUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUFWLENBQWtCLFFBQWxCLEVBQUg7SUFBQSxDQUE3QixDQWxCQSxDQUFBO1dBb0JBLEtBdEJjO0VBQUEsQ0EzQ2YsQ0FBQTs7QUFBQSxFQW1FQSxRQUFDLENBQUEsS0FBRCxHQUFTLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTtBQUVSLElBQUEsRUFBRSxDQUFDLEVBQUgsQ0FBTTtBQUFBLE1BQ0wsTUFBQSxFQUFjLElBQUksQ0FBQyxNQUFMLElBQWUsTUFEeEI7QUFBQSxNQUVMLElBQUEsRUFBYyxJQUFJLENBQUMsSUFBTCxJQUFhLEVBRnRCO0FBQUEsTUFHTCxJQUFBLEVBQWMsSUFBSSxDQUFDLElBQUwsSUFBYSxFQUh0QjtBQUFBLE1BSUwsT0FBQSxFQUFjLElBQUksQ0FBQyxPQUFMLElBQWdCLEVBSnpCO0FBQUEsTUFLTCxPQUFBLEVBQWMsSUFBSSxDQUFDLE9BQUwsSUFBZ0IsRUFMekI7QUFBQSxNQU1MLFdBQUEsRUFBYyxJQUFJLENBQUMsV0FBTCxJQUFvQixFQU43QjtLQUFOLEVBT0csU0FBQyxRQUFELEdBQUE7d0NBQ0YsR0FBSSxtQkFERjtJQUFBLENBUEgsQ0FBQSxDQUFBO1dBVUEsS0FaUTtFQUFBLENBbkVULENBQUE7O2tCQUFBOztHQUZzQixhQVB2QixDQUFBOztBQUFBLE1BMEZNLENBQUMsT0FBUCxHQUFpQixRQTFGakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHdCQUFBO0VBQUE7aVNBQUE7O0FBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxzQkFBUixDQUFmLENBQUE7O0FBRUE7QUFBQTs7O0dBRkE7O0FBQUE7QUFTQywrQkFBQSxDQUFBOzs7O0dBQUE7O0FBQUEsRUFBQSxVQUFDLENBQUEsR0FBRCxHQUFZLDhDQUFaLENBQUE7O0FBQUEsRUFFQSxVQUFDLENBQUEsTUFBRCxHQUNDO0FBQUEsSUFBQSxVQUFBLEVBQWlCLElBQWpCO0FBQUEsSUFDQSxVQUFBLEVBQWlCLElBRGpCO0FBQUEsSUFFQSxPQUFBLEVBQWlCLGdEQUZqQjtBQUFBLElBR0EsY0FBQSxFQUFpQixNQUhqQjtHQUhELENBQUE7O0FBQUEsRUFRQSxVQUFDLENBQUEsUUFBRCxHQUFZLElBUlosQ0FBQTs7QUFBQSxFQVNBLFVBQUMsQ0FBQSxNQUFELEdBQVksS0FUWixDQUFBOztBQUFBLEVBV0EsVUFBQyxDQUFBLElBQUQsR0FBUSxTQUFBLEdBQUE7QUFFUDtBQUFBOzs7T0FBQTtXQU1BLEtBUk87RUFBQSxDQVhSLENBQUE7O0FBQUEsRUFxQkEsVUFBQyxDQUFBLElBQUQsR0FBUSxTQUFBLEdBQUE7QUFFUCxJQUFBLFVBQUMsQ0FBQSxNQUFELEdBQVUsSUFBVixDQUFBO0FBQUEsSUFFQSxVQUFDLENBQUEsTUFBTyxDQUFBLFVBQUEsQ0FBUixHQUFzQixNQUFNLENBQUMsTUFBTSxDQUFDLFNBRnBDLENBQUE7QUFBQSxJQUdBLFVBQUMsQ0FBQSxNQUFPLENBQUEsVUFBQSxDQUFSLEdBQXNCLFVBQUMsQ0FBQSxhQUh2QixDQUFBO1dBS0EsS0FQTztFQUFBLENBckJSLENBQUE7O0FBQUEsRUE4QkEsVUFBQyxDQUFBLEtBQUQsR0FBUyxTQUFFLFFBQUYsR0FBQTtBQUVSLElBRlMsVUFBQyxDQUFBLFdBQUEsUUFFVixDQUFBO0FBQUEsSUFBQSxJQUFHLFVBQUMsQ0FBQSxNQUFKO0FBQ0MsTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQVYsQ0FBaUIsVUFBQyxDQUFBLE1BQWxCLENBQUEsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLFVBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixDQUFpQixnQkFBakIsQ0FBQSxDQUhEO0tBQUE7V0FLQSxLQVBRO0VBQUEsQ0E5QlQsQ0FBQTs7QUFBQSxFQXVDQSxVQUFDLENBQUEsYUFBRCxHQUFpQixTQUFDLEdBQUQsR0FBQTtBQUVoQixJQUFBLElBQUcsR0FBSSxDQUFBLFFBQUEsQ0FBVSxDQUFBLFdBQUEsQ0FBakI7QUFDQyxNQUFBLFVBQUMsQ0FBQSxXQUFELENBQWEsR0FBSSxDQUFBLGNBQUEsQ0FBakIsQ0FBQSxDQUREO0tBQUEsTUFFSyxJQUFHLEdBQUksQ0FBQSxPQUFBLENBQVMsQ0FBQSxlQUFBLENBQWhCO0FBQ0osTUFBQSxVQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsQ0FBaUIsYUFBakIsQ0FBQSxDQURJO0tBRkw7V0FLQSxLQVBnQjtFQUFBLENBdkNqQixDQUFBOztBQUFBLEVBZ0RBLFVBQUMsQ0FBQSxXQUFELEdBQWUsU0FBQyxLQUFELEdBQUE7QUFFZCxJQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBWixDQUFpQixNQUFqQixFQUF3QixJQUF4QixFQUE4QixTQUFBLEdBQUE7QUFFN0IsVUFBQSxPQUFBO0FBQUEsTUFBQSxPQUFBLEdBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQXhCLENBQTRCO0FBQUEsUUFBQSxRQUFBLEVBQVUsSUFBVjtPQUE1QixDQUFWLENBQUE7YUFDQSxPQUFPLENBQUMsT0FBUixDQUFnQixTQUFDLEdBQUQsR0FBQTtBQUVmLFlBQUEsUUFBQTtBQUFBLFFBQUEsUUFBQSxHQUNDO0FBQUEsVUFBQSxZQUFBLEVBQWUsS0FBZjtBQUFBLFVBQ0EsU0FBQSxFQUFlLEdBQUcsQ0FBQyxXQURuQjtBQUFBLFVBRUEsU0FBQSxFQUFlLEdBQUcsQ0FBQyxFQUZuQjtBQUFBLFVBR0EsS0FBQSxFQUFrQixHQUFHLENBQUMsTUFBTyxDQUFBLENBQUEsQ0FBZCxHQUFzQixHQUFHLENBQUMsTUFBTyxDQUFBLENBQUEsQ0FBRSxDQUFDLEtBQXBDLEdBQStDLEtBSDlEO0FBQUEsVUFJQSxXQUFBLEVBQWUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUp6QjtTQURELENBQUE7ZUFPQSxVQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsQ0FBa0IsUUFBbEIsRUFUZTtNQUFBLENBQWhCLEVBSDZCO0lBQUEsQ0FBOUIsQ0FBQSxDQUFBO1dBY0EsS0FoQmM7RUFBQSxDQWhEZixDQUFBOztvQkFBQTs7R0FGd0IsYUFQekIsQ0FBQTs7QUFBQSxNQTJFTSxDQUFDLE9BQVAsR0FBaUIsVUEzRWpCLENBQUE7Ozs7O0FDU0EsSUFBQSxZQUFBOztBQUFBOzRCQUdJOztBQUFBLEVBQUEsWUFBQyxDQUFBLEtBQUQsR0FBZSxPQUFmLENBQUE7O0FBQUEsRUFDQSxZQUFDLENBQUEsSUFBRCxHQUFlLE1BRGYsQ0FBQTs7QUFBQSxFQUVBLFlBQUMsQ0FBQSxNQUFELEdBQWUsUUFGZixDQUFBOztBQUFBLEVBR0EsWUFBQyxDQUFBLEtBQUQsR0FBZSxPQUhmLENBQUE7O0FBQUEsRUFJQSxZQUFDLENBQUEsV0FBRCxHQUFlLGFBSmYsQ0FBQTs7QUFBQSxFQU1BLFlBQUMsQ0FBQSxLQUFELEdBQVMsU0FBQSxHQUFBO0FBRUwsSUFBQSxZQUFZLENBQUMsZ0JBQWIsR0FBaUM7QUFBQSxNQUFDLElBQUEsRUFBTSxPQUFQO0FBQUEsTUFBZ0IsV0FBQSxFQUFhLENBQUMsWUFBWSxDQUFDLEtBQWQsQ0FBN0I7S0FBakMsQ0FBQTtBQUFBLElBQ0EsWUFBWSxDQUFDLGlCQUFiLEdBQWlDO0FBQUEsTUFBQyxJQUFBLEVBQU0sUUFBUDtBQUFBLE1BQWlCLFdBQUEsRUFBYSxDQUFDLFlBQVksQ0FBQyxNQUFkLENBQTlCO0tBRGpDLENBQUE7QUFBQSxJQUVBLFlBQVksQ0FBQyxnQkFBYixHQUFpQztBQUFBLE1BQUMsSUFBQSxFQUFNLE9BQVA7QUFBQSxNQUFnQixXQUFBLEVBQWEsQ0FBQyxZQUFZLENBQUMsSUFBZCxFQUFvQixZQUFZLENBQUMsS0FBakMsRUFBd0MsWUFBWSxDQUFDLFdBQXJELENBQTdCO0tBRmpDLENBQUE7QUFBQSxJQUlBLFlBQVksQ0FBQyxXQUFiLEdBQTJCLENBQ3ZCLFlBQVksQ0FBQyxnQkFEVSxFQUV2QixZQUFZLENBQUMsaUJBRlUsRUFHdkIsWUFBWSxDQUFDLGdCQUhVLENBSjNCLENBRks7RUFBQSxDQU5ULENBQUE7O0FBQUEsRUFtQkEsWUFBQyxDQUFBLGNBQUQsR0FBa0IsU0FBQSxHQUFBO0FBRWQsV0FBTyxNQUFNLENBQUMsZ0JBQVAsQ0FBd0IsUUFBUSxDQUFDLElBQWpDLEVBQXVDLE9BQXZDLENBQStDLENBQUMsZ0JBQWhELENBQWlFLFNBQWpFLENBQVAsQ0FGYztFQUFBLENBbkJsQixDQUFBOztBQUFBLEVBdUJBLFlBQUMsQ0FBQSxhQUFELEdBQWlCLFNBQUEsR0FBQTtBQUViLFFBQUEsa0JBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxZQUFZLENBQUMsY0FBYixDQUFBLENBQVIsQ0FBQTtBQUVBLFNBQVMsa0hBQVQsR0FBQTtBQUNJLE1BQUEsSUFBRyxZQUFZLENBQUMsV0FBWSxDQUFBLENBQUEsQ0FBRSxDQUFDLFdBQVcsQ0FBQyxPQUF4QyxDQUFnRCxLQUFoRCxDQUFBLEdBQXlELENBQUEsQ0FBNUQ7QUFDSSxlQUFPLFlBQVksQ0FBQyxXQUFZLENBQUEsQ0FBQSxDQUFFLENBQUMsSUFBbkMsQ0FESjtPQURKO0FBQUEsS0FGQTtBQU1BLFdBQU8sRUFBUCxDQVJhO0VBQUEsQ0F2QmpCLENBQUE7O0FBQUEsRUFpQ0EsWUFBQyxDQUFBLFlBQUQsR0FBZ0IsU0FBQyxVQUFELEdBQUE7QUFFWixRQUFBLFdBQUE7QUFBQSxTQUFTLGdIQUFULEdBQUE7QUFFSSxNQUFBLElBQUcsVUFBVSxDQUFDLFdBQVksQ0FBQSxDQUFBLENBQXZCLEtBQTZCLFlBQVksQ0FBQyxjQUFiLENBQUEsQ0FBaEM7QUFDSSxlQUFPLElBQVAsQ0FESjtPQUZKO0FBQUEsS0FBQTtBQUtBLFdBQU8sS0FBUCxDQVBZO0VBQUEsQ0FqQ2hCLENBQUE7O3NCQUFBOztJQUhKLENBQUE7O0FBQUEsTUE2Q00sQ0FBQyxZQUFQLEdBQXNCLFlBN0N0QixDQUFBOztBQUFBLE1BK0NNLENBQUMsT0FBUCxHQUFpQixZQS9DakIsQ0FBQTs7Ozs7QUNUQSxJQUFBLFdBQUE7O0FBQUE7MkJBRUk7O0FBQUEsRUFBQSxXQUFDLENBQUEsUUFBRCxHQUFXLElBQUksQ0FBQyxHQUFoQixDQUFBOztBQUFBLEVBQ0EsV0FBQyxDQUFBLFFBQUQsR0FBVyxJQUFJLENBQUMsR0FEaEIsQ0FBQTs7QUFBQSxFQUVBLFdBQUMsQ0FBQSxXQUFELEdBQWMsSUFBSSxDQUFDLE1BRm5CLENBQUE7O0FBQUEsRUFHQSxXQUFDLENBQUEsUUFBRCxHQUFXLElBQUksQ0FBQyxHQUhoQixDQUFBOztBQUFBLEVBSUEsV0FBQyxDQUFBLFVBQUQsR0FBYSxJQUFJLENBQUMsS0FKbEIsQ0FBQTs7QUFBQSxFQU1BLFdBQUMsQ0FBQSxLQUFELEdBQU8sU0FBQyxNQUFELEVBQVMsR0FBVCxFQUFjLEdBQWQsR0FBQTtBQUNILFdBQU8sSUFBSSxDQUFDLEdBQUwsQ0FBVSxJQUFJLENBQUMsR0FBTCxDQUFTLEdBQVQsRUFBYSxNQUFiLENBQVYsRUFBZ0MsR0FBaEMsQ0FBUCxDQURHO0VBQUEsQ0FOUCxDQUFBOztBQUFBLEVBU0EsV0FBQyxDQUFBLGNBQUQsR0FBaUIsU0FBQSxHQUFBO0FBRWIsUUFBQSxxQkFBQTtBQUFBLElBQUEsT0FBQSxHQUFVLGtCQUFrQixDQUFDLEtBQW5CLENBQXlCLEVBQXpCLENBQVYsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLEdBRFIsQ0FBQTtBQUVBLFNBQVMsNEJBQVQsR0FBQTtBQUNJLE1BQUEsS0FBQSxJQUFTLE9BQVEsQ0FBQSxJQUFJLENBQUMsS0FBTCxDQUFXLElBQUksQ0FBQyxNQUFMLENBQUEsQ0FBQSxHQUFnQixFQUEzQixDQUFBLENBQWpCLENBREo7QUFBQSxLQUZBO1dBSUEsTUFOYTtFQUFBLENBVGpCLENBQUE7O0FBQUEsRUFpQkEsV0FBQyxDQUFBLGdCQUFELEdBQW9CLFNBQUMsS0FBRCxFQUFRLEtBQVIsR0FBQTtBQUdoQixRQUFBLGdEQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsSUFBQSxHQUFLLEVBQUwsR0FBUSxFQUFSLEdBQVcsRUFBckIsQ0FBQTtBQUFBLElBQ0EsSUFBQSxHQUFVLEVBRFYsQ0FBQTtBQUFBLElBSUEsUUFBQSxHQUFXLEtBQUssQ0FBQyxPQUFOLENBQUEsQ0FKWCxDQUFBO0FBQUEsSUFLQSxRQUFBLEdBQVcsS0FBSyxDQUFDLE9BQU4sQ0FBQSxDQUxYLENBQUE7QUFBQSxJQVFBLGFBQUEsR0FBZ0IsUUFBQSxHQUFXLFFBUjNCLENBQUE7QUFBQSxJQVdBLGFBQUEsR0FBZ0IsYUFBQSxHQUFjLElBWDlCLENBQUE7QUFBQSxJQVlBLElBQUksQ0FBQyxPQUFMLEdBQWdCLElBQUksQ0FBQyxLQUFMLENBQVcsYUFBQSxHQUFnQixFQUEzQixDQVpoQixDQUFBO0FBQUEsSUFjQSxhQUFBLEdBQWdCLGFBQUEsR0FBYyxFQWQ5QixDQUFBO0FBQUEsSUFlQSxJQUFJLENBQUMsT0FBTCxHQUFnQixJQUFJLENBQUMsS0FBTCxDQUFXLGFBQUEsR0FBZ0IsRUFBM0IsQ0FmaEIsQ0FBQTtBQUFBLElBaUJBLGFBQUEsR0FBZ0IsYUFBQSxHQUFjLEVBakI5QixDQUFBO0FBQUEsSUFrQkEsSUFBSSxDQUFDLEtBQUwsR0FBZ0IsSUFBSSxDQUFDLEtBQUwsQ0FBVyxhQUFBLEdBQWdCLEVBQTNCLENBbEJoQixDQUFBO0FBQUEsSUFvQkEsSUFBSSxDQUFDLElBQUwsR0FBZ0IsSUFBSSxDQUFDLEtBQUwsQ0FBVyxhQUFBLEdBQWMsRUFBekIsQ0FwQmhCLENBQUE7V0FzQkEsS0F6QmdCO0VBQUEsQ0FqQnBCLENBQUE7O0FBQUEsRUE0Q0EsV0FBQyxDQUFBLEdBQUQsR0FBTSxTQUFFLEdBQUYsRUFBTyxJQUFQLEVBQWEsSUFBYixFQUFtQixJQUFuQixFQUF5QixJQUF6QixFQUErQixLQUEvQixFQUE4QyxZQUE5QyxFQUFtRSxZQUFuRSxHQUFBO0FBQ0YsUUFBQSxVQUFBOztNQURpQyxRQUFRO0tBQ3pDOztNQURnRCxlQUFlO0tBQy9EOztNQURxRSxlQUFlO0tBQ3BGO0FBQUEsSUFBQSxJQUFHLFlBQUEsSUFBaUIsR0FBQSxHQUFNLElBQTFCO0FBQW9DLGFBQU8sSUFBUCxDQUFwQztLQUFBO0FBQ0EsSUFBQSxJQUFHLFlBQUEsSUFBaUIsR0FBQSxHQUFNLElBQTFCO0FBQW9DLGFBQU8sSUFBUCxDQUFwQztLQURBO0FBQUEsSUFHQSxJQUFBLEdBQU8sQ0FBQyxHQUFBLEdBQU0sSUFBUCxDQUFBLEdBQWUsQ0FBQyxJQUFBLEdBQU8sSUFBUixDQUh0QixDQUFBO0FBQUEsSUFJQSxJQUFBLEdBQU8sQ0FBQyxJQUFBLEdBQU8sQ0FBQyxJQUFBLEdBQU8sSUFBUixDQUFSLENBQUEsR0FBeUIsSUFKaEMsQ0FBQTtBQUtBLElBQUEsSUFBRyxLQUFIO0FBQWMsYUFBTyxJQUFJLENBQUMsS0FBTCxDQUFXLElBQVgsQ0FBUCxDQUFkO0tBTEE7QUFPQSxXQUFPLElBQVAsQ0FSRTtFQUFBLENBNUNOLENBQUE7O0FBQUEsRUFzREEsV0FBQyxDQUFBLFNBQUQsR0FBWSxTQUFFLE1BQUYsR0FBQTtBQUNSLFdBQU8sTUFBQSxHQUFTLENBQUUsSUFBSSxDQUFDLEVBQUwsR0FBVSxHQUFaLENBQWhCLENBRFE7RUFBQSxDQXREWixDQUFBOztBQUFBLEVBeURBLFdBQUMsQ0FBQSxRQUFELEdBQVcsU0FBRSxPQUFGLEdBQUE7QUFDUCxXQUFPLE9BQUEsR0FBVSxDQUFFLEdBQUEsR0FBTSxJQUFJLENBQUMsRUFBYixDQUFqQixDQURPO0VBQUEsQ0F6RFgsQ0FBQTs7QUFBQSxFQTREQSxXQUFDLENBQUEsU0FBRCxHQUFZLFNBQUUsR0FBRixFQUFPLEdBQVAsRUFBWSxHQUFaLEVBQWlCLFVBQWpCLEdBQUE7QUFDUixJQUFBLElBQUcsVUFBSDtBQUFtQixhQUFPLEdBQUEsSUFBTyxHQUFQLElBQWMsR0FBQSxJQUFPLEdBQTVCLENBQW5CO0tBQUEsTUFBQTtBQUNLLGFBQU8sR0FBQSxJQUFPLEdBQVAsSUFBYyxHQUFBLElBQU8sR0FBNUIsQ0FETDtLQURRO0VBQUEsQ0E1RFosQ0FBQTs7QUFBQSxFQWlFQSxXQUFDLENBQUEsZUFBRCxHQUFrQixTQUFDLE1BQUQsR0FBQTtBQUVkLFFBQUEsRUFBQTtBQUFBLElBQUEsSUFBRyxNQUFBLEdBQVMsSUFBWjtBQUVJLGFBQU8sRUFBQSxHQUFFLENBQUMsSUFBSSxDQUFDLEtBQUwsQ0FBVyxNQUFYLENBQUQsQ0FBRixHQUFzQixHQUE3QixDQUZKO0tBQUEsTUFBQTtBQU1JLE1BQUEsRUFBQSxHQUFLLENBQUMsTUFBQSxHQUFPLElBQVIsQ0FBYSxDQUFDLE9BQWQsQ0FBc0IsQ0FBdEIsQ0FBTCxDQUFBO0FBQ0EsYUFBTyxFQUFBLEdBQUcsRUFBSCxHQUFNLElBQWIsQ0FQSjtLQUZjO0VBQUEsQ0FqRWxCLENBQUE7O0FBQUEsRUE2RUEsV0FBQyxDQUFBLFFBQUQsR0FBVyxTQUFFLE1BQUYsRUFBVSxLQUFWLEdBQUE7QUFFUCxRQUFBLElBQUE7QUFBQSxJQUFBLEtBQUEsSUFBUyxNQUFNLENBQUMsUUFBUCxDQUFBLENBQWlCLENBQUMsTUFBM0IsQ0FBQTtBQUVBLElBQUEsSUFBRyxLQUFBLEdBQVEsQ0FBWDtBQUNJLGFBQVcsSUFBQSxLQUFBLENBQU8sS0FBQSxHQUFRLDZDQUF1QjtBQUFBLFFBQUEsQ0FBQSxFQUFJLENBQUo7T0FBdkIsQ0FBZixDQUE4QyxDQUFDLElBQS9DLENBQXFELEdBQXJELENBQUosR0FBaUUsTUFBeEUsQ0FESjtLQUZBO0FBS0EsV0FBTyxNQUFBLEdBQVMsRUFBaEIsQ0FQTztFQUFBLENBN0VYLENBQUE7O3FCQUFBOztJQUZKLENBQUE7O0FBQUEsTUF3Rk0sQ0FBQyxPQUFQLEdBQWlCLFdBeEZqQixDQUFBOzs7OztBQ0FBO0FBQUE7Ozs7R0FBQTtBQUFBLElBQUEsU0FBQTs7QUFBQTt5QkFRSTs7QUFBQSxFQUFBLFNBQUMsQ0FBQSxRQUFELEdBQVksRUFBWixDQUFBOztBQUFBLEVBRUEsU0FBQyxDQUFBLE9BQUQsR0FBVSxTQUFFLElBQUYsR0FBQTtBQUNOO0FBQUE7Ozs7Ozs7O09BQUE7QUFBQSxRQUFBLENBQUE7QUFBQSxJQVVBLENBQUEsR0FBSSxDQUFDLENBQUMsSUFBRixDQUFPO0FBQUEsTUFFUCxHQUFBLEVBQWMsSUFBSSxDQUFDLEdBRlo7QUFBQSxNQUdQLElBQUEsRUFBaUIsSUFBSSxDQUFDLElBQVIsR0FBa0IsSUFBSSxDQUFDLElBQXZCLEdBQWlDLE1BSHhDO0FBQUEsTUFJUCxJQUFBLEVBQWlCLElBQUksQ0FBQyxJQUFSLEdBQWtCLElBQUksQ0FBQyxJQUF2QixHQUFpQyxJQUp4QztBQUFBLE1BS1AsUUFBQSxFQUFpQixJQUFJLENBQUMsUUFBUixHQUFzQixJQUFJLENBQUMsUUFBM0IsR0FBeUMsTUFMaEQ7QUFBQSxNQU1QLFdBQUEsRUFBaUIsSUFBSSxDQUFDLFdBQVIsR0FBeUIsSUFBSSxDQUFDLFdBQTlCLEdBQStDLGtEQU50RDtBQUFBLE1BT1AsV0FBQSxFQUFpQixJQUFJLENBQUMsV0FBTCxLQUFvQixJQUFwQixJQUE2QixJQUFJLENBQUMsV0FBTCxLQUFvQixNQUFwRCxHQUFtRSxJQUFJLENBQUMsV0FBeEUsR0FBeUYsSUFQaEc7S0FBUCxDQVZKLENBQUE7QUFBQSxJQXFCQSxDQUFDLENBQUMsSUFBRixDQUFPLElBQUksQ0FBQyxJQUFaLENBckJBLENBQUE7QUFBQSxJQXNCQSxDQUFDLENBQUMsSUFBRixDQUFPLElBQUksQ0FBQyxJQUFaLENBdEJBLENBQUE7V0F3QkEsRUF6Qk07RUFBQSxDQUZWLENBQUE7O0FBQUEsRUE2QkEsU0FBQyxDQUFBLFFBQUQsR0FBWSxTQUFDLElBQUQsRUFBTyxJQUFQLEVBQWEsSUFBYixHQUFBO0FBQ1I7QUFBQTs7OztPQUFBO0FBQUEsSUFNQSxTQUFDLENBQUEsT0FBRCxDQUNJO0FBQUEsTUFBQSxHQUFBLEVBQVMsY0FBVDtBQUFBLE1BQ0EsSUFBQSxFQUFTLE1BRFQ7QUFBQSxNQUVBLElBQUEsRUFBUztBQUFBLFFBQUMsWUFBQSxFQUFlLFNBQUEsQ0FBVSxJQUFWLENBQWhCO09BRlQ7QUFBQSxNQUdBLElBQUEsRUFBUyxJQUhUO0FBQUEsTUFJQSxJQUFBLEVBQVMsSUFKVDtLQURKLENBTkEsQ0FBQTtXQWFBLEtBZFE7RUFBQSxDQTdCWixDQUFBOztBQUFBLEVBNkNBLFNBQUMsQ0FBQSxXQUFELEdBQWUsU0FBQyxFQUFELEVBQUssSUFBTCxFQUFXLElBQVgsR0FBQTtBQUVYLElBQUEsU0FBQyxDQUFBLE9BQUQsQ0FDSTtBQUFBLE1BQUEsR0FBQSxFQUFTLGNBQUEsR0FBZSxFQUF4QjtBQUFBLE1BQ0EsSUFBQSxFQUFTLFFBRFQ7QUFBQSxNQUVBLElBQUEsRUFBUyxJQUZUO0FBQUEsTUFHQSxJQUFBLEVBQVMsSUFIVDtLQURKLENBQUEsQ0FBQTtXQU1BLEtBUlc7RUFBQSxDQTdDZixDQUFBOzttQkFBQTs7SUFSSixDQUFBOztBQUFBLE1BK0RNLENBQUMsT0FBUCxHQUFpQixTQS9EakIsQ0FBQTs7Ozs7QUNBQTtBQUFBOzs7R0FBQTtBQUFBLElBQUEsS0FBQTtFQUFBLGtGQUFBOztBQUFBO0FBTUksa0JBQUEsR0FBQSxHQUFNLElBQU4sQ0FBQTs7QUFFYyxFQUFBLGVBQUEsR0FBQTtBQUVWLG1DQUFBLENBQUE7QUFBQSx5Q0FBQSxDQUFBO0FBQUEsMkNBQUEsQ0FBQTtBQUFBLDZDQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEsMkNBQUEsQ0FBQTtBQUFBLGlEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsNkNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLEdBQUQsR0FBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFiLENBQUE7QUFFQSxXQUFPLElBQVAsQ0FKVTtFQUFBLENBRmQ7O0FBQUEsa0JBUUEsT0FBQSxHQUFVLFNBQUMsR0FBRCxFQUFNLENBQU4sRUFBUyxDQUFULEdBQUE7QUFFTixRQUFBLFNBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxDQUFFLE1BQU0sQ0FBQyxVQUFQLEdBQXFCLENBQXZCLENBQUEsSUFBOEIsQ0FBckMsQ0FBQTtBQUFBLElBQ0EsR0FBQSxHQUFPLENBQUUsTUFBTSxDQUFDLFdBQVAsR0FBcUIsQ0FBdkIsQ0FBQSxJQUE4QixDQURyQyxDQUFBO0FBQUEsSUFHQSxNQUFNLENBQUMsSUFBUCxDQUFZLEdBQVosRUFBaUIsRUFBakIsRUFBcUIsTUFBQSxHQUFPLEdBQVAsR0FBVyxRQUFYLEdBQW9CLElBQXBCLEdBQXlCLFNBQXpCLEdBQW1DLENBQW5DLEdBQXFDLFVBQXJDLEdBQWdELENBQWhELEdBQWtELHlCQUF2RSxDQUhBLENBQUE7V0FLQSxLQVBNO0VBQUEsQ0FSVixDQUFBOztBQUFBLGtCQWlCQSxJQUFBLEdBQU8sU0FBRSxHQUFGLEdBQUE7QUFFSCxJQUFBLEdBQUEsR0FBTSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQU4sQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE9BQUQsQ0FBVSxvQ0FBQSxHQUFvQyxHQUE5QyxFQUFxRCxHQUFyRCxFQUEwRCxHQUExRCxDQUZBLENBQUE7V0FJQSxLQU5HO0VBQUEsQ0FqQlAsQ0FBQTs7QUFBQSxrQkF5QkEsU0FBQSxHQUFZLFNBQUMsR0FBRCxFQUFNLEtBQU4sRUFBYSxLQUFiLEdBQUE7QUFFUixJQUFBLEdBQUEsR0FBUSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQVIsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLGtCQUFBLENBQW1CLEtBQW5CLENBRFIsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFRLGtCQUFBLENBQW1CLEtBQW5CLENBRlIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLE9BQUQsQ0FBVSxrREFBQSxHQUFrRCxHQUFsRCxHQUFzRCxTQUF0RCxHQUErRCxLQUEvRCxHQUFxRSxlQUFyRSxHQUFvRixLQUE5RixFQUF1RyxHQUF2RyxFQUE0RyxHQUE1RyxDQUpBLENBQUE7V0FNQSxLQVJRO0VBQUEsQ0F6QlosQ0FBQTs7QUFBQSxrQkFtQ0EsTUFBQSxHQUFTLFNBQUMsR0FBRCxFQUFNLEtBQU4sRUFBYSxLQUFiLEdBQUE7QUFFTCxJQUFBLEdBQUEsR0FBUSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQVIsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLGtCQUFBLENBQW1CLEtBQW5CLENBRFIsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFRLGtCQUFBLENBQW1CLEtBQW5CLENBRlIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLE9BQUQsQ0FBVSwyQ0FBQSxHQUEyQyxLQUEzQyxHQUFpRCxXQUFqRCxHQUE0RCxLQUE1RCxHQUFrRSxjQUFsRSxHQUFnRixHQUExRixFQUFpRyxHQUFqRyxFQUFzRyxHQUF0RyxDQUpBLENBQUE7V0FNQSxLQVJLO0VBQUEsQ0FuQ1QsQ0FBQTs7QUFBQSxrQkE2Q0EsUUFBQSxHQUFXLFNBQUUsR0FBRixFQUFRLElBQVIsR0FBQTtBQUVQLFFBQUEsS0FBQTs7TUFGZSxPQUFPO0tBRXRCO0FBQUEsSUFBQSxHQUFBLEdBQVEsa0JBQUEsQ0FBbUIsR0FBQSxJQUFPLElBQUMsQ0FBQSxHQUEzQixDQUFSLENBQUE7QUFBQSxJQUNBLEtBQUEsR0FBUSxrQkFBQSxDQUFtQixJQUFuQixDQURSLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxPQUFELENBQVUsc0NBQUEsR0FBc0MsR0FBdEMsR0FBMEMsS0FBMUMsR0FBK0MsS0FBekQsRUFBa0UsR0FBbEUsRUFBdUUsR0FBdkUsQ0FIQSxDQUFBO1dBS0EsS0FQTztFQUFBLENBN0NYLENBQUE7O0FBQUEsa0JBc0RBLE9BQUEsR0FBVSxTQUFFLEdBQUYsRUFBUSxJQUFSLEdBQUE7QUFFTixRQUFBLEtBQUE7O01BRmMsT0FBTztLQUVyQjtBQUFBLElBQUEsR0FBQSxHQUFRLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBUixDQUFBO0FBQ0EsSUFBQSxJQUFHLElBQUEsS0FBUSxFQUFYO0FBQ0ksTUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsOEJBQWpCLENBQVAsQ0FESjtLQURBO0FBQUEsSUFJQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsSUFBbkIsQ0FKUixDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsT0FBRCxDQUFVLHdDQUFBLEdBQXdDLEtBQXhDLEdBQThDLE9BQTlDLEdBQXFELEdBQS9ELEVBQXNFLEdBQXRFLEVBQTJFLEdBQTNFLENBTkEsQ0FBQTtXQVFBLEtBVk07RUFBQSxDQXREVixDQUFBOztBQUFBLGtCQWtFQSxNQUFBLEdBQVMsU0FBRSxHQUFGLEdBQUE7QUFFTCxJQUFBLEdBQUEsR0FBTSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQU4sQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE9BQUQsQ0FBUyxvREFBQSxHQUF1RCxHQUFoRSxFQUFxRSxHQUFyRSxFQUEwRSxHQUExRSxDQUZBLENBQUE7V0FJQSxLQU5LO0VBQUEsQ0FsRVQsQ0FBQTs7QUFBQSxrQkEwRUEsS0FBQSxHQUFRLFNBQUUsR0FBRixHQUFBO0FBRUosSUFBQSxHQUFBLEdBQU0sa0JBQUEsQ0FBbUIsR0FBQSxJQUFPLElBQUMsQ0FBQSxHQUEzQixDQUFOLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxPQUFELENBQVUsK0NBQUEsR0FBK0MsR0FBL0MsR0FBbUQsaUJBQTdELEVBQStFLEdBQS9FLEVBQW9GLEdBQXBGLENBRkEsQ0FBQTtXQUlBLEtBTkk7RUFBQSxDQTFFUixDQUFBOztBQUFBLGtCQWtGQSxFQUFBLEdBQUssU0FBQSxHQUFBO0FBRUQsV0FBTyxNQUFNLENBQUMsRUFBZCxDQUZDO0VBQUEsQ0FsRkwsQ0FBQTs7ZUFBQTs7SUFOSixDQUFBOztBQUFBLE1BNEZNLENBQUMsT0FBUCxHQUFpQixLQTVGakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLFlBQUE7RUFBQTs7aVNBQUE7O0FBQUE7QUFFQyxpQ0FBQSxDQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FBQTs7QUFBQSx5QkFBQSxFQUFBLEdBQWUsSUFBZixDQUFBOztBQUFBLHlCQUNBLEVBQUEsR0FBZSxJQURmLENBQUE7O0FBQUEseUJBRUEsUUFBQSxHQUFlLElBRmYsQ0FBQTs7QUFBQSx5QkFHQSxRQUFBLEdBQWUsSUFIZixDQUFBOztBQUFBLHlCQUlBLFlBQUEsR0FBZSxJQUpmLENBQUE7O0FBQUEseUJBTUEsVUFBQSxHQUFhLFNBQUEsR0FBQTtBQUVaLFFBQUEsT0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFFBQUQsR0FBWSxFQUFaLENBQUE7QUFFQSxJQUFBLElBQUcsSUFBQyxDQUFBLFFBQUo7QUFDQyxNQUFBLE9BQUEsR0FBVSxDQUFDLENBQUMsUUFBRixDQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFoQixDQUFvQixJQUFDLENBQUEsUUFBckIsQ0FBWCxDQUFWLENBQUE7QUFBQSxNQUNBLElBQUMsQ0FBQSxVQUFELENBQVksT0FBQSxDQUFRLElBQUMsQ0FBQSxZQUFULENBQVosQ0FEQSxDQUREO0tBRkE7QUFNQSxJQUFBLElBQXVCLElBQUMsQ0FBQSxFQUF4QjtBQUFBLE1BQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsSUFBVixFQUFnQixJQUFDLENBQUEsRUFBakIsQ0FBQSxDQUFBO0tBTkE7QUFPQSxJQUFBLElBQTRCLElBQUMsQ0FBQSxTQUE3QjtBQUFBLE1BQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsSUFBQyxDQUFBLFNBQWYsQ0FBQSxDQUFBO0tBUEE7QUFBQSxJQVNBLElBQUMsQ0FBQSxJQUFELENBQUEsQ0FUQSxDQUFBO0FBQUEsSUFXQSxJQUFDLENBQUEsTUFBRCxHQUFVLEtBWFYsQ0FBQTtXQWFBLEtBZlk7RUFBQSxDQU5iLENBQUE7O0FBQUEseUJBdUJBLElBQUEsR0FBTyxTQUFBLEdBQUE7V0FFTixLQUZNO0VBQUEsQ0F2QlAsQ0FBQTs7QUFBQSx5QkEyQkEsTUFBQSxHQUFTLFNBQUEsR0FBQTtXQUVSLEtBRlE7RUFBQSxDQTNCVCxDQUFBOztBQUFBLHlCQStCQSxNQUFBLEdBQVMsU0FBQSxHQUFBO1dBRVIsS0FGUTtFQUFBLENBL0JULENBQUE7O0FBQUEseUJBbUNBLFFBQUEsR0FBVyxTQUFDLEtBQUQsRUFBUSxPQUFSLEdBQUE7QUFFVixRQUFBLFNBQUE7O01BRmtCLFVBQVU7S0FFNUI7QUFBQSxJQUFBLElBQXdCLEtBQUssQ0FBQyxFQUE5QjtBQUFBLE1BQUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxJQUFWLENBQWUsS0FBZixDQUFBLENBQUE7S0FBQTtBQUFBLElBQ0EsTUFBQSxHQUFZLElBQUMsQ0FBQSxhQUFKLEdBQXVCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLElBQUMsQ0FBQSxhQUFYLENBQXlCLENBQUMsRUFBMUIsQ0FBNkIsQ0FBN0IsQ0FBdkIsR0FBNEQsSUFBQyxDQUFBLEdBRHRFLENBQUE7QUFBQSxJQUdBLENBQUEsR0FBTyxLQUFLLENBQUMsRUFBVCxHQUFpQixLQUFLLENBQUMsR0FBdkIsR0FBZ0MsS0FIcEMsQ0FBQTtBQUtBLElBQUEsSUFBRyxDQUFBLE9BQUg7QUFDQyxNQUFBLE1BQU0sQ0FBQyxNQUFQLENBQWMsQ0FBZCxDQUFBLENBREQ7S0FBQSxNQUFBO0FBR0MsTUFBQSxNQUFNLENBQUMsT0FBUCxDQUFlLENBQWYsQ0FBQSxDQUhEO0tBTEE7V0FVQSxLQVpVO0VBQUEsQ0FuQ1gsQ0FBQTs7QUFBQSx5QkFpREEsT0FBQSxHQUFVLFNBQUMsR0FBRCxFQUFNLEtBQU4sR0FBQTtBQUVULFFBQUEsQ0FBQTtBQUFBLElBQUEsSUFBd0IsS0FBSyxDQUFDLEVBQTlCO0FBQUEsTUFBQSxJQUFDLENBQUEsUUFBUSxDQUFDLElBQVYsQ0FBZSxLQUFmLENBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxDQUFBLEdBQU8sS0FBSyxDQUFDLEVBQVQsR0FBaUIsS0FBSyxDQUFDLEdBQXZCLEdBQWdDLEtBRHBDLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxHQUFHLENBQUMsUUFBTCxDQUFjLEdBQWQsQ0FBa0IsQ0FBQyxXQUFuQixDQUErQixDQUEvQixDQUZBLENBQUE7V0FJQSxLQU5TO0VBQUEsQ0FqRFYsQ0FBQTs7QUFBQSx5QkF5REEsTUFBQSxHQUFTLFNBQUMsS0FBRCxHQUFBO0FBRVIsUUFBQSxDQUFBO0FBQUEsSUFBQSxJQUFPLGFBQVA7QUFDQyxZQUFBLENBREQ7S0FBQTtBQUFBLElBR0EsQ0FBQSxHQUFPLEtBQUssQ0FBQyxFQUFULEdBQWlCLEtBQUssQ0FBQyxHQUF2QixHQUFnQyxDQUFBLENBQUUsS0FBRixDQUhwQyxDQUFBO0FBSUEsSUFBQSxJQUFtQixDQUFBLElBQU0sS0FBSyxDQUFDLE9BQS9CO0FBQUEsTUFBQSxLQUFLLENBQUMsT0FBTixDQUFBLENBQUEsQ0FBQTtLQUpBO0FBTUEsSUFBQSxJQUFHLENBQUEsSUFBSyxJQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsQ0FBa0IsS0FBbEIsQ0FBQSxLQUE0QixDQUFBLENBQXBDO0FBQ0MsTUFBQSxJQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsQ0FBa0IsSUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUFWLENBQWtCLEtBQWxCLENBQWxCLEVBQTRDLENBQTVDLENBQUEsQ0FERDtLQU5BO0FBQUEsSUFTQSxDQUFDLENBQUMsTUFBRixDQUFBLENBVEEsQ0FBQTtXQVdBLEtBYlE7RUFBQSxDQXpEVCxDQUFBOztBQUFBLHlCQXdFQSxRQUFBLEdBQVcsU0FBQyxLQUFELEdBQUE7QUFFVixRQUFBLHFCQUFBO0FBQUE7QUFBQSxTQUFBLDJDQUFBO3VCQUFBO0FBQUMsTUFBQSxJQUFHLEtBQUssQ0FBQyxRQUFUO0FBQXVCLFFBQUEsS0FBSyxDQUFDLFFBQU4sQ0FBQSxDQUFBLENBQXZCO09BQUQ7QUFBQSxLQUFBO1dBRUEsS0FKVTtFQUFBLENBeEVYLENBQUE7O0FBQUEseUJBOEVBLFlBQUEsR0FBZSxTQUFFLE9BQUYsR0FBQTtBQUVkLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxHQUFMLENBQ0M7QUFBQSxNQUFBLGdCQUFBLEVBQXFCLE9BQUgsR0FBZ0IsTUFBaEIsR0FBNEIsTUFBOUM7S0FERCxDQUFBLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0E5RWYsQ0FBQTs7QUFBQSx5QkFxRkEsWUFBQSxHQUFlLFNBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxLQUFQLEVBQWtCLEtBQWxCLEdBQUE7QUFFZCxRQUFBLEdBQUE7O01BRnFCLFFBQU07S0FFM0I7QUFBQSxJQUFBLElBQUcsU0FBUyxDQUFDLGVBQWI7QUFDQyxNQUFBLEdBQUEsR0FBTyxjQUFBLEdBQWEsQ0FBQyxDQUFBLEdBQUUsS0FBSCxDQUFiLEdBQXNCLElBQXRCLEdBQXlCLENBQUMsQ0FBQSxHQUFFLEtBQUgsQ0FBekIsR0FBa0MsTUFBekMsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLEdBQUEsR0FBTyxZQUFBLEdBQVcsQ0FBQyxDQUFBLEdBQUUsS0FBSCxDQUFYLEdBQW9CLElBQXBCLEdBQXVCLENBQUMsQ0FBQSxHQUFFLEtBQUgsQ0FBdkIsR0FBZ0MsR0FBdkMsQ0FIRDtLQUFBO0FBS0EsSUFBQSxJQUFHLEtBQUg7QUFBYyxNQUFBLEdBQUEsR0FBTSxFQUFBLEdBQUcsR0FBSCxHQUFPLFNBQVAsR0FBZ0IsS0FBaEIsR0FBc0IsR0FBNUIsQ0FBZDtLQUxBO1dBT0EsSUFUYztFQUFBLENBckZmLENBQUE7O0FBQUEseUJBZ0dBLFNBQUEsR0FBWSxTQUFBLEdBQUE7QUFFWCxRQUFBLHFCQUFBO0FBQUE7QUFBQSxTQUFBLDJDQUFBO3VCQUFBOztRQUVDLEtBQUssQ0FBQztPQUFOO0FBRUEsTUFBQSxJQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBbEI7QUFFQyxRQUFBLEtBQUssQ0FBQyxTQUFOLENBQUEsQ0FBQSxDQUZEO09BSkQ7QUFBQSxLQUFBO1dBUUEsS0FWVztFQUFBLENBaEdaLENBQUE7O0FBQUEseUJBNEdBLE9BQUEsR0FBVSxTQUFBLEdBQUE7QUFFVCxRQUFBLHFCQUFBO0FBQUE7QUFBQSxTQUFBLDJDQUFBO3VCQUFBOztRQUVDLEtBQUssQ0FBQztPQUFOO0FBRUEsTUFBQSxJQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBbEI7QUFFQyxRQUFBLEtBQUssQ0FBQyxPQUFOLENBQUEsQ0FBQSxDQUZEO09BSkQ7QUFBQSxLQUFBO1dBUUEsS0FWUztFQUFBLENBNUdWLENBQUE7O0FBQUEseUJBd0hBLGlCQUFBLEdBQW1CLFNBQUEsR0FBQTtBQUVsQixRQUFBLHFCQUFBO0FBQUE7QUFBQSxTQUFBLDJDQUFBO3VCQUFBO0FBQUEsTUFBQSxJQUFDLENBQUEsTUFBRCxDQUFRLEtBQVIsQ0FBQSxDQUFBO0FBQUEsS0FBQTtXQUVBLEtBSmtCO0VBQUEsQ0F4SG5CLENBQUE7O0FBQUEseUJBOEhBLGVBQUEsR0FBa0IsU0FBQyxHQUFELEVBQU0sUUFBTixHQUFBO0FBRWpCLFFBQUEsa0JBQUE7O01BRnVCLFdBQVMsSUFBQyxDQUFBO0tBRWpDO0FBQUEsU0FBQSx1REFBQTswQkFBQTtBQUVDLE1BQUEsS0FBSyxDQUFDLE9BQU4sQ0FBYyxHQUFkLENBQUEsQ0FBQTtBQUVBLE1BQUEsSUFBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQWxCO0FBRUMsUUFBQSxJQUFDLENBQUEsZUFBRCxDQUFpQixHQUFqQixFQUFzQixLQUFLLENBQUMsUUFBNUIsQ0FBQSxDQUZEO09BSkQ7QUFBQSxLQUFBO1dBUUEsS0FWaUI7RUFBQSxDQTlIbEIsQ0FBQTs7QUFBQSx5QkEwSUEsWUFBQSxHQUFlLFNBQUMsTUFBRCxFQUFTLE1BQVQsRUFBaUIsUUFBakIsR0FBQTtBQUVkLFFBQUEsa0JBQUE7O01BRitCLFdBQVMsSUFBQyxDQUFBO0tBRXpDO0FBQUEsU0FBQSx1REFBQTswQkFBQTs7UUFFQyxLQUFNLENBQUEsTUFBQSxFQUFTO09BQWY7QUFFQSxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFsQjtBQUVDLFFBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxNQUFkLEVBQXNCLE1BQXRCLEVBQThCLEtBQUssQ0FBQyxRQUFwQyxDQUFBLENBRkQ7T0FKRDtBQUFBLEtBQUE7V0FRQSxLQVZjO0VBQUEsQ0ExSWYsQ0FBQTs7QUFBQSx5QkFzSkEsbUJBQUEsR0FBc0IsU0FBQyxNQUFELEVBQVMsTUFBVCxFQUFpQixRQUFqQixHQUFBO0FBRXJCLFFBQUEsa0JBQUE7O01BRnNDLFdBQVMsSUFBQyxDQUFBO0tBRWhEOztNQUFBLElBQUUsQ0FBQSxNQUFBLEVBQVM7S0FBWDtBQUVBLFNBQUEsdURBQUE7MEJBQUE7O1FBRUMsS0FBTSxDQUFBLE1BQUEsRUFBUztPQUFmO0FBRUEsTUFBQSxJQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBbEI7QUFFQyxRQUFBLElBQUMsQ0FBQSxZQUFELENBQWMsTUFBZCxFQUFzQixNQUF0QixFQUE4QixLQUFLLENBQUMsUUFBcEMsQ0FBQSxDQUZEO09BSkQ7QUFBQSxLQUZBO1dBVUEsS0FacUI7RUFBQSxDQXRKdEIsQ0FBQTs7QUFBQSx5QkFvS0EsY0FBQSxHQUFpQixTQUFDLEdBQUQsRUFBTSxJQUFOLEVBQVksV0FBWixHQUFBO0FBRWhCLFFBQUEsRUFBQTs7TUFGNEIsY0FBWTtLQUV4QztBQUFBLElBQUEsRUFBQSxHQUFRLFdBQUgsR0FBd0IsSUFBQSxNQUFBLENBQU8sZ0JBQVAsRUFBeUIsR0FBekIsQ0FBeEIsR0FBK0QsSUFBQSxNQUFBLENBQU8sY0FBUCxFQUF1QixHQUF2QixDQUFwRSxDQUFBO0FBRUEsV0FBTyxHQUFHLENBQUMsT0FBSixDQUFZLEVBQVosRUFBZ0IsU0FBQyxDQUFELEVBQUksQ0FBSixHQUFBO0FBQ3RCLFVBQUEsQ0FBQTtBQUFBLE1BQUEsQ0FBQSxHQUFJLElBQUssQ0FBQSxDQUFBLENBQVQsQ0FBQTtBQUNDLE1BQUEsSUFBRyxNQUFBLENBQUEsQ0FBQSxLQUFZLFFBQVosSUFBd0IsTUFBQSxDQUFBLENBQUEsS0FBWSxRQUF2QztlQUFxRCxFQUFyRDtPQUFBLE1BQUE7ZUFBNEQsRUFBNUQ7T0FGcUI7SUFBQSxDQUFoQixDQUFQLENBSmdCO0VBQUEsQ0FwS2pCLENBQUE7O0FBQUEseUJBNEtBLE9BQUEsR0FBVSxTQUFBLEdBQUE7QUFFVDtBQUFBOztPQUFBO1dBSUEsS0FOUztFQUFBLENBNUtWLENBQUE7O0FBQUEseUJBb0xBLEVBQUEsR0FBSyxTQUFBLEdBQUE7QUFFSixXQUFPLE1BQU0sQ0FBQyxFQUFkLENBRkk7RUFBQSxDQXBMTCxDQUFBOztzQkFBQTs7R0FGMEIsUUFBUSxDQUFDLEtBQXBDLENBQUE7O0FBQUEsTUEwTE0sQ0FBQyxPQUFQLEdBQWlCLFlBMUxqQixDQUFBOzs7OztBQ0FBLElBQUEsOEJBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxnQkFBUixDQUFmLENBQUE7O0FBQUE7QUFJQyxxQ0FBQSxDQUFBOzs7Ozs7Ozs7R0FBQTs7QUFBQSw2QkFBQSxNQUFBLEdBQWEsS0FBYixDQUFBOztBQUFBLDZCQUNBLFVBQUEsR0FBYSxLQURiLENBQUE7O0FBQUEsNkJBR0EsSUFBQSxHQUFPLFNBQUMsRUFBRCxHQUFBO0FBRU4sSUFBQSxJQUFBLENBQUEsQ0FBYyxJQUFFLENBQUEsTUFBaEI7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQURWLENBQUE7QUFHQTtBQUFBOztPQUhBO0FBQUEsSUFNQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQXRCLENBQStCLElBQS9CLENBTkEsQ0FBQTtBQUFBLElBT0EsSUFBQyxDQUFBLG1CQUFELENBQXFCLGNBQXJCLEVBQXFDLElBQXJDLENBUEEsQ0FBQTtBQVNBO0FBQUEsdURBVEE7QUFBQSxJQVVBLElBQUMsQ0FBQSxHQUFHLENBQUMsR0FBTCxDQUFTO0FBQUEsTUFBQSxZQUFBLEVBQWUsU0FBZjtLQUFULENBVkEsQ0FBQTs7TUFXQTtLQVhBO0FBYUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxlQUFWLEtBQTZCLENBQWhDO0FBQ0MsTUFBQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsRUFBZCxDQUFpQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsb0JBQS9CLEVBQXFELElBQUMsQ0FBQSxTQUF0RCxDQUFBLENBREQ7S0FBQSxNQUFBO0FBR0MsTUFBQSxJQUFDLENBQUEsU0FBRCxDQUFBLENBQUEsQ0FIRDtLQWJBO1dBa0JBLEtBcEJNO0VBQUEsQ0FIUCxDQUFBOztBQUFBLDZCQXlCQSxJQUFBLEdBQU8sU0FBQyxFQUFELEdBQUE7QUFFTixJQUFBLElBQUEsQ0FBQSxJQUFlLENBQUEsTUFBZjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsTUFBRCxHQUFVLEtBRFYsQ0FBQTtBQUdBO0FBQUE7O09BSEE7QUFBQSxJQU1BLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBdEIsQ0FBNkIsSUFBN0IsQ0FOQSxDQUFBO0FBVUE7QUFBQSx1REFWQTtBQUFBLElBV0EsSUFBQyxDQUFBLEdBQUcsQ0FBQyxHQUFMLENBQVM7QUFBQSxNQUFBLFlBQUEsRUFBZSxRQUFmO0tBQVQsQ0FYQSxDQUFBOztNQVlBO0tBWkE7V0FjQSxLQWhCTTtFQUFBLENBekJQLENBQUE7O0FBQUEsNkJBMkNBLE9BQUEsR0FBVSxTQUFBLEdBQUE7QUFFVCxJQUFBLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixjQUFyQixFQUFxQyxLQUFyQyxDQUFBLENBQUE7V0FFQSxLQUpTO0VBQUEsQ0EzQ1YsQ0FBQTs7QUFBQSw2QkFpREEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRWQsSUFBQSxJQUFjLE9BQUEsS0FBYSxJQUFDLENBQUEsVUFBNUI7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLFVBQUQsR0FBYyxPQURkLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0FqRGYsQ0FBQTs7QUFBQSw2QkF3REEsU0FBQSxHQUFZLFNBQUEsR0FBQTtBQUVYO0FBQUE7O09BQUE7V0FJQSxLQU5XO0VBQUEsQ0F4RFosQ0FBQTs7MEJBQUE7O0dBRjhCLGFBRi9CLENBQUE7O0FBQUEsTUFvRU0sQ0FBQyxPQUFQLEdBQWlCLGdCQXBFakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHVFQUFBO0VBQUE7O2lTQUFBOztBQUFBLGdCQUFBLEdBQXlCLE9BQUEsQ0FBUSxxQkFBUixDQUF6QixDQUFBOztBQUFBLHNCQUNBLEdBQXlCLE9BQUEsQ0FBUSx1REFBUixDQUR6QixDQUFBOztBQUFBLFNBRUEsR0FBeUIsT0FBQSxDQUFRLHVCQUFSLENBRnpCLENBQUE7O0FBQUEsR0FHQSxHQUF5QixPQUFBLENBQVEsZ0JBQVIsQ0FIekIsQ0FBQTs7QUFBQTtBQU9DLGtDQUFBLENBQUE7O0FBQUEsMEJBQUEsUUFBQSxHQUFXLFlBQVgsQ0FBQTs7QUFFYyxFQUFBLHVCQUFBLEdBQUE7QUFFYiwyRUFBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQixHQUFBLENBQUEsc0JBQWhCLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxZQUFELEdBQ0M7QUFBQSxNQUFBLFVBQUEsRUFBa0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsa0JBQWpCLENBQWxCO0FBQUEsTUFDQSxZQUFBLEVBQWtCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG9CQUFqQixDQURsQjtBQUFBLE1BRUEsYUFBQSxFQUFrQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixxQkFBakIsQ0FGbEI7QUFBQSxNQUdBLGVBQUEsRUFBa0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsdUJBQWpCLENBSGxCO0FBQUEsTUFJQSxTQUFBLEVBQWtCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLGlCQUFqQixDQUpsQjtLQUhELENBQUE7QUFBQSxJQVNBLGdEQUFBLFNBQUEsQ0FUQSxDQUFBO0FBQUEsSUFXQSxJQUFDLENBQUEsc0JBQUQsQ0FBQSxDQVhBLENBQUE7QUFhQSxXQUFPLElBQVAsQ0FmYTtFQUFBLENBRmQ7O0FBQUEsMEJBbUJBLHNCQUFBLEdBQXlCLFNBQUEsR0FBQTtBQUV4QixRQUFBLENBQUE7QUFBQSxJQUFBLENBQUEsR0FBSSxTQUFTLENBQUMsT0FBVixDQUVNO0FBQUEsTUFBQSxHQUFBLEVBQU8sSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixnQ0FBeEI7QUFBQSxNQUNBLElBQUEsRUFBTyxLQURQO0tBRk4sQ0FBSixDQUFBO0FBQUEsSUFLTSxDQUFDLENBQUMsSUFBRixDQUFPLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLEdBQUQsR0FBQTtBQUNOLFFBQUEsS0FBQyxDQUFBLFlBQVksQ0FBQyxHQUFkLENBQWtCLEdBQUcsQ0FBQyxZQUF0QixDQUFBLENBQUE7ZUFDQSxLQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxxQkFBVixDQUFnQyxDQUFDLElBQWpDLENBQXNDLEtBQUMsQ0FBQSxZQUFZLENBQUMsWUFBZCxDQUFBLENBQXRDLEVBRk07TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFQLENBTE4sQ0FBQTtBQUFBLElBU00sQ0FBQyxDQUFDLElBQUYsQ0FBTyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxHQUFELEdBQUE7ZUFBUyxPQUFPLENBQUMsS0FBUixDQUFjLGtDQUFkLEVBQWtELEdBQWxELEVBQVQ7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFQLENBVE4sQ0FBQTtXQVdBLEtBYndCO0VBQUEsQ0FuQnpCLENBQUE7O3VCQUFBOztHQUYyQixpQkFMNUIsQ0FBQTs7QUFBQSxNQXlDTSxDQUFDLE9BQVAsR0FBaUIsYUF6Q2pCLENBQUE7Ozs7O0FDQUEsSUFBQSxvQkFBQTtFQUFBO2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsaUJBQVIsQ0FBZixDQUFBOztBQUFBO0FBSUksMkJBQUEsQ0FBQTs7QUFBQSxtQkFBQSxRQUFBLEdBQVcsYUFBWCxDQUFBOztBQUVhLEVBQUEsZ0JBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsRUFBaEIsQ0FBQTtBQUFBLElBRUEsc0NBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTlM7RUFBQSxDQUZiOztnQkFBQTs7R0FGaUIsYUFGckIsQ0FBQTs7QUFBQSxNQWNNLENBQUMsT0FBUCxHQUFpQixNQWRqQixDQUFBOzs7OztBQ0FBLElBQUEsa0RBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUF1QixPQUFBLENBQVEsaUJBQVIsQ0FBdkIsQ0FBQTs7QUFBQSxNQUNBLEdBQXVCLE9BQUEsQ0FBUSxxQkFBUixDQUR2QixDQUFBOztBQUFBLG9CQUVBLEdBQXVCLE9BQUEsQ0FBUSxrQ0FBUixDQUZ2QixDQUFBOztBQUFBO0FBTUMsMkJBQUEsQ0FBQTs7QUFBQSxtQkFBQSxRQUFBLEdBQVcsYUFBWCxDQUFBOztBQUFBLG1CQUVBLGdCQUFBLEdBQW1CLElBRm5CLENBQUE7O0FBSWMsRUFBQSxnQkFBQSxHQUFBO0FBRWIscURBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsK0RBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxZQUFELEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFDQztBQUFBLFFBQUEsS0FBQSxFQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG1CQUFqQixDQUFYO0FBQUEsUUFDQSxHQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixHQUFqQixHQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBRHJEO09BREQ7QUFBQSxNQUdBLEtBQUEsRUFDQztBQUFBLFFBQUEsS0FBQSxFQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG9CQUFqQixDQUFYO0FBQUEsUUFDQSxHQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixHQUFqQixHQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBRHJEO09BSkQ7QUFBQSxNQU1BLFVBQUEsRUFDQztBQUFBLFFBQUEsS0FBQSxFQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLHlCQUFqQixDQUFYO0FBQUEsUUFDQSxHQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixHQUFqQixHQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBRHJEO09BUEQ7QUFBQSxNQVNBLFdBQUEsRUFBYyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixvQkFBakIsQ0FUZDtBQUFBLE1BVUEsVUFBQSxFQUFhLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG1CQUFqQixDQVZiO0tBREQsQ0FBQTtBQUFBLElBYUEsc0NBQUEsQ0FiQSxDQUFBO0FBQUEsSUFlQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBZkEsQ0FBQTtBQWlCQSxXQUFPLElBQVAsQ0FuQmE7RUFBQSxDQUpkOztBQUFBLG1CQXlCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsS0FBRCxHQUFzQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxhQUFWLENBQXRCLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxhQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFlBQVYsQ0FEdEIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLGtCQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGlCQUFWLENBRnRCLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxRQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFdBQVYsQ0FIdEIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFNBQUQsR0FBc0IsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsWUFBVixDQUp0QixDQUFBO1dBTUEsS0FSTTtFQUFBLENBekJQLENBQUE7O0FBQUEsbUJBbUNBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWixJQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFkLENBQWlCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxvQkFBL0IsRUFBcUQsSUFBQyxDQUFBLGFBQXRELENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEVBQWIsQ0FBZ0IsTUFBTSxDQUFDLGtCQUF2QixFQUEyQyxJQUFDLENBQUEsWUFBNUMsQ0FEQSxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsR0FBRyxDQUFDLEVBQUwsQ0FBUSxZQUFSLEVBQXNCLGlCQUF0QixFQUF5QyxJQUFDLENBQUEsV0FBMUMsQ0FIQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsR0FBRyxDQUFDLEVBQUwsQ0FBUSxZQUFSLEVBQXNCLGlCQUF0QixFQUF5QyxJQUFDLENBQUEsV0FBMUMsQ0FKQSxDQUFBO1dBTUEsS0FSWTtFQUFBLENBbkNiLENBQUE7O0FBQUEsbUJBNkNBLFlBQUEsR0FBZSxTQUFDLEtBQUQsR0FBQTtBQUVkLElBQUEsSUFBRyxJQUFDLENBQUEsZ0JBQUo7QUFDQyxNQUFBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixLQUFwQixDQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxZQUFELENBQWMsS0FBZCxDQUpBLENBQUE7V0FNQSxLQVJjO0VBQUEsQ0E3Q2YsQ0FBQTs7QUFBQSxtQkF1REEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRWQsUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFELENBQWtCLE9BQWxCLENBQVQsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsY0FBVixFQUEwQixPQUExQixDQUZBLENBQUE7QUFBQSxJQUlBLG9CQUFvQixDQUFDLElBQUQsQ0FBcEIsQ0FBd0IsSUFBQyxDQUFBLEtBQXpCLEVBQWdDLE1BQWhDLENBSkEsQ0FBQTtBQU9BLElBQUEsSUFBRyxPQUFBLEtBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFqQztBQUNDLE1BQUEsb0JBQW9CLENBQUMsSUFBRCxDQUFwQixDQUF3QixDQUFDLElBQUMsQ0FBQSxhQUFGLEVBQWlCLElBQUMsQ0FBQSxrQkFBbEIsQ0FBeEIsRUFBK0QsTUFBL0QsQ0FBQSxDQUFBO0FBQUEsTUFDQSxvQkFBb0IsQ0FBQyxHQUFyQixDQUF5QixDQUFDLElBQUMsQ0FBQSxTQUFGLEVBQWEsSUFBQyxDQUFBLFFBQWQsQ0FBekIsRUFBa0QsTUFBbEQsQ0FEQSxDQUREO0tBQUEsTUFHSyxJQUFHLE9BQUEsS0FBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQWpDO0FBQ0osTUFBQSxvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLENBQUMsSUFBQyxDQUFBLFNBQUYsRUFBYSxJQUFDLENBQUEsUUFBZCxDQUF4QixFQUFpRCxNQUFqRCxDQUFBLENBQUE7QUFBQSxNQUNBLG9CQUFvQixDQUFDLEdBQXJCLENBQXlCLENBQUMsSUFBQyxDQUFBLGFBQUYsRUFBaUIsSUFBQyxDQUFBLGtCQUFsQixDQUF6QixFQUFnRSxNQUFoRSxDQURBLENBREk7S0FBQSxNQUFBO0FBSUosTUFBQSxvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLENBQUMsSUFBQyxDQUFBLFNBQUYsQ0FBeEIsRUFBc0MsTUFBdEMsQ0FBQSxDQUFBO0FBQUEsTUFDQSxvQkFBb0IsQ0FBQyxHQUFyQixDQUF5QixDQUFDLElBQUMsQ0FBQSxhQUFGLEVBQWlCLElBQUMsQ0FBQSxrQkFBbEIsRUFBc0MsSUFBQyxDQUFBLFFBQXZDLENBQXpCLEVBQTJFLE1BQTNFLENBREEsQ0FKSTtLQVZMO1dBaUJBLEtBbkJjO0VBQUEsQ0F2RGYsQ0FBQTs7QUFBQSxtQkE0RUEsZ0JBQUEsR0FBbUIsU0FBQyxPQUFELEdBQUE7QUFFbEIsUUFBQSxNQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsT0FBQSxJQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBN0IsSUFBcUMsTUFBL0MsQ0FBQTtBQUFBLElBRUEsTUFBQTtBQUFTLGNBQU8sT0FBUDtBQUFBLGFBQ0gsTUFERztpQkFDUyxNQURUO0FBQUEsYUFFSCxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBRmhCO2lCQUUyQixRQUYzQjtBQUFBLGFBR0gsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUhoQjtpQkFHZ0MsUUFIaEM7QUFBQTtpQkFJSCxRQUpHO0FBQUE7aUJBRlQsQ0FBQTtXQVFBLE9BVmtCO0VBQUEsQ0E1RW5CLENBQUE7O0FBQUEsbUJBd0ZBLGFBQUEsR0FBZ0IsU0FBQSxHQUFBO0FBRWYsSUFBQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBaEMsQ0FBQSxDQUFBO1dBRUEsS0FKZTtFQUFBLENBeEZoQixDQUFBOztBQUFBLG1CQThGQSxXQUFBLEdBQWMsU0FBQyxDQUFELEdBQUE7QUFFYixRQUFBLEdBQUE7QUFBQSxJQUFBLEdBQUEsR0FBTSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBTixDQUFBO0FBQUEsSUFFQSxvQkFBb0IsQ0FBQyxRQUFyQixDQUE4QixHQUE5QixFQUFtQyxJQUFDLENBQUEsZ0JBQUQsQ0FBQSxDQUFuQyxDQUZBLENBQUE7V0FJQSxLQU5hO0VBQUEsQ0E5RmQsQ0FBQTs7QUFBQSxtQkFzR0EsV0FBQSxHQUFjLFNBQUMsQ0FBRCxHQUFBO0FBRWIsUUFBQSxHQUFBO0FBQUEsSUFBQSxHQUFBLEdBQU0sQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQU4sQ0FBQTtBQUFBLElBRUEsb0JBQW9CLENBQUMsVUFBckIsQ0FBZ0MsR0FBaEMsRUFBcUMsSUFBQyxDQUFBLGdCQUFELENBQUEsQ0FBckMsQ0FGQSxDQUFBO1dBSUEsS0FOYTtFQUFBLENBdEdkLENBQUE7O2dCQUFBOztHQUZvQixhQUpyQixDQUFBOztBQUFBLE1Bb0hNLENBQUMsT0FBUCxHQUFpQixNQXBIakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGdEQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsaUJBQVIsQ0FBZixDQUFBOztBQUFBLFFBQ0EsR0FBZSxPQUFBLENBQVEsa0JBQVIsQ0FEZixDQUFBOztBQUFBLE1BRUEsR0FBZSxPQUFBLENBQVEscUJBQVIsQ0FGZixDQUFBOztBQUFBO0FBTUkscUNBQUEsQ0FBQTs7QUFBQSw2QkFBQSxRQUFBLEdBQVcsbUJBQVgsQ0FBQTs7QUFBQSw2QkFFQSxRQUFBLEdBQ0k7QUFBQSxJQUFBLElBQUEsRUFBYSxDQUFFLE1BQU0sQ0FBQyxPQUFULEVBQWtCLE1BQU0sQ0FBQyxTQUF6QixFQUFvQyxNQUFNLENBQUMsTUFBM0MsQ0FBYjtBQUFBLElBQ0EsS0FBQSxFQUFhLENBQUUsTUFBTSxDQUFDLE1BQVQsRUFBaUIsTUFBTSxDQUFDLFNBQXhCLEVBQW1DLE1BQU0sQ0FBQyxPQUExQyxDQURiO0FBQUEsSUFFQSxVQUFBLEVBQWEsQ0FBRSxNQUFNLENBQUMsT0FBVCxFQUFrQixNQUFNLENBQUMsU0FBekIsRUFBb0MsTUFBTSxDQUFDLE1BQTNDLENBRmI7QUFBQSxJQUdBLE9BQUEsRUFBYSxDQUFFLE1BQU0sQ0FBQyxNQUFULEVBQWlCLE1BQU0sQ0FBQyxTQUF4QixFQUFtQyxNQUFNLENBQUMsT0FBMUMsQ0FIYjtHQUhKLENBQUE7O0FBQUEsNkJBUUEsWUFBQSxHQUNJO0FBQUEsSUFBQSxJQUFBLEVBQU8sSUFBUDtBQUFBLElBQ0EsS0FBQSxFQUNJO0FBQUEsTUFBQSxHQUFBLEVBQU0sSUFBTjtBQUFBLE1BQVksTUFBQSxFQUFTLElBQXJCO0FBQUEsTUFBMkIsSUFBQSxFQUFPLElBQWxDO0FBQUEsTUFBd0MsS0FBQSxFQUFRLElBQWhEO0FBQUEsTUFBc0QsS0FBQSxFQUFRLElBQTlEO0FBQUEsTUFBb0UsTUFBQSxFQUFTLElBQTdFO0tBRko7QUFBQSxJQUdBLEdBQUEsRUFDSTtBQUFBLE1BQUEsR0FBQSxFQUFNLElBQU47QUFBQSxNQUFZLE1BQUEsRUFBUyxJQUFyQjtBQUFBLE1BQTJCLElBQUEsRUFBTyxJQUFsQztBQUFBLE1BQXdDLEtBQUEsRUFBUSxJQUFoRDtBQUFBLE1BQXNELEtBQUEsRUFBUSxJQUE5RDtBQUFBLE1BQW9FLE1BQUEsRUFBUyxJQUE3RTtLQUpKO0dBVEosQ0FBQTs7QUFBQSw2QkFlQSxhQUFBLEdBQ0k7QUFBQSxJQUFBLFdBQUEsRUFDSTtBQUFBLE1BQUEsSUFBQSxFQUFPLFFBQVA7QUFBQSxNQUNBLEtBQUEsRUFDSTtBQUFBLFFBQUEsR0FBQSxFQUFNLE1BQU47QUFBQSxRQUFjLE1BQUEsRUFBUyxDQUF2QjtBQUFBLFFBQTBCLElBQUEsRUFBTyxDQUFqQztBQUFBLFFBQW9DLEtBQUEsRUFBUSxDQUE1QztBQUFBLFFBQStDLEtBQUEsRUFBUSxNQUF2RDtBQUFBLFFBQStELE1BQUEsRUFBUyxDQUF4RTtPQUZKO0FBQUEsTUFHQSxHQUFBLEVBQ0k7QUFBQSxRQUFBLEdBQUEsRUFBTSxDQUFOO0FBQUEsUUFBUyxNQUFBLEVBQVMsTUFBbEI7QUFBQSxRQUEwQixJQUFBLEVBQU8sQ0FBakM7QUFBQSxRQUFvQyxLQUFBLEVBQVEsQ0FBNUM7QUFBQSxRQUErQyxLQUFBLEVBQVEsTUFBdkQ7QUFBQSxRQUErRCxNQUFBLEVBQVMsTUFBeEU7T0FKSjtLQURKO0FBQUEsSUFNQSxXQUFBLEVBQ0k7QUFBQSxNQUFBLElBQUEsRUFBTyxRQUFQO0FBQUEsTUFDQSxLQUFBLEVBQ0k7QUFBQSxRQUFBLEdBQUEsRUFBTSxDQUFOO0FBQUEsUUFBUyxNQUFBLEVBQVMsTUFBbEI7QUFBQSxRQUEwQixJQUFBLEVBQU8sQ0FBakM7QUFBQSxRQUFvQyxLQUFBLEVBQVEsQ0FBNUM7QUFBQSxRQUErQyxLQUFBLEVBQVEsTUFBdkQ7QUFBQSxRQUErRCxNQUFBLEVBQVMsQ0FBeEU7T0FGSjtBQUFBLE1BR0EsR0FBQSxFQUNJO0FBQUEsUUFBQSxHQUFBLEVBQU0sTUFBTjtBQUFBLFFBQWMsTUFBQSxFQUFTLENBQXZCO0FBQUEsUUFBMEIsSUFBQSxFQUFPLENBQWpDO0FBQUEsUUFBb0MsS0FBQSxFQUFRLENBQTVDO0FBQUEsUUFBK0MsS0FBQSxFQUFRLE1BQXZEO0FBQUEsUUFBK0QsTUFBQSxFQUFTLE1BQXhFO09BSko7S0FQSjtBQUFBLElBWUEsV0FBQSxFQUNJO0FBQUEsTUFBQSxJQUFBLEVBQU8sT0FBUDtBQUFBLE1BQ0EsS0FBQSxFQUNJO0FBQUEsUUFBQSxHQUFBLEVBQU0sQ0FBTjtBQUFBLFFBQVMsTUFBQSxFQUFTLENBQWxCO0FBQUEsUUFBcUIsSUFBQSxFQUFPLENBQTVCO0FBQUEsUUFBK0IsS0FBQSxFQUFRLE1BQXZDO0FBQUEsUUFBK0MsS0FBQSxFQUFRLENBQXZEO0FBQUEsUUFBMEQsTUFBQSxFQUFTLE1BQW5FO09BRko7QUFBQSxNQUdBLEdBQUEsRUFDSTtBQUFBLFFBQUEsR0FBQSxFQUFNLENBQU47QUFBQSxRQUFTLE1BQUEsRUFBUyxDQUFsQjtBQUFBLFFBQXFCLElBQUEsRUFBTyxNQUE1QjtBQUFBLFFBQW9DLEtBQUEsRUFBUSxDQUE1QztBQUFBLFFBQStDLEtBQUEsRUFBUSxNQUF2RDtBQUFBLFFBQStELE1BQUEsRUFBUyxNQUF4RTtPQUpKO0tBYko7QUFBQSxJQWtCQSxXQUFBLEVBQ0k7QUFBQSxNQUFBLElBQUEsRUFBTyxPQUFQO0FBQUEsTUFDQSxLQUFBLEVBQ0k7QUFBQSxRQUFBLEdBQUEsRUFBTSxDQUFOO0FBQUEsUUFBUyxNQUFBLEVBQVMsQ0FBbEI7QUFBQSxRQUFxQixJQUFBLEVBQU8sTUFBNUI7QUFBQSxRQUFvQyxLQUFBLEVBQVEsQ0FBNUM7QUFBQSxRQUErQyxLQUFBLEVBQVEsQ0FBdkQ7QUFBQSxRQUEwRCxNQUFBLEVBQVMsTUFBbkU7T0FGSjtBQUFBLE1BR0EsR0FBQSxFQUNJO0FBQUEsUUFBQSxHQUFBLEVBQU0sQ0FBTjtBQUFBLFFBQVMsTUFBQSxFQUFTLENBQWxCO0FBQUEsUUFBcUIsSUFBQSxFQUFPLENBQTVCO0FBQUEsUUFBK0IsS0FBQSxFQUFRLE1BQXZDO0FBQUEsUUFBK0MsS0FBQSxFQUFRLE1BQXZEO0FBQUEsUUFBK0QsTUFBQSxFQUFTLE1BQXhFO09BSko7S0FuQko7R0FoQkosQ0FBQTs7QUF5Q2EsRUFBQSwwQkFBQSxHQUFBO0FBRVQscUNBQUEsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSwrREFBQSxDQUFBO0FBQUEsK0VBQUEsQ0FBQTtBQUFBLGlEQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsRUFBaEIsQ0FBQTtBQUFBLElBRUEsZ0RBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTlM7RUFBQSxDQXpDYjs7QUFBQSw2QkFpREEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVILElBQUEsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxhQUFWLENBQVYsQ0FBQTtXQUVBLEtBSkc7RUFBQSxDQWpEUCxDQUFBOztBQUFBLDZCQXVEQSxPQUFBLEdBQVUsU0FBQyxRQUFELEVBQVcsTUFBWCxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFDLENBQUEsVUFBRCxDQUFZLE1BQVosQ0FBZCxDQUZBLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxZQUFELEdBQWdCLElBQUMsQ0FBQSxTQUFELENBQVcsUUFBWCxFQUFxQixNQUFyQixDQUpoQixDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsV0FBRCxDQUFhLElBQUMsQ0FBQSxZQUFZLENBQUMsS0FBM0IsQ0FOQSxDQUFBO1dBUUEsS0FWTTtFQUFBLENBdkRWLENBQUE7O0FBQUEsNkJBbUVBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFVCxJQUFBLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFhO0FBQUEsTUFBQSxPQUFBLEVBQVMsRUFBVDtLQUFiLENBQUEsQ0FBQTtXQUVBLEtBSlM7RUFBQSxDQW5FYixDQUFBOztBQUFBLDZCQXlFQSxVQUFBLEdBQWEsU0FBQyxJQUFELEdBQUE7QUFFVCxRQUFBLE9BQUE7QUFBQSxJQUFBLE9BQUEsR0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsVUFBVixDQUFxQixJQUFyQixFQUEyQixJQUEzQixDQUFWLENBQUE7V0FFQSxJQUFDLENBQUEsUUFBUyxDQUFBLE9BQUEsQ0FBVixJQUFzQixJQUFDLENBQUEsUUFBUSxDQUFDLEtBSnZCO0VBQUEsQ0F6RWIsQ0FBQTs7QUFBQSw2QkErRUEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRVgsSUFBQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxDQUFELEdBQUE7ZUFBTyxLQUFDLENBQUEsTUFBTSxDQUFDLEVBQVIsQ0FBVyxDQUFYLENBQWEsQ0FBQyxHQUFkLENBQWtCO0FBQUEsVUFBQSxrQkFBQSxFQUFxQixPQUFRLENBQUEsQ0FBQSxDQUE3QjtTQUFsQixFQUFQO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYixDQUFBLENBQUE7V0FFQSxLQUpXO0VBQUEsQ0EvRWYsQ0FBQTs7QUFBQSw2QkFxRkEsU0FBQSxHQUFZLFNBQUMsUUFBRCxFQUFXLE1BQVgsR0FBQTtBQUVSLFFBQUEsTUFBQTtBQUFBLElBQUEsSUFBRyxDQUFBLFFBQVMsQ0FBQyxrQkFBVixJQUFpQyxNQUFBLEtBQVUsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFqRTtBQUNJLE1BQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBeEIsQ0FESjtLQUFBLE1BR0ssSUFBRyxRQUFBLEtBQVksSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUEvQixJQUEyQyxNQUFBLEtBQVUsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUEzRTtBQUNELE1BQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixFQUFBLEdBQUUsQ0FBQyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQXBCLENBQUYsR0FBMEIsR0FBMUIsR0FBNEIsQ0FBQyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQXBCLENBQXRELEVBQWlGLEVBQUEsR0FBRSxDQUFDLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBbkIsQ0FBRixHQUF5QixHQUF6QixHQUEyQixDQUFDLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBbkIsQ0FBNUcsQ0FBVCxDQURDO0tBQUEsTUFHQSxJQUFHLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQTdCLElBQXNDLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQXRFO0FBRUQsTUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFELENBQUEsQ0FBVCxDQUZDO0tBQUEsTUFBQTtBQU9ELE1BQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSxnQkFBRCxDQUFBLENBQVQsQ0FQQztLQU5MO1dBZUEsT0FqQlE7RUFBQSxDQXJGWixDQUFBOztBQUFBLDZCQXdHQSx3QkFBQSxHQUEyQixTQUFDLFFBQUQsRUFBVyxRQUFYLEdBQUE7QUFFdkIsUUFBQSwyRUFBQTtBQUFBLElBQUEsY0FBQSxHQUFpQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQXRCLENBQWdDO0FBQUEsTUFBQSxJQUFBLEVBQU8sUUFBUDtLQUFoQyxDQUFqQixDQUFBO0FBQUEsSUFDQSxpQkFBQSxHQUFvQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQXRCLENBQThCLGNBQTlCLENBRHBCLENBQUE7QUFBQSxJQUdBLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUF0QixDQUFnQztBQUFBLE1BQUEsSUFBQSxFQUFPLFFBQVA7S0FBaEMsQ0FIaEIsQ0FBQTtBQUFBLElBSUEsZ0JBQUEsR0FBbUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUF0QixDQUE4QixhQUE5QixDQUpuQixDQUFBO0FBQUEsSUFNQSxPQUFBLEdBQWEsaUJBQUEsR0FBb0IsZ0JBQXZCLEdBQTZDLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBNUQsR0FBNkUsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQU50RyxDQUFBO1dBUUEsUUFWdUI7RUFBQSxDQXhHM0IsQ0FBQTs7QUFBQSw2QkFvSEEsZ0JBQUEsR0FBbUIsU0FBQSxHQUFBO0FBRWYsUUFBQSxPQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxJQUFDLENBQUEsYUFBWCxDQUEwQixDQUFBLENBQUEsQ0FBcEMsQ0FBQTtXQUVBLFFBSmU7RUFBQSxDQXBIbkIsQ0FBQTs7QUFBQSw2QkEwSEEsV0FBQSxHQUFjLFNBQUMsTUFBRCxHQUFBO0FBRVYsSUFBQSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxNQUFaLENBQUEsQ0FBQTtXQUVBLEtBSlU7RUFBQSxDQTFIZCxDQUFBOztBQUFBLDZCQWdJQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRUgsSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFFBQUwsQ0FBYyxNQUFkLENBQUEsQ0FBQTtXQUVBLEtBSkc7RUFBQSxDQWhJUCxDQUFBOztBQUFBLDZCQXNJQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRUgsSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFdBQUwsQ0FBaUIsTUFBakIsQ0FBQSxDQUFBO1dBRUEsS0FKRztFQUFBLENBdElQLENBQUE7O0FBQUEsNkJBNElBLEtBQUEsR0FBSyxTQUFDLEVBQUQsR0FBQTtBQUVELElBQUEsSUFBQyxDQUFBLElBQUQsQ0FBQSxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFhLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsRUFBSSxFQUFKLEdBQUE7QUFDVCxZQUFBLE1BQUE7QUFBQSxRQUFBLE1BQUEsR0FBUztBQUFBLFVBQUEsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUFaO1NBQVQsQ0FBQTtBQUFBLFFBQ0EsTUFBTSxDQUFDLEtBQVAsR0FBZSxDQUFBLEdBQUksR0FEbkIsQ0FBQTtBQUFBLFFBRUEsTUFBTyxDQUFBLEtBQUMsQ0FBQSxZQUFZLENBQUMsSUFBZCxDQUFQLEdBQTZCLE1BRjdCLENBQUE7QUFHQSxRQUFBLElBQUcsQ0FBQSxLQUFLLENBQVI7QUFBZSxVQUFBLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFNBQUEsR0FBQTtBQUMvQixZQUFBLEtBQUMsQ0FBQSxXQUFELENBQWEsS0FBQyxDQUFBLFlBQVksQ0FBQyxHQUEzQixDQUFBLENBQUE7OENBQ0EsY0FGK0I7VUFBQSxDQUFwQixDQUFmO1NBSEE7ZUFPQSxTQUFTLENBQUMsRUFBVixDQUFhLENBQUEsQ0FBRSxFQUFGLENBQWIsRUFBb0IsR0FBcEIsRUFBeUIsTUFBekIsRUFSUztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWIsQ0FGQSxDQUFBO1dBWUEsS0FkQztFQUFBLENBNUlMLENBQUE7O0FBQUEsNkJBNEpBLEdBQUEsR0FBTSxTQUFDLEVBQUQsR0FBQTtBQUVGLElBQUEsSUFBQyxDQUFBLE1BQU0sQ0FBQyxJQUFSLENBQWEsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsQ0FBRCxFQUFJLEVBQUosR0FBQTtBQUNULFlBQUEsTUFBQTtBQUFBLFFBQUEsTUFBQSxHQUFTO0FBQUEsVUFBQSxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQVo7U0FBVCxDQUFBO0FBQUEsUUFDQSxNQUFNLENBQUMsS0FBUCxHQUFlLEdBQUEsR0FBTSxDQUFDLEdBQUEsR0FBTSxDQUFQLENBRHJCLENBQUE7QUFBQSxRQUVBLE1BQU8sQ0FBQSxLQUFDLENBQUEsWUFBWSxDQUFDLElBQWQsQ0FBUCxHQUE2QixHQUY3QixDQUFBO0FBR0EsUUFBQSxJQUFHLENBQUEsS0FBSyxDQUFSO0FBQWUsVUFBQSxNQUFNLENBQUMsVUFBUCxHQUFvQixTQUFBLEdBQUE7QUFDL0IsWUFBQSxLQUFDLENBQUEsSUFBRCxDQUFBLENBQUEsQ0FBQTs4Q0FDQSxjQUYrQjtVQUFBLENBQXBCLENBQWY7U0FIQTtlQU9BLFNBQVMsQ0FBQyxFQUFWLENBQWEsQ0FBQSxDQUFFLEVBQUYsQ0FBYixFQUFvQixHQUFwQixFQUF5QixNQUF6QixFQVJTO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYixDQUFBLENBQUE7V0FVQSxLQVpFO0VBQUEsQ0E1Sk4sQ0FBQTs7MEJBQUE7O0dBRjJCLGFBSi9CLENBQUE7O0FBQUEsTUFnTE0sQ0FBQyxPQUFQLEdBQWlCLGdCQWhMakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLDZDQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBdUIsT0FBQSxDQUFRLGlCQUFSLENBQXZCLENBQUE7O0FBQUEsb0JBQ0EsR0FBdUIsT0FBQSxDQUFRLGtDQUFSLENBRHZCLENBQUE7O0FBQUE7QUFLQyw4QkFBQSxDQUFBOztBQUFBLHNCQUFBLEVBQUEsR0FBa0IsSUFBbEIsQ0FBQTs7QUFBQSxzQkFFQSxlQUFBLEdBQWtCLEdBRmxCLENBQUE7O0FBQUEsc0JBSUEsZUFBQSxHQUFrQixDQUpsQixDQUFBOztBQUFBLHNCQUtBLGVBQUEsR0FBa0IsQ0FMbEIsQ0FBQTs7QUFBQSxzQkFPQSxpQkFBQSxHQUFvQixFQVBwQixDQUFBOztBQUFBLHNCQVFBLGlCQUFBLEdBQW9CLEdBUnBCLENBQUE7O0FBQUEsc0JBVUEsa0JBQUEsR0FBcUIsRUFWckIsQ0FBQTs7QUFBQSxzQkFXQSxrQkFBQSxHQUFxQixHQVhyQixDQUFBOztBQUFBLHNCQWFBLEtBQUEsR0FBUSx1RUFBdUUsQ0FBQyxLQUF4RSxDQUE4RSxFQUE5RSxDQWJSLENBQUE7O0FBZWMsRUFBQSxtQkFBQSxHQUFBO0FBRWIsdURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLDJEQUFBLENBQUE7QUFBQSxtRUFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBWSxDQUFBLENBQUUsWUFBRixDQUFaLENBQUEsQ0FBQTtBQUFBLElBRUEseUNBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTmE7RUFBQSxDQWZkOztBQUFBLHNCQXVCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsU0FBRCxHQUFhLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGlCQUFWLENBQWIsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxlQUFWLENBRFIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxlQUFWLENBRlIsQ0FBQTtXQUlBLEtBTk07RUFBQSxDQXZCUCxDQUFBOztBQUFBLHNCQStCQSxrQkFBQSxHQUFxQixTQUFFLEVBQUYsR0FBQTtBQUVwQixJQUZxQixJQUFDLENBQUEsS0FBQSxFQUV0QixDQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLGlCQUFaLENBQUEsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLEdBQ0EsQ0FBQyxJQURGLENBQ08sYUFEUCxDQUVFLENBQUMsTUFGSCxDQUFBLENBR0UsQ0FBQyxHQUhILENBQUEsQ0FJQyxDQUFDLFFBSkYsQ0FJVyxnQkFKWCxDQUxBLENBQUE7QUFBQSxJQVdBLG9CQUFvQixDQUFDLElBQUQsQ0FBcEIsQ0FBd0IsSUFBQyxDQUFBLFNBQXpCLEVBQW9DLE9BQXBDLEVBQTZDLEtBQTdDLEVBQW9ELElBQUMsQ0FBQSxJQUFyRCxDQVhBLENBQUE7V0FhQSxLQWZvQjtFQUFBLENBL0JyQixDQUFBOztBQUFBLHNCQWdEQSxjQUFBLEdBQWlCLFNBQUEsR0FBQTs7TUFFaEIsSUFBQyxDQUFBO0tBQUQ7V0FFQSxLQUpnQjtFQUFBLENBaERqQixDQUFBOztBQUFBLHNCQXNEQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFZLElBQUMsQ0FBQSxjQUFiLENBQUEsQ0FBQTtXQUVBLEtBSk07RUFBQSxDQXREUCxDQUFBOztBQUFBLHNCQTREQSxjQUFBLEdBQWlCLFNBQUEsR0FBQTs7TUFFaEIsSUFBQyxDQUFBO0tBQUQ7V0FFQSxLQUpnQjtFQUFBLENBNURqQixDQUFBOztBQUFBLHNCQWtFQSxVQUFBLEdBQWEsU0FBQyxFQUFELEdBQUE7QUFPWixJQUFBLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO0FBQ1YsWUFBQSxPQUFBO0FBQUEsUUFBQSxPQUFBLEdBQVUsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxjQUFjLENBQUMsS0FBZixDQUFxQixFQUFyQixDQUFWLENBQW1DLENBQUMsSUFBcEMsQ0FBeUMsRUFBekMsQ0FBVixDQUFBO2VBQ0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsT0FBeEIsRUFBaUMsS0FBQyxDQUFBLFNBQWxDLEVBQTZDLE9BQTdDLEVBQXNELEtBQXRELEVBQTZELFNBQUEsR0FBQTtpQkFBRyxLQUFDLENBQUEsWUFBRCxDQUFjLEVBQWQsRUFBSDtRQUFBLENBQTdELEVBRlU7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBR0UsSUFIRixDQUFBLENBQUE7V0FLQSxLQVpZO0VBQUEsQ0FsRWIsQ0FBQTs7QUFBQSxzQkFnRkEsWUFBQSxHQUFlLFNBQUMsRUFBRCxHQUFBO0FBRWQsSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxJQUFkLEVBQW9CLEdBQXBCLEVBQXlCO0FBQUEsTUFBRSxLQUFBLEVBQVEsR0FBVjtBQUFBLE1BQWUsS0FBQSxFQUFRLE1BQXZCO0FBQUEsTUFBK0IsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUEzQztLQUF6QixDQUFBLENBQUE7QUFBQSxJQUNBLFNBQVMsQ0FBQyxFQUFWLENBQWEsSUFBQyxDQUFBLElBQWQsRUFBb0IsR0FBcEIsRUFBeUI7QUFBQSxNQUFFLEtBQUEsRUFBUSxHQUFWO0FBQUEsTUFBZSxNQUFBLEVBQVMsTUFBeEI7QUFBQSxNQUFnQyxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQTVDO0tBQXpCLENBREEsQ0FBQTtBQUFBLElBR0EsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsSUFBZCxFQUFvQixHQUFwQixFQUF5QjtBQUFBLE1BQUUsS0FBQSxFQUFRLEdBQVY7QUFBQSxNQUFlLEtBQUEsRUFBUSxNQUF2QjtBQUFBLE1BQStCLElBQUEsRUFBTyxJQUFJLENBQUMsT0FBM0M7S0FBekIsQ0FIQSxDQUFBO0FBQUEsSUFJQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxJQUFkLEVBQW9CLEdBQXBCLEVBQXlCO0FBQUEsTUFBRSxLQUFBLEVBQVEsR0FBVjtBQUFBLE1BQWUsTUFBQSxFQUFTLE1BQXhCO0FBQUEsTUFBZ0MsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUE1QztBQUFBLE1BQXFELFVBQUEsRUFBYSxFQUFsRTtLQUF6QixDQUpBLENBQUE7QUFBQSxJQU1BLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQ1Ysb0JBQW9CLENBQUMsSUFBRCxDQUFwQixDQUF3QixLQUFDLENBQUEsU0FBekIsRUFBb0MsRUFBcEMsRUFBd0MsS0FBeEMsRUFEVTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFFRSxHQUZGLENBTkEsQ0FBQTtBQUFBLElBVUEsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFDVixLQUFDLENBQUEsR0FBRyxDQUFDLFdBQUwsQ0FBaUIsZ0JBQWpCLEVBRFU7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBRUUsSUFGRixDQVZBLENBQUE7V0FjQSxLQWhCYztFQUFBLENBaEZmLENBQUE7O21CQUFBOztHQUZ1QixhQUh4QixDQUFBOztBQUFBLE1BdUdNLENBQUMsT0FBUCxHQUFpQixTQXZHakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHVGQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBcUIsT0FBQSxDQUFRLGlCQUFSLENBQXJCLENBQUE7O0FBQUEsUUFDQSxHQUFxQixPQUFBLENBQVEsa0JBQVIsQ0FEckIsQ0FBQTs7QUFBQSxhQUVBLEdBQXFCLE9BQUEsQ0FBUSw0QkFBUixDQUZyQixDQUFBOztBQUFBLGtCQUdBLEdBQXFCLE9BQUEsQ0FBUSxzQ0FBUixDQUhyQixDQUFBOztBQUFBLGNBSUEsR0FBcUIsT0FBQSxDQUFRLDhCQUFSLENBSnJCLENBQUE7O0FBQUEsR0FLQSxHQUFxQixPQUFBLENBQVEsa0JBQVIsQ0FMckIsQ0FBQTs7QUFBQTtBQVNDLDRCQUFBLENBQUE7O0FBQUEsb0JBQUEsY0FBQSxHQUFrQixNQUFsQixDQUFBOztBQUFBLG9CQUVBLFFBQUEsR0FBVyxTQUZYLENBQUE7O0FBQUEsb0JBSUEsS0FBQSxHQUFpQixJQUpqQixDQUFBOztBQUFBLG9CQUtBLFlBQUEsR0FBaUIsSUFMakIsQ0FBQTs7QUFBQSxvQkFNQSxXQUFBLEdBQWlCLElBTmpCLENBQUE7O0FBQUEsb0JBUUEsYUFBQSxHQUFnQixJQVJoQixDQUFBOztBQVVjLEVBQUEsaUJBQUEsR0FBQTtBQUViLDZEQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEseUNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLHlEQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxLQUFELEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFBYTtBQUFBLFFBQUEsUUFBQSxFQUFXLFFBQVg7QUFBQSxRQUErQixLQUFBLEVBQVEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUExRDtBQUFBLFFBQXNFLElBQUEsRUFBTyxJQUE3RTtBQUFBLFFBQW1GLElBQUEsRUFBTyxJQUFDLENBQUEsY0FBM0Y7T0FBYjtBQUFBLE1BQ0EsS0FBQSxFQUFhO0FBQUEsUUFBQSxRQUFBLEVBQVcsYUFBWDtBQUFBLFFBQStCLEtBQUEsRUFBUSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQTFEO0FBQUEsUUFBc0UsSUFBQSxFQUFPLElBQTdFO0FBQUEsUUFBbUYsSUFBQSxFQUFPLElBQUMsQ0FBQSxjQUEzRjtPQURiO0FBQUEsTUFFQSxVQUFBLEVBQWE7QUFBQSxRQUFBLFFBQUEsRUFBVyxrQkFBWDtBQUFBLFFBQStCLEtBQUEsRUFBUSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQTFEO0FBQUEsUUFBc0UsSUFBQSxFQUFPLElBQTdFO0FBQUEsUUFBbUYsSUFBQSxFQUFPLElBQUMsQ0FBQSxjQUEzRjtPQUZiO0FBQUEsTUFHQSxNQUFBLEVBQWE7QUFBQSxRQUFBLFFBQUEsRUFBVyxjQUFYO0FBQUEsUUFBK0IsS0FBQSxFQUFRLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBMUQ7QUFBQSxRQUFzRSxJQUFBLEVBQU8sSUFBN0U7QUFBQSxRQUFtRixJQUFBLEVBQU8sSUFBQyxDQUFBLGNBQTNGO09BSGI7S0FERCxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsYUFBRCxDQUFBLENBTkEsQ0FBQTtBQUFBLElBUUEsdUNBQUEsQ0FSQSxDQUFBO0FBYUEsV0FBTyxJQUFQLENBZmE7RUFBQSxDQVZkOztBQUFBLG9CQTJCQSxhQUFBLEdBQWdCLFNBQUEsR0FBQTtBQUVmLFFBQUEsZ0JBQUE7QUFBQTtBQUFBLFNBQUEsWUFBQTt3QkFBQTtBQUFBLE1BQUMsSUFBQyxDQUFBLEtBQU0sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFiLEdBQW9CLEdBQUEsQ0FBQSxJQUFLLENBQUEsS0FBTSxDQUFBLElBQUEsQ0FBSyxDQUFDLFFBQXRDLENBQUE7QUFBQSxLQUFBO1dBRUEsS0FKZTtFQUFBLENBM0JoQixDQUFBOztBQUFBLG9CQWlDQSxVQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVgsUUFBQSwwQkFBQTtBQUFBO0FBQUE7U0FBQSxZQUFBO3dCQUFBO0FBQ0MsTUFBQSxJQUFHLElBQUksQ0FBQyxJQUFMLEtBQWEsSUFBQyxDQUFBLGNBQWpCO3NCQUFxQyxJQUFDLENBQUEsUUFBRCxDQUFVLElBQUksQ0FBQyxJQUFmLEdBQXJDO09BQUEsTUFBQTs4QkFBQTtPQUREO0FBQUE7b0JBRlc7RUFBQSxDQWpDYixDQUFBOztBQUFBLEVBc0NDLElBdENELENBQUE7O0FBQUEsb0JBd0NBLGNBQUEsR0FBaUIsU0FBQyxLQUFELEdBQUE7QUFFaEIsUUFBQSxnQkFBQTtBQUFBO0FBQUEsU0FBQSxZQUFBO3dCQUFBO0FBQ0MsTUFBQSxJQUF1QixLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQU0sQ0FBQSxJQUFBLENBQUssQ0FBQyxLQUE3QztBQUFBLGVBQU8sSUFBQyxDQUFBLEtBQU0sQ0FBQSxJQUFBLENBQWQsQ0FBQTtPQUREO0FBQUEsS0FBQTtXQUdBLEtBTGdCO0VBQUEsQ0F4Q2pCLENBQUE7O0FBQUEsb0JBK0NBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFkLENBQWlCLE9BQWpCLEVBQTBCLElBQUMsQ0FBQSxLQUEzQixDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0EvQ1AsQ0FBQTs7QUFBQSxvQkFxREEsS0FBQSxHQUFRLFNBQUEsR0FBQTtBQUVQLElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLEdBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsSUFBQyxDQUFBLEtBQTVCLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUZBLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FIQSxDQUFBO1dBS0EsS0FQTztFQUFBLENBckRSLENBQUE7O0FBQUEsb0JBOERBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWixJQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFWLENBQWEsR0FBRyxDQUFDLGlCQUFqQixFQUFvQyxJQUFDLENBQUEsVUFBckMsQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsRUFBVixDQUFhLEdBQUcsQ0FBQyxxQkFBakIsRUFBd0MsSUFBQyxDQUFBLGFBQXpDLENBREEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLEVBQWQsQ0FBaUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLHVCQUEvQixFQUF3RCxJQUFDLENBQUEsVUFBekQsQ0FIQSxDQUFBO1dBS0EsS0FQWTtFQUFBLENBOURiLENBQUE7O0FBQUEsb0JBdUVBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWixJQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsR0FBTCxDQUFTLFlBQVQsRUFBdUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUExQyxDQUFBLENBQUE7V0FFQSxLQUpZO0VBQUEsQ0F2RWIsQ0FBQTs7QUFBQSxvQkE2RUEsVUFBQSxHQUFhLFNBQUMsUUFBRCxFQUFXLE9BQVgsR0FBQTtBQUVaLElBQUEsSUFBRyxJQUFDLENBQUEsYUFBRCxJQUFtQixJQUFDLENBQUEsYUFBYSxDQUFDLEtBQWYsQ0FBQSxDQUFBLEtBQTRCLFVBQWxEO0FBQ0MsTUFBRyxDQUFBLFNBQUEsS0FBQSxHQUFBO2VBQUEsQ0FBQSxTQUFDLFFBQUQsRUFBVyxPQUFYLEdBQUE7aUJBQXVCLEtBQUMsQ0FBQSxhQUFhLENBQUMsSUFBZixDQUFvQixTQUFBLEdBQUE7bUJBQUcsS0FBQyxDQUFBLFVBQUQsQ0FBWSxRQUFaLEVBQXNCLE9BQXRCLEVBQUg7VUFBQSxDQUFwQixFQUF2QjtRQUFBLENBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBSCxDQUFJLFFBQUosRUFBYyxPQUFkLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FGRDtLQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsWUFBRCxHQUFnQixJQUFDLENBQUEsY0FBRCxDQUFnQixRQUFRLENBQUMsSUFBekIsQ0FKaEIsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLFdBQUQsR0FBZ0IsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsT0FBTyxDQUFDLElBQXhCLENBTGhCLENBQUE7QUFPQSxJQUFBLElBQUcsQ0FBQSxJQUFFLENBQUEsWUFBTDtBQUNDLE1BQUEsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsS0FBakIsRUFBd0IsSUFBQyxDQUFBLFdBQXpCLENBQUEsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLElBQUMsQ0FBQSxlQUFELENBQWlCLElBQUMsQ0FBQSxZQUFsQixFQUFnQyxJQUFDLENBQUEsV0FBakMsQ0FBQSxDQUhEO0tBUEE7V0FZQSxLQWRZO0VBQUEsQ0E3RWIsQ0FBQTs7QUFBQSxvQkE2RkEsYUFBQSxHQUFnQixTQUFDLE9BQUQsR0FBQTtBQUVmLElBQUEsSUFBQyxDQUFBLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBbEIsQ0FBMEIsR0FBRyxDQUFDLHFCQUE5QixFQUFxRCxPQUFPLENBQUMsR0FBN0QsQ0FBQSxDQUFBO1dBRUEsS0FKZTtFQUFBLENBN0ZoQixDQUFBOztBQUFBLG9CQW1HQSxlQUFBLEdBQWtCLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTtBQUVqQixJQUFBLElBQUMsQ0FBQSxhQUFELEdBQWlCLENBQUMsQ0FBQyxRQUFGLENBQUEsQ0FBakIsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFBLElBQVMsRUFBWjtBQUNDLE1BQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUEzQixDQUFtQyxJQUFJLENBQUMsS0FBeEMsRUFBK0MsRUFBRSxDQUFDLEtBQWxELENBQUEsQ0FBQTtBQUFBLE1BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFELENBQTFCLENBQThCLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFBLEdBQUE7aUJBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFWLENBQWUsU0FBQSxHQUFBO21CQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBUixDQUFhLFNBQUEsR0FBQTtxQkFBRyxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQTNCLENBQStCLFNBQUEsR0FBQTt1QkFBRyxLQUFDLENBQUEsYUFBYSxDQUFDLE9BQWYsQ0FBQSxFQUFIO2NBQUEsQ0FBL0IsRUFBSDtZQUFBLENBQWIsRUFBSDtVQUFBLENBQWYsRUFBSDtRQUFBLEVBQUE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCLENBREEsQ0FERDtLQUFBLE1BR0ssSUFBRyxJQUFIO0FBQ0osTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQVYsQ0FBZSxJQUFDLENBQUEsYUFBYSxDQUFDLE9BQTlCLENBQUEsQ0FESTtLQUFBLE1BRUEsSUFBRyxFQUFIO0FBQ0osTUFBQSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQVIsQ0FBYSxJQUFDLENBQUEsYUFBYSxDQUFDLE9BQTVCLENBQUEsQ0FESTtLQVBMO1dBVUEsS0FaaUI7RUFBQSxDQW5HbEIsQ0FBQTs7aUJBQUE7O0dBRnFCLGFBUHRCLENBQUE7O0FBQUEsTUEwSE0sQ0FBQyxPQUFQLEdBQWlCLE9BMUhqQixDQUFBOzs7OztBQ0FBLElBQUEsb0NBQUE7RUFBQTtpU0FBQTs7QUFBQSxnQkFBQSxHQUFtQixPQUFBLENBQVEscUJBQVIsQ0FBbkIsQ0FBQTs7QUFBQTtBQUlDLHVDQUFBLENBQUE7O0FBQUEsK0JBQUEsUUFBQSxHQUFXLGlCQUFYLENBQUE7O0FBRWMsRUFBQSw0QkFBQSxHQUFBO0FBRWIsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUNDO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsaUJBQWpCLENBQVA7S0FERCxDQUFBO0FBR0E7QUFBQTs7Ozs7T0FIQTtBQUFBLElBV0Esa0RBQUEsQ0FYQSxDQUFBO0FBYUE7QUFBQTs7Ozs7O09BYkE7QUFzQkEsV0FBTyxJQUFQLENBeEJhO0VBQUEsQ0FGZDs7NEJBQUE7O0dBRmdDLGlCQUZqQyxDQUFBOztBQUFBLE1BZ0NNLENBQUMsT0FBUCxHQUFpQixrQkFoQ2pCLENBQUE7Ozs7O0FDQUEsSUFBQSxnQ0FBQTtFQUFBOztpU0FBQTs7QUFBQSxnQkFBQSxHQUFtQixPQUFBLENBQVEscUJBQVIsQ0FBbkIsQ0FBQTs7QUFBQTtBQUlDLG1DQUFBLENBQUE7O0FBQUEsMkJBQUEsUUFBQSxHQUFXLGFBQVgsQ0FBQTs7QUFBQSwyQkFDQSxLQUFBLEdBQVcsSUFEWCxDQUFBOztBQUdjLEVBQUEsd0JBQUEsR0FBQTtBQUViLGlEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUNDO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsYUFBakIsQ0FBUDtLQURELENBQUE7QUFHQTtBQUFBOzs7OztPQUhBO0FBQUEsSUFXQSw4Q0FBQSxDQVhBLENBQUE7QUFhQTtBQUFBOzs7Ozs7T0FiQTtBQXNCQSxXQUFPLElBQVAsQ0F4QmE7RUFBQSxDQUhkOztBQUFBLDJCQTZCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsS0FBRCxHQUFTLElBQUMsQ0FBQSxTQUFELENBQUEsQ0FBVCxDQUFBO0FBQUEsSUFFQSwwQ0FBQSxTQUFBLENBRkEsQ0FBQTtXQUlBLEtBTk07RUFBQSxDQTdCUCxDQUFBOztBQUFBLDJCQXFDQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVgsUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUF0QixDQUFzQyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQWxCLEdBQXNCLEdBQXRCLEdBQTBCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBbEYsQ0FBVCxDQUFBO1dBRUEsT0FKVztFQUFBLENBckNaLENBQUE7O3dCQUFBOztHQUY0QixpQkFGN0IsQ0FBQTs7QUFBQSxNQStDTSxDQUFDLE9BQVAsR0FBaUIsY0EvQ2pCLENBQUE7Ozs7O0FDQUEsSUFBQSxnREFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQXVCLE9BQUEsQ0FBUSxpQkFBUixDQUF2QixDQUFBOztBQUFBLG9CQUNBLEdBQXVCLE9BQUEsQ0FBUSxrQ0FBUixDQUR2QixDQUFBOztBQUFBO0FBS0MsaUNBQUEsQ0FBQTs7QUFBQSx5QkFBQSxRQUFBLEdBQVcsZ0JBQVgsQ0FBQTs7QUFFYyxFQUFBLHNCQUFFLEtBQUYsRUFBVSxrQkFBVixHQUFBO0FBRWIsSUFGYyxJQUFDLENBQUEsUUFBQSxLQUVmLENBQUE7QUFBQSxJQUZzQixJQUFDLENBQUEscUJBQUEsa0JBRXZCLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQixDQUFDLENBQUMsTUFBRixDQUFTLEVBQVQsRUFBYSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsQ0FBQSxDQUFiLENBQWhCLENBQUE7QUFBQSxJQUVBLCtDQUFBLFNBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTmE7RUFBQSxDQUZkOztBQUFBLHlCQVVBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsK0JBQVYsQ0FBZixDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsV0FBRCxHQUFlLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLHdCQUFWLENBRGYsQ0FBQTtXQUdBLEtBTE07RUFBQSxDQVZQLENBQUE7O0FBQUEseUJBaUJBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsSUFBQyxDQUFBLEdBQUksQ0FBQSxPQUFBLENBQUwsQ0FBYyxXQUFkLEVBQTJCLElBQUMsQ0FBQSxXQUE1QixDQUFBLENBQUE7V0FFQSxLQUpjO0VBQUEsQ0FqQmYsQ0FBQTs7QUFBQSx5QkF1QkEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVOLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsV0FBZCxDQUFBLENBQUE7QUFBQSxJQUVBLG9CQUFvQixDQUFDLEVBQXJCLENBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBeEIsRUFBbUQsSUFBQyxDQUFBLFdBQXBELEVBQWlFLE1BQWpFLENBRkEsQ0FBQTtBQUFBLElBR0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUF4QixFQUE0QyxJQUFDLENBQUEsV0FBN0MsRUFBMEQsTUFBMUQsQ0FIQSxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQsQ0FMQSxDQUFBO1dBT0EsS0FUTTtFQUFBLENBdkJQLENBQUE7O0FBQUEseUJBa0NBLFdBQUEsR0FBYyxTQUFBLEdBQUE7QUFFYixJQUFBLG9CQUFvQixDQUFDLEVBQXJCLENBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBeEIsRUFBbUQsSUFBQyxDQUFBLFdBQXBELEVBQWlFLE1BQWpFLENBQUEsQ0FBQTtBQUFBLElBQ0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUF4QixFQUE0QyxJQUFDLENBQUEsV0FBN0MsRUFBMEQsTUFBMUQsQ0FEQSxDQUFBO1dBR0EsS0FMYTtFQUFBLENBbENkLENBQUE7O3NCQUFBOztHQUYwQixhQUgzQixDQUFBOztBQUFBLE1BOENNLENBQUMsT0FBUCxHQUFpQixZQTlDakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHdDQUFBO0VBQUE7O2lTQUFBOztBQUFBLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUFuQixDQUFBOztBQUFBLFlBQ0EsR0FBbUIsT0FBQSxDQUFRLGdCQUFSLENBRG5CLENBQUE7O0FBQUE7QUFPQyw2QkFBQSxDQUFBOztBQUFBLEVBQUEsUUFBQyxDQUFBLGtCQUFELEdBQXNCLEtBQXRCLENBQUE7O0FBQUEsRUFDQSxRQUFDLENBQUEsU0FBRCxHQUFhLEVBRGIsQ0FBQTs7QUFBQSxFQUVBLFFBQUMsQ0FBQSxJQUFELEdBQ0M7QUFBQSxJQUFBLElBQUEsRUFBWTtBQUFBLE1BQUEsQ0FBQSxFQUFHLEdBQUg7QUFBQSxNQUFRLENBQUEsRUFBRyxHQUFYO0FBQUEsTUFBZ0IsTUFBQSxFQUFRLEVBQXhCO0FBQUEsTUFBNEIsQ0FBQSxFQUFHLENBQS9CO0tBQVo7QUFBQSxJQUNBLFNBQUEsRUFBWTtBQUFBLE1BQUEsQ0FBQSxFQUFHLENBQUg7QUFBQSxNQUFNLENBQUEsRUFBRyxDQUFUO0FBQUEsTUFBWSxDQUFBLEVBQUcsQ0FBZjtLQURaO0dBSEQsQ0FBQTs7QUFBQSxFQUtBLFFBQUMsQ0FBQSxRQUFELEdBQVksQ0FMWixDQUFBOztBQUFBLEVBTUEsUUFBQyxDQUFBLGNBQUQsR0FBa0IsQ0FObEIsQ0FBQTs7QUFBQSxFQVFBLFFBQUMsQ0FBQSxrQkFBRCxHQUFzQixHQVJ0QixDQUFBOztBQUFBLHFCQVVBLFFBQUEsR0FBZ0IsV0FWaEIsQ0FBQTs7QUFBQSxxQkFXQSxhQUFBLEdBQWdCLGtCQVhoQixDQUFBOztBQUFBLHFCQWFBLFVBQUEsR0FBYSxJQWJiLENBQUE7O0FBZWMsRUFBQSxrQkFBQSxHQUFBO0FBRWIseURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSx1RkFBQSxDQUFBO0FBQUEsaURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxpREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQUQsR0FDQztBQUFBLE1BQUEsSUFBQSxFQUFPLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLFdBQWpCLENBQVA7S0FERCxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsVUFBRCxHQUFjLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUg1QixDQUFBO0FBQUEsSUFLQSx3Q0FBQSxDQUxBLENBQUE7QUFPQSxXQUFPLElBQVAsQ0FUYTtFQUFBLENBZmQ7O0FBQUEscUJBMEJBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxLQUFELEdBQVMsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsa0JBQVYsQ0FBVCxDQUFBO1dBRUEsS0FKTTtFQUFBLENBMUJQLENBQUE7O0FBQUEscUJBZ0NBLFNBQUEsR0FBWSxTQUFBLEdBQUE7QUFFWCxRQUFBLFNBQUE7QUFBQSxJQUFBLFNBQUEsR0FBWSxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVAsQ0FBQSxDQUFaLENBQUE7QUFBQSxJQUVBLFFBQVEsQ0FBQyxRQUFULEdBQW9CLElBQUksQ0FBQyxLQUFMLENBQVcsU0FBQSxHQUFZLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQTFDLENBRnBCLENBQUE7QUFBQSxJQUlBLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBZCxHQUNDO0FBQUEsTUFBQSxDQUFBLEVBQUcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUF0QjtBQUFBLE1BQXlCLENBQUEsRUFBRyxTQUE1QjtBQUFBLE1BQXVDLENBQUEsRUFBSSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQW5CLEdBQXVCLFNBQWxFO0tBTEQsQ0FBQTtBQUFBLElBT0EsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBbkIsR0FBdUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBbkIsR0FBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFuQixHQUF1QixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBbkIsR0FBNEIsQ0FBQyxRQUFRLENBQUMsUUFBVCxHQUFvQixDQUFyQixDQUE3QixDQUFBLEdBQXdELFFBQVEsQ0FBQyxRQUFsRSxDQUF4QixDQVA5QyxDQUFBO1dBU0EsS0FYVztFQUFBLENBaENaLENBQUE7O0FBQUEscUJBNkNBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBUSxDQUFBLE9BQUEsQ0FBZCxDQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsdUJBQXJDLEVBQThELElBQUMsQ0FBQSxRQUEvRCxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQVEsQ0FBQSxPQUFBLENBQWQsQ0FBdUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLGVBQXJDLEVBQXNELElBQUMsQ0FBQSxRQUF2RCxDQURBLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0E3Q2YsQ0FBQTs7QUFBQSxxQkFvREEsUUFBQSxHQUFXLFNBQUEsR0FBQTtBQUVWLElBQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FEQSxDQUFBO1dBR0EsS0FMVTtFQUFBLENBcERYLENBQUE7O0FBQUEscUJBMkRBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFVixRQUFBLFdBQUE7QUFBQSxJQUFBLFFBQVEsQ0FBQyxjQUFULEdBQTBCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUF4QyxDQUFBO0FBQUEsSUFFQSxXQUFBLEdBQWMsSUFBQyxDQUFBLDRCQUFELENBQUEsQ0FGZCxDQUFBO0FBR0EsSUFBQSxJQUFHLFdBQUEsR0FBYyxDQUFqQjtBQUF3QixNQUFBLElBQUMsQ0FBQSxVQUFELENBQVksV0FBWixDQUFBLENBQXhCO0tBSEE7V0FLQSxLQVBVO0VBQUEsQ0EzRFgsQ0FBQTs7QUFBQSxxQkFvRUEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVOLElBQUEsb0NBQUEsU0FBQSxDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0FwRVAsQ0FBQTs7QUFBQSxxQkEwRUEsU0FBQSxHQUFZLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFBLENBQUE7QUFFQSxJQUFBLElBQUcsQ0FBQSxRQUFTLENBQUMsa0JBQWI7QUFDQyxNQUFBLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLDRCQUFELENBQUEsQ0FBWixFQUE2QyxJQUE3QyxDQUFBLENBQUE7QUFBQSxNQUNBLFFBQVEsQ0FBQyxrQkFBVCxHQUE4QixJQUQ5QixDQUREO0tBQUEsTUFBQTtBQUlDLE1BQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUF0QixDQUFnQyxRQUFRLENBQUMsY0FBekMsQ0FBQSxDQUpEO0tBRkE7V0FRQSxLQVZXO0VBQUEsQ0ExRVosQ0FBQTs7QUFBQSxxQkFzRkEsNEJBQUEsR0FBK0IsU0FBQSxHQUFBO0FBRTlCLFFBQUEsa0NBQUE7QUFBQSxJQUFBLFNBQUEsR0FBYSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUF4QixHQUE0QixDQUFDLFFBQVEsQ0FBQyxjQUFULEdBQTBCLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQW5ELENBQXpDLENBQUE7QUFBQSxJQUNBLFVBQUEsR0FBYSxDQUFDLFNBQUEsR0FBWSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFoQyxDQUFBLEdBQXFDLFFBQVEsQ0FBQyxRQUQzRCxDQUFBO0FBQUEsSUFHQSxXQUFBLEdBQWMsSUFBSSxDQUFDLEtBQUwsQ0FBVyxVQUFYLENBQUEsR0FBeUIsUUFBUSxDQUFDLFFBSGhELENBQUE7QUFBQSxJQUlBLFdBQUEsR0FBaUIsQ0FBQyxVQUFBLEdBQWEsQ0FBZCxDQUFBLEdBQW1CLFFBQVEsQ0FBQyxrQkFBL0IsR0FBdUQsV0FBQSxHQUFjLFFBQVEsQ0FBQyxRQUE5RSxHQUE0RixXQUoxRyxDQUFBO0FBTUEsV0FBTyxXQUFBLEdBQWMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUF4QyxDQVI4QjtFQUFBLENBdEYvQixDQUFBOztBQUFBLHFCQWdHQSxVQUFBLEdBQWEsU0FBQyxLQUFELEVBQVEsa0JBQVIsR0FBQTtBQUVaLFFBQUEsc0RBQUE7O01BRm9CLHFCQUFtQjtLQUV2QztBQUFBLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBYSxxQkFBQSxHQUFxQixLQUFsQyxDQUFBLENBQUE7QUFBQSxJQUVBLFFBQUEsR0FBVyxFQUZYLENBQUE7QUFJQSxTQUFXLGtLQUFYLEdBQUE7QUFFQyxNQUFBLE1BQUEsR0FBUyxJQUFDLENBQUEsVUFBVSxDQUFDLEVBQVosQ0FBZSxHQUFmLENBQVQsQ0FBQTtBQUNBLE1BQUEsSUFBUyxDQUFBLE1BQVQ7QUFBQSxjQUFBO09BREE7QUFBQSxNQUdBLFFBQVEsQ0FBQyxJQUFULENBQWtCLElBQUEsWUFBQSxDQUFhLE1BQWIsRUFBcUIsa0JBQXJCLENBQWxCLENBSEEsQ0FGRDtBQUFBLEtBSkE7QUFBQSxJQVdBLFFBQVEsQ0FBQyxTQUFULEdBQXFCLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBbkIsQ0FBMEIsUUFBMUIsQ0FYckIsQ0FBQTtBQWFBLFNBQUEsMkRBQUE7MkJBQUE7QUFFQyxNQUFBLElBQUMsQ0FBQSxRQUFELENBQVUsSUFBVixDQUFBLENBQUE7QUFBQSxNQUNBLElBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixHQUFyQixFQUEwQixrQkFBMUIsQ0FEQSxDQUZEO0FBQUEsS0FiQTtXQWtCQSxLQXBCWTtFQUFBLENBaEdiLENBQUE7O0FBQUEscUJBc0hBLGFBQUEsR0FBZ0IsU0FBQyxJQUFELEVBQU8sS0FBUCxFQUFjLGtCQUFkLEdBQUE7QUFFZixRQUFBLDhCQUFBOztNQUY2QixxQkFBbUI7S0FFaEQ7QUFBQSxJQUFBLFFBQUEsR0FBYSxHQUFiLENBQUE7QUFBQSxJQUNBLFVBQUEsR0FBYTtBQUFBLE1BQUEsQ0FBQSxFQUFJLENBQUksa0JBQUgsR0FBMkIsTUFBTSxDQUFDLFdBQWxDLEdBQW1ELENBQXBELENBQUo7QUFBQSxNQUE0RCxPQUFBLEVBQVUsQ0FBdEU7QUFBQSxNQUF5RSxLQUFBLEVBQVEsR0FBakY7S0FEYixDQUFBO0FBQUEsSUFFQSxRQUFBLEdBQWE7QUFBQSxNQUFBLEtBQUEsRUFBUSxDQUFDLFFBQUEsR0FBVyxHQUFaLENBQUEsR0FBbUIsS0FBM0I7QUFBQSxNQUFrQyxDQUFBLEVBQUksQ0FBdEM7QUFBQSxNQUF5QyxPQUFBLEVBQVUsQ0FBbkQ7QUFBQSxNQUFzRCxLQUFBLEVBQVEsQ0FBOUQ7QUFBQSxNQUFrRSxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQTlFO0FBQUEsTUFBdUYsVUFBQSxFQUFhLElBQUksQ0FBQyxJQUF6RztLQUZiLENBQUE7QUFBQSxJQUlBLFNBQVMsQ0FBQyxNQUFWLENBQWlCLElBQUksQ0FBQyxHQUF0QixFQUEyQixRQUEzQixFQUFxQyxVQUFyQyxFQUFpRCxRQUFqRCxDQUpBLENBQUE7V0FNQSxLQVJlO0VBQUEsQ0F0SGhCLENBQUE7O2tCQUFBOztHQUpzQixpQkFIdkIsQ0FBQTs7QUFBQSxNQXVJTSxDQUFDLE9BQVAsR0FBaUIsUUF2SWpCLENBQUE7Ozs7O0FDQUEsSUFBQSwyQkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSLENBQWYsQ0FBQTs7QUFBQTtBQUlDLGtDQUFBLENBQUE7O0FBQUEsMEJBQUEsT0FBQSxHQUFVLElBQVYsQ0FBQTs7QUFFQTtBQUFBLHNDQUZBOztBQUFBLDBCQUdBLElBQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsMEJBSUEsUUFBQSxHQUFXLElBSlgsQ0FBQTs7QUFNYyxFQUFBLHVCQUFBLEdBQUE7QUFFYixtREFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLGlEQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLDZDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsT0FBRCxHQUFXLENBQUEsQ0FBRSxNQUFGLENBQVgsQ0FBQTtBQUFBLElBRUEsNkNBQUEsQ0FGQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsUUFBZCxDQUF1QixJQUF2QixDQUpBLENBQUE7QUFBQSxJQUtBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxDQUxBLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxTQUFELENBQUEsQ0FOQSxDQUFBO0FBUUEsV0FBTyxJQUFQLENBVmE7RUFBQSxDQU5kOztBQUFBLDBCQWtCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFZLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFBRyxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsTUFBZCxDQUFxQixLQUFyQixFQUFIO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWixDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0FsQlAsQ0FBQTs7QUFBQSwwQkF3QkEsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxLQUFkLENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFPLENBQUEsSUFBQyxDQUFBLElBQUQsQ0FBTSxDQUFDLElBQXpDLEdBQWdELElBRGhELENBQUE7V0FHQSxLQUxTO0VBQUEsQ0F4QlYsQ0FBQTs7QUFBQSwwQkErQkEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRWQsSUFBQSxJQUFDLENBQUEsT0FBUSxDQUFBLE9BQUEsQ0FBVCxDQUFrQixPQUFsQixFQUEyQixJQUFDLENBQUEsT0FBNUIsQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsQ0FBRCxDQUFHLGNBQUgsQ0FBbUIsQ0FBQSxPQUFBLENBQW5CLENBQTRCLE9BQTVCLEVBQXFDLElBQUMsQ0FBQSxVQUF0QyxDQURBLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0EvQmYsQ0FBQTs7QUFBQSwwQkFzQ0EsT0FBQSxHQUFVLFNBQUMsQ0FBRCxHQUFBO0FBRVQsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLEtBQWEsRUFBaEI7QUFBd0IsTUFBQSxJQUFDLENBQUEsSUFBRCxDQUFBLENBQUEsQ0FBeEI7S0FBQTtXQUVBLEtBSlM7RUFBQSxDQXRDVixDQUFBOztBQUFBLDBCQTRDQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVgsSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFkLEVBQW1CLEdBQW5CLEVBQXdCO0FBQUEsTUFBRSxZQUFBLEVBQWMsU0FBaEI7QUFBQSxNQUEyQixTQUFBLEVBQVcsQ0FBdEM7QUFBQSxNQUF5QyxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQXJEO0tBQXhCLENBQUEsQ0FBQTtBQUFBLElBQ0EsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxRQUFWLENBQWIsRUFBa0MsR0FBbEMsRUFBdUM7QUFBQSxNQUFFLEtBQUEsRUFBUSxJQUFWO0FBQUEsTUFBZ0IsV0FBQSxFQUFhLFVBQTdCO0FBQUEsTUFBeUMsWUFBQSxFQUFjLFNBQXZEO0FBQUEsTUFBa0UsU0FBQSxFQUFXLENBQTdFO0FBQUEsTUFBZ0YsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUE1RjtLQUF2QyxDQURBLENBQUE7V0FHQSxLQUxXO0VBQUEsQ0E1Q1osQ0FBQTs7QUFBQSwwQkFtREEsVUFBQSxHQUFhLFNBQUMsUUFBRCxHQUFBO0FBRVosSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFkLEVBQW1CLEdBQW5CLEVBQXdCO0FBQUEsTUFBRSxLQUFBLEVBQVEsSUFBVjtBQUFBLE1BQWdCLFNBQUEsRUFBVyxDQUEzQjtBQUFBLE1BQThCLElBQUEsRUFBTyxJQUFJLENBQUMsT0FBMUM7QUFBQSxNQUFtRCxVQUFBLEVBQVksUUFBL0Q7S0FBeEIsQ0FBQSxDQUFBO0FBQUEsSUFDQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFFBQVYsQ0FBYixFQUFrQyxHQUFsQyxFQUF1QztBQUFBLE1BQUUsV0FBQSxFQUFhLFlBQWY7QUFBQSxNQUE2QixTQUFBLEVBQVcsQ0FBeEM7QUFBQSxNQUEyQyxJQUFBLEVBQU8sSUFBSSxDQUFDLE1BQXZEO0tBQXZDLENBREEsQ0FBQTtXQUdBLEtBTFk7RUFBQSxDQW5EYixDQUFBOztBQUFBLDBCQTBEQSxVQUFBLEdBQVksU0FBRSxDQUFGLEdBQUE7QUFFWCxJQUFBLENBQUMsQ0FBQyxjQUFGLENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsSUFBRCxDQUFBLENBRkEsQ0FBQTtXQUlBLEtBTlc7RUFBQSxDQTFEWixDQUFBOzt1QkFBQTs7R0FGMkIsYUFGNUIsQ0FBQTs7QUFBQSxNQXNFTSxDQUFDLE9BQVAsR0FBaUIsYUF0RWpCLENBQUE7Ozs7O0FDQUEsSUFBQSwrQkFBQTtFQUFBOztpU0FBQTs7QUFBQSxhQUFBLEdBQWdCLE9BQUEsQ0FBUSxpQkFBUixDQUFoQixDQUFBOztBQUFBO0FBSUMscUNBQUEsQ0FBQTs7QUFBQSw2QkFBQSxJQUFBLEdBQVcsa0JBQVgsQ0FBQTs7QUFBQSw2QkFDQSxRQUFBLEdBQVcsbUJBRFgsQ0FBQTs7QUFBQSw2QkFHQSxFQUFBLEdBQVcsSUFIWCxDQUFBOztBQUtjLEVBQUEsMEJBQUUsRUFBRixHQUFBO0FBRWIsSUFGYyxJQUFDLENBQUEsS0FBQSxFQUVmLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQjtBQUFBLE1BQUUsTUFBRCxJQUFDLENBQUEsSUFBRjtLQUFoQixDQUFBO0FBQUEsSUFFQSxnREFBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOYTtFQUFBLENBTGQ7O0FBQUEsNkJBYUEsSUFBQSxHQUFPLFNBQUEsR0FBQTtXQUVOLEtBRk07RUFBQSxDQWJQLENBQUE7O0FBQUEsNkJBaUJBLElBQUEsR0FBTyxTQUFDLGNBQUQsR0FBQTs7TUFBQyxpQkFBZTtLQUV0QjtBQUFBLElBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBWSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO0FBQ1gsUUFBQSxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsTUFBZCxDQUFxQixLQUFyQixDQUFBLENBQUE7QUFDQSxRQUFBLElBQUcsQ0FBQSxjQUFIO2tEQUF3QixLQUFDLENBQUEsY0FBekI7U0FGVztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVosQ0FBQSxDQUFBO1dBSUEsS0FOTTtFQUFBLENBakJQLENBQUE7O0FBQUEsNkJBeUJBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsb0RBQUEsU0FBQSxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQVEsQ0FBQSxPQUFBLENBQWQsQ0FBdUIsWUFBdkIsRUFBcUMsSUFBQyxDQUFBLFlBQXRDLENBRkEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLEdBQUksQ0FBQSxPQUFBLENBQUwsQ0FBYyxnQkFBZCxFQUFnQyxJQUFDLENBQUEsSUFBakMsQ0FIQSxDQUFBO1dBS0EsS0FQYztFQUFBLENBekJmLENBQUE7O0FBQUEsNkJBa0NBLFlBQUEsR0FBZSxTQUFDLElBQUQsR0FBQTtBQUVkLElBQUEsSUFBRyxJQUFJLENBQUMsQ0FBTCxLQUFVLFVBQWI7QUFBNkIsTUFBQSxJQUFDLENBQUEsSUFBRCxDQUFNLEtBQU4sQ0FBQSxDQUE3QjtLQUFBO1dBRUEsS0FKYztFQUFBLENBbENmLENBQUE7OzBCQUFBOztHQUY4QixjQUYvQixDQUFBOztBQUFBLE1BNENNLENBQUMsT0FBUCxHQUFpQixnQkE1Q2pCLENBQUE7Ozs7O0FDQUEsSUFBQSw0Q0FBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQW1CLE9BQUEsQ0FBUSxpQkFBUixDQUFuQixDQUFBOztBQUFBLGdCQUNBLEdBQW1CLE9BQUEsQ0FBUSxvQkFBUixDQURuQixDQUFBOztBQUFBO0FBTUMsaUNBQUEsQ0FBQTs7QUFBQSx5QkFBQSxNQUFBLEdBQ0M7QUFBQSxJQUFBLGdCQUFBLEVBQW1CO0FBQUEsTUFBQSxRQUFBLEVBQVcsZ0JBQVg7QUFBQSxNQUE2QixJQUFBLEVBQU8sSUFBcEM7S0FBbkI7R0FERCxDQUFBOztBQUdjLEVBQUEsc0JBQUEsR0FBQTtBQUViLGlEQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsMkNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSxJQUFBLDRDQUFBLENBQUEsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUphO0VBQUEsQ0FIZDs7QUFBQSx5QkFTQSxJQUFBLEdBQU8sU0FBQSxHQUFBO1dBRU4sS0FGTTtFQUFBLENBVFAsQ0FBQTs7QUFBQSx5QkFhQSxNQUFBLEdBQVMsU0FBQSxHQUFBO0FBRVIsUUFBQSxpQkFBQTtBQUFBO0FBQUEsU0FBQSxZQUFBO3lCQUFBO0FBQUUsTUFBQSxJQUFHLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBakI7QUFBMkIsZUFBTyxJQUFQLENBQTNCO09BQUY7QUFBQSxLQUFBO1dBRUEsTUFKUTtFQUFBLENBYlQsQ0FBQTs7QUFBQSx5QkFtQkEsYUFBQSxHQUFnQixTQUFBLEdBQUE7QUFFZixRQUFBLDRCQUFBO0FBQUE7QUFBQSxTQUFBLFlBQUE7eUJBQUE7QUFBRSxNQUFBLElBQUcsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFqQjtBQUEyQixRQUFBLFNBQUEsR0FBWSxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQTFCLENBQTNCO09BQUY7QUFBQSxLQUFBOztNQUVBLFNBQVMsQ0FBRSxJQUFYLENBQUE7S0FGQTtXQUlBLEtBTmU7RUFBQSxDQW5CaEIsQ0FBQTs7QUFBQSx5QkEyQkEsU0FBQSxHQUFZLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTs7TUFBTyxLQUFHO0tBRXJCO0FBQUEsSUFBQSxJQUFVLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBeEI7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFkLEdBQXlCLElBQUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxRQUFkLENBQXVCLEVBQXZCLENBRnpCLENBQUE7V0FJQSxLQU5XO0VBQUEsQ0EzQlosQ0FBQTs7c0JBQUE7O0dBSDBCLGFBSDNCLENBQUE7O0FBQUEsTUF5Q00sQ0FBQyxPQUFQLEdBQWlCLFlBekNqQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcCA9IHJlcXVpcmUgJy4vQXBwJ1xuXG4jIFBST0RVQ1RJT04gRU5WSVJPTk1FTlQgLSBtYXkgd2FudCB0byB1c2Ugc2VydmVyLXNldCB2YXJpYWJsZXMgaGVyZVxuIyBJU19MSVZFID0gZG8gLT4gcmV0dXJuIGlmIHdpbmRvdy5sb2NhdGlvbi5ob3N0LmluZGV4T2YoJ2xvY2FsaG9zdCcpID4gLTEgb3Igd2luZG93LmxvY2F0aW9uLnNlYXJjaCBpcyAnP2QnIHRoZW4gZmFsc2UgZWxzZSB0cnVlXG5cbiMjI1xuXG5XSVAgLSB0aGlzIHdpbGwgaWRlYWxseSBjaGFuZ2UgdG8gb2xkIGZvcm1hdCAoYWJvdmUpIHdoZW4gY2FuIGZpZ3VyZSBpdCBvdXRcblxuIyMjXG5cbklTX0xJVkUgPSBmYWxzZVxuXG4jIE9OTFkgRVhQT1NFIEFQUCBHTE9CQUxMWSBJRiBMT0NBTCBPUiBERVYnSU5HXG52aWV3ID0gaWYgSVNfTElWRSB0aGVuIHt9IGVsc2UgKHdpbmRvdyBvciBkb2N1bWVudClcblxuIyBERUNMQVJFIE1BSU4gQVBQTElDQVRJT05cbnZpZXcuQ0QgPSBuZXcgQXBwIElTX0xJVkVcbnZpZXcuQ0QuaW5pdCgpXG4iLCIvKiEgaHR0cDovL210aHMuYmUvcHVueWNvZGUgdjEuMi40IGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGVzICovXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHRtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cyAmJiBtb2R1bGU7XG5cdHZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG5cdGlmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCkge1xuXHRcdHJvb3QgPSBmcmVlR2xvYmFsO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBgcHVueWNvZGVgIG9iamVjdC5cblx0ICogQG5hbWUgcHVueWNvZGVcblx0ICogQHR5cGUgT2JqZWN0XG5cdCAqL1xuXHR2YXIgcHVueWNvZGUsXG5cblx0LyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXHRtYXhJbnQgPSAyMTQ3NDgzNjQ3LCAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cblx0LyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xuXHRiYXNlID0gMzYsXG5cdHRNaW4gPSAxLFxuXHR0TWF4ID0gMjYsXG5cdHNrZXcgPSAzOCxcblx0ZGFtcCA9IDcwMCxcblx0aW5pdGlhbEJpYXMgPSA3Mixcblx0aW5pdGlhbE4gPSAxMjgsIC8vIDB4ODBcblx0ZGVsaW1pdGVyID0gJy0nLCAvLyAnXFx4MkQnXG5cblx0LyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cblx0cmVnZXhQdW55Y29kZSA9IC9eeG4tLS8sXG5cdHJlZ2V4Tm9uQVNDSUkgPSAvW14gLX5dLywgLy8gdW5wcmludGFibGUgQVNDSUkgY2hhcnMgKyBub24tQVNDSUkgY2hhcnNcblx0cmVnZXhTZXBhcmF0b3JzID0gL1xceDJFfFxcdTMwMDJ8XFx1RkYwRXxcXHVGRjYxL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdFx0YXJyYXlbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHRcdH1cblx0XHRyZXR1cm4gYXJyYXk7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZS5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHJldHVybiBtYXAoc3RyaW5nLnNwbGl0KHJlZ2V4U2VwYXJhdG9ycyksIGZuKS5qb2luKCcuJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBkZWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cblx0ICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGNvdW50ZXIgPSAwLFxuXHRcdCAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuXHRcdCAgICB2YWx1ZSxcblx0XHQgICAgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGVuY29kZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0cmV0dXJuIG1hcChhcnJheSwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHZhciBvdXRwdXQgPSAnJztcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cblx0ICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcblx0ICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdFx0aWYgKGNvZGVQb2ludCAtIDQ4IDwgMTApIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSAyMjtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDY1IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA2NTtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDk3IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA5Nztcblx0XHR9XG5cdFx0cmV0dXJuIGJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3Jcblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2Vcblx0ICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG5cdCAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG5cdCAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG5cdCAqL1xuXHRmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0XHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHRcdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRcdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG5cdH1cblxuXHQvKipcblx0ICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cblx0ICogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdFx0dmFyIGsgPSAwO1xuXHRcdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdFx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRcdGZvciAoLyogbm8gaW5pdGlhbGl6YXRpb24gKi87IGRlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdFx0fVxuXHRcdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHRcdC8vIERvbid0IHVzZSBVQ1MtMlxuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdFx0ICAgIG91dCxcblx0XHQgICAgaSA9IDAsXG5cdFx0ICAgIG4gPSBpbml0aWFsTixcblx0XHQgICAgYmlhcyA9IGluaXRpYWxCaWFzLFxuXHRcdCAgICBiYXNpYyxcblx0XHQgICAgaixcblx0XHQgICAgaW5kZXgsXG5cdFx0ICAgIG9sZGksXG5cdFx0ICAgIHcsXG5cdFx0ICAgIGssXG5cdFx0ICAgIGRpZ2l0LFxuXHRcdCAgICB0LFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgdG8gYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gVW5pY29kZS4gT25seSB0aGVcblx0ICogUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29udmVydGVkIHRvXG5cdCAqIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBQdW55Y29kZSBkb21haW4gbmFtZSB0byBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFB1bnljb2RlLiBPbmx5IHRoZVxuXHQgKiBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW4gQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSB0byBjb252ZXJ0LCBhcyBhIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMi40Jyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZSgncHVueWNvZGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fSBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiAhZnJlZUV4cG9ydHMubm9kZVR5cGUpIHtcblx0XHRpZiAoZnJlZU1vZHVsZSkgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHsgLy8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG4iLCJ2YXIgcHVueWNvZGUgPSByZXF1aXJlKCdwdW55Y29kZScpO1xudmFyIHJldkVudGl0aWVzID0gcmVxdWlyZSgnLi9yZXZlcnNlZC5qc29uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZW5jb2RlO1xuXG5mdW5jdGlvbiBlbmNvZGUgKHN0ciwgb3B0cykge1xuICAgIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhIFN0cmluZycpO1xuICAgIH1cbiAgICBpZiAoIW9wdHMpIG9wdHMgPSB7fTtcblxuICAgIHZhciBudW1lcmljID0gdHJ1ZTtcbiAgICBpZiAob3B0cy5uYW1lZCkgbnVtZXJpYyA9IGZhbHNlO1xuICAgIGlmIChvcHRzLm51bWVyaWMgIT09IHVuZGVmaW5lZCkgbnVtZXJpYyA9IG9wdHMubnVtZXJpYztcblxuICAgIHZhciBzcGVjaWFsID0gb3B0cy5zcGVjaWFsIHx8IHtcbiAgICAgICAgJ1wiJzogdHJ1ZSwgXCInXCI6IHRydWUsXG4gICAgICAgICc8JzogdHJ1ZSwgJz4nOiB0cnVlLFxuICAgICAgICAnJic6IHRydWVcbiAgICB9O1xuXG4gICAgdmFyIGNvZGVQb2ludHMgPSBwdW55Y29kZS51Y3MyLmRlY29kZShzdHIpO1xuICAgIHZhciBjaGFycyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29kZVBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2MgPSBjb2RlUG9pbnRzW2ldO1xuICAgICAgICB2YXIgYyA9IHB1bnljb2RlLnVjczIuZW5jb2RlKFsgY2MgXSk7XG4gICAgICAgIHZhciBlID0gcmV2RW50aXRpZXNbY2NdO1xuICAgICAgICBpZiAoZSAmJiAoY2MgPj0gMTI3IHx8IHNwZWNpYWxbY10pICYmICFudW1lcmljKSB7XG4gICAgICAgICAgICBjaGFycy5wdXNoKCcmJyArICgvOyQvLnRlc3QoZSkgPyBlIDogZSArICc7JykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNjIDwgMzIgfHwgY2MgPj0gMTI3IHx8IHNwZWNpYWxbY10pIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goJyYjJyArIGNjICsgJzsnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpO1xufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICAgIFwiOVwiOiBcIlRhYjtcIixcbiAgICBcIjEwXCI6IFwiTmV3TGluZTtcIixcbiAgICBcIjMzXCI6IFwiZXhjbDtcIixcbiAgICBcIjM0XCI6IFwicXVvdDtcIixcbiAgICBcIjM1XCI6IFwibnVtO1wiLFxuICAgIFwiMzZcIjogXCJkb2xsYXI7XCIsXG4gICAgXCIzN1wiOiBcInBlcmNudDtcIixcbiAgICBcIjM4XCI6IFwiYW1wO1wiLFxuICAgIFwiMzlcIjogXCJhcG9zO1wiLFxuICAgIFwiNDBcIjogXCJscGFyO1wiLFxuICAgIFwiNDFcIjogXCJycGFyO1wiLFxuICAgIFwiNDJcIjogXCJtaWRhc3Q7XCIsXG4gICAgXCI0M1wiOiBcInBsdXM7XCIsXG4gICAgXCI0NFwiOiBcImNvbW1hO1wiLFxuICAgIFwiNDZcIjogXCJwZXJpb2Q7XCIsXG4gICAgXCI0N1wiOiBcInNvbDtcIixcbiAgICBcIjU4XCI6IFwiY29sb247XCIsXG4gICAgXCI1OVwiOiBcInNlbWk7XCIsXG4gICAgXCI2MFwiOiBcImx0O1wiLFxuICAgIFwiNjFcIjogXCJlcXVhbHM7XCIsXG4gICAgXCI2MlwiOiBcImd0O1wiLFxuICAgIFwiNjNcIjogXCJxdWVzdDtcIixcbiAgICBcIjY0XCI6IFwiY29tbWF0O1wiLFxuICAgIFwiOTFcIjogXCJsc3FiO1wiLFxuICAgIFwiOTJcIjogXCJic29sO1wiLFxuICAgIFwiOTNcIjogXCJyc3FiO1wiLFxuICAgIFwiOTRcIjogXCJIYXQ7XCIsXG4gICAgXCI5NVwiOiBcIlVuZGVyQmFyO1wiLFxuICAgIFwiOTZcIjogXCJncmF2ZTtcIixcbiAgICBcIjEyM1wiOiBcImxjdWI7XCIsXG4gICAgXCIxMjRcIjogXCJWZXJ0aWNhbExpbmU7XCIsXG4gICAgXCIxMjVcIjogXCJyY3ViO1wiLFxuICAgIFwiMTYwXCI6IFwiTm9uQnJlYWtpbmdTcGFjZTtcIixcbiAgICBcIjE2MVwiOiBcImlleGNsO1wiLFxuICAgIFwiMTYyXCI6IFwiY2VudDtcIixcbiAgICBcIjE2M1wiOiBcInBvdW5kO1wiLFxuICAgIFwiMTY0XCI6IFwiY3VycmVuO1wiLFxuICAgIFwiMTY1XCI6IFwieWVuO1wiLFxuICAgIFwiMTY2XCI6IFwiYnJ2YmFyO1wiLFxuICAgIFwiMTY3XCI6IFwic2VjdDtcIixcbiAgICBcIjE2OFwiOiBcInVtbDtcIixcbiAgICBcIjE2OVwiOiBcImNvcHk7XCIsXG4gICAgXCIxNzBcIjogXCJvcmRmO1wiLFxuICAgIFwiMTcxXCI6IFwibGFxdW87XCIsXG4gICAgXCIxNzJcIjogXCJub3Q7XCIsXG4gICAgXCIxNzNcIjogXCJzaHk7XCIsXG4gICAgXCIxNzRcIjogXCJyZWc7XCIsXG4gICAgXCIxNzVcIjogXCJzdHJucztcIixcbiAgICBcIjE3NlwiOiBcImRlZztcIixcbiAgICBcIjE3N1wiOiBcInBtO1wiLFxuICAgIFwiMTc4XCI6IFwic3VwMjtcIixcbiAgICBcIjE3OVwiOiBcInN1cDM7XCIsXG4gICAgXCIxODBcIjogXCJEaWFjcml0aWNhbEFjdXRlO1wiLFxuICAgIFwiMTgxXCI6IFwibWljcm87XCIsXG4gICAgXCIxODJcIjogXCJwYXJhO1wiLFxuICAgIFwiMTgzXCI6IFwibWlkZG90O1wiLFxuICAgIFwiMTg0XCI6IFwiQ2VkaWxsYTtcIixcbiAgICBcIjE4NVwiOiBcInN1cDE7XCIsXG4gICAgXCIxODZcIjogXCJvcmRtO1wiLFxuICAgIFwiMTg3XCI6IFwicmFxdW87XCIsXG4gICAgXCIxODhcIjogXCJmcmFjMTQ7XCIsXG4gICAgXCIxODlcIjogXCJoYWxmO1wiLFxuICAgIFwiMTkwXCI6IFwiZnJhYzM0O1wiLFxuICAgIFwiMTkxXCI6IFwiaXF1ZXN0O1wiLFxuICAgIFwiMTkyXCI6IFwiQWdyYXZlO1wiLFxuICAgIFwiMTkzXCI6IFwiQWFjdXRlO1wiLFxuICAgIFwiMTk0XCI6IFwiQWNpcmM7XCIsXG4gICAgXCIxOTVcIjogXCJBdGlsZGU7XCIsXG4gICAgXCIxOTZcIjogXCJBdW1sO1wiLFxuICAgIFwiMTk3XCI6IFwiQXJpbmc7XCIsXG4gICAgXCIxOThcIjogXCJBRWxpZztcIixcbiAgICBcIjE5OVwiOiBcIkNjZWRpbDtcIixcbiAgICBcIjIwMFwiOiBcIkVncmF2ZTtcIixcbiAgICBcIjIwMVwiOiBcIkVhY3V0ZTtcIixcbiAgICBcIjIwMlwiOiBcIkVjaXJjO1wiLFxuICAgIFwiMjAzXCI6IFwiRXVtbDtcIixcbiAgICBcIjIwNFwiOiBcIklncmF2ZTtcIixcbiAgICBcIjIwNVwiOiBcIklhY3V0ZTtcIixcbiAgICBcIjIwNlwiOiBcIkljaXJjO1wiLFxuICAgIFwiMjA3XCI6IFwiSXVtbDtcIixcbiAgICBcIjIwOFwiOiBcIkVUSDtcIixcbiAgICBcIjIwOVwiOiBcIk50aWxkZTtcIixcbiAgICBcIjIxMFwiOiBcIk9ncmF2ZTtcIixcbiAgICBcIjIxMVwiOiBcIk9hY3V0ZTtcIixcbiAgICBcIjIxMlwiOiBcIk9jaXJjO1wiLFxuICAgIFwiMjEzXCI6IFwiT3RpbGRlO1wiLFxuICAgIFwiMjE0XCI6IFwiT3VtbDtcIixcbiAgICBcIjIxNVwiOiBcInRpbWVzO1wiLFxuICAgIFwiMjE2XCI6IFwiT3NsYXNoO1wiLFxuICAgIFwiMjE3XCI6IFwiVWdyYXZlO1wiLFxuICAgIFwiMjE4XCI6IFwiVWFjdXRlO1wiLFxuICAgIFwiMjE5XCI6IFwiVWNpcmM7XCIsXG4gICAgXCIyMjBcIjogXCJVdW1sO1wiLFxuICAgIFwiMjIxXCI6IFwiWWFjdXRlO1wiLFxuICAgIFwiMjIyXCI6IFwiVEhPUk47XCIsXG4gICAgXCIyMjNcIjogXCJzemxpZztcIixcbiAgICBcIjIyNFwiOiBcImFncmF2ZTtcIixcbiAgICBcIjIyNVwiOiBcImFhY3V0ZTtcIixcbiAgICBcIjIyNlwiOiBcImFjaXJjO1wiLFxuICAgIFwiMjI3XCI6IFwiYXRpbGRlO1wiLFxuICAgIFwiMjI4XCI6IFwiYXVtbDtcIixcbiAgICBcIjIyOVwiOiBcImFyaW5nO1wiLFxuICAgIFwiMjMwXCI6IFwiYWVsaWc7XCIsXG4gICAgXCIyMzFcIjogXCJjY2VkaWw7XCIsXG4gICAgXCIyMzJcIjogXCJlZ3JhdmU7XCIsXG4gICAgXCIyMzNcIjogXCJlYWN1dGU7XCIsXG4gICAgXCIyMzRcIjogXCJlY2lyYztcIixcbiAgICBcIjIzNVwiOiBcImV1bWw7XCIsXG4gICAgXCIyMzZcIjogXCJpZ3JhdmU7XCIsXG4gICAgXCIyMzdcIjogXCJpYWN1dGU7XCIsXG4gICAgXCIyMzhcIjogXCJpY2lyYztcIixcbiAgICBcIjIzOVwiOiBcIml1bWw7XCIsXG4gICAgXCIyNDBcIjogXCJldGg7XCIsXG4gICAgXCIyNDFcIjogXCJudGlsZGU7XCIsXG4gICAgXCIyNDJcIjogXCJvZ3JhdmU7XCIsXG4gICAgXCIyNDNcIjogXCJvYWN1dGU7XCIsXG4gICAgXCIyNDRcIjogXCJvY2lyYztcIixcbiAgICBcIjI0NVwiOiBcIm90aWxkZTtcIixcbiAgICBcIjI0NlwiOiBcIm91bWw7XCIsXG4gICAgXCIyNDdcIjogXCJkaXZpZGU7XCIsXG4gICAgXCIyNDhcIjogXCJvc2xhc2g7XCIsXG4gICAgXCIyNDlcIjogXCJ1Z3JhdmU7XCIsXG4gICAgXCIyNTBcIjogXCJ1YWN1dGU7XCIsXG4gICAgXCIyNTFcIjogXCJ1Y2lyYztcIixcbiAgICBcIjI1MlwiOiBcInV1bWw7XCIsXG4gICAgXCIyNTNcIjogXCJ5YWN1dGU7XCIsXG4gICAgXCIyNTRcIjogXCJ0aG9ybjtcIixcbiAgICBcIjI1NVwiOiBcInl1bWw7XCIsXG4gICAgXCIyNTZcIjogXCJBbWFjcjtcIixcbiAgICBcIjI1N1wiOiBcImFtYWNyO1wiLFxuICAgIFwiMjU4XCI6IFwiQWJyZXZlO1wiLFxuICAgIFwiMjU5XCI6IFwiYWJyZXZlO1wiLFxuICAgIFwiMjYwXCI6IFwiQW9nb247XCIsXG4gICAgXCIyNjFcIjogXCJhb2dvbjtcIixcbiAgICBcIjI2MlwiOiBcIkNhY3V0ZTtcIixcbiAgICBcIjI2M1wiOiBcImNhY3V0ZTtcIixcbiAgICBcIjI2NFwiOiBcIkNjaXJjO1wiLFxuICAgIFwiMjY1XCI6IFwiY2NpcmM7XCIsXG4gICAgXCIyNjZcIjogXCJDZG90O1wiLFxuICAgIFwiMjY3XCI6IFwiY2RvdDtcIixcbiAgICBcIjI2OFwiOiBcIkNjYXJvbjtcIixcbiAgICBcIjI2OVwiOiBcImNjYXJvbjtcIixcbiAgICBcIjI3MFwiOiBcIkRjYXJvbjtcIixcbiAgICBcIjI3MVwiOiBcImRjYXJvbjtcIixcbiAgICBcIjI3MlwiOiBcIkRzdHJvaztcIixcbiAgICBcIjI3M1wiOiBcImRzdHJvaztcIixcbiAgICBcIjI3NFwiOiBcIkVtYWNyO1wiLFxuICAgIFwiMjc1XCI6IFwiZW1hY3I7XCIsXG4gICAgXCIyNzhcIjogXCJFZG90O1wiLFxuICAgIFwiMjc5XCI6IFwiZWRvdDtcIixcbiAgICBcIjI4MFwiOiBcIkVvZ29uO1wiLFxuICAgIFwiMjgxXCI6IFwiZW9nb247XCIsXG4gICAgXCIyODJcIjogXCJFY2Fyb247XCIsXG4gICAgXCIyODNcIjogXCJlY2Fyb247XCIsXG4gICAgXCIyODRcIjogXCJHY2lyYztcIixcbiAgICBcIjI4NVwiOiBcImdjaXJjO1wiLFxuICAgIFwiMjg2XCI6IFwiR2JyZXZlO1wiLFxuICAgIFwiMjg3XCI6IFwiZ2JyZXZlO1wiLFxuICAgIFwiMjg4XCI6IFwiR2RvdDtcIixcbiAgICBcIjI4OVwiOiBcImdkb3Q7XCIsXG4gICAgXCIyOTBcIjogXCJHY2VkaWw7XCIsXG4gICAgXCIyOTJcIjogXCJIY2lyYztcIixcbiAgICBcIjI5M1wiOiBcImhjaXJjO1wiLFxuICAgIFwiMjk0XCI6IFwiSHN0cm9rO1wiLFxuICAgIFwiMjk1XCI6IFwiaHN0cm9rO1wiLFxuICAgIFwiMjk2XCI6IFwiSXRpbGRlO1wiLFxuICAgIFwiMjk3XCI6IFwiaXRpbGRlO1wiLFxuICAgIFwiMjk4XCI6IFwiSW1hY3I7XCIsXG4gICAgXCIyOTlcIjogXCJpbWFjcjtcIixcbiAgICBcIjMwMlwiOiBcIklvZ29uO1wiLFxuICAgIFwiMzAzXCI6IFwiaW9nb247XCIsXG4gICAgXCIzMDRcIjogXCJJZG90O1wiLFxuICAgIFwiMzA1XCI6IFwiaW5vZG90O1wiLFxuICAgIFwiMzA2XCI6IFwiSUpsaWc7XCIsXG4gICAgXCIzMDdcIjogXCJpamxpZztcIixcbiAgICBcIjMwOFwiOiBcIkpjaXJjO1wiLFxuICAgIFwiMzA5XCI6IFwiamNpcmM7XCIsXG4gICAgXCIzMTBcIjogXCJLY2VkaWw7XCIsXG4gICAgXCIzMTFcIjogXCJrY2VkaWw7XCIsXG4gICAgXCIzMTJcIjogXCJrZ3JlZW47XCIsXG4gICAgXCIzMTNcIjogXCJMYWN1dGU7XCIsXG4gICAgXCIzMTRcIjogXCJsYWN1dGU7XCIsXG4gICAgXCIzMTVcIjogXCJMY2VkaWw7XCIsXG4gICAgXCIzMTZcIjogXCJsY2VkaWw7XCIsXG4gICAgXCIzMTdcIjogXCJMY2Fyb247XCIsXG4gICAgXCIzMThcIjogXCJsY2Fyb247XCIsXG4gICAgXCIzMTlcIjogXCJMbWlkb3Q7XCIsXG4gICAgXCIzMjBcIjogXCJsbWlkb3Q7XCIsXG4gICAgXCIzMjFcIjogXCJMc3Ryb2s7XCIsXG4gICAgXCIzMjJcIjogXCJsc3Ryb2s7XCIsXG4gICAgXCIzMjNcIjogXCJOYWN1dGU7XCIsXG4gICAgXCIzMjRcIjogXCJuYWN1dGU7XCIsXG4gICAgXCIzMjVcIjogXCJOY2VkaWw7XCIsXG4gICAgXCIzMjZcIjogXCJuY2VkaWw7XCIsXG4gICAgXCIzMjdcIjogXCJOY2Fyb247XCIsXG4gICAgXCIzMjhcIjogXCJuY2Fyb247XCIsXG4gICAgXCIzMjlcIjogXCJuYXBvcztcIixcbiAgICBcIjMzMFwiOiBcIkVORztcIixcbiAgICBcIjMzMVwiOiBcImVuZztcIixcbiAgICBcIjMzMlwiOiBcIk9tYWNyO1wiLFxuICAgIFwiMzMzXCI6IFwib21hY3I7XCIsXG4gICAgXCIzMzZcIjogXCJPZGJsYWM7XCIsXG4gICAgXCIzMzdcIjogXCJvZGJsYWM7XCIsXG4gICAgXCIzMzhcIjogXCJPRWxpZztcIixcbiAgICBcIjMzOVwiOiBcIm9lbGlnO1wiLFxuICAgIFwiMzQwXCI6IFwiUmFjdXRlO1wiLFxuICAgIFwiMzQxXCI6IFwicmFjdXRlO1wiLFxuICAgIFwiMzQyXCI6IFwiUmNlZGlsO1wiLFxuICAgIFwiMzQzXCI6IFwicmNlZGlsO1wiLFxuICAgIFwiMzQ0XCI6IFwiUmNhcm9uO1wiLFxuICAgIFwiMzQ1XCI6IFwicmNhcm9uO1wiLFxuICAgIFwiMzQ2XCI6IFwiU2FjdXRlO1wiLFxuICAgIFwiMzQ3XCI6IFwic2FjdXRlO1wiLFxuICAgIFwiMzQ4XCI6IFwiU2NpcmM7XCIsXG4gICAgXCIzNDlcIjogXCJzY2lyYztcIixcbiAgICBcIjM1MFwiOiBcIlNjZWRpbDtcIixcbiAgICBcIjM1MVwiOiBcInNjZWRpbDtcIixcbiAgICBcIjM1MlwiOiBcIlNjYXJvbjtcIixcbiAgICBcIjM1M1wiOiBcInNjYXJvbjtcIixcbiAgICBcIjM1NFwiOiBcIlRjZWRpbDtcIixcbiAgICBcIjM1NVwiOiBcInRjZWRpbDtcIixcbiAgICBcIjM1NlwiOiBcIlRjYXJvbjtcIixcbiAgICBcIjM1N1wiOiBcInRjYXJvbjtcIixcbiAgICBcIjM1OFwiOiBcIlRzdHJvaztcIixcbiAgICBcIjM1OVwiOiBcInRzdHJvaztcIixcbiAgICBcIjM2MFwiOiBcIlV0aWxkZTtcIixcbiAgICBcIjM2MVwiOiBcInV0aWxkZTtcIixcbiAgICBcIjM2MlwiOiBcIlVtYWNyO1wiLFxuICAgIFwiMzYzXCI6IFwidW1hY3I7XCIsXG4gICAgXCIzNjRcIjogXCJVYnJldmU7XCIsXG4gICAgXCIzNjVcIjogXCJ1YnJldmU7XCIsXG4gICAgXCIzNjZcIjogXCJVcmluZztcIixcbiAgICBcIjM2N1wiOiBcInVyaW5nO1wiLFxuICAgIFwiMzY4XCI6IFwiVWRibGFjO1wiLFxuICAgIFwiMzY5XCI6IFwidWRibGFjO1wiLFxuICAgIFwiMzcwXCI6IFwiVW9nb247XCIsXG4gICAgXCIzNzFcIjogXCJ1b2dvbjtcIixcbiAgICBcIjM3MlwiOiBcIldjaXJjO1wiLFxuICAgIFwiMzczXCI6IFwid2NpcmM7XCIsXG4gICAgXCIzNzRcIjogXCJZY2lyYztcIixcbiAgICBcIjM3NVwiOiBcInljaXJjO1wiLFxuICAgIFwiMzc2XCI6IFwiWXVtbDtcIixcbiAgICBcIjM3N1wiOiBcIlphY3V0ZTtcIixcbiAgICBcIjM3OFwiOiBcInphY3V0ZTtcIixcbiAgICBcIjM3OVwiOiBcIlpkb3Q7XCIsXG4gICAgXCIzODBcIjogXCJ6ZG90O1wiLFxuICAgIFwiMzgxXCI6IFwiWmNhcm9uO1wiLFxuICAgIFwiMzgyXCI6IFwiemNhcm9uO1wiLFxuICAgIFwiNDAyXCI6IFwiZm5vZjtcIixcbiAgICBcIjQzN1wiOiBcImltcGVkO1wiLFxuICAgIFwiNTAxXCI6IFwiZ2FjdXRlO1wiLFxuICAgIFwiNTY3XCI6IFwiam1hdGg7XCIsXG4gICAgXCI3MTBcIjogXCJjaXJjO1wiLFxuICAgIFwiNzExXCI6IFwiSGFjZWs7XCIsXG4gICAgXCI3MjhcIjogXCJicmV2ZTtcIixcbiAgICBcIjcyOVwiOiBcImRvdDtcIixcbiAgICBcIjczMFwiOiBcInJpbmc7XCIsXG4gICAgXCI3MzFcIjogXCJvZ29uO1wiLFxuICAgIFwiNzMyXCI6IFwidGlsZGU7XCIsXG4gICAgXCI3MzNcIjogXCJEaWFjcml0aWNhbERvdWJsZUFjdXRlO1wiLFxuICAgIFwiNzg1XCI6IFwiRG93bkJyZXZlO1wiLFxuICAgIFwiOTEzXCI6IFwiQWxwaGE7XCIsXG4gICAgXCI5MTRcIjogXCJCZXRhO1wiLFxuICAgIFwiOTE1XCI6IFwiR2FtbWE7XCIsXG4gICAgXCI5MTZcIjogXCJEZWx0YTtcIixcbiAgICBcIjkxN1wiOiBcIkVwc2lsb247XCIsXG4gICAgXCI5MThcIjogXCJaZXRhO1wiLFxuICAgIFwiOTE5XCI6IFwiRXRhO1wiLFxuICAgIFwiOTIwXCI6IFwiVGhldGE7XCIsXG4gICAgXCI5MjFcIjogXCJJb3RhO1wiLFxuICAgIFwiOTIyXCI6IFwiS2FwcGE7XCIsXG4gICAgXCI5MjNcIjogXCJMYW1iZGE7XCIsXG4gICAgXCI5MjRcIjogXCJNdTtcIixcbiAgICBcIjkyNVwiOiBcIk51O1wiLFxuICAgIFwiOTI2XCI6IFwiWGk7XCIsXG4gICAgXCI5MjdcIjogXCJPbWljcm9uO1wiLFxuICAgIFwiOTI4XCI6IFwiUGk7XCIsXG4gICAgXCI5MjlcIjogXCJSaG87XCIsXG4gICAgXCI5MzFcIjogXCJTaWdtYTtcIixcbiAgICBcIjkzMlwiOiBcIlRhdTtcIixcbiAgICBcIjkzM1wiOiBcIlVwc2lsb247XCIsXG4gICAgXCI5MzRcIjogXCJQaGk7XCIsXG4gICAgXCI5MzVcIjogXCJDaGk7XCIsXG4gICAgXCI5MzZcIjogXCJQc2k7XCIsXG4gICAgXCI5MzdcIjogXCJPbWVnYTtcIixcbiAgICBcIjk0NVwiOiBcImFscGhhO1wiLFxuICAgIFwiOTQ2XCI6IFwiYmV0YTtcIixcbiAgICBcIjk0N1wiOiBcImdhbW1hO1wiLFxuICAgIFwiOTQ4XCI6IFwiZGVsdGE7XCIsXG4gICAgXCI5NDlcIjogXCJlcHNpbG9uO1wiLFxuICAgIFwiOTUwXCI6IFwiemV0YTtcIixcbiAgICBcIjk1MVwiOiBcImV0YTtcIixcbiAgICBcIjk1MlwiOiBcInRoZXRhO1wiLFxuICAgIFwiOTUzXCI6IFwiaW90YTtcIixcbiAgICBcIjk1NFwiOiBcImthcHBhO1wiLFxuICAgIFwiOTU1XCI6IFwibGFtYmRhO1wiLFxuICAgIFwiOTU2XCI6IFwibXU7XCIsXG4gICAgXCI5NTdcIjogXCJudTtcIixcbiAgICBcIjk1OFwiOiBcInhpO1wiLFxuICAgIFwiOTU5XCI6IFwib21pY3JvbjtcIixcbiAgICBcIjk2MFwiOiBcInBpO1wiLFxuICAgIFwiOTYxXCI6IFwicmhvO1wiLFxuICAgIFwiOTYyXCI6IFwidmFyc2lnbWE7XCIsXG4gICAgXCI5NjNcIjogXCJzaWdtYTtcIixcbiAgICBcIjk2NFwiOiBcInRhdTtcIixcbiAgICBcIjk2NVwiOiBcInVwc2lsb247XCIsXG4gICAgXCI5NjZcIjogXCJwaGk7XCIsXG4gICAgXCI5NjdcIjogXCJjaGk7XCIsXG4gICAgXCI5NjhcIjogXCJwc2k7XCIsXG4gICAgXCI5NjlcIjogXCJvbWVnYTtcIixcbiAgICBcIjk3N1wiOiBcInZhcnRoZXRhO1wiLFxuICAgIFwiOTc4XCI6IFwidXBzaWg7XCIsXG4gICAgXCI5ODFcIjogXCJ2YXJwaGk7XCIsXG4gICAgXCI5ODJcIjogXCJ2YXJwaTtcIixcbiAgICBcIjk4OFwiOiBcIkdhbW1hZDtcIixcbiAgICBcIjk4OVwiOiBcImdhbW1hZDtcIixcbiAgICBcIjEwMDhcIjogXCJ2YXJrYXBwYTtcIixcbiAgICBcIjEwMDlcIjogXCJ2YXJyaG87XCIsXG4gICAgXCIxMDEzXCI6IFwidmFyZXBzaWxvbjtcIixcbiAgICBcIjEwMTRcIjogXCJiZXBzaTtcIixcbiAgICBcIjEwMjVcIjogXCJJT2N5O1wiLFxuICAgIFwiMTAyNlwiOiBcIkRKY3k7XCIsXG4gICAgXCIxMDI3XCI6IFwiR0pjeTtcIixcbiAgICBcIjEwMjhcIjogXCJKdWtjeTtcIixcbiAgICBcIjEwMjlcIjogXCJEU2N5O1wiLFxuICAgIFwiMTAzMFwiOiBcIkl1a2N5O1wiLFxuICAgIFwiMTAzMVwiOiBcIllJY3k7XCIsXG4gICAgXCIxMDMyXCI6IFwiSnNlcmN5O1wiLFxuICAgIFwiMTAzM1wiOiBcIkxKY3k7XCIsXG4gICAgXCIxMDM0XCI6IFwiTkpjeTtcIixcbiAgICBcIjEwMzVcIjogXCJUU0hjeTtcIixcbiAgICBcIjEwMzZcIjogXCJLSmN5O1wiLFxuICAgIFwiMTAzOFwiOiBcIlVicmN5O1wiLFxuICAgIFwiMTAzOVwiOiBcIkRaY3k7XCIsXG4gICAgXCIxMDQwXCI6IFwiQWN5O1wiLFxuICAgIFwiMTA0MVwiOiBcIkJjeTtcIixcbiAgICBcIjEwNDJcIjogXCJWY3k7XCIsXG4gICAgXCIxMDQzXCI6IFwiR2N5O1wiLFxuICAgIFwiMTA0NFwiOiBcIkRjeTtcIixcbiAgICBcIjEwNDVcIjogXCJJRWN5O1wiLFxuICAgIFwiMTA0NlwiOiBcIlpIY3k7XCIsXG4gICAgXCIxMDQ3XCI6IFwiWmN5O1wiLFxuICAgIFwiMTA0OFwiOiBcIkljeTtcIixcbiAgICBcIjEwNDlcIjogXCJKY3k7XCIsXG4gICAgXCIxMDUwXCI6IFwiS2N5O1wiLFxuICAgIFwiMTA1MVwiOiBcIkxjeTtcIixcbiAgICBcIjEwNTJcIjogXCJNY3k7XCIsXG4gICAgXCIxMDUzXCI6IFwiTmN5O1wiLFxuICAgIFwiMTA1NFwiOiBcIk9jeTtcIixcbiAgICBcIjEwNTVcIjogXCJQY3k7XCIsXG4gICAgXCIxMDU2XCI6IFwiUmN5O1wiLFxuICAgIFwiMTA1N1wiOiBcIlNjeTtcIixcbiAgICBcIjEwNThcIjogXCJUY3k7XCIsXG4gICAgXCIxMDU5XCI6IFwiVWN5O1wiLFxuICAgIFwiMTA2MFwiOiBcIkZjeTtcIixcbiAgICBcIjEwNjFcIjogXCJLSGN5O1wiLFxuICAgIFwiMTA2MlwiOiBcIlRTY3k7XCIsXG4gICAgXCIxMDYzXCI6IFwiQ0hjeTtcIixcbiAgICBcIjEwNjRcIjogXCJTSGN5O1wiLFxuICAgIFwiMTA2NVwiOiBcIlNIQ0hjeTtcIixcbiAgICBcIjEwNjZcIjogXCJIQVJEY3k7XCIsXG4gICAgXCIxMDY3XCI6IFwiWWN5O1wiLFxuICAgIFwiMTA2OFwiOiBcIlNPRlRjeTtcIixcbiAgICBcIjEwNjlcIjogXCJFY3k7XCIsXG4gICAgXCIxMDcwXCI6IFwiWVVjeTtcIixcbiAgICBcIjEwNzFcIjogXCJZQWN5O1wiLFxuICAgIFwiMTA3MlwiOiBcImFjeTtcIixcbiAgICBcIjEwNzNcIjogXCJiY3k7XCIsXG4gICAgXCIxMDc0XCI6IFwidmN5O1wiLFxuICAgIFwiMTA3NVwiOiBcImdjeTtcIixcbiAgICBcIjEwNzZcIjogXCJkY3k7XCIsXG4gICAgXCIxMDc3XCI6IFwiaWVjeTtcIixcbiAgICBcIjEwNzhcIjogXCJ6aGN5O1wiLFxuICAgIFwiMTA3OVwiOiBcInpjeTtcIixcbiAgICBcIjEwODBcIjogXCJpY3k7XCIsXG4gICAgXCIxMDgxXCI6IFwiamN5O1wiLFxuICAgIFwiMTA4MlwiOiBcImtjeTtcIixcbiAgICBcIjEwODNcIjogXCJsY3k7XCIsXG4gICAgXCIxMDg0XCI6IFwibWN5O1wiLFxuICAgIFwiMTA4NVwiOiBcIm5jeTtcIixcbiAgICBcIjEwODZcIjogXCJvY3k7XCIsXG4gICAgXCIxMDg3XCI6IFwicGN5O1wiLFxuICAgIFwiMTA4OFwiOiBcInJjeTtcIixcbiAgICBcIjEwODlcIjogXCJzY3k7XCIsXG4gICAgXCIxMDkwXCI6IFwidGN5O1wiLFxuICAgIFwiMTA5MVwiOiBcInVjeTtcIixcbiAgICBcIjEwOTJcIjogXCJmY3k7XCIsXG4gICAgXCIxMDkzXCI6IFwia2hjeTtcIixcbiAgICBcIjEwOTRcIjogXCJ0c2N5O1wiLFxuICAgIFwiMTA5NVwiOiBcImNoY3k7XCIsXG4gICAgXCIxMDk2XCI6IFwic2hjeTtcIixcbiAgICBcIjEwOTdcIjogXCJzaGNoY3k7XCIsXG4gICAgXCIxMDk4XCI6IFwiaGFyZGN5O1wiLFxuICAgIFwiMTA5OVwiOiBcInljeTtcIixcbiAgICBcIjExMDBcIjogXCJzb2Z0Y3k7XCIsXG4gICAgXCIxMTAxXCI6IFwiZWN5O1wiLFxuICAgIFwiMTEwMlwiOiBcInl1Y3k7XCIsXG4gICAgXCIxMTAzXCI6IFwieWFjeTtcIixcbiAgICBcIjExMDVcIjogXCJpb2N5O1wiLFxuICAgIFwiMTEwNlwiOiBcImRqY3k7XCIsXG4gICAgXCIxMTA3XCI6IFwiZ2pjeTtcIixcbiAgICBcIjExMDhcIjogXCJqdWtjeTtcIixcbiAgICBcIjExMDlcIjogXCJkc2N5O1wiLFxuICAgIFwiMTExMFwiOiBcIml1a2N5O1wiLFxuICAgIFwiMTExMVwiOiBcInlpY3k7XCIsXG4gICAgXCIxMTEyXCI6IFwianNlcmN5O1wiLFxuICAgIFwiMTExM1wiOiBcImxqY3k7XCIsXG4gICAgXCIxMTE0XCI6IFwibmpjeTtcIixcbiAgICBcIjExMTVcIjogXCJ0c2hjeTtcIixcbiAgICBcIjExMTZcIjogXCJramN5O1wiLFxuICAgIFwiMTExOFwiOiBcInVicmN5O1wiLFxuICAgIFwiMTExOVwiOiBcImR6Y3k7XCIsXG4gICAgXCI4MTk0XCI6IFwiZW5zcDtcIixcbiAgICBcIjgxOTVcIjogXCJlbXNwO1wiLFxuICAgIFwiODE5NlwiOiBcImVtc3AxMztcIixcbiAgICBcIjgxOTdcIjogXCJlbXNwMTQ7XCIsXG4gICAgXCI4MTk5XCI6IFwibnVtc3A7XCIsXG4gICAgXCI4MjAwXCI6IFwicHVuY3NwO1wiLFxuICAgIFwiODIwMVwiOiBcIlRoaW5TcGFjZTtcIixcbiAgICBcIjgyMDJcIjogXCJWZXJ5VGhpblNwYWNlO1wiLFxuICAgIFwiODIwM1wiOiBcIlplcm9XaWR0aFNwYWNlO1wiLFxuICAgIFwiODIwNFwiOiBcInp3bmo7XCIsXG4gICAgXCI4MjA1XCI6IFwiendqO1wiLFxuICAgIFwiODIwNlwiOiBcImxybTtcIixcbiAgICBcIjgyMDdcIjogXCJybG07XCIsXG4gICAgXCI4MjA4XCI6IFwiaHlwaGVuO1wiLFxuICAgIFwiODIxMVwiOiBcIm5kYXNoO1wiLFxuICAgIFwiODIxMlwiOiBcIm1kYXNoO1wiLFxuICAgIFwiODIxM1wiOiBcImhvcmJhcjtcIixcbiAgICBcIjgyMTRcIjogXCJWZXJ0O1wiLFxuICAgIFwiODIxNlwiOiBcIk9wZW5DdXJseVF1b3RlO1wiLFxuICAgIFwiODIxN1wiOiBcInJzcXVvcjtcIixcbiAgICBcIjgyMThcIjogXCJzYnF1bztcIixcbiAgICBcIjgyMjBcIjogXCJPcGVuQ3VybHlEb3VibGVRdW90ZTtcIixcbiAgICBcIjgyMjFcIjogXCJyZHF1b3I7XCIsXG4gICAgXCI4MjIyXCI6IFwibGRxdW9yO1wiLFxuICAgIFwiODIyNFwiOiBcImRhZ2dlcjtcIixcbiAgICBcIjgyMjVcIjogXCJkZGFnZ2VyO1wiLFxuICAgIFwiODIyNlwiOiBcImJ1bGxldDtcIixcbiAgICBcIjgyMjlcIjogXCJubGRyO1wiLFxuICAgIFwiODIzMFwiOiBcIm1sZHI7XCIsXG4gICAgXCI4MjQwXCI6IFwicGVybWlsO1wiLFxuICAgIFwiODI0MVwiOiBcInBlcnRlbms7XCIsXG4gICAgXCI4MjQyXCI6IFwicHJpbWU7XCIsXG4gICAgXCI4MjQzXCI6IFwiUHJpbWU7XCIsXG4gICAgXCI4MjQ0XCI6IFwidHByaW1lO1wiLFxuICAgIFwiODI0NVwiOiBcImJwcmltZTtcIixcbiAgICBcIjgyNDlcIjogXCJsc2FxdW87XCIsXG4gICAgXCI4MjUwXCI6IFwicnNhcXVvO1wiLFxuICAgIFwiODI1NFwiOiBcIk92ZXJCYXI7XCIsXG4gICAgXCI4MjU3XCI6IFwiY2FyZXQ7XCIsXG4gICAgXCI4MjU5XCI6IFwiaHlidWxsO1wiLFxuICAgIFwiODI2MFwiOiBcImZyYXNsO1wiLFxuICAgIFwiODI3MVwiOiBcImJzZW1pO1wiLFxuICAgIFwiODI3OVwiOiBcInFwcmltZTtcIixcbiAgICBcIjgyODdcIjogXCJNZWRpdW1TcGFjZTtcIixcbiAgICBcIjgyODhcIjogXCJOb0JyZWFrO1wiLFxuICAgIFwiODI4OVwiOiBcIkFwcGx5RnVuY3Rpb247XCIsXG4gICAgXCI4MjkwXCI6IFwiaXQ7XCIsXG4gICAgXCI4MjkxXCI6IFwiSW52aXNpYmxlQ29tbWE7XCIsXG4gICAgXCI4MzY0XCI6IFwiZXVybztcIixcbiAgICBcIjg0MTFcIjogXCJUcmlwbGVEb3Q7XCIsXG4gICAgXCI4NDEyXCI6IFwiRG90RG90O1wiLFxuICAgIFwiODQ1MFwiOiBcIkNvcGY7XCIsXG4gICAgXCI4NDUzXCI6IFwiaW5jYXJlO1wiLFxuICAgIFwiODQ1OFwiOiBcImdzY3I7XCIsXG4gICAgXCI4NDU5XCI6IFwiSHNjcjtcIixcbiAgICBcIjg0NjBcIjogXCJQb2luY2FyZXBsYW5lO1wiLFxuICAgIFwiODQ2MVwiOiBcInF1YXRlcm5pb25zO1wiLFxuICAgIFwiODQ2MlwiOiBcInBsYW5ja2g7XCIsXG4gICAgXCI4NDYzXCI6IFwicGxhbmt2O1wiLFxuICAgIFwiODQ2NFwiOiBcIklzY3I7XCIsXG4gICAgXCI4NDY1XCI6IFwiaW1hZ3BhcnQ7XCIsXG4gICAgXCI4NDY2XCI6IFwiTHNjcjtcIixcbiAgICBcIjg0NjdcIjogXCJlbGw7XCIsXG4gICAgXCI4NDY5XCI6IFwiTm9wZjtcIixcbiAgICBcIjg0NzBcIjogXCJudW1lcm87XCIsXG4gICAgXCI4NDcxXCI6IFwiY29weXNyO1wiLFxuICAgIFwiODQ3MlwiOiBcIndwO1wiLFxuICAgIFwiODQ3M1wiOiBcInByaW1lcztcIixcbiAgICBcIjg0NzRcIjogXCJyYXRpb25hbHM7XCIsXG4gICAgXCI4NDc1XCI6IFwiUnNjcjtcIixcbiAgICBcIjg0NzZcIjogXCJSZnI7XCIsXG4gICAgXCI4NDc3XCI6IFwiUm9wZjtcIixcbiAgICBcIjg0NzhcIjogXCJyeDtcIixcbiAgICBcIjg0ODJcIjogXCJ0cmFkZTtcIixcbiAgICBcIjg0ODRcIjogXCJab3BmO1wiLFxuICAgIFwiODQ4N1wiOiBcIm1obztcIixcbiAgICBcIjg0ODhcIjogXCJaZnI7XCIsXG4gICAgXCI4NDg5XCI6IFwiaWlvdGE7XCIsXG4gICAgXCI4NDkyXCI6IFwiQnNjcjtcIixcbiAgICBcIjg0OTNcIjogXCJDZnI7XCIsXG4gICAgXCI4NDk1XCI6IFwiZXNjcjtcIixcbiAgICBcIjg0OTZcIjogXCJleHBlY3RhdGlvbjtcIixcbiAgICBcIjg0OTdcIjogXCJGc2NyO1wiLFxuICAgIFwiODQ5OVwiOiBcInBobW1hdDtcIixcbiAgICBcIjg1MDBcIjogXCJvc2NyO1wiLFxuICAgIFwiODUwMVwiOiBcImFsZXBoO1wiLFxuICAgIFwiODUwMlwiOiBcImJldGg7XCIsXG4gICAgXCI4NTAzXCI6IFwiZ2ltZWw7XCIsXG4gICAgXCI4NTA0XCI6IFwiZGFsZXRoO1wiLFxuICAgIFwiODUxN1wiOiBcIkREO1wiLFxuICAgIFwiODUxOFwiOiBcIkRpZmZlcmVudGlhbEQ7XCIsXG4gICAgXCI4NTE5XCI6IFwiZXhwb25lbnRpYWxlO1wiLFxuICAgIFwiODUyMFwiOiBcIkltYWdpbmFyeUk7XCIsXG4gICAgXCI4NTMxXCI6IFwiZnJhYzEzO1wiLFxuICAgIFwiODUzMlwiOiBcImZyYWMyMztcIixcbiAgICBcIjg1MzNcIjogXCJmcmFjMTU7XCIsXG4gICAgXCI4NTM0XCI6IFwiZnJhYzI1O1wiLFxuICAgIFwiODUzNVwiOiBcImZyYWMzNTtcIixcbiAgICBcIjg1MzZcIjogXCJmcmFjNDU7XCIsXG4gICAgXCI4NTM3XCI6IFwiZnJhYzE2O1wiLFxuICAgIFwiODUzOFwiOiBcImZyYWM1NjtcIixcbiAgICBcIjg1MzlcIjogXCJmcmFjMTg7XCIsXG4gICAgXCI4NTQwXCI6IFwiZnJhYzM4O1wiLFxuICAgIFwiODU0MVwiOiBcImZyYWM1ODtcIixcbiAgICBcIjg1NDJcIjogXCJmcmFjNzg7XCIsXG4gICAgXCI4NTkyXCI6IFwic2xhcnI7XCIsXG4gICAgXCI4NTkzXCI6IFwidXBhcnJvdztcIixcbiAgICBcIjg1OTRcIjogXCJzcmFycjtcIixcbiAgICBcIjg1OTVcIjogXCJTaG9ydERvd25BcnJvdztcIixcbiAgICBcIjg1OTZcIjogXCJsZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg1OTdcIjogXCJ2YXJyO1wiLFxuICAgIFwiODU5OFwiOiBcIlVwcGVyTGVmdEFycm93O1wiLFxuICAgIFwiODU5OVwiOiBcIlVwcGVyUmlnaHRBcnJvdztcIixcbiAgICBcIjg2MDBcIjogXCJzZWFycm93O1wiLFxuICAgIFwiODYwMVwiOiBcInN3YXJyb3c7XCIsXG4gICAgXCI4NjAyXCI6IFwibmxlZnRhcnJvdztcIixcbiAgICBcIjg2MDNcIjogXCJucmlnaHRhcnJvdztcIixcbiAgICBcIjg2MDVcIjogXCJyaWdodHNxdWlnYXJyb3c7XCIsXG4gICAgXCI4NjA2XCI6IFwidHdvaGVhZGxlZnRhcnJvdztcIixcbiAgICBcIjg2MDdcIjogXCJVYXJyO1wiLFxuICAgIFwiODYwOFwiOiBcInR3b2hlYWRyaWdodGFycm93O1wiLFxuICAgIFwiODYwOVwiOiBcIkRhcnI7XCIsXG4gICAgXCI4NjEwXCI6IFwibGVmdGFycm93dGFpbDtcIixcbiAgICBcIjg2MTFcIjogXCJyaWdodGFycm93dGFpbDtcIixcbiAgICBcIjg2MTJcIjogXCJtYXBzdG9sZWZ0O1wiLFxuICAgIFwiODYxM1wiOiBcIlVwVGVlQXJyb3c7XCIsXG4gICAgXCI4NjE0XCI6IFwiUmlnaHRUZWVBcnJvdztcIixcbiAgICBcIjg2MTVcIjogXCJtYXBzdG9kb3duO1wiLFxuICAgIFwiODYxN1wiOiBcImxhcnJoaztcIixcbiAgICBcIjg2MThcIjogXCJyYXJyaGs7XCIsXG4gICAgXCI4NjE5XCI6IFwibG9vcGFycm93bGVmdDtcIixcbiAgICBcIjg2MjBcIjogXCJyYXJybHA7XCIsXG4gICAgXCI4NjIxXCI6IFwibGVmdHJpZ2h0c3F1aWdhcnJvdztcIixcbiAgICBcIjg2MjJcIjogXCJubGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjI0XCI6IFwibHNoO1wiLFxuICAgIFwiODYyNVwiOiBcInJzaDtcIixcbiAgICBcIjg2MjZcIjogXCJsZHNoO1wiLFxuICAgIFwiODYyN1wiOiBcInJkc2g7XCIsXG4gICAgXCI4NjI5XCI6IFwiY3JhcnI7XCIsXG4gICAgXCI4NjMwXCI6IFwiY3VydmVhcnJvd2xlZnQ7XCIsXG4gICAgXCI4NjMxXCI6IFwiY3VydmVhcnJvd3JpZ2h0O1wiLFxuICAgIFwiODYzNFwiOiBcIm9sYXJyO1wiLFxuICAgIFwiODYzNVwiOiBcIm9yYXJyO1wiLFxuICAgIFwiODYzNlwiOiBcImxoYXJ1O1wiLFxuICAgIFwiODYzN1wiOiBcImxoYXJkO1wiLFxuICAgIFwiODYzOFwiOiBcInVwaGFycG9vbnJpZ2h0O1wiLFxuICAgIFwiODYzOVwiOiBcInVwaGFycG9vbmxlZnQ7XCIsXG4gICAgXCI4NjQwXCI6IFwiUmlnaHRWZWN0b3I7XCIsXG4gICAgXCI4NjQxXCI6IFwicmlnaHRoYXJwb29uZG93bjtcIixcbiAgICBcIjg2NDJcIjogXCJSaWdodERvd25WZWN0b3I7XCIsXG4gICAgXCI4NjQzXCI6IFwiTGVmdERvd25WZWN0b3I7XCIsXG4gICAgXCI4NjQ0XCI6IFwicmxhcnI7XCIsXG4gICAgXCI4NjQ1XCI6IFwiVXBBcnJvd0Rvd25BcnJvdztcIixcbiAgICBcIjg2NDZcIjogXCJscmFycjtcIixcbiAgICBcIjg2NDdcIjogXCJsbGFycjtcIixcbiAgICBcIjg2NDhcIjogXCJ1dWFycjtcIixcbiAgICBcIjg2NDlcIjogXCJycmFycjtcIixcbiAgICBcIjg2NTBcIjogXCJkb3duZG93bmFycm93cztcIixcbiAgICBcIjg2NTFcIjogXCJSZXZlcnNlRXF1aWxpYnJpdW07XCIsXG4gICAgXCI4NjUyXCI6IFwicmxoYXI7XCIsXG4gICAgXCI4NjUzXCI6IFwibkxlZnRhcnJvdztcIixcbiAgICBcIjg2NTRcIjogXCJuTGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjU1XCI6IFwiblJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjU2XCI6IFwiTGVmdGFycm93O1wiLFxuICAgIFwiODY1N1wiOiBcIlVwYXJyb3c7XCIsXG4gICAgXCI4NjU4XCI6IFwiUmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTlcIjogXCJEb3duYXJyb3c7XCIsXG4gICAgXCI4NjYwXCI6IFwiTGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjYxXCI6IFwidkFycjtcIixcbiAgICBcIjg2NjJcIjogXCJud0FycjtcIixcbiAgICBcIjg2NjNcIjogXCJuZUFycjtcIixcbiAgICBcIjg2NjRcIjogXCJzZUFycjtcIixcbiAgICBcIjg2NjVcIjogXCJzd0FycjtcIixcbiAgICBcIjg2NjZcIjogXCJMbGVmdGFycm93O1wiLFxuICAgIFwiODY2N1wiOiBcIlJyaWdodGFycm93O1wiLFxuICAgIFwiODY2OVwiOiBcInppZ3JhcnI7XCIsXG4gICAgXCI4Njc2XCI6IFwiTGVmdEFycm93QmFyO1wiLFxuICAgIFwiODY3N1wiOiBcIlJpZ2h0QXJyb3dCYXI7XCIsXG4gICAgXCI4NjkzXCI6IFwiZHVhcnI7XCIsXG4gICAgXCI4NzAxXCI6IFwibG9hcnI7XCIsXG4gICAgXCI4NzAyXCI6IFwicm9hcnI7XCIsXG4gICAgXCI4NzAzXCI6IFwiaG9hcnI7XCIsXG4gICAgXCI4NzA0XCI6IFwiZm9yYWxsO1wiLFxuICAgIFwiODcwNVwiOiBcImNvbXBsZW1lbnQ7XCIsXG4gICAgXCI4NzA2XCI6IFwiUGFydGlhbEQ7XCIsXG4gICAgXCI4NzA3XCI6IFwiRXhpc3RzO1wiLFxuICAgIFwiODcwOFwiOiBcIk5vdEV4aXN0cztcIixcbiAgICBcIjg3MDlcIjogXCJ2YXJub3RoaW5nO1wiLFxuICAgIFwiODcxMVwiOiBcIm5hYmxhO1wiLFxuICAgIFwiODcxMlwiOiBcImlzaW52O1wiLFxuICAgIFwiODcxM1wiOiBcIm5vdGludmE7XCIsXG4gICAgXCI4NzE1XCI6IFwiU3VjaFRoYXQ7XCIsXG4gICAgXCI4NzE2XCI6IFwiTm90UmV2ZXJzZUVsZW1lbnQ7XCIsXG4gICAgXCI4NzE5XCI6IFwiUHJvZHVjdDtcIixcbiAgICBcIjg3MjBcIjogXCJDb3Byb2R1Y3Q7XCIsXG4gICAgXCI4NzIxXCI6IFwic3VtO1wiLFxuICAgIFwiODcyMlwiOiBcIm1pbnVzO1wiLFxuICAgIFwiODcyM1wiOiBcIm1wO1wiLFxuICAgIFwiODcyNFwiOiBcInBsdXNkbztcIixcbiAgICBcIjg3MjZcIjogXCJzc2V0bW47XCIsXG4gICAgXCI4NzI3XCI6IFwibG93YXN0O1wiLFxuICAgIFwiODcyOFwiOiBcIlNtYWxsQ2lyY2xlO1wiLFxuICAgIFwiODczMFwiOiBcIlNxcnQ7XCIsXG4gICAgXCI4NzMzXCI6IFwidnByb3A7XCIsXG4gICAgXCI4NzM0XCI6IFwiaW5maW47XCIsXG4gICAgXCI4NzM1XCI6IFwiYW5ncnQ7XCIsXG4gICAgXCI4NzM2XCI6IFwiYW5nbGU7XCIsXG4gICAgXCI4NzM3XCI6IFwibWVhc3VyZWRhbmdsZTtcIixcbiAgICBcIjg3MzhcIjogXCJhbmdzcGg7XCIsXG4gICAgXCI4NzM5XCI6IFwiVmVydGljYWxCYXI7XCIsXG4gICAgXCI4NzQwXCI6IFwibnNtaWQ7XCIsXG4gICAgXCI4NzQxXCI6IFwic3BhcjtcIixcbiAgICBcIjg3NDJcIjogXCJuc3BhcjtcIixcbiAgICBcIjg3NDNcIjogXCJ3ZWRnZTtcIixcbiAgICBcIjg3NDRcIjogXCJ2ZWU7XCIsXG4gICAgXCI4NzQ1XCI6IFwiY2FwO1wiLFxuICAgIFwiODc0NlwiOiBcImN1cDtcIixcbiAgICBcIjg3NDdcIjogXCJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NDhcIjogXCJJbnQ7XCIsXG4gICAgXCI4NzQ5XCI6IFwidGludDtcIixcbiAgICBcIjg3NTBcIjogXCJvaW50O1wiLFxuICAgIFwiODc1MVwiOiBcIkRvdWJsZUNvbnRvdXJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NTJcIjogXCJDY29uaW50O1wiLFxuICAgIFwiODc1M1wiOiBcImN3aW50O1wiLFxuICAgIFwiODc1NFwiOiBcImN3Y29uaW50O1wiLFxuICAgIFwiODc1NVwiOiBcIkNvdW50ZXJDbG9ja3dpc2VDb250b3VySW50ZWdyYWw7XCIsXG4gICAgXCI4NzU2XCI6IFwidGhlcmVmb3JlO1wiLFxuICAgIFwiODc1N1wiOiBcImJlY2F1c2U7XCIsXG4gICAgXCI4NzU4XCI6IFwicmF0aW87XCIsXG4gICAgXCI4NzU5XCI6IFwiUHJvcG9ydGlvbjtcIixcbiAgICBcIjg3NjBcIjogXCJtaW51c2Q7XCIsXG4gICAgXCI4NzYyXCI6IFwibUREb3Q7XCIsXG4gICAgXCI4NzYzXCI6IFwiaG9tdGh0O1wiLFxuICAgIFwiODc2NFwiOiBcIlRpbGRlO1wiLFxuICAgIFwiODc2NVwiOiBcImJzaW07XCIsXG4gICAgXCI4NzY2XCI6IFwibXN0cG9zO1wiLFxuICAgIFwiODc2N1wiOiBcImFjZDtcIixcbiAgICBcIjg3NjhcIjogXCJ3cmVhdGg7XCIsXG4gICAgXCI4NzY5XCI6IFwibnNpbTtcIixcbiAgICBcIjg3NzBcIjogXCJlc2ltO1wiLFxuICAgIFwiODc3MVwiOiBcIlRpbGRlRXF1YWw7XCIsXG4gICAgXCI4NzcyXCI6IFwibnNpbWVxO1wiLFxuICAgIFwiODc3M1wiOiBcIlRpbGRlRnVsbEVxdWFsO1wiLFxuICAgIFwiODc3NFwiOiBcInNpbW5lO1wiLFxuICAgIFwiODc3NVwiOiBcIk5vdFRpbGRlRnVsbEVxdWFsO1wiLFxuICAgIFwiODc3NlwiOiBcIlRpbGRlVGlsZGU7XCIsXG4gICAgXCI4Nzc3XCI6IFwiTm90VGlsZGVUaWxkZTtcIixcbiAgICBcIjg3NzhcIjogXCJhcHByb3hlcTtcIixcbiAgICBcIjg3NzlcIjogXCJhcGlkO1wiLFxuICAgIFwiODc4MFwiOiBcImJjb25nO1wiLFxuICAgIFwiODc4MVwiOiBcIkN1cENhcDtcIixcbiAgICBcIjg3ODJcIjogXCJIdW1wRG93bkh1bXA7XCIsXG4gICAgXCI4NzgzXCI6IFwiSHVtcEVxdWFsO1wiLFxuICAgIFwiODc4NFwiOiBcImVzZG90O1wiLFxuICAgIFwiODc4NVwiOiBcImVEb3Q7XCIsXG4gICAgXCI4Nzg2XCI6IFwiZmFsbGluZ2RvdHNlcTtcIixcbiAgICBcIjg3ODdcIjogXCJyaXNpbmdkb3RzZXE7XCIsXG4gICAgXCI4Nzg4XCI6IFwiY29sb25lcTtcIixcbiAgICBcIjg3ODlcIjogXCJlcWNvbG9uO1wiLFxuICAgIFwiODc5MFwiOiBcImVxY2lyYztcIixcbiAgICBcIjg3OTFcIjogXCJjaXJlO1wiLFxuICAgIFwiODc5M1wiOiBcIndlZGdlcTtcIixcbiAgICBcIjg3OTRcIjogXCJ2ZWVlcTtcIixcbiAgICBcIjg3OTZcIjogXCJ0cmllO1wiLFxuICAgIFwiODc5OVwiOiBcInF1ZXN0ZXE7XCIsXG4gICAgXCI4ODAwXCI6IFwiTm90RXF1YWw7XCIsXG4gICAgXCI4ODAxXCI6IFwiZXF1aXY7XCIsXG4gICAgXCI4ODAyXCI6IFwiTm90Q29uZ3J1ZW50O1wiLFxuICAgIFwiODgwNFwiOiBcImxlcTtcIixcbiAgICBcIjg4MDVcIjogXCJHcmVhdGVyRXF1YWw7XCIsXG4gICAgXCI4ODA2XCI6IFwiTGVzc0Z1bGxFcXVhbDtcIixcbiAgICBcIjg4MDdcIjogXCJHcmVhdGVyRnVsbEVxdWFsO1wiLFxuICAgIFwiODgwOFwiOiBcImxuZXFxO1wiLFxuICAgIFwiODgwOVwiOiBcImduZXFxO1wiLFxuICAgIFwiODgxMFwiOiBcIk5lc3RlZExlc3NMZXNzO1wiLFxuICAgIFwiODgxMVwiOiBcIk5lc3RlZEdyZWF0ZXJHcmVhdGVyO1wiLFxuICAgIFwiODgxMlwiOiBcInR3aXh0O1wiLFxuICAgIFwiODgxM1wiOiBcIk5vdEN1cENhcDtcIixcbiAgICBcIjg4MTRcIjogXCJOb3RMZXNzO1wiLFxuICAgIFwiODgxNVwiOiBcIk5vdEdyZWF0ZXI7XCIsXG4gICAgXCI4ODE2XCI6IFwiTm90TGVzc0VxdWFsO1wiLFxuICAgIFwiODgxN1wiOiBcIk5vdEdyZWF0ZXJFcXVhbDtcIixcbiAgICBcIjg4MThcIjogXCJsc2ltO1wiLFxuICAgIFwiODgxOVwiOiBcImd0cnNpbTtcIixcbiAgICBcIjg4MjBcIjogXCJOb3RMZXNzVGlsZGU7XCIsXG4gICAgXCI4ODIxXCI6IFwiTm90R3JlYXRlclRpbGRlO1wiLFxuICAgIFwiODgyMlwiOiBcImxnO1wiLFxuICAgIFwiODgyM1wiOiBcImd0cmxlc3M7XCIsXG4gICAgXCI4ODI0XCI6IFwibnRsZztcIixcbiAgICBcIjg4MjVcIjogXCJudGdsO1wiLFxuICAgIFwiODgyNlwiOiBcIlByZWNlZGVzO1wiLFxuICAgIFwiODgyN1wiOiBcIlN1Y2NlZWRzO1wiLFxuICAgIFwiODgyOFwiOiBcIlByZWNlZGVzU2xhbnRFcXVhbDtcIixcbiAgICBcIjg4MjlcIjogXCJTdWNjZWVkc1NsYW50RXF1YWw7XCIsXG4gICAgXCI4ODMwXCI6IFwicHJzaW07XCIsXG4gICAgXCI4ODMxXCI6IFwic3VjY3NpbTtcIixcbiAgICBcIjg4MzJcIjogXCJucHJlYztcIixcbiAgICBcIjg4MzNcIjogXCJuc3VjYztcIixcbiAgICBcIjg4MzRcIjogXCJzdWJzZXQ7XCIsXG4gICAgXCI4ODM1XCI6IFwic3Vwc2V0O1wiLFxuICAgIFwiODgzNlwiOiBcIm5zdWI7XCIsXG4gICAgXCI4ODM3XCI6IFwibnN1cDtcIixcbiAgICBcIjg4MzhcIjogXCJTdWJzZXRFcXVhbDtcIixcbiAgICBcIjg4MzlcIjogXCJzdXBzZXRlcTtcIixcbiAgICBcIjg4NDBcIjogXCJuc3Vic2V0ZXE7XCIsXG4gICAgXCI4ODQxXCI6IFwibnN1cHNldGVxO1wiLFxuICAgIFwiODg0MlwiOiBcInN1YnNldG5lcTtcIixcbiAgICBcIjg4NDNcIjogXCJzdXBzZXRuZXE7XCIsXG4gICAgXCI4ODQ1XCI6IFwiY3VwZG90O1wiLFxuICAgIFwiODg0NlwiOiBcInVwbHVzO1wiLFxuICAgIFwiODg0N1wiOiBcIlNxdWFyZVN1YnNldDtcIixcbiAgICBcIjg4NDhcIjogXCJTcXVhcmVTdXBlcnNldDtcIixcbiAgICBcIjg4NDlcIjogXCJTcXVhcmVTdWJzZXRFcXVhbDtcIixcbiAgICBcIjg4NTBcIjogXCJTcXVhcmVTdXBlcnNldEVxdWFsO1wiLFxuICAgIFwiODg1MVwiOiBcIlNxdWFyZUludGVyc2VjdGlvbjtcIixcbiAgICBcIjg4NTJcIjogXCJTcXVhcmVVbmlvbjtcIixcbiAgICBcIjg4NTNcIjogXCJvcGx1cztcIixcbiAgICBcIjg4NTRcIjogXCJvbWludXM7XCIsXG4gICAgXCI4ODU1XCI6IFwib3RpbWVzO1wiLFxuICAgIFwiODg1NlwiOiBcIm9zb2w7XCIsXG4gICAgXCI4ODU3XCI6IFwib2RvdDtcIixcbiAgICBcIjg4NThcIjogXCJvY2lyO1wiLFxuICAgIFwiODg1OVwiOiBcIm9hc3Q7XCIsXG4gICAgXCI4ODYxXCI6IFwib2Rhc2g7XCIsXG4gICAgXCI4ODYyXCI6IFwicGx1c2I7XCIsXG4gICAgXCI4ODYzXCI6IFwibWludXNiO1wiLFxuICAgIFwiODg2NFwiOiBcInRpbWVzYjtcIixcbiAgICBcIjg4NjVcIjogXCJzZG90YjtcIixcbiAgICBcIjg4NjZcIjogXCJ2ZGFzaDtcIixcbiAgICBcIjg4NjdcIjogXCJMZWZ0VGVlO1wiLFxuICAgIFwiODg2OFwiOiBcInRvcDtcIixcbiAgICBcIjg4NjlcIjogXCJVcFRlZTtcIixcbiAgICBcIjg4NzFcIjogXCJtb2RlbHM7XCIsXG4gICAgXCI4ODcyXCI6IFwidkRhc2g7XCIsXG4gICAgXCI4ODczXCI6IFwiVmRhc2g7XCIsXG4gICAgXCI4ODc0XCI6IFwiVnZkYXNoO1wiLFxuICAgIFwiODg3NVwiOiBcIlZEYXNoO1wiLFxuICAgIFwiODg3NlwiOiBcIm52ZGFzaDtcIixcbiAgICBcIjg4NzdcIjogXCJudkRhc2g7XCIsXG4gICAgXCI4ODc4XCI6IFwiblZkYXNoO1wiLFxuICAgIFwiODg3OVwiOiBcIm5WRGFzaDtcIixcbiAgICBcIjg4ODBcIjogXCJwcnVyZWw7XCIsXG4gICAgXCI4ODgyXCI6IFwidmx0cmk7XCIsXG4gICAgXCI4ODgzXCI6IFwidnJ0cmk7XCIsXG4gICAgXCI4ODg0XCI6IFwidHJpYW5nbGVsZWZ0ZXE7XCIsXG4gICAgXCI4ODg1XCI6IFwidHJpYW5nbGVyaWdodGVxO1wiLFxuICAgIFwiODg4NlwiOiBcIm9yaWdvZjtcIixcbiAgICBcIjg4ODdcIjogXCJpbW9mO1wiLFxuICAgIFwiODg4OFwiOiBcIm11bWFwO1wiLFxuICAgIFwiODg4OVwiOiBcImhlcmNvbjtcIixcbiAgICBcIjg4OTBcIjogXCJpbnRlcmNhbDtcIixcbiAgICBcIjg4OTFcIjogXCJ2ZWViYXI7XCIsXG4gICAgXCI4ODkzXCI6IFwiYmFydmVlO1wiLFxuICAgIFwiODg5NFwiOiBcImFuZ3J0dmI7XCIsXG4gICAgXCI4ODk1XCI6IFwibHJ0cmk7XCIsXG4gICAgXCI4ODk2XCI6IFwieHdlZGdlO1wiLFxuICAgIFwiODg5N1wiOiBcInh2ZWU7XCIsXG4gICAgXCI4ODk4XCI6IFwieGNhcDtcIixcbiAgICBcIjg4OTlcIjogXCJ4Y3VwO1wiLFxuICAgIFwiODkwMFwiOiBcImRpYW1vbmQ7XCIsXG4gICAgXCI4OTAxXCI6IFwic2RvdDtcIixcbiAgICBcIjg5MDJcIjogXCJTdGFyO1wiLFxuICAgIFwiODkwM1wiOiBcImRpdm9ueDtcIixcbiAgICBcIjg5MDRcIjogXCJib3d0aWU7XCIsXG4gICAgXCI4OTA1XCI6IFwibHRpbWVzO1wiLFxuICAgIFwiODkwNlwiOiBcInJ0aW1lcztcIixcbiAgICBcIjg5MDdcIjogXCJsdGhyZWU7XCIsXG4gICAgXCI4OTA4XCI6IFwicnRocmVlO1wiLFxuICAgIFwiODkwOVwiOiBcImJzaW1lO1wiLFxuICAgIFwiODkxMFwiOiBcImN1dmVlO1wiLFxuICAgIFwiODkxMVwiOiBcImN1d2VkO1wiLFxuICAgIFwiODkxMlwiOiBcIlN1YnNldDtcIixcbiAgICBcIjg5MTNcIjogXCJTdXBzZXQ7XCIsXG4gICAgXCI4OTE0XCI6IFwiQ2FwO1wiLFxuICAgIFwiODkxNVwiOiBcIkN1cDtcIixcbiAgICBcIjg5MTZcIjogXCJwaXRjaGZvcms7XCIsXG4gICAgXCI4OTE3XCI6IFwiZXBhcjtcIixcbiAgICBcIjg5MThcIjogXCJsdGRvdDtcIixcbiAgICBcIjg5MTlcIjogXCJndHJkb3Q7XCIsXG4gICAgXCI4OTIwXCI6IFwiTGw7XCIsXG4gICAgXCI4OTIxXCI6IFwiZ2dnO1wiLFxuICAgIFwiODkyMlwiOiBcIkxlc3NFcXVhbEdyZWF0ZXI7XCIsXG4gICAgXCI4OTIzXCI6IFwiZ3RyZXFsZXNzO1wiLFxuICAgIFwiODkyNlwiOiBcImN1cmx5ZXFwcmVjO1wiLFxuICAgIFwiODkyN1wiOiBcImN1cmx5ZXFzdWNjO1wiLFxuICAgIFwiODkyOFwiOiBcIm5wcmN1ZTtcIixcbiAgICBcIjg5MjlcIjogXCJuc2NjdWU7XCIsXG4gICAgXCI4OTMwXCI6IFwibnNxc3ViZTtcIixcbiAgICBcIjg5MzFcIjogXCJuc3FzdXBlO1wiLFxuICAgIFwiODkzNFwiOiBcImxuc2ltO1wiLFxuICAgIFwiODkzNVwiOiBcImduc2ltO1wiLFxuICAgIFwiODkzNlwiOiBcInBybnNpbTtcIixcbiAgICBcIjg5MzdcIjogXCJzdWNjbnNpbTtcIixcbiAgICBcIjg5MzhcIjogXCJudHJpYW5nbGVsZWZ0O1wiLFxuICAgIFwiODkzOVwiOiBcIm50cmlhbmdsZXJpZ2h0O1wiLFxuICAgIFwiODk0MFwiOiBcIm50cmlhbmdsZWxlZnRlcTtcIixcbiAgICBcIjg5NDFcIjogXCJudHJpYW5nbGVyaWdodGVxO1wiLFxuICAgIFwiODk0MlwiOiBcInZlbGxpcDtcIixcbiAgICBcIjg5NDNcIjogXCJjdGRvdDtcIixcbiAgICBcIjg5NDRcIjogXCJ1dGRvdDtcIixcbiAgICBcIjg5NDVcIjogXCJkdGRvdDtcIixcbiAgICBcIjg5NDZcIjogXCJkaXNpbjtcIixcbiAgICBcIjg5NDdcIjogXCJpc2luc3Y7XCIsXG4gICAgXCI4OTQ4XCI6IFwiaXNpbnM7XCIsXG4gICAgXCI4OTQ5XCI6IFwiaXNpbmRvdDtcIixcbiAgICBcIjg5NTBcIjogXCJub3RpbnZjO1wiLFxuICAgIFwiODk1MVwiOiBcIm5vdGludmI7XCIsXG4gICAgXCI4OTUzXCI6IFwiaXNpbkU7XCIsXG4gICAgXCI4OTU0XCI6IFwibmlzZDtcIixcbiAgICBcIjg5NTVcIjogXCJ4bmlzO1wiLFxuICAgIFwiODk1NlwiOiBcIm5pcztcIixcbiAgICBcIjg5NTdcIjogXCJub3RuaXZjO1wiLFxuICAgIFwiODk1OFwiOiBcIm5vdG5pdmI7XCIsXG4gICAgXCI4OTY1XCI6IFwiYmFyd2VkZ2U7XCIsXG4gICAgXCI4OTY2XCI6IFwiZG91YmxlYmFyd2VkZ2U7XCIsXG4gICAgXCI4OTY4XCI6IFwiTGVmdENlaWxpbmc7XCIsXG4gICAgXCI4OTY5XCI6IFwiUmlnaHRDZWlsaW5nO1wiLFxuICAgIFwiODk3MFwiOiBcImxmbG9vcjtcIixcbiAgICBcIjg5NzFcIjogXCJSaWdodEZsb29yO1wiLFxuICAgIFwiODk3MlwiOiBcImRyY3JvcDtcIixcbiAgICBcIjg5NzNcIjogXCJkbGNyb3A7XCIsXG4gICAgXCI4OTc0XCI6IFwidXJjcm9wO1wiLFxuICAgIFwiODk3NVwiOiBcInVsY3JvcDtcIixcbiAgICBcIjg5NzZcIjogXCJibm90O1wiLFxuICAgIFwiODk3OFwiOiBcInByb2ZsaW5lO1wiLFxuICAgIFwiODk3OVwiOiBcInByb2ZzdXJmO1wiLFxuICAgIFwiODk4MVwiOiBcInRlbHJlYztcIixcbiAgICBcIjg5ODJcIjogXCJ0YXJnZXQ7XCIsXG4gICAgXCI4OTg4XCI6IFwidWxjb3JuZXI7XCIsXG4gICAgXCI4OTg5XCI6IFwidXJjb3JuZXI7XCIsXG4gICAgXCI4OTkwXCI6IFwibGxjb3JuZXI7XCIsXG4gICAgXCI4OTkxXCI6IFwibHJjb3JuZXI7XCIsXG4gICAgXCI4OTk0XCI6IFwic2Zyb3duO1wiLFxuICAgIFwiODk5NVwiOiBcInNzbWlsZTtcIixcbiAgICBcIjkwMDVcIjogXCJjeWxjdHk7XCIsXG4gICAgXCI5MDA2XCI6IFwicHJvZmFsYXI7XCIsXG4gICAgXCI5MDE0XCI6IFwidG9wYm90O1wiLFxuICAgIFwiOTAyMVwiOiBcIm92YmFyO1wiLFxuICAgIFwiOTAyM1wiOiBcInNvbGJhcjtcIixcbiAgICBcIjkwODRcIjogXCJhbmd6YXJyO1wiLFxuICAgIFwiOTEzNlwiOiBcImxtb3VzdGFjaGU7XCIsXG4gICAgXCI5MTM3XCI6IFwicm1vdXN0YWNoZTtcIixcbiAgICBcIjkxNDBcIjogXCJ0YnJrO1wiLFxuICAgIFwiOTE0MVwiOiBcIlVuZGVyQnJhY2tldDtcIixcbiAgICBcIjkxNDJcIjogXCJiYnJrdGJyaztcIixcbiAgICBcIjkxODBcIjogXCJPdmVyUGFyZW50aGVzaXM7XCIsXG4gICAgXCI5MTgxXCI6IFwiVW5kZXJQYXJlbnRoZXNpcztcIixcbiAgICBcIjkxODJcIjogXCJPdmVyQnJhY2U7XCIsXG4gICAgXCI5MTgzXCI6IFwiVW5kZXJCcmFjZTtcIixcbiAgICBcIjkxODZcIjogXCJ0cnBleml1bTtcIixcbiAgICBcIjkxOTFcIjogXCJlbGludGVycztcIixcbiAgICBcIjkyNTFcIjogXCJibGFuaztcIixcbiAgICBcIjk0MTZcIjogXCJvUztcIixcbiAgICBcIjk0NzJcIjogXCJIb3Jpem9udGFsTGluZTtcIixcbiAgICBcIjk0NzRcIjogXCJib3h2O1wiLFxuICAgIFwiOTQ4NFwiOiBcImJveGRyO1wiLFxuICAgIFwiOTQ4OFwiOiBcImJveGRsO1wiLFxuICAgIFwiOTQ5MlwiOiBcImJveHVyO1wiLFxuICAgIFwiOTQ5NlwiOiBcImJveHVsO1wiLFxuICAgIFwiOTUwMFwiOiBcImJveHZyO1wiLFxuICAgIFwiOTUwOFwiOiBcImJveHZsO1wiLFxuICAgIFwiOTUxNlwiOiBcImJveGhkO1wiLFxuICAgIFwiOTUyNFwiOiBcImJveGh1O1wiLFxuICAgIFwiOTUzMlwiOiBcImJveHZoO1wiLFxuICAgIFwiOTU1MlwiOiBcImJveEg7XCIsXG4gICAgXCI5NTUzXCI6IFwiYm94VjtcIixcbiAgICBcIjk1NTRcIjogXCJib3hkUjtcIixcbiAgICBcIjk1NTVcIjogXCJib3hEcjtcIixcbiAgICBcIjk1NTZcIjogXCJib3hEUjtcIixcbiAgICBcIjk1NTdcIjogXCJib3hkTDtcIixcbiAgICBcIjk1NThcIjogXCJib3hEbDtcIixcbiAgICBcIjk1NTlcIjogXCJib3hETDtcIixcbiAgICBcIjk1NjBcIjogXCJib3h1UjtcIixcbiAgICBcIjk1NjFcIjogXCJib3hVcjtcIixcbiAgICBcIjk1NjJcIjogXCJib3hVUjtcIixcbiAgICBcIjk1NjNcIjogXCJib3h1TDtcIixcbiAgICBcIjk1NjRcIjogXCJib3hVbDtcIixcbiAgICBcIjk1NjVcIjogXCJib3hVTDtcIixcbiAgICBcIjk1NjZcIjogXCJib3h2UjtcIixcbiAgICBcIjk1NjdcIjogXCJib3hWcjtcIixcbiAgICBcIjk1NjhcIjogXCJib3hWUjtcIixcbiAgICBcIjk1NjlcIjogXCJib3h2TDtcIixcbiAgICBcIjk1NzBcIjogXCJib3hWbDtcIixcbiAgICBcIjk1NzFcIjogXCJib3hWTDtcIixcbiAgICBcIjk1NzJcIjogXCJib3hIZDtcIixcbiAgICBcIjk1NzNcIjogXCJib3hoRDtcIixcbiAgICBcIjk1NzRcIjogXCJib3hIRDtcIixcbiAgICBcIjk1NzVcIjogXCJib3hIdTtcIixcbiAgICBcIjk1NzZcIjogXCJib3hoVTtcIixcbiAgICBcIjk1NzdcIjogXCJib3hIVTtcIixcbiAgICBcIjk1NzhcIjogXCJib3h2SDtcIixcbiAgICBcIjk1NzlcIjogXCJib3hWaDtcIixcbiAgICBcIjk1ODBcIjogXCJib3hWSDtcIixcbiAgICBcIjk2MDBcIjogXCJ1aGJsaztcIixcbiAgICBcIjk2MDRcIjogXCJsaGJsaztcIixcbiAgICBcIjk2MDhcIjogXCJibG9jaztcIixcbiAgICBcIjk2MTdcIjogXCJibGsxNDtcIixcbiAgICBcIjk2MThcIjogXCJibGsxMjtcIixcbiAgICBcIjk2MTlcIjogXCJibGszNDtcIixcbiAgICBcIjk2MzNcIjogXCJzcXVhcmU7XCIsXG4gICAgXCI5NjQyXCI6IFwic3F1ZjtcIixcbiAgICBcIjk2NDNcIjogXCJFbXB0eVZlcnlTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk2NDVcIjogXCJyZWN0O1wiLFxuICAgIFwiOTY0NlwiOiBcIm1hcmtlcjtcIixcbiAgICBcIjk2NDlcIjogXCJmbHRucztcIixcbiAgICBcIjk2NTFcIjogXCJ4dXRyaTtcIixcbiAgICBcIjk2NTJcIjogXCJ1dHJpZjtcIixcbiAgICBcIjk2NTNcIjogXCJ1dHJpO1wiLFxuICAgIFwiOTY1NlwiOiBcInJ0cmlmO1wiLFxuICAgIFwiOTY1N1wiOiBcInRyaWFuZ2xlcmlnaHQ7XCIsXG4gICAgXCI5NjYxXCI6IFwieGR0cmk7XCIsXG4gICAgXCI5NjYyXCI6IFwiZHRyaWY7XCIsXG4gICAgXCI5NjYzXCI6IFwidHJpYW5nbGVkb3duO1wiLFxuICAgIFwiOTY2NlwiOiBcImx0cmlmO1wiLFxuICAgIFwiOTY2N1wiOiBcInRyaWFuZ2xlbGVmdDtcIixcbiAgICBcIjk2NzRcIjogXCJsb3plbmdlO1wiLFxuICAgIFwiOTY3NVwiOiBcImNpcjtcIixcbiAgICBcIjk3MDhcIjogXCJ0cmlkb3Q7XCIsXG4gICAgXCI5NzExXCI6IFwieGNpcmM7XCIsXG4gICAgXCI5NzIwXCI6IFwidWx0cmk7XCIsXG4gICAgXCI5NzIxXCI6IFwidXJ0cmk7XCIsXG4gICAgXCI5NzIyXCI6IFwibGx0cmk7XCIsXG4gICAgXCI5NzIzXCI6IFwiRW1wdHlTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk3MjRcIjogXCJGaWxsZWRTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk3MzNcIjogXCJzdGFyZjtcIixcbiAgICBcIjk3MzRcIjogXCJzdGFyO1wiLFxuICAgIFwiOTc0MlwiOiBcInBob25lO1wiLFxuICAgIFwiOTc5MlwiOiBcImZlbWFsZTtcIixcbiAgICBcIjk3OTRcIjogXCJtYWxlO1wiLFxuICAgIFwiOTgyNFwiOiBcInNwYWRlc3VpdDtcIixcbiAgICBcIjk4MjdcIjogXCJjbHVic3VpdDtcIixcbiAgICBcIjk4MjlcIjogXCJoZWFydHN1aXQ7XCIsXG4gICAgXCI5ODMwXCI6IFwiZGlhbXM7XCIsXG4gICAgXCI5ODM0XCI6IFwic3VuZztcIixcbiAgICBcIjk4MzdcIjogXCJmbGF0O1wiLFxuICAgIFwiOTgzOFwiOiBcIm5hdHVyYWw7XCIsXG4gICAgXCI5ODM5XCI6IFwic2hhcnA7XCIsXG4gICAgXCIxMDAwM1wiOiBcImNoZWNrbWFyaztcIixcbiAgICBcIjEwMDA3XCI6IFwiY3Jvc3M7XCIsXG4gICAgXCIxMDAxNlwiOiBcIm1hbHRlc2U7XCIsXG4gICAgXCIxMDAzOFwiOiBcInNleHQ7XCIsXG4gICAgXCIxMDA3MlwiOiBcIlZlcnRpY2FsU2VwYXJhdG9yO1wiLFxuICAgIFwiMTAwOThcIjogXCJsYmJyaztcIixcbiAgICBcIjEwMDk5XCI6IFwicmJicms7XCIsXG4gICAgXCIxMDE4NFwiOiBcImJzb2xoc3ViO1wiLFxuICAgIFwiMTAxODVcIjogXCJzdXBoc29sO1wiLFxuICAgIFwiMTAyMTRcIjogXCJsb2JyaztcIixcbiAgICBcIjEwMjE1XCI6IFwicm9icms7XCIsXG4gICAgXCIxMDIxNlwiOiBcIkxlZnRBbmdsZUJyYWNrZXQ7XCIsXG4gICAgXCIxMDIxN1wiOiBcIlJpZ2h0QW5nbGVCcmFja2V0O1wiLFxuICAgIFwiMTAyMThcIjogXCJMYW5nO1wiLFxuICAgIFwiMTAyMTlcIjogXCJSYW5nO1wiLFxuICAgIFwiMTAyMjBcIjogXCJsb2FuZztcIixcbiAgICBcIjEwMjIxXCI6IFwicm9hbmc7XCIsXG4gICAgXCIxMDIyOVwiOiBcInhsYXJyO1wiLFxuICAgIFwiMTAyMzBcIjogXCJ4cmFycjtcIixcbiAgICBcIjEwMjMxXCI6IFwieGhhcnI7XCIsXG4gICAgXCIxMDIzMlwiOiBcInhsQXJyO1wiLFxuICAgIFwiMTAyMzNcIjogXCJ4ckFycjtcIixcbiAgICBcIjEwMjM0XCI6IFwieGhBcnI7XCIsXG4gICAgXCIxMDIzNlwiOiBcInhtYXA7XCIsXG4gICAgXCIxMDIzOVwiOiBcImR6aWdyYXJyO1wiLFxuICAgIFwiMTA0OThcIjogXCJudmxBcnI7XCIsXG4gICAgXCIxMDQ5OVwiOiBcIm52ckFycjtcIixcbiAgICBcIjEwNTAwXCI6IFwibnZIYXJyO1wiLFxuICAgIFwiMTA1MDFcIjogXCJNYXA7XCIsXG4gICAgXCIxMDUwOFwiOiBcImxiYXJyO1wiLFxuICAgIFwiMTA1MDlcIjogXCJyYmFycjtcIixcbiAgICBcIjEwNTEwXCI6IFwibEJhcnI7XCIsXG4gICAgXCIxMDUxMVwiOiBcInJCYXJyO1wiLFxuICAgIFwiMTA1MTJcIjogXCJSQmFycjtcIixcbiAgICBcIjEwNTEzXCI6IFwiRERvdHJhaGQ7XCIsXG4gICAgXCIxMDUxNFwiOiBcIlVwQXJyb3dCYXI7XCIsXG4gICAgXCIxMDUxNVwiOiBcIkRvd25BcnJvd0JhcjtcIixcbiAgICBcIjEwNTE4XCI6IFwiUmFycnRsO1wiLFxuICAgIFwiMTA1MjFcIjogXCJsYXRhaWw7XCIsXG4gICAgXCIxMDUyMlwiOiBcInJhdGFpbDtcIixcbiAgICBcIjEwNTIzXCI6IFwibEF0YWlsO1wiLFxuICAgIFwiMTA1MjRcIjogXCJyQXRhaWw7XCIsXG4gICAgXCIxMDUyNVwiOiBcImxhcnJmcztcIixcbiAgICBcIjEwNTI2XCI6IFwicmFycmZzO1wiLFxuICAgIFwiMTA1MjdcIjogXCJsYXJyYmZzO1wiLFxuICAgIFwiMTA1MjhcIjogXCJyYXJyYmZzO1wiLFxuICAgIFwiMTA1MzFcIjogXCJud2FyaGs7XCIsXG4gICAgXCIxMDUzMlwiOiBcIm5lYXJoaztcIixcbiAgICBcIjEwNTMzXCI6IFwic2VhcmhrO1wiLFxuICAgIFwiMTA1MzRcIjogXCJzd2FyaGs7XCIsXG4gICAgXCIxMDUzNVwiOiBcIm53bmVhcjtcIixcbiAgICBcIjEwNTM2XCI6IFwidG9lYTtcIixcbiAgICBcIjEwNTM3XCI6IFwidG9zYTtcIixcbiAgICBcIjEwNTM4XCI6IFwic3dud2FyO1wiLFxuICAgIFwiMTA1NDdcIjogXCJyYXJyYztcIixcbiAgICBcIjEwNTQ5XCI6IFwiY3VkYXJycjtcIixcbiAgICBcIjEwNTUwXCI6IFwibGRjYTtcIixcbiAgICBcIjEwNTUxXCI6IFwicmRjYTtcIixcbiAgICBcIjEwNTUyXCI6IFwiY3VkYXJybDtcIixcbiAgICBcIjEwNTUzXCI6IFwibGFycnBsO1wiLFxuICAgIFwiMTA1NTZcIjogXCJjdXJhcnJtO1wiLFxuICAgIFwiMTA1NTdcIjogXCJjdWxhcnJwO1wiLFxuICAgIFwiMTA1NjVcIjogXCJyYXJycGw7XCIsXG4gICAgXCIxMDU2OFwiOiBcImhhcnJjaXI7XCIsXG4gICAgXCIxMDU2OVwiOiBcIlVhcnJvY2lyO1wiLFxuICAgIFwiMTA1NzBcIjogXCJsdXJkc2hhcjtcIixcbiAgICBcIjEwNTcxXCI6IFwibGRydXNoYXI7XCIsXG4gICAgXCIxMDU3NFwiOiBcIkxlZnRSaWdodFZlY3RvcjtcIixcbiAgICBcIjEwNTc1XCI6IFwiUmlnaHRVcERvd25WZWN0b3I7XCIsXG4gICAgXCIxMDU3NlwiOiBcIkRvd25MZWZ0UmlnaHRWZWN0b3I7XCIsXG4gICAgXCIxMDU3N1wiOiBcIkxlZnRVcERvd25WZWN0b3I7XCIsXG4gICAgXCIxMDU3OFwiOiBcIkxlZnRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU3OVwiOiBcIlJpZ2h0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODBcIjogXCJSaWdodFVwVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODFcIjogXCJSaWdodERvd25WZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MlwiOiBcIkRvd25MZWZ0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODNcIjogXCJEb3duUmlnaHRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4NFwiOiBcIkxlZnRVcFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg1XCI6IFwiTGVmdERvd25WZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4NlwiOiBcIkxlZnRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4N1wiOiBcIlJpZ2h0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1ODhcIjogXCJSaWdodFVwVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1ODlcIjogXCJSaWdodERvd25UZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MFwiOiBcIkRvd25MZWZ0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTFcIjogXCJEb3duUmlnaHRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MlwiOiBcIkxlZnRVcFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkzXCI6IFwiTGVmdERvd25UZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5NFwiOiBcImxIYXI7XCIsXG4gICAgXCIxMDU5NVwiOiBcInVIYXI7XCIsXG4gICAgXCIxMDU5NlwiOiBcInJIYXI7XCIsXG4gICAgXCIxMDU5N1wiOiBcImRIYXI7XCIsXG4gICAgXCIxMDU5OFwiOiBcImx1cnVoYXI7XCIsXG4gICAgXCIxMDU5OVwiOiBcImxkcmRoYXI7XCIsXG4gICAgXCIxMDYwMFwiOiBcInJ1bHVoYXI7XCIsXG4gICAgXCIxMDYwMVwiOiBcInJkbGRoYXI7XCIsXG4gICAgXCIxMDYwMlwiOiBcImxoYXJ1bDtcIixcbiAgICBcIjEwNjAzXCI6IFwibGxoYXJkO1wiLFxuICAgIFwiMTA2MDRcIjogXCJyaGFydWw7XCIsXG4gICAgXCIxMDYwNVwiOiBcImxyaGFyZDtcIixcbiAgICBcIjEwNjA2XCI6IFwiVXBFcXVpbGlicml1bTtcIixcbiAgICBcIjEwNjA3XCI6IFwiUmV2ZXJzZVVwRXF1aWxpYnJpdW07XCIsXG4gICAgXCIxMDYwOFwiOiBcIlJvdW5kSW1wbGllcztcIixcbiAgICBcIjEwNjA5XCI6IFwiZXJhcnI7XCIsXG4gICAgXCIxMDYxMFwiOiBcInNpbXJhcnI7XCIsXG4gICAgXCIxMDYxMVwiOiBcImxhcnJzaW07XCIsXG4gICAgXCIxMDYxMlwiOiBcInJhcnJzaW07XCIsXG4gICAgXCIxMDYxM1wiOiBcInJhcnJhcDtcIixcbiAgICBcIjEwNjE0XCI6IFwibHRsYXJyO1wiLFxuICAgIFwiMTA2MTZcIjogXCJndHJhcnI7XCIsXG4gICAgXCIxMDYxN1wiOiBcInN1YnJhcnI7XCIsXG4gICAgXCIxMDYxOVwiOiBcInN1cGxhcnI7XCIsXG4gICAgXCIxMDYyMFwiOiBcImxmaXNodDtcIixcbiAgICBcIjEwNjIxXCI6IFwicmZpc2h0O1wiLFxuICAgIFwiMTA2MjJcIjogXCJ1ZmlzaHQ7XCIsXG4gICAgXCIxMDYyM1wiOiBcImRmaXNodDtcIixcbiAgICBcIjEwNjI5XCI6IFwibG9wYXI7XCIsXG4gICAgXCIxMDYzMFwiOiBcInJvcGFyO1wiLFxuICAgIFwiMTA2MzVcIjogXCJsYnJrZTtcIixcbiAgICBcIjEwNjM2XCI6IFwicmJya2U7XCIsXG4gICAgXCIxMDYzN1wiOiBcImxicmtzbHU7XCIsXG4gICAgXCIxMDYzOFwiOiBcInJicmtzbGQ7XCIsXG4gICAgXCIxMDYzOVwiOiBcImxicmtzbGQ7XCIsXG4gICAgXCIxMDY0MFwiOiBcInJicmtzbHU7XCIsXG4gICAgXCIxMDY0MVwiOiBcImxhbmdkO1wiLFxuICAgIFwiMTA2NDJcIjogXCJyYW5nZDtcIixcbiAgICBcIjEwNjQzXCI6IFwibHBhcmx0O1wiLFxuICAgIFwiMTA2NDRcIjogXCJycGFyZ3Q7XCIsXG4gICAgXCIxMDY0NVwiOiBcImd0bFBhcjtcIixcbiAgICBcIjEwNjQ2XCI6IFwibHRyUGFyO1wiLFxuICAgIFwiMTA2NTBcIjogXCJ2emlnemFnO1wiLFxuICAgIFwiMTA2NTJcIjogXCJ2YW5ncnQ7XCIsXG4gICAgXCIxMDY1M1wiOiBcImFuZ3J0dmJkO1wiLFxuICAgIFwiMTA2NjBcIjogXCJhbmdlO1wiLFxuICAgIFwiMTA2NjFcIjogXCJyYW5nZTtcIixcbiAgICBcIjEwNjYyXCI6IFwiZHdhbmdsZTtcIixcbiAgICBcIjEwNjYzXCI6IFwidXdhbmdsZTtcIixcbiAgICBcIjEwNjY0XCI6IFwiYW5nbXNkYWE7XCIsXG4gICAgXCIxMDY2NVwiOiBcImFuZ21zZGFiO1wiLFxuICAgIFwiMTA2NjZcIjogXCJhbmdtc2RhYztcIixcbiAgICBcIjEwNjY3XCI6IFwiYW5nbXNkYWQ7XCIsXG4gICAgXCIxMDY2OFwiOiBcImFuZ21zZGFlO1wiLFxuICAgIFwiMTA2NjlcIjogXCJhbmdtc2RhZjtcIixcbiAgICBcIjEwNjcwXCI6IFwiYW5nbXNkYWc7XCIsXG4gICAgXCIxMDY3MVwiOiBcImFuZ21zZGFoO1wiLFxuICAgIFwiMTA2NzJcIjogXCJiZW1wdHl2O1wiLFxuICAgIFwiMTA2NzNcIjogXCJkZW1wdHl2O1wiLFxuICAgIFwiMTA2NzRcIjogXCJjZW1wdHl2O1wiLFxuICAgIFwiMTA2NzVcIjogXCJyYWVtcHR5djtcIixcbiAgICBcIjEwNjc2XCI6IFwibGFlbXB0eXY7XCIsXG4gICAgXCIxMDY3N1wiOiBcIm9oYmFyO1wiLFxuICAgIFwiMTA2NzhcIjogXCJvbWlkO1wiLFxuICAgIFwiMTA2NzlcIjogXCJvcGFyO1wiLFxuICAgIFwiMTA2ODFcIjogXCJvcGVycDtcIixcbiAgICBcIjEwNjgzXCI6IFwib2xjcm9zcztcIixcbiAgICBcIjEwNjg0XCI6IFwib2Rzb2xkO1wiLFxuICAgIFwiMTA2ODZcIjogXCJvbGNpcjtcIixcbiAgICBcIjEwNjg3XCI6IFwib2ZjaXI7XCIsXG4gICAgXCIxMDY4OFwiOiBcIm9sdDtcIixcbiAgICBcIjEwNjg5XCI6IFwib2d0O1wiLFxuICAgIFwiMTA2OTBcIjogXCJjaXJzY2lyO1wiLFxuICAgIFwiMTA2OTFcIjogXCJjaXJFO1wiLFxuICAgIFwiMTA2OTJcIjogXCJzb2xiO1wiLFxuICAgIFwiMTA2OTNcIjogXCJic29sYjtcIixcbiAgICBcIjEwNjk3XCI6IFwiYm94Ym94O1wiLFxuICAgIFwiMTA3MDFcIjogXCJ0cmlzYjtcIixcbiAgICBcIjEwNzAyXCI6IFwicnRyaWx0cmk7XCIsXG4gICAgXCIxMDcwM1wiOiBcIkxlZnRUcmlhbmdsZUJhcjtcIixcbiAgICBcIjEwNzA0XCI6IFwiUmlnaHRUcmlhbmdsZUJhcjtcIixcbiAgICBcIjEwNzE2XCI6IFwiaWluZmluO1wiLFxuICAgIFwiMTA3MTdcIjogXCJpbmZpbnRpZTtcIixcbiAgICBcIjEwNzE4XCI6IFwibnZpbmZpbjtcIixcbiAgICBcIjEwNzIzXCI6IFwiZXBhcnNsO1wiLFxuICAgIFwiMTA3MjRcIjogXCJzbWVwYXJzbDtcIixcbiAgICBcIjEwNzI1XCI6IFwiZXF2cGFyc2w7XCIsXG4gICAgXCIxMDczMVwiOiBcImxvemY7XCIsXG4gICAgXCIxMDc0MFwiOiBcIlJ1bGVEZWxheWVkO1wiLFxuICAgIFwiMTA3NDJcIjogXCJkc29sO1wiLFxuICAgIFwiMTA3NTJcIjogXCJ4b2RvdDtcIixcbiAgICBcIjEwNzUzXCI6IFwieG9wbHVzO1wiLFxuICAgIFwiMTA3NTRcIjogXCJ4b3RpbWU7XCIsXG4gICAgXCIxMDc1NlwiOiBcInh1cGx1cztcIixcbiAgICBcIjEwNzU4XCI6IFwieHNxY3VwO1wiLFxuICAgIFwiMTA3NjRcIjogXCJxaW50O1wiLFxuICAgIFwiMTA3NjVcIjogXCJmcGFydGludDtcIixcbiAgICBcIjEwNzY4XCI6IFwiY2lyZm5pbnQ7XCIsXG4gICAgXCIxMDc2OVwiOiBcImF3aW50O1wiLFxuICAgIFwiMTA3NzBcIjogXCJycHBvbGludDtcIixcbiAgICBcIjEwNzcxXCI6IFwic2Nwb2xpbnQ7XCIsXG4gICAgXCIxMDc3MlwiOiBcIm5wb2xpbnQ7XCIsXG4gICAgXCIxMDc3M1wiOiBcInBvaW50aW50O1wiLFxuICAgIFwiMTA3NzRcIjogXCJxdWF0aW50O1wiLFxuICAgIFwiMTA3NzVcIjogXCJpbnRsYXJoaztcIixcbiAgICBcIjEwNzg2XCI6IFwicGx1c2NpcjtcIixcbiAgICBcIjEwNzg3XCI6IFwicGx1c2FjaXI7XCIsXG4gICAgXCIxMDc4OFwiOiBcInNpbXBsdXM7XCIsXG4gICAgXCIxMDc4OVwiOiBcInBsdXNkdTtcIixcbiAgICBcIjEwNzkwXCI6IFwicGx1c3NpbTtcIixcbiAgICBcIjEwNzkxXCI6IFwicGx1c3R3bztcIixcbiAgICBcIjEwNzkzXCI6IFwibWNvbW1hO1wiLFxuICAgIFwiMTA3OTRcIjogXCJtaW51c2R1O1wiLFxuICAgIFwiMTA3OTdcIjogXCJsb3BsdXM7XCIsXG4gICAgXCIxMDc5OFwiOiBcInJvcGx1cztcIixcbiAgICBcIjEwNzk5XCI6IFwiQ3Jvc3M7XCIsXG4gICAgXCIxMDgwMFwiOiBcInRpbWVzZDtcIixcbiAgICBcIjEwODAxXCI6IFwidGltZXNiYXI7XCIsXG4gICAgXCIxMDgwM1wiOiBcInNtYXNocDtcIixcbiAgICBcIjEwODA0XCI6IFwibG90aW1lcztcIixcbiAgICBcIjEwODA1XCI6IFwicm90aW1lcztcIixcbiAgICBcIjEwODA2XCI6IFwib3RpbWVzYXM7XCIsXG4gICAgXCIxMDgwN1wiOiBcIk90aW1lcztcIixcbiAgICBcIjEwODA4XCI6IFwib2RpdjtcIixcbiAgICBcIjEwODA5XCI6IFwidHJpcGx1cztcIixcbiAgICBcIjEwODEwXCI6IFwidHJpbWludXM7XCIsXG4gICAgXCIxMDgxMVwiOiBcInRyaXRpbWU7XCIsXG4gICAgXCIxMDgxMlwiOiBcImlwcm9kO1wiLFxuICAgIFwiMTA4MTVcIjogXCJhbWFsZztcIixcbiAgICBcIjEwODE2XCI6IFwiY2FwZG90O1wiLFxuICAgIFwiMTA4MThcIjogXCJuY3VwO1wiLFxuICAgIFwiMTA4MTlcIjogXCJuY2FwO1wiLFxuICAgIFwiMTA4MjBcIjogXCJjYXBhbmQ7XCIsXG4gICAgXCIxMDgyMVwiOiBcImN1cG9yO1wiLFxuICAgIFwiMTA4MjJcIjogXCJjdXBjYXA7XCIsXG4gICAgXCIxMDgyM1wiOiBcImNhcGN1cDtcIixcbiAgICBcIjEwODI0XCI6IFwiY3VwYnJjYXA7XCIsXG4gICAgXCIxMDgyNVwiOiBcImNhcGJyY3VwO1wiLFxuICAgIFwiMTA4MjZcIjogXCJjdXBjdXA7XCIsXG4gICAgXCIxMDgyN1wiOiBcImNhcGNhcDtcIixcbiAgICBcIjEwODI4XCI6IFwiY2N1cHM7XCIsXG4gICAgXCIxMDgyOVwiOiBcImNjYXBzO1wiLFxuICAgIFwiMTA4MzJcIjogXCJjY3Vwc3NtO1wiLFxuICAgIFwiMTA4MzVcIjogXCJBbmQ7XCIsXG4gICAgXCIxMDgzNlwiOiBcIk9yO1wiLFxuICAgIFwiMTA4MzdcIjogXCJhbmRhbmQ7XCIsXG4gICAgXCIxMDgzOFwiOiBcIm9yb3I7XCIsXG4gICAgXCIxMDgzOVwiOiBcIm9yc2xvcGU7XCIsXG4gICAgXCIxMDg0MFwiOiBcImFuZHNsb3BlO1wiLFxuICAgIFwiMTA4NDJcIjogXCJhbmR2O1wiLFxuICAgIFwiMTA4NDNcIjogXCJvcnY7XCIsXG4gICAgXCIxMDg0NFwiOiBcImFuZGQ7XCIsXG4gICAgXCIxMDg0NVwiOiBcIm9yZDtcIixcbiAgICBcIjEwODQ3XCI6IFwid2VkYmFyO1wiLFxuICAgIFwiMTA4NTRcIjogXCJzZG90ZTtcIixcbiAgICBcIjEwODU4XCI6IFwic2ltZG90O1wiLFxuICAgIFwiMTA4NjFcIjogXCJjb25nZG90O1wiLFxuICAgIFwiMTA4NjJcIjogXCJlYXN0ZXI7XCIsXG4gICAgXCIxMDg2M1wiOiBcImFwYWNpcjtcIixcbiAgICBcIjEwODY0XCI6IFwiYXBFO1wiLFxuICAgIFwiMTA4NjVcIjogXCJlcGx1cztcIixcbiAgICBcIjEwODY2XCI6IFwicGx1c2U7XCIsXG4gICAgXCIxMDg2N1wiOiBcIkVzaW07XCIsXG4gICAgXCIxMDg2OFwiOiBcIkNvbG9uZTtcIixcbiAgICBcIjEwODY5XCI6IFwiRXF1YWw7XCIsXG4gICAgXCIxMDg3MVwiOiBcImVERG90O1wiLFxuICAgIFwiMTA4NzJcIjogXCJlcXVpdkREO1wiLFxuICAgIFwiMTA4NzNcIjogXCJsdGNpcjtcIixcbiAgICBcIjEwODc0XCI6IFwiZ3RjaXI7XCIsXG4gICAgXCIxMDg3NVwiOiBcImx0cXVlc3Q7XCIsXG4gICAgXCIxMDg3NlwiOiBcImd0cXVlc3Q7XCIsXG4gICAgXCIxMDg3N1wiOiBcIkxlc3NTbGFudEVxdWFsO1wiLFxuICAgIFwiMTA4NzhcIjogXCJHcmVhdGVyU2xhbnRFcXVhbDtcIixcbiAgICBcIjEwODc5XCI6IFwibGVzZG90O1wiLFxuICAgIFwiMTA4ODBcIjogXCJnZXNkb3Q7XCIsXG4gICAgXCIxMDg4MVwiOiBcImxlc2RvdG87XCIsXG4gICAgXCIxMDg4MlwiOiBcImdlc2RvdG87XCIsXG4gICAgXCIxMDg4M1wiOiBcImxlc2RvdG9yO1wiLFxuICAgIFwiMTA4ODRcIjogXCJnZXNkb3RvbDtcIixcbiAgICBcIjEwODg1XCI6IFwibGVzc2FwcHJveDtcIixcbiAgICBcIjEwODg2XCI6IFwiZ3RyYXBwcm94O1wiLFxuICAgIFwiMTA4ODdcIjogXCJsbmVxO1wiLFxuICAgIFwiMTA4ODhcIjogXCJnbmVxO1wiLFxuICAgIFwiMTA4ODlcIjogXCJsbmFwcHJveDtcIixcbiAgICBcIjEwODkwXCI6IFwiZ25hcHByb3g7XCIsXG4gICAgXCIxMDg5MVwiOiBcImxlc3NlcXFndHI7XCIsXG4gICAgXCIxMDg5MlwiOiBcImd0cmVxcWxlc3M7XCIsXG4gICAgXCIxMDg5M1wiOiBcImxzaW1lO1wiLFxuICAgIFwiMTA4OTRcIjogXCJnc2ltZTtcIixcbiAgICBcIjEwODk1XCI6IFwibHNpbWc7XCIsXG4gICAgXCIxMDg5NlwiOiBcImdzaW1sO1wiLFxuICAgIFwiMTA4OTdcIjogXCJsZ0U7XCIsXG4gICAgXCIxMDg5OFwiOiBcImdsRTtcIixcbiAgICBcIjEwODk5XCI6IFwibGVzZ2VzO1wiLFxuICAgIFwiMTA5MDBcIjogXCJnZXNsZXM7XCIsXG4gICAgXCIxMDkwMVwiOiBcImVxc2xhbnRsZXNzO1wiLFxuICAgIFwiMTA5MDJcIjogXCJlcXNsYW50Z3RyO1wiLFxuICAgIFwiMTA5MDNcIjogXCJlbHNkb3Q7XCIsXG4gICAgXCIxMDkwNFwiOiBcImVnc2RvdDtcIixcbiAgICBcIjEwOTA1XCI6IFwiZWw7XCIsXG4gICAgXCIxMDkwNlwiOiBcImVnO1wiLFxuICAgIFwiMTA5MDlcIjogXCJzaW1sO1wiLFxuICAgIFwiMTA5MTBcIjogXCJzaW1nO1wiLFxuICAgIFwiMTA5MTFcIjogXCJzaW1sRTtcIixcbiAgICBcIjEwOTEyXCI6IFwic2ltZ0U7XCIsXG4gICAgXCIxMDkxM1wiOiBcIkxlc3NMZXNzO1wiLFxuICAgIFwiMTA5MTRcIjogXCJHcmVhdGVyR3JlYXRlcjtcIixcbiAgICBcIjEwOTE2XCI6IFwiZ2xqO1wiLFxuICAgIFwiMTA5MTdcIjogXCJnbGE7XCIsXG4gICAgXCIxMDkxOFwiOiBcImx0Y2M7XCIsXG4gICAgXCIxMDkxOVwiOiBcImd0Y2M7XCIsXG4gICAgXCIxMDkyMFwiOiBcImxlc2NjO1wiLFxuICAgIFwiMTA5MjFcIjogXCJnZXNjYztcIixcbiAgICBcIjEwOTIyXCI6IFwic210O1wiLFxuICAgIFwiMTA5MjNcIjogXCJsYXQ7XCIsXG4gICAgXCIxMDkyNFwiOiBcInNtdGU7XCIsXG4gICAgXCIxMDkyNVwiOiBcImxhdGU7XCIsXG4gICAgXCIxMDkyNlwiOiBcImJ1bXBFO1wiLFxuICAgIFwiMTA5MjdcIjogXCJwcmVjZXE7XCIsXG4gICAgXCIxMDkyOFwiOiBcInN1Y2NlcTtcIixcbiAgICBcIjEwOTMxXCI6IFwicHJFO1wiLFxuICAgIFwiMTA5MzJcIjogXCJzY0U7XCIsXG4gICAgXCIxMDkzM1wiOiBcInBybkU7XCIsXG4gICAgXCIxMDkzNFwiOiBcInN1Y2NuZXFxO1wiLFxuICAgIFwiMTA5MzVcIjogXCJwcmVjYXBwcm94O1wiLFxuICAgIFwiMTA5MzZcIjogXCJzdWNjYXBwcm94O1wiLFxuICAgIFwiMTA5MzdcIjogXCJwcm5hcDtcIixcbiAgICBcIjEwOTM4XCI6IFwic3VjY25hcHByb3g7XCIsXG4gICAgXCIxMDkzOVwiOiBcIlByO1wiLFxuICAgIFwiMTA5NDBcIjogXCJTYztcIixcbiAgICBcIjEwOTQxXCI6IFwic3ViZG90O1wiLFxuICAgIFwiMTA5NDJcIjogXCJzdXBkb3Q7XCIsXG4gICAgXCIxMDk0M1wiOiBcInN1YnBsdXM7XCIsXG4gICAgXCIxMDk0NFwiOiBcInN1cHBsdXM7XCIsXG4gICAgXCIxMDk0NVwiOiBcInN1Ym11bHQ7XCIsXG4gICAgXCIxMDk0NlwiOiBcInN1cG11bHQ7XCIsXG4gICAgXCIxMDk0N1wiOiBcInN1YmVkb3Q7XCIsXG4gICAgXCIxMDk0OFwiOiBcInN1cGVkb3Q7XCIsXG4gICAgXCIxMDk0OVwiOiBcInN1YnNldGVxcTtcIixcbiAgICBcIjEwOTUwXCI6IFwic3Vwc2V0ZXFxO1wiLFxuICAgIFwiMTA5NTFcIjogXCJzdWJzaW07XCIsXG4gICAgXCIxMDk1MlwiOiBcInN1cHNpbTtcIixcbiAgICBcIjEwOTU1XCI6IFwic3Vic2V0bmVxcTtcIixcbiAgICBcIjEwOTU2XCI6IFwic3Vwc2V0bmVxcTtcIixcbiAgICBcIjEwOTU5XCI6IFwiY3N1YjtcIixcbiAgICBcIjEwOTYwXCI6IFwiY3N1cDtcIixcbiAgICBcIjEwOTYxXCI6IFwiY3N1YmU7XCIsXG4gICAgXCIxMDk2MlwiOiBcImNzdXBlO1wiLFxuICAgIFwiMTA5NjNcIjogXCJzdWJzdXA7XCIsXG4gICAgXCIxMDk2NFwiOiBcInN1cHN1YjtcIixcbiAgICBcIjEwOTY1XCI6IFwic3Vic3ViO1wiLFxuICAgIFwiMTA5NjZcIjogXCJzdXBzdXA7XCIsXG4gICAgXCIxMDk2N1wiOiBcInN1cGhzdWI7XCIsXG4gICAgXCIxMDk2OFwiOiBcInN1cGRzdWI7XCIsXG4gICAgXCIxMDk2OVwiOiBcImZvcmt2O1wiLFxuICAgIFwiMTA5NzBcIjogXCJ0b3Bmb3JrO1wiLFxuICAgIFwiMTA5NzFcIjogXCJtbGNwO1wiLFxuICAgIFwiMTA5ODBcIjogXCJEb3VibGVMZWZ0VGVlO1wiLFxuICAgIFwiMTA5ODJcIjogXCJWZGFzaGw7XCIsXG4gICAgXCIxMDk4M1wiOiBcIkJhcnY7XCIsXG4gICAgXCIxMDk4NFwiOiBcInZCYXI7XCIsXG4gICAgXCIxMDk4NVwiOiBcInZCYXJ2O1wiLFxuICAgIFwiMTA5ODdcIjogXCJWYmFyO1wiLFxuICAgIFwiMTA5ODhcIjogXCJOb3Q7XCIsXG4gICAgXCIxMDk4OVwiOiBcImJOb3Q7XCIsXG4gICAgXCIxMDk5MFwiOiBcInJubWlkO1wiLFxuICAgIFwiMTA5OTFcIjogXCJjaXJtaWQ7XCIsXG4gICAgXCIxMDk5MlwiOiBcIm1pZGNpcjtcIixcbiAgICBcIjEwOTkzXCI6IFwidG9wY2lyO1wiLFxuICAgIFwiMTA5OTRcIjogXCJuaHBhcjtcIixcbiAgICBcIjEwOTk1XCI6IFwicGFyc2ltO1wiLFxuICAgIFwiMTEwMDVcIjogXCJwYXJzbDtcIixcbiAgICBcIjY0MjU2XCI6IFwiZmZsaWc7XCIsXG4gICAgXCI2NDI1N1wiOiBcImZpbGlnO1wiLFxuICAgIFwiNjQyNThcIjogXCJmbGxpZztcIixcbiAgICBcIjY0MjU5XCI6IFwiZmZpbGlnO1wiLFxuICAgIFwiNjQyNjBcIjogXCJmZmxsaWc7XCJcbn0iLCJBbmFseXRpY3MgICAgPSByZXF1aXJlICcuL3V0aWxzL0FuYWx5dGljcydcbkF1dGhNYW5hZ2VyICA9IHJlcXVpcmUgJy4vdXRpbHMvQXV0aE1hbmFnZXInXG5TaGFyZSAgICAgICAgPSByZXF1aXJlICcuL3V0aWxzL1NoYXJlJ1xuRmFjZWJvb2sgICAgID0gcmVxdWlyZSAnLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4vdXRpbHMvR29vZ2xlUGx1cydcblRlbXBsYXRlcyAgICA9IHJlcXVpcmUgJy4vZGF0YS9UZW1wbGF0ZXMnXG5Mb2NhbGUgICAgICAgPSByZXF1aXJlICcuL2RhdGEvTG9jYWxlJ1xuUm91dGVyICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvUm91dGVyJ1xuTmF2ICAgICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvTmF2J1xuQXBwRGF0YSAgICAgID0gcmVxdWlyZSAnLi9BcHBEYXRhJ1xuQXBwVmlldyAgICAgID0gcmVxdWlyZSAnLi9BcHBWaWV3J1xuTWVkaWFRdWVyaWVzID0gcmVxdWlyZSAnLi91dGlscy9NZWRpYVF1ZXJpZXMnXG5cbmNsYXNzIEFwcFxuXG4gICAgTElWRSAgICAgICA6IG51bGxcbiAgICBCQVNFX1VSTCAgIDogd2luZG93LmNvbmZpZy5ob3N0bmFtZVxuICAgIGxvY2FsZUNvZGUgOiB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcbiAgICBvYmpSZWFkeSAgIDogMFxuXG4gICAgX3RvQ2xlYW4gICA6IFsnb2JqUmVhZHknLCAnc2V0RmxhZ3MnLCAnb2JqZWN0Q29tcGxldGUnLCAnaW5pdCcsICdpbml0T2JqZWN0cycsICdpbml0U0RLcycsICdpbml0QXBwJywgJ2dvJywgJ2NsZWFudXAnLCAnX3RvQ2xlYW4nXVxuXG4gICAgY29uc3RydWN0b3IgOiAoQExJVkUpIC0+XG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIHNldEZsYWdzIDogPT5cblxuICAgICAgICB1YSA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKClcblxuICAgICAgICBNZWRpYVF1ZXJpZXMuc2V0dXAoKTtcblxuICAgICAgICBASVNfQU5EUk9JRCAgICA9IHVhLmluZGV4T2YoJ2FuZHJvaWQnKSA+IC0xXG4gICAgICAgIEBJU19GSVJFRk9YICAgID0gdWEuaW5kZXhPZignZmlyZWZveCcpID4gLTFcbiAgICAgICAgQElTX0NIUk9NRV9JT1MgPSBpZiB1YS5tYXRjaCgnY3Jpb3MnKSB0aGVuIHRydWUgZWxzZSBmYWxzZSAjIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEzODA4MDUzXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaXNNb2JpbGUgOiA9PlxuXG4gICAgICAgIHJldHVybiBASVNfSU9TIG9yIEBJU19BTkRST0lEXG5cbiAgICBvYmplY3RDb21wbGV0ZSA6ID0+XG5cbiAgICAgICAgQG9ialJlYWR5KytcbiAgICAgICAgQGluaXRBcHAoKSBpZiBAb2JqUmVhZHkgPj0gNFxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEBpbml0T2JqZWN0cygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdE9iamVjdHMgOiA9PlxuXG4gICAgICAgIEB0ZW1wbGF0ZXMgPSBuZXcgVGVtcGxhdGVzIFwiL2RhdGEvdGVtcGxhdGVzI3soaWYgQExJVkUgdGhlbiAnLm1pbicgZWxzZSAnJyl9LnhtbFwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGxvY2FsZSAgICA9IG5ldyBMb2NhbGUgXCIvZGF0YS9sb2NhbGVzL3N0cmluZ3MuanNvblwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGFuYWx5dGljcyA9IG5ldyBBbmFseXRpY3MgXCIvZGF0YS90cmFja2luZy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYXBwRGF0YSAgID0gbmV3IEFwcERhdGEgQG9iamVjdENvbXBsZXRlXG5cbiAgICAgICAgIyBpZiBuZXcgb2JqZWN0cyBhcmUgYWRkZWQgZG9uJ3QgZm9yZ2V0IHRvIGNoYW5nZSB0aGUgYEBvYmplY3RDb21wbGV0ZWAgZnVuY3Rpb25cblxuICAgICAgICBudWxsXG5cbiAgICBpbml0U0RLcyA6ID0+XG5cbiAgICAgICAgRmFjZWJvb2subG9hZCgpXG4gICAgICAgIEdvb2dsZVBsdXMubG9hZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdEFwcCA6ID0+XG5cbiAgICAgICAgQHNldEZsYWdzKClcblxuICAgICAgICAjIyMgU3RhcnRzIGFwcGxpY2F0aW9uICMjI1xuICAgICAgICBAYXBwVmlldyA9IG5ldyBBcHBWaWV3XG4gICAgICAgIEByb3V0ZXIgID0gbmV3IFJvdXRlclxuICAgICAgICBAbmF2ICAgICA9IG5ldyBOYXZcbiAgICAgICAgQGF1dGggICAgPSBuZXcgQXV0aE1hbmFnZXJcbiAgICAgICAgQHNoYXJlICAgPSBuZXcgU2hhcmVcblxuICAgICAgICBAZ28oKVxuXG4gICAgICAgIEBpbml0U0RLcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ28gOiA9PlxuXG4gICAgICAgICMjIyBBZnRlciBldmVyeXRoaW5nIGlzIGxvYWRlZCwga2lja3Mgb2ZmIHdlYnNpdGUgIyMjXG4gICAgICAgIEBhcHBWaWV3LnJlbmRlcigpXG5cbiAgICAgICAgIyMjIHJlbW92ZSByZWR1bmRhbnQgaW5pdGlhbGlzYXRpb24gbWV0aG9kcyAvIHByb3BlcnRpZXMgIyMjXG4gICAgICAgIEBjbGVhbnVwKClcblxuICAgICAgICBudWxsXG5cbiAgICBjbGVhbnVwIDogPT5cblxuICAgICAgICBmb3IgZm4gaW4gQF90b0NsZWFuXG4gICAgICAgICAgICBAW2ZuXSA9IG51bGxcbiAgICAgICAgICAgIGRlbGV0ZSBAW2ZuXVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkFic3RyYWN0RGF0YSAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0Fic3RyYWN0RGF0YSdcblJlcXVlc3RlciAgICAgICAgID0gcmVxdWlyZSAnLi91dGlscy9SZXF1ZXN0ZXInXG5BUEkgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9BUEknXG5Eb29kbGVzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4vY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbidcblxuY2xhc3MgQXBwRGF0YSBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG4gICAgY2FsbGJhY2sgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IChAY2FsbGJhY2spIC0+XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYWRkIGFsbCBkYXRhIGNsYXNzZXMgaGVyZVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICBAZG9vZGxlcyA9IG5ldyBEb29kbGVzQ29sbGVjdGlvblxuXG4gICAgICAgIEBnZXRTdGFydERhdGEoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICAjIyNcbiAgICBnZXQgYXBwIGJvb3RzdHJhcCBkYXRhIC0gZW1iZWQgaW4gSFRNTCBvciBBUEkgZW5kcG9pbnRcbiAgICAjIyNcbiAgICBnZXRTdGFydERhdGEgOiA9PlxuICAgICAgICBcbiAgICAgICAgIyBpZiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgIGlmIHRydWVcblxuICAgICAgICAgICAgciA9IFJlcXVlc3Rlci5yZXF1ZXN0XG4gICAgICAgICAgICAgICAgIyB1cmwgIDogQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICAgICAgICAgIHVybCAgOiBAQ0QoKS5CQVNFX1VSTCArICcvZGF0YS9fRFVNTVkvZG9vZGxlcy5qc29uJ1xuICAgICAgICAgICAgICAgIHR5cGUgOiAnR0VUJ1xuXG4gICAgICAgICAgICByLmRvbmUgQG9uU3RhcnREYXRhUmVjZWl2ZWRcbiAgICAgICAgICAgIHIuZmFpbCA9PlxuXG4gICAgICAgICAgICAgICAgIyBjb25zb2xlLmVycm9yIFwiZXJyb3IgbG9hZGluZyBhcGkgc3RhcnQgZGF0YVwiXG5cbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICB0aGlzIGlzIG9ubHkgdGVtcG9yYXJ5LCB3aGlsZSB0aGVyZSBpcyBubyBib290c3RyYXAgZGF0YSBoZXJlLCBub3JtYWxseSB3b3VsZCBoYW5kbGUgZXJyb3IgLyBmYWlsXG4gICAgICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICBvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgY29uc29sZS5sb2cgXCJvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XCIsIGRhdGFcblxuICAgICAgICB0b0FkZCA9IFtdXG4gICAgICAgICh0b0FkZCA9IHRvQWRkLmNvbmNhdCBkYXRhLmRvb2RsZXMpIGZvciBpIGluIFswLi4uNV1cblxuICAgICAgICBAZG9vZGxlcy5hZGQgdG9BZGRcblxuICAgICAgICAjIyNcblxuICAgICAgICBib290c3RyYXAgZGF0YSByZWNlaXZlZCwgYXBwIHJlYWR5IHRvIGdvXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcERhdGFcbiIsIkFic3RyYWN0VmlldyAgICAgPSByZXF1aXJlICcuL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUHJlbG9hZGVyICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL1ByZWxvYWRlcidcbkhlYWRlciAgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9IZWFkZXInXG5XcmFwcGVyICAgICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvV3JhcHBlcidcbkZvb3RlciAgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9Gb290ZXInXG5QYWdlVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUGFnZVRyYW5zaXRpb25lcidcbk1vZGFsTWFuYWdlciAgICAgPSByZXF1aXJlICcuL3ZpZXcvbW9kYWxzL19Nb2RhbE1hbmFnZXInXG5cbmNsYXNzIEFwcFZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ21haW4nXG5cbiAgICAkd2luZG93ICA6IG51bGxcbiAgICAkYm9keSAgICA6IG51bGxcblxuICAgIHdyYXBwZXIgIDogbnVsbFxuICAgIGZvb3RlciAgIDogbnVsbFxuXG4gICAgZGltcyA6XG4gICAgICAgIHcgOiBudWxsXG4gICAgICAgIGggOiBudWxsXG4gICAgICAgIG8gOiBudWxsXG4gICAgICAgIHVwZGF0ZU1vYmlsZSA6IHRydWVcbiAgICAgICAgbGFzdEhlaWdodCAgIDogbnVsbFxuXG4gICAgbGFzdFNjcm9sbFkgOiAwXG4gICAgdGlja2luZyAgICAgOiBmYWxzZVxuXG4gICAgRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMgOiAnRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMnXG4gICAgRVZFTlRfUFJFTE9BREVSX0hJREUgICAgOiAnRVZFTlRfUFJFTE9BREVSX0hJREUnXG4gICAgRVZFTlRfT05fU0NST0xMICAgICAgICAgOiAnRVZFTlRfT05fU0NST0xMJ1xuXG4gICAgTU9CSUxFX1dJRFRIIDogNzAwXG4gICAgTU9CSUxFICAgICAgIDogJ21vYmlsZSdcbiAgICBOT05fTU9CSUxFICAgOiAnbm9uX21vYmlsZSdcblxuICAgIGNvbnN0cnVjdG9yIDogLT5cblxuICAgICAgICBAJHdpbmRvdyA9ICQod2luZG93KVxuICAgICAgICBAJGJvZHkgICA9ICQoJ2JvZHknKS5lcSgwKVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgIGRpc2FibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vbiAndG91Y2htb3ZlJywgQG9uVG91Y2hNb3ZlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZW5hYmxlVG91Y2g6ID0+XG5cbiAgICAgICAgQCR3aW5kb3cub2ZmICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcblxuICAgICAgICBudWxsXG5cbiAgICBvblRvdWNoTW92ZTogKCBlICkgLT5cblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICBudWxsXG5cbiAgICByZW5kZXIgOiA9PlxuXG4gICAgICAgIEBiaW5kRXZlbnRzKClcblxuICAgICAgICBAcHJlbG9hZGVyICAgID0gbmV3IFByZWxvYWRlclxuICAgICAgICBAbW9kYWxNYW5hZ2VyID0gbmV3IE1vZGFsTWFuYWdlclxuXG4gICAgICAgIEBoZWFkZXIgICAgICAgPSBuZXcgSGVhZGVyXG4gICAgICAgIEB3cmFwcGVyICAgICAgPSBuZXcgV3JhcHBlclxuICAgICAgICBAZm9vdGVyICAgICAgID0gbmV3IEZvb3RlclxuICAgICAgICBAdHJhbnNpdGlvbmVyID0gbmV3IFBhZ2VUcmFuc2l0aW9uZXJcblxuICAgICAgICBAXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGhlYWRlclxuICAgICAgICAgICAgLmFkZENoaWxkIEB3cmFwcGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGZvb3RlclxuICAgICAgICAgICAgLmFkZENoaWxkIEB0cmFuc2l0aW9uZXJcblxuICAgICAgICBAb25BbGxSZW5kZXJlZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYmluZEV2ZW50cyA6ID0+XG5cbiAgICAgICAgQG9uICdhbGxSZW5kZXJlZCcsIEBvbkFsbFJlbmRlcmVkXG5cbiAgICAgICAgQG9uUmVzaXplKClcblxuICAgICAgICBAb25SZXNpemUgPSBfLmRlYm91bmNlIEBvblJlc2l6ZSwgMzAwXG4gICAgICAgIEAkd2luZG93Lm9uICdyZXNpemUgb3JpZW50YXRpb25jaGFuZ2UnLCBAb25SZXNpemVcbiAgICAgICAgQCR3aW5kb3cub24gXCJzY3JvbGxcIiwgQG9uU2Nyb2xsXG5cbiAgICAgICAgQCRib2R5Lm9uICdjbGljaycsICdhJywgQGxpbmtNYW5hZ2VyXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25TY3JvbGwgOiA9PlxuXG4gICAgICAgIEBsYXN0U2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZXG4gICAgICAgIEByZXF1ZXN0VGljaygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVxdWVzdFRpY2sgOiA9PlxuXG4gICAgICAgIGlmICFAdGlja2luZ1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIEBzY3JvbGxVcGRhdGVcbiAgICAgICAgICAgIEB0aWNraW5nID0gdHJ1ZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNjcm9sbFVwZGF0ZSA6ID0+XG5cbiAgICAgICAgQHRpY2tpbmcgPSBmYWxzZVxuXG4gICAgICAgIEAkYm9keS5hZGRDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG5cbiAgICAgICAgY2xlYXJUaW1lb3V0IEB0aW1lclNjcm9sbFxuXG4gICAgICAgIEB0aW1lclNjcm9sbCA9IHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgIEAkYm9keS5yZW1vdmVDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG4gICAgICAgICwgNTBcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfT05fU0NST0xMXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25BbGxSZW5kZXJlZCA6ID0+XG5cbiAgICAgICAgIyBjb25zb2xlLmxvZyBcIm9uQWxsUmVuZGVyZWQgOiA9PlwiXG5cbiAgICAgICAgQCRib2R5LnByZXBlbmQgQCRlbFxuXG4gICAgICAgIEBwcmVsb2FkZXIucGxheUludHJvQW5pbWF0aW9uID0+IEB0cmlnZ2VyIEBFVkVOVF9QUkVMT0FERVJfSElERVxuXG4gICAgICAgIEBiZWdpbigpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYmVnaW4gOiA9PlxuXG4gICAgICAgIEB0cmlnZ2VyICdzdGFydCdcblxuICAgICAgICBAQ0QoKS5yb3V0ZXIuc3RhcnQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uUmVzaXplIDogPT5cblxuICAgICAgICBAZ2V0RGltcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0RGltcyA6ID0+XG5cbiAgICAgICAgdyA9IHdpbmRvdy5pbm5lcldpZHRoIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCBvciBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICAgICAgIGggPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodFxuXG4gICAgICAgIGNoYW5nZSA9IGggLyBAZGltcy5sYXN0SGVpZ2h0XG5cbiAgICAgICAgQGRpbXMgPVxuICAgICAgICAgICAgdyA6IHdcbiAgICAgICAgICAgIGggOiBoXG4gICAgICAgICAgICBvIDogaWYgaCA+IHcgdGhlbiAncG9ydHJhaXQnIGVsc2UgJ2xhbmRzY2FwZSdcbiAgICAgICAgICAgIHVwZGF0ZU1vYmlsZSA6ICFAQ0QoKS5pc01vYmlsZSgpIG9yIGNoYW5nZSA8IDAuOCBvciBjaGFuZ2UgPiAxLjJcbiAgICAgICAgICAgIGxhc3RIZWlnaHQgICA6IGhcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEBkaW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbGlua01hbmFnZXIgOiAoZSkgPT5cblxuICAgICAgICBocmVmID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2hyZWYnKVxuXG4gICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgaHJlZlxuXG4gICAgICAgIEBuYXZpZ2F0ZVRvVXJsIGhyZWYsIGVcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvVXJsIDogKCBocmVmLCBlID0gbnVsbCApID0+XG5cbiAgICAgICAgcm91dGUgICA9IGlmIGhyZWYubWF0Y2goQENEKCkuQkFTRV9VUkwpIHRoZW4gaHJlZi5zcGxpdChAQ0QoKS5CQVNFX1VSTClbMV0gZWxzZSBocmVmXG4gICAgICAgIHNlY3Rpb24gPSBpZiByb3V0ZS5jaGFyQXQoMCkgaXMgJy8nIHRoZW4gcm91dGUuc3BsaXQoJy8nKVsxXS5zcGxpdCgnLycpWzBdIGVsc2Ugcm91dGUuc3BsaXQoJy8nKVswXVxuXG4gICAgICAgIGlmIEBDRCgpLm5hdi5nZXRTZWN0aW9uIHNlY3Rpb25cbiAgICAgICAgICAgIGU/LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIEBDRCgpLnJvdXRlci5uYXZpZ2F0ZVRvIHJvdXRlXG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBAaGFuZGxlRXh0ZXJuYWxMaW5rIGhyZWZcblxuICAgICAgICBudWxsXG5cbiAgICBoYW5kbGVFeHRlcm5hbExpbmsgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcImhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PiBcIlxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJpbmQgdHJhY2tpbmcgZXZlbnRzIGlmIG5lY2Vzc2FyeVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBWaWV3XG4iLCJjbGFzcyBBYnN0cmFjdENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Q29sbGVjdGlvblxuIiwiQWJzdHJhY3RDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RDb2xsZWN0aW9uJ1xuQ29udHJpYnV0b3JNb2RlbCAgID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2NvbnRyaWJ1dG9yL0NvbnRyaWJ1dG9yTW9kZWwnXG5cbmNsYXNzIENvbnRyaWJ1dG9yc0NvbGxlY3Rpb24gZXh0ZW5kcyBBYnN0cmFjdENvbGxlY3Rpb25cblxuXHRtb2RlbCA6IENvbnRyaWJ1dG9yTW9kZWxcblxuXHRnZXRBYm91dEhUTUwgOiA9PlxuXG5cdFx0cGVlcHMgPSBbXVxuXG5cdFx0KHBlZXBzLnB1c2ggbW9kZWwuZ2V0KCdodG1sJykpIGZvciBtb2RlbCBpbiBAbW9kZWxzXG5cblx0XHRwZWVwcy5qb2luKCcgXFxcXCAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyaWJ1dG9yc0NvbGxlY3Rpb25cbiIsIlRlbXBsYXRlTW9kZWwgPSByZXF1aXJlICcuLi8uLi9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsJ1xuXG5jbGFzcyBUZW1wbGF0ZXNDb2xsZWN0aW9uIGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvblxuXG5cdG1vZGVsIDogVGVtcGxhdGVNb2RlbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlc0NvbGxlY3Rpb25cbiIsIkFic3RyYWN0Q29sbGVjdGlvbiA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Q29sbGVjdGlvbidcbkRvb2RsZU1vZGVsICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9kb29kbGUvRG9vZGxlTW9kZWwnXG5cbmNsYXNzIERvb2RsZXNDb2xsZWN0aW9uIGV4dGVuZHMgQWJzdHJhY3RDb2xsZWN0aW9uXG5cblx0bW9kZWwgOiBEb29kbGVNb2RlbFxuXG5cdGdldERvb2RsZUJ5U2x1ZyA6IChzbHVnKSA9PlxuXG5cdFx0ZG9vZGxlID0gQGZpbmRXaGVyZSBzbHVnIDogc2x1Z1xuXG5cdFx0aWYgIWRvb2RsZVxuXHRcdFx0Y29uc29sZS5sb2cgXCJ5IHUgbm8gZG9vZGxlP1wiXG5cblx0XHRyZXR1cm4gZG9vZGxlXG5cbm1vZHVsZS5leHBvcnRzID0gRG9vZGxlc0NvbGxlY3Rpb25cbiIsIkNvbG9ycyA9XG5cblx0Q0RfUkVEICAgIDogJyNFQjQyM0UnXG5cdENEX0JMVUUgICA6ICcjMzk1Q0FBJ1xuXHRDRF9CTEFDSyAgOiAnIzExMTExMSdcblx0T0ZGX1dISVRFIDogJyNGMUYxRjMnXG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JzXG4iLCJBUElSb3V0ZU1vZGVsID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvQVBJUm91dGVNb2RlbCdcblxuY2xhc3MgQVBJXG5cblx0QG1vZGVsIDogbmV3IEFQSVJvdXRlTW9kZWxcblxuXHRAZ2V0Q29udGFudHMgOiA9PlxuXG5cdFx0IyMjIGFkZCBtb3JlIGlmIHdlIHdhbm5hIHVzZSBpbiBBUEkgc3RyaW5ncyAjIyNcblx0XHRCQVNFX1VSTCA6IEBDRCgpLkJBU0VfVVJMXG5cblx0QGdldCA6IChuYW1lLCB2YXJzKSA9PlxuXG5cdFx0dmFycyA9ICQuZXh0ZW5kIHRydWUsIHZhcnMsIEBnZXRDb250YW50cygpXG5cdFx0cmV0dXJuIEBzdXBwbGFudFN0cmluZyBAbW9kZWwuZ2V0KG5hbWUpLCB2YXJzXG5cblx0QHN1cHBsYW50U3RyaW5nIDogKHN0ciwgdmFscykgLT5cblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSAve3sgKFtee31dKikgfX0vZywgKGEsIGIpIC0+XG5cdFx0XHRyID0gdmFsc1tiXSBvciBpZiB0eXBlb2YgdmFsc1tiXSBpcyAnbnVtYmVyJyB0aGVuIHZhbHNbYl0udG9TdHJpbmcoKSBlbHNlICcnXG5cdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdEBDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQVBJXG4iLCJjbGFzcyBBYnN0cmFjdERhdGFcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRfLmV4dGVuZCBALCBCYWNrYm9uZS5FdmVudHNcblxuXHRcdHJldHVybiBudWxsXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0RGF0YVxuIiwiTG9jYWxlc01vZGVsID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvTG9jYWxlc01vZGVsJ1xuQVBJICAgICAgICAgID0gcmVxdWlyZSAnLi4vZGF0YS9BUEknXG5cbiMjI1xuIyBMb2NhbGUgTG9hZGVyICNcblxuRmlyZXMgYmFjayBhbiBldmVudCB3aGVuIGNvbXBsZXRlXG5cbiMjI1xuY2xhc3MgTG9jYWxlXG5cbiAgICBsYW5nICAgICA6IG51bGxcbiAgICBkYXRhICAgICA6IG51bGxcbiAgICBjYWxsYmFjayA6IG51bGxcbiAgICBiYWNrdXAgICA6IG51bGxcbiAgICBkZWZhdWx0ICA6ICdlbi1nYidcblxuICAgIGNvbnN0cnVjdG9yIDogKGRhdGEsIGNiKSAtPlxuXG4gICAgICAgICMjIyBzdGFydCBMb2NhbGUgTG9hZGVyLCBkZWZpbmUgbG9jYWxlIGJhc2VkIG9uIGJyb3dzZXIgbGFuZ3VhZ2UgIyMjXG5cbiAgICAgICAgQGNhbGxiYWNrID0gY2JcbiAgICAgICAgQGJhY2t1cCA9IGRhdGFcblxuICAgICAgICBAbGFuZyA9IEBnZXRMYW5nKClcblxuICAgICAgICBpZiBBUEkuZ2V0KCdsb2NhbGUnLCB7IGNvZGUgOiBAbGFuZyB9KVxuXG4gICAgICAgICAgICAkLmFqYXhcbiAgICAgICAgICAgICAgICB1cmwgICAgIDogQVBJLmdldCggJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0gKVxuICAgICAgICAgICAgICAgIHR5cGUgICAgOiAnR0VUJ1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICAgICAgZXJyb3IgICA6IEBsb2FkQmFja3VwXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAbG9hZEJhY2t1cCgpXG5cbiAgICAgICAgbnVsbFxuICAgICAgICAgICAgXG4gICAgZ2V0TGFuZyA6ID0+XG5cbiAgICAgICAgaWYgd2luZG93LmxvY2F0aW9uLnNlYXJjaCBhbmQgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5tYXRjaCgnbGFuZz0nKVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zcGxpdCgnbGFuZz0nKVsxXS5zcGxpdCgnJicpWzBdXG5cbiAgICAgICAgZWxzZSBpZiB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcblxuICAgICAgICAgICAgbGFuZyA9IHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAgbGFuZyA9IEBkZWZhdWx0XG5cbiAgICAgICAgbGFuZ1xuXG4gICAgb25TdWNjZXNzIDogKGV2ZW50KSA9PlxuXG4gICAgICAgICMjIyBGaXJlcyBiYWNrIGFuIGV2ZW50IG9uY2UgaXQncyBjb21wbGV0ZSAjIyNcblxuICAgICAgICBkID0gbnVsbFxuXG4gICAgICAgIGlmIGV2ZW50LnJlc3BvbnNlVGV4dFxuICAgICAgICAgICAgZCA9IEpTT04ucGFyc2UgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBkID0gZXZlbnRcblxuICAgICAgICBAZGF0YSA9IG5ldyBMb2NhbGVzTW9kZWwgZFxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICBsb2FkQmFja3VwIDogPT5cblxuICAgICAgICAjIyMgV2hlbiBBUEkgbm90IGF2YWlsYWJsZSwgdHJpZXMgdG8gbG9hZCB0aGUgc3RhdGljIC50eHQgbG9jYWxlICMjI1xuXG4gICAgICAgICQuYWpheCBcbiAgICAgICAgICAgIHVybCAgICAgIDogQGJhY2t1cFxuICAgICAgICAgICAgZGF0YVR5cGUgOiAnanNvbidcbiAgICAgICAgICAgIGNvbXBsZXRlIDogQG9uU3VjY2Vzc1xuICAgICAgICAgICAgZXJyb3IgICAgOiA9PiBjb25zb2xlLmxvZyAnZXJyb3Igb24gbG9hZGluZyBiYWNrdXAnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgICMjIyBnZXQgU3RyaW5nIGZyb20gbG9jYWxlXG4gICAgICAgICsgaWQgOiBzdHJpbmcgaWQgb2YgdGhlIExvY2FsaXNlZCBTdHJpbmdcbiAgICAgICAgIyMjXG5cbiAgICAgICAgcmV0dXJuIEBkYXRhLmdldFN0cmluZyBpZFxuXG4gICAgZ2V0TG9jYWxlSW1hZ2UgOiAodXJsKSA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuY29uZmlnLkNETiArIFwiL2ltYWdlcy9sb2NhbGUvXCIgKyB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGUgKyBcIi9cIiArIHVybFxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZVxuIiwiVGVtcGxhdGVNb2RlbCAgICAgICA9IHJlcXVpcmUgJy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5UZW1wbGF0ZXNDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vY29sbGVjdGlvbnMvY29yZS9UZW1wbGF0ZXNDb2xsZWN0aW9uJ1xuXG5jbGFzcyBUZW1wbGF0ZXNcblxuICAgIHRlbXBsYXRlcyA6IG51bGxcbiAgICBjYiAgICAgICAgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6ICh0ZW1wbGF0ZXMsIGNhbGxiYWNrKSAtPlxuXG4gICAgICAgIEBjYiA9IGNhbGxiYWNrXG5cbiAgICAgICAgJC5hamF4IHVybCA6IHRlbXBsYXRlcywgc3VjY2VzcyA6IEBwYXJzZVhNTFxuICAgICAgICAgICBcbiAgICAgICAgbnVsbFxuXG4gICAgcGFyc2VYTUwgOiAoZGF0YSkgPT5cblxuICAgICAgICB0ZW1wID0gW11cblxuICAgICAgICAkKGRhdGEpLmZpbmQoJ3RlbXBsYXRlJykuZWFjaCAoa2V5LCB2YWx1ZSkgLT5cbiAgICAgICAgICAgICR2YWx1ZSA9ICQodmFsdWUpXG4gICAgICAgICAgICB0ZW1wLnB1c2ggbmV3IFRlbXBsYXRlTW9kZWxcbiAgICAgICAgICAgICAgICBpZCAgIDogJHZhbHVlLmF0dHIoJ2lkJykudG9TdHJpbmcoKVxuICAgICAgICAgICAgICAgIHRleHQgOiAkLnRyaW0gJHZhbHVlLnRleHQoKVxuXG4gICAgICAgIEB0ZW1wbGF0ZXMgPSBuZXcgVGVtcGxhdGVzQ29sbGVjdGlvbiB0ZW1wXG5cbiAgICAgICAgQGNiPygpXG4gICAgICAgIFxuICAgICAgICBudWxsICAgICAgICBcblxuICAgIGdldCA6IChpZCkgPT5cblxuICAgICAgICB0ID0gQHRlbXBsYXRlcy53aGVyZSBpZCA6IGlkXG4gICAgICAgIHQgPSB0WzBdLmdldCAndGV4dCdcbiAgICAgICAgXG4gICAgICAgIHJldHVybiAkLnRyaW0gdFxuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlc1xuIiwiY2xhc3MgQWJzdHJhY3RNb2RlbCBleHRlbmRzIEJhY2tib25lLkRlZXBNb2RlbFxuXG5cdGNvbnN0cnVjdG9yIDogKGF0dHJzLCBvcHRpb24pIC0+XG5cblx0XHRhdHRycyA9IEBfZmlsdGVyQXR0cnMgYXR0cnNcblxuXHRcdHJldHVybiBCYWNrYm9uZS5EZWVwTW9kZWwuYXBwbHkgQCwgYXJndW1lbnRzXG5cblx0c2V0IDogKGF0dHJzLCBvcHRpb25zKSAtPlxuXG5cdFx0b3B0aW9ucyBvciAob3B0aW9ucyA9IHt9KVxuXG5cdFx0YXR0cnMgPSBAX2ZpbHRlckF0dHJzIGF0dHJzXG5cblx0XHRvcHRpb25zLmRhdGEgPSBKU09OLnN0cmluZ2lmeSBhdHRyc1xuXG5cdFx0cmV0dXJuIEJhY2tib25lLkRlZXBNb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwgQCwgYXR0cnMsIG9wdGlvbnNcblxuXHRfZmlsdGVyQXR0cnMgOiAoYXR0cnMpID0+XG5cblx0XHRhdHRyc1xuXG5cdENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdE1vZGVsXG4iLCJBYnN0cmFjdE1vZGVsICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0TW9kZWwnXG5OdW1iZXJVdGlscyAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL051bWJlclV0aWxzJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgQ29udHJpYnV0b3JNb2RlbCBleHRlbmRzIEFic3RyYWN0TW9kZWxcblxuICAgIGRlZmF1bHRzIDogXG4gICAgICAgIFwibmFtZVwiICAgIDogXCJcIlxuICAgICAgICBcImdpdGh1YlwiICA6IFwiXCJcbiAgICAgICAgXCJ3ZWJzaXRlXCIgOiBcIlwiXG4gICAgICAgIFwidHdpdHRlclwiIDogXCJcIlxuICAgICAgICBcImh0bWxcIiAgICA6IFwiXCJcblxuICAgIF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuICAgICAgICBpZiBhdHRycy5uYW1lXG4gICAgICAgICAgICBhdHRycy5odG1sID0gQGdldEh0bWwgYXR0cnNcblxuICAgICAgICBhdHRyc1xuXG4gICAgZ2V0SHRtbCA6IChhdHRycykgPT5cblxuICAgICAgICBodG1sICA9IFwiXCJcbiAgICAgICAgbGlua3MgPSBbXVxuXG4gICAgICAgIGlmIGF0dHJzLndlYnNpdGVcbiAgICAgICAgICAgIGh0bWwgKz0gXCI8YSBocmVmPVxcXCIje2F0dHJzLndlYnNpdGV9XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+I3thdHRycy5uYW1lfTwvYT4gXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgaHRtbCArPSBcIiN7YXR0cnMubmFtZX0gXCJcblxuICAgICAgICBpZiBhdHRycy50d2l0dGVyIHRoZW4gbGlua3MucHVzaCBcIjxhIGhyZWY9XFxcImh0dHA6Ly90d2l0dGVyLmNvbS8je2F0dHJzLnR3aXR0ZXJ9XFxcIj50dzwvYT5cIlxuICAgICAgICBpZiBhdHRycy5naXRodWIgdGhlbiBsaW5rcy5wdXNoIFwiPGEgaHJlZj1cXFwiaHR0cDovL2dpdGh1Yi5jb20vI3thdHRycy5naXRodWJ9XFxcIj5naDwvYT5cIlxuXG4gICAgICAgIGh0bWwgKz0gXCIoI3tsaW5rcy5qb2luKCcsICcpfSlcIlxuXG4gICAgICAgIGh0bWxcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cmlidXRvck1vZGVsXG4iLCJjbGFzcyBBUElSb3V0ZU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG5cbiAgICAgICAgc3RhcnQgICAgICAgICA6IFwiXCIgIyBFZzogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvc3RhcnRcIlxuXG4gICAgICAgIGxvY2FsZSAgICAgICAgOiBcIlwiICMgRWc6IFwie3sgQkFTRV9VUkwgfX0vYXBpL2wxMG4ve3sgY29kZSB9fVwiXG5cbiAgICAgICAgdXNlciAgICAgICAgICA6XG4gICAgICAgICAgICBsb2dpbiAgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9sb2dpblwiXG4gICAgICAgICAgICByZWdpc3RlciAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9yZWdpc3RlclwiXG4gICAgICAgICAgICBwYXNzd29yZCAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9wYXNzd29yZFwiXG4gICAgICAgICAgICB1cGRhdGUgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci91cGRhdGVcIlxuICAgICAgICAgICAgbG9nb3V0ICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvbG9nb3V0XCJcbiAgICAgICAgICAgIHJlbW92ZSAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3JlbW92ZVwiXG5cbm1vZHVsZS5leHBvcnRzID0gQVBJUm91dGVNb2RlbFxuIiwiY2xhc3MgTG9jYWxlc01vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuICAgIGRlZmF1bHRzIDpcbiAgICAgICAgY29kZSAgICAgOiBudWxsXG4gICAgICAgIGxhbmd1YWdlIDogbnVsbFxuICAgICAgICBzdHJpbmdzICA6IG51bGxcbiAgICAgICAgICAgIFxuICAgIGdldF9sYW5ndWFnZSA6ID0+XG4gICAgICAgIHJldHVybiBAZ2V0KCdsYW5ndWFnZScpXG5cbiAgICBnZXRTdHJpbmcgOiAoaWQpID0+XG4gICAgICAgICgocmV0dXJuIGUgaWYoYSBpcyBpZCkpIGZvciBhLCBlIG9mIHZbJ3N0cmluZ3MnXSkgZm9yIGssIHYgb2YgQGdldCgnc3RyaW5ncycpXG4gICAgICAgIGNvbnNvbGUud2FybiBcIkxvY2FsZXMgLT4gbm90IGZvdW5kIHN0cmluZzogI3tpZH1cIlxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlc01vZGVsXG4iLCJjbGFzcyBUZW1wbGF0ZU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuXHRkZWZhdWx0cyA6IFxuXG5cdFx0aWQgICA6IFwiXCJcblx0XHR0ZXh0IDogXCJcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlTW9kZWxcbiIsIkFic3RyYWN0TW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RNb2RlbCdcbk51bWJlclV0aWxzICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvTnVtYmVyVXRpbHMnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBEb29kbGVNb2RlbCBleHRlbmRzIEFic3RyYWN0TW9kZWxcblxuXHRkZWZhdWx0cyA6XG5cdFx0IyBmcm9tIG1hbmlmZXN0XG5cdFx0XCJuYW1lXCIgOiBcIlwiXG5cdFx0XCJhdXRob3JcIiA6XG5cdFx0XHRcIm5hbWVcIiAgICA6IFwiXCJcblx0XHRcdFwiZ2l0aHViXCIgIDogXCJcIlxuXHRcdFx0XCJ3ZWJzaXRlXCIgOiBcIlwiXG5cdFx0XHRcInR3aXR0ZXJcIiA6IFwiXCJcblx0XHRcImRlc2NyaXB0aW9uXCI6IFwiXCJcblx0XHRcInRhZ3NcIiA6IFtdXG5cdFx0XCJpbnRlcmFjdGlvblwiIDpcblx0XHRcdFwibW91c2VcIiAgICA6IG51bGxcblx0XHRcdFwia2V5Ym9hcmRcIiA6IG51bGxcblx0XHRcdFwidG91Y2hcIiAgICA6IG51bGxcblx0XHRcImNyZWF0ZWRcIiA6IFwiXCJcblx0XHRcInNsdWdcIiA6IFwiXCJcblx0XHRcImluZGV4XCI6IG51bGxcblx0XHQjIHNpdGUtb25seVxuXHRcdFwiaW5kZXhIVE1MXCIgOiBcIlwiXG5cdFx0XCJzb3VyY2VcIiAgICA6IFwiXCJcblx0XHRcInVybFwiICAgICAgIDogXCJcIlxuXHRcdFwic2NyYW1ibGVkXCIgOlxuXHRcdFx0XCJuYW1lXCIgICAgICAgIDogXCJcIlxuXHRcdFx0XCJhdXRob3JfbmFtZVwiIDogXCJcIlxuXG5cdF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuXHRcdGlmIGF0dHJzLnNsdWdcblx0XHRcdGF0dHJzLnVybCA9IHdpbmRvdy5jb25maWcuaG9zdG5hbWUgKyAnLycgKyB3aW5kb3cuY29uZmlnLnJvdXRlcy5ET09ETEVTICsgJy8nICsgYXR0cnMuc2x1Z1xuXG5cdFx0aWYgYXR0cnMuaW5kZXhcblx0XHRcdGF0dHJzLmluZGV4ID0gTnVtYmVyVXRpbHMuemVyb0ZpbGwgYXR0cnMuaW5kZXgsIDNcblxuXHRcdGlmIGF0dHJzLm5hbWUgYW5kIGF0dHJzLmF1dGhvci5uYW1lXG5cdFx0XHRhdHRycy5zY3JhbWJsZWQgPVxuXHRcdFx0XHRuYW1lICAgICAgICA6IENvZGVXb3JkVHJhbnNpdGlvbmVyLmdldFNjcmFtYmxlZFdvcmQgYXR0cnMubmFtZVxuXHRcdFx0XHRhdXRob3JfbmFtZSA6IENvZGVXb3JkVHJhbnNpdGlvbmVyLmdldFNjcmFtYmxlZFdvcmQgYXR0cnMuYXV0aG9yLm5hbWVcblxuXHRcdGlmIGF0dHJzLmluZGV4XG5cdFx0XHRhdHRycy5pbmRleEhUTUwgPSBAZ2V0SW5kZXhIVE1MIGF0dHJzLmluZGV4XG5cblx0XHRhdHRyc1xuXG5cdGdldEluZGV4SFRNTCA6IChpbmRleCkgPT5cblxuXHRcdEhUTUwgPSBcIlwiXG5cblx0XHRmb3IgY2hhciBpbiBpbmRleC5zcGxpdCgnJylcblx0XHRcdGNsYXNzTmFtZSA9IGlmIGNoYXIgaXMgJzAnIHRoZW4gJ2luZGV4LWNoYXItemVybycgZWxzZSAnaW5kZXgtY2hhci1ub256ZXJvJ1xuXHRcdFx0SFRNTCArPSBcIjxzcGFuIGNsYXNzPVxcXCIje2NsYXNzTmFtZX1cXFwiPiN7Y2hhcn08L3NwYW4+XCJcblxuXHRcdEhUTUxcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVNb2RlbFxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vdmlldy9BYnN0cmFjdFZpZXcnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL1JvdXRlcidcblxuY2xhc3MgTmF2IGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICBARVZFTlRfQ0hBTkdFX1ZJRVcgICAgIDogJ0VWRU5UX0NIQU5HRV9WSUVXJ1xuICAgIEBFVkVOVF9DSEFOR0VfU1VCX1ZJRVcgOiAnRVZFTlRfQ0hBTkdFX1NVQl9WSUVXJ1xuXG4gICAgc2VjdGlvbnMgOiBudWxsICMgc2V0IHZpYSB3aW5kb3cuY29uZmlnIGRhdGEsIHNvIGNhbiBiZSBjb25zaXN0ZW50IHdpdGggYmFja2VuZFxuXG4gICAgY3VycmVudCAgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbCwgdGVyIDogbnVsbFxuICAgIHByZXZpb3VzIDogYXJlYSA6IG51bGwsIHN1YiA6IG51bGwsIHRlciA6IG51bGxcblxuICAgIGNoYW5nZVZpZXdDb3VudCA6IDBcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEBzZWN0aW9ucyA9IHdpbmRvdy5jb25maWcucm91dGVzXG4gICAgICAgIEBmYXZpY29uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zhdmljb24nKVxuXG4gICAgICAgIEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAY2hhbmdlVmlld1xuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZ2V0U2VjdGlvbiA6IChzZWN0aW9uLCBzdHJpY3Q9ZmFsc2UpID0+XG5cbiAgICAgICAgaWYgIXN0cmljdCBhbmQgc2VjdGlvbiBpcyAnJyB0aGVuIHJldHVybiB0cnVlXG5cbiAgICAgICAgZm9yIHNlY3Rpb25OYW1lLCB1cmkgb2YgQHNlY3Rpb25zXG4gICAgICAgICAgICBpZiB1cmkgaXMgc2VjdGlvbiB0aGVuIHJldHVybiBzZWN0aW9uTmFtZVxuXG4gICAgICAgIGZhbHNlXG5cbiAgICBjaGFuZ2VWaWV3OiAoYXJlYSwgc3ViLCB0ZXIsIHBhcmFtcykgPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwiYXJlYVwiLGFyZWFcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInN1YlwiLHN1YlxuICAgICAgICAjIGNvbnNvbGUubG9nIFwidGVyXCIsdGVyXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJwYXJhbXNcIixwYXJhbXNcblxuICAgICAgICBAY2hhbmdlVmlld0NvdW50KytcblxuICAgICAgICBAcHJldmlvdXMgPSBAY3VycmVudFxuICAgICAgICBAY3VycmVudCAgPSBhcmVhIDogYXJlYSwgc3ViIDogc3ViLCB0ZXIgOiB0ZXJcblxuICAgICAgICBAdHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBwcmV2aW91cywgQGN1cnJlbnRcbiAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGN1cnJlbnRcblxuICAgICAgICBpZiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5pc09wZW4oKSB0aGVuIEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLmhpZGVPcGVuTW9kYWwoKVxuXG4gICAgICAgIEBzZXRQYWdlVGl0bGUgYXJlYSwgc3ViLCB0ZXJcbiAgICAgICAgQHNldFBhZ2VGYXZpY29uIGFyZWFcblxuICAgICAgICBudWxsXG5cbiAgICBzZXRQYWdlVGl0bGU6IChhcmVhLCBzdWIsIHRlcikgPT5cblxuICAgICAgICBzZWN0aW9uICAgPSBpZiBhcmVhIGlzICcnIHRoZW4gJ0hPTUUnIGVsc2UgQENEKCkubmF2LmdldFNlY3Rpb24gYXJlYVxuICAgICAgICB0aXRsZVRtcGwgPSBAQ0QoKS5sb2NhbGUuZ2V0KFwicGFnZV90aXRsZV8je3NlY3Rpb259XCIpIG9yIEBDRCgpLmxvY2FsZS5nZXQoXCJwYWdlX3RpdGxlX0hPTUVcIilcbiAgICAgICAgdGl0bGUgPSBAc3VwcGxhbnRTdHJpbmcgdGl0bGVUbXBsLCBAZ2V0UGFnZVRpdGxlVmFycyhhcmVhLCBzdWIsIHRlciksIGZhbHNlXG5cbiAgICAgICAgaWYgd2luZG93LmRvY3VtZW50LnRpdGxlIGlzbnQgdGl0bGUgdGhlbiB3aW5kb3cuZG9jdW1lbnQudGl0bGUgPSB0aXRsZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNldFBhZ2VGYXZpY29uOiAoYXJlYSkgPT5cblxuICAgICAgICBjb2xvdXIgPSBzd2l0Y2ggYXJlYVxuICAgICAgICAgICAgd2hlbiBAc2VjdGlvbnMuSE9NRSB0aGVuICdyZWQnXG4gICAgICAgICAgICB3aGVuIEBzZWN0aW9ucy5BQk9VVCwgQHNlY3Rpb25zLkNPTlRSSUJVVEUgdGhlbiAnYmxhY2snXG4gICAgICAgICAgICB3aGVuIEBzZWN0aW9ucy5ET09ETEVTIHRoZW4gJ2JsdWUnXG4gICAgICAgICAgICBlbHNlICdyZWQnXG5cbiAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgQGZhdmljb24uaHJlZiA9IFwiI3tAQ0QoKS5CQVNFX1VSTH0vc3RhdGljL2ltZy9pY29ucy9mYXZpY29uL2Zhdmljb25fI3tjb2xvdXJ9LnBuZ1wiXG4gICAgICAgICwgMFxuXG4gICAgICAgIG51bGxcblxuICAgIGdldFBhZ2VUaXRsZVZhcnM6IChhcmVhLCBzdWIsIHRlcikgPT5cblxuICAgICAgICB2YXJzID0ge31cblxuICAgICAgICBpZiBhcmVhIGlzIEBzZWN0aW9ucy5ET09ETEVTIGFuZCBzdWIgYW5kIHRlclxuICAgICAgICAgICAgZG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmZpbmRXaGVyZSBzbHVnOiBcIiN7c3VifS8je3Rlcn1cIlxuXG4gICAgICAgICAgICBpZiAhZG9vZGxlXG4gICAgICAgICAgICAgICAgdmFycy5uYW1lID0gXCJkb29kbGVcIlxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHZhcnMubmFtZSA9IGRvb2RsZS5nZXQoJ2F1dGhvci5uYW1lJykgKyAnIFxcXFwgJyArIGRvb2RsZS5nZXQoJ25hbWUnKSArICcgJ1xuXG4gICAgICAgIHZhcnNcblxubW9kdWxlLmV4cG9ydHMgPSBOYXZcbiIsImNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4gICAgQEVWRU5UX0hBU0hfQ0hBTkdFRCA6ICdFVkVOVF9IQVNIX0NIQU5HRUQnXG5cbiAgICBGSVJTVF9ST1VURSA6IHRydWVcblxuICAgIHJvdXRlcyA6XG4gICAgICAgICcoLykoOmFyZWEpKC86c3ViKSgvOnRlcikoLyknIDogJ2hhc2hDaGFuZ2VkJ1xuICAgICAgICAnKmFjdGlvbnMnICAgICAgICAgICAgICAgICAgICA6ICduYXZpZ2F0ZVRvJ1xuXG4gICAgYXJlYSAgIDogbnVsbFxuICAgIHN1YiAgICA6IG51bGxcbiAgICB0ZXIgICAgOiBudWxsXG4gICAgcGFyYW1zIDogbnVsbFxuXG4gICAgc3RhcnQgOiA9PlxuXG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQgXG4gICAgICAgICAgICBwdXNoU3RhdGUgOiB0cnVlXG4gICAgICAgICAgICByb290ICAgICAgOiAnLydcblxuICAgICAgICBudWxsXG5cbiAgICBoYXNoQ2hhbmdlZCA6IChAYXJlYSA9IG51bGwsIEBzdWIgPSBudWxsLCBAdGVyID0gbnVsbCkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIj4+IEVWRU5UX0hBU0hfQ0hBTkdFRCBAYXJlYSA9ICN7QGFyZWF9LCBAc3ViID0gI3tAc3VifSwgQHRlciA9ICN7QHRlcn0gPDxcIlxuXG4gICAgICAgIGlmIEBGSVJTVF9ST1VURSB0aGVuIEBGSVJTVF9ST1VURSA9IGZhbHNlXG5cbiAgICAgICAgaWYgIUBhcmVhIHRoZW4gQGFyZWEgPSBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXG4gICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBhcmVhLCBAc3ViLCBAdGVyLCBAcGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbmF2aWdhdGVUbyA6ICh3aGVyZSA9ICcnLCB0cmlnZ2VyID0gdHJ1ZSwgcmVwbGFjZSA9IGZhbHNlLCBAcGFyYW1zKSA9PlxuXG4gICAgICAgIGlmIHdoZXJlLmNoYXJBdCgwKSBpc250IFwiL1wiXG4gICAgICAgICAgICB3aGVyZSA9IFwiLyN7d2hlcmV9XCJcbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KCB3aGVyZS5sZW5ndGgtMSApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIje3doZXJlfS9cIlxuXG4gICAgICAgIGlmICF0cmlnZ2VyXG4gICAgICAgICAgICBAdHJpZ2dlciBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCB3aGVyZSwgbnVsbCwgQHBhcmFtc1xuICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgQG5hdmlnYXRlIHdoZXJlLCB0cmlnZ2VyOiB0cnVlLCByZXBsYWNlOiByZXBsYWNlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQ0QgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXJcbiIsIiMjI1xuQW5hbHl0aWNzIHdyYXBwZXJcbiMjI1xuY2xhc3MgQW5hbHl0aWNzXG5cbiAgICB0YWdzICAgIDogbnVsbFxuICAgIHN0YXJ0ZWQgOiBmYWxzZVxuXG4gICAgYXR0ZW1wdHMgICAgICAgIDogMFxuICAgIGFsbG93ZWRBdHRlbXB0cyA6IDVcblxuICAgIGNvbnN0cnVjdG9yIDogKHRhZ3MsIEBjYWxsYmFjaykgLT5cblxuICAgICAgICAkLmdldEpTT04gdGFncywgQG9uVGFnc1JlY2VpdmVkXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIG9uVGFnc1JlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgQHRhZ3MgICAgPSBkYXRhXG4gICAgICAgIEBzdGFydGVkID0gdHJ1ZVxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICAjIyNcbiAgICBAcGFyYW0gc3RyaW5nIGlkIG9mIHRoZSB0cmFja2luZyB0YWcgdG8gYmUgcHVzaGVkIG9uIEFuYWx5dGljcyBcbiAgICAjIyNcbiAgICB0cmFjayA6IChwYXJhbSkgPT5cblxuICAgICAgICByZXR1cm4gaWYgIUBzdGFydGVkXG5cbiAgICAgICAgaWYgcGFyYW1cblxuICAgICAgICAgICAgdiA9IEB0YWdzW3BhcmFtXVxuXG4gICAgICAgICAgICBpZiB2XG5cbiAgICAgICAgICAgICAgICBhcmdzID0gWydzZW5kJywgJ2V2ZW50J11cbiAgICAgICAgICAgICAgICAoIGFyZ3MucHVzaChhcmcpICkgZm9yIGFyZyBpbiB2XG5cbiAgICAgICAgICAgICAgICAjIGxvYWRpbmcgR0EgYWZ0ZXIgbWFpbiBhcHAgSlMsIHNvIGV4dGVybmFsIHNjcmlwdCBtYXkgbm90IGJlIGhlcmUgeWV0XG4gICAgICAgICAgICAgICAgaWYgd2luZG93LmdhXG4gICAgICAgICAgICAgICAgICAgIGdhLmFwcGx5IG51bGwsIGFyZ3NcbiAgICAgICAgICAgICAgICBlbHNlIGlmIEBhdHRlbXB0cyA+PSBAYWxsb3dlZEF0dGVtcHRzXG4gICAgICAgICAgICAgICAgICAgIEBzdGFydGVkID0gZmFsc2VcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIEB0cmFjayBwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgQGF0dGVtcHRzKytcbiAgICAgICAgICAgICAgICAgICAgLCAyMDAwXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5dGljc1xuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0dvb2dsZVBsdXMnXG5cbmNsYXNzIEF1dGhNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0dXNlckRhdGEgIDogbnVsbFxuXG5cdCMgQHByb2Nlc3MgdHJ1ZSBkdXJpbmcgbG9naW4gcHJvY2Vzc1xuXHRwcm9jZXNzICAgICAgOiBmYWxzZVxuXHRwcm9jZXNzVGltZXIgOiBudWxsXG5cdHByb2Nlc3NXYWl0ICA6IDUwMDBcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdXNlckRhdGEgID0gQENEKCkuYXBwRGF0YS5VU0VSXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGxvZ2luIDogKHNlcnZpY2UsIGNiPW51bGwpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwiKysrKyBQUk9DRVNTIFwiLEBwcm9jZXNzXG5cblx0XHRyZXR1cm4gaWYgQHByb2Nlc3NcblxuXHRcdEBzaG93TG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IHRydWVcblxuXHRcdCRkYXRhRGZkID0gJC5EZWZlcnJlZCgpXG5cblx0XHRzd2l0Y2ggc2VydmljZVxuXHRcdFx0d2hlbiAnZ29vZ2xlJ1xuXHRcdFx0XHRHb29nbGVQbHVzLmxvZ2luICRkYXRhRGZkXG5cdFx0XHR3aGVuICdmYWNlYm9vaydcblx0XHRcdFx0RmFjZWJvb2subG9naW4gJGRhdGFEZmRcblxuXHRcdCRkYXRhRGZkLmRvbmUgKHJlcykgPT4gQGF1dGhTdWNjZXNzIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmZhaWwgKHJlcykgPT4gQGF1dGhGYWlsIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmFsd2F5cyAoKSA9PiBAYXV0aENhbGxiYWNrIGNiXG5cblx0XHQjIyNcblx0XHRVbmZvcnR1bmF0ZWx5IG5vIGNhbGxiYWNrIGlzIGZpcmVkIGlmIHVzZXIgbWFudWFsbHkgY2xvc2VzIEcrIGxvZ2luIG1vZGFsLFxuXHRcdHNvIHRoaXMgaXMgdG8gYWxsb3cgdGhlbSB0byBjbG9zZSB3aW5kb3cgYW5kIHRoZW4gc3Vic2VxdWVudGx5IHRyeSB0byBsb2cgaW4gYWdhaW4uLi5cblx0XHQjIyNcblx0XHRAcHJvY2Vzc1RpbWVyID0gc2V0VGltZW91dCBAYXV0aENhbGxiYWNrLCBAcHJvY2Vzc1dhaXRcblxuXHRcdCRkYXRhRGZkXG5cblx0YXV0aFN1Y2Nlc3MgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBjYWxsYmFjayBmb3IgI3tzZXJ2aWNlfSwgZGF0YSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhGYWlsIDogKHNlcnZpY2UsIGRhdGEpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwibG9naW4gZmFpbCBmb3IgI3tzZXJ2aWNlfSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhDYWxsYmFjayA6IChjYj1udWxsKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAcHJvY2Vzc1xuXG5cdFx0Y2xlYXJUaW1lb3V0IEBwcm9jZXNzVGltZXJcblxuXHRcdEBoaWRlTG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IGZhbHNlXG5cblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdCMjI1xuXHRzaG93IC8gaGlkZSBzb21lIFVJIGluZGljYXRvciB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBzb2NpYWwgbmV0d29yayB0byByZXNwb25kXG5cdCMjI1xuXHRzaG93TG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJzaG93TG9hZGVyXCJcblxuXHRcdG51bGxcblxuXHRoaWRlTG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJoaWRlTG9hZGVyXCJcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRoTWFuYWdlclxuIiwiZW5jb2RlID0gcmVxdWlyZSAnZW50L2VuY29kZSdcblxuY2xhc3MgQ29kZVdvcmRUcmFuc2l0aW9uZXJcblxuXHRAY29uZmlnIDpcblx0XHRNSU5fV1JPTkdfQ0hBUlMgOiAxXG5cdFx0TUFYX1dST05HX0NIQVJTIDogN1xuXG5cdFx0TUlOX0NIQVJfSU5fREVMQVkgOiA0MFxuXHRcdE1BWF9DSEFSX0lOX0RFTEFZIDogNzBcblxuXHRcdE1JTl9DSEFSX09VVF9ERUxBWSA6IDQwXG5cdFx0TUFYX0NIQVJfT1VUX0RFTEFZIDogNzBcblxuXHRcdENIQVJTIDogJ2FiY2RlZmhpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5IT8qKClAwqMkJV4mXy0rPVtde306O1xcJ1wiXFxcXHw8PiwuL35gJy5zcGxpdCgnJykubWFwKChjaGFyKSA9PiByZXR1cm4gZW5jb2RlKGNoYXIpKVxuXG5cdFx0Q0hBUl9URU1QTEFURSA6IFwiPHNwYW4gZGF0YS1jb2RldGV4dC1jaGFyPVxcXCJ7eyBjaGFyIH19XFxcIiBkYXRhLWNvZGV0ZXh0LWNoYXItc3RhdGU9XFxcInt7IHN0YXRlIH19XFxcIj57eyBjaGFyIH19PC9zcGFuPlwiXG5cblx0QF93b3JkQ2FjaGUgOiB7fVxuXG5cdEBfZ2V0V29yZEZyb21DYWNoZSA6ICgkZWwpID0+XG5cblx0XHRpZCA9ICRlbC5hdHRyKCdkYXRhLWNvZGV3b3JkLWlkJylcblxuXHRcdGlmIGlkIGFuZCBAX3dvcmRDYWNoZVsgaWQgXVxuXHRcdFx0d29yZCA9IEBfd29yZENhY2hlWyBpZCBdXG5cdFx0ZWxzZVxuXHRcdFx0QF93cmFwQ2hhcnMgJGVsXG5cdFx0XHR3b3JkID0gQF9hZGRXb3JkVG9DYWNoZSAkZWxcblxuXHRcdHdvcmRcblxuXHRAX2FkZFdvcmRUb0NhY2hlIDogKCRlbCkgPT5cblxuXHRcdGNoYXJzID0gW11cblxuXHRcdCRlbC5maW5kKCdbZGF0YS1jb2RldGV4dC1jaGFyXScpLmVhY2ggKGksIGVsKSA9PlxuXHRcdFx0JGNoYXJFbCA9ICQoZWwpXG5cdFx0XHRjaGFycy5wdXNoXG5cdFx0XHRcdCRlbCAgICAgICAgOiAkY2hhckVsXG5cdFx0XHRcdHJpZ2h0Q2hhciAgOiAkY2hhckVsLmF0dHIoJ2RhdGEtY29kZXRleHQtY2hhcicpXG5cblx0XHRpZCA9IF8udW5pcXVlSWQoKVxuXHRcdCRlbC5hdHRyICdkYXRhLWNvZGV3b3JkLWlkJywgaWRcblxuXHRcdEBfd29yZENhY2hlWyBpZCBdID1cblx0XHRcdHdvcmQgICAgOiBfLnBsdWNrKGNoYXJzLCAncmlnaHRDaGFyJykuam9pbignJylcblx0XHRcdCRlbCAgICAgOiAkZWxcblx0XHRcdGNoYXJzICAgOiBjaGFyc1xuXHRcdFx0dmlzaWJsZSA6IHRydWVcblxuXHRcdEBfd29yZENhY2hlWyBpZCBdXG5cblx0QF93cmFwQ2hhcnMgOiAoJGVsKSA9PlxuXG5cdFx0Y2hhcnMgPSAkZWwudGV4dCgpLnNwbGl0KCcnKVxuXHRcdHN0YXRlID0gJGVsLmF0dHIoJ2RhdGEtY29kZXdvcmQtaW5pdGlhbC1zdGF0ZScpIG9yIFwiXCJcblx0XHRodG1sID0gW11cblx0XHRmb3IgY2hhciBpbiBjaGFyc1xuXHRcdFx0aHRtbC5wdXNoIEBfc3VwcGxhbnRTdHJpbmcgQGNvbmZpZy5DSEFSX1RFTVBMQVRFLCBjaGFyIDogY2hhciwgc3RhdGU6IHN0YXRlXG5cblx0XHQkZWwuaHRtbCBodG1sLmpvaW4oJycpXG5cblx0XHRudWxsXG5cblx0QF9pc1dvcmRFbXB0eSA6ICh3b3JkKSA9PlxuXG5cdFx0bnVsbFxuXG5cdCMgQHBhcmFtIHRhcmdldCA9ICdyaWdodCcsICd3cm9uZycsICdlbXB0eSdcblx0QF9wcmVwYXJlV29yZCA6ICh3b3JkLCB0YXJnZXQsIGNoYXJTdGF0ZT0nJykgPT5cblxuXHRcdGZvciBjaGFyLCBpIGluIHdvcmQuY2hhcnNcblxuXHRcdFx0dGFyZ2V0Q2hhciA9IHN3aXRjaCB0cnVlXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICdyaWdodCcgdGhlbiBjaGFyLnJpZ2h0Q2hhclxuXHRcdFx0XHR3aGVuIHRhcmdldCBpcyAnd3JvbmcnIHRoZW4gQF9nZXRSYW5kb21DaGFyKClcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ2VtcHR5JyB0aGVuICcnXG5cdFx0XHRcdGVsc2UgdGFyZ2V0LmNoYXJBdChpKSBvciAnJ1xuXG5cdFx0XHRpZiB0YXJnZXRDaGFyIGlzICcgJyB0aGVuIHRhcmdldENoYXIgPSAnJm5ic3A7J1xuXG5cdFx0XHRjaGFyLndyb25nQ2hhcnMgPSBAX2dldFJhbmRvbVdyb25nQ2hhcnMoKVxuXHRcdFx0Y2hhci50YXJnZXRDaGFyID0gdGFyZ2V0Q2hhclxuXHRcdFx0Y2hhci5jaGFyU3RhdGUgID0gY2hhclN0YXRlXG5cblx0XHRudWxsXG5cblx0QF9nZXRSYW5kb21Xcm9uZ0NoYXJzIDogPT5cblxuXHRcdGNoYXJzID0gW11cblxuXHRcdGNoYXJDb3VudCA9IF8ucmFuZG9tIEBjb25maWcuTUlOX1dST05HX0NIQVJTLCBAY29uZmlnLk1BWF9XUk9OR19DSEFSU1xuXG5cdFx0Zm9yIGkgaW4gWzAuLi5jaGFyQ291bnRdXG5cdFx0XHRjaGFycy5wdXNoXG5cdFx0XHRcdGNoYXIgICAgIDogQF9nZXRSYW5kb21DaGFyKClcblx0XHRcdFx0aW5EZWxheSAgOiBfLnJhbmRvbSBAY29uZmlnLk1JTl9DSEFSX0lOX0RFTEFZLCBAY29uZmlnLk1BWF9DSEFSX0lOX0RFTEFZXG5cdFx0XHRcdG91dERlbGF5IDogXy5yYW5kb20gQGNvbmZpZy5NSU5fQ0hBUl9PVVRfREVMQVksIEBjb25maWcuTUFYX0NIQVJfT1VUX0RFTEFZXG5cblx0XHRjaGFyc1xuXG5cdEBfZ2V0UmFuZG9tQ2hhciA6ID0+XG5cblx0XHRjaGFyID0gQGNvbmZpZy5DSEFSU1sgXy5yYW5kb20oMCwgQGNvbmZpZy5DSEFSUy5sZW5ndGgtMSkgXVxuXG5cdFx0Y2hhclxuXG5cdEBfZ2V0TG9uZ2VzdENoYXJEdXJhdGlvbiA6IChjaGFycykgPT5cblxuXHRcdGxvbmdlc3RUaW1lID0gMFxuXHRcdGxvbmdlc3RUaW1lSWR4ID0gMFxuXG5cdFx0Zm9yIGNoYXIsIGkgaW4gY2hhcnNcblxuXHRcdFx0dGltZSA9IDBcblx0XHRcdCh0aW1lICs9IHdyb25nQ2hhci5pbkRlbGF5ICsgd3JvbmdDaGFyLm91dERlbGF5KSBmb3Igd3JvbmdDaGFyIGluIGNoYXIud3JvbmdDaGFyc1xuXHRcdFx0aWYgdGltZSA+IGxvbmdlc3RUaW1lXG5cdFx0XHRcdGxvbmdlc3RUaW1lID0gdGltZVxuXHRcdFx0XHRsb25nZXN0VGltZUlkeCA9IGlcblxuXHRcdGxvbmdlc3RUaW1lSWR4XG5cblx0QF9hbmltYXRlQ2hhcnMgOiAod29yZCwgc2VxdWVudGlhbCwgY2IpID0+XG5cblx0XHRhY3RpdmVDaGFyID0gMFxuXG5cdFx0aWYgc2VxdWVudGlhbFxuXHRcdFx0QF9hbmltYXRlQ2hhciB3b3JkLmNoYXJzLCBhY3RpdmVDaGFyLCB0cnVlLCBjYlxuXHRcdGVsc2Vcblx0XHRcdGxvbmdlc3RDaGFySWR4ID0gQF9nZXRMb25nZXN0Q2hhckR1cmF0aW9uIHdvcmQuY2hhcnNcblx0XHRcdGZvciBjaGFyLCBpIGluIHdvcmQuY2hhcnNcblx0XHRcdFx0YXJncyA9IFsgd29yZC5jaGFycywgaSwgZmFsc2UgXVxuXHRcdFx0XHRpZiBpIGlzIGxvbmdlc3RDaGFySWR4IHRoZW4gYXJncy5wdXNoIGNiXG5cdFx0XHRcdEBfYW5pbWF0ZUNoYXIuYXBwbHkgQCwgYXJnc1xuXG5cdFx0bnVsbFxuXG5cdEBfYW5pbWF0ZUNoYXIgOiAoY2hhcnMsIGlkeCwgcmVjdXJzZSwgY2IpID0+XG5cblx0XHRjaGFyID0gY2hhcnNbaWR4XVxuXG5cdFx0aWYgcmVjdXJzZVxuXG5cdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsID0+XG5cblx0XHRcdFx0aWYgaWR4IGlzIGNoYXJzLmxlbmd0aC0xXG5cdFx0XHRcdFx0QF9hbmltYXRlQ2hhcnNEb25lIGNiXG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRAX2FuaW1hdGVDaGFyIGNoYXJzLCBpZHgrMSwgcmVjdXJzZSwgY2JcblxuXHRcdGVsc2VcblxuXHRcdFx0aWYgdHlwZW9mIGNiIGlzICdmdW5jdGlvbidcblx0XHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyLCA9PiBAX2FuaW1hdGVDaGFyc0RvbmUgY2Jcblx0XHRcdGVsc2Vcblx0XHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlV3JvbmdDaGFycyA6IChjaGFyLCBjYikgPT5cblxuXHRcdGlmIGNoYXIud3JvbmdDaGFycy5sZW5ndGhcblxuXHRcdFx0d3JvbmdDaGFyID0gY2hhci53cm9uZ0NoYXJzLnNoaWZ0KClcblxuXHRcdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0XHRjaGFyLiRlbC5odG1sIHdyb25nQ2hhci5jaGFyXG5cblx0XHRcdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgY2Jcblx0XHRcdFx0LCB3cm9uZ0NoYXIub3V0RGVsYXlcblxuXHRcdFx0LCB3cm9uZ0NoYXIuaW5EZWxheVxuXG5cdFx0ZWxzZVxuXG5cdFx0XHRjaGFyLiRlbFxuXHRcdFx0XHQuYXR0cignZGF0YS1jb2RldGV4dC1jaGFyLXN0YXRlJywgY2hhci5jaGFyU3RhdGUpXG5cdFx0XHRcdC5odG1sKGNoYXIudGFyZ2V0Q2hhcilcblxuXHRcdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVDaGFyc0RvbmUgOiAoY2IpID0+XG5cblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdEBfc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSA9PlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgPT5cblx0XHRcdHIgPSB2YWxzW2JdXG5cdFx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QHRvIDogKHRhcmdldFRleHQsICRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEB0byh0YXJnZXRUZXh0LCBfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cdFx0d29yZC52aXNpYmxlID0gdHJ1ZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCB0YXJnZXRUZXh0LCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEBpbiA6ICgkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAaW4oXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXHRcdHdvcmQudmlzaWJsZSA9IHRydWVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ3JpZ2h0JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAb3V0IDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEBvdXQoXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHR3b3JkLnZpc2libGUgPSBmYWxzZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAnZW1wdHknLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEBzY3JhbWJsZSA6ICgkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAc2NyYW1ibGUoXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ3dyb25nJywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAdW5zY3JhbWJsZSA6ICgkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAdW5zY3JhbWJsZShfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAncmlnaHQnLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEBnZXRTY3JhbWJsZWRXb3JkIDogKHdvcmQpID0+XG5cblx0XHRuZXdDaGFycyA9IFtdXG5cdFx0KG5ld0NoYXJzLnB1c2ggQF9nZXRSYW5kb21DaGFyKCkpIGZvciBjaGFyIGluIHdvcmQuc3BsaXQoJycpXG5cblx0XHRyZXR1cm4gbmV3Q2hhcnMuam9pbignJylcblxubW9kdWxlLmV4cG9ydHMgPSBDb2RlV29yZFRyYW5zaXRpb25lclxuXG53aW5kb3cuQ29kZVdvcmRUcmFuc2l0aW9uZXI9IENvZGVXb3JkVHJhbnNpdGlvbmVyXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkZhY2Vib29rIFNESyB3cmFwcGVyIC0gbG9hZCBhc3luY2hyb25vdXNseSwgc29tZSBoZWxwZXIgbWV0aG9kc1xuXG4jIyNcbmNsYXNzIEZhY2Vib29rIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgICAgIDogJy8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvYWxsLmpzJ1xuXG5cdEBwZXJtaXNzaW9ucyA6ICdlbWFpbCdcblxuXHRAJGRhdGFEZmQgICAgOiBudWxsXG5cdEBsb2FkZWQgICAgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEZCLmluaXRcblx0XHRcdGFwcElkICA6IHdpbmRvdy5jb25maWcuZmJfYXBwX2lkXG5cdFx0XHRzdGF0dXMgOiBmYWxzZVxuXHRcdFx0eGZibWwgIDogZmFsc2VcblxuXHRcdG51bGxcblxuXHRAbG9naW4gOiAoQCRkYXRhRGZkKSA9PlxuXG5cdFx0aWYgIUBsb2FkZWQgdGhlbiByZXR1cm4gQCRkYXRhRGZkLnJlamVjdCAnU0RLIG5vdCBsb2FkZWQnXG5cblx0XHRGQi5sb2dpbiAoIHJlcyApID0+XG5cblx0XHRcdGlmIHJlc1snc3RhdHVzJ10gaXMgJ2Nvbm5lY3RlZCdcblx0XHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYXV0aFJlc3BvbnNlJ11bJ2FjY2Vzc1Rva2VuJ11cblx0XHRcdGVsc2Vcblx0XHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnbm8gd2F5IGpvc2UnXG5cblx0XHQsIHsgc2NvcGU6IEBwZXJtaXNzaW9ucyB9XG5cblx0XHRudWxsXG5cblx0QGdldFVzZXJEYXRhIDogKHRva2VuKSA9PlxuXG5cdFx0dXNlckRhdGEgPSB7fVxuXHRcdHVzZXJEYXRhLmFjY2Vzc190b2tlbiA9IHRva2VuXG5cblx0XHQkbWVEZmQgICA9ICQuRGVmZXJyZWQoKVxuXHRcdCRwaWNEZmQgID0gJC5EZWZlcnJlZCgpXG5cblx0XHRGQi5hcGkgJy9tZScsIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLmZ1bGxfbmFtZSA9IHJlcy5uYW1lXG5cdFx0XHR1c2VyRGF0YS5zb2NpYWxfaWQgPSByZXMuaWRcblx0XHRcdHVzZXJEYXRhLmVtYWlsICAgICA9IHJlcy5lbWFpbCBvciBmYWxzZVxuXHRcdFx0JG1lRGZkLnJlc29sdmUoKVxuXG5cdFx0RkIuYXBpICcvbWUvcGljdHVyZScsIHsgJ3dpZHRoJzogJzIwMCcgfSwgKHJlcykgLT5cblxuXHRcdFx0dXNlckRhdGEucHJvZmlsZV9waWMgPSByZXMuZGF0YS51cmxcblx0XHRcdCRwaWNEZmQucmVzb2x2ZSgpXG5cblx0XHQkLndoZW4oJG1lRGZkLCAkcGljRGZkKS5kb25lID0+IEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cblx0QHNoYXJlIDogKG9wdHMsIGNiKSA9PlxuXG5cdFx0RkIudWkge1xuXHRcdFx0bWV0aG9kICAgICAgOiBvcHRzLm1ldGhvZCBvciAnZmVlZCdcblx0XHRcdG5hbWUgICAgICAgIDogb3B0cy5uYW1lIG9yICcnXG5cdFx0XHRsaW5rICAgICAgICA6IG9wdHMubGluayBvciAnJ1xuXHRcdFx0cGljdHVyZSAgICAgOiBvcHRzLnBpY3R1cmUgb3IgJydcblx0XHRcdGNhcHRpb24gICAgIDogb3B0cy5jYXB0aW9uIG9yICcnXG5cdFx0XHRkZXNjcmlwdGlvbiA6IG9wdHMuZGVzY3JpcHRpb24gb3IgJydcblx0XHR9LCAocmVzcG9uc2UpIC0+XG5cdFx0XHRjYj8ocmVzcG9uc2UpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZWJvb2tcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuXG4jIyNcblxuR29vZ2xlKyBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBHb29nbGVQbHVzIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgIDogJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudDpwbHVzb25lLmpzJ1xuXG5cdEBwYXJhbXMgICA6XG5cdFx0J2NsaWVudGlkJyAgICAgOiBudWxsXG5cdFx0J2NhbGxiYWNrJyAgICAgOiBudWxsXG5cdFx0J3Njb3BlJyAgICAgICAgOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5lbWFpbCdcblx0XHQnY29va2llcG9saWN5JyA6ICdub25lJ1xuXG5cdEAkZGF0YURmZCA6IG51bGxcblx0QGxvYWRlZCAgIDogZmFsc2VcblxuXHRAbG9hZCA6ID0+XG5cblx0XHQjIyNcblx0XHRUTyBET1xuXHRcdGluY2x1ZGUgc2NyaXB0IGxvYWRlciB3aXRoIGNhbGxiYWNrIHRvIDppbml0XG5cdFx0IyMjXG5cdFx0IyByZXF1aXJlIFtAdXJsXSwgQGluaXRcblxuXHRcdG51bGxcblxuXHRAaW5pdCA6ID0+XG5cblx0XHRAbG9hZGVkID0gdHJ1ZVxuXG5cdFx0QHBhcmFtc1snY2xpZW50aWQnXSA9IHdpbmRvdy5jb25maWcuZ3BfYXBwX2lkXG5cdFx0QHBhcmFtc1snY2FsbGJhY2snXSA9IEBsb2dpbkNhbGxiYWNrXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmIEBsb2FkZWRcblx0XHRcdGdhcGkuYXV0aC5zaWduSW4gQHBhcmFtc1xuXHRcdGVsc2Vcblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbkNhbGxiYWNrIDogKHJlcykgPT5cblxuXHRcdGlmIHJlc1snc3RhdHVzJ11bJ3NpZ25lZF9pbiddXG5cdFx0XHRAZ2V0VXNlckRhdGEgcmVzWydhY2Nlc3NfdG9rZW4nXVxuXHRcdGVsc2UgaWYgcmVzWydlcnJvciddWydhY2Nlc3NfZGVuaWVkJ11cblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdGdhcGkuY2xpZW50LmxvYWQgJ3BsdXMnLCd2MScsID0+XG5cblx0XHRcdHJlcXVlc3QgPSBnYXBpLmNsaWVudC5wbHVzLnBlb3BsZS5nZXQgJ3VzZXJJZCc6ICdtZSdcblx0XHRcdHJlcXVlc3QuZXhlY3V0ZSAocmVzKSA9PlxuXG5cdFx0XHRcdHVzZXJEYXRhID1cblx0XHRcdFx0XHRhY2Nlc3NfdG9rZW4gOiB0b2tlblxuXHRcdFx0XHRcdGZ1bGxfbmFtZSAgICA6IHJlcy5kaXNwbGF5TmFtZVxuXHRcdFx0XHRcdHNvY2lhbF9pZCAgICA6IHJlcy5pZFxuXHRcdFx0XHRcdGVtYWlsICAgICAgICA6IGlmIHJlcy5lbWFpbHNbMF0gdGhlbiByZXMuZW1haWxzWzBdLnZhbHVlIGVsc2UgZmFsc2Vcblx0XHRcdFx0XHRwcm9maWxlX3BpYyAgOiByZXMuaW1hZ2UudXJsXG5cblx0XHRcdFx0QCRkYXRhRGZkLnJlc29sdmUgdXNlckRhdGFcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVQbHVzXG4iLCIjICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jICAgTWVkaWEgUXVlcmllcyBNYW5hZ2VyIFxuIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIFxuIyAgIEBhdXRob3IgOiBGw6FiaW8gQXpldmVkbyA8ZmFiaW8uYXpldmVkb0B1bml0OS5jb20+IFVOSVQ5XG4jICAgQGRhdGUgICA6IFNlcHRlbWJlciAxNFxuIyAgIFxuIyAgIEluc3RydWN0aW9ucyBhcmUgb24gL3Byb2plY3Qvc2Fzcy91dGlscy9fcmVzcG9uc2l2ZS5zY3NzLlxuXG5jbGFzcyBNZWRpYVF1ZXJpZXNcblxuICAgICMgQnJlYWtwb2ludHNcbiAgICBAU01BTEwgICAgICAgOiBcInNtYWxsXCJcbiAgICBASVBBRCAgICAgICAgOiBcImlwYWRcIlxuICAgIEBNRURJVU0gICAgICA6IFwibWVkaXVtXCJcbiAgICBATEFSR0UgICAgICAgOiBcImxhcmdlXCJcbiAgICBARVhUUkFfTEFSR0UgOiBcImV4dHJhLWxhcmdlXCJcblxuICAgIEBzZXR1cCA6ID0+XG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLlNNQUxMX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiU21hbGxcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuU01BTExdfVxuICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlQgPSB7bmFtZTogXCJNZWRpdW1cIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuTUVESVVNXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLkxBUkdFX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiTGFyZ2VcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuSVBBRCwgTWVkaWFRdWVyaWVzLkxBUkdFLCBNZWRpYVF1ZXJpZXMuRVhUUkFfTEFSR0VdfVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUyA9IFtcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlRcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UXG4gICAgICAgIF1cbiAgICAgICAgcmV0dXJuXG5cbiAgICBAZ2V0RGV2aWNlU3RhdGUgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBcImFmdGVyXCIpLmdldFByb3BlcnR5VmFsdWUoXCJjb250ZW50XCIpO1xuXG4gICAgQGdldEJyZWFrcG9pbnQgOiA9PlxuXG4gICAgICAgIHN0YXRlID0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcblxuICAgICAgICBmb3IgaSBpbiBbMC4uLk1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUy5sZW5ndGhdXG4gICAgICAgICAgICBpZiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0uYnJlYWtwb2ludHMuaW5kZXhPZihzdGF0ZSkgPiAtMVxuICAgICAgICAgICAgICAgIHJldHVybiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0ubmFtZVxuXG4gICAgICAgIHJldHVybiBcIlwiXG5cbiAgICBAaXNCcmVha3BvaW50IDogKGJyZWFrcG9pbnQpID0+XG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5icmVha3BvaW50LmJyZWFrcG9pbnRzLmxlbmd0aF1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgYnJlYWtwb2ludC5icmVha3BvaW50c1tpXSA9PSBNZWRpYVF1ZXJpZXMuZ2V0RGV2aWNlU3RhdGUoKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbndpbmRvdy5NZWRpYVF1ZXJpZXMgPSBNZWRpYVF1ZXJpZXNcblxubW9kdWxlLmV4cG9ydHMgPSBNZWRpYVF1ZXJpZXNcbiIsImNsYXNzIE51bWJlclV0aWxzXG5cbiAgICBATUFUSF9DT1M6IE1hdGguY29zIFxuICAgIEBNQVRIX1NJTjogTWF0aC5zaW4gXG4gICAgQE1BVEhfUkFORE9NOiBNYXRoLnJhbmRvbSBcbiAgICBATUFUSF9BQlM6IE1hdGguYWJzXG4gICAgQE1BVEhfQVRBTjI6IE1hdGguYXRhbjJcblxuICAgIEBsaW1pdDoobnVtYmVyLCBtaW4sIG1heCktPlxuICAgICAgICByZXR1cm4gTWF0aC5taW4oIE1hdGgubWF4KG1pbixudW1iZXIpLCBtYXggKVxuXG4gICAgQGdldFJhbmRvbUNvbG9yOiAtPlxuXG4gICAgICAgIGxldHRlcnMgPSAnMDEyMzQ1Njc4OUFCQ0RFRicuc3BsaXQoJycpXG4gICAgICAgIGNvbG9yID0gJyMnXG4gICAgICAgIGZvciBpIGluIFswLi4uNl1cbiAgICAgICAgICAgIGNvbG9yICs9IGxldHRlcnNbTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTUpXVxuICAgICAgICBjb2xvclxuXG4gICAgQGdldFRpbWVTdGFtcERpZmYgOiAoZGF0ZTEsIGRhdGUyKSAtPlxuXG4gICAgICAgICMgR2V0IDEgZGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAgICBvbmVfZGF5ID0gMTAwMCo2MCo2MCoyNFxuICAgICAgICB0aW1lICAgID0ge31cblxuICAgICAgICAjIENvbnZlcnQgYm90aCBkYXRlcyB0byBtaWxsaXNlY29uZHNcbiAgICAgICAgZGF0ZTFfbXMgPSBkYXRlMS5nZXRUaW1lKClcbiAgICAgICAgZGF0ZTJfbXMgPSBkYXRlMi5nZXRUaW1lKClcblxuICAgICAgICAjIENhbGN1bGF0ZSB0aGUgZGlmZmVyZW5jZSBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRhdGUyX21zIC0gZGF0ZTFfbXNcblxuICAgICAgICAjIHRha2Ugb3V0IG1pbGxpc2Vjb25kc1xuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy8xMDAwXG4gICAgICAgIHRpbWUuc2Vjb25kcyAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMgJSA2MClcblxuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy82MCBcbiAgICAgICAgdGltZS5taW51dGVzICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcyAlIDYwKVxuXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkaWZmZXJlbmNlX21zLzYwIFxuICAgICAgICB0aW1lLmhvdXJzICAgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zICUgMjQpICBcblxuICAgICAgICB0aW1lLmRheXMgICAgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zLzI0KVxuXG4gICAgICAgIHRpbWVcblxuICAgIEBtYXA6ICggbnVtLCBtaW4xLCBtYXgxLCBtaW4yLCBtYXgyLCByb3VuZCA9IGZhbHNlLCBjb25zdHJhaW5NaW4gPSB0cnVlLCBjb25zdHJhaW5NYXggPSB0cnVlICkgLT5cbiAgICAgICAgaWYgY29uc3RyYWluTWluIGFuZCBudW0gPCBtaW4xIHRoZW4gcmV0dXJuIG1pbjJcbiAgICAgICAgaWYgY29uc3RyYWluTWF4IGFuZCBudW0gPiBtYXgxIHRoZW4gcmV0dXJuIG1heDJcbiAgICAgICAgXG4gICAgICAgIG51bTEgPSAobnVtIC0gbWluMSkgLyAobWF4MSAtIG1pbjEpXG4gICAgICAgIG51bTIgPSAobnVtMSAqIChtYXgyIC0gbWluMikpICsgbWluMlxuICAgICAgICBpZiByb3VuZCB0aGVuIHJldHVybiBNYXRoLnJvdW5kKG51bTIpXG5cbiAgICAgICAgcmV0dXJuIG51bTJcblxuICAgIEB0b1JhZGlhbnM6ICggZGVncmVlICkgLT5cbiAgICAgICAgcmV0dXJuIGRlZ3JlZSAqICggTWF0aC5QSSAvIDE4MCApXG5cbiAgICBAdG9EZWdyZWU6ICggcmFkaWFucyApIC0+XG4gICAgICAgIHJldHVybiByYWRpYW5zICogKCAxODAgLyBNYXRoLlBJIClcblxuICAgIEBpc0luUmFuZ2U6ICggbnVtLCBtaW4sIG1heCwgY2FuQmVFcXVhbCApIC0+XG4gICAgICAgIGlmIGNhbkJlRXF1YWwgdGhlbiByZXR1cm4gbnVtID49IG1pbiAmJiBudW0gPD0gbWF4XG4gICAgICAgIGVsc2UgcmV0dXJuIG51bSA+PSBtaW4gJiYgbnVtIDw9IG1heFxuXG4gICAgIyBjb252ZXJ0IG1ldHJlcyBpbiB0byBtIC8gS01cbiAgICBAZ2V0TmljZURpc3RhbmNlOiAobWV0cmVzKSA9PlxuXG4gICAgICAgIGlmIG1ldHJlcyA8IDEwMDBcblxuICAgICAgICAgICAgcmV0dXJuIFwiI3tNYXRoLnJvdW5kKG1ldHJlcyl9TVwiXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBrbSA9IChtZXRyZXMvMTAwMCkudG9GaXhlZCgyKVxuICAgICAgICAgICAgcmV0dXJuIFwiI3trbX1LTVwiXG5cbiAgICAjIGZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTI2NzMzOFxuICAgIEB6ZXJvRmlsbDogKCBudW1iZXIsIHdpZHRoICkgPT5cblxuICAgICAgICB3aWR0aCAtPSBudW1iZXIudG9TdHJpbmcoKS5sZW5ndGhcblxuICAgICAgICBpZiB3aWR0aCA+IDBcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXJyYXkoIHdpZHRoICsgKC9cXC4vLnRlc3QoIG51bWJlciApID8gMiA6IDEpICkuam9pbiggJzAnICkgKyBudW1iZXJcblxuICAgICAgICByZXR1cm4gbnVtYmVyICsgXCJcIiAjIGFsd2F5cyByZXR1cm4gYSBzdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJVdGlsc1xuIiwiIyMjXG4jIFJlcXVlc3RlciAjXG5cbldyYXBwZXIgZm9yIGAkLmFqYXhgIGNhbGxzXG5cbiMjI1xuY2xhc3MgUmVxdWVzdGVyXG5cbiAgICBAcmVxdWVzdHMgOiBbXVxuXG4gICAgQHJlcXVlc3Q6ICggZGF0YSApID0+XG4gICAgICAgICMjI1xuICAgICAgICBgZGF0YSA9IHtgPGJyPlxuICAgICAgICBgICB1cmwgICAgICAgICA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGAgIHR5cGUgICAgICAgIDogXCJQT1NUL0dFVC9QVVRcImA8YnI+XG4gICAgICAgIGAgIGRhdGEgICAgICAgIDogT2JqZWN0YDxicj5cbiAgICAgICAgYCAgZGF0YVR5cGUgICAgOiBqUXVlcnkgZGF0YVR5cGVgPGJyPlxuICAgICAgICBgICBjb250ZW50VHlwZSA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGB9YFxuICAgICAgICAjIyNcblxuICAgICAgICByID0gJC5hamF4IHtcblxuICAgICAgICAgICAgdXJsICAgICAgICAgOiBkYXRhLnVybFxuICAgICAgICAgICAgdHlwZSAgICAgICAgOiBpZiBkYXRhLnR5cGUgdGhlbiBkYXRhLnR5cGUgZWxzZSBcIlBPU1RcIixcbiAgICAgICAgICAgIGRhdGEgICAgICAgIDogaWYgZGF0YS5kYXRhIHRoZW4gZGF0YS5kYXRhIGVsc2UgbnVsbCxcbiAgICAgICAgICAgIGRhdGFUeXBlICAgIDogaWYgZGF0YS5kYXRhVHlwZSB0aGVuIGRhdGEuZGF0YVR5cGUgZWxzZSBcImpzb25cIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlIDogaWYgZGF0YS5jb250ZW50VHlwZSB0aGVuIGRhdGEuY29udGVudFR5cGUgZWxzZSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOFwiLFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGEgOiBpZiBkYXRhLnByb2Nlc3NEYXRhICE9IG51bGwgYW5kIGRhdGEucHJvY2Vzc0RhdGEgIT0gdW5kZWZpbmVkIHRoZW4gZGF0YS5wcm9jZXNzRGF0YSBlbHNlIHRydWVcblxuICAgICAgICB9XG5cbiAgICAgICAgci5kb25lIGRhdGEuZG9uZVxuICAgICAgICByLmZhaWwgZGF0YS5mYWlsXG4gICAgICAgIFxuICAgICAgICByXG5cbiAgICBAYWRkSW1hZ2UgOiAoZGF0YSwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgIyMjXG4gICAgICAgICoqIFVzYWdlOiA8YnI+XG4gICAgICAgIGBkYXRhID0gY2FudmFzcy50b0RhdGFVUkwoXCJpbWFnZS9qcGVnXCIpLnNsaWNlKFwiZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCxcIi5sZW5ndGgpYDxicj5cbiAgICAgICAgYFJlcXVlc3Rlci5hZGRJbWFnZSBkYXRhLCBcInpvZXRyb3BlXCIsIEBkb25lLCBAZmFpbGBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nXG4gICAgICAgICAgICB0eXBlICAgOiAnUE9TVCdcbiAgICAgICAgICAgIGRhdGEgICA6IHtpbWFnZV9iYXNlNjQgOiBlbmNvZGVVUkkoZGF0YSl9XG4gICAgICAgICAgICBkb25lICAgOiBkb25lXG4gICAgICAgICAgICBmYWlsICAgOiBmYWlsXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQGRlbGV0ZUltYWdlIDogKGlkLCBkb25lLCBmYWlsKSA9PlxuICAgICAgICBcbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nK2lkXG4gICAgICAgICAgICB0eXBlICAgOiAnREVMRVRFJ1xuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0ZXJcbiIsIiMjI1xuU2hhcmluZyBjbGFzcyBmb3Igbm9uLVNESyBsb2FkZWQgc29jaWFsIG5ldHdvcmtzLlxuSWYgU0RLIGlzIGxvYWRlZCwgYW5kIHByb3ZpZGVzIHNoYXJlIG1ldGhvZHMsIHRoZW4gdXNlIHRoYXQgY2xhc3MgaW5zdGVhZCwgZWcuIGBGYWNlYm9vay5zaGFyZWAgaW5zdGVhZCBvZiBgU2hhcmUuZmFjZWJvb2tgXG4jIyNcbmNsYXNzIFNoYXJlXG5cbiAgICB1cmwgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IC0+XG5cbiAgICAgICAgQHVybCA9IEBDRCgpLkJBU0VfVVJMXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIG9wZW5XaW4gOiAodXJsLCB3LCBoKSA9PlxuXG4gICAgICAgIGxlZnQgPSAoIHNjcmVlbi5hdmFpbFdpZHRoICAtIHcgKSA+PiAxXG4gICAgICAgIHRvcCAgPSAoIHNjcmVlbi5hdmFpbEhlaWdodCAtIGggKSA+PiAxXG5cbiAgICAgICAgd2luZG93Lm9wZW4gdXJsLCAnJywgJ3RvcD0nK3RvcCsnLGxlZnQ9JytsZWZ0Kycsd2lkdGg9Jyt3KycsaGVpZ2h0PScraCsnLGxvY2F0aW9uPW5vLG1lbnViYXI9bm8nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcGx1cyA6ICggdXJsICkgPT5cblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwczovL3BsdXMuZ29vZ2xlLmNvbS9zaGFyZT91cmw9I3t1cmx9XCIsIDY1MCwgMzg1XG5cbiAgICAgICAgbnVsbFxuXG4gICAgcGludGVyZXN0IDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnBpbnRlcmVzdC5jb20vcGluL2NyZWF0ZS9idXR0b24vP3VybD0je3VybH0mbWVkaWE9I3ttZWRpYX0mZGVzY3JpcHRpb249I3tkZXNjcn1cIiwgNzM1LCAzMTBcblxuICAgICAgICBudWxsXG5cbiAgICB0dW1ibHIgOiAodXJsLCBtZWRpYSwgZGVzY3IpID0+XG5cbiAgICAgICAgdXJsICAgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG4gICAgICAgIG1lZGlhID0gZW5jb2RlVVJJQ29tcG9uZW50KG1lZGlhKVxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChkZXNjcilcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cudHVtYmxyLmNvbS9zaGFyZS9waG90bz9zb3VyY2U9I3ttZWRpYX0mY2FwdGlvbj0je2Rlc2NyfSZjbGlja190aHJ1PSN7dXJsfVwiLCA0NTAsIDQzMFxuXG4gICAgICAgIG51bGxcblxuICAgIGZhY2Vib29rIDogKCB1cmwgLCBjb3B5ID0gJycpID0+IFxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBkZWNzciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5mYWNlYm9vay5jb20vc2hhcmUucGhwP3U9I3t1cmx9JnQ9I3tkZWNzcn1cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICB0d2l0dGVyIDogKCB1cmwgLCBjb3B5ID0gJycpID0+XG5cbiAgICAgICAgdXJsICAgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG4gICAgICAgIGlmIGNvcHkgaXMgJydcbiAgICAgICAgICAgIGNvcHkgPSBAQ0QoKS5sb2NhbGUuZ2V0ICdzZW9fdHdpdHRlcl9jYXJkX2Rlc2NyaXB0aW9uJ1xuICAgICAgICAgICAgXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGNvcHkpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vdHdpdHRlci5jb20vaW50ZW50L3R3ZWV0Lz90ZXh0PSN7ZGVzY3J9JnVybD0je3VybH1cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICByZW5yZW4gOiAoIHVybCApID0+IFxuXG4gICAgICAgIHVybCA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly9zaGFyZS5yZW5yZW4uY29tL3NoYXJlL2J1dHRvbnNoYXJlLmRvP2xpbms9XCIgKyB1cmwsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgd2VpYm8gOiAoIHVybCApID0+IFxuXG4gICAgICAgIHVybCA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly9zZXJ2aWNlLndlaWJvLmNvbS9zaGFyZS9zaGFyZS5waHA/dXJsPSN7dXJsfSZsYW5ndWFnZT16aF9jblwiLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIENEIDogPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gU2hhcmVcbiIsImNsYXNzIEFic3RyYWN0VmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuXHRlbCAgICAgICAgICAgOiBudWxsXG5cdGlkICAgICAgICAgICA6IG51bGxcblx0Y2hpbGRyZW4gICAgIDogbnVsbFxuXHR0ZW1wbGF0ZSAgICAgOiBudWxsXG5cdHRlbXBsYXRlVmFycyA6IG51bGxcblx0XG5cdGluaXRpYWxpemUgOiAtPlxuXHRcdFxuXHRcdEBjaGlsZHJlbiA9IFtdXG5cblx0XHRpZiBAdGVtcGxhdGVcblx0XHRcdHRtcEhUTUwgPSBfLnRlbXBsYXRlIEBDRCgpLnRlbXBsYXRlcy5nZXQgQHRlbXBsYXRlXG5cdFx0XHRAc2V0RWxlbWVudCB0bXBIVE1MIEB0ZW1wbGF0ZVZhcnNcblxuXHRcdEAkZWwuYXR0ciAnaWQnLCBAaWQgaWYgQGlkXG5cdFx0QCRlbC5hZGRDbGFzcyBAY2xhc3NOYW1lIGlmIEBjbGFzc05hbWVcblx0XHRcblx0XHRAaW5pdCgpXG5cblx0XHRAcGF1c2VkID0gZmFsc2VcblxuXHRcdG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHR1cGRhdGUgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdHJlbmRlciA6ID0+XG5cblx0XHRudWxsXG5cblx0YWRkQ2hpbGQgOiAoY2hpbGQsIHByZXBlbmQgPSBmYWxzZSkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0dGFyZ2V0ID0gaWYgQGFkZFRvU2VsZWN0b3IgdGhlbiBAJGVsLmZpbmQoQGFkZFRvU2VsZWN0b3IpLmVxKDApIGVsc2UgQCRlbFxuXHRcdFxuXHRcdGMgPSBpZiBjaGlsZC5lbCB0aGVuIGNoaWxkLiRlbCBlbHNlIGNoaWxkXG5cblx0XHRpZiAhcHJlcGVuZCBcblx0XHRcdHRhcmdldC5hcHBlbmQgY1xuXHRcdGVsc2UgXG5cdFx0XHR0YXJnZXQucHJlcGVuZCBjXG5cblx0XHRAXG5cblx0cmVwbGFjZSA6IChkb20sIGNoaWxkKSA9PlxuXG5cdFx0QGNoaWxkcmVuLnB1c2ggY2hpbGQgaWYgY2hpbGQuZWxcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXHRcdEAkZWwuY2hpbGRyZW4oZG9tKS5yZXBsYWNlV2l0aChjKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZSA6IChjaGlsZCkgPT5cblxuXHRcdHVubGVzcyBjaGlsZD9cblx0XHRcdHJldHVyblxuXHRcdFxuXHRcdGMgPSBpZiBjaGlsZC5lbCB0aGVuIGNoaWxkLiRlbCBlbHNlICQoY2hpbGQpXG5cdFx0Y2hpbGQuZGlzcG9zZSgpIGlmIGMgYW5kIGNoaWxkLmRpc3Bvc2VcblxuXHRcdGlmIGMgJiYgQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpICE9IC0xXG5cdFx0XHRAY2hpbGRyZW4uc3BsaWNlKCBAY2hpbGRyZW4uaW5kZXhPZihjaGlsZCksIDEgKVxuXG5cdFx0Yy5yZW1vdmUoKVxuXG5cdFx0bnVsbFxuXG5cdG9uUmVzaXplIDogKGV2ZW50KSA9PlxuXG5cdFx0KGlmIGNoaWxkLm9uUmVzaXplIHRoZW4gY2hpbGQub25SZXNpemUoKSkgZm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdG1vdXNlRW5hYmxlZCA6ICggZW5hYmxlZCApID0+XG5cblx0XHRAJGVsLmNzc1xuXHRcdFx0XCJwb2ludGVyLWV2ZW50c1wiOiBpZiBlbmFibGVkIHRoZW4gXCJhdXRvXCIgZWxzZSBcIm5vbmVcIlxuXG5cdFx0bnVsbFxuXG5cdENTU1RyYW5zbGF0ZSA6ICh4LCB5LCB2YWx1ZT0nJScsIHNjYWxlKSA9PlxuXG5cdFx0aWYgTW9kZXJuaXpyLmNzc3RyYW5zZm9ybXMzZFxuXHRcdFx0c3RyID0gXCJ0cmFuc2xhdGUzZCgje3grdmFsdWV9LCAje3krdmFsdWV9LCAwKVwiXG5cdFx0ZWxzZVxuXHRcdFx0c3RyID0gXCJ0cmFuc2xhdGUoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSlcIlxuXG5cdFx0aWYgc2NhbGUgdGhlbiBzdHIgPSBcIiN7c3RyfSBzY2FsZSgje3NjYWxlfSlcIlxuXG5cdFx0c3RyXG5cblx0dW5NdXRlQWxsIDogPT5cblxuXHRcdGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGQudW5NdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLnVuTXV0ZUFsbCgpXG5cblx0XHRudWxsXG5cblx0bXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLm11dGU/KClcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0Y2hpbGQubXV0ZUFsbCgpXG5cblx0XHRudWxsXG5cblx0cmVtb3ZlQWxsQ2hpbGRyZW46ID0+XG5cblx0XHRAcmVtb3ZlIGNoaWxkIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHR0cmlnZ2VyQ2hpbGRyZW4gOiAobXNnLCBjaGlsZHJlbj1AY2hpbGRyZW4pID0+XG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGQudHJpZ2dlciBtc2dcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0QHRyaWdnZXJDaGlsZHJlbiBtc2csIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0Y2FsbENoaWxkcmVuIDogKG1ldGhvZCwgcGFyYW1zLCBjaGlsZHJlbj1AY2hpbGRyZW4pID0+XG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0Y2FsbENoaWxkcmVuQW5kU2VsZiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0QFttZXRob2RdPyBwYXJhbXNcblxuXHRcdGZvciBjaGlsZCwgaSBpbiBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZFttZXRob2RdPyBwYXJhbXNcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0QGNhbGxDaGlsZHJlbiBtZXRob2QsIHBhcmFtcywgY2hpbGQuY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRzdXBwbGFudFN0cmluZyA6IChzdHIsIHZhbHMsIGFsbG93U3BhY2VzPXRydWUpIC0+XG5cblx0XHRyZSA9IGlmIGFsbG93U3BhY2VzIHRoZW4gbmV3IFJlZ0V4cCgne3sgKFtee31dKikgfX0nLCAnZycpIGVsc2UgbmV3IFJlZ0V4cCgne3soW157fV0qKX19JywgJ2cnKVxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIHJlLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdXG5cdFx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHQjIyNcblx0XHRvdmVycmlkZSBvbiBwZXIgdmlldyBiYXNpcyAtIHVuYmluZCBldmVudCBoYW5kbGVycyBldGNcblx0XHQjIyNcblxuXHRcdG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RWaWV3UGFnZSBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdF9zaG93biAgICAgOiBmYWxzZVxuXHRfbGlzdGVuaW5nIDogZmFsc2VcblxuXHRzaG93IDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyAhQF9zaG93blxuXHRcdEBfc2hvd24gPSB0cnVlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIuYWRkQ2hpbGQgQFxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb24nXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICd2aXNpYmxlJ1xuXHRcdGNiPygpXG5cblx0XHRpZiBAQ0QoKS5uYXYuY2hhbmdlVmlld0NvdW50IGlzIDFcblx0XHRcdEBDRCgpLmFwcFZpZXcub24gQENEKCkuYXBwVmlldy5FVkVOVF9QUkVMT0FERVJfSElERSwgQGFuaW1hdGVJblxuXHRcdGVsc2Vcblx0XHRcdEBhbmltYXRlSW4oKVxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiAoY2IpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIEBfc2hvd25cblx0XHRAX3Nob3duID0gZmFsc2VcblxuXHRcdCMjI1xuXHRcdENIQU5HRSBIRVJFIC0gJ3BhZ2UnIHZpZXdzIGFyZSBhbHdheXMgaW4gRE9NIC0gdG8gc2F2ZSBoYXZpbmcgdG8gcmUtaW5pdGlhbGlzZSBnbWFwIGV2ZW50cyAoUElUQSkuIE5vIGxvbmdlciByZXF1aXJlIDpkaXNwb3NlIG1ldGhvZFxuXHRcdCMjI1xuXHRcdEBDRCgpLmFwcFZpZXcud3JhcHBlci5yZW1vdmUgQFxuXG5cdFx0IyBAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29mZidcblxuXHRcdCMjIyByZXBsYWNlIHdpdGggc29tZSBwcm9wZXIgdHJhbnNpdGlvbiBpZiB3ZSBjYW4gIyMjXG5cdFx0QCRlbC5jc3MgJ3Zpc2liaWxpdHknIDogJ2hpZGRlbidcblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0QGNhbGxDaGlsZHJlbkFuZFNlbGYgJ3NldExpc3RlbmVycycsICdvZmYnXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIHNldHRpbmcgaXNudCBAX2xpc3RlbmluZ1xuXHRcdEBfbGlzdGVuaW5nID0gc2V0dGluZ1xuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHQjIyNcblx0XHRzdHViYmVkIGhlcmUsIG92ZXJyaWRlIGluIHVzZWQgcGFnZSBjbGFzc2VzXG5cdFx0IyMjXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3UGFnZVxuIiwiQWJzdHJhY3RWaWV3UGFnZSAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5Db250cmlidXRvcnNDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vLi4vY29sbGVjdGlvbnMvY29udHJpYnV0b3JzL0NvbnRyaWJ1dG9yc0NvbGxlY3Rpb24nXG5SZXF1ZXN0ZXIgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvUmVxdWVzdGVyJ1xuQVBJICAgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL2RhdGEvQVBJJ1xuXG5jbGFzcyBBYm91dFBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtYWJvdXQnXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QGNvbnRyaWJ1dG9ycyA9IG5ldyBDb250cmlidXRvcnNDb2xsZWN0aW9uXG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRsYWJlbF93aGF0ICAgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfbGFiZWxfd2hhdFwiXG5cdFx0XHRjb250ZW50X3doYXQgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfY29udGVudF93aGF0XCJcblx0XHRcdGxhYmVsX2NvbnRhY3QgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9sYWJlbF9jb250YWN0XCJcblx0XHRcdGNvbnRlbnRfY29udGFjdCA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9jb250ZW50X2NvbnRhY3RcIlxuXHRcdFx0bGFiZWxfd2hvICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2xhYmVsX3dob1wiXG5cblx0XHRzdXBlclxuXG5cdFx0QGdldENvbnRyaWJ1dG9yc0NvbnRlbnQoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRnZXRDb250cmlidXRvcnNDb250ZW50IDogPT5cblxuXHRcdHIgPSBSZXF1ZXN0ZXIucmVxdWVzdFxuICAgICAgICAgICAgIyB1cmwgIDogQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICAgICAgdXJsICA6IEBDRCgpLkJBU0VfVVJMICsgJy9kYXRhL19EVU1NWS9jb250cmlidXRvcnMuanNvbidcbiAgICAgICAgICAgIHR5cGUgOiAnR0VUJ1xuXG4gICAgICAgIHIuZG9uZSAocmVzKSA9PlxuICAgICAgICBcdEBjb250cmlidXRvcnMuYWRkIHJlcy5jb250cmlidXRvcnNcbiAgICAgICAgXHRAJGVsLmZpbmQoJ1tkYXRhLWNvbnRyaWJ1dG9yc10nKS5odG1sIEBjb250cmlidXRvcnMuZ2V0QWJvdXRIVE1MKClcblxuICAgICAgICByLmZhaWwgKHJlcykgPT4gY29uc29sZS5lcnJvciBcInByb2JsZW0gZ2V0dGluZyB0aGUgY29udHJpYnV0b3JzXCIsIHJlc1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFib3V0UGFnZVZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblxuY2xhc3MgRm9vdGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICB0ZW1wbGF0ZSA6ICdzaXRlLWZvb3RlcidcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEB0ZW1wbGF0ZVZhcnMgPSB7fVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEZvb3RlclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Sb3V0ZXIgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3JvdXRlci9Sb3V0ZXInXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBIZWFkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHR0ZW1wbGF0ZSA6ICdzaXRlLWhlYWRlcidcblxuXHRGSVJTVF9IQVNIQ0hBTkdFIDogdHJ1ZVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPVxuXHRcdFx0aG9tZSAgICA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9sb2dvX2xhYmVsJylcblx0XHRcdFx0dXJsICAgICAgOiBAQ0QoKS5CQVNFX1VSTCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cdFx0XHRhYm91dCA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9hYm91dF9sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVRcblx0XHRcdGNvbnRyaWJ1dGUgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY29udHJpYnV0ZV9sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0Y2xvc2VfbGFiZWwgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY2xvc2VfbGFiZWwnKVxuXHRcdFx0aW5mb19sYWJlbCA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9pbmZvX2xhYmVsJylcblxuXHRcdHN1cGVyKClcblxuXHRcdEBiaW5kRXZlbnRzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGxvZ28gICAgICAgICAgICAgID0gQCRlbC5maW5kKCcubG9nb19fbGluaycpXG5cdFx0QCRuYXZMaW5rQWJvdXQgICAgICA9IEAkZWwuZmluZCgnLmFib3V0LWJ0bicpXG5cdFx0QCRuYXZMaW5rQ29udHJpYnV0ZSA9IEAkZWwuZmluZCgnLmNvbnRyaWJ1dGUtYnRuJylcblx0XHRAJGluZm9CdG4gICAgICAgICAgID0gQCRlbC5maW5kKCcuaW5mby1idG4nKVxuXHRcdEAkY2xvc2VCdG4gICAgICAgICAgPSBAJGVsLmZpbmQoJy5jbG9zZS1idG4nKVxuXG5cdFx0bnVsbFxuXG5cdGJpbmRFdmVudHMgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1BSRUxPQURFUl9ISURFLCBAYW5pbWF0ZVRleHRJblxuXHRcdEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAb25IYXNoQ2hhbmdlXG5cblx0XHRAJGVsLm9uICdtb3VzZWVudGVyJywgJ1tkYXRhLWNvZGV3b3JkXScsIEBvbldvcmRFbnRlclxuXHRcdEAkZWwub24gJ21vdXNlbGVhdmUnLCAnW2RhdGEtY29kZXdvcmRdJywgQG9uV29yZExlYXZlXG5cblx0XHRudWxsXG5cblx0b25IYXNoQ2hhbmdlIDogKHdoZXJlKSA9PlxuXG5cdFx0aWYgQEZJUlNUX0hBU0hDSEFOR0Vcblx0XHRcdEBGSVJTVF9IQVNIQ0hBTkdFID0gZmFsc2Vcblx0XHRcdHJldHVyblxuXHRcdFxuXHRcdEBvbkFyZWFDaGFuZ2Ugd2hlcmVcblxuXHRcdG51bGxcblxuXHRvbkFyZWFDaGFuZ2UgOiAoc2VjdGlvbikgPT5cblxuXHRcdGNvbG91ciA9IEBnZXRTZWN0aW9uQ29sb3VyIHNlY3Rpb25cblxuXHRcdEAkZWwuYXR0ciAnZGF0YS1zZWN0aW9uJywgc2VjdGlvblxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRsb2dvLCBjb2xvdXJcblxuXHRcdCMgdGhpcyBqdXN0IGZvciB0ZXN0aW5nLCB0aWR5IGxhdGVyXG5cdFx0aWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFU1xuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZV0sIGNvbG91clxuXHRcdGVsc2Vcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlLCBAJGluZm9CdG5dLCBjb2xvdXJcblxuXHRcdG51bGxcblxuXHRnZXRTZWN0aW9uQ29sb3VyIDogKHNlY3Rpb24pID0+XG5cblx0XHRzZWN0aW9uID0gc2VjdGlvbiBvciBAQ0QoKS5uYXYuY3VycmVudC5hcmVhIG9yICdob21lJ1xuXG5cdFx0Y29sb3VyID0gc3dpdGNoIHNlY3Rpb25cblx0XHRcdHdoZW4gJ2hvbWUnIHRoZW4gJ3JlZCdcblx0XHRcdHdoZW4gQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUIHRoZW4gJ3doaXRlJ1xuXHRcdFx0d2hlbiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURSB0aGVuICd3aGl0ZSdcblx0XHRcdGVsc2UgJ3doaXRlJ1xuXG5cdFx0Y29sb3VyXG5cblx0YW5pbWF0ZVRleHRJbiA6ID0+XG5cblx0XHRAb25BcmVhQ2hhbmdlIEBDRCgpLm5hdi5jdXJyZW50LmFyZWFcblxuXHRcdG51bGxcblxuXHRvbldvcmRFbnRlciA6IChlKSA9PlxuXG5cdFx0JGVsID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5zY3JhbWJsZSAkZWwsIEBnZXRTZWN0aW9uQ29sb3VyKClcblxuXHRcdG51bGxcblxuXHRvbldvcmRMZWF2ZSA6IChlKSA9PlxuXG5cdFx0JGVsID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci51bnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIoKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWRlclxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuSG9tZVZpZXcgICAgID0gcmVxdWlyZSAnLi4vaG9tZS9Ib21lVmlldydcbkNvbG9ycyAgICAgICA9IHJlcXVpcmUgJy4uLy4uL2NvbmZpZy9Db2xvcnMnXG5cbmNsYXNzIFBhZ2VUcmFuc2l0aW9uZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ3BhZ2UtdHJhbnNpdGlvbmVyJ1xuXG4gICAgcGFsZXR0ZXMgOlxuICAgICAgICBIT01FICAgICAgIDogWyBDb2xvcnMuQ0RfQkxVRSwgQ29sb3JzLk9GRl9XSElURSwgQ29sb3JzLkNEX1JFRCBdXG4gICAgICAgIEFCT1VUICAgICAgOiBbIENvbG9ycy5DRF9SRUQsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9CTFVFIF1cbiAgICAgICAgQ09OVFJJQlVURSA6IFsgQ29sb3JzLkNEX0JMVUUsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9SRUQgXVxuICAgICAgICBET09ETEVTICAgIDogWyBDb2xvcnMuQ0RfUkVELCBDb2xvcnMuT0ZGX1dISVRFLCBDb2xvcnMuQ0RfQkxVRSBdXG5cbiAgICBhY3RpdmVDb25maWcgOlxuICAgICAgICBwcm9wIDogbnVsbFxuICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICB0b3AgOiBudWxsLCBib3R0b20gOiBudWxsLCBsZWZ0IDogbnVsbCwgcmlnaHQgOiBudWxsLCB3aWR0aCA6IG51bGwsIGhlaWdodCA6IG51bGxcbiAgICAgICAgZW5kIDpcbiAgICAgICAgICAgIHRvcCA6IG51bGwsIGJvdHRvbSA6IG51bGwsIGxlZnQgOiBudWxsLCByaWdodCA6IG51bGwsIHdpZHRoIDogbnVsbCwgaGVpZ2h0IDogbnVsbFxuXG4gICAgY29uZmlnUHJlc2V0cyA6XG4gICAgICAgIGJvdHRvbVRvVG9wIDpcbiAgICAgICAgICAgIHByb3AgOiAnaGVpZ2h0J1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHRvcCA6ICdhdXRvJywgYm90dG9tIDogMCwgbGVmdCA6IDAsIHJpZ2h0IDogMCwgd2lkdGggOiAnMTAwJScsIGhlaWdodCA6IDBcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdG9wIDogMCwgYm90dG9tIDogJ2F1dG8nLCBsZWZ0IDogMCwgcmlnaHQgOiAwLCB3aWR0aCA6ICcxMDAlJywgaGVpZ2h0IDogJzEwMCUnXG4gICAgICAgIHRvcFRvQm90dG9tIDpcbiAgICAgICAgICAgIHByb3AgOiAnaGVpZ2h0J1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHRvcCA6IDAsIGJvdHRvbSA6ICdhdXRvJywgbGVmdCA6IDAsIHJpZ2h0IDogMCwgd2lkdGggOiAnMTAwJScsIGhlaWdodCA6IDBcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdG9wIDogJ2F1dG8nLCBib3R0b20gOiAwLCBsZWZ0IDogMCwgcmlnaHQgOiAwLCB3aWR0aCA6ICcxMDAlJywgaGVpZ2h0IDogJzEwMCUnXG4gICAgICAgIGxlZnRUb1JpZ2h0IDpcbiAgICAgICAgICAgIHByb3AgOiAnd2lkdGgnXG4gICAgICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICAgICAgdG9wIDogMCwgYm90dG9tIDogMCwgbGVmdCA6IDAsIHJpZ2h0IDogJ2F1dG8nLCB3aWR0aCA6IDAsIGhlaWdodCA6ICcxMDAlJ1xuICAgICAgICAgICAgZW5kIDpcbiAgICAgICAgICAgICAgICB0b3AgOiAwLCBib3R0b20gOiAwLCBsZWZ0IDogJ2F1dG8nLCByaWdodCA6IDAsIHdpZHRoIDogJzEwMCUnLCBoZWlnaHQgOiAnMTAwJSdcbiAgICAgICAgcmlnaHRUb0xlZnQgOlxuICAgICAgICAgICAgcHJvcCA6ICd3aWR0aCdcbiAgICAgICAgICAgIHN0YXJ0IDpcbiAgICAgICAgICAgICAgICB0b3AgOiAwLCBib3R0b20gOiAwLCBsZWZ0IDogJ2F1dG8nLCByaWdodCA6IDAsIHdpZHRoIDogMCwgaGVpZ2h0IDogJzEwMCUnXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHRvcCA6IDAsIGJvdHRvbSA6IDAsIGxlZnQgOiAwLCByaWdodCA6ICdhdXRvJywgd2lkdGggOiAnMTAwJScsIGhlaWdodCA6ICcxMDAlJ1xuXG4gICAgY29uc3RydWN0b3I6IC0+XG5cbiAgICAgICAgQHRlbXBsYXRlVmFycyA9IHt9XG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBpbml0IDogPT5cblxuICAgICAgICBAJHBhbmVzID0gQCRlbC5maW5kKCdbZGF0YS1wYW5lXScpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcHJlcGFyZSA6IChmcm9tQXJlYSwgdG9BcmVhKSA9PlxuXG4gICAgICAgIEByZXNldFBhbmVzKClcblxuICAgICAgICBAYXBwbHlQYWxldHRlIEBnZXRQYWxldHRlIHRvQXJlYVxuXG4gICAgICAgIEBhY3RpdmVDb25maWcgPSBAZ2V0Q29uZmlnKGZyb21BcmVhLCB0b0FyZWEpXG5cbiAgICAgICAgQGFwcGx5Q29uZmlnIEBhY3RpdmVDb25maWcuc3RhcnRcblxuICAgICAgICBudWxsXG5cbiAgICByZXNldFBhbmVzIDogPT5cblxuICAgICAgICBAJHBhbmVzLmF0dHIgJ3N0eWxlJzogJydcblxuICAgICAgICBudWxsXG5cbiAgICBnZXRQYWxldHRlIDogKGFyZWEpID0+XG5cbiAgICAgICAgc2VjdGlvbiA9IEBDRCgpLm5hdi5nZXRTZWN0aW9uIGFyZWEsIHRydWVcblxuICAgICAgICBAcGFsZXR0ZXNbc2VjdGlvbl0gb3IgQHBhbGV0dGVzLkhPTUVcblxuICAgIGFwcGx5UGFsZXR0ZSA6IChwYWxldHRlKSA9PlxuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSkgPT4gQCRwYW5lcy5lcShpKS5jc3MgJ2JhY2tncm91bmQtY29sb3InIDogcGFsZXR0ZVtpXVxuXG4gICAgICAgIG51bGxcblxuICAgIGdldENvbmZpZyA6IChmcm9tQXJlYSwgdG9BcmVhKSA9PlxuXG4gICAgICAgIGlmICFIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb24gYW5kIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuICAgICAgICAgICAgY29uZmlnID0gQGNvbmZpZ1ByZXNldHMuYm90dG9tVG9Ub3BcblxuICAgICAgICBlbHNlIGlmIGZyb21BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTIGFuZCB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVNcbiAgICAgICAgICAgIGNvbmZpZyA9IEBfZ2V0RG9vZGxlVG9Eb29kbGVDb25maWcgXCIje0BDRCgpLm5hdi5wcmV2aW91cy5zdWJ9LyN7QENEKCkubmF2LnByZXZpb3VzLnRlcn1cIiwgXCIje0BDRCgpLm5hdi5jdXJyZW50LnN1Yn0vI3tAQ0QoKS5uYXYuY3VycmVudC50ZXJ9XCJcblxuICAgICAgICBlbHNlIGlmIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQgb3IgdG9BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFXG4gICAgICAgICAgICAjIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLnRvcFRvQm90dG9tXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldFJhbmRvbUNvbmZpZygpXG5cbiAgICAgICAgIyBlbHNlIGlmIGZyb21BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FIG9yIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICAjIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLmJvdHRvbVRvVG9wXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldFJhbmRvbUNvbmZpZygpXG5cbiAgICAgICAgY29uZmlnXG5cbiAgICBfZ2V0RG9vZGxlVG9Eb29kbGVDb25maWcgOiAocHJldlNsdWcsIG5leHRTbHVnKSA9PlxuXG4gICAgICAgIHByZXZpb3VzRG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmZpbmRXaGVyZSBzbHVnIDogcHJldlNsdWdcbiAgICAgICAgcHJldmlvdXNEb29kbGVJZHggPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuaW5kZXhPZiBwcmV2aW91c0Rvb2RsZVxuXG4gICAgICAgIGN1cnJlbnREb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZmluZFdoZXJlIHNsdWcgOiBuZXh0U2x1Z1xuICAgICAgICBjdXJyZW50RG9vZGxlSWR4ID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmluZGV4T2YgY3VycmVudERvb2RsZVxuXG4gICAgICAgIF9jb25maWcgPSBpZiBwcmV2aW91c0Rvb2RsZUlkeCA+IGN1cnJlbnREb29kbGVJZHggdGhlbiBAY29uZmlnUHJlc2V0cy5sZWZ0VG9SaWdodCBlbHNlIEBjb25maWdQcmVzZXRzLnJpZ2h0VG9MZWZ0XG5cbiAgICAgICAgX2NvbmZpZ1xuXG4gICAgX2dldFJhbmRvbUNvbmZpZyA6ID0+XG5cbiAgICAgICAgX2NvbmZpZyA9IF8uc2h1ZmZsZShAY29uZmlnUHJlc2V0cylbMF1cblxuICAgICAgICBfY29uZmlnXG5cbiAgICBhcHBseUNvbmZpZyA6IChjb25maWcpID0+XG5cbiAgICAgICAgQCRwYW5lcy5jc3MgY29uZmlnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2hvdyA6ID0+XG5cbiAgICAgICAgQCRlbC5hZGRDbGFzcyAnc2hvdydcblxuICAgICAgICBudWxsXG5cbiAgICBoaWRlIDogPT5cblxuICAgICAgICBAJGVsLnJlbW92ZUNsYXNzICdzaG93J1xuXG4gICAgICAgIG51bGxcblxuICAgIGluIDogKGNiKSA9PlxuXG4gICAgICAgIEBzaG93KClcblxuICAgICAgICBAJHBhbmVzLmVhY2ggKGksIGVsKSA9PlxuICAgICAgICAgICAgcGFyYW1zID0gZWFzZSA6IEV4cG8uZWFzZU91dFxuICAgICAgICAgICAgcGFyYW1zLmRlbGF5ID0gaSAqIDAuMVxuICAgICAgICAgICAgcGFyYW1zW0BhY3RpdmVDb25maWcucHJvcF0gPSAnMTAwJSdcbiAgICAgICAgICAgIGlmIGkgaXMgMiB0aGVuIHBhcmFtcy5vbkNvbXBsZXRlID0gPT5cbiAgICAgICAgICAgICAgICBAYXBwbHlDb25maWcgQGFjdGl2ZUNvbmZpZy5lbmRcbiAgICAgICAgICAgICAgICBjYj8oKVxuXG4gICAgICAgICAgICBUd2VlbkxpdGUudG8gJChlbCksIDAuNSwgcGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb3V0IDogKGNiKSA9PlxuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSwgZWwpID0+XG4gICAgICAgICAgICBwYXJhbXMgPSBlYXNlIDogRXhwby5lYXNlT3V0XG4gICAgICAgICAgICBwYXJhbXMuZGVsYXkgPSAwLjIgLSAoMC4xICogaSlcbiAgICAgICAgICAgIHBhcmFtc1tAYWN0aXZlQ29uZmlnLnByb3BdID0gJzAnXG4gICAgICAgICAgICBpZiBpIGlzIDAgdGhlbiBwYXJhbXMub25Db21wbGV0ZSA9ID0+XG4gICAgICAgICAgICAgICAgQGhpZGUoKVxuICAgICAgICAgICAgICAgIGNiPygpXG5cbiAgICAgICAgICAgIFR3ZWVuTGl0ZS50byAkKGVsKSwgMC41LCBwYXJhbXNcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUGFnZVRyYW5zaXRpb25lclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBQcmVsb2FkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblx0XG5cdGNiICAgICAgICAgICAgICA6IG51bGxcblx0XG5cdFRSQU5TSVRJT05fVElNRSA6IDAuNVxuXG5cdE1JTl9XUk9OR19DSEFSUyA6IDBcblx0TUFYX1dST05HX0NIQVJTIDogNFxuXG5cdE1JTl9DSEFSX0lOX0RFTEFZIDogMzBcblx0TUFYX0NIQVJfSU5fREVMQVkgOiAxMDBcblxuXHRNSU5fQ0hBUl9PVVRfREVMQVkgOiAzMFxuXHRNQVhfQ0hBUl9PVVRfREVMQVkgOiAxMDBcblxuXHRDSEFSUyA6ICdhYmNkZWZoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSE/KigpQMKjJCVeJl8tKz1bXXt9OjtcXCdcIlxcXFx8PD4sLi9+YCcuc3BsaXQoJycpXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHNldEVsZW1lbnQgJCgnI3ByZWxvYWRlcicpXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRjb2RlV29yZCA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmRdJylcblx0XHRAJGJnMSA9IEAkZWwuZmluZCgnW2RhdGEtYmc9XCIxXCJdJylcblx0XHRAJGJnMiA9IEAkZWwuZmluZCgnW2RhdGEtYmc9XCIyXCJdJylcblxuXHRcdG51bGxcblxuXHRwbGF5SW50cm9BbmltYXRpb24gOiAoQGNiKSA9PlxuXG5cdFx0Y29uc29sZS5sb2cgXCJzaG93IDogKEBjYikgPT5cIlxuXG5cdFx0IyBERUJVRyFcblx0XHQjIHJldHVybiBAY2IoKVxuXG5cdFx0QCRlbFxuXHRcdFx0LmZpbmQoJ1tkYXRhLWRvdHNdJylcblx0XHRcdFx0LnJlbW92ZSgpXG5cdFx0XHRcdC5lbmQoKVxuXHRcdFx0LmFkZENsYXNzKCdzaG93LXByZWxvYWRlcicpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBAJGNvZGVXb3JkLCAnd2hpdGUnLCBmYWxzZSwgQGhpZGVcblxuXHRcdG51bGxcblxuXHRvblNob3dDb21wbGV0ZSA6ID0+XG5cblx0XHRAY2I/KClcblxuXHRcdG51bGxcblxuXHRoaWRlIDogPT5cblxuXHRcdEBhbmltYXRlT3V0IEBvbkhpZGVDb21wbGV0ZVxuXG5cdFx0bnVsbFxuXG5cdG9uSGlkZUNvbXBsZXRlIDogPT5cblxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVPdXQgOiAoY2IpID0+XG5cblx0XHQjIEBhbmltYXRlQ2hhcnNPdXQoKVxuXG5cdFx0IyB0aGF0J2xsIGRvXG5cdFx0IyBzZXRUaW1lb3V0IGNiLCAyMjAwXG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRhbmFncmFtID0gXy5zaHVmZmxlKCdjb2RlZG9vZGwuZXMnLnNwbGl0KCcnKSkuam9pbignJylcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIGFuYWdyYW0sIEAkY29kZVdvcmQsICd3aGl0ZScsIGZhbHNlLCA9PiBAYW5pbWF0ZUJnT3V0IGNiXG5cdFx0LCAyMDAwXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUJnT3V0IDogKGNiKSA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcxLCAwLjUsIHsgZGVsYXkgOiAwLjIsIHdpZHRoIDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMSwgMC42LCB7IGRlbGF5IDogMC43LCBoZWlnaHQgOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cblx0XHRUd2VlbkxpdGUudG8gQCRiZzIsIDAuNCwgeyBkZWxheSA6IDAuNCwgd2lkdGggOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcyLCAwLjUsIHsgZGVsYXkgOiAwLjgsIGhlaWdodCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0LCBvbkNvbXBsZXRlIDogY2IgfVxuXG5cdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRjb2RlV29yZCwgJycsIGZhbHNlXG5cdFx0LCA0MDBcblxuXHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdEAkZWwucmVtb3ZlQ2xhc3MoJ3Nob3ctcHJlbG9hZGVyJylcblx0XHQsIDEyMDBcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVsb2FkZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkhvbWVWaWV3ICAgICAgICAgICA9IHJlcXVpcmUgJy4uL2hvbWUvSG9tZVZpZXcnXG5BYm91dFBhZ2VWaWV3ICAgICAgPSByZXF1aXJlICcuLi9hYm91dFBhZ2UvQWJvdXRQYWdlVmlldydcbkNvbnRyaWJ1dGVQYWdlVmlldyA9IHJlcXVpcmUgJy4uL2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldydcbkRvb2RsZVBhZ2VWaWV3ICAgICA9IHJlcXVpcmUgJy4uL2Rvb2RsZVBhZ2UvRG9vZGxlUGFnZVZpZXcnXG5OYXYgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvTmF2J1xuXG5jbGFzcyBXcmFwcGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0VklFV19UWVBFX1BBR0UgIDogJ3BhZ2UnXG5cblx0dGVtcGxhdGUgOiAnd3JhcHBlcidcblxuXHR2aWV3cyAgICAgICAgICA6IG51bGxcblx0cHJldmlvdXNWaWV3ICAgOiBudWxsXG5cdGN1cnJlbnRWaWV3ICAgIDogbnVsbFxuXG5cdHBhZ2VTd2l0Y2hEZmQgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHZpZXdzID1cblx0XHRcdGhvbWUgICAgICAgOiBjbGFzc1JlZiA6IEhvbWVWaWV3LCAgICAgICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRSwgICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGFib3V0ICAgICAgOiBjbGFzc1JlZiA6IEFib3V0UGFnZVZpZXcsICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQsICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGNvbnRyaWJ1dGUgOiBjbGFzc1JlZiA6IENvbnRyaWJ1dGVQYWdlVmlldywgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURSwgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGRvb2RsZSAgICAgOiBjbGFzc1JlZiA6IERvb2RsZVBhZ2VWaWV3LCAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFUywgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0VcblxuXHRcdEBjcmVhdGVDbGFzc2VzKClcblxuXHRcdHN1cGVyKClcblxuXHRcdCMgZGVjaWRlIGlmIHlvdSB3YW50IHRvIGFkZCBhbGwgY29yZSBET00gdXAgZnJvbnQsIG9yIGFkZCBvbmx5IHdoZW4gcmVxdWlyZWQsIHNlZSBjb21tZW50cyBpbiBBYnN0cmFjdFZpZXdQYWdlLmNvZmZlZVxuXHRcdCMgQGFkZENsYXNzZXMoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRjcmVhdGVDbGFzc2VzIDogPT5cblxuXHRcdChAdmlld3NbbmFtZV0udmlldyA9IG5ldyBAdmlld3NbbmFtZV0uY2xhc3NSZWYpIGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXG5cdFx0bnVsbFxuXG5cdGFkZENsYXNzZXMgOiA9PlxuXG5cdFx0IGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXHRcdCBcdGlmIGRhdGEudHlwZSBpcyBAVklFV19UWVBFX1BBR0UgdGhlbiBAYWRkQ2hpbGQgZGF0YS52aWV3XG5cblx0XHRudWxsXG5cblx0Z2V0Vmlld0J5Um91dGUgOiAocm91dGUpID0+XG5cblx0XHRmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHRcdHJldHVybiBAdmlld3NbbmFtZV0gaWYgcm91dGUgaXMgQHZpZXdzW25hbWVdLnJvdXRlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uICdzdGFydCcsIEBzdGFydFxuXG5cdFx0bnVsbFxuXG5cdHN0YXJ0IDogPT5cblxuXHRcdEBDRCgpLmFwcFZpZXcub2ZmICdzdGFydCcsIEBzdGFydFxuXG5cdFx0QGJpbmRFdmVudHMoKVxuXHRcdEB1cGRhdGVEaW1zKClcblxuXHRcdG51bGxcblxuXHRiaW5kRXZlbnRzIDogPT5cblxuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBjaGFuZ2VWaWV3XG5cdFx0QENEKCkubmF2Lm9uIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjaGFuZ2VTdWJWaWV3XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEB1cGRhdGVEaW1zXG5cblx0XHRudWxsXG5cblx0dXBkYXRlRGltcyA6ID0+XG5cblx0XHRAJGVsLmNzcyAnbWluLWhlaWdodCcsIEBDRCgpLmFwcFZpZXcuZGltcy5oXG5cblx0XHRudWxsXG5cblx0Y2hhbmdlVmlldyA6IChwcmV2aW91cywgY3VycmVudCkgPT5cblxuXHRcdGlmIEBwYWdlU3dpdGNoRGZkIGFuZCBAcGFnZVN3aXRjaERmZC5zdGF0ZSgpIGlzbnQgJ3Jlc29sdmVkJ1xuXHRcdFx0ZG8gKHByZXZpb3VzLCBjdXJyZW50KSA9PiBAcGFnZVN3aXRjaERmZC5kb25lID0+IEBjaGFuZ2VWaWV3IHByZXZpb3VzLCBjdXJyZW50XG5cdFx0XHRyZXR1cm5cblxuXHRcdEBwcmV2aW91c1ZpZXcgPSBAZ2V0Vmlld0J5Um91dGUgcHJldmlvdXMuYXJlYVxuXHRcdEBjdXJyZW50VmlldyAgPSBAZ2V0Vmlld0J5Um91dGUgY3VycmVudC5hcmVhXG5cblx0XHRpZiAhQHByZXZpb3VzVmlld1xuXHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3XG5cdFx0ZWxzZVxuXHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LCBAY3VycmVudFZpZXdcblxuXHRcdG51bGxcblxuXHRjaGFuZ2VTdWJWaWV3IDogKGN1cnJlbnQpID0+XG5cblx0XHRAY3VycmVudFZpZXcudmlldy50cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIGN1cnJlbnQuc3ViXG5cblx0XHRudWxsXG5cblx0dHJhbnNpdGlvblZpZXdzIDogKGZyb20sIHRvKSA9PlxuXG5cdFx0QHBhZ2VTd2l0Y2hEZmQgPSAkLkRlZmVycmVkKClcblxuXHRcdGlmIGZyb20gYW5kIHRvXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5wcmVwYXJlIGZyb20ucm91dGUsIHRvLnJvdXRlXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5pbiA9PiBmcm9tLnZpZXcuaGlkZSA9PiB0by52aWV3LnNob3cgPT4gQENEKCkuYXBwVmlldy50cmFuc2l0aW9uZXIub3V0ID0+IEBwYWdlU3dpdGNoRGZkLnJlc29sdmUoKVxuXHRcdGVsc2UgaWYgZnJvbVxuXHRcdFx0ZnJvbS52aWV3LmhpZGUgQHBhZ2VTd2l0Y2hEZmQucmVzb2x2ZVxuXHRcdGVsc2UgaWYgdG9cblx0XHRcdHRvLnZpZXcuc2hvdyBAcGFnZVN3aXRjaERmZC5yZXNvbHZlXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gV3JhcHBlclxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIENvbnRyaWJ1dGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWNvbnRyaWJ1dGUnXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2Rlc2NcIlxuXG5cdFx0IyMjXG5cblx0XHRpbnN0YW50aWF0ZSBjbGFzc2VzIGhlcmVcblxuXHRcdEBleGFtcGxlQ2xhc3MgPSBuZXcgZXhhbXBsZUNsYXNzXG5cblx0XHQjIyNcblxuXHRcdHN1cGVyKClcblxuXHRcdCMjI1xuXG5cdFx0YWRkIGNsYXNzZXMgdG8gYXBwIHN0cnVjdHVyZSBoZXJlXG5cblx0XHRAXG5cdFx0XHQuYWRkQ2hpbGQoQGV4YW1wbGVDbGFzcylcblxuXHRcdCMjI1xuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cmlidXRlUGFnZVZpZXdcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBEb29kbGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWRvb2RsZSdcblx0bW9kZWwgICAgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJkb29kbGVfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBleGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdHNob3cgOiA9PlxuXG5cdFx0QG1vZGVsID0gQGdldERvb2RsZSgpXG5cblx0XHRzdXBlclxuXG5cdFx0bnVsbFxuXG5cdGdldERvb2RsZSA6ID0+XG5cblx0XHRkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZ2V0RG9vZGxlQnlTbHVnIEBDRCgpLm5hdi5jdXJyZW50LnN1YisnLycrQENEKCkubmF2LmN1cnJlbnQudGVyXG5cblx0XHRkb29kbGVcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBIb21lR3JpZEl0ZW0gZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHR0ZW1wbGF0ZSA6ICdob21lLWdyaWQtaXRlbSdcblxuXHRjb25zdHJ1Y3RvciA6IChAbW9kZWwsIEBmdWxsUGFnZVRyYW5zaXRpb24pIC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXy5leHRlbmQge30sIEBtb2RlbC50b0pTT04oKVxuXG5cdFx0c3VwZXJcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGF1dGhvck5hbWUgPSBAJGVsLmZpbmQoJ1tkYXRhLWNvZGV3b3JkPVwiYXV0aG9yX25hbWVcIl0nKVxuXHRcdEAkZG9vZGxlTmFtZSA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmQ9XCJuYW1lXCJdJylcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEAkZWxbc2V0dGluZ10gJ21vdXNlb3ZlcicsIEBvbk1vdXNlT3ZlclxuXG5cdFx0bnVsbFxuXG5cdHNob3cgOiA9PlxuXG5cdFx0QCRlbC5hZGRDbGFzcyAnc2hvdy1pdGVtJ1xuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnYXV0aG9yLm5hbWUnKSwgQCRhdXRob3JOYW1lLCAnYmx1ZSdcblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCduYW1lJyksIEAkZG9vZGxlTmFtZSwgJ2JsdWUnXG5cblx0XHRAc2V0TGlzdGVuZXJzICdvbidcblxuXHRcdG51bGxcblxuXHRvbk1vdXNlT3ZlciA6ID0+XG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCdhdXRob3IubmFtZScpLCBAJGF1dGhvck5hbWUsICdibHVlJ1xuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ25hbWUnKSwgQCRkb29kbGVOYW1lLCAnYmx1ZSdcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBIb21lR3JpZEl0ZW1cbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuSG9tZUdyaWRJdGVtICAgICA9IHJlcXVpcmUgJy4vSG9tZUdyaWRJdGVtJ1xuXG5jbGFzcyBIb21lVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHQjIG1hbmFnZSBzdGF0ZSBmb3IgaG9tZVZpZXcgb24gcGVyLXNlc3Npb24gYmFzaXMsIGFsbG93IG51bWJlciBvZlxuXHQjIGdyaWQgaXRlbXMsIGFuZCBzY3JvbGwgcG9zaXRpb24gb2YgaG9tZSBncmlkIHRvIGJlIHBlcnNpc3RlZFxuXHRAdmlzaXRlZFRoaXNTZXNzaW9uIDogZmFsc2Vcblx0QGdyaWRJdGVtcyA6IFtdXG5cdEBkaW1zIDpcblx0XHRpdGVtICAgICAgOiBoOiAyNjgsIHc6IDIwMCwgbWFyZ2luOiAyMCwgYTogMFxuXHRcdGNvbnRhaW5lciA6IGg6IDAsIHc6IDAsIGE6IDBcblx0QGNvbENvdW50IDogMFxuXHRAc2Nyb2xsRGlzdGFuY2UgOiAwXG5cblx0QFNIT1dfUk9XX1RIUkVTSE9MRCA6IDAuMyAjIGhvdyBtdWNoIG9mIGEgZ3JpZCByb3cgKHNjYWxlIDAgLT4gMSkgbXVzdCBiZSB2aXNpYmxlIGJlZm9yZSBpdCBpcyBcInNob3duXCJcblxuXHR0ZW1wbGF0ZSAgICAgIDogJ3BhZ2UtaG9tZSdcblx0YWRkVG9TZWxlY3RvciA6ICdbZGF0YS1ob21lLWdyaWRdJ1xuXG5cdGFsbERvb2RsZXMgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJob21lX2Rlc2NcIlxuXG5cdFx0QGFsbERvb2RsZXMgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXNcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGdyaWQgPSBAJGVsLmZpbmQoJ1tkYXRhLWhvbWUtZ3JpZF0nKVxuXG5cdFx0bnVsbFxuXG5cdHNldHVwRGltcyA6ID0+XG5cblx0XHRncmlkV2lkdGggPSBAJGdyaWQub3V0ZXJXaWR0aCgpXG5cblx0XHRIb21lVmlldy5jb2xDb3VudCA9IE1hdGgucm91bmQgZ3JpZFdpZHRoIC8gSG9tZVZpZXcuZGltcy5pdGVtLndcblx0XHRcblx0XHRIb21lVmlldy5kaW1zLmNvbnRhaW5lciA9XG5cdFx0XHRoOiBAQ0QoKS5hcHBWaWV3LmRpbXMuaCwgdzogZ3JpZFdpZHRoLCBhOiAoQENEKCkuYXBwVmlldy5kaW1zLmggKiBncmlkV2lkdGgpXG5cblx0XHRIb21lVmlldy5kaW1zLml0ZW0uYSA9IEhvbWVWaWV3LmRpbXMuaXRlbS5oICogKEhvbWVWaWV3LmRpbXMuaXRlbS53ICsgKChIb21lVmlldy5kaW1zLml0ZW0ubWFyZ2luICogKEhvbWVWaWV3LmNvbENvdW50IC0gMSkpIC8gSG9tZVZpZXcuY29sQ291bnQpKVxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSBAQ0QoKS5hcHBWaWV3LkVWRU5UX1VQREFURV9ESU1FTlNJT05TLCBAb25SZXNpemVcblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddIEBDRCgpLmFwcFZpZXcuRVZFTlRfT05fU0NST0xMLCBAb25TY3JvbGxcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6ID0+XG5cblx0XHRAc2V0dXBEaW1zKClcblx0XHRAb25TY3JvbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG9uU2Nyb2xsIDogPT5cblxuXHRcdEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlID0gQENEKCkuYXBwVmlldy5sYXN0U2Nyb2xsWVxuXG5cdFx0aXRlbXNUb1Nob3cgPSBAZ2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSgpXG5cdFx0aWYgaXRlbXNUb1Nob3cgPiAwIHRoZW4gQGFkZERvb2RsZXMgaXRlbXNUb1Nob3dcblxuXHRcdG51bGxcblxuXHRzaG93IDogPT5cblxuXHRcdHN1cGVyXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdEBzZXR1cERpbXMoKVxuXG5cdFx0aWYgIUhvbWVWaWV3LnZpc2l0ZWRUaGlzU2Vzc2lvblxuXHRcdFx0QGFkZERvb2RsZXMgQGdldFJlcXVpcmVkRG9vZGxlQ291bnRCeUFyZWEoKSwgdHJ1ZVxuXHRcdFx0SG9tZVZpZXcudmlzaXRlZFRoaXNTZXNzaW9uID0gdHJ1ZVxuXHRcdGVsc2Vcblx0XHRcdEBDRCgpLmFwcFZpZXcuJHdpbmRvdy5zY3JvbGxUb3AgSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2VcblxuXHRcdG51bGxcblxuXHRnZXRSZXF1aXJlZERvb2RsZUNvdW50QnlBcmVhIDogPT5cblxuXHRcdHRvdGFsQXJlYSAgPSBIb21lVmlldy5kaW1zLmNvbnRhaW5lci5hICsgKEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlICogSG9tZVZpZXcuZGltcy5jb250YWluZXIudylcblx0XHR0YXJnZXRSb3dzID0gKHRvdGFsQXJlYSAvIEhvbWVWaWV3LmRpbXMuaXRlbS5hKSAvIEhvbWVWaWV3LmNvbENvdW50XG5cblx0XHR0YXJnZXRJdGVtcyA9IE1hdGguZmxvb3IodGFyZ2V0Um93cykgKiBIb21lVmlldy5jb2xDb3VudFxuXHRcdHRhcmdldEl0ZW1zID0gaWYgKHRhcmdldFJvd3MgJSAxKSA+IEhvbWVWaWV3LlNIT1dfUk9XX1RIUkVTSE9MRCB0aGVuIHRhcmdldEl0ZW1zICsgSG9tZVZpZXcuY29sQ291bnQgZWxzZSB0YXJnZXRJdGVtc1xuXG5cdFx0cmV0dXJuIHRhcmdldEl0ZW1zIC0gSG9tZVZpZXcuZ3JpZEl0ZW1zLmxlbmd0aFxuXG5cdGFkZERvb2RsZXMgOiAoY291bnQsIGZ1bGxQYWdlVHJhbnNpdGlvbj1mYWxzZSkgPT5cblxuXHRcdGNvbnNvbGUubG9nIFwiYWRkaW5nIGRvb2RsZXMuLi4geCN7Y291bnR9XCJcblxuXHRcdG5ld0l0ZW1zID0gW11cblxuXHRcdGZvciBpZHggaW4gW0hvbWVWaWV3LmdyaWRJdGVtcy5sZW5ndGguLi5Ib21lVmlldy5ncmlkSXRlbXMubGVuZ3RoK2NvdW50XVxuXG5cdFx0XHRkb29kbGUgPSBAYWxsRG9vZGxlcy5hdCBpZHhcblx0XHRcdGJyZWFrIGlmICFkb29kbGVcblxuXHRcdFx0bmV3SXRlbXMucHVzaCBuZXcgSG9tZUdyaWRJdGVtIGRvb2RsZSwgZnVsbFBhZ2VUcmFuc2l0aW9uXG5cblx0XHRIb21lVmlldy5ncmlkSXRlbXMgPSBIb21lVmlldy5ncmlkSXRlbXMuY29uY2F0IG5ld0l0ZW1zXG5cblx0XHRmb3IgaXRlbSwgaWR4IGluIG5ld0l0ZW1zXG5cblx0XHRcdEBhZGRDaGlsZCBpdGVtXG5cdFx0XHRAYW5pbWF0ZUl0ZW1JbiBpdGVtLCBpZHgsIGZ1bGxQYWdlVHJhbnNpdGlvblxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJdGVtSW4gOiAoaXRlbSwgaW5kZXgsIGZ1bGxQYWdlVHJhbnNpdGlvbj1mYWxzZSkgPT5cblxuXHRcdGR1cmF0aW9uICAgPSAwLjVcblx0XHRmcm9tUGFyYW1zID0geSA6IChpZiBmdWxsUGFnZVRyYW5zaXRpb24gdGhlbiB3aW5kb3cuaW5uZXJIZWlnaHQgZWxzZSAwKSwgb3BhY2l0eSA6IDAsIHNjYWxlIDogMC42XG5cdFx0dG9QYXJhbXMgICA9IGRlbGF5IDogKGR1cmF0aW9uICogMC4yKSAqIGluZGV4LCB5IDogMCwgb3BhY2l0eSA6IDEsIHNjYWxlIDogMSAsIGVhc2UgOiBFeHBvLmVhc2VPdXQsIG9uQ29tcGxldGUgOiBpdGVtLnNob3dcblxuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8gaXRlbS4kZWwsIGR1cmF0aW9uLCBmcm9tUGFyYW1zLCB0b1BhcmFtc1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWVWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0TW9kYWwgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHQkd2luZG93IDogbnVsbFxuXG5cdCMjIyBvdmVycmlkZSBpbiBpbmRpdmlkdWFsIGNsYXNzZXMgIyMjXG5cdG5hbWUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZSA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAJHdpbmRvdyA9ICQod2luZG93KVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0QENEKCkuYXBwVmlldy5hZGRDaGlsZCBAXG5cdFx0QHNldExpc3RlbmVycyAnb24nXG5cdFx0QGFuaW1hdGVJbigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGhpZGUgOiA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgPT4gQENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXG5cdFx0bnVsbFxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0QHNldExpc3RlbmVycyAnb2ZmJ1xuXHRcdEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLm1vZGFsc1tAbmFtZV0udmlldyA9IG51bGxcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEAkd2luZG93W3NldHRpbmddICdrZXl1cCcsIEBvbktleVVwXG5cdFx0QCQoJ1tkYXRhLWNsb3NlXScpW3NldHRpbmddICdjbGljaycsIEBjbG9zZUNsaWNrXG5cblx0XHRudWxsXG5cblx0b25LZXlVcCA6IChlKSA9PlxuXG5cdFx0aWYgZS5rZXlDb2RlIGlzIDI3IHRoZW4gQGhpZGUoKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRlbCwgMC4zLCB7ICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLCAnb3BhY2l0eSc6IDEsIGVhc2UgOiBRdWFkLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAndHJhbnNmb3JtJzogJ3NjYWxlKDEpJywgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IEJhY2suZWFzZU91dCB9XG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZU91dCA6IChjYWxsYmFjaykgPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAnb3BhY2l0eSc6IDAsIGVhc2UgOiBRdWFkLmVhc2VPdXQsIG9uQ29tcGxldGU6IGNhbGxiYWNrIH1cblx0XHRUd2VlbkxpdGUudG8gQCRlbC5maW5kKCcuaW5uZXInKSwgMC4zLCB7ICd0cmFuc2Zvcm0nOiAnc2NhbGUoMC44KScsICdvcGFjaXR5JzogMCwgZWFzZSA6IEJhY2suZWFzZUluIH1cblxuXHRcdG51bGxcblxuXHRjbG9zZUNsaWNrOiAoIGUgKSA9PlxuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRAaGlkZSgpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RNb2RhbFxuIiwiQWJzdHJhY3RNb2RhbCA9IHJlcXVpcmUgJy4vQWJzdHJhY3RNb2RhbCdcblxuY2xhc3MgT3JpZW50YXRpb25Nb2RhbCBleHRlbmRzIEFic3RyYWN0TW9kYWxcblxuXHRuYW1lICAgICA6ICdvcmllbnRhdGlvbk1vZGFsJ1xuXHR0ZW1wbGF0ZSA6ICdvcmllbnRhdGlvbi1tb2RhbCdcblxuXHRjYiAgICAgICA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IChAY2IpIC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0ge0BuYW1lfVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRoaWRlIDogKHN0aWxsTGFuZHNjYXBlPXRydWUpID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PlxuXHRcdFx0QENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXHRcdFx0aWYgIXN0aWxsTGFuZHNjYXBlIHRoZW4gQGNiPygpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRzdXBlclxuXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSAndXBkYXRlRGltcycsIEBvblVwZGF0ZURpbXNcblx0XHRAJGVsW3NldHRpbmddICd0b3VjaGVuZCBjbGljaycsIEBoaWRlXG5cblx0XHRudWxsXG5cblx0b25VcGRhdGVEaW1zIDogKGRpbXMpID0+XG5cblx0XHRpZiBkaW1zLm8gaXMgJ3BvcnRyYWl0JyB0aGVuIEBoaWRlIGZhbHNlXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gT3JpZW50YXRpb25Nb2RhbFxuIiwiQWJzdHJhY3RWaWV3ICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlldydcbk9yaWVudGF0aW9uTW9kYWwgPSByZXF1aXJlICcuL09yaWVudGF0aW9uTW9kYWwnXG5cbmNsYXNzIE1vZGFsTWFuYWdlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCMgd2hlbiBuZXcgbW9kYWwgY2xhc3NlcyBhcmUgY3JlYXRlZCwgYWRkIGhlcmUsIHdpdGggcmVmZXJlbmNlIHRvIGNsYXNzIG5hbWVcblx0bW9kYWxzIDpcblx0XHRvcmllbnRhdGlvbk1vZGFsIDogY2xhc3NSZWYgOiBPcmllbnRhdGlvbk1vZGFsLCB2aWV3IDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0aXNPcGVuIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gcmV0dXJuIHRydWUgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0ZmFsc2VcblxuXHRoaWRlT3Blbk1vZGFsIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gb3Blbk1vZGFsID0gQG1vZGFsc1tuYW1lXS52aWV3ICkgZm9yIG5hbWUsIG1vZGFsIG9mIEBtb2RhbHNcblxuXHRcdG9wZW5Nb2RhbD8uaGlkZSgpXG5cblx0XHRudWxsXG5cblx0c2hvd01vZGFsIDogKG5hbWUsIGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gaWYgQG1vZGFsc1tuYW1lXS52aWV3XG5cblx0XHRAbW9kYWxzW25hbWVdLnZpZXcgPSBuZXcgQG1vZGFsc1tuYW1lXS5jbGFzc1JlZiBjYlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGFsTWFuYWdlclxuIl19
