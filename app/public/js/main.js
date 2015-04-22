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
    } else if (section === this.CD().nav.sections.ABOUT) {
      CodeWordTransitioner["in"]([this.$navLinkContribute, this.$closeBtn], colour);
      CodeWordTransitioner["in"]([this.$navLinkAbout], 'black-white-bg');
      CodeWordTransitioner.out([this.$infoBtn], colour);
    } else if (section === this.CD().nav.sections.CONTRIBUTE) {
      CodeWordTransitioner["in"]([this.$navLinkAbout, this.$closeBtn], colour);
      CodeWordTransitioner["in"]([this.$navLinkContribute], 'black-white-bg');
      CodeWordTransitioner.out([this.$infoBtn], colour);
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
      return 'black-white-bg';
    }
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
    var $el, wordSection;
    $el = $(e.currentTarget);
    wordSection = $el.attr('data-word-section');
    CodeWordTransitioner.scramble($el, this.getSectionColour(null, wordSection));
    return null;
  };

  Header.prototype.onWordLeave = function(e) {
    var $el, wordSection;
    $el = $(e.currentTarget);
    wordSection = $el.attr('data-word-section');
    CodeWordTransitioner.unscramble($el, this.getSectionColour(null, wordSection));
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
            return typeof cb === "function" ? cb() : void 0;
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
    this.init = __bind(this.init, this);
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

  DoodlePageView.prototype.init = function() {
    return this.$frame = this.$el.find('[data-doodle-frame]');
  };

  DoodlePageView.prototype.show = function(cb) {
    this.model = this.getDoodle();
    this.$frame.attr('src', "http://source.codedoodl.es/sample_doodles/shape-stream/index.html");
    this.$frame.one('load', cb);
    DoodlePageView.__super__.show.call(this);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50L2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9lbnQvcmV2ZXJzZWQuanNvbiIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHAuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcFZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL0Fic3RyYWN0Q29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvY29udHJpYnV0b3JzL0NvbnRyaWJ1dG9yc0NvbGxlY3Rpb24uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL2NvcmUvVGVtcGxhdGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29uZmlnL0NvbG9ycy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BUEkuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvQWJzdHJhY3REYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0xvY2FsZS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9UZW1wbGF0ZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9BYnN0cmFjdE1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29udHJpYnV0b3IvQ29udHJpYnV0b3JNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvQVBJUm91dGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvTG9jYWxlc01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvZG9vZGxlL0Rvb2RsZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvTmF2LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9BbmFseXRpY3MuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0F1dGhNYW5hZ2VyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvRmFjZWJvb2suY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0dvb2dsZVBsdXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL01lZGlhUXVlcmllcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvTnVtYmVyVXRpbHMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1JlcXVlc3Rlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvU2hhcmUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvQWJzdHJhY3RWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlld1BhZ2UuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9Gb290ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9IZWFkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9QYWdlVHJhbnNpdGlvbmVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvUHJlbG9hZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvV3JhcHBlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVHcmlkSXRlbS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QTs7R0FIMEIsYUFIM0IsQ0FBQTs7QUFBQSxNQXlDTSxDQUFDLE9BQVAsR0FBaUIsWUF6Q2pCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwID0gcmVxdWlyZSAnLi9BcHAnXG5cbiMgUFJPRFVDVElPTiBFTlZJUk9OTUVOVCAtIG1heSB3YW50IHRvIHVzZSBzZXJ2ZXItc2V0IHZhcmlhYmxlcyBoZXJlXG4jIElTX0xJVkUgPSBkbyAtPiByZXR1cm4gaWYgd2luZG93LmxvY2F0aW9uLmhvc3QuaW5kZXhPZignbG9jYWxob3N0JykgPiAtMSBvciB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGlzICc/ZCcgdGhlbiBmYWxzZSBlbHNlIHRydWVcblxuIyMjXG5cbldJUCAtIHRoaXMgd2lsbCBpZGVhbGx5IGNoYW5nZSB0byBvbGQgZm9ybWF0IChhYm92ZSkgd2hlbiBjYW4gZmlndXJlIGl0IG91dFxuXG4jIyNcblxuSVNfTElWRSA9IGZhbHNlXG5cbiMgT05MWSBFWFBPU0UgQVBQIEdMT0JBTExZIElGIExPQ0FMIE9SIERFVidJTkdcbnZpZXcgPSBpZiBJU19MSVZFIHRoZW4ge30gZWxzZSAod2luZG93IG9yIGRvY3VtZW50KVxuXG4jIERFQ0xBUkUgTUFJTiBBUFBMSUNBVElPTlxudmlldy5DRCA9IG5ldyBBcHAgSVNfTElWRVxudmlldy5DRC5pbml0KClcbiIsIi8qISBodHRwOi8vbXRocy5iZS9wdW55Y29kZSB2MS4yLjQgYnkgQG1hdGhpYXMgKi9cbjsoZnVuY3Rpb24ocm9vdCkge1xuXG5cdC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgKi9cblx0dmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cztcblx0dmFyIGZyZWVNb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJlxuXHRcdG1vZHVsZS5leHBvcnRzID09IGZyZWVFeHBvcnRzICYmIG1vZHVsZTtcblx0dmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcblx0aWYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsKSB7XG5cdFx0cm9vdCA9IGZyZWVHbG9iYWw7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGBwdW55Y29kZWAgb2JqZWN0LlxuXHQgKiBAbmFtZSBwdW55Y29kZVxuXHQgKiBAdHlwZSBPYmplY3Rcblx0ICovXG5cdHZhciBwdW55Y29kZSxcblxuXHQvKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cdG1heEludCA9IDIxNDc0ODM2NDcsIC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuXHQvKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG5cdGJhc2UgPSAzNixcblx0dE1pbiA9IDEsXG5cdHRNYXggPSAyNixcblx0c2tldyA9IDM4LFxuXHRkYW1wID0gNzAwLFxuXHRpbml0aWFsQmlhcyA9IDcyLFxuXHRpbml0aWFsTiA9IDEyOCwgLy8gMHg4MFxuXHRkZWxpbWl0ZXIgPSAnLScsIC8vICdcXHgyRCdcblxuXHQvKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xuXHRyZWdleFB1bnljb2RlID0gL154bi0tLyxcblx0cmVnZXhOb25BU0NJSSA9IC9bXiAtfl0vLCAvLyB1bnByaW50YWJsZSBBU0NJSSBjaGFycyArIG5vbi1BU0NJSSBjaGFyc1xuXHRyZWdleFNlcGFyYXRvcnMgPSAvXFx4MkV8XFx1MzAwMnxcXHVGRjBFfFxcdUZGNjEvZywgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG5cdC8qKiBFcnJvciBtZXNzYWdlcyAqL1xuXHRlcnJvcnMgPSB7XG5cdFx0J292ZXJmbG93JzogJ092ZXJmbG93OiBpbnB1dCBuZWVkcyB3aWRlciBpbnRlZ2VycyB0byBwcm9jZXNzJyxcblx0XHQnbm90LWJhc2ljJzogJ0lsbGVnYWwgaW5wdXQgPj0gMHg4MCAobm90IGEgYmFzaWMgY29kZSBwb2ludCknLFxuXHRcdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG5cdH0sXG5cblx0LyoqIENvbnZlbmllbmNlIHNob3J0Y3V0cyAqL1xuXHRiYXNlTWludXNUTWluID0gYmFzZSAtIHRNaW4sXG5cdGZsb29yID0gTWF0aC5mbG9vcixcblx0c3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZSxcblxuXHQvKiogVGVtcG9yYXJ5IHZhcmlhYmxlICovXG5cdGtleTtcblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGVycm9yIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBlcnJvciB0eXBlLlxuXHQgKiBAcmV0dXJucyB7RXJyb3J9IFRocm93cyBhIGBSYW5nZUVycm9yYCB3aXRoIHRoZSBhcHBsaWNhYmxlIGVycm9yIG1lc3NhZ2UuXG5cdCAqL1xuXHRmdW5jdGlvbiBlcnJvcih0eXBlKSB7XG5cdFx0dGhyb3cgUmFuZ2VFcnJvcihlcnJvcnNbdHlwZV0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBgQXJyYXkjbWFwYCB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnkgYXJyYXlcblx0ICogaXRlbS5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSBvZiB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHRcdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdFx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0XHRhcnJheVtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdFx0fVxuXHRcdHJldHVybiBhcnJheTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3MuXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnlcblx0ICogY2hhcmFjdGVyLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuXHQgKiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdFx0cmV0dXJuIG1hcChzdHJpbmcuc3BsaXQocmVnZXhTZXBhcmF0b3JzKSwgZm4pLmpvaW4oJy4nKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIG51bWVyaWMgY29kZSBwb2ludHMgb2YgZWFjaCBVbmljb2RlXG5cdCAqIGNoYXJhY3RlciBpbiB0aGUgc3RyaW5nLiBXaGlsZSBKYXZhU2NyaXB0IHVzZXMgVUNTLTIgaW50ZXJuYWxseSxcblx0ICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcblx0ICogVUNTLTIgZXhwb3NlcyBhcyBzZXBhcmF0ZSBjaGFyYWN0ZXJzKSBpbnRvIGEgc2luZ2xlIGNvZGUgcG9pbnQsXG5cdCAqIG1hdGNoaW5nIFVURi0xNi5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG5cdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGRlY29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBVbmljb2RlIGlucHV0IHN0cmluZyAoVUNTLTIpLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZGVjb2RlKHN0cmluZykge1xuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgY291bnRlciA9IDAsXG5cdFx0ICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG5cdFx0ICAgIHZhbHVlLFxuXHRcdCAgICBleHRyYTtcblx0XHR3aGlsZSAoY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0dmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0XHQvLyBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcblx0XHRcdFx0ZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHsgLy8gbG93IHN1cnJvZ2F0ZVxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlIG5leHRcblx0XHRcdFx0XHQvLyBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXJcblx0XHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdFx0Y291bnRlci0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIHN0cmluZyBiYXNlZCBvbiBhbiBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZW5jb2RlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBuZXcgVW5pY29kZSBzdHJpbmcgKFVDUy0yKS5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJlbmNvZGUoYXJyYXkpIHtcblx0XHRyZXR1cm4gbWFwKGFycmF5LCBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdFx0aWYgKHZhbHVlID4gMHhGRkZGKSB7XG5cdFx0XHRcdHZhbHVlIC09IDB4MTAwMDA7XG5cdFx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdFx0XHR2YWx1ZSA9IDB4REMwMCB8IHZhbHVlICYgMHgzRkY7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBiYXNpYyBjb2RlIHBvaW50IGludG8gYSBkaWdpdC9pbnRlZ2VyLlxuXHQgKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVQb2ludCBUaGUgYmFzaWMgbnVtZXJpYyBjb2RlIHBvaW50IHZhbHVlLlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpbiB0aGUgcmFuZ2UgYDBgIHRvIGBiYXNlIC0gMWAsIG9yIGBiYXNlYCBpZlxuXHQgKiB0aGUgY29kZSBwb2ludCBkb2VzIG5vdCByZXByZXNlbnQgYSB2YWx1ZS5cblx0ICovXG5cdGZ1bmN0aW9uIGJhc2ljVG9EaWdpdChjb2RlUG9pbnQpIHtcblx0XHRpZiAoY29kZVBvaW50IC0gNDggPCAxMCkge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDIyO1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gNjUgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDY1O1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gOTcgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDk3O1xuXHRcdH1cblx0XHRyZXR1cm4gYmFzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGRpZ2l0L2ludGVnZXIgaW50byBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEBzZWUgYGJhc2ljVG9EaWdpdCgpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gZGlnaXQgVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYmFzaWMgY29kZSBwb2ludCB3aG9zZSB2YWx1ZSAod2hlbiB1c2VkIGZvclxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuXHQgKiBgMGAgdG8gYGJhc2UgLSAxYC4gSWYgYGZsYWdgIGlzIG5vbi16ZXJvLCB0aGUgdXBwZXJjYXNlIGZvcm0gaXNcblx0ICogdXNlZDsgZWxzZSwgdGhlIGxvd2VyY2FzZSBmb3JtIGlzIHVzZWQuIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWRcblx0ICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cblx0ICovXG5cdGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHRcdC8vICAwLi4yNSBtYXAgdG8gQVNDSUkgYS4ueiBvciBBLi5aXG5cdFx0Ly8gMjYuLjM1IG1hcCB0byBBU0NJSSAwLi45XG5cdFx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBCaWFzIGFkYXB0YXRpb24gZnVuY3Rpb24gYXMgcGVyIHNlY3Rpb24gMy40IG9mIFJGQyAzNDkyLlxuXHQgKiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0XHR2YXIgayA9IDA7XG5cdFx0ZGVsdGEgPSBmaXJzdFRpbWUgPyBmbG9vcihkZWx0YSAvIGRhbXApIDogZGVsdGEgPj4gMTtcblx0XHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdFx0Zm9yICgvKiBubyBpbml0aWFsaXphdGlvbiAqLzsgZGVsdGEgPiBiYXNlTWludXNUTWluICogdE1heCA+PiAxOyBrICs9IGJhc2UpIHtcblx0XHRcdGRlbHRhID0gZmxvb3IoZGVsdGEgLyBiYXNlTWludXNUTWluKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZsb29yKGsgKyAoYmFzZU1pbnVzVE1pbiArIDEpICogZGVsdGEgLyAoZGVsdGEgKyBza2V3KSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzIHRvIGEgc3RyaW5nIG9mIFVuaWNvZGVcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdFx0Ly8gRG9uJ3QgdXNlIFVDUy0yXG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0XHQgICAgb3V0LFxuXHRcdCAgICBpID0gMCxcblx0XHQgICAgbiA9IGluaXRpYWxOLFxuXHRcdCAgICBiaWFzID0gaW5pdGlhbEJpYXMsXG5cdFx0ICAgIGJhc2ljLFxuXHRcdCAgICBqLFxuXHRcdCAgICBpbmRleCxcblx0XHQgICAgb2xkaSxcblx0XHQgICAgdyxcblx0XHQgICAgayxcblx0XHQgICAgZGlnaXQsXG5cdFx0ICAgIHQsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBiYXNlTWludXNUO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50czogbGV0IGBiYXNpY2AgYmUgdGhlIG51bWJlciBvZiBpbnB1dCBjb2RlXG5cdFx0Ly8gcG9pbnRzIGJlZm9yZSB0aGUgbGFzdCBkZWxpbWl0ZXIsIG9yIGAwYCBpZiB0aGVyZSBpcyBub25lLCB0aGVuIGNvcHlcblx0XHQvLyB0aGUgZmlyc3QgYmFzaWMgY29kZSBwb2ludHMgdG8gdGhlIG91dHB1dC5cblxuXHRcdGJhc2ljID0gaW5wdXQubGFzdEluZGV4T2YoZGVsaW1pdGVyKTtcblx0XHRpZiAoYmFzaWMgPCAwKSB7XG5cdFx0XHRiYXNpYyA9IDA7XG5cdFx0fVxuXG5cdFx0Zm9yIChqID0gMDsgaiA8IGJhc2ljOyArK2opIHtcblx0XHRcdC8vIGlmIGl0J3Mgbm90IGEgYmFzaWMgY29kZSBwb2ludFxuXHRcdFx0aWYgKGlucHV0LmNoYXJDb2RlQXQoaikgPj0gMHg4MCkge1xuXHRcdFx0XHRlcnJvcignbm90LWJhc2ljJyk7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQucHVzaChpbnB1dC5jaGFyQ29kZUF0KGopKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGRlY29kaW5nIGxvb3A6IHN0YXJ0IGp1c3QgYWZ0ZXIgdGhlIGxhc3QgZGVsaW1pdGVyIGlmIGFueSBiYXNpYyBjb2RlXG5cdFx0Ly8gcG9pbnRzIHdlcmUgY29waWVkOyBzdGFydCBhdCB0aGUgYmVnaW5uaW5nIG90aGVyd2lzZS5cblxuXHRcdGZvciAoaW5kZXggPSBiYXNpYyA+IDAgPyBiYXNpYyArIDEgOiAwOyBpbmRleCA8IGlucHV0TGVuZ3RoOyAvKiBubyBmaW5hbCBleHByZXNzaW9uICovKSB7XG5cblx0XHRcdC8vIGBpbmRleGAgaXMgdGhlIGluZGV4IG9mIHRoZSBuZXh0IGNoYXJhY3RlciB0byBiZSBjb25zdW1lZC5cblx0XHRcdC8vIERlY29kZSBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyIGludG8gYGRlbHRhYCxcblx0XHRcdC8vIHdoaWNoIGdldHMgYWRkZWQgdG8gYGlgLiBUaGUgb3ZlcmZsb3cgY2hlY2tpbmcgaXMgZWFzaWVyXG5cdFx0XHQvLyBpZiB3ZSBpbmNyZWFzZSBgaWAgYXMgd2UgZ28sIHRoZW4gc3VidHJhY3Qgb2ZmIGl0cyBzdGFydGluZ1xuXHRcdFx0Ly8gdmFsdWUgYXQgdGhlIGVuZCB0byBvYnRhaW4gYGRlbHRhYC5cblx0XHRcdGZvciAob2xkaSA9IGksIHcgPSAxLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblxuXHRcdFx0XHRpZiAoaW5kZXggPj0gaW5wdXRMZW5ndGgpIHtcblx0XHRcdFx0XHRlcnJvcignaW52YWxpZC1pbnB1dCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGlnaXQgPSBiYXNpY1RvRGlnaXQoaW5wdXQuY2hhckNvZGVBdChpbmRleCsrKSk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0ID49IGJhc2UgfHwgZGlnaXQgPiBmbG9vcigobWF4SW50IC0gaSkgLyB3KSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aSArPSBkaWdpdCAqIHc7XG5cdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA8IHQpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0aWYgKHcgPiBmbG9vcihtYXhJbnQgLyBiYXNlTWludXNUKSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dyAqPSBiYXNlTWludXNUO1xuXG5cdFx0XHR9XG5cblx0XHRcdG91dCA9IG91dHB1dC5sZW5ndGggKyAxO1xuXHRcdFx0YmlhcyA9IGFkYXB0KGkgLSBvbGRpLCBvdXQsIG9sZGkgPT0gMCk7XG5cblx0XHRcdC8vIGBpYCB3YXMgc3VwcG9zZWQgdG8gd3JhcCBhcm91bmQgZnJvbSBgb3V0YCB0byBgMGAsXG5cdFx0XHQvLyBpbmNyZW1lbnRpbmcgYG5gIGVhY2ggdGltZSwgc28gd2UnbGwgZml4IHRoYXQgbm93OlxuXHRcdFx0aWYgKGZsb29yKGkgLyBvdXQpID4gbWF4SW50IC0gbikge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0biArPSBmbG9vcihpIC8gb3V0KTtcblx0XHRcdGkgJT0gb3V0O1xuXG5cdFx0XHQvLyBJbnNlcnQgYG5gIGF0IHBvc2l0aW9uIGBpYCBvZiB0aGUgb3V0cHV0XG5cdFx0XHRvdXRwdXQuc3BsaWNlKGkrKywgMCwgbik7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdWNzMmVuY29kZShvdXRwdXQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scyB0byBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5XG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGVuY29kZShpbnB1dCkge1xuXHRcdHZhciBuLFxuXHRcdCAgICBkZWx0YSxcblx0XHQgICAgaGFuZGxlZENQQ291bnQsXG5cdFx0ICAgIGJhc2ljTGVuZ3RoLFxuXHRcdCAgICBiaWFzLFxuXHRcdCAgICBqLFxuXHRcdCAgICBtLFxuXHRcdCAgICBxLFxuXHRcdCAgICBrLFxuXHRcdCAgICB0LFxuXHRcdCAgICBjdXJyZW50VmFsdWUsXG5cdFx0ICAgIG91dHB1dCA9IFtdLFxuXHRcdCAgICAvKiogYGlucHV0TGVuZ3RoYCB3aWxsIGhvbGQgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyBpbiBgaW5wdXRgLiAqL1xuXHRcdCAgICBpbnB1dExlbmd0aCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50UGx1c09uZSxcblx0XHQgICAgYmFzZU1pbnVzVCxcblx0XHQgICAgcU1pbnVzVDtcblxuXHRcdC8vIENvbnZlcnQgdGhlIGlucHV0IGluIFVDUy0yIHRvIFVuaWNvZGVcblx0XHRpbnB1dCA9IHVjczJkZWNvZGUoaW5wdXQpO1xuXG5cdFx0Ly8gQ2FjaGUgdGhlIGxlbmd0aFxuXHRcdGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0aGUgc3RhdGVcblx0XHRuID0gaW5pdGlhbE47XG5cdFx0ZGVsdGEgPSAwO1xuXHRcdGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHNcblx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgMHg4MCkge1xuXHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoY3VycmVudFZhbHVlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aGFuZGxlZENQQ291bnQgPSBiYXNpY0xlbmd0aCA9IG91dHB1dC5sZW5ndGg7XG5cblx0XHQvLyBgaGFuZGxlZENQQ291bnRgIGlzIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgdGhhdCBoYXZlIGJlZW4gaGFuZGxlZDtcblx0XHQvLyBgYmFzaWNMZW5ndGhgIGlzIHRoZSBudW1iZXIgb2YgYmFzaWMgY29kZSBwb2ludHMuXG5cblx0XHQvLyBGaW5pc2ggdGhlIGJhc2ljIHN0cmluZyAtIGlmIGl0IGlzIG5vdCBlbXB0eSAtIHdpdGggYSBkZWxpbWl0ZXJcblx0XHRpZiAoYmFzaWNMZW5ndGgpIHtcblx0XHRcdG91dHB1dC5wdXNoKGRlbGltaXRlcik7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBlbmNvZGluZyBsb29wOlxuXHRcdHdoaWxlIChoYW5kbGVkQ1BDb3VudCA8IGlucHV0TGVuZ3RoKSB7XG5cblx0XHRcdC8vIEFsbCBub24tYmFzaWMgY29kZSBwb2ludHMgPCBuIGhhdmUgYmVlbiBoYW5kbGVkIGFscmVhZHkuIEZpbmQgdGhlIG5leHRcblx0XHRcdC8vIGxhcmdlciBvbmU6XG5cdFx0XHRmb3IgKG0gPSBtYXhJbnQsIGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA+PSBuICYmIGN1cnJlbnRWYWx1ZSA8IG0pIHtcblx0XHRcdFx0XHRtID0gY3VycmVudFZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluY3JlYXNlIGBkZWx0YWAgZW5vdWdoIHRvIGFkdmFuY2UgdGhlIGRlY29kZXIncyA8bixpPiBzdGF0ZSB0byA8bSwwPixcblx0XHRcdC8vIGJ1dCBndWFyZCBhZ2FpbnN0IG92ZXJmbG93XG5cdFx0XHRoYW5kbGVkQ1BDb3VudFBsdXNPbmUgPSBoYW5kbGVkQ1BDb3VudCArIDE7XG5cdFx0XHRpZiAobSAtIG4gPiBmbG9vcigobWF4SW50IC0gZGVsdGEpIC8gaGFuZGxlZENQQ291bnRQbHVzT25lKSkge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0ZGVsdGEgKz0gKG0gLSBuKSAqIGhhbmRsZWRDUENvdW50UGx1c09uZTtcblx0XHRcdG4gPSBtO1xuXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgbiAmJiArK2RlbHRhID4gbWF4SW50KSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID09IG4pIHtcblx0XHRcdFx0XHQvLyBSZXByZXNlbnQgZGVsdGEgYXMgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlclxuXHRcdFx0XHRcdGZvciAocSA9IGRlbHRhLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblx0XHRcdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXHRcdFx0XHRcdFx0aWYgKHEgPCB0KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cU1pbnVzVCA9IHEgLSB0O1xuXHRcdFx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0XHRcdHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWModCArIHFNaW51c1QgJSBiYXNlTWludXNULCAwKSlcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRxID0gZmxvb3IocU1pbnVzVCAvIGJhc2VNaW51c1QpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWMocSwgMCkpKTtcblx0XHRcdFx0XHRiaWFzID0gYWRhcHQoZGVsdGEsIGhhbmRsZWRDUENvdW50UGx1c09uZSwgaGFuZGxlZENQQ291bnQgPT0gYmFzaWNMZW5ndGgpO1xuXHRcdFx0XHRcdGRlbHRhID0gMDtcblx0XHRcdFx0XHQrK2hhbmRsZWRDUENvdW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCsrZGVsdGE7XG5cdFx0XHQrK247XG5cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dC5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBVbmljb2RlLiBPbmx5IHRoZVxuXHQgKiBQdW55Y29kZWQgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IG9uIGEgc3RyaW5nIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb252ZXJ0ZWQgdG9cblx0ICogVW5pY29kZS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIFB1bnljb2RlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQgdG8gVW5pY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG5cdCAqIHN0cmluZy5cblx0ICovXG5cdGZ1bmN0aW9uIHRvVW5pY29kZShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhQdW55Y29kZS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyBkZWNvZGUoc3RyaW5nLnNsaWNlKDQpLnRvTG93ZXJDYXNlKCkpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgVW5pY29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gUHVueWNvZGUuIE9ubHkgdGhlXG5cdCAqIG5vbi1BU0NJSSBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0J3MgYWxyZWFkeSBpbiBBU0NJSS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQsIGFzIGEgVW5pY29kZSBzdHJpbmcuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBQdW55Y29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gZG9tYWluIG5hbWUuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b0FTQ0lJKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleE5vbkFTQ0lJLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/ICd4bi0tJyArIGVuY29kZShzdHJpbmcpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqIERlZmluZSB0aGUgcHVibGljIEFQSSAqL1xuXHRwdW55Y29kZSA9IHtcblx0XHQvKipcblx0XHQgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgUHVueWNvZGUuanMgdmVyc2lvbiBudW1iZXIuXG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgU3RyaW5nXG5cdFx0ICovXG5cdFx0J3ZlcnNpb24nOiAnMS4yLjQnLFxuXHRcdC8qKlxuXHRcdCAqIEFuIG9iamVjdCBvZiBtZXRob2RzIHRvIGNvbnZlcnQgZnJvbSBKYXZhU2NyaXB0J3MgaW50ZXJuYWwgY2hhcmFjdGVyXG5cdFx0ICogcmVwcmVzZW50YXRpb24gKFVDUy0yKSB0byBVbmljb2RlIGNvZGUgcG9pbnRzLCBhbmQgYmFjay5cblx0XHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIE9iamVjdFxuXHRcdCAqL1xuXHRcdCd1Y3MyJzoge1xuXHRcdFx0J2RlY29kZSc6IHVjczJkZWNvZGUsXG5cdFx0XHQnZW5jb2RlJzogdWNzMmVuY29kZVxuXHRcdH0sXG5cdFx0J2RlY29kZSc6IGRlY29kZSxcblx0XHQnZW5jb2RlJzogZW5jb2RlLFxuXHRcdCd0b0FTQ0lJJzogdG9BU0NJSSxcblx0XHQndG9Vbmljb2RlJzogdG9Vbmljb2RlXG5cdH07XG5cblx0LyoqIEV4cG9zZSBgcHVueWNvZGVgICovXG5cdC8vIFNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJuc1xuXHQvLyBsaWtlIHRoZSBmb2xsb3dpbmc6XG5cdGlmIChcblx0XHR0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiZcblx0XHR0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJlxuXHRcdGRlZmluZS5hbWRcblx0KSB7XG5cdFx0ZGVmaW5lKCdwdW55Y29kZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHB1bnljb2RlO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmICFmcmVlRXhwb3J0cy5ub2RlVHlwZSkge1xuXHRcdGlmIChmcmVlTW9kdWxlKSB7IC8vIGluIE5vZGUuanMgb3IgUmluZ29KUyB2MC44LjArXG5cdFx0XHRmcmVlTW9kdWxlLmV4cG9ydHMgPSBwdW55Y29kZTtcblx0XHR9IGVsc2UgeyAvLyBpbiBOYXJ3aGFsIG9yIFJpbmdvSlMgdjAuNy4wLVxuXHRcdFx0Zm9yIChrZXkgaW4gcHVueWNvZGUpIHtcblx0XHRcdFx0cHVueWNvZGUuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAoZnJlZUV4cG9ydHNba2V5XSA9IHB1bnljb2RlW2tleV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHsgLy8gaW4gUmhpbm8gb3IgYSB3ZWIgYnJvd3NlclxuXHRcdHJvb3QucHVueWNvZGUgPSBwdW55Y29kZTtcblx0fVxuXG59KHRoaXMpKTtcbiIsInZhciBwdW55Y29kZSA9IHJlcXVpcmUoJ3B1bnljb2RlJyk7XG52YXIgcmV2RW50aXRpZXMgPSByZXF1aXJlKCcuL3JldmVyc2VkLmpzb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbmNvZGU7XG5cbmZ1bmN0aW9uIGVuY29kZSAoc3RyLCBvcHRzKSB7XG4gICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgU3RyaW5nJyk7XG4gICAgfVxuICAgIGlmICghb3B0cykgb3B0cyA9IHt9O1xuXG4gICAgdmFyIG51bWVyaWMgPSB0cnVlO1xuICAgIGlmIChvcHRzLm5hbWVkKSBudW1lcmljID0gZmFsc2U7XG4gICAgaWYgKG9wdHMubnVtZXJpYyAhPT0gdW5kZWZpbmVkKSBudW1lcmljID0gb3B0cy5udW1lcmljO1xuXG4gICAgdmFyIHNwZWNpYWwgPSBvcHRzLnNwZWNpYWwgfHwge1xuICAgICAgICAnXCInOiB0cnVlLCBcIidcIjogdHJ1ZSxcbiAgICAgICAgJzwnOiB0cnVlLCAnPic6IHRydWUsXG4gICAgICAgICcmJzogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgY29kZVBvaW50cyA9IHB1bnljb2RlLnVjczIuZGVjb2RlKHN0cik7XG4gICAgdmFyIGNoYXJzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2RlUG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjYyA9IGNvZGVQb2ludHNbaV07XG4gICAgICAgIHZhciBjID0gcHVueWNvZGUudWNzMi5lbmNvZGUoWyBjYyBdKTtcbiAgICAgICAgdmFyIGUgPSByZXZFbnRpdGllc1tjY107XG4gICAgICAgIGlmIChlICYmIChjYyA+PSAxMjcgfHwgc3BlY2lhbFtjXSkgJiYgIW51bWVyaWMpIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goJyYnICsgKC87JC8udGVzdChlKSA/IGUgOiBlICsgJzsnKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY2MgPCAzMiB8fCBjYyA+PSAxMjcgfHwgc3BlY2lhbFtjXSkge1xuICAgICAgICAgICAgY2hhcnMucHVzaCgnJiMnICsgY2MgKyAnOycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2hhcnMucHVzaChjKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCI5XCI6IFwiVGFiO1wiLFxuICAgIFwiMTBcIjogXCJOZXdMaW5lO1wiLFxuICAgIFwiMzNcIjogXCJleGNsO1wiLFxuICAgIFwiMzRcIjogXCJxdW90O1wiLFxuICAgIFwiMzVcIjogXCJudW07XCIsXG4gICAgXCIzNlwiOiBcImRvbGxhcjtcIixcbiAgICBcIjM3XCI6IFwicGVyY250O1wiLFxuICAgIFwiMzhcIjogXCJhbXA7XCIsXG4gICAgXCIzOVwiOiBcImFwb3M7XCIsXG4gICAgXCI0MFwiOiBcImxwYXI7XCIsXG4gICAgXCI0MVwiOiBcInJwYXI7XCIsXG4gICAgXCI0MlwiOiBcIm1pZGFzdDtcIixcbiAgICBcIjQzXCI6IFwicGx1cztcIixcbiAgICBcIjQ0XCI6IFwiY29tbWE7XCIsXG4gICAgXCI0NlwiOiBcInBlcmlvZDtcIixcbiAgICBcIjQ3XCI6IFwic29sO1wiLFxuICAgIFwiNThcIjogXCJjb2xvbjtcIixcbiAgICBcIjU5XCI6IFwic2VtaTtcIixcbiAgICBcIjYwXCI6IFwibHQ7XCIsXG4gICAgXCI2MVwiOiBcImVxdWFscztcIixcbiAgICBcIjYyXCI6IFwiZ3Q7XCIsXG4gICAgXCI2M1wiOiBcInF1ZXN0O1wiLFxuICAgIFwiNjRcIjogXCJjb21tYXQ7XCIsXG4gICAgXCI5MVwiOiBcImxzcWI7XCIsXG4gICAgXCI5MlwiOiBcImJzb2w7XCIsXG4gICAgXCI5M1wiOiBcInJzcWI7XCIsXG4gICAgXCI5NFwiOiBcIkhhdDtcIixcbiAgICBcIjk1XCI6IFwiVW5kZXJCYXI7XCIsXG4gICAgXCI5NlwiOiBcImdyYXZlO1wiLFxuICAgIFwiMTIzXCI6IFwibGN1YjtcIixcbiAgICBcIjEyNFwiOiBcIlZlcnRpY2FsTGluZTtcIixcbiAgICBcIjEyNVwiOiBcInJjdWI7XCIsXG4gICAgXCIxNjBcIjogXCJOb25CcmVha2luZ1NwYWNlO1wiLFxuICAgIFwiMTYxXCI6IFwiaWV4Y2w7XCIsXG4gICAgXCIxNjJcIjogXCJjZW50O1wiLFxuICAgIFwiMTYzXCI6IFwicG91bmQ7XCIsXG4gICAgXCIxNjRcIjogXCJjdXJyZW47XCIsXG4gICAgXCIxNjVcIjogXCJ5ZW47XCIsXG4gICAgXCIxNjZcIjogXCJicnZiYXI7XCIsXG4gICAgXCIxNjdcIjogXCJzZWN0O1wiLFxuICAgIFwiMTY4XCI6IFwidW1sO1wiLFxuICAgIFwiMTY5XCI6IFwiY29weTtcIixcbiAgICBcIjE3MFwiOiBcIm9yZGY7XCIsXG4gICAgXCIxNzFcIjogXCJsYXF1bztcIixcbiAgICBcIjE3MlwiOiBcIm5vdDtcIixcbiAgICBcIjE3M1wiOiBcInNoeTtcIixcbiAgICBcIjE3NFwiOiBcInJlZztcIixcbiAgICBcIjE3NVwiOiBcInN0cm5zO1wiLFxuICAgIFwiMTc2XCI6IFwiZGVnO1wiLFxuICAgIFwiMTc3XCI6IFwicG07XCIsXG4gICAgXCIxNzhcIjogXCJzdXAyO1wiLFxuICAgIFwiMTc5XCI6IFwic3VwMztcIixcbiAgICBcIjE4MFwiOiBcIkRpYWNyaXRpY2FsQWN1dGU7XCIsXG4gICAgXCIxODFcIjogXCJtaWNybztcIixcbiAgICBcIjE4MlwiOiBcInBhcmE7XCIsXG4gICAgXCIxODNcIjogXCJtaWRkb3Q7XCIsXG4gICAgXCIxODRcIjogXCJDZWRpbGxhO1wiLFxuICAgIFwiMTg1XCI6IFwic3VwMTtcIixcbiAgICBcIjE4NlwiOiBcIm9yZG07XCIsXG4gICAgXCIxODdcIjogXCJyYXF1bztcIixcbiAgICBcIjE4OFwiOiBcImZyYWMxNDtcIixcbiAgICBcIjE4OVwiOiBcImhhbGY7XCIsXG4gICAgXCIxOTBcIjogXCJmcmFjMzQ7XCIsXG4gICAgXCIxOTFcIjogXCJpcXVlc3Q7XCIsXG4gICAgXCIxOTJcIjogXCJBZ3JhdmU7XCIsXG4gICAgXCIxOTNcIjogXCJBYWN1dGU7XCIsXG4gICAgXCIxOTRcIjogXCJBY2lyYztcIixcbiAgICBcIjE5NVwiOiBcIkF0aWxkZTtcIixcbiAgICBcIjE5NlwiOiBcIkF1bWw7XCIsXG4gICAgXCIxOTdcIjogXCJBcmluZztcIixcbiAgICBcIjE5OFwiOiBcIkFFbGlnO1wiLFxuICAgIFwiMTk5XCI6IFwiQ2NlZGlsO1wiLFxuICAgIFwiMjAwXCI6IFwiRWdyYXZlO1wiLFxuICAgIFwiMjAxXCI6IFwiRWFjdXRlO1wiLFxuICAgIFwiMjAyXCI6IFwiRWNpcmM7XCIsXG4gICAgXCIyMDNcIjogXCJFdW1sO1wiLFxuICAgIFwiMjA0XCI6IFwiSWdyYXZlO1wiLFxuICAgIFwiMjA1XCI6IFwiSWFjdXRlO1wiLFxuICAgIFwiMjA2XCI6IFwiSWNpcmM7XCIsXG4gICAgXCIyMDdcIjogXCJJdW1sO1wiLFxuICAgIFwiMjA4XCI6IFwiRVRIO1wiLFxuICAgIFwiMjA5XCI6IFwiTnRpbGRlO1wiLFxuICAgIFwiMjEwXCI6IFwiT2dyYXZlO1wiLFxuICAgIFwiMjExXCI6IFwiT2FjdXRlO1wiLFxuICAgIFwiMjEyXCI6IFwiT2NpcmM7XCIsXG4gICAgXCIyMTNcIjogXCJPdGlsZGU7XCIsXG4gICAgXCIyMTRcIjogXCJPdW1sO1wiLFxuICAgIFwiMjE1XCI6IFwidGltZXM7XCIsXG4gICAgXCIyMTZcIjogXCJPc2xhc2g7XCIsXG4gICAgXCIyMTdcIjogXCJVZ3JhdmU7XCIsXG4gICAgXCIyMThcIjogXCJVYWN1dGU7XCIsXG4gICAgXCIyMTlcIjogXCJVY2lyYztcIixcbiAgICBcIjIyMFwiOiBcIlV1bWw7XCIsXG4gICAgXCIyMjFcIjogXCJZYWN1dGU7XCIsXG4gICAgXCIyMjJcIjogXCJUSE9STjtcIixcbiAgICBcIjIyM1wiOiBcInN6bGlnO1wiLFxuICAgIFwiMjI0XCI6IFwiYWdyYXZlO1wiLFxuICAgIFwiMjI1XCI6IFwiYWFjdXRlO1wiLFxuICAgIFwiMjI2XCI6IFwiYWNpcmM7XCIsXG4gICAgXCIyMjdcIjogXCJhdGlsZGU7XCIsXG4gICAgXCIyMjhcIjogXCJhdW1sO1wiLFxuICAgIFwiMjI5XCI6IFwiYXJpbmc7XCIsXG4gICAgXCIyMzBcIjogXCJhZWxpZztcIixcbiAgICBcIjIzMVwiOiBcImNjZWRpbDtcIixcbiAgICBcIjIzMlwiOiBcImVncmF2ZTtcIixcbiAgICBcIjIzM1wiOiBcImVhY3V0ZTtcIixcbiAgICBcIjIzNFwiOiBcImVjaXJjO1wiLFxuICAgIFwiMjM1XCI6IFwiZXVtbDtcIixcbiAgICBcIjIzNlwiOiBcImlncmF2ZTtcIixcbiAgICBcIjIzN1wiOiBcImlhY3V0ZTtcIixcbiAgICBcIjIzOFwiOiBcImljaXJjO1wiLFxuICAgIFwiMjM5XCI6IFwiaXVtbDtcIixcbiAgICBcIjI0MFwiOiBcImV0aDtcIixcbiAgICBcIjI0MVwiOiBcIm50aWxkZTtcIixcbiAgICBcIjI0MlwiOiBcIm9ncmF2ZTtcIixcbiAgICBcIjI0M1wiOiBcIm9hY3V0ZTtcIixcbiAgICBcIjI0NFwiOiBcIm9jaXJjO1wiLFxuICAgIFwiMjQ1XCI6IFwib3RpbGRlO1wiLFxuICAgIFwiMjQ2XCI6IFwib3VtbDtcIixcbiAgICBcIjI0N1wiOiBcImRpdmlkZTtcIixcbiAgICBcIjI0OFwiOiBcIm9zbGFzaDtcIixcbiAgICBcIjI0OVwiOiBcInVncmF2ZTtcIixcbiAgICBcIjI1MFwiOiBcInVhY3V0ZTtcIixcbiAgICBcIjI1MVwiOiBcInVjaXJjO1wiLFxuICAgIFwiMjUyXCI6IFwidXVtbDtcIixcbiAgICBcIjI1M1wiOiBcInlhY3V0ZTtcIixcbiAgICBcIjI1NFwiOiBcInRob3JuO1wiLFxuICAgIFwiMjU1XCI6IFwieXVtbDtcIixcbiAgICBcIjI1NlwiOiBcIkFtYWNyO1wiLFxuICAgIFwiMjU3XCI6IFwiYW1hY3I7XCIsXG4gICAgXCIyNThcIjogXCJBYnJldmU7XCIsXG4gICAgXCIyNTlcIjogXCJhYnJldmU7XCIsXG4gICAgXCIyNjBcIjogXCJBb2dvbjtcIixcbiAgICBcIjI2MVwiOiBcImFvZ29uO1wiLFxuICAgIFwiMjYyXCI6IFwiQ2FjdXRlO1wiLFxuICAgIFwiMjYzXCI6IFwiY2FjdXRlO1wiLFxuICAgIFwiMjY0XCI6IFwiQ2NpcmM7XCIsXG4gICAgXCIyNjVcIjogXCJjY2lyYztcIixcbiAgICBcIjI2NlwiOiBcIkNkb3Q7XCIsXG4gICAgXCIyNjdcIjogXCJjZG90O1wiLFxuICAgIFwiMjY4XCI6IFwiQ2Nhcm9uO1wiLFxuICAgIFwiMjY5XCI6IFwiY2Nhcm9uO1wiLFxuICAgIFwiMjcwXCI6IFwiRGNhcm9uO1wiLFxuICAgIFwiMjcxXCI6IFwiZGNhcm9uO1wiLFxuICAgIFwiMjcyXCI6IFwiRHN0cm9rO1wiLFxuICAgIFwiMjczXCI6IFwiZHN0cm9rO1wiLFxuICAgIFwiMjc0XCI6IFwiRW1hY3I7XCIsXG4gICAgXCIyNzVcIjogXCJlbWFjcjtcIixcbiAgICBcIjI3OFwiOiBcIkVkb3Q7XCIsXG4gICAgXCIyNzlcIjogXCJlZG90O1wiLFxuICAgIFwiMjgwXCI6IFwiRW9nb247XCIsXG4gICAgXCIyODFcIjogXCJlb2dvbjtcIixcbiAgICBcIjI4MlwiOiBcIkVjYXJvbjtcIixcbiAgICBcIjI4M1wiOiBcImVjYXJvbjtcIixcbiAgICBcIjI4NFwiOiBcIkdjaXJjO1wiLFxuICAgIFwiMjg1XCI6IFwiZ2NpcmM7XCIsXG4gICAgXCIyODZcIjogXCJHYnJldmU7XCIsXG4gICAgXCIyODdcIjogXCJnYnJldmU7XCIsXG4gICAgXCIyODhcIjogXCJHZG90O1wiLFxuICAgIFwiMjg5XCI6IFwiZ2RvdDtcIixcbiAgICBcIjI5MFwiOiBcIkdjZWRpbDtcIixcbiAgICBcIjI5MlwiOiBcIkhjaXJjO1wiLFxuICAgIFwiMjkzXCI6IFwiaGNpcmM7XCIsXG4gICAgXCIyOTRcIjogXCJIc3Ryb2s7XCIsXG4gICAgXCIyOTVcIjogXCJoc3Ryb2s7XCIsXG4gICAgXCIyOTZcIjogXCJJdGlsZGU7XCIsXG4gICAgXCIyOTdcIjogXCJpdGlsZGU7XCIsXG4gICAgXCIyOThcIjogXCJJbWFjcjtcIixcbiAgICBcIjI5OVwiOiBcImltYWNyO1wiLFxuICAgIFwiMzAyXCI6IFwiSW9nb247XCIsXG4gICAgXCIzMDNcIjogXCJpb2dvbjtcIixcbiAgICBcIjMwNFwiOiBcIklkb3Q7XCIsXG4gICAgXCIzMDVcIjogXCJpbm9kb3Q7XCIsXG4gICAgXCIzMDZcIjogXCJJSmxpZztcIixcbiAgICBcIjMwN1wiOiBcImlqbGlnO1wiLFxuICAgIFwiMzA4XCI6IFwiSmNpcmM7XCIsXG4gICAgXCIzMDlcIjogXCJqY2lyYztcIixcbiAgICBcIjMxMFwiOiBcIktjZWRpbDtcIixcbiAgICBcIjMxMVwiOiBcImtjZWRpbDtcIixcbiAgICBcIjMxMlwiOiBcImtncmVlbjtcIixcbiAgICBcIjMxM1wiOiBcIkxhY3V0ZTtcIixcbiAgICBcIjMxNFwiOiBcImxhY3V0ZTtcIixcbiAgICBcIjMxNVwiOiBcIkxjZWRpbDtcIixcbiAgICBcIjMxNlwiOiBcImxjZWRpbDtcIixcbiAgICBcIjMxN1wiOiBcIkxjYXJvbjtcIixcbiAgICBcIjMxOFwiOiBcImxjYXJvbjtcIixcbiAgICBcIjMxOVwiOiBcIkxtaWRvdDtcIixcbiAgICBcIjMyMFwiOiBcImxtaWRvdDtcIixcbiAgICBcIjMyMVwiOiBcIkxzdHJvaztcIixcbiAgICBcIjMyMlwiOiBcImxzdHJvaztcIixcbiAgICBcIjMyM1wiOiBcIk5hY3V0ZTtcIixcbiAgICBcIjMyNFwiOiBcIm5hY3V0ZTtcIixcbiAgICBcIjMyNVwiOiBcIk5jZWRpbDtcIixcbiAgICBcIjMyNlwiOiBcIm5jZWRpbDtcIixcbiAgICBcIjMyN1wiOiBcIk5jYXJvbjtcIixcbiAgICBcIjMyOFwiOiBcIm5jYXJvbjtcIixcbiAgICBcIjMyOVwiOiBcIm5hcG9zO1wiLFxuICAgIFwiMzMwXCI6IFwiRU5HO1wiLFxuICAgIFwiMzMxXCI6IFwiZW5nO1wiLFxuICAgIFwiMzMyXCI6IFwiT21hY3I7XCIsXG4gICAgXCIzMzNcIjogXCJvbWFjcjtcIixcbiAgICBcIjMzNlwiOiBcIk9kYmxhYztcIixcbiAgICBcIjMzN1wiOiBcIm9kYmxhYztcIixcbiAgICBcIjMzOFwiOiBcIk9FbGlnO1wiLFxuICAgIFwiMzM5XCI6IFwib2VsaWc7XCIsXG4gICAgXCIzNDBcIjogXCJSYWN1dGU7XCIsXG4gICAgXCIzNDFcIjogXCJyYWN1dGU7XCIsXG4gICAgXCIzNDJcIjogXCJSY2VkaWw7XCIsXG4gICAgXCIzNDNcIjogXCJyY2VkaWw7XCIsXG4gICAgXCIzNDRcIjogXCJSY2Fyb247XCIsXG4gICAgXCIzNDVcIjogXCJyY2Fyb247XCIsXG4gICAgXCIzNDZcIjogXCJTYWN1dGU7XCIsXG4gICAgXCIzNDdcIjogXCJzYWN1dGU7XCIsXG4gICAgXCIzNDhcIjogXCJTY2lyYztcIixcbiAgICBcIjM0OVwiOiBcInNjaXJjO1wiLFxuICAgIFwiMzUwXCI6IFwiU2NlZGlsO1wiLFxuICAgIFwiMzUxXCI6IFwic2NlZGlsO1wiLFxuICAgIFwiMzUyXCI6IFwiU2Nhcm9uO1wiLFxuICAgIFwiMzUzXCI6IFwic2Nhcm9uO1wiLFxuICAgIFwiMzU0XCI6IFwiVGNlZGlsO1wiLFxuICAgIFwiMzU1XCI6IFwidGNlZGlsO1wiLFxuICAgIFwiMzU2XCI6IFwiVGNhcm9uO1wiLFxuICAgIFwiMzU3XCI6IFwidGNhcm9uO1wiLFxuICAgIFwiMzU4XCI6IFwiVHN0cm9rO1wiLFxuICAgIFwiMzU5XCI6IFwidHN0cm9rO1wiLFxuICAgIFwiMzYwXCI6IFwiVXRpbGRlO1wiLFxuICAgIFwiMzYxXCI6IFwidXRpbGRlO1wiLFxuICAgIFwiMzYyXCI6IFwiVW1hY3I7XCIsXG4gICAgXCIzNjNcIjogXCJ1bWFjcjtcIixcbiAgICBcIjM2NFwiOiBcIlVicmV2ZTtcIixcbiAgICBcIjM2NVwiOiBcInVicmV2ZTtcIixcbiAgICBcIjM2NlwiOiBcIlVyaW5nO1wiLFxuICAgIFwiMzY3XCI6IFwidXJpbmc7XCIsXG4gICAgXCIzNjhcIjogXCJVZGJsYWM7XCIsXG4gICAgXCIzNjlcIjogXCJ1ZGJsYWM7XCIsXG4gICAgXCIzNzBcIjogXCJVb2dvbjtcIixcbiAgICBcIjM3MVwiOiBcInVvZ29uO1wiLFxuICAgIFwiMzcyXCI6IFwiV2NpcmM7XCIsXG4gICAgXCIzNzNcIjogXCJ3Y2lyYztcIixcbiAgICBcIjM3NFwiOiBcIlljaXJjO1wiLFxuICAgIFwiMzc1XCI6IFwieWNpcmM7XCIsXG4gICAgXCIzNzZcIjogXCJZdW1sO1wiLFxuICAgIFwiMzc3XCI6IFwiWmFjdXRlO1wiLFxuICAgIFwiMzc4XCI6IFwiemFjdXRlO1wiLFxuICAgIFwiMzc5XCI6IFwiWmRvdDtcIixcbiAgICBcIjM4MFwiOiBcInpkb3Q7XCIsXG4gICAgXCIzODFcIjogXCJaY2Fyb247XCIsXG4gICAgXCIzODJcIjogXCJ6Y2Fyb247XCIsXG4gICAgXCI0MDJcIjogXCJmbm9mO1wiLFxuICAgIFwiNDM3XCI6IFwiaW1wZWQ7XCIsXG4gICAgXCI1MDFcIjogXCJnYWN1dGU7XCIsXG4gICAgXCI1NjdcIjogXCJqbWF0aDtcIixcbiAgICBcIjcxMFwiOiBcImNpcmM7XCIsXG4gICAgXCI3MTFcIjogXCJIYWNlaztcIixcbiAgICBcIjcyOFwiOiBcImJyZXZlO1wiLFxuICAgIFwiNzI5XCI6IFwiZG90O1wiLFxuICAgIFwiNzMwXCI6IFwicmluZztcIixcbiAgICBcIjczMVwiOiBcIm9nb247XCIsXG4gICAgXCI3MzJcIjogXCJ0aWxkZTtcIixcbiAgICBcIjczM1wiOiBcIkRpYWNyaXRpY2FsRG91YmxlQWN1dGU7XCIsXG4gICAgXCI3ODVcIjogXCJEb3duQnJldmU7XCIsXG4gICAgXCI5MTNcIjogXCJBbHBoYTtcIixcbiAgICBcIjkxNFwiOiBcIkJldGE7XCIsXG4gICAgXCI5MTVcIjogXCJHYW1tYTtcIixcbiAgICBcIjkxNlwiOiBcIkRlbHRhO1wiLFxuICAgIFwiOTE3XCI6IFwiRXBzaWxvbjtcIixcbiAgICBcIjkxOFwiOiBcIlpldGE7XCIsXG4gICAgXCI5MTlcIjogXCJFdGE7XCIsXG4gICAgXCI5MjBcIjogXCJUaGV0YTtcIixcbiAgICBcIjkyMVwiOiBcIklvdGE7XCIsXG4gICAgXCI5MjJcIjogXCJLYXBwYTtcIixcbiAgICBcIjkyM1wiOiBcIkxhbWJkYTtcIixcbiAgICBcIjkyNFwiOiBcIk11O1wiLFxuICAgIFwiOTI1XCI6IFwiTnU7XCIsXG4gICAgXCI5MjZcIjogXCJYaTtcIixcbiAgICBcIjkyN1wiOiBcIk9taWNyb247XCIsXG4gICAgXCI5MjhcIjogXCJQaTtcIixcbiAgICBcIjkyOVwiOiBcIlJobztcIixcbiAgICBcIjkzMVwiOiBcIlNpZ21hO1wiLFxuICAgIFwiOTMyXCI6IFwiVGF1O1wiLFxuICAgIFwiOTMzXCI6IFwiVXBzaWxvbjtcIixcbiAgICBcIjkzNFwiOiBcIlBoaTtcIixcbiAgICBcIjkzNVwiOiBcIkNoaTtcIixcbiAgICBcIjkzNlwiOiBcIlBzaTtcIixcbiAgICBcIjkzN1wiOiBcIk9tZWdhO1wiLFxuICAgIFwiOTQ1XCI6IFwiYWxwaGE7XCIsXG4gICAgXCI5NDZcIjogXCJiZXRhO1wiLFxuICAgIFwiOTQ3XCI6IFwiZ2FtbWE7XCIsXG4gICAgXCI5NDhcIjogXCJkZWx0YTtcIixcbiAgICBcIjk0OVwiOiBcImVwc2lsb247XCIsXG4gICAgXCI5NTBcIjogXCJ6ZXRhO1wiLFxuICAgIFwiOTUxXCI6IFwiZXRhO1wiLFxuICAgIFwiOTUyXCI6IFwidGhldGE7XCIsXG4gICAgXCI5NTNcIjogXCJpb3RhO1wiLFxuICAgIFwiOTU0XCI6IFwia2FwcGE7XCIsXG4gICAgXCI5NTVcIjogXCJsYW1iZGE7XCIsXG4gICAgXCI5NTZcIjogXCJtdTtcIixcbiAgICBcIjk1N1wiOiBcIm51O1wiLFxuICAgIFwiOTU4XCI6IFwieGk7XCIsXG4gICAgXCI5NTlcIjogXCJvbWljcm9uO1wiLFxuICAgIFwiOTYwXCI6IFwicGk7XCIsXG4gICAgXCI5NjFcIjogXCJyaG87XCIsXG4gICAgXCI5NjJcIjogXCJ2YXJzaWdtYTtcIixcbiAgICBcIjk2M1wiOiBcInNpZ21hO1wiLFxuICAgIFwiOTY0XCI6IFwidGF1O1wiLFxuICAgIFwiOTY1XCI6IFwidXBzaWxvbjtcIixcbiAgICBcIjk2NlwiOiBcInBoaTtcIixcbiAgICBcIjk2N1wiOiBcImNoaTtcIixcbiAgICBcIjk2OFwiOiBcInBzaTtcIixcbiAgICBcIjk2OVwiOiBcIm9tZWdhO1wiLFxuICAgIFwiOTc3XCI6IFwidmFydGhldGE7XCIsXG4gICAgXCI5NzhcIjogXCJ1cHNpaDtcIixcbiAgICBcIjk4MVwiOiBcInZhcnBoaTtcIixcbiAgICBcIjk4MlwiOiBcInZhcnBpO1wiLFxuICAgIFwiOTg4XCI6IFwiR2FtbWFkO1wiLFxuICAgIFwiOTg5XCI6IFwiZ2FtbWFkO1wiLFxuICAgIFwiMTAwOFwiOiBcInZhcmthcHBhO1wiLFxuICAgIFwiMTAwOVwiOiBcInZhcnJobztcIixcbiAgICBcIjEwMTNcIjogXCJ2YXJlcHNpbG9uO1wiLFxuICAgIFwiMTAxNFwiOiBcImJlcHNpO1wiLFxuICAgIFwiMTAyNVwiOiBcIklPY3k7XCIsXG4gICAgXCIxMDI2XCI6IFwiREpjeTtcIixcbiAgICBcIjEwMjdcIjogXCJHSmN5O1wiLFxuICAgIFwiMTAyOFwiOiBcIkp1a2N5O1wiLFxuICAgIFwiMTAyOVwiOiBcIkRTY3k7XCIsXG4gICAgXCIxMDMwXCI6IFwiSXVrY3k7XCIsXG4gICAgXCIxMDMxXCI6IFwiWUljeTtcIixcbiAgICBcIjEwMzJcIjogXCJKc2VyY3k7XCIsXG4gICAgXCIxMDMzXCI6IFwiTEpjeTtcIixcbiAgICBcIjEwMzRcIjogXCJOSmN5O1wiLFxuICAgIFwiMTAzNVwiOiBcIlRTSGN5O1wiLFxuICAgIFwiMTAzNlwiOiBcIktKY3k7XCIsXG4gICAgXCIxMDM4XCI6IFwiVWJyY3k7XCIsXG4gICAgXCIxMDM5XCI6IFwiRFpjeTtcIixcbiAgICBcIjEwNDBcIjogXCJBY3k7XCIsXG4gICAgXCIxMDQxXCI6IFwiQmN5O1wiLFxuICAgIFwiMTA0MlwiOiBcIlZjeTtcIixcbiAgICBcIjEwNDNcIjogXCJHY3k7XCIsXG4gICAgXCIxMDQ0XCI6IFwiRGN5O1wiLFxuICAgIFwiMTA0NVwiOiBcIklFY3k7XCIsXG4gICAgXCIxMDQ2XCI6IFwiWkhjeTtcIixcbiAgICBcIjEwNDdcIjogXCJaY3k7XCIsXG4gICAgXCIxMDQ4XCI6IFwiSWN5O1wiLFxuICAgIFwiMTA0OVwiOiBcIkpjeTtcIixcbiAgICBcIjEwNTBcIjogXCJLY3k7XCIsXG4gICAgXCIxMDUxXCI6IFwiTGN5O1wiLFxuICAgIFwiMTA1MlwiOiBcIk1jeTtcIixcbiAgICBcIjEwNTNcIjogXCJOY3k7XCIsXG4gICAgXCIxMDU0XCI6IFwiT2N5O1wiLFxuICAgIFwiMTA1NVwiOiBcIlBjeTtcIixcbiAgICBcIjEwNTZcIjogXCJSY3k7XCIsXG4gICAgXCIxMDU3XCI6IFwiU2N5O1wiLFxuICAgIFwiMTA1OFwiOiBcIlRjeTtcIixcbiAgICBcIjEwNTlcIjogXCJVY3k7XCIsXG4gICAgXCIxMDYwXCI6IFwiRmN5O1wiLFxuICAgIFwiMTA2MVwiOiBcIktIY3k7XCIsXG4gICAgXCIxMDYyXCI6IFwiVFNjeTtcIixcbiAgICBcIjEwNjNcIjogXCJDSGN5O1wiLFxuICAgIFwiMTA2NFwiOiBcIlNIY3k7XCIsXG4gICAgXCIxMDY1XCI6IFwiU0hDSGN5O1wiLFxuICAgIFwiMTA2NlwiOiBcIkhBUkRjeTtcIixcbiAgICBcIjEwNjdcIjogXCJZY3k7XCIsXG4gICAgXCIxMDY4XCI6IFwiU09GVGN5O1wiLFxuICAgIFwiMTA2OVwiOiBcIkVjeTtcIixcbiAgICBcIjEwNzBcIjogXCJZVWN5O1wiLFxuICAgIFwiMTA3MVwiOiBcIllBY3k7XCIsXG4gICAgXCIxMDcyXCI6IFwiYWN5O1wiLFxuICAgIFwiMTA3M1wiOiBcImJjeTtcIixcbiAgICBcIjEwNzRcIjogXCJ2Y3k7XCIsXG4gICAgXCIxMDc1XCI6IFwiZ2N5O1wiLFxuICAgIFwiMTA3NlwiOiBcImRjeTtcIixcbiAgICBcIjEwNzdcIjogXCJpZWN5O1wiLFxuICAgIFwiMTA3OFwiOiBcInpoY3k7XCIsXG4gICAgXCIxMDc5XCI6IFwiemN5O1wiLFxuICAgIFwiMTA4MFwiOiBcImljeTtcIixcbiAgICBcIjEwODFcIjogXCJqY3k7XCIsXG4gICAgXCIxMDgyXCI6IFwia2N5O1wiLFxuICAgIFwiMTA4M1wiOiBcImxjeTtcIixcbiAgICBcIjEwODRcIjogXCJtY3k7XCIsXG4gICAgXCIxMDg1XCI6IFwibmN5O1wiLFxuICAgIFwiMTA4NlwiOiBcIm9jeTtcIixcbiAgICBcIjEwODdcIjogXCJwY3k7XCIsXG4gICAgXCIxMDg4XCI6IFwicmN5O1wiLFxuICAgIFwiMTA4OVwiOiBcInNjeTtcIixcbiAgICBcIjEwOTBcIjogXCJ0Y3k7XCIsXG4gICAgXCIxMDkxXCI6IFwidWN5O1wiLFxuICAgIFwiMTA5MlwiOiBcImZjeTtcIixcbiAgICBcIjEwOTNcIjogXCJraGN5O1wiLFxuICAgIFwiMTA5NFwiOiBcInRzY3k7XCIsXG4gICAgXCIxMDk1XCI6IFwiY2hjeTtcIixcbiAgICBcIjEwOTZcIjogXCJzaGN5O1wiLFxuICAgIFwiMTA5N1wiOiBcInNoY2hjeTtcIixcbiAgICBcIjEwOThcIjogXCJoYXJkY3k7XCIsXG4gICAgXCIxMDk5XCI6IFwieWN5O1wiLFxuICAgIFwiMTEwMFwiOiBcInNvZnRjeTtcIixcbiAgICBcIjExMDFcIjogXCJlY3k7XCIsXG4gICAgXCIxMTAyXCI6IFwieXVjeTtcIixcbiAgICBcIjExMDNcIjogXCJ5YWN5O1wiLFxuICAgIFwiMTEwNVwiOiBcImlvY3k7XCIsXG4gICAgXCIxMTA2XCI6IFwiZGpjeTtcIixcbiAgICBcIjExMDdcIjogXCJnamN5O1wiLFxuICAgIFwiMTEwOFwiOiBcImp1a2N5O1wiLFxuICAgIFwiMTEwOVwiOiBcImRzY3k7XCIsXG4gICAgXCIxMTEwXCI6IFwiaXVrY3k7XCIsXG4gICAgXCIxMTExXCI6IFwieWljeTtcIixcbiAgICBcIjExMTJcIjogXCJqc2VyY3k7XCIsXG4gICAgXCIxMTEzXCI6IFwibGpjeTtcIixcbiAgICBcIjExMTRcIjogXCJuamN5O1wiLFxuICAgIFwiMTExNVwiOiBcInRzaGN5O1wiLFxuICAgIFwiMTExNlwiOiBcImtqY3k7XCIsXG4gICAgXCIxMTE4XCI6IFwidWJyY3k7XCIsXG4gICAgXCIxMTE5XCI6IFwiZHpjeTtcIixcbiAgICBcIjgxOTRcIjogXCJlbnNwO1wiLFxuICAgIFwiODE5NVwiOiBcImVtc3A7XCIsXG4gICAgXCI4MTk2XCI6IFwiZW1zcDEzO1wiLFxuICAgIFwiODE5N1wiOiBcImVtc3AxNDtcIixcbiAgICBcIjgxOTlcIjogXCJudW1zcDtcIixcbiAgICBcIjgyMDBcIjogXCJwdW5jc3A7XCIsXG4gICAgXCI4MjAxXCI6IFwiVGhpblNwYWNlO1wiLFxuICAgIFwiODIwMlwiOiBcIlZlcnlUaGluU3BhY2U7XCIsXG4gICAgXCI4MjAzXCI6IFwiWmVyb1dpZHRoU3BhY2U7XCIsXG4gICAgXCI4MjA0XCI6IFwienduajtcIixcbiAgICBcIjgyMDVcIjogXCJ6d2o7XCIsXG4gICAgXCI4MjA2XCI6IFwibHJtO1wiLFxuICAgIFwiODIwN1wiOiBcInJsbTtcIixcbiAgICBcIjgyMDhcIjogXCJoeXBoZW47XCIsXG4gICAgXCI4MjExXCI6IFwibmRhc2g7XCIsXG4gICAgXCI4MjEyXCI6IFwibWRhc2g7XCIsXG4gICAgXCI4MjEzXCI6IFwiaG9yYmFyO1wiLFxuICAgIFwiODIxNFwiOiBcIlZlcnQ7XCIsXG4gICAgXCI4MjE2XCI6IFwiT3BlbkN1cmx5UXVvdGU7XCIsXG4gICAgXCI4MjE3XCI6IFwicnNxdW9yO1wiLFxuICAgIFwiODIxOFwiOiBcInNicXVvO1wiLFxuICAgIFwiODIyMFwiOiBcIk9wZW5DdXJseURvdWJsZVF1b3RlO1wiLFxuICAgIFwiODIyMVwiOiBcInJkcXVvcjtcIixcbiAgICBcIjgyMjJcIjogXCJsZHF1b3I7XCIsXG4gICAgXCI4MjI0XCI6IFwiZGFnZ2VyO1wiLFxuICAgIFwiODIyNVwiOiBcImRkYWdnZXI7XCIsXG4gICAgXCI4MjI2XCI6IFwiYnVsbGV0O1wiLFxuICAgIFwiODIyOVwiOiBcIm5sZHI7XCIsXG4gICAgXCI4MjMwXCI6IFwibWxkcjtcIixcbiAgICBcIjgyNDBcIjogXCJwZXJtaWw7XCIsXG4gICAgXCI4MjQxXCI6IFwicGVydGVuaztcIixcbiAgICBcIjgyNDJcIjogXCJwcmltZTtcIixcbiAgICBcIjgyNDNcIjogXCJQcmltZTtcIixcbiAgICBcIjgyNDRcIjogXCJ0cHJpbWU7XCIsXG4gICAgXCI4MjQ1XCI6IFwiYnByaW1lO1wiLFxuICAgIFwiODI0OVwiOiBcImxzYXF1bztcIixcbiAgICBcIjgyNTBcIjogXCJyc2FxdW87XCIsXG4gICAgXCI4MjU0XCI6IFwiT3ZlckJhcjtcIixcbiAgICBcIjgyNTdcIjogXCJjYXJldDtcIixcbiAgICBcIjgyNTlcIjogXCJoeWJ1bGw7XCIsXG4gICAgXCI4MjYwXCI6IFwiZnJhc2w7XCIsXG4gICAgXCI4MjcxXCI6IFwiYnNlbWk7XCIsXG4gICAgXCI4Mjc5XCI6IFwicXByaW1lO1wiLFxuICAgIFwiODI4N1wiOiBcIk1lZGl1bVNwYWNlO1wiLFxuICAgIFwiODI4OFwiOiBcIk5vQnJlYWs7XCIsXG4gICAgXCI4Mjg5XCI6IFwiQXBwbHlGdW5jdGlvbjtcIixcbiAgICBcIjgyOTBcIjogXCJpdDtcIixcbiAgICBcIjgyOTFcIjogXCJJbnZpc2libGVDb21tYTtcIixcbiAgICBcIjgzNjRcIjogXCJldXJvO1wiLFxuICAgIFwiODQxMVwiOiBcIlRyaXBsZURvdDtcIixcbiAgICBcIjg0MTJcIjogXCJEb3REb3Q7XCIsXG4gICAgXCI4NDUwXCI6IFwiQ29wZjtcIixcbiAgICBcIjg0NTNcIjogXCJpbmNhcmU7XCIsXG4gICAgXCI4NDU4XCI6IFwiZ3NjcjtcIixcbiAgICBcIjg0NTlcIjogXCJIc2NyO1wiLFxuICAgIFwiODQ2MFwiOiBcIlBvaW5jYXJlcGxhbmU7XCIsXG4gICAgXCI4NDYxXCI6IFwicXVhdGVybmlvbnM7XCIsXG4gICAgXCI4NDYyXCI6IFwicGxhbmNraDtcIixcbiAgICBcIjg0NjNcIjogXCJwbGFua3Y7XCIsXG4gICAgXCI4NDY0XCI6IFwiSXNjcjtcIixcbiAgICBcIjg0NjVcIjogXCJpbWFncGFydDtcIixcbiAgICBcIjg0NjZcIjogXCJMc2NyO1wiLFxuICAgIFwiODQ2N1wiOiBcImVsbDtcIixcbiAgICBcIjg0NjlcIjogXCJOb3BmO1wiLFxuICAgIFwiODQ3MFwiOiBcIm51bWVybztcIixcbiAgICBcIjg0NzFcIjogXCJjb3B5c3I7XCIsXG4gICAgXCI4NDcyXCI6IFwid3A7XCIsXG4gICAgXCI4NDczXCI6IFwicHJpbWVzO1wiLFxuICAgIFwiODQ3NFwiOiBcInJhdGlvbmFscztcIixcbiAgICBcIjg0NzVcIjogXCJSc2NyO1wiLFxuICAgIFwiODQ3NlwiOiBcIlJmcjtcIixcbiAgICBcIjg0NzdcIjogXCJSb3BmO1wiLFxuICAgIFwiODQ3OFwiOiBcInJ4O1wiLFxuICAgIFwiODQ4MlwiOiBcInRyYWRlO1wiLFxuICAgIFwiODQ4NFwiOiBcIlpvcGY7XCIsXG4gICAgXCI4NDg3XCI6IFwibWhvO1wiLFxuICAgIFwiODQ4OFwiOiBcIlpmcjtcIixcbiAgICBcIjg0ODlcIjogXCJpaW90YTtcIixcbiAgICBcIjg0OTJcIjogXCJCc2NyO1wiLFxuICAgIFwiODQ5M1wiOiBcIkNmcjtcIixcbiAgICBcIjg0OTVcIjogXCJlc2NyO1wiLFxuICAgIFwiODQ5NlwiOiBcImV4cGVjdGF0aW9uO1wiLFxuICAgIFwiODQ5N1wiOiBcIkZzY3I7XCIsXG4gICAgXCI4NDk5XCI6IFwicGhtbWF0O1wiLFxuICAgIFwiODUwMFwiOiBcIm9zY3I7XCIsXG4gICAgXCI4NTAxXCI6IFwiYWxlcGg7XCIsXG4gICAgXCI4NTAyXCI6IFwiYmV0aDtcIixcbiAgICBcIjg1MDNcIjogXCJnaW1lbDtcIixcbiAgICBcIjg1MDRcIjogXCJkYWxldGg7XCIsXG4gICAgXCI4NTE3XCI6IFwiREQ7XCIsXG4gICAgXCI4NTE4XCI6IFwiRGlmZmVyZW50aWFsRDtcIixcbiAgICBcIjg1MTlcIjogXCJleHBvbmVudGlhbGU7XCIsXG4gICAgXCI4NTIwXCI6IFwiSW1hZ2luYXJ5STtcIixcbiAgICBcIjg1MzFcIjogXCJmcmFjMTM7XCIsXG4gICAgXCI4NTMyXCI6IFwiZnJhYzIzO1wiLFxuICAgIFwiODUzM1wiOiBcImZyYWMxNTtcIixcbiAgICBcIjg1MzRcIjogXCJmcmFjMjU7XCIsXG4gICAgXCI4NTM1XCI6IFwiZnJhYzM1O1wiLFxuICAgIFwiODUzNlwiOiBcImZyYWM0NTtcIixcbiAgICBcIjg1MzdcIjogXCJmcmFjMTY7XCIsXG4gICAgXCI4NTM4XCI6IFwiZnJhYzU2O1wiLFxuICAgIFwiODUzOVwiOiBcImZyYWMxODtcIixcbiAgICBcIjg1NDBcIjogXCJmcmFjMzg7XCIsXG4gICAgXCI4NTQxXCI6IFwiZnJhYzU4O1wiLFxuICAgIFwiODU0MlwiOiBcImZyYWM3ODtcIixcbiAgICBcIjg1OTJcIjogXCJzbGFycjtcIixcbiAgICBcIjg1OTNcIjogXCJ1cGFycm93O1wiLFxuICAgIFwiODU5NFwiOiBcInNyYXJyO1wiLFxuICAgIFwiODU5NVwiOiBcIlNob3J0RG93bkFycm93O1wiLFxuICAgIFwiODU5NlwiOiBcImxlZnRyaWdodGFycm93O1wiLFxuICAgIFwiODU5N1wiOiBcInZhcnI7XCIsXG4gICAgXCI4NTk4XCI6IFwiVXBwZXJMZWZ0QXJyb3c7XCIsXG4gICAgXCI4NTk5XCI6IFwiVXBwZXJSaWdodEFycm93O1wiLFxuICAgIFwiODYwMFwiOiBcInNlYXJyb3c7XCIsXG4gICAgXCI4NjAxXCI6IFwic3dhcnJvdztcIixcbiAgICBcIjg2MDJcIjogXCJubGVmdGFycm93O1wiLFxuICAgIFwiODYwM1wiOiBcIm5yaWdodGFycm93O1wiLFxuICAgIFwiODYwNVwiOiBcInJpZ2h0c3F1aWdhcnJvdztcIixcbiAgICBcIjg2MDZcIjogXCJ0d29oZWFkbGVmdGFycm93O1wiLFxuICAgIFwiODYwN1wiOiBcIlVhcnI7XCIsXG4gICAgXCI4NjA4XCI6IFwidHdvaGVhZHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjA5XCI6IFwiRGFycjtcIixcbiAgICBcIjg2MTBcIjogXCJsZWZ0YXJyb3d0YWlsO1wiLFxuICAgIFwiODYxMVwiOiBcInJpZ2h0YXJyb3d0YWlsO1wiLFxuICAgIFwiODYxMlwiOiBcIm1hcHN0b2xlZnQ7XCIsXG4gICAgXCI4NjEzXCI6IFwiVXBUZWVBcnJvdztcIixcbiAgICBcIjg2MTRcIjogXCJSaWdodFRlZUFycm93O1wiLFxuICAgIFwiODYxNVwiOiBcIm1hcHN0b2Rvd247XCIsXG4gICAgXCI4NjE3XCI6IFwibGFycmhrO1wiLFxuICAgIFwiODYxOFwiOiBcInJhcnJoaztcIixcbiAgICBcIjg2MTlcIjogXCJsb29wYXJyb3dsZWZ0O1wiLFxuICAgIFwiODYyMFwiOiBcInJhcnJscDtcIixcbiAgICBcIjg2MjFcIjogXCJsZWZ0cmlnaHRzcXVpZ2Fycm93O1wiLFxuICAgIFwiODYyMlwiOiBcIm5sZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2MjRcIjogXCJsc2g7XCIsXG4gICAgXCI4NjI1XCI6IFwicnNoO1wiLFxuICAgIFwiODYyNlwiOiBcImxkc2g7XCIsXG4gICAgXCI4NjI3XCI6IFwicmRzaDtcIixcbiAgICBcIjg2MjlcIjogXCJjcmFycjtcIixcbiAgICBcIjg2MzBcIjogXCJjdXJ2ZWFycm93bGVmdDtcIixcbiAgICBcIjg2MzFcIjogXCJjdXJ2ZWFycm93cmlnaHQ7XCIsXG4gICAgXCI4NjM0XCI6IFwib2xhcnI7XCIsXG4gICAgXCI4NjM1XCI6IFwib3JhcnI7XCIsXG4gICAgXCI4NjM2XCI6IFwibGhhcnU7XCIsXG4gICAgXCI4NjM3XCI6IFwibGhhcmQ7XCIsXG4gICAgXCI4NjM4XCI6IFwidXBoYXJwb29ucmlnaHQ7XCIsXG4gICAgXCI4NjM5XCI6IFwidXBoYXJwb29ubGVmdDtcIixcbiAgICBcIjg2NDBcIjogXCJSaWdodFZlY3RvcjtcIixcbiAgICBcIjg2NDFcIjogXCJyaWdodGhhcnBvb25kb3duO1wiLFxuICAgIFwiODY0MlwiOiBcIlJpZ2h0RG93blZlY3RvcjtcIixcbiAgICBcIjg2NDNcIjogXCJMZWZ0RG93blZlY3RvcjtcIixcbiAgICBcIjg2NDRcIjogXCJybGFycjtcIixcbiAgICBcIjg2NDVcIjogXCJVcEFycm93RG93bkFycm93O1wiLFxuICAgIFwiODY0NlwiOiBcImxyYXJyO1wiLFxuICAgIFwiODY0N1wiOiBcImxsYXJyO1wiLFxuICAgIFwiODY0OFwiOiBcInV1YXJyO1wiLFxuICAgIFwiODY0OVwiOiBcInJyYXJyO1wiLFxuICAgIFwiODY1MFwiOiBcImRvd25kb3duYXJyb3dzO1wiLFxuICAgIFwiODY1MVwiOiBcIlJldmVyc2VFcXVpbGlicml1bTtcIixcbiAgICBcIjg2NTJcIjogXCJybGhhcjtcIixcbiAgICBcIjg2NTNcIjogXCJuTGVmdGFycm93O1wiLFxuICAgIFwiODY1NFwiOiBcIm5MZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTVcIjogXCJuUmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTZcIjogXCJMZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjU3XCI6IFwiVXBhcnJvdztcIixcbiAgICBcIjg2NThcIjogXCJSaWdodGFycm93O1wiLFxuICAgIFwiODY1OVwiOiBcIkRvd25hcnJvdztcIixcbiAgICBcIjg2NjBcIjogXCJMZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2NjFcIjogXCJ2QXJyO1wiLFxuICAgIFwiODY2MlwiOiBcIm53QXJyO1wiLFxuICAgIFwiODY2M1wiOiBcIm5lQXJyO1wiLFxuICAgIFwiODY2NFwiOiBcInNlQXJyO1wiLFxuICAgIFwiODY2NVwiOiBcInN3QXJyO1wiLFxuICAgIFwiODY2NlwiOiBcIkxsZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjY3XCI6IFwiUnJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjY5XCI6IFwiemlncmFycjtcIixcbiAgICBcIjg2NzZcIjogXCJMZWZ0QXJyb3dCYXI7XCIsXG4gICAgXCI4Njc3XCI6IFwiUmlnaHRBcnJvd0JhcjtcIixcbiAgICBcIjg2OTNcIjogXCJkdWFycjtcIixcbiAgICBcIjg3MDFcIjogXCJsb2FycjtcIixcbiAgICBcIjg3MDJcIjogXCJyb2FycjtcIixcbiAgICBcIjg3MDNcIjogXCJob2FycjtcIixcbiAgICBcIjg3MDRcIjogXCJmb3JhbGw7XCIsXG4gICAgXCI4NzA1XCI6IFwiY29tcGxlbWVudDtcIixcbiAgICBcIjg3MDZcIjogXCJQYXJ0aWFsRDtcIixcbiAgICBcIjg3MDdcIjogXCJFeGlzdHM7XCIsXG4gICAgXCI4NzA4XCI6IFwiTm90RXhpc3RzO1wiLFxuICAgIFwiODcwOVwiOiBcInZhcm5vdGhpbmc7XCIsXG4gICAgXCI4NzExXCI6IFwibmFibGE7XCIsXG4gICAgXCI4NzEyXCI6IFwiaXNpbnY7XCIsXG4gICAgXCI4NzEzXCI6IFwibm90aW52YTtcIixcbiAgICBcIjg3MTVcIjogXCJTdWNoVGhhdDtcIixcbiAgICBcIjg3MTZcIjogXCJOb3RSZXZlcnNlRWxlbWVudDtcIixcbiAgICBcIjg3MTlcIjogXCJQcm9kdWN0O1wiLFxuICAgIFwiODcyMFwiOiBcIkNvcHJvZHVjdDtcIixcbiAgICBcIjg3MjFcIjogXCJzdW07XCIsXG4gICAgXCI4NzIyXCI6IFwibWludXM7XCIsXG4gICAgXCI4NzIzXCI6IFwibXA7XCIsXG4gICAgXCI4NzI0XCI6IFwicGx1c2RvO1wiLFxuICAgIFwiODcyNlwiOiBcInNzZXRtbjtcIixcbiAgICBcIjg3MjdcIjogXCJsb3dhc3Q7XCIsXG4gICAgXCI4NzI4XCI6IFwiU21hbGxDaXJjbGU7XCIsXG4gICAgXCI4NzMwXCI6IFwiU3FydDtcIixcbiAgICBcIjg3MzNcIjogXCJ2cHJvcDtcIixcbiAgICBcIjg3MzRcIjogXCJpbmZpbjtcIixcbiAgICBcIjg3MzVcIjogXCJhbmdydDtcIixcbiAgICBcIjg3MzZcIjogXCJhbmdsZTtcIixcbiAgICBcIjg3MzdcIjogXCJtZWFzdXJlZGFuZ2xlO1wiLFxuICAgIFwiODczOFwiOiBcImFuZ3NwaDtcIixcbiAgICBcIjg3MzlcIjogXCJWZXJ0aWNhbEJhcjtcIixcbiAgICBcIjg3NDBcIjogXCJuc21pZDtcIixcbiAgICBcIjg3NDFcIjogXCJzcGFyO1wiLFxuICAgIFwiODc0MlwiOiBcIm5zcGFyO1wiLFxuICAgIFwiODc0M1wiOiBcIndlZGdlO1wiLFxuICAgIFwiODc0NFwiOiBcInZlZTtcIixcbiAgICBcIjg3NDVcIjogXCJjYXA7XCIsXG4gICAgXCI4NzQ2XCI6IFwiY3VwO1wiLFxuICAgIFwiODc0N1wiOiBcIkludGVncmFsO1wiLFxuICAgIFwiODc0OFwiOiBcIkludDtcIixcbiAgICBcIjg3NDlcIjogXCJ0aW50O1wiLFxuICAgIFwiODc1MFwiOiBcIm9pbnQ7XCIsXG4gICAgXCI4NzUxXCI6IFwiRG91YmxlQ29udG91ckludGVncmFsO1wiLFxuICAgIFwiODc1MlwiOiBcIkNjb25pbnQ7XCIsXG4gICAgXCI4NzUzXCI6IFwiY3dpbnQ7XCIsXG4gICAgXCI4NzU0XCI6IFwiY3djb25pbnQ7XCIsXG4gICAgXCI4NzU1XCI6IFwiQ291bnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NTZcIjogXCJ0aGVyZWZvcmU7XCIsXG4gICAgXCI4NzU3XCI6IFwiYmVjYXVzZTtcIixcbiAgICBcIjg3NThcIjogXCJyYXRpbztcIixcbiAgICBcIjg3NTlcIjogXCJQcm9wb3J0aW9uO1wiLFxuICAgIFwiODc2MFwiOiBcIm1pbnVzZDtcIixcbiAgICBcIjg3NjJcIjogXCJtRERvdDtcIixcbiAgICBcIjg3NjNcIjogXCJob210aHQ7XCIsXG4gICAgXCI4NzY0XCI6IFwiVGlsZGU7XCIsXG4gICAgXCI4NzY1XCI6IFwiYnNpbTtcIixcbiAgICBcIjg3NjZcIjogXCJtc3Rwb3M7XCIsXG4gICAgXCI4NzY3XCI6IFwiYWNkO1wiLFxuICAgIFwiODc2OFwiOiBcIndyZWF0aDtcIixcbiAgICBcIjg3NjlcIjogXCJuc2ltO1wiLFxuICAgIFwiODc3MFwiOiBcImVzaW07XCIsXG4gICAgXCI4NzcxXCI6IFwiVGlsZGVFcXVhbDtcIixcbiAgICBcIjg3NzJcIjogXCJuc2ltZXE7XCIsXG4gICAgXCI4NzczXCI6IFwiVGlsZGVGdWxsRXF1YWw7XCIsXG4gICAgXCI4Nzc0XCI6IFwic2ltbmU7XCIsXG4gICAgXCI4Nzc1XCI6IFwiTm90VGlsZGVGdWxsRXF1YWw7XCIsXG4gICAgXCI4Nzc2XCI6IFwiVGlsZGVUaWxkZTtcIixcbiAgICBcIjg3NzdcIjogXCJOb3RUaWxkZVRpbGRlO1wiLFxuICAgIFwiODc3OFwiOiBcImFwcHJveGVxO1wiLFxuICAgIFwiODc3OVwiOiBcImFwaWQ7XCIsXG4gICAgXCI4NzgwXCI6IFwiYmNvbmc7XCIsXG4gICAgXCI4NzgxXCI6IFwiQ3VwQ2FwO1wiLFxuICAgIFwiODc4MlwiOiBcIkh1bXBEb3duSHVtcDtcIixcbiAgICBcIjg3ODNcIjogXCJIdW1wRXF1YWw7XCIsXG4gICAgXCI4Nzg0XCI6IFwiZXNkb3Q7XCIsXG4gICAgXCI4Nzg1XCI6IFwiZURvdDtcIixcbiAgICBcIjg3ODZcIjogXCJmYWxsaW5nZG90c2VxO1wiLFxuICAgIFwiODc4N1wiOiBcInJpc2luZ2RvdHNlcTtcIixcbiAgICBcIjg3ODhcIjogXCJjb2xvbmVxO1wiLFxuICAgIFwiODc4OVwiOiBcImVxY29sb247XCIsXG4gICAgXCI4NzkwXCI6IFwiZXFjaXJjO1wiLFxuICAgIFwiODc5MVwiOiBcImNpcmU7XCIsXG4gICAgXCI4NzkzXCI6IFwid2VkZ2VxO1wiLFxuICAgIFwiODc5NFwiOiBcInZlZWVxO1wiLFxuICAgIFwiODc5NlwiOiBcInRyaWU7XCIsXG4gICAgXCI4Nzk5XCI6IFwicXVlc3RlcTtcIixcbiAgICBcIjg4MDBcIjogXCJOb3RFcXVhbDtcIixcbiAgICBcIjg4MDFcIjogXCJlcXVpdjtcIixcbiAgICBcIjg4MDJcIjogXCJOb3RDb25ncnVlbnQ7XCIsXG4gICAgXCI4ODA0XCI6IFwibGVxO1wiLFxuICAgIFwiODgwNVwiOiBcIkdyZWF0ZXJFcXVhbDtcIixcbiAgICBcIjg4MDZcIjogXCJMZXNzRnVsbEVxdWFsO1wiLFxuICAgIFwiODgwN1wiOiBcIkdyZWF0ZXJGdWxsRXF1YWw7XCIsXG4gICAgXCI4ODA4XCI6IFwibG5lcXE7XCIsXG4gICAgXCI4ODA5XCI6IFwiZ25lcXE7XCIsXG4gICAgXCI4ODEwXCI6IFwiTmVzdGVkTGVzc0xlc3M7XCIsXG4gICAgXCI4ODExXCI6IFwiTmVzdGVkR3JlYXRlckdyZWF0ZXI7XCIsXG4gICAgXCI4ODEyXCI6IFwidHdpeHQ7XCIsXG4gICAgXCI4ODEzXCI6IFwiTm90Q3VwQ2FwO1wiLFxuICAgIFwiODgxNFwiOiBcIk5vdExlc3M7XCIsXG4gICAgXCI4ODE1XCI6IFwiTm90R3JlYXRlcjtcIixcbiAgICBcIjg4MTZcIjogXCJOb3RMZXNzRXF1YWw7XCIsXG4gICAgXCI4ODE3XCI6IFwiTm90R3JlYXRlckVxdWFsO1wiLFxuICAgIFwiODgxOFwiOiBcImxzaW07XCIsXG4gICAgXCI4ODE5XCI6IFwiZ3Ryc2ltO1wiLFxuICAgIFwiODgyMFwiOiBcIk5vdExlc3NUaWxkZTtcIixcbiAgICBcIjg4MjFcIjogXCJOb3RHcmVhdGVyVGlsZGU7XCIsXG4gICAgXCI4ODIyXCI6IFwibGc7XCIsXG4gICAgXCI4ODIzXCI6IFwiZ3RybGVzcztcIixcbiAgICBcIjg4MjRcIjogXCJudGxnO1wiLFxuICAgIFwiODgyNVwiOiBcIm50Z2w7XCIsXG4gICAgXCI4ODI2XCI6IFwiUHJlY2VkZXM7XCIsXG4gICAgXCI4ODI3XCI6IFwiU3VjY2VlZHM7XCIsXG4gICAgXCI4ODI4XCI6IFwiUHJlY2VkZXNTbGFudEVxdWFsO1wiLFxuICAgIFwiODgyOVwiOiBcIlN1Y2NlZWRzU2xhbnRFcXVhbDtcIixcbiAgICBcIjg4MzBcIjogXCJwcnNpbTtcIixcbiAgICBcIjg4MzFcIjogXCJzdWNjc2ltO1wiLFxuICAgIFwiODgzMlwiOiBcIm5wcmVjO1wiLFxuICAgIFwiODgzM1wiOiBcIm5zdWNjO1wiLFxuICAgIFwiODgzNFwiOiBcInN1YnNldDtcIixcbiAgICBcIjg4MzVcIjogXCJzdXBzZXQ7XCIsXG4gICAgXCI4ODM2XCI6IFwibnN1YjtcIixcbiAgICBcIjg4MzdcIjogXCJuc3VwO1wiLFxuICAgIFwiODgzOFwiOiBcIlN1YnNldEVxdWFsO1wiLFxuICAgIFwiODgzOVwiOiBcInN1cHNldGVxO1wiLFxuICAgIFwiODg0MFwiOiBcIm5zdWJzZXRlcTtcIixcbiAgICBcIjg4NDFcIjogXCJuc3Vwc2V0ZXE7XCIsXG4gICAgXCI4ODQyXCI6IFwic3Vic2V0bmVxO1wiLFxuICAgIFwiODg0M1wiOiBcInN1cHNldG5lcTtcIixcbiAgICBcIjg4NDVcIjogXCJjdXBkb3Q7XCIsXG4gICAgXCI4ODQ2XCI6IFwidXBsdXM7XCIsXG4gICAgXCI4ODQ3XCI6IFwiU3F1YXJlU3Vic2V0O1wiLFxuICAgIFwiODg0OFwiOiBcIlNxdWFyZVN1cGVyc2V0O1wiLFxuICAgIFwiODg0OVwiOiBcIlNxdWFyZVN1YnNldEVxdWFsO1wiLFxuICAgIFwiODg1MFwiOiBcIlNxdWFyZVN1cGVyc2V0RXF1YWw7XCIsXG4gICAgXCI4ODUxXCI6IFwiU3F1YXJlSW50ZXJzZWN0aW9uO1wiLFxuICAgIFwiODg1MlwiOiBcIlNxdWFyZVVuaW9uO1wiLFxuICAgIFwiODg1M1wiOiBcIm9wbHVzO1wiLFxuICAgIFwiODg1NFwiOiBcIm9taW51cztcIixcbiAgICBcIjg4NTVcIjogXCJvdGltZXM7XCIsXG4gICAgXCI4ODU2XCI6IFwib3NvbDtcIixcbiAgICBcIjg4NTdcIjogXCJvZG90O1wiLFxuICAgIFwiODg1OFwiOiBcIm9jaXI7XCIsXG4gICAgXCI4ODU5XCI6IFwib2FzdDtcIixcbiAgICBcIjg4NjFcIjogXCJvZGFzaDtcIixcbiAgICBcIjg4NjJcIjogXCJwbHVzYjtcIixcbiAgICBcIjg4NjNcIjogXCJtaW51c2I7XCIsXG4gICAgXCI4ODY0XCI6IFwidGltZXNiO1wiLFxuICAgIFwiODg2NVwiOiBcInNkb3RiO1wiLFxuICAgIFwiODg2NlwiOiBcInZkYXNoO1wiLFxuICAgIFwiODg2N1wiOiBcIkxlZnRUZWU7XCIsXG4gICAgXCI4ODY4XCI6IFwidG9wO1wiLFxuICAgIFwiODg2OVwiOiBcIlVwVGVlO1wiLFxuICAgIFwiODg3MVwiOiBcIm1vZGVscztcIixcbiAgICBcIjg4NzJcIjogXCJ2RGFzaDtcIixcbiAgICBcIjg4NzNcIjogXCJWZGFzaDtcIixcbiAgICBcIjg4NzRcIjogXCJWdmRhc2g7XCIsXG4gICAgXCI4ODc1XCI6IFwiVkRhc2g7XCIsXG4gICAgXCI4ODc2XCI6IFwibnZkYXNoO1wiLFxuICAgIFwiODg3N1wiOiBcIm52RGFzaDtcIixcbiAgICBcIjg4NzhcIjogXCJuVmRhc2g7XCIsXG4gICAgXCI4ODc5XCI6IFwiblZEYXNoO1wiLFxuICAgIFwiODg4MFwiOiBcInBydXJlbDtcIixcbiAgICBcIjg4ODJcIjogXCJ2bHRyaTtcIixcbiAgICBcIjg4ODNcIjogXCJ2cnRyaTtcIixcbiAgICBcIjg4ODRcIjogXCJ0cmlhbmdsZWxlZnRlcTtcIixcbiAgICBcIjg4ODVcIjogXCJ0cmlhbmdsZXJpZ2h0ZXE7XCIsXG4gICAgXCI4ODg2XCI6IFwib3JpZ29mO1wiLFxuICAgIFwiODg4N1wiOiBcImltb2Y7XCIsXG4gICAgXCI4ODg4XCI6IFwibXVtYXA7XCIsXG4gICAgXCI4ODg5XCI6IFwiaGVyY29uO1wiLFxuICAgIFwiODg5MFwiOiBcImludGVyY2FsO1wiLFxuICAgIFwiODg5MVwiOiBcInZlZWJhcjtcIixcbiAgICBcIjg4OTNcIjogXCJiYXJ2ZWU7XCIsXG4gICAgXCI4ODk0XCI6IFwiYW5ncnR2YjtcIixcbiAgICBcIjg4OTVcIjogXCJscnRyaTtcIixcbiAgICBcIjg4OTZcIjogXCJ4d2VkZ2U7XCIsXG4gICAgXCI4ODk3XCI6IFwieHZlZTtcIixcbiAgICBcIjg4OThcIjogXCJ4Y2FwO1wiLFxuICAgIFwiODg5OVwiOiBcInhjdXA7XCIsXG4gICAgXCI4OTAwXCI6IFwiZGlhbW9uZDtcIixcbiAgICBcIjg5MDFcIjogXCJzZG90O1wiLFxuICAgIFwiODkwMlwiOiBcIlN0YXI7XCIsXG4gICAgXCI4OTAzXCI6IFwiZGl2b254O1wiLFxuICAgIFwiODkwNFwiOiBcImJvd3RpZTtcIixcbiAgICBcIjg5MDVcIjogXCJsdGltZXM7XCIsXG4gICAgXCI4OTA2XCI6IFwicnRpbWVzO1wiLFxuICAgIFwiODkwN1wiOiBcImx0aHJlZTtcIixcbiAgICBcIjg5MDhcIjogXCJydGhyZWU7XCIsXG4gICAgXCI4OTA5XCI6IFwiYnNpbWU7XCIsXG4gICAgXCI4OTEwXCI6IFwiY3V2ZWU7XCIsXG4gICAgXCI4OTExXCI6IFwiY3V3ZWQ7XCIsXG4gICAgXCI4OTEyXCI6IFwiU3Vic2V0O1wiLFxuICAgIFwiODkxM1wiOiBcIlN1cHNldDtcIixcbiAgICBcIjg5MTRcIjogXCJDYXA7XCIsXG4gICAgXCI4OTE1XCI6IFwiQ3VwO1wiLFxuICAgIFwiODkxNlwiOiBcInBpdGNoZm9yaztcIixcbiAgICBcIjg5MTdcIjogXCJlcGFyO1wiLFxuICAgIFwiODkxOFwiOiBcImx0ZG90O1wiLFxuICAgIFwiODkxOVwiOiBcImd0cmRvdDtcIixcbiAgICBcIjg5MjBcIjogXCJMbDtcIixcbiAgICBcIjg5MjFcIjogXCJnZ2c7XCIsXG4gICAgXCI4OTIyXCI6IFwiTGVzc0VxdWFsR3JlYXRlcjtcIixcbiAgICBcIjg5MjNcIjogXCJndHJlcWxlc3M7XCIsXG4gICAgXCI4OTI2XCI6IFwiY3VybHllcXByZWM7XCIsXG4gICAgXCI4OTI3XCI6IFwiY3VybHllcXN1Y2M7XCIsXG4gICAgXCI4OTI4XCI6IFwibnByY3VlO1wiLFxuICAgIFwiODkyOVwiOiBcIm5zY2N1ZTtcIixcbiAgICBcIjg5MzBcIjogXCJuc3FzdWJlO1wiLFxuICAgIFwiODkzMVwiOiBcIm5zcXN1cGU7XCIsXG4gICAgXCI4OTM0XCI6IFwibG5zaW07XCIsXG4gICAgXCI4OTM1XCI6IFwiZ25zaW07XCIsXG4gICAgXCI4OTM2XCI6IFwicHJuc2ltO1wiLFxuICAgIFwiODkzN1wiOiBcInN1Y2Nuc2ltO1wiLFxuICAgIFwiODkzOFwiOiBcIm50cmlhbmdsZWxlZnQ7XCIsXG4gICAgXCI4OTM5XCI6IFwibnRyaWFuZ2xlcmlnaHQ7XCIsXG4gICAgXCI4OTQwXCI6IFwibnRyaWFuZ2xlbGVmdGVxO1wiLFxuICAgIFwiODk0MVwiOiBcIm50cmlhbmdsZXJpZ2h0ZXE7XCIsXG4gICAgXCI4OTQyXCI6IFwidmVsbGlwO1wiLFxuICAgIFwiODk0M1wiOiBcImN0ZG90O1wiLFxuICAgIFwiODk0NFwiOiBcInV0ZG90O1wiLFxuICAgIFwiODk0NVwiOiBcImR0ZG90O1wiLFxuICAgIFwiODk0NlwiOiBcImRpc2luO1wiLFxuICAgIFwiODk0N1wiOiBcImlzaW5zdjtcIixcbiAgICBcIjg5NDhcIjogXCJpc2lucztcIixcbiAgICBcIjg5NDlcIjogXCJpc2luZG90O1wiLFxuICAgIFwiODk1MFwiOiBcIm5vdGludmM7XCIsXG4gICAgXCI4OTUxXCI6IFwibm90aW52YjtcIixcbiAgICBcIjg5NTNcIjogXCJpc2luRTtcIixcbiAgICBcIjg5NTRcIjogXCJuaXNkO1wiLFxuICAgIFwiODk1NVwiOiBcInhuaXM7XCIsXG4gICAgXCI4OTU2XCI6IFwibmlzO1wiLFxuICAgIFwiODk1N1wiOiBcIm5vdG5pdmM7XCIsXG4gICAgXCI4OTU4XCI6IFwibm90bml2YjtcIixcbiAgICBcIjg5NjVcIjogXCJiYXJ3ZWRnZTtcIixcbiAgICBcIjg5NjZcIjogXCJkb3VibGViYXJ3ZWRnZTtcIixcbiAgICBcIjg5NjhcIjogXCJMZWZ0Q2VpbGluZztcIixcbiAgICBcIjg5NjlcIjogXCJSaWdodENlaWxpbmc7XCIsXG4gICAgXCI4OTcwXCI6IFwibGZsb29yO1wiLFxuICAgIFwiODk3MVwiOiBcIlJpZ2h0Rmxvb3I7XCIsXG4gICAgXCI4OTcyXCI6IFwiZHJjcm9wO1wiLFxuICAgIFwiODk3M1wiOiBcImRsY3JvcDtcIixcbiAgICBcIjg5NzRcIjogXCJ1cmNyb3A7XCIsXG4gICAgXCI4OTc1XCI6IFwidWxjcm9wO1wiLFxuICAgIFwiODk3NlwiOiBcImJub3Q7XCIsXG4gICAgXCI4OTc4XCI6IFwicHJvZmxpbmU7XCIsXG4gICAgXCI4OTc5XCI6IFwicHJvZnN1cmY7XCIsXG4gICAgXCI4OTgxXCI6IFwidGVscmVjO1wiLFxuICAgIFwiODk4MlwiOiBcInRhcmdldDtcIixcbiAgICBcIjg5ODhcIjogXCJ1bGNvcm5lcjtcIixcbiAgICBcIjg5ODlcIjogXCJ1cmNvcm5lcjtcIixcbiAgICBcIjg5OTBcIjogXCJsbGNvcm5lcjtcIixcbiAgICBcIjg5OTFcIjogXCJscmNvcm5lcjtcIixcbiAgICBcIjg5OTRcIjogXCJzZnJvd247XCIsXG4gICAgXCI4OTk1XCI6IFwic3NtaWxlO1wiLFxuICAgIFwiOTAwNVwiOiBcImN5bGN0eTtcIixcbiAgICBcIjkwMDZcIjogXCJwcm9mYWxhcjtcIixcbiAgICBcIjkwMTRcIjogXCJ0b3Bib3Q7XCIsXG4gICAgXCI5MDIxXCI6IFwib3ZiYXI7XCIsXG4gICAgXCI5MDIzXCI6IFwic29sYmFyO1wiLFxuICAgIFwiOTA4NFwiOiBcImFuZ3phcnI7XCIsXG4gICAgXCI5MTM2XCI6IFwibG1vdXN0YWNoZTtcIixcbiAgICBcIjkxMzdcIjogXCJybW91c3RhY2hlO1wiLFxuICAgIFwiOTE0MFwiOiBcInRicms7XCIsXG4gICAgXCI5MTQxXCI6IFwiVW5kZXJCcmFja2V0O1wiLFxuICAgIFwiOTE0MlwiOiBcImJicmt0YnJrO1wiLFxuICAgIFwiOTE4MFwiOiBcIk92ZXJQYXJlbnRoZXNpcztcIixcbiAgICBcIjkxODFcIjogXCJVbmRlclBhcmVudGhlc2lzO1wiLFxuICAgIFwiOTE4MlwiOiBcIk92ZXJCcmFjZTtcIixcbiAgICBcIjkxODNcIjogXCJVbmRlckJyYWNlO1wiLFxuICAgIFwiOTE4NlwiOiBcInRycGV6aXVtO1wiLFxuICAgIFwiOTE5MVwiOiBcImVsaW50ZXJzO1wiLFxuICAgIFwiOTI1MVwiOiBcImJsYW5rO1wiLFxuICAgIFwiOTQxNlwiOiBcIm9TO1wiLFxuICAgIFwiOTQ3MlwiOiBcIkhvcml6b250YWxMaW5lO1wiLFxuICAgIFwiOTQ3NFwiOiBcImJveHY7XCIsXG4gICAgXCI5NDg0XCI6IFwiYm94ZHI7XCIsXG4gICAgXCI5NDg4XCI6IFwiYm94ZGw7XCIsXG4gICAgXCI5NDkyXCI6IFwiYm94dXI7XCIsXG4gICAgXCI5NDk2XCI6IFwiYm94dWw7XCIsXG4gICAgXCI5NTAwXCI6IFwiYm94dnI7XCIsXG4gICAgXCI5NTA4XCI6IFwiYm94dmw7XCIsXG4gICAgXCI5NTE2XCI6IFwiYm94aGQ7XCIsXG4gICAgXCI5NTI0XCI6IFwiYm94aHU7XCIsXG4gICAgXCI5NTMyXCI6IFwiYm94dmg7XCIsXG4gICAgXCI5NTUyXCI6IFwiYm94SDtcIixcbiAgICBcIjk1NTNcIjogXCJib3hWO1wiLFxuICAgIFwiOTU1NFwiOiBcImJveGRSO1wiLFxuICAgIFwiOTU1NVwiOiBcImJveERyO1wiLFxuICAgIFwiOTU1NlwiOiBcImJveERSO1wiLFxuICAgIFwiOTU1N1wiOiBcImJveGRMO1wiLFxuICAgIFwiOTU1OFwiOiBcImJveERsO1wiLFxuICAgIFwiOTU1OVwiOiBcImJveERMO1wiLFxuICAgIFwiOTU2MFwiOiBcImJveHVSO1wiLFxuICAgIFwiOTU2MVwiOiBcImJveFVyO1wiLFxuICAgIFwiOTU2MlwiOiBcImJveFVSO1wiLFxuICAgIFwiOTU2M1wiOiBcImJveHVMO1wiLFxuICAgIFwiOTU2NFwiOiBcImJveFVsO1wiLFxuICAgIFwiOTU2NVwiOiBcImJveFVMO1wiLFxuICAgIFwiOTU2NlwiOiBcImJveHZSO1wiLFxuICAgIFwiOTU2N1wiOiBcImJveFZyO1wiLFxuICAgIFwiOTU2OFwiOiBcImJveFZSO1wiLFxuICAgIFwiOTU2OVwiOiBcImJveHZMO1wiLFxuICAgIFwiOTU3MFwiOiBcImJveFZsO1wiLFxuICAgIFwiOTU3MVwiOiBcImJveFZMO1wiLFxuICAgIFwiOTU3MlwiOiBcImJveEhkO1wiLFxuICAgIFwiOTU3M1wiOiBcImJveGhEO1wiLFxuICAgIFwiOTU3NFwiOiBcImJveEhEO1wiLFxuICAgIFwiOTU3NVwiOiBcImJveEh1O1wiLFxuICAgIFwiOTU3NlwiOiBcImJveGhVO1wiLFxuICAgIFwiOTU3N1wiOiBcImJveEhVO1wiLFxuICAgIFwiOTU3OFwiOiBcImJveHZIO1wiLFxuICAgIFwiOTU3OVwiOiBcImJveFZoO1wiLFxuICAgIFwiOTU4MFwiOiBcImJveFZIO1wiLFxuICAgIFwiOTYwMFwiOiBcInVoYmxrO1wiLFxuICAgIFwiOTYwNFwiOiBcImxoYmxrO1wiLFxuICAgIFwiOTYwOFwiOiBcImJsb2NrO1wiLFxuICAgIFwiOTYxN1wiOiBcImJsazE0O1wiLFxuICAgIFwiOTYxOFwiOiBcImJsazEyO1wiLFxuICAgIFwiOTYxOVwiOiBcImJsazM0O1wiLFxuICAgIFwiOTYzM1wiOiBcInNxdWFyZTtcIixcbiAgICBcIjk2NDJcIjogXCJzcXVmO1wiLFxuICAgIFwiOTY0M1wiOiBcIkVtcHR5VmVyeVNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTY0NVwiOiBcInJlY3Q7XCIsXG4gICAgXCI5NjQ2XCI6IFwibWFya2VyO1wiLFxuICAgIFwiOTY0OVwiOiBcImZsdG5zO1wiLFxuICAgIFwiOTY1MVwiOiBcInh1dHJpO1wiLFxuICAgIFwiOTY1MlwiOiBcInV0cmlmO1wiLFxuICAgIFwiOTY1M1wiOiBcInV0cmk7XCIsXG4gICAgXCI5NjU2XCI6IFwicnRyaWY7XCIsXG4gICAgXCI5NjU3XCI6IFwidHJpYW5nbGVyaWdodDtcIixcbiAgICBcIjk2NjFcIjogXCJ4ZHRyaTtcIixcbiAgICBcIjk2NjJcIjogXCJkdHJpZjtcIixcbiAgICBcIjk2NjNcIjogXCJ0cmlhbmdsZWRvd247XCIsXG4gICAgXCI5NjY2XCI6IFwibHRyaWY7XCIsXG4gICAgXCI5NjY3XCI6IFwidHJpYW5nbGVsZWZ0O1wiLFxuICAgIFwiOTY3NFwiOiBcImxvemVuZ2U7XCIsXG4gICAgXCI5Njc1XCI6IFwiY2lyO1wiLFxuICAgIFwiOTcwOFwiOiBcInRyaWRvdDtcIixcbiAgICBcIjk3MTFcIjogXCJ4Y2lyYztcIixcbiAgICBcIjk3MjBcIjogXCJ1bHRyaTtcIixcbiAgICBcIjk3MjFcIjogXCJ1cnRyaTtcIixcbiAgICBcIjk3MjJcIjogXCJsbHRyaTtcIixcbiAgICBcIjk3MjNcIjogXCJFbXB0eVNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTcyNFwiOiBcIkZpbGxlZFNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTczM1wiOiBcInN0YXJmO1wiLFxuICAgIFwiOTczNFwiOiBcInN0YXI7XCIsXG4gICAgXCI5NzQyXCI6IFwicGhvbmU7XCIsXG4gICAgXCI5NzkyXCI6IFwiZmVtYWxlO1wiLFxuICAgIFwiOTc5NFwiOiBcIm1hbGU7XCIsXG4gICAgXCI5ODI0XCI6IFwic3BhZGVzdWl0O1wiLFxuICAgIFwiOTgyN1wiOiBcImNsdWJzdWl0O1wiLFxuICAgIFwiOTgyOVwiOiBcImhlYXJ0c3VpdDtcIixcbiAgICBcIjk4MzBcIjogXCJkaWFtcztcIixcbiAgICBcIjk4MzRcIjogXCJzdW5nO1wiLFxuICAgIFwiOTgzN1wiOiBcImZsYXQ7XCIsXG4gICAgXCI5ODM4XCI6IFwibmF0dXJhbDtcIixcbiAgICBcIjk4MzlcIjogXCJzaGFycDtcIixcbiAgICBcIjEwMDAzXCI6IFwiY2hlY2ttYXJrO1wiLFxuICAgIFwiMTAwMDdcIjogXCJjcm9zcztcIixcbiAgICBcIjEwMDE2XCI6IFwibWFsdGVzZTtcIixcbiAgICBcIjEwMDM4XCI6IFwic2V4dDtcIixcbiAgICBcIjEwMDcyXCI6IFwiVmVydGljYWxTZXBhcmF0b3I7XCIsXG4gICAgXCIxMDA5OFwiOiBcImxiYnJrO1wiLFxuICAgIFwiMTAwOTlcIjogXCJyYmJyaztcIixcbiAgICBcIjEwMTg0XCI6IFwiYnNvbGhzdWI7XCIsXG4gICAgXCIxMDE4NVwiOiBcInN1cGhzb2w7XCIsXG4gICAgXCIxMDIxNFwiOiBcImxvYnJrO1wiLFxuICAgIFwiMTAyMTVcIjogXCJyb2JyaztcIixcbiAgICBcIjEwMjE2XCI6IFwiTGVmdEFuZ2xlQnJhY2tldDtcIixcbiAgICBcIjEwMjE3XCI6IFwiUmlnaHRBbmdsZUJyYWNrZXQ7XCIsXG4gICAgXCIxMDIxOFwiOiBcIkxhbmc7XCIsXG4gICAgXCIxMDIxOVwiOiBcIlJhbmc7XCIsXG4gICAgXCIxMDIyMFwiOiBcImxvYW5nO1wiLFxuICAgIFwiMTAyMjFcIjogXCJyb2FuZztcIixcbiAgICBcIjEwMjI5XCI6IFwieGxhcnI7XCIsXG4gICAgXCIxMDIzMFwiOiBcInhyYXJyO1wiLFxuICAgIFwiMTAyMzFcIjogXCJ4aGFycjtcIixcbiAgICBcIjEwMjMyXCI6IFwieGxBcnI7XCIsXG4gICAgXCIxMDIzM1wiOiBcInhyQXJyO1wiLFxuICAgIFwiMTAyMzRcIjogXCJ4aEFycjtcIixcbiAgICBcIjEwMjM2XCI6IFwieG1hcDtcIixcbiAgICBcIjEwMjM5XCI6IFwiZHppZ3JhcnI7XCIsXG4gICAgXCIxMDQ5OFwiOiBcIm52bEFycjtcIixcbiAgICBcIjEwNDk5XCI6IFwibnZyQXJyO1wiLFxuICAgIFwiMTA1MDBcIjogXCJudkhhcnI7XCIsXG4gICAgXCIxMDUwMVwiOiBcIk1hcDtcIixcbiAgICBcIjEwNTA4XCI6IFwibGJhcnI7XCIsXG4gICAgXCIxMDUwOVwiOiBcInJiYXJyO1wiLFxuICAgIFwiMTA1MTBcIjogXCJsQmFycjtcIixcbiAgICBcIjEwNTExXCI6IFwickJhcnI7XCIsXG4gICAgXCIxMDUxMlwiOiBcIlJCYXJyO1wiLFxuICAgIFwiMTA1MTNcIjogXCJERG90cmFoZDtcIixcbiAgICBcIjEwNTE0XCI6IFwiVXBBcnJvd0JhcjtcIixcbiAgICBcIjEwNTE1XCI6IFwiRG93bkFycm93QmFyO1wiLFxuICAgIFwiMTA1MThcIjogXCJSYXJydGw7XCIsXG4gICAgXCIxMDUyMVwiOiBcImxhdGFpbDtcIixcbiAgICBcIjEwNTIyXCI6IFwicmF0YWlsO1wiLFxuICAgIFwiMTA1MjNcIjogXCJsQXRhaWw7XCIsXG4gICAgXCIxMDUyNFwiOiBcInJBdGFpbDtcIixcbiAgICBcIjEwNTI1XCI6IFwibGFycmZzO1wiLFxuICAgIFwiMTA1MjZcIjogXCJyYXJyZnM7XCIsXG4gICAgXCIxMDUyN1wiOiBcImxhcnJiZnM7XCIsXG4gICAgXCIxMDUyOFwiOiBcInJhcnJiZnM7XCIsXG4gICAgXCIxMDUzMVwiOiBcIm53YXJoaztcIixcbiAgICBcIjEwNTMyXCI6IFwibmVhcmhrO1wiLFxuICAgIFwiMTA1MzNcIjogXCJzZWFyaGs7XCIsXG4gICAgXCIxMDUzNFwiOiBcInN3YXJoaztcIixcbiAgICBcIjEwNTM1XCI6IFwibnduZWFyO1wiLFxuICAgIFwiMTA1MzZcIjogXCJ0b2VhO1wiLFxuICAgIFwiMTA1MzdcIjogXCJ0b3NhO1wiLFxuICAgIFwiMTA1MzhcIjogXCJzd253YXI7XCIsXG4gICAgXCIxMDU0N1wiOiBcInJhcnJjO1wiLFxuICAgIFwiMTA1NDlcIjogXCJjdWRhcnJyO1wiLFxuICAgIFwiMTA1NTBcIjogXCJsZGNhO1wiLFxuICAgIFwiMTA1NTFcIjogXCJyZGNhO1wiLFxuICAgIFwiMTA1NTJcIjogXCJjdWRhcnJsO1wiLFxuICAgIFwiMTA1NTNcIjogXCJsYXJycGw7XCIsXG4gICAgXCIxMDU1NlwiOiBcImN1cmFycm07XCIsXG4gICAgXCIxMDU1N1wiOiBcImN1bGFycnA7XCIsXG4gICAgXCIxMDU2NVwiOiBcInJhcnJwbDtcIixcbiAgICBcIjEwNTY4XCI6IFwiaGFycmNpcjtcIixcbiAgICBcIjEwNTY5XCI6IFwiVWFycm9jaXI7XCIsXG4gICAgXCIxMDU3MFwiOiBcImx1cmRzaGFyO1wiLFxuICAgIFwiMTA1NzFcIjogXCJsZHJ1c2hhcjtcIixcbiAgICBcIjEwNTc0XCI6IFwiTGVmdFJpZ2h0VmVjdG9yO1wiLFxuICAgIFwiMTA1NzVcIjogXCJSaWdodFVwRG93blZlY3RvcjtcIixcbiAgICBcIjEwNTc2XCI6IFwiRG93bkxlZnRSaWdodFZlY3RvcjtcIixcbiAgICBcIjEwNTc3XCI6IFwiTGVmdFVwRG93blZlY3RvcjtcIixcbiAgICBcIjEwNTc4XCI6IFwiTGVmdFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTc5XCI6IFwiUmlnaHRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MFwiOiBcIlJpZ2h0VXBWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MVwiOiBcIlJpZ2h0RG93blZlY3RvckJhcjtcIixcbiAgICBcIjEwNTgyXCI6IFwiRG93bkxlZnRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4M1wiOiBcIkRvd25SaWdodFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg0XCI6IFwiTGVmdFVwVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODVcIjogXCJMZWZ0RG93blZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg2XCI6IFwiTGVmdFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTg3XCI6IFwiUmlnaHRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4OFwiOiBcIlJpZ2h0VXBUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4OVwiOiBcIlJpZ2h0RG93blRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkwXCI6IFwiRG93bkxlZnRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MVwiOiBcIkRvd25SaWdodFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkyXCI6IFwiTGVmdFVwVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTNcIjogXCJMZWZ0RG93blRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTk0XCI6IFwibEhhcjtcIixcbiAgICBcIjEwNTk1XCI6IFwidUhhcjtcIixcbiAgICBcIjEwNTk2XCI6IFwickhhcjtcIixcbiAgICBcIjEwNTk3XCI6IFwiZEhhcjtcIixcbiAgICBcIjEwNTk4XCI6IFwibHVydWhhcjtcIixcbiAgICBcIjEwNTk5XCI6IFwibGRyZGhhcjtcIixcbiAgICBcIjEwNjAwXCI6IFwicnVsdWhhcjtcIixcbiAgICBcIjEwNjAxXCI6IFwicmRsZGhhcjtcIixcbiAgICBcIjEwNjAyXCI6IFwibGhhcnVsO1wiLFxuICAgIFwiMTA2MDNcIjogXCJsbGhhcmQ7XCIsXG4gICAgXCIxMDYwNFwiOiBcInJoYXJ1bDtcIixcbiAgICBcIjEwNjA1XCI6IFwibHJoYXJkO1wiLFxuICAgIFwiMTA2MDZcIjogXCJVcEVxdWlsaWJyaXVtO1wiLFxuICAgIFwiMTA2MDdcIjogXCJSZXZlcnNlVXBFcXVpbGlicml1bTtcIixcbiAgICBcIjEwNjA4XCI6IFwiUm91bmRJbXBsaWVzO1wiLFxuICAgIFwiMTA2MDlcIjogXCJlcmFycjtcIixcbiAgICBcIjEwNjEwXCI6IFwic2ltcmFycjtcIixcbiAgICBcIjEwNjExXCI6IFwibGFycnNpbTtcIixcbiAgICBcIjEwNjEyXCI6IFwicmFycnNpbTtcIixcbiAgICBcIjEwNjEzXCI6IFwicmFycmFwO1wiLFxuICAgIFwiMTA2MTRcIjogXCJsdGxhcnI7XCIsXG4gICAgXCIxMDYxNlwiOiBcImd0cmFycjtcIixcbiAgICBcIjEwNjE3XCI6IFwic3VicmFycjtcIixcbiAgICBcIjEwNjE5XCI6IFwic3VwbGFycjtcIixcbiAgICBcIjEwNjIwXCI6IFwibGZpc2h0O1wiLFxuICAgIFwiMTA2MjFcIjogXCJyZmlzaHQ7XCIsXG4gICAgXCIxMDYyMlwiOiBcInVmaXNodDtcIixcbiAgICBcIjEwNjIzXCI6IFwiZGZpc2h0O1wiLFxuICAgIFwiMTA2MjlcIjogXCJsb3BhcjtcIixcbiAgICBcIjEwNjMwXCI6IFwicm9wYXI7XCIsXG4gICAgXCIxMDYzNVwiOiBcImxicmtlO1wiLFxuICAgIFwiMTA2MzZcIjogXCJyYnJrZTtcIixcbiAgICBcIjEwNjM3XCI6IFwibGJya3NsdTtcIixcbiAgICBcIjEwNjM4XCI6IFwicmJya3NsZDtcIixcbiAgICBcIjEwNjM5XCI6IFwibGJya3NsZDtcIixcbiAgICBcIjEwNjQwXCI6IFwicmJya3NsdTtcIixcbiAgICBcIjEwNjQxXCI6IFwibGFuZ2Q7XCIsXG4gICAgXCIxMDY0MlwiOiBcInJhbmdkO1wiLFxuICAgIFwiMTA2NDNcIjogXCJscGFybHQ7XCIsXG4gICAgXCIxMDY0NFwiOiBcInJwYXJndDtcIixcbiAgICBcIjEwNjQ1XCI6IFwiZ3RsUGFyO1wiLFxuICAgIFwiMTA2NDZcIjogXCJsdHJQYXI7XCIsXG4gICAgXCIxMDY1MFwiOiBcInZ6aWd6YWc7XCIsXG4gICAgXCIxMDY1MlwiOiBcInZhbmdydDtcIixcbiAgICBcIjEwNjUzXCI6IFwiYW5ncnR2YmQ7XCIsXG4gICAgXCIxMDY2MFwiOiBcImFuZ2U7XCIsXG4gICAgXCIxMDY2MVwiOiBcInJhbmdlO1wiLFxuICAgIFwiMTA2NjJcIjogXCJkd2FuZ2xlO1wiLFxuICAgIFwiMTA2NjNcIjogXCJ1d2FuZ2xlO1wiLFxuICAgIFwiMTA2NjRcIjogXCJhbmdtc2RhYTtcIixcbiAgICBcIjEwNjY1XCI6IFwiYW5nbXNkYWI7XCIsXG4gICAgXCIxMDY2NlwiOiBcImFuZ21zZGFjO1wiLFxuICAgIFwiMTA2NjdcIjogXCJhbmdtc2RhZDtcIixcbiAgICBcIjEwNjY4XCI6IFwiYW5nbXNkYWU7XCIsXG4gICAgXCIxMDY2OVwiOiBcImFuZ21zZGFmO1wiLFxuICAgIFwiMTA2NzBcIjogXCJhbmdtc2RhZztcIixcbiAgICBcIjEwNjcxXCI6IFwiYW5nbXNkYWg7XCIsXG4gICAgXCIxMDY3MlwiOiBcImJlbXB0eXY7XCIsXG4gICAgXCIxMDY3M1wiOiBcImRlbXB0eXY7XCIsXG4gICAgXCIxMDY3NFwiOiBcImNlbXB0eXY7XCIsXG4gICAgXCIxMDY3NVwiOiBcInJhZW1wdHl2O1wiLFxuICAgIFwiMTA2NzZcIjogXCJsYWVtcHR5djtcIixcbiAgICBcIjEwNjc3XCI6IFwib2hiYXI7XCIsXG4gICAgXCIxMDY3OFwiOiBcIm9taWQ7XCIsXG4gICAgXCIxMDY3OVwiOiBcIm9wYXI7XCIsXG4gICAgXCIxMDY4MVwiOiBcIm9wZXJwO1wiLFxuICAgIFwiMTA2ODNcIjogXCJvbGNyb3NzO1wiLFxuICAgIFwiMTA2ODRcIjogXCJvZHNvbGQ7XCIsXG4gICAgXCIxMDY4NlwiOiBcIm9sY2lyO1wiLFxuICAgIFwiMTA2ODdcIjogXCJvZmNpcjtcIixcbiAgICBcIjEwNjg4XCI6IFwib2x0O1wiLFxuICAgIFwiMTA2ODlcIjogXCJvZ3Q7XCIsXG4gICAgXCIxMDY5MFwiOiBcImNpcnNjaXI7XCIsXG4gICAgXCIxMDY5MVwiOiBcImNpckU7XCIsXG4gICAgXCIxMDY5MlwiOiBcInNvbGI7XCIsXG4gICAgXCIxMDY5M1wiOiBcImJzb2xiO1wiLFxuICAgIFwiMTA2OTdcIjogXCJib3hib3g7XCIsXG4gICAgXCIxMDcwMVwiOiBcInRyaXNiO1wiLFxuICAgIFwiMTA3MDJcIjogXCJydHJpbHRyaTtcIixcbiAgICBcIjEwNzAzXCI6IFwiTGVmdFRyaWFuZ2xlQmFyO1wiLFxuICAgIFwiMTA3MDRcIjogXCJSaWdodFRyaWFuZ2xlQmFyO1wiLFxuICAgIFwiMTA3MTZcIjogXCJpaW5maW47XCIsXG4gICAgXCIxMDcxN1wiOiBcImluZmludGllO1wiLFxuICAgIFwiMTA3MThcIjogXCJudmluZmluO1wiLFxuICAgIFwiMTA3MjNcIjogXCJlcGFyc2w7XCIsXG4gICAgXCIxMDcyNFwiOiBcInNtZXBhcnNsO1wiLFxuICAgIFwiMTA3MjVcIjogXCJlcXZwYXJzbDtcIixcbiAgICBcIjEwNzMxXCI6IFwibG96ZjtcIixcbiAgICBcIjEwNzQwXCI6IFwiUnVsZURlbGF5ZWQ7XCIsXG4gICAgXCIxMDc0MlwiOiBcImRzb2w7XCIsXG4gICAgXCIxMDc1MlwiOiBcInhvZG90O1wiLFxuICAgIFwiMTA3NTNcIjogXCJ4b3BsdXM7XCIsXG4gICAgXCIxMDc1NFwiOiBcInhvdGltZTtcIixcbiAgICBcIjEwNzU2XCI6IFwieHVwbHVzO1wiLFxuICAgIFwiMTA3NThcIjogXCJ4c3FjdXA7XCIsXG4gICAgXCIxMDc2NFwiOiBcInFpbnQ7XCIsXG4gICAgXCIxMDc2NVwiOiBcImZwYXJ0aW50O1wiLFxuICAgIFwiMTA3NjhcIjogXCJjaXJmbmludDtcIixcbiAgICBcIjEwNzY5XCI6IFwiYXdpbnQ7XCIsXG4gICAgXCIxMDc3MFwiOiBcInJwcG9saW50O1wiLFxuICAgIFwiMTA3NzFcIjogXCJzY3BvbGludDtcIixcbiAgICBcIjEwNzcyXCI6IFwibnBvbGludDtcIixcbiAgICBcIjEwNzczXCI6IFwicG9pbnRpbnQ7XCIsXG4gICAgXCIxMDc3NFwiOiBcInF1YXRpbnQ7XCIsXG4gICAgXCIxMDc3NVwiOiBcImludGxhcmhrO1wiLFxuICAgIFwiMTA3ODZcIjogXCJwbHVzY2lyO1wiLFxuICAgIFwiMTA3ODdcIjogXCJwbHVzYWNpcjtcIixcbiAgICBcIjEwNzg4XCI6IFwic2ltcGx1cztcIixcbiAgICBcIjEwNzg5XCI6IFwicGx1c2R1O1wiLFxuICAgIFwiMTA3OTBcIjogXCJwbHVzc2ltO1wiLFxuICAgIFwiMTA3OTFcIjogXCJwbHVzdHdvO1wiLFxuICAgIFwiMTA3OTNcIjogXCJtY29tbWE7XCIsXG4gICAgXCIxMDc5NFwiOiBcIm1pbnVzZHU7XCIsXG4gICAgXCIxMDc5N1wiOiBcImxvcGx1cztcIixcbiAgICBcIjEwNzk4XCI6IFwicm9wbHVzO1wiLFxuICAgIFwiMTA3OTlcIjogXCJDcm9zcztcIixcbiAgICBcIjEwODAwXCI6IFwidGltZXNkO1wiLFxuICAgIFwiMTA4MDFcIjogXCJ0aW1lc2JhcjtcIixcbiAgICBcIjEwODAzXCI6IFwic21hc2hwO1wiLFxuICAgIFwiMTA4MDRcIjogXCJsb3RpbWVzO1wiLFxuICAgIFwiMTA4MDVcIjogXCJyb3RpbWVzO1wiLFxuICAgIFwiMTA4MDZcIjogXCJvdGltZXNhcztcIixcbiAgICBcIjEwODA3XCI6IFwiT3RpbWVzO1wiLFxuICAgIFwiMTA4MDhcIjogXCJvZGl2O1wiLFxuICAgIFwiMTA4MDlcIjogXCJ0cmlwbHVzO1wiLFxuICAgIFwiMTA4MTBcIjogXCJ0cmltaW51cztcIixcbiAgICBcIjEwODExXCI6IFwidHJpdGltZTtcIixcbiAgICBcIjEwODEyXCI6IFwiaXByb2Q7XCIsXG4gICAgXCIxMDgxNVwiOiBcImFtYWxnO1wiLFxuICAgIFwiMTA4MTZcIjogXCJjYXBkb3Q7XCIsXG4gICAgXCIxMDgxOFwiOiBcIm5jdXA7XCIsXG4gICAgXCIxMDgxOVwiOiBcIm5jYXA7XCIsXG4gICAgXCIxMDgyMFwiOiBcImNhcGFuZDtcIixcbiAgICBcIjEwODIxXCI6IFwiY3Vwb3I7XCIsXG4gICAgXCIxMDgyMlwiOiBcImN1cGNhcDtcIixcbiAgICBcIjEwODIzXCI6IFwiY2FwY3VwO1wiLFxuICAgIFwiMTA4MjRcIjogXCJjdXBicmNhcDtcIixcbiAgICBcIjEwODI1XCI6IFwiY2FwYnJjdXA7XCIsXG4gICAgXCIxMDgyNlwiOiBcImN1cGN1cDtcIixcbiAgICBcIjEwODI3XCI6IFwiY2FwY2FwO1wiLFxuICAgIFwiMTA4MjhcIjogXCJjY3VwcztcIixcbiAgICBcIjEwODI5XCI6IFwiY2NhcHM7XCIsXG4gICAgXCIxMDgzMlwiOiBcImNjdXBzc207XCIsXG4gICAgXCIxMDgzNVwiOiBcIkFuZDtcIixcbiAgICBcIjEwODM2XCI6IFwiT3I7XCIsXG4gICAgXCIxMDgzN1wiOiBcImFuZGFuZDtcIixcbiAgICBcIjEwODM4XCI6IFwib3JvcjtcIixcbiAgICBcIjEwODM5XCI6IFwib3JzbG9wZTtcIixcbiAgICBcIjEwODQwXCI6IFwiYW5kc2xvcGU7XCIsXG4gICAgXCIxMDg0MlwiOiBcImFuZHY7XCIsXG4gICAgXCIxMDg0M1wiOiBcIm9ydjtcIixcbiAgICBcIjEwODQ0XCI6IFwiYW5kZDtcIixcbiAgICBcIjEwODQ1XCI6IFwib3JkO1wiLFxuICAgIFwiMTA4NDdcIjogXCJ3ZWRiYXI7XCIsXG4gICAgXCIxMDg1NFwiOiBcInNkb3RlO1wiLFxuICAgIFwiMTA4NThcIjogXCJzaW1kb3Q7XCIsXG4gICAgXCIxMDg2MVwiOiBcImNvbmdkb3Q7XCIsXG4gICAgXCIxMDg2MlwiOiBcImVhc3RlcjtcIixcbiAgICBcIjEwODYzXCI6IFwiYXBhY2lyO1wiLFxuICAgIFwiMTA4NjRcIjogXCJhcEU7XCIsXG4gICAgXCIxMDg2NVwiOiBcImVwbHVzO1wiLFxuICAgIFwiMTA4NjZcIjogXCJwbHVzZTtcIixcbiAgICBcIjEwODY3XCI6IFwiRXNpbTtcIixcbiAgICBcIjEwODY4XCI6IFwiQ29sb25lO1wiLFxuICAgIFwiMTA4NjlcIjogXCJFcXVhbDtcIixcbiAgICBcIjEwODcxXCI6IFwiZUREb3Q7XCIsXG4gICAgXCIxMDg3MlwiOiBcImVxdWl2REQ7XCIsXG4gICAgXCIxMDg3M1wiOiBcImx0Y2lyO1wiLFxuICAgIFwiMTA4NzRcIjogXCJndGNpcjtcIixcbiAgICBcIjEwODc1XCI6IFwibHRxdWVzdDtcIixcbiAgICBcIjEwODc2XCI6IFwiZ3RxdWVzdDtcIixcbiAgICBcIjEwODc3XCI6IFwiTGVzc1NsYW50RXF1YWw7XCIsXG4gICAgXCIxMDg3OFwiOiBcIkdyZWF0ZXJTbGFudEVxdWFsO1wiLFxuICAgIFwiMTA4NzlcIjogXCJsZXNkb3Q7XCIsXG4gICAgXCIxMDg4MFwiOiBcImdlc2RvdDtcIixcbiAgICBcIjEwODgxXCI6IFwibGVzZG90bztcIixcbiAgICBcIjEwODgyXCI6IFwiZ2VzZG90bztcIixcbiAgICBcIjEwODgzXCI6IFwibGVzZG90b3I7XCIsXG4gICAgXCIxMDg4NFwiOiBcImdlc2RvdG9sO1wiLFxuICAgIFwiMTA4ODVcIjogXCJsZXNzYXBwcm94O1wiLFxuICAgIFwiMTA4ODZcIjogXCJndHJhcHByb3g7XCIsXG4gICAgXCIxMDg4N1wiOiBcImxuZXE7XCIsXG4gICAgXCIxMDg4OFwiOiBcImduZXE7XCIsXG4gICAgXCIxMDg4OVwiOiBcImxuYXBwcm94O1wiLFxuICAgIFwiMTA4OTBcIjogXCJnbmFwcHJveDtcIixcbiAgICBcIjEwODkxXCI6IFwibGVzc2VxcWd0cjtcIixcbiAgICBcIjEwODkyXCI6IFwiZ3RyZXFxbGVzcztcIixcbiAgICBcIjEwODkzXCI6IFwibHNpbWU7XCIsXG4gICAgXCIxMDg5NFwiOiBcImdzaW1lO1wiLFxuICAgIFwiMTA4OTVcIjogXCJsc2ltZztcIixcbiAgICBcIjEwODk2XCI6IFwiZ3NpbWw7XCIsXG4gICAgXCIxMDg5N1wiOiBcImxnRTtcIixcbiAgICBcIjEwODk4XCI6IFwiZ2xFO1wiLFxuICAgIFwiMTA4OTlcIjogXCJsZXNnZXM7XCIsXG4gICAgXCIxMDkwMFwiOiBcImdlc2xlcztcIixcbiAgICBcIjEwOTAxXCI6IFwiZXFzbGFudGxlc3M7XCIsXG4gICAgXCIxMDkwMlwiOiBcImVxc2xhbnRndHI7XCIsXG4gICAgXCIxMDkwM1wiOiBcImVsc2RvdDtcIixcbiAgICBcIjEwOTA0XCI6IFwiZWdzZG90O1wiLFxuICAgIFwiMTA5MDVcIjogXCJlbDtcIixcbiAgICBcIjEwOTA2XCI6IFwiZWc7XCIsXG4gICAgXCIxMDkwOVwiOiBcInNpbWw7XCIsXG4gICAgXCIxMDkxMFwiOiBcInNpbWc7XCIsXG4gICAgXCIxMDkxMVwiOiBcInNpbWxFO1wiLFxuICAgIFwiMTA5MTJcIjogXCJzaW1nRTtcIixcbiAgICBcIjEwOTEzXCI6IFwiTGVzc0xlc3M7XCIsXG4gICAgXCIxMDkxNFwiOiBcIkdyZWF0ZXJHcmVhdGVyO1wiLFxuICAgIFwiMTA5MTZcIjogXCJnbGo7XCIsXG4gICAgXCIxMDkxN1wiOiBcImdsYTtcIixcbiAgICBcIjEwOTE4XCI6IFwibHRjYztcIixcbiAgICBcIjEwOTE5XCI6IFwiZ3RjYztcIixcbiAgICBcIjEwOTIwXCI6IFwibGVzY2M7XCIsXG4gICAgXCIxMDkyMVwiOiBcImdlc2NjO1wiLFxuICAgIFwiMTA5MjJcIjogXCJzbXQ7XCIsXG4gICAgXCIxMDkyM1wiOiBcImxhdDtcIixcbiAgICBcIjEwOTI0XCI6IFwic210ZTtcIixcbiAgICBcIjEwOTI1XCI6IFwibGF0ZTtcIixcbiAgICBcIjEwOTI2XCI6IFwiYnVtcEU7XCIsXG4gICAgXCIxMDkyN1wiOiBcInByZWNlcTtcIixcbiAgICBcIjEwOTI4XCI6IFwic3VjY2VxO1wiLFxuICAgIFwiMTA5MzFcIjogXCJwckU7XCIsXG4gICAgXCIxMDkzMlwiOiBcInNjRTtcIixcbiAgICBcIjEwOTMzXCI6IFwicHJuRTtcIixcbiAgICBcIjEwOTM0XCI6IFwic3VjY25lcXE7XCIsXG4gICAgXCIxMDkzNVwiOiBcInByZWNhcHByb3g7XCIsXG4gICAgXCIxMDkzNlwiOiBcInN1Y2NhcHByb3g7XCIsXG4gICAgXCIxMDkzN1wiOiBcInBybmFwO1wiLFxuICAgIFwiMTA5MzhcIjogXCJzdWNjbmFwcHJveDtcIixcbiAgICBcIjEwOTM5XCI6IFwiUHI7XCIsXG4gICAgXCIxMDk0MFwiOiBcIlNjO1wiLFxuICAgIFwiMTA5NDFcIjogXCJzdWJkb3Q7XCIsXG4gICAgXCIxMDk0MlwiOiBcInN1cGRvdDtcIixcbiAgICBcIjEwOTQzXCI6IFwic3VicGx1cztcIixcbiAgICBcIjEwOTQ0XCI6IFwic3VwcGx1cztcIixcbiAgICBcIjEwOTQ1XCI6IFwic3VibXVsdDtcIixcbiAgICBcIjEwOTQ2XCI6IFwic3VwbXVsdDtcIixcbiAgICBcIjEwOTQ3XCI6IFwic3ViZWRvdDtcIixcbiAgICBcIjEwOTQ4XCI6IFwic3VwZWRvdDtcIixcbiAgICBcIjEwOTQ5XCI6IFwic3Vic2V0ZXFxO1wiLFxuICAgIFwiMTA5NTBcIjogXCJzdXBzZXRlcXE7XCIsXG4gICAgXCIxMDk1MVwiOiBcInN1YnNpbTtcIixcbiAgICBcIjEwOTUyXCI6IFwic3Vwc2ltO1wiLFxuICAgIFwiMTA5NTVcIjogXCJzdWJzZXRuZXFxO1wiLFxuICAgIFwiMTA5NTZcIjogXCJzdXBzZXRuZXFxO1wiLFxuICAgIFwiMTA5NTlcIjogXCJjc3ViO1wiLFxuICAgIFwiMTA5NjBcIjogXCJjc3VwO1wiLFxuICAgIFwiMTA5NjFcIjogXCJjc3ViZTtcIixcbiAgICBcIjEwOTYyXCI6IFwiY3N1cGU7XCIsXG4gICAgXCIxMDk2M1wiOiBcInN1YnN1cDtcIixcbiAgICBcIjEwOTY0XCI6IFwic3Vwc3ViO1wiLFxuICAgIFwiMTA5NjVcIjogXCJzdWJzdWI7XCIsXG4gICAgXCIxMDk2NlwiOiBcInN1cHN1cDtcIixcbiAgICBcIjEwOTY3XCI6IFwic3VwaHN1YjtcIixcbiAgICBcIjEwOTY4XCI6IFwic3VwZHN1YjtcIixcbiAgICBcIjEwOTY5XCI6IFwiZm9ya3Y7XCIsXG4gICAgXCIxMDk3MFwiOiBcInRvcGZvcms7XCIsXG4gICAgXCIxMDk3MVwiOiBcIm1sY3A7XCIsXG4gICAgXCIxMDk4MFwiOiBcIkRvdWJsZUxlZnRUZWU7XCIsXG4gICAgXCIxMDk4MlwiOiBcIlZkYXNobDtcIixcbiAgICBcIjEwOTgzXCI6IFwiQmFydjtcIixcbiAgICBcIjEwOTg0XCI6IFwidkJhcjtcIixcbiAgICBcIjEwOTg1XCI6IFwidkJhcnY7XCIsXG4gICAgXCIxMDk4N1wiOiBcIlZiYXI7XCIsXG4gICAgXCIxMDk4OFwiOiBcIk5vdDtcIixcbiAgICBcIjEwOTg5XCI6IFwiYk5vdDtcIixcbiAgICBcIjEwOTkwXCI6IFwicm5taWQ7XCIsXG4gICAgXCIxMDk5MVwiOiBcImNpcm1pZDtcIixcbiAgICBcIjEwOTkyXCI6IFwibWlkY2lyO1wiLFxuICAgIFwiMTA5OTNcIjogXCJ0b3BjaXI7XCIsXG4gICAgXCIxMDk5NFwiOiBcIm5ocGFyO1wiLFxuICAgIFwiMTA5OTVcIjogXCJwYXJzaW07XCIsXG4gICAgXCIxMTAwNVwiOiBcInBhcnNsO1wiLFxuICAgIFwiNjQyNTZcIjogXCJmZmxpZztcIixcbiAgICBcIjY0MjU3XCI6IFwiZmlsaWc7XCIsXG4gICAgXCI2NDI1OFwiOiBcImZsbGlnO1wiLFxuICAgIFwiNjQyNTlcIjogXCJmZmlsaWc7XCIsXG4gICAgXCI2NDI2MFwiOiBcImZmbGxpZztcIlxufSIsIkFuYWx5dGljcyAgICA9IHJlcXVpcmUgJy4vdXRpbHMvQW5hbHl0aWNzJ1xuQXV0aE1hbmFnZXIgID0gcmVxdWlyZSAnLi91dGlscy9BdXRoTWFuYWdlcidcblNoYXJlICAgICAgICA9IHJlcXVpcmUgJy4vdXRpbHMvU2hhcmUnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi91dGlscy9Hb29nbGVQbHVzJ1xuVGVtcGxhdGVzICAgID0gcmVxdWlyZSAnLi9kYXRhL1RlbXBsYXRlcydcbkxvY2FsZSAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9Mb2NhbGUnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9Sb3V0ZXInXG5OYXYgICAgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9OYXYnXG5BcHBEYXRhICAgICAgPSByZXF1aXJlICcuL0FwcERhdGEnXG5BcHBWaWV3ICAgICAgPSByZXF1aXJlICcuL0FwcFZpZXcnXG5NZWRpYVF1ZXJpZXMgPSByZXF1aXJlICcuL3V0aWxzL01lZGlhUXVlcmllcydcblxuY2xhc3MgQXBwXG5cbiAgICBMSVZFICAgICAgIDogbnVsbFxuICAgIEJBU0VfVVJMICAgOiB3aW5kb3cuY29uZmlnLmhvc3RuYW1lXG4gICAgbG9jYWxlQ29kZSA6IHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuICAgIG9ialJlYWR5ICAgOiAwXG5cbiAgICBfdG9DbGVhbiAgIDogWydvYmpSZWFkeScsICdzZXRGbGFncycsICdvYmplY3RDb21wbGV0ZScsICdpbml0JywgJ2luaXRPYmplY3RzJywgJ2luaXRTREtzJywgJ2luaXRBcHAnLCAnZ28nLCAnY2xlYW51cCcsICdfdG9DbGVhbiddXG5cbiAgICBjb25zdHJ1Y3RvciA6IChATElWRSkgLT5cblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgc2V0RmxhZ3MgOiA9PlxuXG4gICAgICAgIHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5zZXR1cCgpO1xuXG4gICAgICAgIEBJU19BTkRST0lEICAgID0gdWEuaW5kZXhPZignYW5kcm9pZCcpID4gLTFcbiAgICAgICAgQElTX0ZJUkVGT1ggICAgPSB1YS5pbmRleE9mKCdmaXJlZm94JykgPiAtMVxuICAgICAgICBASVNfQ0hST01FX0lPUyA9IGlmIHVhLm1hdGNoKCdjcmlvcycpIHRoZW4gdHJ1ZSBlbHNlIGZhbHNlICMgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTM4MDgwNTNcblxuICAgICAgICBudWxsXG5cbiAgICBpc01vYmlsZSA6ID0+XG5cbiAgICAgICAgcmV0dXJuIEBJU19JT1Mgb3IgQElTX0FORFJPSURcblxuICAgIG9iamVjdENvbXBsZXRlIDogPT5cblxuICAgICAgICBAb2JqUmVhZHkrK1xuICAgICAgICBAaW5pdEFwcCgpIGlmIEBvYmpSZWFkeSA+PSA0XG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdCA6ID0+XG5cbiAgICAgICAgQGluaXRPYmplY3RzKClcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0T2JqZWN0cyA6ID0+XG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXMgXCIvZGF0YS90ZW1wbGF0ZXMjeyhpZiBATElWRSB0aGVuICcubWluJyBlbHNlICcnKX0ueG1sXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAbG9jYWxlICAgID0gbmV3IExvY2FsZSBcIi9kYXRhL2xvY2FsZXMvc3RyaW5ncy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYW5hbHl0aWNzID0gbmV3IEFuYWx5dGljcyBcIi9kYXRhL3RyYWNraW5nLmpzb25cIiwgQG9iamVjdENvbXBsZXRlXG4gICAgICAgIEBhcHBEYXRhICAgPSBuZXcgQXBwRGF0YSBAb2JqZWN0Q29tcGxldGVcblxuICAgICAgICAjIGlmIG5ldyBvYmplY3RzIGFyZSBhZGRlZCBkb24ndCBmb3JnZXQgdG8gY2hhbmdlIHRoZSBgQG9iamVjdENvbXBsZXRlYCBmdW5jdGlvblxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXRTREtzIDogPT5cblxuICAgICAgICBGYWNlYm9vay5sb2FkKClcbiAgICAgICAgR29vZ2xlUGx1cy5sb2FkKClcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0QXBwIDogPT5cblxuICAgICAgICBAc2V0RmxhZ3MoKVxuXG4gICAgICAgICMjIyBTdGFydHMgYXBwbGljYXRpb24gIyMjXG4gICAgICAgIEBhcHBWaWV3ID0gbmV3IEFwcFZpZXdcbiAgICAgICAgQHJvdXRlciAgPSBuZXcgUm91dGVyXG4gICAgICAgIEBuYXYgICAgID0gbmV3IE5hdlxuICAgICAgICBAYXV0aCAgICA9IG5ldyBBdXRoTWFuYWdlclxuICAgICAgICBAc2hhcmUgICA9IG5ldyBTaGFyZVxuXG4gICAgICAgIEBnbygpXG5cbiAgICAgICAgQGluaXRTREtzKClcblxuICAgICAgICBudWxsXG5cbiAgICBnbyA6ID0+XG5cbiAgICAgICAgIyMjIEFmdGVyIGV2ZXJ5dGhpbmcgaXMgbG9hZGVkLCBraWNrcyBvZmYgd2Vic2l0ZSAjIyNcbiAgICAgICAgQGFwcFZpZXcucmVuZGVyKClcblxuICAgICAgICAjIyMgcmVtb3ZlIHJlZHVuZGFudCBpbml0aWFsaXNhdGlvbiBtZXRob2RzIC8gcHJvcGVydGllcyAjIyNcbiAgICAgICAgQGNsZWFudXAoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGNsZWFudXAgOiA9PlxuXG4gICAgICAgIGZvciBmbiBpbiBAX3RvQ2xlYW5cbiAgICAgICAgICAgIEBbZm5dID0gbnVsbFxuICAgICAgICAgICAgZGVsZXRlIEBbZm5dXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxuIiwiQWJzdHJhY3REYXRhICAgICAgPSByZXF1aXJlICcuL2RhdGEvQWJzdHJhY3REYXRhJ1xuUmVxdWVzdGVyICAgICAgICAgPSByZXF1aXJlICcuL3V0aWxzL1JlcXVlc3RlcidcbkFQSSAgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0FQSSdcbkRvb2RsZXNDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi9jb2xsZWN0aW9ucy9kb29kbGVzL0Rvb2RsZXNDb2xsZWN0aW9uJ1xuXG5jbGFzcyBBcHBEYXRhIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cbiAgICBjYWxsYmFjayA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKEBjYWxsYmFjaykgLT5cblxuICAgICAgICAjIyNcblxuICAgICAgICBhZGQgYWxsIGRhdGEgY2xhc3NlcyBoZXJlXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIEBkb29kbGVzID0gbmV3IERvb2RsZXNDb2xsZWN0aW9uXG5cbiAgICAgICAgQGdldFN0YXJ0RGF0YSgpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgICMjI1xuICAgIGdldCBhcHAgYm9vdHN0cmFwIGRhdGEgLSBlbWJlZCBpbiBIVE1MIG9yIEFQSSBlbmRwb2ludFxuICAgICMjI1xuICAgIGdldFN0YXJ0RGF0YSA6ID0+XG4gICAgICAgIFxuICAgICAgICAjIGlmIEFQSS5nZXQoJ3N0YXJ0JylcbiAgICAgICAgaWYgdHJ1ZVxuXG4gICAgICAgICAgICByID0gUmVxdWVzdGVyLnJlcXVlc3RcbiAgICAgICAgICAgICAgICAjIHVybCAgOiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgICAgICAgICAgdXJsICA6IEBDRCgpLkJBU0VfVVJMICsgJy9kYXRhL19EVU1NWS9kb29kbGVzLmpzb24nXG4gICAgICAgICAgICAgICAgdHlwZSA6ICdHRVQnXG5cbiAgICAgICAgICAgIHIuZG9uZSBAb25TdGFydERhdGFSZWNlaXZlZFxuICAgICAgICAgICAgci5mYWlsID0+XG5cbiAgICAgICAgICAgICAgICAjIGNvbnNvbGUuZXJyb3IgXCJlcnJvciBsb2FkaW5nIGFwaSBzdGFydCBkYXRhXCJcblxuICAgICAgICAgICAgICAgICMjI1xuICAgICAgICAgICAgICAgIHRoaXMgaXMgb25seSB0ZW1wb3JhcnksIHdoaWxlIHRoZXJlIGlzIG5vIGJvb3RzdHJhcCBkYXRhIGhlcmUsIG5vcm1hbGx5IHdvdWxkIGhhbmRsZSBlcnJvciAvIGZhaWxcbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uU3RhcnREYXRhUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIm9uU3RhcnREYXRhUmVjZWl2ZWQgOiAoZGF0YSkgPT5cIiwgZGF0YVxuXG4gICAgICAgIHRvQWRkID0gW11cbiAgICAgICAgKHRvQWRkID0gdG9BZGQuY29uY2F0IGRhdGEuZG9vZGxlcykgZm9yIGkgaW4gWzAuLi41XVxuXG4gICAgICAgIEBkb29kbGVzLmFkZCB0b0FkZFxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJvb3RzdHJhcCBkYXRhIHJlY2VpdmVkLCBhcHAgcmVhZHkgdG8gZ29cblxuICAgICAgICAjIyNcblxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwRGF0YVxuIiwiQWJzdHJhY3RWaWV3ICAgICA9IHJlcXVpcmUgJy4vdmlldy9BYnN0cmFjdFZpZXcnXG5QcmVsb2FkZXIgICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUHJlbG9hZGVyJ1xuSGVhZGVyICAgICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0hlYWRlcidcbldyYXBwZXIgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9XcmFwcGVyJ1xuRm9vdGVyICAgICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0Zvb3RlcidcblBhZ2VUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9QYWdlVHJhbnNpdGlvbmVyJ1xuTW9kYWxNYW5hZ2VyICAgICA9IHJlcXVpcmUgJy4vdmlldy9tb2RhbHMvX01vZGFsTWFuYWdlcidcblxuY2xhc3MgQXBwVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnbWFpbidcblxuICAgICR3aW5kb3cgIDogbnVsbFxuICAgICRib2R5ICAgIDogbnVsbFxuXG4gICAgd3JhcHBlciAgOiBudWxsXG4gICAgZm9vdGVyICAgOiBudWxsXG5cbiAgICBkaW1zIDpcbiAgICAgICAgdyA6IG51bGxcbiAgICAgICAgaCA6IG51bGxcbiAgICAgICAgbyA6IG51bGxcbiAgICAgICAgdXBkYXRlTW9iaWxlIDogdHJ1ZVxuICAgICAgICBsYXN0SGVpZ2h0ICAgOiBudWxsXG5cbiAgICBsYXN0U2Nyb2xsWSA6IDBcbiAgICB0aWNraW5nICAgICA6IGZhbHNlXG5cbiAgICBFVkVOVF9VUERBVEVfRElNRU5TSU9OUyA6ICdFVkVOVF9VUERBVEVfRElNRU5TSU9OUydcbiAgICBFVkVOVF9QUkVMT0FERVJfSElERSAgICA6ICdFVkVOVF9QUkVMT0FERVJfSElERSdcbiAgICBFVkVOVF9PTl9TQ1JPTEwgICAgICAgICA6ICdFVkVOVF9PTl9TQ1JPTEwnXG5cbiAgICBNT0JJTEVfV0lEVEggOiA3MDBcbiAgICBNT0JJTEUgICAgICAgOiAnbW9iaWxlJ1xuICAgIE5PTl9NT0JJTEUgICA6ICdub25fbW9iaWxlJ1xuXG4gICAgY29uc3RydWN0b3IgOiAtPlxuXG4gICAgICAgIEAkd2luZG93ID0gJCh3aW5kb3cpXG4gICAgICAgIEAkYm9keSAgID0gJCgnYm9keScpLmVxKDApXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgZGlzYWJsZVRvdWNoOiA9PlxuXG4gICAgICAgIEAkd2luZG93Lm9uICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcblxuICAgICAgICBudWxsXG5cbiAgICBlbmFibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vZmYgJ3RvdWNobW92ZScsIEBvblRvdWNoTW92ZVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uVG91Y2hNb3ZlOiAoIGUgKSAtPlxuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIHJlbmRlciA6ID0+XG5cbiAgICAgICAgQGJpbmRFdmVudHMoKVxuXG4gICAgICAgIEBwcmVsb2FkZXIgICAgPSBuZXcgUHJlbG9hZGVyXG4gICAgICAgIEBtb2RhbE1hbmFnZXIgPSBuZXcgTW9kYWxNYW5hZ2VyXG5cbiAgICAgICAgQGhlYWRlciAgICAgICA9IG5ldyBIZWFkZXJcbiAgICAgICAgQHdyYXBwZXIgICAgICA9IG5ldyBXcmFwcGVyXG4gICAgICAgIEBmb290ZXIgICAgICAgPSBuZXcgRm9vdGVyXG4gICAgICAgIEB0cmFuc2l0aW9uZXIgPSBuZXcgUGFnZVRyYW5zaXRpb25lclxuXG4gICAgICAgIEBcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAaGVhZGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQHdyYXBwZXJcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAZm9vdGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQHRyYW5zaXRpb25lclxuXG4gICAgICAgIEBvbkFsbFJlbmRlcmVkKClcblxuICAgICAgICBudWxsXG5cbiAgICBiaW5kRXZlbnRzIDogPT5cblxuICAgICAgICBAb24gJ2FsbFJlbmRlcmVkJywgQG9uQWxsUmVuZGVyZWRcblxuICAgICAgICBAb25SZXNpemUoKVxuXG4gICAgICAgIEBvblJlc2l6ZSA9IF8uZGVib3VuY2UgQG9uUmVzaXplLCAzMDBcbiAgICAgICAgQCR3aW5kb3cub24gJ3Jlc2l6ZSBvcmllbnRhdGlvbmNoYW5nZScsIEBvblJlc2l6ZVxuICAgICAgICBAJHdpbmRvdy5vbiBcInNjcm9sbFwiLCBAb25TY3JvbGxcblxuICAgICAgICBAJGJvZHkub24gJ2NsaWNrJywgJ2EnLCBAbGlua01hbmFnZXJcblxuICAgICAgICBudWxsXG5cbiAgICBvblNjcm9sbCA6ID0+XG5cbiAgICAgICAgQGxhc3RTY3JvbGxZID0gd2luZG93LnNjcm9sbFlcbiAgICAgICAgQHJlcXVlc3RUaWNrKClcblxuICAgICAgICBudWxsXG5cbiAgICByZXF1ZXN0VGljayA6ID0+XG5cbiAgICAgICAgaWYgIUB0aWNraW5nXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgQHNjcm9sbFVwZGF0ZVxuICAgICAgICAgICAgQHRpY2tpbmcgPSB0cnVlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2Nyb2xsVXBkYXRlIDogPT5cblxuICAgICAgICBAdGlja2luZyA9IGZhbHNlXG5cbiAgICAgICAgQCRib2R5LmFkZENsYXNzKCdkaXNhYmxlLWhvdmVyJylcblxuICAgICAgICBjbGVhclRpbWVvdXQgQHRpbWVyU2Nyb2xsXG5cbiAgICAgICAgQHRpbWVyU2Nyb2xsID0gc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgQCRib2R5LnJlbW92ZUNsYXNzKCdkaXNhYmxlLWhvdmVyJylcbiAgICAgICAgLCA1MFxuXG4gICAgICAgIEB0cmlnZ2VyIEBFVkVOVF9PTl9TQ1JPTExcblxuICAgICAgICBudWxsXG5cbiAgICBvbkFsbFJlbmRlcmVkIDogPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwib25BbGxSZW5kZXJlZCA6ID0+XCJcblxuICAgICAgICBAJGJvZHkucHJlcGVuZCBAJGVsXG5cbiAgICAgICAgQHByZWxvYWRlci5wbGF5SW50cm9BbmltYXRpb24gPT4gQHRyaWdnZXIgQEVWRU5UX1BSRUxPQURFUl9ISURFXG5cbiAgICAgICAgQGJlZ2luKClcblxuICAgICAgICBudWxsXG5cbiAgICBiZWdpbiA6ID0+XG5cbiAgICAgICAgQHRyaWdnZXIgJ3N0YXJ0J1xuXG4gICAgICAgIEBDRCgpLnJvdXRlci5zdGFydCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25SZXNpemUgOiA9PlxuXG4gICAgICAgIEBnZXREaW1zKClcblxuICAgICAgICBudWxsXG5cbiAgICBnZXREaW1zIDogPT5cblxuICAgICAgICB3ID0gd2luZG93LmlubmVyV2lkdGggb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIG9yIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgICAgICAgaCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0XG5cbiAgICAgICAgY2hhbmdlID0gaCAvIEBkaW1zLmxhc3RIZWlnaHRcblxuICAgICAgICBAZGltcyA9XG4gICAgICAgICAgICB3IDogd1xuICAgICAgICAgICAgaCA6IGhcbiAgICAgICAgICAgIG8gOiBpZiBoID4gdyB0aGVuICdwb3J0cmFpdCcgZWxzZSAnbGFuZHNjYXBlJ1xuICAgICAgICAgICAgdXBkYXRlTW9iaWxlIDogIUBDRCgpLmlzTW9iaWxlKCkgb3IgY2hhbmdlIDwgMC44IG9yIGNoYW5nZSA+IDEuMlxuICAgICAgICAgICAgbGFzdEhlaWdodCAgIDogaFxuXG4gICAgICAgIEB0cmlnZ2VyIEBFVkVOVF9VUERBVEVfRElNRU5TSU9OUywgQGRpbXNcblxuICAgICAgICBudWxsXG5cbiAgICBsaW5rTWFuYWdlciA6IChlKSA9PlxuXG4gICAgICAgIGhyZWYgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaHJlZicpXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBocmVmXG5cbiAgICAgICAgQG5hdmlnYXRlVG9VcmwgaHJlZiwgZVxuXG4gICAgICAgIG51bGxcblxuICAgIG5hdmlnYXRlVG9VcmwgOiAoIGhyZWYsIGUgPSBudWxsICkgPT5cblxuICAgICAgICByb3V0ZSAgID0gaWYgaHJlZi5tYXRjaChAQ0QoKS5CQVNFX1VSTCkgdGhlbiBocmVmLnNwbGl0KEBDRCgpLkJBU0VfVVJMKVsxXSBlbHNlIGhyZWZcbiAgICAgICAgc2VjdGlvbiA9IGlmIHJvdXRlLmNoYXJBdCgwKSBpcyAnLycgdGhlbiByb3V0ZS5zcGxpdCgnLycpWzFdLnNwbGl0KCcvJylbMF0gZWxzZSByb3V0ZS5zcGxpdCgnLycpWzBdXG5cbiAgICAgICAgaWYgQENEKCkubmF2LmdldFNlY3Rpb24gc2VjdGlvblxuICAgICAgICAgICAgZT8ucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgQENEKCkucm91dGVyLm5hdmlnYXRlVG8gcm91dGVcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIEBoYW5kbGVFeHRlcm5hbExpbmsgaHJlZlxuXG4gICAgICAgIG51bGxcblxuICAgIGhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PlxuXG4gICAgICAgIGNvbnNvbGUubG9nIFwiaGFuZGxlRXh0ZXJuYWxMaW5rIDogKGRhdGEpID0+IFwiXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYmluZCB0cmFja2luZyBldmVudHMgaWYgbmVjZXNzYXJ5XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXdcbiIsImNsYXNzIEFic3RyYWN0Q29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb25cblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RDb2xsZWN0aW9uXG4iLCJBYnN0cmFjdENvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9BYnN0cmFjdENvbGxlY3Rpb24nXG5Db250cmlidXRvck1vZGVsICAgPSByZXF1aXJlICcuLi8uLi9tb2RlbHMvY29udHJpYnV0b3IvQ29udHJpYnV0b3JNb2RlbCdcblxuY2xhc3MgQ29udHJpYnV0b3JzQ29sbGVjdGlvbiBleHRlbmRzIEFic3RyYWN0Q29sbGVjdGlvblxuXG5cdG1vZGVsIDogQ29udHJpYnV0b3JNb2RlbFxuXG5cdGdldEFib3V0SFRNTCA6ID0+XG5cblx0XHRwZWVwcyA9IFtdXG5cblx0XHQocGVlcHMucHVzaCBtb2RlbC5nZXQoJ2h0bWwnKSkgZm9yIG1vZGVsIGluIEBtb2RlbHNcblxuXHRcdHBlZXBzLmpvaW4oJyBcXFxcICcpXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0b3JzQ29sbGVjdGlvblxuIiwiVGVtcGxhdGVNb2RlbCA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5cbmNsYXNzIFRlbXBsYXRlc0NvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0bW9kZWwgOiBUZW1wbGF0ZU1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzQ29sbGVjdGlvblxuIiwiQWJzdHJhY3RDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RDb2xsZWN0aW9uJ1xuRG9vZGxlTW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2Rvb2RsZS9Eb29kbGVNb2RlbCdcblxuY2xhc3MgRG9vZGxlc0NvbGxlY3Rpb24gZXh0ZW5kcyBBYnN0cmFjdENvbGxlY3Rpb25cblxuXHRtb2RlbCA6IERvb2RsZU1vZGVsXG5cblx0Z2V0RG9vZGxlQnlTbHVnIDogKHNsdWcpID0+XG5cblx0XHRkb29kbGUgPSBAZmluZFdoZXJlIHNsdWcgOiBzbHVnXG5cblx0XHRpZiAhZG9vZGxlXG5cdFx0XHRjb25zb2xlLmxvZyBcInkgdSBubyBkb29kbGU/XCJcblxuXHRcdHJldHVybiBkb29kbGVcblxuXHRnZXREb29kbGVCeU5hdlNlY3Rpb24gOiAod2hpY2hTZWN0aW9uKSA9PlxuXG5cdFx0c2VjdGlvbiA9IEBDRCgpLm5hdlt3aGljaFNlY3Rpb25dXG5cblx0XHRkb29kbGUgPSBAZmluZFdoZXJlIHNsdWcgOiBcIiN7c2VjdGlvbi5zdWJ9LyN7c2VjdGlvbi50ZXJ9XCJcblxuXHRcdGRvb2RsZVxuXG5tb2R1bGUuZXhwb3J0cyA9IERvb2RsZXNDb2xsZWN0aW9uXG4iLCJDb2xvcnMgPVxuXG5cdENEX1JFRCAgICA6ICcjRUI0MjNFJ1xuXHRDRF9CTFVFICAgOiAnIzM5NUNBQSdcblx0Q0RfQkxBQ0sgIDogJyMxMTExMTEnXG5cdE9GRl9XSElURSA6ICcjRjFGMUYzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yc1xuIiwiQVBJUm91dGVNb2RlbCA9IHJlcXVpcmUgJy4uL21vZGVscy9jb3JlL0FQSVJvdXRlTW9kZWwnXG5cbmNsYXNzIEFQSVxuXG5cdEBtb2RlbCA6IG5ldyBBUElSb3V0ZU1vZGVsXG5cblx0QGdldENvbnRhbnRzIDogPT5cblxuXHRcdCMjIyBhZGQgbW9yZSBpZiB3ZSB3YW5uYSB1c2UgaW4gQVBJIHN0cmluZ3MgIyMjXG5cdFx0QkFTRV9VUkwgOiBAQ0QoKS5CQVNFX1VSTFxuXG5cdEBnZXQgOiAobmFtZSwgdmFycykgPT5cblxuXHRcdHZhcnMgPSAkLmV4dGVuZCB0cnVlLCB2YXJzLCBAZ2V0Q29udGFudHMoKVxuXHRcdHJldHVybiBAc3VwcGxhbnRTdHJpbmcgQG1vZGVsLmdldChuYW1lKSwgdmFyc1xuXG5cdEBzdXBwbGFudFN0cmluZyA6IChzdHIsIHZhbHMpIC0+XG5cblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UgL3t7IChbXnt9XSopIH19L2csIChhLCBiKSAtPlxuXHRcdFx0ciA9IHZhbHNbYl0gb3IgaWYgdHlwZW9mIHZhbHNbYl0gaXMgJ251bWJlcicgdGhlbiB2YWxzW2JdLnRvU3RyaW5nKCkgZWxzZSAnJ1xuXHRcdChpZiB0eXBlb2YgciBpcyBcInN0cmluZ1wiIG9yIHR5cGVvZiByIGlzIFwibnVtYmVyXCIgdGhlbiByIGVsc2UgYSlcblxuXHRAQ0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFQSVxuIiwiY2xhc3MgQWJzdHJhY3REYXRhXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0Xy5leHRlbmQgQCwgQmFja2JvbmUuRXZlbnRzXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdERhdGFcbiIsIkxvY2FsZXNNb2RlbCA9IHJlcXVpcmUgJy4uL21vZGVscy9jb3JlL0xvY2FsZXNNb2RlbCdcbkFQSSAgICAgICAgICA9IHJlcXVpcmUgJy4uL2RhdGEvQVBJJ1xuXG4jIyNcbiMgTG9jYWxlIExvYWRlciAjXG5cbkZpcmVzIGJhY2sgYW4gZXZlbnQgd2hlbiBjb21wbGV0ZVxuXG4jIyNcbmNsYXNzIExvY2FsZVxuXG4gICAgbGFuZyAgICAgOiBudWxsXG4gICAgZGF0YSAgICAgOiBudWxsXG4gICAgY2FsbGJhY2sgOiBudWxsXG4gICAgYmFja3VwICAgOiBudWxsXG4gICAgZGVmYXVsdCAgOiAnZW4tZ2InXG5cbiAgICBjb25zdHJ1Y3RvciA6IChkYXRhLCBjYikgLT5cblxuICAgICAgICAjIyMgc3RhcnQgTG9jYWxlIExvYWRlciwgZGVmaW5lIGxvY2FsZSBiYXNlZCBvbiBicm93c2VyIGxhbmd1YWdlICMjI1xuXG4gICAgICAgIEBjYWxsYmFjayA9IGNiXG4gICAgICAgIEBiYWNrdXAgPSBkYXRhXG5cbiAgICAgICAgQGxhbmcgPSBAZ2V0TGFuZygpXG5cbiAgICAgICAgaWYgQVBJLmdldCgnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSlcblxuICAgICAgICAgICAgJC5hamF4XG4gICAgICAgICAgICAgICAgdXJsICAgICA6IEFQSS5nZXQoICdsb2NhbGUnLCB7IGNvZGUgOiBAbGFuZyB9IClcbiAgICAgICAgICAgICAgICB0eXBlICAgIDogJ0dFVCdcbiAgICAgICAgICAgICAgICBzdWNjZXNzIDogQG9uU3VjY2Vzc1xuICAgICAgICAgICAgICAgIGVycm9yICAgOiBAbG9hZEJhY2t1cFxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAgQGxvYWRCYWNrdXAoKVxuXG4gICAgICAgIG51bGxcbiAgICAgICAgICAgIFxuICAgIGdldExhbmcgOiA9PlxuXG4gICAgICAgIGlmIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggYW5kIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gubWF0Y2goJ2xhbmc9JylcblxuICAgICAgICAgICAgbGFuZyA9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3BsaXQoJ2xhbmc9JylbMV0uc3BsaXQoJyYnKVswXVxuXG4gICAgICAgIGVsc2UgaWYgd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIGxhbmcgPSBAZGVmYXVsdFxuXG4gICAgICAgIGxhbmdcblxuICAgIG9uU3VjY2VzcyA6IChldmVudCkgPT5cblxuICAgICAgICAjIyMgRmlyZXMgYmFjayBhbiBldmVudCBvbmNlIGl0J3MgY29tcGxldGUgIyMjXG5cbiAgICAgICAgZCA9IG51bGxcblxuICAgICAgICBpZiBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgICAgIGQgPSBKU09OLnBhcnNlIGV2ZW50LnJlc3BvbnNlVGV4dFxuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgZCA9IGV2ZW50XG5cbiAgICAgICAgQGRhdGEgPSBuZXcgTG9jYWxlc01vZGVsIGRcbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbG9hZEJhY2t1cCA6ID0+XG5cbiAgICAgICAgIyMjIFdoZW4gQVBJIG5vdCBhdmFpbGFibGUsIHRyaWVzIHRvIGxvYWQgdGhlIHN0YXRpYyAudHh0IGxvY2FsZSAjIyNcblxuICAgICAgICAkLmFqYXggXG4gICAgICAgICAgICB1cmwgICAgICA6IEBiYWNrdXBcbiAgICAgICAgICAgIGRhdGFUeXBlIDogJ2pzb24nXG4gICAgICAgICAgICBjb21wbGV0ZSA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgIGVycm9yICAgIDogPT4gY29uc29sZS5sb2cgJ2Vycm9yIG9uIGxvYWRpbmcgYmFja3VwJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGdldCA6IChpZCkgPT5cblxuICAgICAgICAjIyMgZ2V0IFN0cmluZyBmcm9tIGxvY2FsZVxuICAgICAgICArIGlkIDogc3RyaW5nIGlkIG9mIHRoZSBMb2NhbGlzZWQgU3RyaW5nXG4gICAgICAgICMjI1xuXG4gICAgICAgIHJldHVybiBAZGF0YS5nZXRTdHJpbmcgaWRcblxuICAgIGdldExvY2FsZUltYWdlIDogKHVybCkgPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LmNvbmZpZy5DRE4gKyBcIi9pbWFnZXMvbG9jYWxlL1wiICsgd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlICsgXCIvXCIgKyB1cmxcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGVcbiIsIlRlbXBsYXRlTW9kZWwgICAgICAgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsJ1xuVGVtcGxhdGVzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4uL2NvbGxlY3Rpb25zL2NvcmUvVGVtcGxhdGVzQ29sbGVjdGlvbidcblxuY2xhc3MgVGVtcGxhdGVzXG5cbiAgICB0ZW1wbGF0ZXMgOiBudWxsXG4gICAgY2IgICAgICAgIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAodGVtcGxhdGVzLCBjYWxsYmFjaykgLT5cblxuICAgICAgICBAY2IgPSBjYWxsYmFja1xuXG4gICAgICAgICQuYWpheCB1cmwgOiB0ZW1wbGF0ZXMsIHN1Y2Nlc3MgOiBAcGFyc2VYTUxcbiAgICAgICAgICAgXG4gICAgICAgIG51bGxcblxuICAgIHBhcnNlWE1MIDogKGRhdGEpID0+XG5cbiAgICAgICAgdGVtcCA9IFtdXG5cbiAgICAgICAgJChkYXRhKS5maW5kKCd0ZW1wbGF0ZScpLmVhY2ggKGtleSwgdmFsdWUpIC0+XG4gICAgICAgICAgICAkdmFsdWUgPSAkKHZhbHVlKVxuICAgICAgICAgICAgdGVtcC5wdXNoIG5ldyBUZW1wbGF0ZU1vZGVsXG4gICAgICAgICAgICAgICAgaWQgICA6ICR2YWx1ZS5hdHRyKCdpZCcpLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICB0ZXh0IDogJC50cmltICR2YWx1ZS50ZXh0KClcblxuICAgICAgICBAdGVtcGxhdGVzID0gbmV3IFRlbXBsYXRlc0NvbGxlY3Rpb24gdGVtcFxuXG4gICAgICAgIEBjYj8oKVxuICAgICAgICBcbiAgICAgICAgbnVsbCAgICAgICAgXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgdCA9IEB0ZW1wbGF0ZXMud2hlcmUgaWQgOiBpZFxuICAgICAgICB0ID0gdFswXS5nZXQgJ3RleHQnXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gJC50cmltIHRcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZXNcbiIsImNsYXNzIEFic3RyYWN0TW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5EZWVwTW9kZWxcblxuXHRjb25zdHJ1Y3RvciA6IChhdHRycywgb3B0aW9uKSAtPlxuXG5cdFx0YXR0cnMgPSBAX2ZpbHRlckF0dHJzIGF0dHJzXG5cblx0XHRyZXR1cm4gQmFja2JvbmUuRGVlcE1vZGVsLmFwcGx5IEAsIGFyZ3VtZW50c1xuXG5cdHNldCA6IChhdHRycywgb3B0aW9ucykgLT5cblxuXHRcdG9wdGlvbnMgb3IgKG9wdGlvbnMgPSB7fSlcblxuXHRcdGF0dHJzID0gQF9maWx0ZXJBdHRycyBhdHRyc1xuXG5cdFx0b3B0aW9ucy5kYXRhID0gSlNPTi5zdHJpbmdpZnkgYXR0cnNcblxuXHRcdHJldHVybiBCYWNrYm9uZS5EZWVwTW9kZWwucHJvdG90eXBlLnNldC5jYWxsIEAsIGF0dHJzLCBvcHRpb25zXG5cblx0X2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG5cdFx0YXR0cnNcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RNb2RlbFxuIiwiQWJzdHJhY3RNb2RlbCAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdE1vZGVsJ1xuTnVtYmVyVXRpbHMgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi91dGlscy9OdW1iZXJVdGlscydcbkNvZGVXb3JkVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXInXG5cbmNsYXNzIENvbnRyaWJ1dG9yTW9kZWwgZXh0ZW5kcyBBYnN0cmFjdE1vZGVsXG5cbiAgICBkZWZhdWx0cyA6IFxuICAgICAgICBcIm5hbWVcIiAgICA6IFwiXCJcbiAgICAgICAgXCJnaXRodWJcIiAgOiBcIlwiXG4gICAgICAgIFwid2Vic2l0ZVwiIDogXCJcIlxuICAgICAgICBcInR3aXR0ZXJcIiA6IFwiXCJcbiAgICAgICAgXCJodG1sXCIgICAgOiBcIlwiXG5cbiAgICBfZmlsdGVyQXR0cnMgOiAoYXR0cnMpID0+XG5cbiAgICAgICAgaWYgYXR0cnMubmFtZVxuICAgICAgICAgICAgYXR0cnMuaHRtbCA9IEBnZXRIdG1sIGF0dHJzXG5cbiAgICAgICAgYXR0cnNcblxuICAgIGdldEh0bWwgOiAoYXR0cnMpID0+XG5cbiAgICAgICAgaHRtbCAgPSBcIlwiXG4gICAgICAgIGxpbmtzID0gW11cblxuICAgICAgICBpZiBhdHRycy53ZWJzaXRlXG4gICAgICAgICAgICBodG1sICs9IFwiPGEgaHJlZj1cXFwiI3thdHRycy53ZWJzaXRlfVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPiN7YXR0cnMubmFtZX08L2E+IFwiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGh0bWwgKz0gXCIje2F0dHJzLm5hbWV9IFwiXG5cbiAgICAgICAgaWYgYXR0cnMudHdpdHRlciB0aGVuIGxpbmtzLnB1c2ggXCI8YSBocmVmPVxcXCJodHRwOi8vdHdpdHRlci5jb20vI3thdHRycy50d2l0dGVyfVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPnR3PC9hPlwiXG4gICAgICAgIGlmIGF0dHJzLmdpdGh1YiB0aGVuIGxpbmtzLnB1c2ggXCI8YSBocmVmPVxcXCJodHRwOi8vZ2l0aHViLmNvbS8je2F0dHJzLmdpdGh1Yn1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5naDwvYT5cIlxuXG4gICAgICAgIGh0bWwgKz0gXCIoI3tsaW5rcy5qb2luKCcsICcpfSlcIlxuXG4gICAgICAgIGh0bWxcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cmlidXRvck1vZGVsXG4iLCJjbGFzcyBBUElSb3V0ZU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG5cbiAgICAgICAgc3RhcnQgICAgICAgICA6IFwiXCIgIyBFZzogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvc3RhcnRcIlxuXG4gICAgICAgIGxvY2FsZSAgICAgICAgOiBcIlwiICMgRWc6IFwie3sgQkFTRV9VUkwgfX0vYXBpL2wxMG4ve3sgY29kZSB9fVwiXG5cbiAgICAgICAgdXNlciAgICAgICAgICA6XG4gICAgICAgICAgICBsb2dpbiAgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9sb2dpblwiXG4gICAgICAgICAgICByZWdpc3RlciAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9yZWdpc3RlclwiXG4gICAgICAgICAgICBwYXNzd29yZCAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9wYXNzd29yZFwiXG4gICAgICAgICAgICB1cGRhdGUgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci91cGRhdGVcIlxuICAgICAgICAgICAgbG9nb3V0ICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvbG9nb3V0XCJcbiAgICAgICAgICAgIHJlbW92ZSAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3JlbW92ZVwiXG5cbm1vZHVsZS5leHBvcnRzID0gQVBJUm91dGVNb2RlbFxuIiwiY2xhc3MgTG9jYWxlc01vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuICAgIGRlZmF1bHRzIDpcbiAgICAgICAgY29kZSAgICAgOiBudWxsXG4gICAgICAgIGxhbmd1YWdlIDogbnVsbFxuICAgICAgICBzdHJpbmdzICA6IG51bGxcbiAgICAgICAgICAgIFxuICAgIGdldF9sYW5ndWFnZSA6ID0+XG4gICAgICAgIHJldHVybiBAZ2V0KCdsYW5ndWFnZScpXG5cbiAgICBnZXRTdHJpbmcgOiAoaWQpID0+XG4gICAgICAgICgocmV0dXJuIGUgaWYoYSBpcyBpZCkpIGZvciBhLCBlIG9mIHZbJ3N0cmluZ3MnXSkgZm9yIGssIHYgb2YgQGdldCgnc3RyaW5ncycpXG4gICAgICAgIGNvbnNvbGUud2FybiBcIkxvY2FsZXMgLT4gbm90IGZvdW5kIHN0cmluZzogI3tpZH1cIlxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlc01vZGVsXG4iLCJjbGFzcyBUZW1wbGF0ZU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuXHRkZWZhdWx0cyA6IFxuXG5cdFx0aWQgICA6IFwiXCJcblx0XHR0ZXh0IDogXCJcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlTW9kZWxcbiIsIkFic3RyYWN0TW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RNb2RlbCdcbk51bWJlclV0aWxzICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvTnVtYmVyVXRpbHMnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBEb29kbGVNb2RlbCBleHRlbmRzIEFic3RyYWN0TW9kZWxcblxuXHRkZWZhdWx0cyA6XG5cdFx0IyBmcm9tIG1hbmlmZXN0XG5cdFx0XCJuYW1lXCIgOiBcIlwiXG5cdFx0XCJhdXRob3JcIiA6XG5cdFx0XHRcIm5hbWVcIiAgICA6IFwiXCJcblx0XHRcdFwiZ2l0aHViXCIgIDogXCJcIlxuXHRcdFx0XCJ3ZWJzaXRlXCIgOiBcIlwiXG5cdFx0XHRcInR3aXR0ZXJcIiA6IFwiXCJcblx0XHRcImRlc2NyaXB0aW9uXCI6IFwiXCJcblx0XHRcInRhZ3NcIiA6IFtdXG5cdFx0XCJpbnRlcmFjdGlvblwiIDpcblx0XHRcdFwibW91c2VcIiAgICA6IG51bGxcblx0XHRcdFwia2V5Ym9hcmRcIiA6IG51bGxcblx0XHRcdFwidG91Y2hcIiAgICA6IG51bGxcblx0XHRcImNyZWF0ZWRcIiA6IFwiXCJcblx0XHRcInNsdWdcIiA6IFwiXCJcblx0XHRcImluZGV4XCI6IG51bGxcblx0XHQjIHNpdGUtb25seVxuXHRcdFwiaW5kZXhIVE1MXCIgOiBcIlwiXG5cdFx0XCJzb3VyY2VcIiAgICA6IFwiXCJcblx0XHRcInVybFwiICAgICAgIDogXCJcIlxuXHRcdFwic2NyYW1ibGVkXCIgOlxuXHRcdFx0XCJuYW1lXCIgICAgICAgIDogXCJcIlxuXHRcdFx0XCJhdXRob3JfbmFtZVwiIDogXCJcIlxuXG5cdF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuXHRcdGlmIGF0dHJzLnNsdWdcblx0XHRcdGF0dHJzLnVybCA9IHdpbmRvdy5jb25maWcuaG9zdG5hbWUgKyAnLycgKyB3aW5kb3cuY29uZmlnLnJvdXRlcy5ET09ETEVTICsgJy8nICsgYXR0cnMuc2x1Z1xuXG5cdFx0aWYgYXR0cnMuaW5kZXhcblx0XHRcdGF0dHJzLmluZGV4ID0gTnVtYmVyVXRpbHMuemVyb0ZpbGwgYXR0cnMuaW5kZXgsIDNcblxuXHRcdGlmIGF0dHJzLm5hbWUgYW5kIGF0dHJzLmF1dGhvci5uYW1lXG5cdFx0XHRhdHRycy5zY3JhbWJsZWQgPVxuXHRcdFx0XHRuYW1lICAgICAgICA6IENvZGVXb3JkVHJhbnNpdGlvbmVyLmdldFNjcmFtYmxlZFdvcmQgYXR0cnMubmFtZVxuXHRcdFx0XHRhdXRob3JfbmFtZSA6IENvZGVXb3JkVHJhbnNpdGlvbmVyLmdldFNjcmFtYmxlZFdvcmQgYXR0cnMuYXV0aG9yLm5hbWVcblxuXHRcdGlmIGF0dHJzLmluZGV4XG5cdFx0XHRhdHRycy5pbmRleEhUTUwgPSBAZ2V0SW5kZXhIVE1MIGF0dHJzLmluZGV4XG5cblx0XHRhdHRyc1xuXG5cdGdldEluZGV4SFRNTCA6IChpbmRleCkgPT5cblxuXHRcdEhUTUwgPSBcIlwiXG5cblx0XHRmb3IgY2hhciBpbiBpbmRleC5zcGxpdCgnJylcblx0XHRcdGNsYXNzTmFtZSA9IGlmIGNoYXIgaXMgJzAnIHRoZW4gJ2luZGV4LWNoYXItemVybycgZWxzZSAnaW5kZXgtY2hhci1ub256ZXJvJ1xuXHRcdFx0SFRNTCArPSBcIjxzcGFuIGNsYXNzPVxcXCIje2NsYXNzTmFtZX1cXFwiPiN7Y2hhcn08L3NwYW4+XCJcblxuXHRcdEhUTUxcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVNb2RlbFxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vdmlldy9BYnN0cmFjdFZpZXcnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL1JvdXRlcidcblxuY2xhc3MgTmF2IGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICBARVZFTlRfQ0hBTkdFX1ZJRVcgICAgIDogJ0VWRU5UX0NIQU5HRV9WSUVXJ1xuICAgIEBFVkVOVF9DSEFOR0VfU1VCX1ZJRVcgOiAnRVZFTlRfQ0hBTkdFX1NVQl9WSUVXJ1xuXG4gICAgc2VjdGlvbnMgOiBudWxsICMgc2V0IHZpYSB3aW5kb3cuY29uZmlnIGRhdGEsIHNvIGNhbiBiZSBjb25zaXN0ZW50IHdpdGggYmFja2VuZFxuXG4gICAgY3VycmVudCAgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbCwgdGVyIDogbnVsbFxuICAgIHByZXZpb3VzIDogYXJlYSA6IG51bGwsIHN1YiA6IG51bGwsIHRlciA6IG51bGxcblxuICAgIGNoYW5nZVZpZXdDb3VudCA6IDBcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEBzZWN0aW9ucyA9IHdpbmRvdy5jb25maWcucm91dGVzXG4gICAgICAgIEBmYXZpY29uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zhdmljb24nKVxuXG4gICAgICAgIEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAY2hhbmdlVmlld1xuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZ2V0U2VjdGlvbiA6IChzZWN0aW9uLCBzdHJpY3Q9ZmFsc2UpID0+XG5cbiAgICAgICAgaWYgIXN0cmljdCBhbmQgc2VjdGlvbiBpcyAnJyB0aGVuIHJldHVybiB0cnVlXG5cbiAgICAgICAgZm9yIHNlY3Rpb25OYW1lLCB1cmkgb2YgQHNlY3Rpb25zXG4gICAgICAgICAgICBpZiB1cmkgaXMgc2VjdGlvbiB0aGVuIHJldHVybiBzZWN0aW9uTmFtZVxuXG4gICAgICAgIGZhbHNlXG5cbiAgICBjaGFuZ2VWaWV3OiAoYXJlYSwgc3ViLCB0ZXIsIHBhcmFtcykgPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwiYXJlYVwiLGFyZWFcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInN1YlwiLHN1YlxuICAgICAgICAjIGNvbnNvbGUubG9nIFwidGVyXCIsdGVyXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJwYXJhbXNcIixwYXJhbXNcblxuICAgICAgICBAY2hhbmdlVmlld0NvdW50KytcblxuICAgICAgICBAcHJldmlvdXMgPSBAY3VycmVudFxuICAgICAgICBAY3VycmVudCAgPSBhcmVhIDogYXJlYSwgc3ViIDogc3ViLCB0ZXIgOiB0ZXJcblxuICAgICAgICBAdHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBwcmV2aW91cywgQGN1cnJlbnRcbiAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGN1cnJlbnRcblxuICAgICAgICBpZiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5pc09wZW4oKSB0aGVuIEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLmhpZGVPcGVuTW9kYWwoKVxuXG4gICAgICAgIEBzZXRQYWdlVGl0bGUgYXJlYSwgc3ViLCB0ZXJcbiAgICAgICAgQHNldFBhZ2VGYXZpY29uIGFyZWFcblxuICAgICAgICBudWxsXG5cbiAgICBzZXRQYWdlVGl0bGU6IChhcmVhLCBzdWIsIHRlcikgPT5cblxuICAgICAgICBzZWN0aW9uICAgPSBpZiBhcmVhIGlzICcnIHRoZW4gJ0hPTUUnIGVsc2UgQENEKCkubmF2LmdldFNlY3Rpb24gYXJlYVxuICAgICAgICB0aXRsZVRtcGwgPSBAQ0QoKS5sb2NhbGUuZ2V0KFwicGFnZV90aXRsZV8je3NlY3Rpb259XCIpIG9yIEBDRCgpLmxvY2FsZS5nZXQoXCJwYWdlX3RpdGxlX0hPTUVcIilcbiAgICAgICAgdGl0bGUgPSBAc3VwcGxhbnRTdHJpbmcgdGl0bGVUbXBsLCBAZ2V0UGFnZVRpdGxlVmFycyhhcmVhLCBzdWIsIHRlciksIGZhbHNlXG5cbiAgICAgICAgaWYgd2luZG93LmRvY3VtZW50LnRpdGxlIGlzbnQgdGl0bGUgdGhlbiB3aW5kb3cuZG9jdW1lbnQudGl0bGUgPSB0aXRsZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNldFBhZ2VGYXZpY29uOiAoYXJlYSkgPT5cblxuICAgICAgICBjb2xvdXIgPSBzd2l0Y2ggYXJlYVxuICAgICAgICAgICAgd2hlbiBAc2VjdGlvbnMuSE9NRSB0aGVuICdyZWQnXG4gICAgICAgICAgICB3aGVuIEBzZWN0aW9ucy5BQk9VVCwgQHNlY3Rpb25zLkNPTlRSSUJVVEUgdGhlbiAnYmxhY2snXG4gICAgICAgICAgICB3aGVuIEBzZWN0aW9ucy5ET09ETEVTIHRoZW4gJ2JsdWUnXG4gICAgICAgICAgICBlbHNlICdyZWQnXG5cbiAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgQGZhdmljb24uaHJlZiA9IFwiI3tAQ0QoKS5CQVNFX1VSTH0vc3RhdGljL2ltZy9pY29ucy9mYXZpY29uL2Zhdmljb25fI3tjb2xvdXJ9LnBuZ1wiXG4gICAgICAgICwgMFxuXG4gICAgICAgIG51bGxcblxuICAgIGdldFBhZ2VUaXRsZVZhcnM6IChhcmVhLCBzdWIsIHRlcikgPT5cblxuICAgICAgICB2YXJzID0ge31cblxuICAgICAgICBpZiBhcmVhIGlzIEBzZWN0aW9ucy5ET09ETEVTIGFuZCBzdWIgYW5kIHRlclxuICAgICAgICAgICAgZG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmZpbmRXaGVyZSBzbHVnOiBcIiN7c3VifS8je3Rlcn1cIlxuXG4gICAgICAgICAgICBpZiAhZG9vZGxlXG4gICAgICAgICAgICAgICAgdmFycy5uYW1lID0gXCJkb29kbGVcIlxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHZhcnMubmFtZSA9IGRvb2RsZS5nZXQoJ2F1dGhvci5uYW1lJykgKyAnIFxcXFwgJyArIGRvb2RsZS5nZXQoJ25hbWUnKSArICcgJ1xuXG4gICAgICAgIHZhcnNcblxubW9kdWxlLmV4cG9ydHMgPSBOYXZcbiIsImNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4gICAgQEVWRU5UX0hBU0hfQ0hBTkdFRCA6ICdFVkVOVF9IQVNIX0NIQU5HRUQnXG5cbiAgICBGSVJTVF9ST1VURSA6IHRydWVcblxuICAgIHJvdXRlcyA6XG4gICAgICAgICcoLykoOmFyZWEpKC86c3ViKSgvOnRlcikoLyknIDogJ2hhc2hDaGFuZ2VkJ1xuICAgICAgICAnKmFjdGlvbnMnICAgICAgICAgICAgICAgICAgICA6ICduYXZpZ2F0ZVRvJ1xuXG4gICAgYXJlYSAgIDogbnVsbFxuICAgIHN1YiAgICA6IG51bGxcbiAgICB0ZXIgICAgOiBudWxsXG4gICAgcGFyYW1zIDogbnVsbFxuXG4gICAgc3RhcnQgOiA9PlxuXG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQgXG4gICAgICAgICAgICBwdXNoU3RhdGUgOiB0cnVlXG4gICAgICAgICAgICByb290ICAgICAgOiAnLydcblxuICAgICAgICBudWxsXG5cbiAgICBoYXNoQ2hhbmdlZCA6IChAYXJlYSA9IG51bGwsIEBzdWIgPSBudWxsLCBAdGVyID0gbnVsbCkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIj4+IEVWRU5UX0hBU0hfQ0hBTkdFRCBAYXJlYSA9ICN7QGFyZWF9LCBAc3ViID0gI3tAc3VifSwgQHRlciA9ICN7QHRlcn0gPDxcIlxuXG4gICAgICAgIGlmIEBGSVJTVF9ST1VURSB0aGVuIEBGSVJTVF9ST1VURSA9IGZhbHNlXG5cbiAgICAgICAgaWYgIUBhcmVhIHRoZW4gQGFyZWEgPSBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXG4gICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBhcmVhLCBAc3ViLCBAdGVyLCBAcGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbmF2aWdhdGVUbyA6ICh3aGVyZSA9ICcnLCB0cmlnZ2VyID0gdHJ1ZSwgcmVwbGFjZSA9IGZhbHNlLCBAcGFyYW1zKSA9PlxuXG4gICAgICAgIGlmIHdoZXJlLmNoYXJBdCgwKSBpc250IFwiL1wiXG4gICAgICAgICAgICB3aGVyZSA9IFwiLyN7d2hlcmV9XCJcbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KCB3aGVyZS5sZW5ndGgtMSApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIje3doZXJlfS9cIlxuXG4gICAgICAgIGlmICF0cmlnZ2VyXG4gICAgICAgICAgICBAdHJpZ2dlciBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCB3aGVyZSwgbnVsbCwgQHBhcmFtc1xuICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgQG5hdmlnYXRlIHdoZXJlLCB0cmlnZ2VyOiB0cnVlLCByZXBsYWNlOiByZXBsYWNlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQ0QgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXJcbiIsIiMjI1xuQW5hbHl0aWNzIHdyYXBwZXJcbiMjI1xuY2xhc3MgQW5hbHl0aWNzXG5cbiAgICB0YWdzICAgIDogbnVsbFxuICAgIHN0YXJ0ZWQgOiBmYWxzZVxuXG4gICAgYXR0ZW1wdHMgICAgICAgIDogMFxuICAgIGFsbG93ZWRBdHRlbXB0cyA6IDVcblxuICAgIGNvbnN0cnVjdG9yIDogKHRhZ3MsIEBjYWxsYmFjaykgLT5cblxuICAgICAgICAkLmdldEpTT04gdGFncywgQG9uVGFnc1JlY2VpdmVkXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIG9uVGFnc1JlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgQHRhZ3MgICAgPSBkYXRhXG4gICAgICAgIEBzdGFydGVkID0gdHJ1ZVxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICAjIyNcbiAgICBAcGFyYW0gc3RyaW5nIGlkIG9mIHRoZSB0cmFja2luZyB0YWcgdG8gYmUgcHVzaGVkIG9uIEFuYWx5dGljcyBcbiAgICAjIyNcbiAgICB0cmFjayA6IChwYXJhbSkgPT5cblxuICAgICAgICByZXR1cm4gaWYgIUBzdGFydGVkXG5cbiAgICAgICAgaWYgcGFyYW1cblxuICAgICAgICAgICAgdiA9IEB0YWdzW3BhcmFtXVxuXG4gICAgICAgICAgICBpZiB2XG5cbiAgICAgICAgICAgICAgICBhcmdzID0gWydzZW5kJywgJ2V2ZW50J11cbiAgICAgICAgICAgICAgICAoIGFyZ3MucHVzaChhcmcpICkgZm9yIGFyZyBpbiB2XG5cbiAgICAgICAgICAgICAgICAjIGxvYWRpbmcgR0EgYWZ0ZXIgbWFpbiBhcHAgSlMsIHNvIGV4dGVybmFsIHNjcmlwdCBtYXkgbm90IGJlIGhlcmUgeWV0XG4gICAgICAgICAgICAgICAgaWYgd2luZG93LmdhXG4gICAgICAgICAgICAgICAgICAgIGdhLmFwcGx5IG51bGwsIGFyZ3NcbiAgICAgICAgICAgICAgICBlbHNlIGlmIEBhdHRlbXB0cyA+PSBAYWxsb3dlZEF0dGVtcHRzXG4gICAgICAgICAgICAgICAgICAgIEBzdGFydGVkID0gZmFsc2VcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIEB0cmFjayBwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgQGF0dGVtcHRzKytcbiAgICAgICAgICAgICAgICAgICAgLCAyMDAwXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5dGljc1xuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0dvb2dsZVBsdXMnXG5cbmNsYXNzIEF1dGhNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0dXNlckRhdGEgIDogbnVsbFxuXG5cdCMgQHByb2Nlc3MgdHJ1ZSBkdXJpbmcgbG9naW4gcHJvY2Vzc1xuXHRwcm9jZXNzICAgICAgOiBmYWxzZVxuXHRwcm9jZXNzVGltZXIgOiBudWxsXG5cdHByb2Nlc3NXYWl0ICA6IDUwMDBcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdXNlckRhdGEgID0gQENEKCkuYXBwRGF0YS5VU0VSXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGxvZ2luIDogKHNlcnZpY2UsIGNiPW51bGwpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwiKysrKyBQUk9DRVNTIFwiLEBwcm9jZXNzXG5cblx0XHRyZXR1cm4gaWYgQHByb2Nlc3NcblxuXHRcdEBzaG93TG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IHRydWVcblxuXHRcdCRkYXRhRGZkID0gJC5EZWZlcnJlZCgpXG5cblx0XHRzd2l0Y2ggc2VydmljZVxuXHRcdFx0d2hlbiAnZ29vZ2xlJ1xuXHRcdFx0XHRHb29nbGVQbHVzLmxvZ2luICRkYXRhRGZkXG5cdFx0XHR3aGVuICdmYWNlYm9vaydcblx0XHRcdFx0RmFjZWJvb2subG9naW4gJGRhdGFEZmRcblxuXHRcdCRkYXRhRGZkLmRvbmUgKHJlcykgPT4gQGF1dGhTdWNjZXNzIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmZhaWwgKHJlcykgPT4gQGF1dGhGYWlsIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmFsd2F5cyAoKSA9PiBAYXV0aENhbGxiYWNrIGNiXG5cblx0XHQjIyNcblx0XHRVbmZvcnR1bmF0ZWx5IG5vIGNhbGxiYWNrIGlzIGZpcmVkIGlmIHVzZXIgbWFudWFsbHkgY2xvc2VzIEcrIGxvZ2luIG1vZGFsLFxuXHRcdHNvIHRoaXMgaXMgdG8gYWxsb3cgdGhlbSB0byBjbG9zZSB3aW5kb3cgYW5kIHRoZW4gc3Vic2VxdWVudGx5IHRyeSB0byBsb2cgaW4gYWdhaW4uLi5cblx0XHQjIyNcblx0XHRAcHJvY2Vzc1RpbWVyID0gc2V0VGltZW91dCBAYXV0aENhbGxiYWNrLCBAcHJvY2Vzc1dhaXRcblxuXHRcdCRkYXRhRGZkXG5cblx0YXV0aFN1Y2Nlc3MgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBjYWxsYmFjayBmb3IgI3tzZXJ2aWNlfSwgZGF0YSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhGYWlsIDogKHNlcnZpY2UsIGRhdGEpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwibG9naW4gZmFpbCBmb3IgI3tzZXJ2aWNlfSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhDYWxsYmFjayA6IChjYj1udWxsKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAcHJvY2Vzc1xuXG5cdFx0Y2xlYXJUaW1lb3V0IEBwcm9jZXNzVGltZXJcblxuXHRcdEBoaWRlTG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IGZhbHNlXG5cblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdCMjI1xuXHRzaG93IC8gaGlkZSBzb21lIFVJIGluZGljYXRvciB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBzb2NpYWwgbmV0d29yayB0byByZXNwb25kXG5cdCMjI1xuXHRzaG93TG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJzaG93TG9hZGVyXCJcblxuXHRcdG51bGxcblxuXHRoaWRlTG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJoaWRlTG9hZGVyXCJcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRoTWFuYWdlclxuIiwiZW5jb2RlID0gcmVxdWlyZSAnZW50L2VuY29kZSdcblxuY2xhc3MgQ29kZVdvcmRUcmFuc2l0aW9uZXJcblxuXHRAY29uZmlnIDpcblx0XHRNSU5fV1JPTkdfQ0hBUlMgOiAxXG5cdFx0TUFYX1dST05HX0NIQVJTIDogN1xuXG5cdFx0TUlOX0NIQVJfSU5fREVMQVkgOiA0MFxuXHRcdE1BWF9DSEFSX0lOX0RFTEFZIDogNzBcblxuXHRcdE1JTl9DSEFSX09VVF9ERUxBWSA6IDQwXG5cdFx0TUFYX0NIQVJfT1VUX0RFTEFZIDogNzBcblxuXHRcdENIQVJTIDogJ2FiY2RlZmhpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5IT8qKClAwqMkJV4mXy0rPVtde306O1xcJ1wiXFxcXHw8PiwuL35gJy5zcGxpdCgnJykubWFwKChjaGFyKSA9PiByZXR1cm4gZW5jb2RlKGNoYXIpKVxuXG5cdFx0Q0hBUl9URU1QTEFURSA6IFwiPHNwYW4gZGF0YS1jb2RldGV4dC1jaGFyPVxcXCJ7eyBjaGFyIH19XFxcIiBkYXRhLWNvZGV0ZXh0LWNoYXItc3RhdGU9XFxcInt7IHN0YXRlIH19XFxcIj57eyBjaGFyIH19PC9zcGFuPlwiXG5cblx0QF93b3JkQ2FjaGUgOiB7fVxuXG5cdEBfZ2V0V29yZEZyb21DYWNoZSA6ICgkZWwsIGluaXRpYWxTdGF0ZT1udWxsKSA9PlxuXG5cdFx0aWQgPSAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pZCcpXG5cblx0XHRpZiBpZCBhbmQgQF93b3JkQ2FjaGVbIGlkIF1cblx0XHRcdHdvcmQgPSBAX3dvcmRDYWNoZVsgaWQgXVxuXHRcdGVsc2Vcblx0XHRcdEBfd3JhcENoYXJzICRlbCwgaW5pdGlhbFN0YXRlXG5cdFx0XHR3b3JkID0gQF9hZGRXb3JkVG9DYWNoZSAkZWxcblxuXHRcdHdvcmRcblxuXHRAX2FkZFdvcmRUb0NhY2hlIDogKCRlbCkgPT5cblxuXHRcdGNoYXJzID0gW11cblxuXHRcdCRlbC5maW5kKCdbZGF0YS1jb2RldGV4dC1jaGFyXScpLmVhY2ggKGksIGVsKSA9PlxuXHRcdFx0JGNoYXJFbCA9ICQoZWwpXG5cdFx0XHRjaGFycy5wdXNoXG5cdFx0XHRcdCRlbCAgICAgICAgOiAkY2hhckVsXG5cdFx0XHRcdHJpZ2h0Q2hhciAgOiAkY2hhckVsLmF0dHIoJ2RhdGEtY29kZXRleHQtY2hhcicpXG5cblx0XHRpZCA9IF8udW5pcXVlSWQoKVxuXHRcdCRlbC5hdHRyICdkYXRhLWNvZGV3b3JkLWlkJywgaWRcblxuXHRcdEBfd29yZENhY2hlWyBpZCBdID1cblx0XHRcdHdvcmQgICAgOiBfLnBsdWNrKGNoYXJzLCAncmlnaHRDaGFyJykuam9pbignJylcblx0XHRcdCRlbCAgICAgOiAkZWxcblx0XHRcdGNoYXJzICAgOiBjaGFyc1xuXHRcdFx0dmlzaWJsZSA6IHRydWVcblxuXHRcdEBfd29yZENhY2hlWyBpZCBdXG5cblx0QF93cmFwQ2hhcnMgOiAoJGVsLCBpbml0aWFsU3RhdGU9bnVsbCkgPT5cblxuXHRcdGNoYXJzID0gJGVsLnRleHQoKS5zcGxpdCgnJylcblx0XHRzdGF0ZSA9IGluaXRpYWxTdGF0ZSBvciAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pbml0aWFsLXN0YXRlJykgb3IgXCJcIlxuXHRcdGh0bWwgPSBbXVxuXHRcdGZvciBjaGFyIGluIGNoYXJzXG5cdFx0XHRodG1sLnB1c2ggQF9zdXBwbGFudFN0cmluZyBAY29uZmlnLkNIQVJfVEVNUExBVEUsIGNoYXIgOiBjaGFyLCBzdGF0ZTogc3RhdGVcblxuXHRcdCRlbC5odG1sIGh0bWwuam9pbignJylcblxuXHRcdG51bGxcblxuXHQjIEBwYXJhbSB0YXJnZXQgPSAncmlnaHQnLCAnd3JvbmcnLCAnZW1wdHknXG5cdEBfcHJlcGFyZVdvcmQgOiAod29yZCwgdGFyZ2V0LCBjaGFyU3RhdGU9JycpID0+XG5cblx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cblx0XHRcdHRhcmdldENoYXIgPSBzd2l0Y2ggdHJ1ZVxuXHRcdFx0XHR3aGVuIHRhcmdldCBpcyAncmlnaHQnIHRoZW4gY2hhci5yaWdodENoYXJcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ3dyb25nJyB0aGVuIEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICdlbXB0eScgdGhlbiAnJ1xuXHRcdFx0XHRlbHNlIHRhcmdldC5jaGFyQXQoaSkgb3IgJydcblxuXHRcdFx0aWYgdGFyZ2V0Q2hhciBpcyAnICcgdGhlbiB0YXJnZXRDaGFyID0gJyZuYnNwOydcblxuXHRcdFx0Y2hhci53cm9uZ0NoYXJzID0gQF9nZXRSYW5kb21Xcm9uZ0NoYXJzKClcblx0XHRcdGNoYXIudGFyZ2V0Q2hhciA9IHRhcmdldENoYXJcblx0XHRcdGNoYXIuY2hhclN0YXRlICA9IGNoYXJTdGF0ZVxuXG5cdFx0bnVsbFxuXG5cdEBfZ2V0UmFuZG9tV3JvbmdDaGFycyA6ID0+XG5cblx0XHRjaGFycyA9IFtdXG5cblx0XHRjaGFyQ291bnQgPSBfLnJhbmRvbSBAY29uZmlnLk1JTl9XUk9OR19DSEFSUywgQGNvbmZpZy5NQVhfV1JPTkdfQ0hBUlNcblxuXHRcdGZvciBpIGluIFswLi4uY2hhckNvdW50XVxuXHRcdFx0Y2hhcnMucHVzaFxuXHRcdFx0XHRjaGFyICAgICA6IEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdGluRGVsYXkgIDogXy5yYW5kb20gQGNvbmZpZy5NSU5fQ0hBUl9JTl9ERUxBWSwgQGNvbmZpZy5NQVhfQ0hBUl9JTl9ERUxBWVxuXHRcdFx0XHRvdXREZWxheSA6IF8ucmFuZG9tIEBjb25maWcuTUlOX0NIQVJfT1VUX0RFTEFZLCBAY29uZmlnLk1BWF9DSEFSX09VVF9ERUxBWVxuXG5cdFx0Y2hhcnNcblxuXHRAX2dldFJhbmRvbUNoYXIgOiA9PlxuXG5cdFx0Y2hhciA9IEBjb25maWcuQ0hBUlNbIF8ucmFuZG9tKDAsIEBjb25maWcuQ0hBUlMubGVuZ3RoLTEpIF1cblxuXHRcdGNoYXJcblxuXHRAX2dldExvbmdlc3RDaGFyRHVyYXRpb24gOiAoY2hhcnMpID0+XG5cblx0XHRsb25nZXN0VGltZSA9IDBcblx0XHRsb25nZXN0VGltZUlkeCA9IDBcblxuXHRcdGZvciBjaGFyLCBpIGluIGNoYXJzXG5cblx0XHRcdHRpbWUgPSAwXG5cdFx0XHQodGltZSArPSB3cm9uZ0NoYXIuaW5EZWxheSArIHdyb25nQ2hhci5vdXREZWxheSkgZm9yIHdyb25nQ2hhciBpbiBjaGFyLndyb25nQ2hhcnNcblx0XHRcdGlmIHRpbWUgPiBsb25nZXN0VGltZVxuXHRcdFx0XHRsb25nZXN0VGltZSA9IHRpbWVcblx0XHRcdFx0bG9uZ2VzdFRpbWVJZHggPSBpXG5cblx0XHRsb25nZXN0VGltZUlkeFxuXG5cdEBfYW5pbWF0ZUNoYXJzIDogKHdvcmQsIHNlcXVlbnRpYWwsIGNiKSA9PlxuXG5cdFx0YWN0aXZlQ2hhciA9IDBcblxuXHRcdGlmIHNlcXVlbnRpYWxcblx0XHRcdEBfYW5pbWF0ZUNoYXIgd29yZC5jaGFycywgYWN0aXZlQ2hhciwgdHJ1ZSwgY2Jcblx0XHRlbHNlXG5cdFx0XHRsb25nZXN0Q2hhcklkeCA9IEBfZ2V0TG9uZ2VzdENoYXJEdXJhdGlvbiB3b3JkLmNoYXJzXG5cdFx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cdFx0XHRcdGFyZ3MgPSBbIHdvcmQuY2hhcnMsIGksIGZhbHNlIF1cblx0XHRcdFx0aWYgaSBpcyBsb25nZXN0Q2hhcklkeCB0aGVuIGFyZ3MucHVzaCBjYlxuXHRcdFx0XHRAX2FuaW1hdGVDaGFyLmFwcGx5IEAsIGFyZ3NcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVDaGFyIDogKGNoYXJzLCBpZHgsIHJlY3Vyc2UsIGNiKSA9PlxuXG5cdFx0Y2hhciA9IGNoYXJzW2lkeF1cblxuXHRcdGlmIHJlY3Vyc2VcblxuXHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyLCA9PlxuXG5cdFx0XHRcdGlmIGlkeCBpcyBjaGFycy5sZW5ndGgtMVxuXHRcdFx0XHRcdEBfYW5pbWF0ZUNoYXJzRG9uZSBjYlxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0QF9hbmltYXRlQ2hhciBjaGFycywgaWR4KzEsIHJlY3Vyc2UsIGNiXG5cblx0XHRlbHNlXG5cblx0XHRcdGlmIHR5cGVvZiBjYiBpcyAnZnVuY3Rpb24nXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgPT4gQF9hbmltYXRlQ2hhcnNEb25lIGNiXG5cdFx0XHRlbHNlXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhclxuXG5cdFx0bnVsbFxuXG5cdEBfYW5pbWF0ZVdyb25nQ2hhcnMgOiAoY2hhciwgY2IpID0+XG5cblx0XHRpZiBjaGFyLndyb25nQ2hhcnMubGVuZ3RoXG5cblx0XHRcdHdyb25nQ2hhciA9IGNoYXIud3JvbmdDaGFycy5zaGlmdCgpXG5cblx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0Y2hhci4kZWwuaHRtbCB3cm9uZ0NoYXIuY2hhclxuXG5cdFx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsIGNiXG5cdFx0XHRcdCwgd3JvbmdDaGFyLm91dERlbGF5XG5cblx0XHRcdCwgd3JvbmdDaGFyLmluRGVsYXlcblxuXHRcdGVsc2VcblxuXHRcdFx0Y2hhci4kZWxcblx0XHRcdFx0LmF0dHIoJ2RhdGEtY29kZXRleHQtY2hhci1zdGF0ZScsIGNoYXIuY2hhclN0YXRlKVxuXHRcdFx0XHQuaHRtbChjaGFyLnRhcmdldENoYXIpXG5cblx0XHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlQ2hhcnNEb25lIDogKGNiKSA9PlxuXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRAX3N1cHBsYW50U3RyaW5nIDogKHN0ciwgdmFscykgPT5cblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSAve3sgKFtee31dKikgfX0vZywgKGEsIGIpID0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdEB0byA6ICh0YXJnZXRUZXh0LCAkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAdG8odGFyZ2V0VGV4dCwgXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXHRcdHdvcmQudmlzaWJsZSA9IHRydWVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgdGFyZ2V0VGV4dCwgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAaW4gOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQGluKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHR3b3JkLnZpc2libGUgPSB0cnVlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdyaWdodCcsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QG91dCA6ICgkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAb3V0KF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0d29yZC52aXNpYmxlID0gZmFsc2VcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ2VtcHR5JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHNjcmFtYmxlKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICd3cm9uZycsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QHVuc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHVuc2NyYW1ibGUoXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ3JpZ2h0JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAcHJlcGFyZSA6ICgkZWwsIGluaXRpYWxTdGF0ZSkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAcHJlcGFyZShfJGVsLCBpbml0aWFsU3RhdGUpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0QF9nZXRXb3JkRnJvbUNhY2hlICRlbCwgaW5pdGlhbFN0YXRlXG5cblx0XHRudWxsXG5cblx0QGdldFNjcmFtYmxlZFdvcmQgOiAod29yZCkgPT5cblxuXHRcdG5ld0NoYXJzID0gW11cblx0XHQobmV3Q2hhcnMucHVzaCBAX2dldFJhbmRvbUNoYXIoKSkgZm9yIGNoYXIgaW4gd29yZC5zcGxpdCgnJylcblxuXHRcdHJldHVybiBuZXdDaGFycy5qb2luKCcnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVXb3JkVHJhbnNpdGlvbmVyXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkZhY2Vib29rIFNESyB3cmFwcGVyIC0gbG9hZCBhc3luY2hyb25vdXNseSwgc29tZSBoZWxwZXIgbWV0aG9kc1xuXG4jIyNcbmNsYXNzIEZhY2Vib29rIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgICAgIDogJy8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvYWxsLmpzJ1xuXG5cdEBwZXJtaXNzaW9ucyA6ICdlbWFpbCdcblxuXHRAJGRhdGFEZmQgICAgOiBudWxsXG5cdEBsb2FkZWQgICAgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEZCLmluaXRcblx0XHRcdGFwcElkICA6IHdpbmRvdy5jb25maWcuZmJfYXBwX2lkXG5cdFx0XHRzdGF0dXMgOiBmYWxzZVxuXHRcdFx0eGZibWwgIDogZmFsc2VcblxuXHRcdG51bGxcblxuXHRAbG9naW4gOiAoQCRkYXRhRGZkKSA9PlxuXG5cdFx0aWYgIUBsb2FkZWQgdGhlbiByZXR1cm4gQCRkYXRhRGZkLnJlamVjdCAnU0RLIG5vdCBsb2FkZWQnXG5cblx0XHRGQi5sb2dpbiAoIHJlcyApID0+XG5cblx0XHRcdGlmIHJlc1snc3RhdHVzJ10gaXMgJ2Nvbm5lY3RlZCdcblx0XHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYXV0aFJlc3BvbnNlJ11bJ2FjY2Vzc1Rva2VuJ11cblx0XHRcdGVsc2Vcblx0XHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnbm8gd2F5IGpvc2UnXG5cblx0XHQsIHsgc2NvcGU6IEBwZXJtaXNzaW9ucyB9XG5cblx0XHRudWxsXG5cblx0QGdldFVzZXJEYXRhIDogKHRva2VuKSA9PlxuXG5cdFx0dXNlckRhdGEgPSB7fVxuXHRcdHVzZXJEYXRhLmFjY2Vzc190b2tlbiA9IHRva2VuXG5cblx0XHQkbWVEZmQgICA9ICQuRGVmZXJyZWQoKVxuXHRcdCRwaWNEZmQgID0gJC5EZWZlcnJlZCgpXG5cblx0XHRGQi5hcGkgJy9tZScsIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLmZ1bGxfbmFtZSA9IHJlcy5uYW1lXG5cdFx0XHR1c2VyRGF0YS5zb2NpYWxfaWQgPSByZXMuaWRcblx0XHRcdHVzZXJEYXRhLmVtYWlsICAgICA9IHJlcy5lbWFpbCBvciBmYWxzZVxuXHRcdFx0JG1lRGZkLnJlc29sdmUoKVxuXG5cdFx0RkIuYXBpICcvbWUvcGljdHVyZScsIHsgJ3dpZHRoJzogJzIwMCcgfSwgKHJlcykgLT5cblxuXHRcdFx0dXNlckRhdGEucHJvZmlsZV9waWMgPSByZXMuZGF0YS51cmxcblx0XHRcdCRwaWNEZmQucmVzb2x2ZSgpXG5cblx0XHQkLndoZW4oJG1lRGZkLCAkcGljRGZkKS5kb25lID0+IEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cblx0QHNoYXJlIDogKG9wdHMsIGNiKSA9PlxuXG5cdFx0RkIudWkge1xuXHRcdFx0bWV0aG9kICAgICAgOiBvcHRzLm1ldGhvZCBvciAnZmVlZCdcblx0XHRcdG5hbWUgICAgICAgIDogb3B0cy5uYW1lIG9yICcnXG5cdFx0XHRsaW5rICAgICAgICA6IG9wdHMubGluayBvciAnJ1xuXHRcdFx0cGljdHVyZSAgICAgOiBvcHRzLnBpY3R1cmUgb3IgJydcblx0XHRcdGNhcHRpb24gICAgIDogb3B0cy5jYXB0aW9uIG9yICcnXG5cdFx0XHRkZXNjcmlwdGlvbiA6IG9wdHMuZGVzY3JpcHRpb24gb3IgJydcblx0XHR9LCAocmVzcG9uc2UpIC0+XG5cdFx0XHRjYj8ocmVzcG9uc2UpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZWJvb2tcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuXG4jIyNcblxuR29vZ2xlKyBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBHb29nbGVQbHVzIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgIDogJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudDpwbHVzb25lLmpzJ1xuXG5cdEBwYXJhbXMgICA6XG5cdFx0J2NsaWVudGlkJyAgICAgOiBudWxsXG5cdFx0J2NhbGxiYWNrJyAgICAgOiBudWxsXG5cdFx0J3Njb3BlJyAgICAgICAgOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5lbWFpbCdcblx0XHQnY29va2llcG9saWN5JyA6ICdub25lJ1xuXG5cdEAkZGF0YURmZCA6IG51bGxcblx0QGxvYWRlZCAgIDogZmFsc2VcblxuXHRAbG9hZCA6ID0+XG5cblx0XHQjIyNcblx0XHRUTyBET1xuXHRcdGluY2x1ZGUgc2NyaXB0IGxvYWRlciB3aXRoIGNhbGxiYWNrIHRvIDppbml0XG5cdFx0IyMjXG5cdFx0IyByZXF1aXJlIFtAdXJsXSwgQGluaXRcblxuXHRcdG51bGxcblxuXHRAaW5pdCA6ID0+XG5cblx0XHRAbG9hZGVkID0gdHJ1ZVxuXG5cdFx0QHBhcmFtc1snY2xpZW50aWQnXSA9IHdpbmRvdy5jb25maWcuZ3BfYXBwX2lkXG5cdFx0QHBhcmFtc1snY2FsbGJhY2snXSA9IEBsb2dpbkNhbGxiYWNrXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmIEBsb2FkZWRcblx0XHRcdGdhcGkuYXV0aC5zaWduSW4gQHBhcmFtc1xuXHRcdGVsc2Vcblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbkNhbGxiYWNrIDogKHJlcykgPT5cblxuXHRcdGlmIHJlc1snc3RhdHVzJ11bJ3NpZ25lZF9pbiddXG5cdFx0XHRAZ2V0VXNlckRhdGEgcmVzWydhY2Nlc3NfdG9rZW4nXVxuXHRcdGVsc2UgaWYgcmVzWydlcnJvciddWydhY2Nlc3NfZGVuaWVkJ11cblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdGdhcGkuY2xpZW50LmxvYWQgJ3BsdXMnLCd2MScsID0+XG5cblx0XHRcdHJlcXVlc3QgPSBnYXBpLmNsaWVudC5wbHVzLnBlb3BsZS5nZXQgJ3VzZXJJZCc6ICdtZSdcblx0XHRcdHJlcXVlc3QuZXhlY3V0ZSAocmVzKSA9PlxuXG5cdFx0XHRcdHVzZXJEYXRhID1cblx0XHRcdFx0XHRhY2Nlc3NfdG9rZW4gOiB0b2tlblxuXHRcdFx0XHRcdGZ1bGxfbmFtZSAgICA6IHJlcy5kaXNwbGF5TmFtZVxuXHRcdFx0XHRcdHNvY2lhbF9pZCAgICA6IHJlcy5pZFxuXHRcdFx0XHRcdGVtYWlsICAgICAgICA6IGlmIHJlcy5lbWFpbHNbMF0gdGhlbiByZXMuZW1haWxzWzBdLnZhbHVlIGVsc2UgZmFsc2Vcblx0XHRcdFx0XHRwcm9maWxlX3BpYyAgOiByZXMuaW1hZ2UudXJsXG5cblx0XHRcdFx0QCRkYXRhRGZkLnJlc29sdmUgdXNlckRhdGFcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVQbHVzXG4iLCIjICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jICAgTWVkaWEgUXVlcmllcyBNYW5hZ2VyIFxuIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIFxuIyAgIEBhdXRob3IgOiBGw6FiaW8gQXpldmVkbyA8ZmFiaW8uYXpldmVkb0B1bml0OS5jb20+IFVOSVQ5XG4jICAgQGRhdGUgICA6IFNlcHRlbWJlciAxNFxuIyAgIFxuIyAgIEluc3RydWN0aW9ucyBhcmUgb24gL3Byb2plY3Qvc2Fzcy91dGlscy9fcmVzcG9uc2l2ZS5zY3NzLlxuXG5jbGFzcyBNZWRpYVF1ZXJpZXNcblxuICAgICMgQnJlYWtwb2ludHNcbiAgICBAU01BTEwgICAgICAgOiBcInNtYWxsXCJcbiAgICBASVBBRCAgICAgICAgOiBcImlwYWRcIlxuICAgIEBNRURJVU0gICAgICA6IFwibWVkaXVtXCJcbiAgICBATEFSR0UgICAgICAgOiBcImxhcmdlXCJcbiAgICBARVhUUkFfTEFSR0UgOiBcImV4dHJhLWxhcmdlXCJcblxuICAgIEBzZXR1cCA6ID0+XG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLlNNQUxMX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiU21hbGxcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuU01BTExdfVxuICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlQgPSB7bmFtZTogXCJNZWRpdW1cIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuTUVESVVNXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLkxBUkdFX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiTGFyZ2VcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuSVBBRCwgTWVkaWFRdWVyaWVzLkxBUkdFLCBNZWRpYVF1ZXJpZXMuRVhUUkFfTEFSR0VdfVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUyA9IFtcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlRcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UXG4gICAgICAgIF1cbiAgICAgICAgcmV0dXJuXG5cbiAgICBAZ2V0RGV2aWNlU3RhdGUgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBcImFmdGVyXCIpLmdldFByb3BlcnR5VmFsdWUoXCJjb250ZW50XCIpO1xuXG4gICAgQGdldEJyZWFrcG9pbnQgOiA9PlxuXG4gICAgICAgIHN0YXRlID0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcblxuICAgICAgICBmb3IgaSBpbiBbMC4uLk1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUy5sZW5ndGhdXG4gICAgICAgICAgICBpZiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0uYnJlYWtwb2ludHMuaW5kZXhPZihzdGF0ZSkgPiAtMVxuICAgICAgICAgICAgICAgIHJldHVybiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0ubmFtZVxuXG4gICAgICAgIHJldHVybiBcIlwiXG5cbiAgICBAaXNCcmVha3BvaW50IDogKGJyZWFrcG9pbnQpID0+XG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5icmVha3BvaW50LmJyZWFrcG9pbnRzLmxlbmd0aF1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgYnJlYWtwb2ludC5icmVha3BvaW50c1tpXSA9PSBNZWRpYVF1ZXJpZXMuZ2V0RGV2aWNlU3RhdGUoKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbndpbmRvdy5NZWRpYVF1ZXJpZXMgPSBNZWRpYVF1ZXJpZXNcblxubW9kdWxlLmV4cG9ydHMgPSBNZWRpYVF1ZXJpZXNcbiIsImNsYXNzIE51bWJlclV0aWxzXG5cbiAgICBATUFUSF9DT1M6IE1hdGguY29zIFxuICAgIEBNQVRIX1NJTjogTWF0aC5zaW4gXG4gICAgQE1BVEhfUkFORE9NOiBNYXRoLnJhbmRvbSBcbiAgICBATUFUSF9BQlM6IE1hdGguYWJzXG4gICAgQE1BVEhfQVRBTjI6IE1hdGguYXRhbjJcblxuICAgIEBsaW1pdDoobnVtYmVyLCBtaW4sIG1heCktPlxuICAgICAgICByZXR1cm4gTWF0aC5taW4oIE1hdGgubWF4KG1pbixudW1iZXIpLCBtYXggKVxuXG4gICAgQGdldFJhbmRvbUNvbG9yOiAtPlxuXG4gICAgICAgIGxldHRlcnMgPSAnMDEyMzQ1Njc4OUFCQ0RFRicuc3BsaXQoJycpXG4gICAgICAgIGNvbG9yID0gJyMnXG4gICAgICAgIGZvciBpIGluIFswLi4uNl1cbiAgICAgICAgICAgIGNvbG9yICs9IGxldHRlcnNbTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTUpXVxuICAgICAgICBjb2xvclxuXG4gICAgQGdldFRpbWVTdGFtcERpZmYgOiAoZGF0ZTEsIGRhdGUyKSAtPlxuXG4gICAgICAgICMgR2V0IDEgZGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAgICBvbmVfZGF5ID0gMTAwMCo2MCo2MCoyNFxuICAgICAgICB0aW1lICAgID0ge31cblxuICAgICAgICAjIENvbnZlcnQgYm90aCBkYXRlcyB0byBtaWxsaXNlY29uZHNcbiAgICAgICAgZGF0ZTFfbXMgPSBkYXRlMS5nZXRUaW1lKClcbiAgICAgICAgZGF0ZTJfbXMgPSBkYXRlMi5nZXRUaW1lKClcblxuICAgICAgICAjIENhbGN1bGF0ZSB0aGUgZGlmZmVyZW5jZSBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRhdGUyX21zIC0gZGF0ZTFfbXNcblxuICAgICAgICAjIHRha2Ugb3V0IG1pbGxpc2Vjb25kc1xuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy8xMDAwXG4gICAgICAgIHRpbWUuc2Vjb25kcyAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMgJSA2MClcblxuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy82MCBcbiAgICAgICAgdGltZS5taW51dGVzICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcyAlIDYwKVxuXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkaWZmZXJlbmNlX21zLzYwIFxuICAgICAgICB0aW1lLmhvdXJzICAgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zICUgMjQpICBcblxuICAgICAgICB0aW1lLmRheXMgICAgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zLzI0KVxuXG4gICAgICAgIHRpbWVcblxuICAgIEBtYXA6ICggbnVtLCBtaW4xLCBtYXgxLCBtaW4yLCBtYXgyLCByb3VuZCA9IGZhbHNlLCBjb25zdHJhaW5NaW4gPSB0cnVlLCBjb25zdHJhaW5NYXggPSB0cnVlICkgLT5cbiAgICAgICAgaWYgY29uc3RyYWluTWluIGFuZCBudW0gPCBtaW4xIHRoZW4gcmV0dXJuIG1pbjJcbiAgICAgICAgaWYgY29uc3RyYWluTWF4IGFuZCBudW0gPiBtYXgxIHRoZW4gcmV0dXJuIG1heDJcbiAgICAgICAgXG4gICAgICAgIG51bTEgPSAobnVtIC0gbWluMSkgLyAobWF4MSAtIG1pbjEpXG4gICAgICAgIG51bTIgPSAobnVtMSAqIChtYXgyIC0gbWluMikpICsgbWluMlxuICAgICAgICBpZiByb3VuZCB0aGVuIHJldHVybiBNYXRoLnJvdW5kKG51bTIpXG5cbiAgICAgICAgcmV0dXJuIG51bTJcblxuICAgIEB0b1JhZGlhbnM6ICggZGVncmVlICkgLT5cbiAgICAgICAgcmV0dXJuIGRlZ3JlZSAqICggTWF0aC5QSSAvIDE4MCApXG5cbiAgICBAdG9EZWdyZWU6ICggcmFkaWFucyApIC0+XG4gICAgICAgIHJldHVybiByYWRpYW5zICogKCAxODAgLyBNYXRoLlBJIClcblxuICAgIEBpc0luUmFuZ2U6ICggbnVtLCBtaW4sIG1heCwgY2FuQmVFcXVhbCApIC0+XG4gICAgICAgIGlmIGNhbkJlRXF1YWwgdGhlbiByZXR1cm4gbnVtID49IG1pbiAmJiBudW0gPD0gbWF4XG4gICAgICAgIGVsc2UgcmV0dXJuIG51bSA+PSBtaW4gJiYgbnVtIDw9IG1heFxuXG4gICAgIyBjb252ZXJ0IG1ldHJlcyBpbiB0byBtIC8gS01cbiAgICBAZ2V0TmljZURpc3RhbmNlOiAobWV0cmVzKSA9PlxuXG4gICAgICAgIGlmIG1ldHJlcyA8IDEwMDBcblxuICAgICAgICAgICAgcmV0dXJuIFwiI3tNYXRoLnJvdW5kKG1ldHJlcyl9TVwiXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBrbSA9IChtZXRyZXMvMTAwMCkudG9GaXhlZCgyKVxuICAgICAgICAgICAgcmV0dXJuIFwiI3trbX1LTVwiXG5cbiAgICAjIGZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTI2NzMzOFxuICAgIEB6ZXJvRmlsbDogKCBudW1iZXIsIHdpZHRoICkgPT5cblxuICAgICAgICB3aWR0aCAtPSBudW1iZXIudG9TdHJpbmcoKS5sZW5ndGhcblxuICAgICAgICBpZiB3aWR0aCA+IDBcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXJyYXkoIHdpZHRoICsgKC9cXC4vLnRlc3QoIG51bWJlciApID8gMiA6IDEpICkuam9pbiggJzAnICkgKyBudW1iZXJcblxuICAgICAgICByZXR1cm4gbnVtYmVyICsgXCJcIiAjIGFsd2F5cyByZXR1cm4gYSBzdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJVdGlsc1xuIiwiIyMjXG4jIFJlcXVlc3RlciAjXG5cbldyYXBwZXIgZm9yIGAkLmFqYXhgIGNhbGxzXG5cbiMjI1xuY2xhc3MgUmVxdWVzdGVyXG5cbiAgICBAcmVxdWVzdHMgOiBbXVxuXG4gICAgQHJlcXVlc3Q6ICggZGF0YSApID0+XG4gICAgICAgICMjI1xuICAgICAgICBgZGF0YSA9IHtgPGJyPlxuICAgICAgICBgICB1cmwgICAgICAgICA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGAgIHR5cGUgICAgICAgIDogXCJQT1NUL0dFVC9QVVRcImA8YnI+XG4gICAgICAgIGAgIGRhdGEgICAgICAgIDogT2JqZWN0YDxicj5cbiAgICAgICAgYCAgZGF0YVR5cGUgICAgOiBqUXVlcnkgZGF0YVR5cGVgPGJyPlxuICAgICAgICBgICBjb250ZW50VHlwZSA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGB9YFxuICAgICAgICAjIyNcblxuICAgICAgICByID0gJC5hamF4IHtcblxuICAgICAgICAgICAgdXJsICAgICAgICAgOiBkYXRhLnVybFxuICAgICAgICAgICAgdHlwZSAgICAgICAgOiBpZiBkYXRhLnR5cGUgdGhlbiBkYXRhLnR5cGUgZWxzZSBcIlBPU1RcIixcbiAgICAgICAgICAgIGRhdGEgICAgICAgIDogaWYgZGF0YS5kYXRhIHRoZW4gZGF0YS5kYXRhIGVsc2UgbnVsbCxcbiAgICAgICAgICAgIGRhdGFUeXBlICAgIDogaWYgZGF0YS5kYXRhVHlwZSB0aGVuIGRhdGEuZGF0YVR5cGUgZWxzZSBcImpzb25cIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlIDogaWYgZGF0YS5jb250ZW50VHlwZSB0aGVuIGRhdGEuY29udGVudFR5cGUgZWxzZSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOFwiLFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGEgOiBpZiBkYXRhLnByb2Nlc3NEYXRhICE9IG51bGwgYW5kIGRhdGEucHJvY2Vzc0RhdGEgIT0gdW5kZWZpbmVkIHRoZW4gZGF0YS5wcm9jZXNzRGF0YSBlbHNlIHRydWVcblxuICAgICAgICB9XG5cbiAgICAgICAgci5kb25lIGRhdGEuZG9uZVxuICAgICAgICByLmZhaWwgZGF0YS5mYWlsXG4gICAgICAgIFxuICAgICAgICByXG5cbiAgICBAYWRkSW1hZ2UgOiAoZGF0YSwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgIyMjXG4gICAgICAgICoqIFVzYWdlOiA8YnI+XG4gICAgICAgIGBkYXRhID0gY2FudmFzcy50b0RhdGFVUkwoXCJpbWFnZS9qcGVnXCIpLnNsaWNlKFwiZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCxcIi5sZW5ndGgpYDxicj5cbiAgICAgICAgYFJlcXVlc3Rlci5hZGRJbWFnZSBkYXRhLCBcInpvZXRyb3BlXCIsIEBkb25lLCBAZmFpbGBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nXG4gICAgICAgICAgICB0eXBlICAgOiAnUE9TVCdcbiAgICAgICAgICAgIGRhdGEgICA6IHtpbWFnZV9iYXNlNjQgOiBlbmNvZGVVUkkoZGF0YSl9XG4gICAgICAgICAgICBkb25lICAgOiBkb25lXG4gICAgICAgICAgICBmYWlsICAgOiBmYWlsXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQGRlbGV0ZUltYWdlIDogKGlkLCBkb25lLCBmYWlsKSA9PlxuICAgICAgICBcbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nK2lkXG4gICAgICAgICAgICB0eXBlICAgOiAnREVMRVRFJ1xuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0ZXJcbiIsIiMjI1xuU2hhcmluZyBjbGFzcyBmb3Igbm9uLVNESyBsb2FkZWQgc29jaWFsIG5ldHdvcmtzLlxuSWYgU0RLIGlzIGxvYWRlZCwgYW5kIHByb3ZpZGVzIHNoYXJlIG1ldGhvZHMsIHRoZW4gdXNlIHRoYXQgY2xhc3MgaW5zdGVhZCwgZWcuIGBGYWNlYm9vay5zaGFyZWAgaW5zdGVhZCBvZiBgU2hhcmUuZmFjZWJvb2tgXG4jIyNcbmNsYXNzIFNoYXJlXG5cbiAgICB1cmwgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IC0+XG5cbiAgICAgICAgQHVybCA9IEBDRCgpLkJBU0VfVVJMXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIG9wZW5XaW4gOiAodXJsLCB3LCBoKSA9PlxuXG4gICAgICAgIGxlZnQgPSAoIHNjcmVlbi5hdmFpbFdpZHRoICAtIHcgKSA+PiAxXG4gICAgICAgIHRvcCAgPSAoIHNjcmVlbi5hdmFpbEhlaWdodCAtIGggKSA+PiAxXG5cbiAgICAgICAgd2luZG93Lm9wZW4gdXJsLCAnJywgJ3RvcD0nK3RvcCsnLGxlZnQ9JytsZWZ0Kycsd2lkdGg9Jyt3KycsaGVpZ2h0PScraCsnLGxvY2F0aW9uPW5vLG1lbnViYXI9bm8nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcGx1cyA6ICggdXJsICkgPT5cblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwczovL3BsdXMuZ29vZ2xlLmNvbS9zaGFyZT91cmw9I3t1cmx9XCIsIDY1MCwgMzg1XG5cbiAgICAgICAgbnVsbFxuXG4gICAgcGludGVyZXN0IDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnBpbnRlcmVzdC5jb20vcGluL2NyZWF0ZS9idXR0b24vP3VybD0je3VybH0mbWVkaWE9I3ttZWRpYX0mZGVzY3JpcHRpb249I3tkZXNjcn1cIiwgNzM1LCAzMTBcblxuICAgICAgICBudWxsXG5cbiAgICB0dW1ibHIgOiAodXJsLCBtZWRpYSwgZGVzY3IpID0+XG5cbiAgICAgICAgdXJsICAgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG4gICAgICAgIG1lZGlhID0gZW5jb2RlVVJJQ29tcG9uZW50KG1lZGlhKVxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChkZXNjcilcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cudHVtYmxyLmNvbS9zaGFyZS9waG90bz9zb3VyY2U9I3ttZWRpYX0mY2FwdGlvbj0je2Rlc2NyfSZjbGlja190aHJ1PSN7dXJsfVwiLCA0NTAsIDQzMFxuXG4gICAgICAgIG51bGxcblxuICAgIGZhY2Vib29rIDogKCB1cmwgLCBjb3B5ID0gJycpID0+IFxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBkZWNzciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5mYWNlYm9vay5jb20vc2hhcmUucGhwP3U9I3t1cmx9JnQ9I3tkZWNzcn1cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICB0d2l0dGVyIDogKCB1cmwgLCBjb3B5ID0gJycpID0+XG5cbiAgICAgICAgdXJsICAgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG4gICAgICAgIGlmIGNvcHkgaXMgJydcbiAgICAgICAgICAgIGNvcHkgPSBAQ0QoKS5sb2NhbGUuZ2V0ICdzZW9fdHdpdHRlcl9jYXJkX2Rlc2NyaXB0aW9uJ1xuICAgICAgICAgICAgXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGNvcHkpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vdHdpdHRlci5jb20vaW50ZW50L3R3ZWV0Lz90ZXh0PSN7ZGVzY3J9JnVybD0je3VybH1cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICByZW5yZW4gOiAoIHVybCApID0+IFxuXG4gICAgICAgIHVybCA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly9zaGFyZS5yZW5yZW4uY29tL3NoYXJlL2J1dHRvbnNoYXJlLmRvP2xpbms9XCIgKyB1cmwsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgd2VpYm8gOiAoIHVybCApID0+IFxuXG4gICAgICAgIHVybCA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly9zZXJ2aWNlLndlaWJvLmNvbS9zaGFyZS9zaGFyZS5waHA/dXJsPSN7dXJsfSZsYW5ndWFnZT16aF9jblwiLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIENEIDogPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gU2hhcmVcbiIsImNsYXNzIEFic3RyYWN0VmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuXHRlbCAgICAgICAgICAgOiBudWxsXG5cdGlkICAgICAgICAgICA6IG51bGxcblx0Y2hpbGRyZW4gICAgIDogbnVsbFxuXHR0ZW1wbGF0ZSAgICAgOiBudWxsXG5cdHRlbXBsYXRlVmFycyA6IG51bGxcblx0XG5cdGluaXRpYWxpemUgOiAtPlxuXHRcdFxuXHRcdEBjaGlsZHJlbiA9IFtdXG5cblx0XHRpZiBAdGVtcGxhdGVcblx0XHRcdHRtcEhUTUwgPSBfLnRlbXBsYXRlIEBDRCgpLnRlbXBsYXRlcy5nZXQgQHRlbXBsYXRlXG5cdFx0XHRAc2V0RWxlbWVudCB0bXBIVE1MIEB0ZW1wbGF0ZVZhcnNcblxuXHRcdEAkZWwuYXR0ciAnaWQnLCBAaWQgaWYgQGlkXG5cdFx0QCRlbC5hZGRDbGFzcyBAY2xhc3NOYW1lIGlmIEBjbGFzc05hbWVcblx0XHRcblx0XHRAaW5pdCgpXG5cblx0XHRAcGF1c2VkID0gZmFsc2VcblxuXHRcdG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHR1cGRhdGUgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdHJlbmRlciA6ID0+XG5cblx0XHRudWxsXG5cblx0YWRkQ2hpbGQgOiAoY2hpbGQsIHByZXBlbmQgPSBmYWxzZSkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0dGFyZ2V0ID0gaWYgQGFkZFRvU2VsZWN0b3IgdGhlbiBAJGVsLmZpbmQoQGFkZFRvU2VsZWN0b3IpLmVxKDApIGVsc2UgQCRlbFxuXHRcdFxuXHRcdGMgPSBpZiBjaGlsZC5lbCB0aGVuIGNoaWxkLiRlbCBlbHNlIGNoaWxkXG5cblx0XHRpZiAhcHJlcGVuZCBcblx0XHRcdHRhcmdldC5hcHBlbmQgY1xuXHRcdGVsc2UgXG5cdFx0XHR0YXJnZXQucHJlcGVuZCBjXG5cblx0XHRAXG5cblx0cmVwbGFjZSA6IChkb20sIGNoaWxkKSA9PlxuXG5cdFx0QGNoaWxkcmVuLnB1c2ggY2hpbGQgaWYgY2hpbGQuZWxcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXHRcdEAkZWwuY2hpbGRyZW4oZG9tKS5yZXBsYWNlV2l0aChjKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZSA6IChjaGlsZCkgPT5cblxuXHRcdHVubGVzcyBjaGlsZD9cblx0XHRcdHJldHVyblxuXHRcdFxuXHRcdGMgPSBpZiBjaGlsZC5lbCB0aGVuIGNoaWxkLiRlbCBlbHNlICQoY2hpbGQpXG5cdFx0Y2hpbGQuZGlzcG9zZSgpIGlmIGMgYW5kIGNoaWxkLmRpc3Bvc2VcblxuXHRcdGlmIGMgJiYgQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpICE9IC0xXG5cdFx0XHRAY2hpbGRyZW4uc3BsaWNlKCBAY2hpbGRyZW4uaW5kZXhPZihjaGlsZCksIDEgKVxuXG5cdFx0Yy5yZW1vdmUoKVxuXG5cdFx0bnVsbFxuXG5cdG9uUmVzaXplIDogKGV2ZW50KSA9PlxuXG5cdFx0KGlmIGNoaWxkLm9uUmVzaXplIHRoZW4gY2hpbGQub25SZXNpemUoKSkgZm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdG1vdXNlRW5hYmxlZCA6ICggZW5hYmxlZCApID0+XG5cblx0XHRAJGVsLmNzc1xuXHRcdFx0XCJwb2ludGVyLWV2ZW50c1wiOiBpZiBlbmFibGVkIHRoZW4gXCJhdXRvXCIgZWxzZSBcIm5vbmVcIlxuXG5cdFx0bnVsbFxuXG5cdENTU1RyYW5zbGF0ZSA6ICh4LCB5LCB2YWx1ZT0nJScsIHNjYWxlKSA9PlxuXG5cdFx0aWYgTW9kZXJuaXpyLmNzc3RyYW5zZm9ybXMzZFxuXHRcdFx0c3RyID0gXCJ0cmFuc2xhdGUzZCgje3grdmFsdWV9LCAje3krdmFsdWV9LCAwKVwiXG5cdFx0ZWxzZVxuXHRcdFx0c3RyID0gXCJ0cmFuc2xhdGUoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSlcIlxuXG5cdFx0aWYgc2NhbGUgdGhlbiBzdHIgPSBcIiN7c3RyfSBzY2FsZSgje3NjYWxlfSlcIlxuXG5cdFx0c3RyXG5cblx0dW5NdXRlQWxsIDogPT5cblxuXHRcdGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGQudW5NdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLnVuTXV0ZUFsbCgpXG5cblx0XHRudWxsXG5cblx0bXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLm11dGU/KClcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0Y2hpbGQubXV0ZUFsbCgpXG5cblx0XHRudWxsXG5cblx0cmVtb3ZlQWxsQ2hpbGRyZW46ID0+XG5cblx0XHRAcmVtb3ZlIGNoaWxkIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHR0cmlnZ2VyQ2hpbGRyZW4gOiAobXNnLCBjaGlsZHJlbj1AY2hpbGRyZW4pID0+XG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGQudHJpZ2dlciBtc2dcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0QHRyaWdnZXJDaGlsZHJlbiBtc2csIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0Y2FsbENoaWxkcmVuIDogKG1ldGhvZCwgcGFyYW1zLCBjaGlsZHJlbj1AY2hpbGRyZW4pID0+XG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0Y2FsbENoaWxkcmVuQW5kU2VsZiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0QFttZXRob2RdPyBwYXJhbXNcblxuXHRcdGZvciBjaGlsZCwgaSBpbiBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZFttZXRob2RdPyBwYXJhbXNcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0QGNhbGxDaGlsZHJlbiBtZXRob2QsIHBhcmFtcywgY2hpbGQuY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRzdXBwbGFudFN0cmluZyA6IChzdHIsIHZhbHMsIGFsbG93U3BhY2VzPXRydWUpIC0+XG5cblx0XHRyZSA9IGlmIGFsbG93U3BhY2VzIHRoZW4gbmV3IFJlZ0V4cCgne3sgKFtee31dKikgfX0nLCAnZycpIGVsc2UgbmV3IFJlZ0V4cCgne3soW157fV0qKX19JywgJ2cnKVxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIHJlLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdXG5cdFx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHQjIyNcblx0XHRvdmVycmlkZSBvbiBwZXIgdmlldyBiYXNpcyAtIHVuYmluZCBldmVudCBoYW5kbGVycyBldGNcblx0XHQjIyNcblxuXHRcdG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RWaWV3UGFnZSBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdF9zaG93biAgICAgOiBmYWxzZVxuXHRfbGlzdGVuaW5nIDogZmFsc2VcblxuXHRzaG93IDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyAhQF9zaG93blxuXHRcdEBfc2hvd24gPSB0cnVlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIuYWRkQ2hpbGQgQFxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb24nXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICd2aXNpYmxlJ1xuXHRcdGNiPygpXG5cblx0XHRpZiBAQ0QoKS5uYXYuY2hhbmdlVmlld0NvdW50IGlzIDFcblx0XHRcdEBDRCgpLmFwcFZpZXcub24gQENEKCkuYXBwVmlldy5FVkVOVF9QUkVMT0FERVJfSElERSwgQGFuaW1hdGVJblxuXHRcdGVsc2Vcblx0XHRcdEBhbmltYXRlSW4oKVxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiAoY2IpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIEBfc2hvd25cblx0XHRAX3Nob3duID0gZmFsc2VcblxuXHRcdCMjI1xuXHRcdENIQU5HRSBIRVJFIC0gJ3BhZ2UnIHZpZXdzIGFyZSBhbHdheXMgaW4gRE9NIC0gdG8gc2F2ZSBoYXZpbmcgdG8gcmUtaW5pdGlhbGlzZSBnbWFwIGV2ZW50cyAoUElUQSkuIE5vIGxvbmdlciByZXF1aXJlIDpkaXNwb3NlIG1ldGhvZFxuXHRcdCMjI1xuXHRcdEBDRCgpLmFwcFZpZXcud3JhcHBlci5yZW1vdmUgQFxuXG5cdFx0IyBAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29mZidcblxuXHRcdCMjIyByZXBsYWNlIHdpdGggc29tZSBwcm9wZXIgdHJhbnNpdGlvbiBpZiB3ZSBjYW4gIyMjXG5cdFx0QCRlbC5jc3MgJ3Zpc2liaWxpdHknIDogJ2hpZGRlbidcblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0QGNhbGxDaGlsZHJlbkFuZFNlbGYgJ3NldExpc3RlbmVycycsICdvZmYnXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIHNldHRpbmcgaXNudCBAX2xpc3RlbmluZ1xuXHRcdEBfbGlzdGVuaW5nID0gc2V0dGluZ1xuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHQjIyNcblx0XHRzdHViYmVkIGhlcmUsIG92ZXJyaWRlIGluIHVzZWQgcGFnZSBjbGFzc2VzXG5cdFx0IyMjXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3UGFnZVxuIiwiQWJzdHJhY3RWaWV3UGFnZSAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5Db250cmlidXRvcnNDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vLi4vY29sbGVjdGlvbnMvY29udHJpYnV0b3JzL0NvbnRyaWJ1dG9yc0NvbGxlY3Rpb24nXG5SZXF1ZXN0ZXIgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvUmVxdWVzdGVyJ1xuQVBJICAgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL2RhdGEvQVBJJ1xuXG5jbGFzcyBBYm91dFBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtYWJvdXQnXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QGNvbnRyaWJ1dG9ycyA9IG5ldyBDb250cmlidXRvcnNDb2xsZWN0aW9uXG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRsYWJlbF93aGF0ICAgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfbGFiZWxfd2hhdFwiXG5cdFx0XHRjb250ZW50X3doYXQgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfY29udGVudF93aGF0XCJcblx0XHRcdGxhYmVsX2NvbnRhY3QgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9sYWJlbF9jb250YWN0XCJcblx0XHRcdGNvbnRlbnRfY29udGFjdCA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9jb250ZW50X2NvbnRhY3RcIlxuXHRcdFx0bGFiZWxfd2hvICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2xhYmVsX3dob1wiXG5cblx0XHRzdXBlclxuXG5cdFx0QGdldENvbnRyaWJ1dG9yc0NvbnRlbnQoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRnZXRDb250cmlidXRvcnNDb250ZW50IDogPT5cblxuXHRcdHIgPSBSZXF1ZXN0ZXIucmVxdWVzdFxuICAgICAgICAgICAgIyB1cmwgIDogQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICAgICAgdXJsICA6IEBDRCgpLkJBU0VfVVJMICsgJy9kYXRhL19EVU1NWS9jb250cmlidXRvcnMuanNvbidcbiAgICAgICAgICAgIHR5cGUgOiAnR0VUJ1xuXG4gICAgICAgIHIuZG9uZSAocmVzKSA9PlxuICAgICAgICBcdEBjb250cmlidXRvcnMuYWRkIHJlcy5jb250cmlidXRvcnNcbiAgICAgICAgXHRAJGVsLmZpbmQoJ1tkYXRhLWNvbnRyaWJ1dG9yc10nKS5odG1sIEBjb250cmlidXRvcnMuZ2V0QWJvdXRIVE1MKClcblxuICAgICAgICByLmZhaWwgKHJlcykgPT4gY29uc29sZS5lcnJvciBcInByb2JsZW0gZ2V0dGluZyB0aGUgY29udHJpYnV0b3JzXCIsIHJlc1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFib3V0UGFnZVZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblxuY2xhc3MgRm9vdGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICB0ZW1wbGF0ZSA6ICdzaXRlLWZvb3RlcidcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEB0ZW1wbGF0ZVZhcnMgPSB7fVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEZvb3RlclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Sb3V0ZXIgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3JvdXRlci9Sb3V0ZXInXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBIZWFkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHR0ZW1wbGF0ZSA6ICdzaXRlLWhlYWRlcidcblxuXHRGSVJTVF9IQVNIQ0hBTkdFIDogdHJ1ZVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPVxuXHRcdFx0aG9tZSAgICA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9sb2dvX2xhYmVsJylcblx0XHRcdFx0dXJsICAgICAgOiBAQ0QoKS5CQVNFX1VSTCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cdFx0XHRhYm91dCA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9hYm91dF9sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVRcblx0XHRcdFx0c2VjdGlvbiAgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVRcblx0XHRcdGNvbnRyaWJ1dGUgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY29udHJpYnV0ZV9sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0XHRzZWN0aW9uICA6IEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFXG5cdFx0XHRjbG9zZV9sYWJlbCA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9jbG9zZV9sYWJlbCcpXG5cdFx0XHRpbmZvX2xhYmVsIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2luZm9fbGFiZWwnKVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0QGJpbmRFdmVudHMoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkbG9nbyAgICAgICAgICAgICAgPSBAJGVsLmZpbmQoJy5sb2dvX19saW5rJylcblx0XHRAJG5hdkxpbmtBYm91dCAgICAgID0gQCRlbC5maW5kKCcuYWJvdXQtYnRuJylcblx0XHRAJG5hdkxpbmtDb250cmlidXRlID0gQCRlbC5maW5kKCcuY29udHJpYnV0ZS1idG4nKVxuXHRcdEAkaW5mb0J0biAgICAgICAgICAgPSBAJGVsLmZpbmQoJy5pbmZvLWJ0bicpXG5cdFx0QCRjbG9zZUJ0biAgICAgICAgICA9IEAkZWwuZmluZCgnLmNsb3NlLWJ0bicpXG5cblx0XHRudWxsXG5cblx0YmluZEV2ZW50cyA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfUFJFTE9BREVSX0hJREUsIEBhbmltYXRlVGV4dEluXG5cdFx0QENEKCkucm91dGVyLm9uIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBvbkhhc2hDaGFuZ2VcblxuXHRcdEAkZWwub24gJ21vdXNlZW50ZXInLCAnW2RhdGEtY29kZXdvcmRdJywgQG9uV29yZEVudGVyXG5cdFx0QCRlbC5vbiAnbW91c2VsZWF2ZScsICdbZGF0YS1jb2Rld29yZF0nLCBAb25Xb3JkTGVhdmVcblxuXHRcdG51bGxcblxuXHRvbkhhc2hDaGFuZ2UgOiAod2hlcmUpID0+XG5cblx0XHRpZiBARklSU1RfSEFTSENIQU5HRVxuXHRcdFx0QEZJUlNUX0hBU0hDSEFOR0UgPSBmYWxzZVxuXHRcdFx0cmV0dXJuXG5cdFx0XG5cdFx0QG9uQXJlYUNoYW5nZSB3aGVyZVxuXG5cdFx0bnVsbFxuXG5cdG9uQXJlYUNoYW5nZSA6IChzZWN0aW9uKSA9PlxuXG5cdFx0Y29sb3VyID0gQGdldFNlY3Rpb25Db2xvdXIgc2VjdGlvblxuXG5cdFx0QCRlbC5hdHRyICdkYXRhLXNlY3Rpb24nLCBzZWN0aW9uXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBAJGxvZ28sIGNvbG91clxuXG5cdFx0IyB0aGlzIGp1c3QgZm9yIHRlc3RpbmcsIHRpZHkgbGF0ZXJcblx0XHRpZiBzZWN0aW9uIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQWJvdXQsIEAkbmF2TGlua0NvbnRyaWJ1dGVdLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRjbG9zZUJ0biwgQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0ZWxzZSBpZiBzZWN0aW9uIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRjbG9zZUJ0biwgQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0ZWxzZSBpZiBzZWN0aW9uIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5BQk9VVFxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0NvbnRyaWJ1dGUsIEAkY2xvc2VCdG5dLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJG5hdkxpbmtBYm91dF0sICdibGFjay13aGl0ZS1iZydcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0ZWxzZSBpZiBzZWN0aW9uIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQWJvdXQsIEAkY2xvc2VCdG5dLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJG5hdkxpbmtDb250cmlidXRlXSwgJ2JsYWNrLXdoaXRlLWJnJ1xuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJGluZm9CdG5dLCBjb2xvdXJcblx0XHRlbHNlXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRjbG9zZUJ0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZSwgQCRpbmZvQnRuXSwgY29sb3VyXG5cblx0XHRudWxsXG5cblx0Z2V0U2VjdGlvbkNvbG91ciA6IChzZWN0aW9uLCB3b3JkU2VjdGlvbj1udWxsKSA9PlxuXG5cdFx0c2VjdGlvbiA9IHNlY3Rpb24gb3IgQENEKCkubmF2LmN1cnJlbnQuYXJlYSBvciAnaG9tZSdcblxuXHRcdGlmIHdvcmRTZWN0aW9uIGFuZCBzZWN0aW9uIGlzIHdvcmRTZWN0aW9uIHRoZW4gcmV0dXJuICdibGFjay13aGl0ZS1iZydcblxuXHRcdGNvbG91ciA9IHN3aXRjaCBzZWN0aW9uXG5cdFx0XHR3aGVuICdob21lJyB0aGVuICdyZWQnXG5cdFx0XHR3aGVuIEBDRCgpLm5hdi5zZWN0aW9ucy5BQk9VVCB0aGVuICd3aGl0ZSdcblx0XHRcdHdoZW4gQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEUgdGhlbiAnd2hpdGUnXG5cdFx0XHRlbHNlICd3aGl0ZSdcblxuXHRcdGNvbG91clxuXG5cdGFuaW1hdGVUZXh0SW4gOiA9PlxuXG5cdFx0QG9uQXJlYUNoYW5nZSBAQ0QoKS5uYXYuY3VycmVudC5hcmVhXG5cblx0XHRudWxsXG5cblx0b25Xb3JkRW50ZXIgOiAoZSkgPT5cblxuXHRcdCRlbCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXHRcdHdvcmRTZWN0aW9uID0gJGVsLmF0dHIoJ2RhdGEtd29yZC1zZWN0aW9uJylcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIobnVsbCwgd29yZFNlY3Rpb24pXG5cblx0XHRudWxsXG5cblx0b25Xb3JkTGVhdmUgOiAoZSkgPT5cblxuXHRcdCRlbCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXHRcdHdvcmRTZWN0aW9uID0gJGVsLmF0dHIoJ2RhdGEtd29yZC1zZWN0aW9uJylcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnVuc2NyYW1ibGUgJGVsLCBAZ2V0U2VjdGlvbkNvbG91cihudWxsLCB3b3JkU2VjdGlvbilcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBIZWFkZXJcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkhvbWVWaWV3ICAgICA9IHJlcXVpcmUgJy4uL2hvbWUvSG9tZVZpZXcnXG5Db2xvcnMgICAgICAgPSByZXF1aXJlICcuLi8uLi9jb25maWcvQ29sb3JzJ1xuXG5jbGFzcyBQYWdlVHJhbnNpdGlvbmVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICB0ZW1wbGF0ZSA6ICdwYWdlLXRyYW5zaXRpb25lcidcblxuICAgIHBhZ2VMYWJlbHMgOiBudWxsXG5cbiAgICBwYWxldHRlcyA6XG4gICAgICAgIEhPTUUgICAgICAgOiBbIENvbG9ycy5DRF9CTFVFLCBDb2xvcnMuT0ZGX1dISVRFLCBDb2xvcnMuQ0RfUkVEIF1cbiAgICAgICAgQUJPVVQgICAgICA6IFsgQ29sb3JzLkNEX1JFRCwgQ29sb3JzLk9GRl9XSElURSwgQ29sb3JzLkNEX0JMVUUgXVxuICAgICAgICBDT05UUklCVVRFIDogWyBDb2xvcnMuQ0RfQkxVRSwgQ29sb3JzLk9GRl9XSElURSwgQ29sb3JzLkNEX1JFRCBdXG4gICAgICAgIERPT0RMRVMgICAgOiBbIENvbG9ycy5DRF9SRUQsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9CTFVFIF1cblxuICAgIGFjdGl2ZUNvbmZpZyA6IG51bGxcblxuICAgIGNvbmZpZ1ByZXNldHMgOlxuICAgICAgICBib3R0b21Ub1RvcCA6XG4gICAgICAgICAgICBmaW5hbFRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgwLCAtMTAwJSwgMCknXG4gICAgICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoMCwgMTAwJSwgMCknXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ25vbmUnXG4gICAgICAgIHRvcFRvQm90dG9tIDpcbiAgICAgICAgICAgIGZpbmFsVHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKDAsIDEwMCUsIDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKDAsIC0xMDAlLCAwKSdcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAnbm9uZSdcbiAgICAgICAgbGVmdFRvUmlnaHQgOlxuICAgICAgICAgICAgZmluYWxUcmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoMTAwJSwgMCwgMCknXG4gICAgICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoLTEwMCUsIDAsIDApJ1xuICAgICAgICAgICAgZW5kIDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICdub25lJ1xuICAgICAgICByaWdodFRvTGVmdCA6XG4gICAgICAgICAgICBmaW5hbFRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgtMTAwJSwgMCwgMCknXG4gICAgICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoMTAwJSwgMCwgMCknXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ25vbmUnXG5cbiAgICBUUkFOU0lUSU9OX1RJTUUgOiAwLjVcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEB0ZW1wbGF0ZVZhcnMgPSBcbiAgICAgICAgICAgIHBhZ2VMYWJlbHMgOlxuICAgICAgICAgICAgICAgIEhPTUUgICAgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfSE9NRVwiXG4gICAgICAgICAgICAgICAgQUJPVVQgICAgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJwYWdlX3RyYW5zaXRpb25lcl9sYWJlbF9BQk9VVFwiXG4gICAgICAgICAgICAgICAgQ09OVFJJQlVURSA6IEBDRCgpLmxvY2FsZS5nZXQgXCJwYWdlX3RyYW5zaXRpb25lcl9sYWJlbF9DT05UUklCVVRFXCJcbiAgICAgICAgICAgIHBhZ2VMYWJlbFByZWZpeCA6IEBDRCgpLmxvY2FsZS5nZXQgXCJwYWdlX3RyYW5zaXRpb25lcl9sYWJlbF9wcmVmaXhcIlxuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgaW5pdCA6ID0+XG5cbiAgICAgICAgQCRwYW5lcyAgICAgPSBAJGVsLmZpbmQoJ1tkYXRhLXBhbmVdJylcbiAgICAgICAgQCRsYWJlbFBhbmUgPSBAJGVsLmZpbmQoJ1tkYXRhLWxhYmVsLXBhbmVdJylcbiAgICAgICAgQCRsYWJlbCAgICAgPSBAJGVsLmZpbmQoJ1tkYXRhLWxhYmVsXScpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcHJlcGFyZSA6IChmcm9tQXJlYSwgdG9BcmVhKSA9PlxuXG4gICAgICAgIEByZXNldFBhbmVzKClcblxuICAgICAgICBAYXBwbHlQYWxldHRlIEBnZXRQYWxldHRlIHRvQXJlYVxuXG4gICAgICAgIEBhY3RpdmVDb25maWcgPSBAZ2V0Q29uZmlnKGZyb21BcmVhLCB0b0FyZWEpXG5cbiAgICAgICAgQGFwcGx5Q29uZmlnIEBhY3RpdmVDb25maWcuc3RhcnQsIHRvQXJlYVxuICAgICAgICBAYXBwbHlMYWJlbENvbmZpZyBAYWN0aXZlQ29uZmlnLmZpbmFsVHJhbnNmb3JtXG5cbiAgICAgICAgQGFwcGx5TGFiZWwgQGdldEFyZWFMYWJlbCB0b0FyZWFcblxuICAgICAgICBudWxsXG5cbiAgICByZXNldFBhbmVzIDogPT5cblxuICAgICAgICBAJHBhbmVzLmF0dHIgJ3N0eWxlJzogJydcblxuICAgICAgICBudWxsXG5cbiAgICBnZXRBcmVhTGFiZWwgOiAoYXJlYSwgZGlyZWN0aW9uPSd0bycpID0+XG5cbiAgICAgICAgc2VjdGlvbiA9IEBDRCgpLm5hdi5nZXRTZWN0aW9uIGFyZWEsIHRydWVcblxuICAgICAgICBpZiBzZWN0aW9uIGlzICdET09ETEVTJ1xuICAgICAgICAgICAgbGFiZWwgPSBAZ2V0RG9vZGxlTGFiZWwgZGlyZWN0aW9uXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxhYmVsID0gQHRlbXBsYXRlVmFycy5wYWdlTGFiZWxzW3NlY3Rpb25dXG5cbiAgICAgICAgbGFiZWxcblxuICAgIGdldERvb2RsZUxhYmVsIDogKGRpcmVjdGlvbikgPT5cblxuICAgICAgICBzZWN0aW9uID0gaWYgZGlyZWN0aW9uIGlzICd0bycgdGhlbiAnY3VycmVudCcgZWxzZSAncHJldmlvdXMnXG4gICAgICAgIGRvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5nZXREb29kbGVCeU5hdlNlY3Rpb24gc2VjdGlvblxuXG4gICAgICAgIGlmIGRvb2RsZVxuICAgICAgICAgICAgbGFiZWwgPSBkb29kbGUuZ2V0KCdhdXRob3IubmFtZScpICsgJyBcXFxcICcgKyBkb29kbGUuZ2V0KCduYW1lJylcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbGFiZWwgPSAnZG9vZGxlJ1xuXG4gICAgICAgIGxhYmVsXG5cbiAgICBhcHBseUxhYmVsIDogKHRvTGFiZWwpID0+XG5cbiAgICAgICAgQCRsYWJlbC5odG1sIEB0ZW1wbGF0ZVZhcnMucGFnZUxhYmVsUHJlZml4ICsgJyAnICsgdG9MYWJlbCArICcuLi4nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0UGFsZXR0ZSA6IChhcmVhKSA9PlxuXG4gICAgICAgIHNlY3Rpb24gPSBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBhcmVhLCB0cnVlXG5cbiAgICAgICAgQHBhbGV0dGVzW3NlY3Rpb25dIG9yIEBwYWxldHRlcy5IT01FXG5cbiAgICBhcHBseVBhbGV0dGUgOiAocGFsZXR0ZSkgPT5cblxuICAgICAgICBAJHBhbmVzLmVhY2ggKGkpID0+IEAkcGFuZXMuZXEoaSkuY3NzICdiYWNrZ3JvdW5kLWNvbG9yJyA6IHBhbGV0dGVbaV1cblxuICAgICAgICBudWxsXG5cbiAgICBnZXRDb25maWcgOiAoZnJvbUFyZWEsIHRvQXJlYSkgPT5cblxuICAgICAgICBpZiAhSG9tZVZpZXcudmlzaXRlZFRoaXNTZXNzaW9uIGFuZCB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcbiAgICAgICAgICAgIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLmJvdHRvbVRvVG9wXG5cbiAgICAgICAgZWxzZSBpZiBmcm9tQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFUyBhbmQgdG9BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldERvb2RsZVRvRG9vZGxlQ29uZmlnKClcblxuICAgICAgICBlbHNlIGlmIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQgb3IgdG9BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFXG4gICAgICAgICAgICAjIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLnRvcFRvQm90dG9tXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldFJhbmRvbUNvbmZpZygpXG5cbiAgICAgICAgIyBlbHNlIGlmIGZyb21BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FIG9yIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICAjIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLmJvdHRvbVRvVG9wXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldFJhbmRvbUNvbmZpZygpXG5cbiAgICAgICAgY29uZmlnXG5cbiAgICBfZ2V0RG9vZGxlVG9Eb29kbGVDb25maWcgOiAocHJldlNsdWcsIG5leHRTbHVnKSA9PlxuXG4gICAgICAgIHByZXZpb3VzRG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmdldERvb2RsZUJ5TmF2U2VjdGlvbiAncHJldmlvdXMnXG4gICAgICAgIHByZXZpb3VzRG9vZGxlSWR4ID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmluZGV4T2YgcHJldmlvdXNEb29kbGVcblxuICAgICAgICBjdXJyZW50RG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmdldERvb2RsZUJ5TmF2U2VjdGlvbiAnY3VycmVudCdcbiAgICAgICAgY3VycmVudERvb2RsZUlkeCA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5pbmRleE9mIGN1cnJlbnREb29kbGVcblxuICAgICAgICBfY29uZmlnID0gaWYgcHJldmlvdXNEb29kbGVJZHggPiBjdXJyZW50RG9vZGxlSWR4IHRoZW4gQGNvbmZpZ1ByZXNldHMubGVmdFRvUmlnaHQgZWxzZSBAY29uZmlnUHJlc2V0cy5yaWdodFRvTGVmdFxuXG4gICAgICAgIF9jb25maWdcblxuICAgIF9nZXRSYW5kb21Db25maWcgOiA9PlxuXG4gICAgICAgIF9jb25maWcgPSBfLnNodWZmbGUoQGNvbmZpZ1ByZXNldHMpWzBdXG5cbiAgICAgICAgX2NvbmZpZ1xuXG4gICAgYXBwbHlDb25maWcgOiAoY29uZmlnLCB0b0FyZWE9bnVsbCkgPT5cblxuICAgICAgICBAJHBhbmVzLmNzcyBjb25maWdcblxuICAgICAgICBjbGFzc0NoYW5nZSA9IGlmIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFUyB0aGVuICdhZGRDbGFzcycgZWxzZSAncmVtb3ZlQ2xhc3MnXG4gICAgICAgIEAkZWxbY2xhc3NDaGFuZ2VdICdzaG93LWRvdHMnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYXBwbHlMYWJlbENvbmZpZyA6ICh0cmFuc2Zvcm1WYWx1ZSkgPT5cblxuICAgICAgICBAJGxhYmVsUGFuZS5jc3MgJ3RyYW5zZm9ybScgOiB0cmFuc2Zvcm1WYWx1ZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNob3cgOiA9PlxuXG4gICAgICAgIEAkZWwuYWRkQ2xhc3MgJ3Nob3cnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaGlkZSA6ID0+XG5cbiAgICAgICAgQCRlbC5yZW1vdmVDbGFzcyAnc2hvdydcblxuICAgICAgICBudWxsXG5cbiAgICBpbiA6IChjYikgPT5cblxuICAgICAgICBAc2hvdygpXG5cbiAgICAgICAgY29tbW9uUGFyYW1zID0gdHJhbnNmb3JtIDogJ25vbmUnLCBlYXNlIDogRXhwby5lYXNlT3V0LCBmb3JjZTNEOiB0cnVlXG5cbiAgICAgICAgQCRwYW5lcy5lYWNoIChpLCBlbCkgPT5cbiAgICAgICAgICAgIHBhcmFtcyA9IF8uZXh0ZW5kIHt9LCBjb21tb25QYXJhbXMsXG4gICAgICAgICAgICAgICAgZGVsYXkgOiBpICogMC4wNVxuICAgICAgICAgICAgaWYgaSBpcyAyIHRoZW4gcGFyYW1zLm9uQ29tcGxldGUgPSA9PlxuICAgICAgICAgICAgICAgIEBhcHBseUNvbmZpZyBAYWN0aXZlQ29uZmlnLmVuZFxuICAgICAgICAgICAgICAgIGNiPygpXG5cbiAgICAgICAgICAgIFR3ZWVuTGl0ZS50byAkKGVsKSwgQFRSQU5TSVRJT05fVElNRSwgcGFyYW1zXG5cbiAgICAgICAgbGFiZWxQYXJhbXMgPSBfLmV4dGVuZCB7fSwgY29tbW9uUGFyYW1zLCBkZWxheSA6IDAuMVxuICAgICAgICBUd2VlbkxpdGUudG8gQCRsYWJlbFBhbmUsIEBUUkFOU0lUSU9OX1RJTUUsIGxhYmVsUGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb3V0IDogKGNiKSA9PlxuXG4gICAgICAgIGNvbW1vblBhcmFtcyA9IGVhc2UgOiBFeHBvLmVhc2VPdXQsIGZvcmNlM0Q6IHRydWUsIGNsZWFyUHJvcHM6ICdhbGwnXG5cbiAgICAgICAgQCRwYW5lcy5lYWNoIChpLCBlbCkgPT5cbiAgICAgICAgICAgIHBhcmFtcyA9IF8uZXh0ZW5kIHt9LCBjb21tb25QYXJhbXMsICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZGVsYXkgICAgIDogMC4xIC0gKDAuMDUgKiBpKVxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybSA6IEBhY3RpdmVDb25maWcuZmluYWxUcmFuc2Zvcm1cbiAgICAgICAgICAgIGlmIGkgaXMgMCB0aGVuIHBhcmFtcy5vbkNvbXBsZXRlID0gPT5cbiAgICAgICAgICAgICAgICBAaGlkZSgpXG4gICAgICAgICAgICAgICAgY2I/KClcblxuICAgICAgICAgICAgVHdlZW5MaXRlLnRvICQoZWwpLCBAVFJBTlNJVElPTl9USU1FLCBwYXJhbXNcblxuICAgICAgICBsYWJlbFBhcmFtcyA9IF8uZXh0ZW5kIHt9LCBjb21tb25QYXJhbXMsIHRyYW5zZm9ybSA6IEBhY3RpdmVDb25maWcuc3RhcnQudHJhbnNmb3JtXG4gICAgICAgIFR3ZWVuTGl0ZS50byBAJGxhYmVsUGFuZSwgQFRSQU5TSVRJT05fVElNRSwgbGFiZWxQYXJhbXNcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUGFnZVRyYW5zaXRpb25lclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBQcmVsb2FkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblx0XG5cdGNiICAgICAgICAgICAgICA6IG51bGxcblx0XG5cdFRSQU5TSVRJT05fVElNRSA6IDAuNVxuXG5cdE1JTl9XUk9OR19DSEFSUyA6IDBcblx0TUFYX1dST05HX0NIQVJTIDogNFxuXG5cdE1JTl9DSEFSX0lOX0RFTEFZIDogMzBcblx0TUFYX0NIQVJfSU5fREVMQVkgOiAxMDBcblxuXHRNSU5fQ0hBUl9PVVRfREVMQVkgOiAzMFxuXHRNQVhfQ0hBUl9PVVRfREVMQVkgOiAxMDBcblxuXHRDSEFSUyA6ICdhYmNkZWZoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSE/KigpQMKjJCVeJl8tKz1bXXt9OjtcXCdcIlxcXFx8PD4sLi9+YCcuc3BsaXQoJycpXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHNldEVsZW1lbnQgJCgnI3ByZWxvYWRlcicpXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRjb2RlV29yZCA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmRdJylcblx0XHRAJGJnMSA9IEAkZWwuZmluZCgnW2RhdGEtYmc9XCIxXCJdJylcblx0XHRAJGJnMiA9IEAkZWwuZmluZCgnW2RhdGEtYmc9XCIyXCJdJylcblxuXHRcdG51bGxcblxuXHRwbGF5SW50cm9BbmltYXRpb24gOiAoQGNiKSA9PlxuXG5cdFx0Y29uc29sZS5sb2cgXCJzaG93IDogKEBjYikgPT5cIlxuXG5cdFx0IyBERUJVRyFcblx0XHQjIHJldHVybiBAY2IoKVxuXG5cdFx0QCRlbFxuXHRcdFx0LmZpbmQoJ1tkYXRhLWRvdHNdJylcblx0XHRcdFx0LnJlbW92ZSgpXG5cdFx0XHRcdC5lbmQoKVxuXHRcdFx0LmFkZENsYXNzKCdzaG93LXByZWxvYWRlcicpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBAJGNvZGVXb3JkLCAnd2hpdGUnLCBmYWxzZSwgQGhpZGVcblxuXHRcdG51bGxcblxuXHRvblNob3dDb21wbGV0ZSA6ID0+XG5cblx0XHRAY2I/KClcblxuXHRcdG51bGxcblxuXHRoaWRlIDogPT5cblxuXHRcdEBhbmltYXRlT3V0IEBvbkhpZGVDb21wbGV0ZVxuXG5cdFx0bnVsbFxuXG5cdG9uSGlkZUNvbXBsZXRlIDogPT5cblxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVPdXQgOiAoY2IpID0+XG5cblx0XHQjIEBhbmltYXRlQ2hhcnNPdXQoKVxuXG5cdFx0IyB0aGF0J2xsIGRvXG5cdFx0IyBzZXRUaW1lb3V0IGNiLCAyMjAwXG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRhbmFncmFtID0gXy5zaHVmZmxlKCdjb2RlZG9vZGwuZXMnLnNwbGl0KCcnKSkuam9pbignJylcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIGFuYWdyYW0sIEAkY29kZVdvcmQsICd3aGl0ZScsIGZhbHNlLCA9PiBAYW5pbWF0ZUJnT3V0IGNiXG5cdFx0LCAyMDAwXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUJnT3V0IDogKGNiKSA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcxLCAwLjUsIHsgZGVsYXkgOiAwLjIsIHdpZHRoIDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMSwgMC42LCB7IGRlbGF5IDogMC43LCBoZWlnaHQgOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cblx0XHRUd2VlbkxpdGUudG8gQCRiZzIsIDAuNCwgeyBkZWxheSA6IDAuNCwgd2lkdGggOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcyLCAwLjUsIHsgZGVsYXkgOiAwLjgsIGhlaWdodCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0LCBvbkNvbXBsZXRlIDogY2IgfVxuXG5cdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRjb2RlV29yZCwgJycsIGZhbHNlXG5cdFx0LCA0MDBcblxuXHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdEAkZWwucmVtb3ZlQ2xhc3MoJ3Nob3ctcHJlbG9hZGVyJylcblx0XHQsIDEyMDBcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVsb2FkZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkhvbWVWaWV3ICAgICAgICAgICA9IHJlcXVpcmUgJy4uL2hvbWUvSG9tZVZpZXcnXG5BYm91dFBhZ2VWaWV3ICAgICAgPSByZXF1aXJlICcuLi9hYm91dFBhZ2UvQWJvdXRQYWdlVmlldydcbkNvbnRyaWJ1dGVQYWdlVmlldyA9IHJlcXVpcmUgJy4uL2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldydcbkRvb2RsZVBhZ2VWaWV3ICAgICA9IHJlcXVpcmUgJy4uL2Rvb2RsZVBhZ2UvRG9vZGxlUGFnZVZpZXcnXG5OYXYgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvTmF2J1xuXG5jbGFzcyBXcmFwcGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0VklFV19UWVBFX1BBR0UgIDogJ3BhZ2UnXG5cblx0dGVtcGxhdGUgOiAnd3JhcHBlcidcblxuXHR2aWV3cyAgICAgICAgICA6IG51bGxcblx0cHJldmlvdXNWaWV3ICAgOiBudWxsXG5cdGN1cnJlbnRWaWV3ICAgIDogbnVsbFxuXG5cdHBhZ2VTd2l0Y2hEZmQgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHZpZXdzID1cblx0XHRcdGhvbWUgICAgICAgOiBjbGFzc1JlZiA6IEhvbWVWaWV3LCAgICAgICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRSwgICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGFib3V0ICAgICAgOiBjbGFzc1JlZiA6IEFib3V0UGFnZVZpZXcsICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQsICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGNvbnRyaWJ1dGUgOiBjbGFzc1JlZiA6IENvbnRyaWJ1dGVQYWdlVmlldywgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURSwgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGRvb2RsZSAgICAgOiBjbGFzc1JlZiA6IERvb2RsZVBhZ2VWaWV3LCAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFUywgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0VcblxuXHRcdEBjcmVhdGVDbGFzc2VzKClcblxuXHRcdHN1cGVyKClcblxuXHRcdCMgZGVjaWRlIGlmIHlvdSB3YW50IHRvIGFkZCBhbGwgY29yZSBET00gdXAgZnJvbnQsIG9yIGFkZCBvbmx5IHdoZW4gcmVxdWlyZWQsIHNlZSBjb21tZW50cyBpbiBBYnN0cmFjdFZpZXdQYWdlLmNvZmZlZVxuXHRcdCMgQGFkZENsYXNzZXMoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRjcmVhdGVDbGFzc2VzIDogPT5cblxuXHRcdChAdmlld3NbbmFtZV0udmlldyA9IG5ldyBAdmlld3NbbmFtZV0uY2xhc3NSZWYpIGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXG5cdFx0bnVsbFxuXG5cdGFkZENsYXNzZXMgOiA9PlxuXG5cdFx0IGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXHRcdCBcdGlmIGRhdGEudHlwZSBpcyBAVklFV19UWVBFX1BBR0UgdGhlbiBAYWRkQ2hpbGQgZGF0YS52aWV3XG5cblx0XHRudWxsXG5cblx0Z2V0Vmlld0J5Um91dGUgOiAocm91dGUpID0+XG5cblx0XHRmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHRcdHJldHVybiBAdmlld3NbbmFtZV0gaWYgcm91dGUgaXMgQHZpZXdzW25hbWVdLnJvdXRlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uICdzdGFydCcsIEBzdGFydFxuXG5cdFx0bnVsbFxuXG5cdHN0YXJ0IDogPT5cblxuXHRcdEBDRCgpLmFwcFZpZXcub2ZmICdzdGFydCcsIEBzdGFydFxuXG5cdFx0QGJpbmRFdmVudHMoKVxuXHRcdEB1cGRhdGVEaW1zKClcblxuXHRcdG51bGxcblxuXHRiaW5kRXZlbnRzIDogPT5cblxuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBjaGFuZ2VWaWV3XG5cdFx0QENEKCkubmF2Lm9uIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjaGFuZ2VTdWJWaWV3XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEB1cGRhdGVEaW1zXG5cblx0XHRudWxsXG5cblx0dXBkYXRlRGltcyA6ID0+XG5cblx0XHRAJGVsLmNzcyAnbWluLWhlaWdodCcsIEBDRCgpLmFwcFZpZXcuZGltcy5oXG5cblx0XHRudWxsXG5cblx0Y2hhbmdlVmlldyA6IChwcmV2aW91cywgY3VycmVudCkgPT5cblxuXHRcdGlmIEBwYWdlU3dpdGNoRGZkIGFuZCBAcGFnZVN3aXRjaERmZC5zdGF0ZSgpIGlzbnQgJ3Jlc29sdmVkJ1xuXHRcdFx0ZG8gKHByZXZpb3VzLCBjdXJyZW50KSA9PiBAcGFnZVN3aXRjaERmZC5kb25lID0+IEBjaGFuZ2VWaWV3IHByZXZpb3VzLCBjdXJyZW50XG5cdFx0XHRyZXR1cm5cblxuXHRcdEBwcmV2aW91c1ZpZXcgPSBAZ2V0Vmlld0J5Um91dGUgcHJldmlvdXMuYXJlYVxuXHRcdEBjdXJyZW50VmlldyAgPSBAZ2V0Vmlld0J5Um91dGUgY3VycmVudC5hcmVhXG5cblx0XHRpZiAhQHByZXZpb3VzVmlld1xuXHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3XG5cdFx0ZWxzZVxuXHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LCBAY3VycmVudFZpZXdcblxuXHRcdG51bGxcblxuXHRjaGFuZ2VTdWJWaWV3IDogKGN1cnJlbnQpID0+XG5cblx0XHRAY3VycmVudFZpZXcudmlldy50cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIGN1cnJlbnQuc3ViXG5cblx0XHRudWxsXG5cblx0dHJhbnNpdGlvblZpZXdzIDogKGZyb20sIHRvKSA9PlxuXG5cdFx0QHBhZ2VTd2l0Y2hEZmQgPSAkLkRlZmVycmVkKClcblxuXHRcdGlmIGZyb20gYW5kIHRvXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5wcmVwYXJlIGZyb20ucm91dGUsIHRvLnJvdXRlXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5pbiA9PiBmcm9tLnZpZXcuaGlkZSA9PiB0by52aWV3LnNob3cgPT4gQENEKCkuYXBwVmlldy50cmFuc2l0aW9uZXIub3V0ID0+IEBwYWdlU3dpdGNoRGZkLnJlc29sdmUoKVxuXHRcdGVsc2UgaWYgZnJvbVxuXHRcdFx0ZnJvbS52aWV3LmhpZGUgQHBhZ2VTd2l0Y2hEZmQucmVzb2x2ZVxuXHRcdGVsc2UgaWYgdG9cblx0XHRcdHRvLnZpZXcuc2hvdyBAcGFnZVN3aXRjaERmZC5yZXNvbHZlXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gV3JhcHBlclxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIENvbnRyaWJ1dGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWNvbnRyaWJ1dGUnXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0bGFiZWxfc3VibWl0ICAgIDogQENEKCkubG9jYWxlLmdldCBcImNvbnRyaWJ1dGVfbGFiZWxfc3VibWl0XCJcblx0XHRcdGNvbnRlbnRfc3VibWl0ICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2NvbnRlbnRfc3VibWl0XCJcblx0XHRcdGxhYmVsX2NvbnRhY3QgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2xhYmVsX2NvbnRhY3RcIlxuXHRcdFx0Y29udGVudF9jb250YWN0IDogQENEKCkubG9jYWxlLmdldCBcImNvbnRyaWJ1dGVfY29udGVudF9jb250YWN0XCJcblxuXHRcdHN1cGVyXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyaWJ1dGVQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIERvb2RsZVBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtZG9vZGxlJ1xuXHRtb2RlbCAgICA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9kZXNjXCJcblxuXHRcdCMjI1xuXG5cdFx0aW5zdGFudGlhdGUgY2xhc3NlcyBoZXJlXG5cblx0XHRAZXhhbXBsZUNsYXNzID0gbmV3IGV4YW1wbGVDbGFzc1xuXG5cdFx0IyMjXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIyNcblxuXHRcdGFkZCBjbGFzc2VzIHRvIGFwcCBzdHJ1Y3R1cmUgaGVyZVxuXG5cdFx0QFxuXHRcdFx0LmFkZENoaWxkKEBleGFtcGxlQ2xhc3MpXG5cblx0XHQjIyNcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGZyYW1lID0gQCRlbC5maW5kKCdbZGF0YS1kb29kbGUtZnJhbWVdJylcblxuXHRzaG93IDogKGNiKSA9PlxuXG5cdFx0QG1vZGVsID0gQGdldERvb2RsZSgpXG5cblx0XHRAJGZyYW1lLmF0dHIgJ3NyYycsIFwiaHR0cDovL3NvdXJjZS5jb2RlZG9vZGwuZXMvc2FtcGxlX2Rvb2RsZXMvc2hhcGUtc3RyZWFtL2luZGV4Lmh0bWxcIlxuXHRcdEAkZnJhbWUub25lICdsb2FkJywgY2JcblxuXHRcdHN1cGVyKClcblxuXHRcdG51bGxcblxuXHRnZXREb29kbGUgOiA9PlxuXG5cdFx0ZG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmdldERvb2RsZUJ5U2x1ZyBAQ0QoKS5uYXYuY3VycmVudC5zdWIrJy8nK0BDRCgpLm5hdi5jdXJyZW50LnRlclxuXG5cdFx0ZG9vZGxlXG5cbm1vZHVsZS5leHBvcnRzID0gRG9vZGxlUGFnZVZpZXdcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgSG9tZUdyaWRJdGVtIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0dGVtcGxhdGUgOiAnaG9tZS1ncmlkLWl0ZW0nXG5cblx0Y29uc3RydWN0b3IgOiAoQG1vZGVsLCBAZnVsbFBhZ2VUcmFuc2l0aW9uKSAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IF8uZXh0ZW5kIHt9LCBAbW9kZWwudG9KU09OKClcblxuXHRcdHN1cGVyXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRhdXRob3JOYW1lID0gQCRlbC5maW5kKCdbZGF0YS1jb2Rld29yZD1cImF1dGhvcl9uYW1lXCJdJylcblx0XHRAJGRvb2RsZU5hbWUgPSBAJGVsLmZpbmQoJ1tkYXRhLWNvZGV3b3JkPVwibmFtZVwiXScpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRAJGVsW3NldHRpbmddICdtb3VzZW92ZXInLCBAb25Nb3VzZU92ZXJcblxuXHRcdG51bGxcblxuXHRzaG93IDogPT5cblxuXHRcdEAkZWwuYWRkQ2xhc3MgJ3Nob3ctaXRlbSdcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ2F1dGhvci5uYW1lJyksIEAkYXV0aG9yTmFtZSwgJ2JsdWUnXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnbmFtZScpLCBAJGRvb2RsZU5hbWUsICdibHVlJ1xuXG5cdFx0QHNldExpc3RlbmVycyAnb24nXG5cblx0XHRudWxsXG5cblx0b25Nb3VzZU92ZXIgOiA9PlxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnYXV0aG9yLm5hbWUnKSwgQCRhdXRob3JOYW1lLCAnYmx1ZSdcblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCduYW1lJyksIEAkZG9vZGxlTmFtZSwgJ2JsdWUnXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZUdyaWRJdGVtXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcbkhvbWVHcmlkSXRlbSAgICAgPSByZXF1aXJlICcuL0hvbWVHcmlkSXRlbSdcblxuY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0IyBtYW5hZ2Ugc3RhdGUgZm9yIGhvbWVWaWV3IG9uIHBlci1zZXNzaW9uIGJhc2lzLCBhbGxvdyBudW1iZXIgb2Zcblx0IyBncmlkIGl0ZW1zLCBhbmQgc2Nyb2xsIHBvc2l0aW9uIG9mIGhvbWUgZ3JpZCB0byBiZSBwZXJzaXN0ZWRcblx0QHZpc2l0ZWRUaGlzU2Vzc2lvbiA6IGZhbHNlXG5cdEBncmlkSXRlbXMgOiBbXVxuXHRAZGltcyA6XG5cdFx0aXRlbSAgICAgIDogaDogMjY4LCB3OiAyMDAsIG1hcmdpbjogMjAsIGE6IDBcblx0XHRjb250YWluZXIgOiBoOiAwLCB3OiAwLCBhOiAwXG5cdEBjb2xDb3VudCA6IDBcblx0QHNjcm9sbERpc3RhbmNlIDogMFxuXG5cdEBTSE9XX1JPV19USFJFU0hPTEQgOiAwLjMgIyBob3cgbXVjaCBvZiBhIGdyaWQgcm93IChzY2FsZSAwIC0+IDEpIG11c3QgYmUgdmlzaWJsZSBiZWZvcmUgaXQgaXMgXCJzaG93blwiXG5cblx0dGVtcGxhdGUgICAgICA6ICdwYWdlLWhvbWUnXG5cdGFkZFRvU2VsZWN0b3IgOiAnW2RhdGEtaG9tZS1ncmlkXSdcblxuXHRhbGxEb29kbGVzIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGRlc2MgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiaG9tZV9kZXNjXCJcblxuXHRcdEBhbGxEb29kbGVzID0gQENEKCkuYXBwRGF0YS5kb29kbGVzXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRncmlkID0gQCRlbC5maW5kKCdbZGF0YS1ob21lLWdyaWRdJylcblxuXHRcdG51bGxcblxuXHRzZXR1cERpbXMgOiA9PlxuXG5cdFx0Z3JpZFdpZHRoID0gQCRncmlkLm91dGVyV2lkdGgoKVxuXG5cdFx0SG9tZVZpZXcuY29sQ291bnQgPSBNYXRoLnJvdW5kIGdyaWRXaWR0aCAvIEhvbWVWaWV3LmRpbXMuaXRlbS53XG5cdFx0XG5cdFx0SG9tZVZpZXcuZGltcy5jb250YWluZXIgPVxuXHRcdFx0aDogQENEKCkuYXBwVmlldy5kaW1zLmgsIHc6IGdyaWRXaWR0aCwgYTogKEBDRCgpLmFwcFZpZXcuZGltcy5oICogZ3JpZFdpZHRoKVxuXG5cdFx0SG9tZVZpZXcuZGltcy5pdGVtLmEgPSBIb21lVmlldy5kaW1zLml0ZW0uaCAqIChIb21lVmlldy5kaW1zLml0ZW0udyArICgoSG9tZVZpZXcuZGltcy5pdGVtLm1hcmdpbiAqIChIb21lVmlldy5jb2xDb3VudCAtIDEpKSAvIEhvbWVWaWV3LmNvbENvdW50KSlcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEBDRCgpLmFwcFZpZXdbc2V0dGluZ10gQENEKCkuYXBwVmlldy5FVkVOVF9VUERBVEVfRElNRU5TSU9OUywgQG9uUmVzaXplXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSBAQ0QoKS5hcHBWaWV3LkVWRU5UX09OX1NDUk9MTCwgQG9uU2Nyb2xsXG5cblx0XHRudWxsXG5cblx0b25SZXNpemUgOiA9PlxuXG5cdFx0QHNldHVwRGltcygpXG5cdFx0QG9uU2Nyb2xsKClcblxuXHRcdG51bGxcblxuXHRvblNjcm9sbCA6ID0+XG5cblx0XHRIb21lVmlldy5zY3JvbGxEaXN0YW5jZSA9IEBDRCgpLmFwcFZpZXcubGFzdFNjcm9sbFlcblxuXHRcdGl0ZW1zVG9TaG93ID0gQGdldFJlcXVpcmVkRG9vZGxlQ291bnRCeUFyZWEoKVxuXHRcdGlmIGl0ZW1zVG9TaG93ID4gMCB0aGVuIEBhZGREb29kbGVzIGl0ZW1zVG9TaG93XG5cblx0XHRudWxsXG5cblx0c2hvdyA6ID0+XG5cblx0XHRzdXBlclxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHRAc2V0dXBEaW1zKClcblxuXHRcdGlmICFIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb25cblx0XHRcdEBhZGREb29kbGVzIEBnZXRSZXF1aXJlZERvb2RsZUNvdW50QnlBcmVhKCksIHRydWVcblx0XHRcdEhvbWVWaWV3LnZpc2l0ZWRUaGlzU2Vzc2lvbiA9IHRydWVcblx0XHRlbHNlXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LiR3aW5kb3cuc2Nyb2xsVG9wIEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlXG5cblx0XHRudWxsXG5cblx0Z2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSA6ID0+XG5cblx0XHR0b3RhbEFyZWEgID0gSG9tZVZpZXcuZGltcy5jb250YWluZXIuYSArIChIb21lVmlldy5zY3JvbGxEaXN0YW5jZSAqIEhvbWVWaWV3LmRpbXMuY29udGFpbmVyLncpXG5cdFx0dGFyZ2V0Um93cyA9ICh0b3RhbEFyZWEgLyBIb21lVmlldy5kaW1zLml0ZW0uYSkgLyBIb21lVmlldy5jb2xDb3VudFxuXG5cdFx0dGFyZ2V0SXRlbXMgPSBNYXRoLmZsb29yKHRhcmdldFJvd3MpICogSG9tZVZpZXcuY29sQ291bnRcblx0XHR0YXJnZXRJdGVtcyA9IGlmICh0YXJnZXRSb3dzICUgMSkgPiBIb21lVmlldy5TSE9XX1JPV19USFJFU0hPTEQgdGhlbiB0YXJnZXRJdGVtcyArIEhvbWVWaWV3LmNvbENvdW50IGVsc2UgdGFyZ2V0SXRlbXNcblxuXHRcdHJldHVybiB0YXJnZXRJdGVtcyAtIEhvbWVWaWV3LmdyaWRJdGVtcy5sZW5ndGhcblxuXHRhZGREb29kbGVzIDogKGNvdW50LCBmdWxsUGFnZVRyYW5zaXRpb249ZmFsc2UpID0+XG5cblx0XHRjb25zb2xlLmxvZyBcImFkZGluZyBkb29kbGVzLi4uIHgje2NvdW50fVwiXG5cblx0XHRuZXdJdGVtcyA9IFtdXG5cblx0XHRmb3IgaWR4IGluIFtIb21lVmlldy5ncmlkSXRlbXMubGVuZ3RoLi4uSG9tZVZpZXcuZ3JpZEl0ZW1zLmxlbmd0aCtjb3VudF1cblxuXHRcdFx0ZG9vZGxlID0gQGFsbERvb2RsZXMuYXQgaWR4XG5cdFx0XHRicmVhayBpZiAhZG9vZGxlXG5cblx0XHRcdG5ld0l0ZW1zLnB1c2ggbmV3IEhvbWVHcmlkSXRlbSBkb29kbGUsIGZ1bGxQYWdlVHJhbnNpdGlvblxuXG5cdFx0SG9tZVZpZXcuZ3JpZEl0ZW1zID0gSG9tZVZpZXcuZ3JpZEl0ZW1zLmNvbmNhdCBuZXdJdGVtc1xuXG5cdFx0Zm9yIGl0ZW0sIGlkeCBpbiBuZXdJdGVtc1xuXG5cdFx0XHRAYWRkQ2hpbGQgaXRlbVxuXHRcdFx0QGFuaW1hdGVJdGVtSW4gaXRlbSwgaWR4LCBmdWxsUGFnZVRyYW5zaXRpb25cblxuXHRcdG51bGxcblxuXHRhbmltYXRlSXRlbUluIDogKGl0ZW0sIGluZGV4LCBmdWxsUGFnZVRyYW5zaXRpb249ZmFsc2UpID0+XG5cblx0XHRkdXJhdGlvbiAgID0gMC41XG5cdFx0ZnJvbVBhcmFtcyA9IHkgOiAoaWYgZnVsbFBhZ2VUcmFuc2l0aW9uIHRoZW4gd2luZG93LmlubmVySGVpZ2h0IGVsc2UgMCksIG9wYWNpdHkgOiAwLCBzY2FsZSA6IDAuNlxuXHRcdHRvUGFyYW1zICAgPSBkZWxheSA6IChkdXJhdGlvbiAqIDAuMikgKiBpbmRleCwgeSA6IDAsIG9wYWNpdHkgOiAxLCBzY2FsZSA6IDEgLCBlYXNlIDogRXhwby5lYXNlT3V0LCBvbkNvbXBsZXRlIDogaXRlbS5zaG93XG5cblx0XHRUd2VlbkxpdGUuZnJvbVRvIGl0ZW0uJGVsLCBkdXJhdGlvbiwgZnJvbVBhcmFtcywgdG9QYXJhbXNcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBIb21lVmlld1xuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuXG5jbGFzcyBBYnN0cmFjdE1vZGFsIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0JHdpbmRvdyA6IG51bGxcblxuXHQjIyMgb3ZlcnJpZGUgaW4gaW5kaXZpZHVhbCBjbGFzc2VzICMjI1xuXHRuYW1lICAgICA6IG51bGxcblx0dGVtcGxhdGUgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QCR3aW5kb3cgPSAkKHdpbmRvdylcblxuXHRcdHN1cGVyKClcblxuXHRcdEBDRCgpLmFwcFZpZXcuYWRkQ2hpbGQgQFxuXHRcdEBzZXRMaXN0ZW5lcnMgJ29uJ1xuXHRcdEBhbmltYXRlSW4oKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRoaWRlIDogPT5cblxuXHRcdEBhbmltYXRlT3V0ID0+IEBDRCgpLmFwcFZpZXcucmVtb3ZlIEBcblxuXHRcdG51bGxcblxuXHRkaXNwb3NlIDogPT5cblxuXHRcdEBzZXRMaXN0ZW5lcnMgJ29mZidcblx0XHRAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5tb2RhbHNbQG5hbWVdLnZpZXcgPSBudWxsXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRAJHdpbmRvd1tzZXR0aW5nXSAna2V5dXAnLCBAb25LZXlVcFxuXHRcdEAkKCdbZGF0YS1jbG9zZV0nKVtzZXR0aW5nXSAnY2xpY2snLCBAY2xvc2VDbGlja1xuXG5cdFx0bnVsbFxuXG5cdG9uS2V5VXAgOiAoZSkgPT5cblxuXHRcdGlmIGUua2V5Q29kZSBpcyAyNyB0aGVuIEBoaWRlKClcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwsIDAuMywgeyAndmlzaWJpbGl0eSc6ICd2aXNpYmxlJywgJ29wYWNpdHknOiAxLCBlYXNlIDogUXVhZC5lYXNlT3V0IH1cblx0XHRUd2VlbkxpdGUudG8gQCRlbC5maW5kKCcuaW5uZXInKSwgMC4zLCB7IGRlbGF5IDogMC4xNSwgJ3RyYW5zZm9ybSc6ICdzY2FsZSgxKScsICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLCAnb3BhY2l0eSc6IDEsIGVhc2UgOiBCYWNrLmVhc2VPdXQgfVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVPdXQgOiAoY2FsbGJhY2spID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRlbCwgMC4zLCB7IGRlbGF5IDogMC4xNSwgJ29wYWNpdHknOiAwLCBlYXNlIDogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBjYWxsYmFjayB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwuZmluZCgnLmlubmVyJyksIDAuMywgeyAndHJhbnNmb3JtJzogJ3NjYWxlKDAuOCknLCAnb3BhY2l0eSc6IDAsIGVhc2UgOiBCYWNrLmVhc2VJbiB9XG5cblx0XHRudWxsXG5cblx0Y2xvc2VDbGljazogKCBlICkgPT5cblxuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXG5cdFx0QGhpZGUoKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0TW9kYWxcbiIsIkFic3RyYWN0TW9kYWwgPSByZXF1aXJlICcuL0Fic3RyYWN0TW9kYWwnXG5cbmNsYXNzIE9yaWVudGF0aW9uTW9kYWwgZXh0ZW5kcyBBYnN0cmFjdE1vZGFsXG5cblx0bmFtZSAgICAgOiAnb3JpZW50YXRpb25Nb2RhbCdcblx0dGVtcGxhdGUgOiAnb3JpZW50YXRpb24tbW9kYWwnXG5cblx0Y2IgICAgICAgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAoQGNiKSAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IHtAbmFtZX1cblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0aGlkZSA6IChzdGlsbExhbmRzY2FwZT10cnVlKSA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgPT5cblx0XHRcdEBDRCgpLmFwcFZpZXcucmVtb3ZlIEBcblx0XHRcdGlmICFzdGlsbExhbmRzY2FwZSB0aGVuIEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0c3VwZXJcblxuXHRcdEBDRCgpLmFwcFZpZXdbc2V0dGluZ10gJ3VwZGF0ZURpbXMnLCBAb25VcGRhdGVEaW1zXG5cdFx0QCRlbFtzZXR0aW5nXSAndG91Y2hlbmQgY2xpY2snLCBAaGlkZVxuXG5cdFx0bnVsbFxuXG5cdG9uVXBkYXRlRGltcyA6IChkaW1zKSA9PlxuXG5cdFx0aWYgZGltcy5vIGlzICdwb3J0cmFpdCcgdGhlbiBAaGlkZSBmYWxzZVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IE9yaWVudGF0aW9uTW9kYWxcbiIsIkFic3RyYWN0VmlldyAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5PcmllbnRhdGlvbk1vZGFsID0gcmVxdWlyZSAnLi9PcmllbnRhdGlvbk1vZGFsJ1xuXG5jbGFzcyBNb2RhbE1hbmFnZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHQjIHdoZW4gbmV3IG1vZGFsIGNsYXNzZXMgYXJlIGNyZWF0ZWQsIGFkZCBoZXJlLCB3aXRoIHJlZmVyZW5jZSB0byBjbGFzcyBuYW1lXG5cdG1vZGFscyA6XG5cdFx0b3JpZW50YXRpb25Nb2RhbCA6IGNsYXNzUmVmIDogT3JpZW50YXRpb25Nb2RhbCwgdmlldyA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGlzT3BlbiA6ID0+XG5cblx0XHQoIGlmIEBtb2RhbHNbbmFtZV0udmlldyB0aGVuIHJldHVybiB0cnVlICkgZm9yIG5hbWUsIG1vZGFsIG9mIEBtb2RhbHNcblxuXHRcdGZhbHNlXG5cblx0aGlkZU9wZW5Nb2RhbCA6ID0+XG5cblx0XHQoIGlmIEBtb2RhbHNbbmFtZV0udmlldyB0aGVuIG9wZW5Nb2RhbCA9IEBtb2RhbHNbbmFtZV0udmlldyApIGZvciBuYW1lLCBtb2RhbCBvZiBAbW9kYWxzXG5cblx0XHRvcGVuTW9kYWw/LmhpZGUoKVxuXG5cdFx0bnVsbFxuXG5cdHNob3dNb2RhbCA6IChuYW1lLCBjYj1udWxsKSA9PlxuXG5cdFx0cmV0dXJuIGlmIEBtb2RhbHNbbmFtZV0udmlld1xuXG5cdFx0QG1vZGFsc1tuYW1lXS52aWV3ID0gbmV3IEBtb2RhbHNbbmFtZV0uY2xhc3NSZWYgY2JcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbE1hbmFnZXJcbiJdfQ==
