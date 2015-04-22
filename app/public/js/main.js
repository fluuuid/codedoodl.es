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
      CodeWordTransitioner["in"]([this.$navLinkAbout], 'black');
      CodeWordTransitioner.out([this.$infoBtn], colour);
    } else if (section === this.CD().nav.sections.CONTRIBUTE) {
      CodeWordTransitioner["in"]([this.$navLinkAbout, this.$closeBtn], colour);
      CodeWordTransitioner["in"]([this.$navLinkContribute], 'black');
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
      return 'black';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50L2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9lbnQvcmV2ZXJzZWQuanNvbiIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHAuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcFZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL0Fic3RyYWN0Q29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvY29udHJpYnV0b3JzL0NvbnRyaWJ1dG9yc0NvbGxlY3Rpb24uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL2NvcmUvVGVtcGxhdGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29uZmlnL0NvbG9ycy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BUEkuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvQWJzdHJhY3REYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0xvY2FsZS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9UZW1wbGF0ZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9BYnN0cmFjdE1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29udHJpYnV0b3IvQ29udHJpYnV0b3JNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvQVBJUm91dGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvTG9jYWxlc01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvZG9vZGxlL0Rvb2RsZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvTmF2LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9BbmFseXRpY3MuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0F1dGhNYW5hZ2VyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvRmFjZWJvb2suY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0dvb2dsZVBsdXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL01lZGlhUXVlcmllcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvTnVtYmVyVXRpbHMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1JlcXVlc3Rlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvU2hhcmUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvQWJzdHJhY3RWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlld1BhZ2UuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9Gb290ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9IZWFkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9QYWdlVHJhbnNpdGlvbmVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvUHJlbG9hZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvV3JhcHBlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVHcmlkSXRlbS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x5Q0EsSUFBQSx3SEFBQTtFQUFBLGtGQUFBOztBQUFBLFNBQUEsR0FBZSxPQUFBLENBQVEsbUJBQVIsQ0FBZixDQUFBOztBQUFBLFdBQ0EsR0FBZSxPQUFBLENBQVEscUJBQVIsQ0FEZixDQUFBOztBQUFBLEtBRUEsR0FBZSxPQUFBLENBQVEsZUFBUixDQUZmLENBQUE7O0FBQUEsUUFHQSxHQUFlLE9BQUEsQ0FBUSxrQkFBUixDQUhmLENBQUE7O0FBQUEsVUFJQSxHQUFlLE9BQUEsQ0FBUSxvQkFBUixDQUpmLENBQUE7O0FBQUEsU0FLQSxHQUFlLE9BQUEsQ0FBUSxrQkFBUixDQUxmLENBQUE7O0FBQUEsTUFNQSxHQUFlLE9BQUEsQ0FBUSxlQUFSLENBTmYsQ0FBQTs7QUFBQSxNQU9BLEdBQWUsT0FBQSxDQUFRLGlCQUFSLENBUGYsQ0FBQTs7QUFBQSxHQVFBLEdBQWUsT0FBQSxDQUFRLGNBQVIsQ0FSZixDQUFBOztBQUFBLE9BU0EsR0FBZSxPQUFBLENBQVEsV0FBUixDQVRmLENBQUE7O0FBQUEsT0FVQSxHQUFlLE9BQUEsQ0FBUSxXQUFSLENBVmYsQ0FBQTs7QUFBQSxZQVdBLEdBQWUsT0FBQSxDQUFRLHNCQUFSLENBWGYsQ0FBQTs7QUFBQTtBQWVJLGdCQUFBLElBQUEsR0FBYSxJQUFiLENBQUE7O0FBQUEsZ0JBQ0EsUUFBQSxHQUFhLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFEM0IsQ0FBQTs7QUFBQSxnQkFFQSxVQUFBLEdBQWEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUYzQixDQUFBOztBQUFBLGdCQUdBLFFBQUEsR0FBYSxDQUhiLENBQUE7O0FBQUEsZ0JBS0EsUUFBQSxHQUFhLENBQUMsVUFBRCxFQUFhLFVBQWIsRUFBeUIsZ0JBQXpCLEVBQTJDLE1BQTNDLEVBQW1ELGFBQW5ELEVBQWtFLFVBQWxFLEVBQThFLFNBQTlFLEVBQXlGLElBQXpGLEVBQStGLFNBQS9GLEVBQTBHLFVBQTFHLENBTGIsQ0FBQTs7QUFPYyxFQUFBLGFBQUUsSUFBRixHQUFBO0FBRVYsSUFGVyxJQUFDLENBQUEsT0FBQSxJQUVaLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsbUNBQUEsQ0FBQTtBQUFBLDZDQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEscURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSxXQUFPLElBQVAsQ0FGVTtFQUFBLENBUGQ7O0FBQUEsZ0JBV0EsUUFBQSxHQUFXLFNBQUEsR0FBQTtBQUVQLFFBQUEsRUFBQTtBQUFBLElBQUEsRUFBQSxHQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQTNCLENBQUEsQ0FBTCxDQUFBO0FBQUEsSUFFQSxZQUFZLENBQUMsS0FBYixDQUFBLENBRkEsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFVBQUQsR0FBaUIsRUFBRSxDQUFDLE9BQUgsQ0FBVyxTQUFYLENBQUEsR0FBd0IsQ0FBQSxDQUp6QyxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsVUFBRCxHQUFpQixFQUFFLENBQUMsT0FBSCxDQUFXLFNBQVgsQ0FBQSxHQUF3QixDQUFBLENBTHpDLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxhQUFELEdBQW9CLEVBQUUsQ0FBQyxLQUFILENBQVMsT0FBVCxDQUFILEdBQTBCLElBQTFCLEdBQW9DLEtBTnJELENBQUE7V0FRQSxLQVZPO0VBQUEsQ0FYWCxDQUFBOztBQUFBLGdCQXVCQSxRQUFBLEdBQVcsU0FBQSxHQUFBO0FBRVAsV0FBTyxJQUFDLENBQUEsTUFBRCxJQUFXLElBQUMsQ0FBQSxVQUFuQixDQUZPO0VBQUEsQ0F2QlgsQ0FBQTs7QUFBQSxnQkEyQkEsY0FBQSxHQUFpQixTQUFBLEdBQUE7QUFFYixJQUFBLElBQUMsQ0FBQSxRQUFELEVBQUEsQ0FBQTtBQUNBLElBQUEsSUFBYyxJQUFDLENBQUEsUUFBRCxJQUFhLENBQTNCO0FBQUEsTUFBQSxJQUFDLENBQUEsT0FBRCxDQUFBLENBQUEsQ0FBQTtLQURBO1dBR0EsS0FMYTtFQUFBLENBM0JqQixDQUFBOztBQUFBLGdCQWtDQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRUgsSUFBQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBQUEsQ0FBQTtXQUVBLEtBSkc7RUFBQSxDQWxDUCxDQUFBOztBQUFBLGdCQXdDQSxXQUFBLEdBQWMsU0FBQSxHQUFBO0FBRVYsSUFBQSxJQUFDLENBQUEsU0FBRCxHQUFpQixJQUFBLFNBQUEsQ0FBVyxpQkFBQSxHQUFpQixDQUFJLElBQUMsQ0FBQSxJQUFKLEdBQWMsTUFBZCxHQUEwQixFQUEzQixDQUFqQixHQUFnRCxNQUEzRCxFQUFrRSxJQUFDLENBQUEsY0FBbkUsQ0FBakIsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE1BQUQsR0FBaUIsSUFBQSxNQUFBLENBQU8sNEJBQVAsRUFBcUMsSUFBQyxDQUFBLGNBQXRDLENBRGpCLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxTQUFELEdBQWlCLElBQUEsU0FBQSxDQUFVLHFCQUFWLEVBQWlDLElBQUMsQ0FBQSxjQUFsQyxDQUZqQixDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsT0FBRCxHQUFpQixJQUFBLE9BQUEsQ0FBUSxJQUFDLENBQUEsY0FBVCxDQUhqQixDQUFBO1dBT0EsS0FUVTtFQUFBLENBeENkLENBQUE7O0FBQUEsZ0JBbURBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFUCxJQUFBLFFBQVEsQ0FBQyxJQUFULENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFDQSxVQUFVLENBQUMsSUFBWCxDQUFBLENBREEsQ0FBQTtXQUdBLEtBTE87RUFBQSxDQW5EWCxDQUFBOztBQUFBLGdCQTBEQSxPQUFBLEdBQVUsU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsUUFBRCxDQUFBLENBQUEsQ0FBQTtBQUVBO0FBQUEsNEJBRkE7QUFBQSxJQUdBLElBQUMsQ0FBQSxPQUFELEdBQVcsR0FBQSxDQUFBLE9BSFgsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLE1BQUQsR0FBVyxHQUFBLENBQUEsTUFKWCxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsR0FBRCxHQUFXLEdBQUEsQ0FBQSxHQUxYLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxJQUFELEdBQVcsR0FBQSxDQUFBLFdBTlgsQ0FBQTtBQUFBLElBT0EsSUFBQyxDQUFBLEtBQUQsR0FBVyxHQUFBLENBQUEsS0FQWCxDQUFBO0FBQUEsSUFTQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBVEEsQ0FBQTtBQUFBLElBV0EsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQVhBLENBQUE7V0FhQSxLQWZNO0VBQUEsQ0ExRFYsQ0FBQTs7QUFBQSxnQkEyRUEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVEO0FBQUEsdURBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsTUFBVCxDQUFBLENBREEsQ0FBQTtBQUdBO0FBQUEsOERBSEE7QUFBQSxJQUlBLElBQUMsQ0FBQSxPQUFELENBQUEsQ0FKQSxDQUFBO1dBTUEsS0FSQztFQUFBLENBM0VMLENBQUE7O0FBQUEsZ0JBcUZBLE9BQUEsR0FBVSxTQUFBLEdBQUE7QUFFTixRQUFBLGtCQUFBO0FBQUE7QUFBQSxTQUFBLDJDQUFBO29CQUFBO0FBQ0ksTUFBQSxJQUFFLENBQUEsRUFBQSxDQUFGLEdBQVEsSUFBUixDQUFBO0FBQUEsTUFDQSxNQUFBLENBQUEsSUFBUyxDQUFBLEVBQUEsQ0FEVCxDQURKO0FBQUEsS0FBQTtXQUlBLEtBTk07RUFBQSxDQXJGVixDQUFBOzthQUFBOztJQWZKLENBQUE7O0FBQUEsTUE0R00sQ0FBQyxPQUFQLEdBQWlCLEdBNUdqQixDQUFBOzs7OztBQ0FBLElBQUEsd0RBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUFvQixPQUFBLENBQVEscUJBQVIsQ0FBcEIsQ0FBQTs7QUFBQSxTQUNBLEdBQW9CLE9BQUEsQ0FBUSxtQkFBUixDQURwQixDQUFBOztBQUFBLEdBRUEsR0FBb0IsT0FBQSxDQUFRLFlBQVIsQ0FGcEIsQ0FBQTs7QUFBQSxpQkFHQSxHQUFvQixPQUFBLENBQVEseUNBQVIsQ0FIcEIsQ0FBQTs7QUFBQTtBQU9JLDRCQUFBLENBQUE7O0FBQUEsb0JBQUEsUUFBQSxHQUFXLElBQVgsQ0FBQTs7QUFFYyxFQUFBLGlCQUFFLFFBQUYsR0FBQTtBQUVWLElBRlcsSUFBQyxDQUFBLFdBQUEsUUFFWixDQUFBO0FBQUEscUVBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQTtBQUFBOzs7T0FBQTtBQUFBLElBTUEsdUNBQUEsQ0FOQSxDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsT0FBRCxHQUFXLEdBQUEsQ0FBQSxpQkFSWCxDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsWUFBRCxDQUFBLENBVkEsQ0FBQTtBQVlBLFdBQU8sSUFBUCxDQWRVO0VBQUEsQ0FGZDs7QUFrQkE7QUFBQTs7S0FsQkE7O0FBQUEsb0JBcUJBLFlBQUEsR0FBZSxTQUFBLEdBQUE7QUFHWCxRQUFBLENBQUE7QUFBQSxJQUFBLElBQUcsSUFBSDtBQUVJLE1BQUEsQ0FBQSxHQUFJLFNBQVMsQ0FBQyxPQUFWLENBRUE7QUFBQSxRQUFBLEdBQUEsRUFBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFOLEdBQWlCLDJCQUF4QjtBQUFBLFFBQ0EsSUFBQSxFQUFPLEtBRFA7T0FGQSxDQUFKLENBQUE7QUFBQSxNQUtBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLG1CQUFSLENBTEEsQ0FBQTtBQUFBLE1BTUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxDQUFBLFNBQUEsS0FBQSxHQUFBO2VBQUEsU0FBQSxHQUFBO0FBSUg7QUFBQTs7YUFBQTt3REFHQSxLQUFDLENBQUEsb0JBUEU7UUFBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFQLENBTkEsQ0FGSjtLQUFBLE1BQUE7O1FBbUJJLElBQUMsQ0FBQTtPQW5CTDtLQUFBO1dBcUJBLEtBeEJXO0VBQUEsQ0FyQmYsQ0FBQTs7QUFBQSxvQkErQ0EsbUJBQUEsR0FBc0IsU0FBQyxJQUFELEdBQUE7QUFFbEIsUUFBQSxZQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLGlDQUFaLEVBQStDLElBQS9DLENBQUEsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFRLEVBRlIsQ0FBQTtBQUdBLFNBQTZDLDRCQUE3QyxHQUFBO0FBQUEsTUFBQyxLQUFBLEdBQVEsS0FBSyxDQUFDLE1BQU4sQ0FBYSxJQUFJLENBQUMsT0FBbEIsQ0FBVCxDQUFBO0FBQUEsS0FIQTtBQUFBLElBS0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxHQUFULENBQWEsS0FBYixDQUxBLENBQUE7QUFPQTtBQUFBOzs7T0FQQTs7TUFhQSxJQUFDLENBQUE7S0FiRDtXQWVBLEtBakJrQjtFQUFBLENBL0N0QixDQUFBOztpQkFBQTs7R0FGa0IsYUFMdEIsQ0FBQTs7QUFBQSxNQXlFTSxDQUFDLE9BQVAsR0FBaUIsT0F6RWpCLENBQUE7Ozs7O0FDQUEsSUFBQSx5RkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUFuQixDQUFBOztBQUFBLFNBQ0EsR0FBbUIsT0FBQSxDQUFRLHVCQUFSLENBRG5CLENBQUE7O0FBQUEsTUFFQSxHQUFtQixPQUFBLENBQVEsb0JBQVIsQ0FGbkIsQ0FBQTs7QUFBQSxPQUdBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUhuQixDQUFBOztBQUFBLE1BSUEsR0FBbUIsT0FBQSxDQUFRLG9CQUFSLENBSm5CLENBQUE7O0FBQUEsZ0JBS0EsR0FBbUIsT0FBQSxDQUFRLDhCQUFSLENBTG5CLENBQUE7O0FBQUEsWUFNQSxHQUFtQixPQUFBLENBQVEsNkJBQVIsQ0FObkIsQ0FBQTs7QUFBQTtBQVVJLDRCQUFBLENBQUE7O0FBQUEsb0JBQUEsUUFBQSxHQUFXLE1BQVgsQ0FBQTs7QUFBQSxvQkFFQSxPQUFBLEdBQVcsSUFGWCxDQUFBOztBQUFBLG9CQUdBLEtBQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsb0JBS0EsT0FBQSxHQUFXLElBTFgsQ0FBQTs7QUFBQSxvQkFNQSxNQUFBLEdBQVcsSUFOWCxDQUFBOztBQUFBLG9CQVFBLElBQUEsR0FDSTtBQUFBLElBQUEsQ0FBQSxFQUFJLElBQUo7QUFBQSxJQUNBLENBQUEsRUFBSSxJQURKO0FBQUEsSUFFQSxDQUFBLEVBQUksSUFGSjtBQUFBLElBR0EsWUFBQSxFQUFlLElBSGY7QUFBQSxJQUlBLFVBQUEsRUFBZSxJQUpmO0dBVEosQ0FBQTs7QUFBQSxvQkFlQSxXQUFBLEdBQWMsQ0FmZCxDQUFBOztBQUFBLG9CQWdCQSxPQUFBLEdBQWMsS0FoQmQsQ0FBQTs7QUFBQSxvQkFrQkEsdUJBQUEsR0FBMEIseUJBbEIxQixDQUFBOztBQUFBLG9CQW1CQSxvQkFBQSxHQUEwQixzQkFuQjFCLENBQUE7O0FBQUEsb0JBb0JBLGVBQUEsR0FBMEIsaUJBcEIxQixDQUFBOztBQUFBLG9CQXNCQSxZQUFBLEdBQWUsR0F0QmYsQ0FBQTs7QUFBQSxvQkF1QkEsTUFBQSxHQUFlLFFBdkJmLENBQUE7O0FBQUEsb0JBd0JBLFVBQUEsR0FBZSxZQXhCZixDQUFBOztBQTBCYyxFQUFBLGlCQUFBLEdBQUE7QUFFVixtRUFBQSxDQUFBO0FBQUEseURBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLDJDQUFBLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxDQUFBLENBQUUsTUFBRixDQUFYLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxLQUFELEdBQVcsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLEVBQVYsQ0FBYSxDQUFiLENBRFgsQ0FBQTtBQUFBLElBR0EsdUNBQUEsQ0FIQSxDQUZVO0VBQUEsQ0ExQmQ7O0FBQUEsb0JBaUNBLFlBQUEsR0FBYyxTQUFBLEdBQUE7QUFFVixJQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLFdBQVosRUFBeUIsSUFBQyxDQUFBLFdBQTFCLENBQUEsQ0FBQTtXQUVBLEtBSlU7RUFBQSxDQWpDZCxDQUFBOztBQUFBLG9CQXVDQSxXQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVQsSUFBQSxJQUFDLENBQUEsT0FBTyxDQUFDLEdBQVQsQ0FBYSxXQUFiLEVBQTBCLElBQUMsQ0FBQSxXQUEzQixDQUFBLENBQUE7V0FFQSxLQUpTO0VBQUEsQ0F2Q2IsQ0FBQTs7QUFBQSxvQkE2Q0EsV0FBQSxHQUFhLFNBQUUsQ0FBRixHQUFBO0FBRVQsSUFBQSxDQUFDLENBQUMsY0FBRixDQUFBLENBQUEsQ0FBQTtXQUVBLEtBSlM7RUFBQSxDQTdDYixDQUFBOztBQUFBLG9CQW1EQSxNQUFBLEdBQVMsU0FBQSxHQUFBO0FBRUwsSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFNBQUQsR0FBZ0IsR0FBQSxDQUFBLFNBRmhCLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxZQUFELEdBQWdCLEdBQUEsQ0FBQSxZQUhoQixDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsTUFBRCxHQUFnQixHQUFBLENBQUEsTUFMaEIsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLE9BQUQsR0FBZ0IsR0FBQSxDQUFBLE9BTmhCLENBQUE7QUFBQSxJQU9BLElBQUMsQ0FBQSxNQUFELEdBQWdCLEdBQUEsQ0FBQSxNQVBoQixDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsWUFBRCxHQUFnQixHQUFBLENBQUEsZ0JBUmhCLENBQUE7QUFBQSxJQVVBLElBQ0ksQ0FBQyxRQURMLENBQ2MsSUFBQyxDQUFBLE1BRGYsQ0FFSSxDQUFDLFFBRkwsQ0FFYyxJQUFDLENBQUEsT0FGZixDQUdJLENBQUMsUUFITCxDQUdjLElBQUMsQ0FBQSxNQUhmLENBSUksQ0FBQyxRQUpMLENBSWMsSUFBQyxDQUFBLFlBSmYsQ0FWQSxDQUFBO0FBQUEsSUFnQkEsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQWhCQSxDQUFBO1dBa0JBLEtBcEJLO0VBQUEsQ0FuRFQsQ0FBQTs7QUFBQSxvQkF5RUEsVUFBQSxHQUFhLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBSSxhQUFKLEVBQW1CLElBQUMsQ0FBQSxhQUFwQixDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FGQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsUUFBRCxHQUFZLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLFFBQVosRUFBc0IsR0FBdEIsQ0FKWixDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSwwQkFBWixFQUF3QyxJQUFDLENBQUEsUUFBekMsQ0FMQSxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSxRQUFaLEVBQXNCLElBQUMsQ0FBQSxRQUF2QixDQU5BLENBQUE7QUFBQSxJQVFBLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxDQUFVLE9BQVYsRUFBbUIsR0FBbkIsRUFBd0IsSUFBQyxDQUFBLFdBQXpCLENBUkEsQ0FBQTtXQVVBLEtBWlM7RUFBQSxDQXpFYixDQUFBOztBQUFBLG9CQXVGQSxRQUFBLEdBQVcsU0FBQSxHQUFBO0FBRVAsSUFBQSxJQUFDLENBQUEsV0FBRCxHQUFlLE1BQU0sQ0FBQyxPQUF0QixDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBREEsQ0FBQTtXQUdBLEtBTE87RUFBQSxDQXZGWCxDQUFBOztBQUFBLG9CQThGQSxXQUFBLEdBQWMsU0FBQSxHQUFBO0FBRVYsSUFBQSxJQUFHLENBQUEsSUFBRSxDQUFBLE9BQUw7QUFDSSxNQUFBLHFCQUFBLENBQXNCLElBQUMsQ0FBQSxZQUF2QixDQUFBLENBQUE7QUFBQSxNQUNBLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFEWCxDQURKO0tBQUE7V0FJQSxLQU5VO0VBQUEsQ0E5RmQsQ0FBQTs7QUFBQSxvQkFzR0EsWUFBQSxHQUFlLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxLQUFYLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxDQUFnQixlQUFoQixDQUZBLENBQUE7QUFBQSxJQUlBLFlBQUEsQ0FBYSxJQUFDLENBQUEsV0FBZCxDQUpBLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxXQUFELEdBQWUsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFDdEIsS0FBQyxDQUFBLEtBQUssQ0FBQyxXQUFQLENBQW1CLGVBQW5CLEVBRHNCO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWCxFQUViLEVBRmEsQ0FOZixDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsT0FBRCxDQUFTLElBQUMsQ0FBQSxlQUFWLENBVkEsQ0FBQTtXQVlBLEtBZFc7RUFBQSxDQXRHZixDQUFBOztBQUFBLG9CQXNIQSxhQUFBLEdBQWdCLFNBQUEsR0FBQTtBQUlaLElBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFQLENBQWUsSUFBQyxDQUFBLEdBQWhCLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFNBQVMsQ0FBQyxrQkFBWCxDQUE4QixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQUcsS0FBQyxDQUFBLE9BQUQsQ0FBUyxLQUFDLENBQUEsb0JBQVYsRUFBSDtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCLENBRkEsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLEtBQUQsQ0FBQSxDQUpBLENBQUE7V0FNQSxLQVZZO0VBQUEsQ0F0SGhCLENBQUE7O0FBQUEsb0JBa0lBLEtBQUEsR0FBUSxTQUFBLEdBQUE7QUFFSixJQUFBLElBQUMsQ0FBQSxPQUFELENBQVMsT0FBVCxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFiLENBQUEsQ0FGQSxDQUFBO1dBSUEsS0FOSTtFQUFBLENBbElSLENBQUE7O0FBQUEsb0JBMElBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFUCxJQUFBLElBQUMsQ0FBQSxPQUFELENBQUEsQ0FBQSxDQUFBO1dBRUEsS0FKTztFQUFBLENBMUlYLENBQUE7O0FBQUEsb0JBZ0pBLE9BQUEsR0FBVSxTQUFBLEdBQUE7QUFFTixRQUFBLFlBQUE7QUFBQSxJQUFBLENBQUEsR0FBSSxNQUFNLENBQUMsVUFBUCxJQUFxQixRQUFRLENBQUMsZUFBZSxDQUFDLFdBQTlDLElBQTZELFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBL0UsQ0FBQTtBQUFBLElBQ0EsQ0FBQSxHQUFJLE1BQU0sQ0FBQyxXQUFQLElBQXNCLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBL0MsSUFBK0QsUUFBUSxDQUFDLElBQUksQ0FBQyxZQURqRixDQUFBO0FBQUEsSUFHQSxNQUFBLEdBQVMsQ0FBQSxHQUFJLElBQUMsQ0FBQSxJQUFJLENBQUMsVUFIbkIsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLElBQUQsR0FDSTtBQUFBLE1BQUEsQ0FBQSxFQUFJLENBQUo7QUFBQSxNQUNBLENBQUEsRUFBSSxDQURKO0FBQUEsTUFFQSxDQUFBLEVBQU8sQ0FBQSxHQUFJLENBQVAsR0FBYyxVQUFkLEdBQThCLFdBRmxDO0FBQUEsTUFHQSxZQUFBLEVBQWUsQ0FBQSxJQUFFLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFOLENBQUEsQ0FBRCxJQUFxQixNQUFBLEdBQVMsR0FBOUIsSUFBcUMsTUFBQSxHQUFTLEdBSDdEO0FBQUEsTUFJQSxVQUFBLEVBQWUsQ0FKZjtLQU5KLENBQUE7QUFBQSxJQVlBLElBQUMsQ0FBQSxPQUFELENBQVMsSUFBQyxDQUFBLHVCQUFWLEVBQW1DLElBQUMsQ0FBQSxJQUFwQyxDQVpBLENBQUE7V0FjQSxLQWhCTTtFQUFBLENBaEpWLENBQUE7O0FBQUEsb0JBa0tBLFdBQUEsR0FBYyxTQUFDLENBQUQsR0FBQTtBQUVWLFFBQUEsSUFBQTtBQUFBLElBQUEsSUFBQSxHQUFPLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUFrQixDQUFDLElBQW5CLENBQXdCLE1BQXhCLENBQVAsQ0FBQTtBQUVBLElBQUEsSUFBQSxDQUFBLElBQUE7QUFBQSxhQUFPLEtBQVAsQ0FBQTtLQUZBO0FBQUEsSUFJQSxJQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsQ0FBckIsQ0FKQSxDQUFBO1dBTUEsS0FSVTtFQUFBLENBbEtkLENBQUE7O0FBQUEsb0JBNEtBLGFBQUEsR0FBZ0IsU0FBRSxJQUFGLEVBQVEsQ0FBUixHQUFBO0FBRVosUUFBQSxjQUFBOztNQUZvQixJQUFJO0tBRXhCO0FBQUEsSUFBQSxLQUFBLEdBQWEsSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFqQixDQUFILEdBQW1DLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBakIsQ0FBMkIsQ0FBQSxDQUFBLENBQTlELEdBQXNFLElBQWhGLENBQUE7QUFBQSxJQUNBLE9BQUEsR0FBYSxLQUFLLENBQUMsTUFBTixDQUFhLENBQWIsQ0FBQSxLQUFtQixHQUF0QixHQUErQixLQUFLLENBQUMsS0FBTixDQUFZLEdBQVosQ0FBaUIsQ0FBQSxDQUFBLENBQUUsQ0FBQyxLQUFwQixDQUEwQixHQUExQixDQUErQixDQUFBLENBQUEsQ0FBOUQsR0FBc0UsS0FBSyxDQUFDLEtBQU4sQ0FBWSxHQUFaLENBQWlCLENBQUEsQ0FBQSxDQURqRyxDQUFBO0FBR0EsSUFBQSxJQUFHLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFWLENBQXFCLE9BQXJCLENBQUg7O1FBQ0ksQ0FBQyxDQUFFLGNBQUgsQ0FBQTtPQUFBO0FBQUEsTUFDQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsVUFBYixDQUF3QixLQUF4QixDQURBLENBREo7S0FBQSxNQUFBO0FBSUksTUFBQSxJQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsQ0FBQSxDQUpKO0tBSEE7V0FTQSxLQVhZO0VBQUEsQ0E1S2hCLENBQUE7O0FBQUEsb0JBeUxBLGtCQUFBLEdBQXFCLFNBQUMsSUFBRCxHQUFBO0FBRWpCLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxpQ0FBWixDQUFBLENBQUE7QUFFQTtBQUFBOzs7T0FGQTtXQVFBLEtBVmlCO0VBQUEsQ0F6THJCLENBQUE7O2lCQUFBOztHQUZrQixhQVJ0QixDQUFBOztBQUFBLE1BK01NLENBQUMsT0FBUCxHQUFpQixPQS9NakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGtCQUFBO0VBQUE7O2lTQUFBOztBQUFBO0FBRUMsdUNBQUEsQ0FBQTs7Ozs7R0FBQTs7QUFBQSwrQkFBQSxFQUFBLEdBQUssU0FBQSxHQUFBO0FBRUosV0FBTyxNQUFNLENBQUMsRUFBZCxDQUZJO0VBQUEsQ0FBTCxDQUFBOzs0QkFBQTs7R0FGZ0MsUUFBUSxDQUFDLFdBQTFDLENBQUE7O0FBQUEsTUFNTSxDQUFDLE9BQVAsR0FBaUIsa0JBTmpCLENBQUE7Ozs7O0FDQUEsSUFBQSw0REFBQTtFQUFBOztpU0FBQTs7QUFBQSxrQkFBQSxHQUFxQixPQUFBLENBQVEsdUJBQVIsQ0FBckIsQ0FBQTs7QUFBQSxnQkFDQSxHQUFxQixPQUFBLENBQVEsMkNBQVIsQ0FEckIsQ0FBQTs7QUFBQTtBQUtDLDJDQUFBLENBQUE7Ozs7O0dBQUE7O0FBQUEsbUNBQUEsS0FBQSxHQUFRLGdCQUFSLENBQUE7O0FBQUEsbUNBRUEsWUFBQSxHQUFlLFNBQUEsR0FBQTtBQUVkLFFBQUEsNEJBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxFQUFSLENBQUE7QUFFQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7QUFBQSxNQUFDLEtBQUssQ0FBQyxJQUFOLENBQVcsS0FBSyxDQUFDLEdBQU4sQ0FBVSxNQUFWLENBQVgsQ0FBRCxDQUFBO0FBQUEsS0FGQTtXQUlBLEtBQUssQ0FBQyxJQUFOLENBQVcsTUFBWCxFQU5jO0VBQUEsQ0FGZixDQUFBOztnQ0FBQTs7R0FGb0MsbUJBSHJDLENBQUE7O0FBQUEsTUFlTSxDQUFDLE9BQVAsR0FBaUIsc0JBZmpCLENBQUE7Ozs7O0FDQUEsSUFBQSxrQ0FBQTtFQUFBO2lTQUFBOztBQUFBLGFBQUEsR0FBZ0IsT0FBQSxDQUFRLGlDQUFSLENBQWhCLENBQUE7O0FBQUE7QUFJQyx3Q0FBQSxDQUFBOzs7O0dBQUE7O0FBQUEsZ0NBQUEsS0FBQSxHQUFRLGFBQVIsQ0FBQTs7NkJBQUE7O0dBRmlDLFFBQVEsQ0FBQyxXQUYzQyxDQUFBOztBQUFBLE1BTU0sQ0FBQyxPQUFQLEdBQWlCLG1CQU5qQixDQUFBOzs7OztBQ0FBLElBQUEsa0RBQUE7RUFBQTs7aVNBQUE7O0FBQUEsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHVCQUFSLENBQXJCLENBQUE7O0FBQUEsV0FDQSxHQUFxQixPQUFBLENBQVEsaUNBQVIsQ0FEckIsQ0FBQTs7QUFBQTtBQUtDLHNDQUFBLENBQUE7Ozs7OztHQUFBOztBQUFBLDhCQUFBLEtBQUEsR0FBUSxXQUFSLENBQUE7O0FBQUEsOEJBRUEsZUFBQSxHQUFrQixTQUFDLElBQUQsR0FBQTtBQUVqQixRQUFBLE1BQUE7QUFBQSxJQUFBLE1BQUEsR0FBUyxJQUFDLENBQUEsU0FBRCxDQUFXO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBUDtLQUFYLENBQVQsQ0FBQTtBQUVBLElBQUEsSUFBRyxDQUFBLE1BQUg7QUFDQyxNQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksZ0JBQVosQ0FBQSxDQUREO0tBRkE7QUFLQSxXQUFPLE1BQVAsQ0FQaUI7RUFBQSxDQUZsQixDQUFBOztBQUFBLDhCQVdBLHFCQUFBLEdBQXdCLFNBQUMsWUFBRCxHQUFBO0FBRXZCLFFBQUEsZUFBQTtBQUFBLElBQUEsT0FBQSxHQUFVLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUksQ0FBQSxZQUFBLENBQXBCLENBQUE7QUFBQSxJQUVBLE1BQUEsR0FBUyxJQUFDLENBQUEsU0FBRCxDQUFXO0FBQUEsTUFBQSxJQUFBLEVBQU8sRUFBQSxHQUFHLE9BQU8sQ0FBQyxHQUFYLEdBQWUsR0FBZixHQUFrQixPQUFPLENBQUMsR0FBakM7S0FBWCxDQUZULENBQUE7V0FJQSxPQU51QjtFQUFBLENBWHhCLENBQUE7OzJCQUFBOztHQUYrQixtQkFIaEMsQ0FBQTs7QUFBQSxNQXdCTSxDQUFDLE9BQVAsR0FBaUIsaUJBeEJqQixDQUFBOzs7OztBQ0FBLElBQUEsTUFBQTs7QUFBQSxNQUFBLEdBRUM7QUFBQSxFQUFBLE1BQUEsRUFBWSxTQUFaO0FBQUEsRUFDQSxPQUFBLEVBQVksU0FEWjtBQUFBLEVBRUEsUUFBQSxFQUFZLFNBRlo7QUFBQSxFQUdBLFNBQUEsRUFBWSxTQUhaO0NBRkQsQ0FBQTs7QUFBQSxNQU9NLENBQUMsT0FBUCxHQUFpQixNQVBqQixDQUFBOzs7OztBQ0FBLElBQUEsa0JBQUE7O0FBQUEsYUFBQSxHQUFnQixPQUFBLENBQVEsOEJBQVIsQ0FBaEIsQ0FBQTs7QUFBQTttQkFJQzs7QUFBQSxFQUFBLEdBQUMsQ0FBQSxLQUFELEdBQVMsR0FBQSxDQUFBLGFBQVQsQ0FBQTs7QUFBQSxFQUVBLEdBQUMsQ0FBQSxXQUFELEdBQWUsU0FBQSxHQUFBO1dBRWQ7QUFBQTtBQUFBLG1EQUFBO0FBQUEsTUFDQSxRQUFBLEVBQVcsR0FBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFEakI7TUFGYztFQUFBLENBRmYsQ0FBQTs7QUFBQSxFQU9BLEdBQUMsQ0FBQSxHQUFELEdBQU8sU0FBQyxJQUFELEVBQU8sSUFBUCxHQUFBO0FBRU4sSUFBQSxJQUFBLEdBQU8sQ0FBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULEVBQWUsSUFBZixFQUFxQixHQUFDLENBQUEsV0FBRCxDQUFBLENBQXJCLENBQVAsQ0FBQTtBQUNBLFdBQU8sR0FBQyxDQUFBLGNBQUQsQ0FBZ0IsR0FBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsSUFBWCxDQUFoQixFQUFrQyxJQUFsQyxDQUFQLENBSE07RUFBQSxDQVBQLENBQUE7O0FBQUEsRUFZQSxHQUFDLENBQUEsY0FBRCxHQUFrQixTQUFDLEdBQUQsRUFBTSxJQUFOLEdBQUE7QUFFakIsV0FBTyxHQUFHLENBQUMsT0FBSixDQUFZLGlCQUFaLEVBQStCLFNBQUMsQ0FBRCxFQUFJLENBQUosR0FBQTtBQUNyQyxVQUFBLENBQUE7YUFBQSxDQUFBLEdBQUksSUFBSyxDQUFBLENBQUEsQ0FBTCxJQUFXLENBQUcsTUFBQSxDQUFBLElBQVksQ0FBQSxDQUFBLENBQVosS0FBa0IsUUFBckIsR0FBbUMsSUFBSyxDQUFBLENBQUEsQ0FBRSxDQUFDLFFBQVIsQ0FBQSxDQUFuQyxHQUEyRCxFQUEzRCxFQURzQjtJQUFBLENBQS9CLENBQVAsQ0FBQTtBQUVDLElBQUEsSUFBRyxNQUFBLENBQUEsQ0FBQSxLQUFZLFFBQVosSUFBd0IsTUFBQSxDQUFBLENBQUEsS0FBWSxRQUF2QzthQUFxRCxFQUFyRDtLQUFBLE1BQUE7YUFBNEQsRUFBNUQ7S0FKZ0I7RUFBQSxDQVpsQixDQUFBOztBQUFBLEVBa0JBLEdBQUMsQ0FBQSxFQUFELEdBQU0sU0FBQSxHQUFBO0FBRUwsV0FBTyxNQUFNLENBQUMsRUFBZCxDQUZLO0VBQUEsQ0FsQk4sQ0FBQTs7YUFBQTs7SUFKRCxDQUFBOztBQUFBLE1BMEJNLENBQUMsT0FBUCxHQUFpQixHQTFCakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLFlBQUE7RUFBQSxrRkFBQTs7QUFBQTtBQUVlLEVBQUEsc0JBQUEsR0FBQTtBQUViLG1DQUFBLENBQUE7QUFBQSxJQUFBLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBVCxFQUFZLFFBQVEsQ0FBQyxNQUFyQixDQUFBLENBQUE7QUFFQSxXQUFPLElBQVAsQ0FKYTtFQUFBLENBQWQ7O0FBQUEseUJBTUEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVKLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSTtFQUFBLENBTkwsQ0FBQTs7c0JBQUE7O0lBRkQsQ0FBQTs7QUFBQSxNQVlNLENBQUMsT0FBUCxHQUFpQixZQVpqQixDQUFBOzs7OztBQ0FBLElBQUEseUJBQUE7RUFBQSxrRkFBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLDZCQUFSLENBQWYsQ0FBQTs7QUFBQSxHQUNBLEdBQWUsT0FBQSxDQUFRLGFBQVIsQ0FEZixDQUFBOztBQUdBO0FBQUE7Ozs7R0FIQTs7QUFBQTtBQVdJLG1CQUFBLElBQUEsR0FBVyxJQUFYLENBQUE7O0FBQUEsbUJBQ0EsSUFBQSxHQUFXLElBRFgsQ0FBQTs7QUFBQSxtQkFFQSxRQUFBLEdBQVcsSUFGWCxDQUFBOztBQUFBLG1CQUdBLE1BQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsbUJBSUEsVUFBQSxHQUFXLE9BSlgsQ0FBQTs7QUFNYyxFQUFBLGdCQUFDLElBQUQsRUFBTyxFQUFQLEdBQUE7QUFFViwyREFBQSxDQUFBO0FBQUEscUNBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSxpREFBQSxDQUFBO0FBQUEsNkNBQUEsQ0FBQTtBQUFBO0FBQUEsc0VBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxRQUFELEdBQVksRUFGWixDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsTUFBRCxHQUFVLElBSFYsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsT0FBRCxDQUFBLENBTFIsQ0FBQTtBQU9BLElBQUEsSUFBRyxHQUFHLENBQUMsR0FBSixDQUFRLFFBQVIsRUFBa0I7QUFBQSxNQUFFLElBQUEsRUFBTyxJQUFDLENBQUEsSUFBVjtLQUFsQixDQUFIO0FBRUksTUFBQSxDQUFDLENBQUMsSUFBRixDQUNJO0FBQUEsUUFBQSxHQUFBLEVBQVUsR0FBRyxDQUFDLEdBQUosQ0FBUyxRQUFULEVBQW1CO0FBQUEsVUFBRSxJQUFBLEVBQU8sSUFBQyxDQUFBLElBQVY7U0FBbkIsQ0FBVjtBQUFBLFFBQ0EsSUFBQSxFQUFVLEtBRFY7QUFBQSxRQUVBLE9BQUEsRUFBVSxJQUFDLENBQUEsU0FGWDtBQUFBLFFBR0EsS0FBQSxFQUFVLElBQUMsQ0FBQSxVQUhYO09BREosQ0FBQSxDQUZKO0tBQUEsTUFBQTtBQVVJLE1BQUEsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFBLENBVko7S0FQQTtBQUFBLElBbUJBLElBbkJBLENBRlU7RUFBQSxDQU5kOztBQUFBLG1CQTZCQSxPQUFBLEdBQVUsU0FBQSxHQUFBO0FBRU4sUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBaEIsSUFBMkIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBdkIsQ0FBNkIsT0FBN0IsQ0FBOUI7QUFFSSxNQUFBLElBQUEsR0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUF2QixDQUE2QixPQUE3QixDQUFzQyxDQUFBLENBQUEsQ0FBRSxDQUFDLEtBQXpDLENBQStDLEdBQS9DLENBQW9ELENBQUEsQ0FBQSxDQUEzRCxDQUZKO0tBQUEsTUFJSyxJQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBakI7QUFFRCxNQUFBLElBQUEsR0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQXJCLENBRkM7S0FBQSxNQUFBO0FBTUQsTUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLFNBQUEsQ0FBUixDQU5DO0tBSkw7V0FZQSxLQWRNO0VBQUEsQ0E3QlYsQ0FBQTs7QUFBQSxtQkE2Q0EsU0FBQSxHQUFZLFNBQUMsS0FBRCxHQUFBO0FBRVI7QUFBQSxnREFBQTtBQUFBLFFBQUEsQ0FBQTtBQUFBLElBRUEsQ0FBQSxHQUFJLElBRkosQ0FBQTtBQUlBLElBQUEsSUFBRyxLQUFLLENBQUMsWUFBVDtBQUNJLE1BQUEsQ0FBQSxHQUFJLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBSyxDQUFDLFlBQWpCLENBQUosQ0FESjtLQUFBLE1BQUE7QUFHSSxNQUFBLENBQUEsR0FBSSxLQUFKLENBSEo7S0FKQTtBQUFBLElBU0EsSUFBQyxDQUFBLElBQUQsR0FBWSxJQUFBLFlBQUEsQ0FBYSxDQUFiLENBVFosQ0FBQTs7TUFVQSxJQUFDLENBQUE7S0FWRDtXQVlBLEtBZFE7RUFBQSxDQTdDWixDQUFBOztBQUFBLG1CQTZEQSxVQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVQ7QUFBQSxzRUFBQTtBQUFBLElBRUEsQ0FBQyxDQUFDLElBQUYsQ0FDSTtBQUFBLE1BQUEsR0FBQSxFQUFXLElBQUMsQ0FBQSxNQUFaO0FBQUEsTUFDQSxRQUFBLEVBQVcsTUFEWDtBQUFBLE1BRUEsUUFBQSxFQUFXLElBQUMsQ0FBQSxTQUZaO0FBQUEsTUFHQSxLQUFBLEVBQVcsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtpQkFBRyxPQUFPLENBQUMsR0FBUixDQUFZLHlCQUFaLEVBQUg7UUFBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUhYO0tBREosQ0FGQSxDQUFBO1dBUUEsS0FWUztFQUFBLENBN0RiLENBQUE7O0FBQUEsbUJBeUVBLEdBQUEsR0FBTSxTQUFDLEVBQUQsR0FBQTtBQUVGO0FBQUE7O09BQUE7QUFJQSxXQUFPLElBQUMsQ0FBQSxJQUFJLENBQUMsU0FBTixDQUFnQixFQUFoQixDQUFQLENBTkU7RUFBQSxDQXpFTixDQUFBOztBQUFBLG1CQWlGQSxjQUFBLEdBQWlCLFNBQUMsR0FBRCxHQUFBO0FBRWIsV0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQWQsR0FBb0IsaUJBQXBCLEdBQXdDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBdEQsR0FBbUUsR0FBbkUsR0FBeUUsR0FBaEYsQ0FGYTtFQUFBLENBakZqQixDQUFBOztnQkFBQTs7SUFYSixDQUFBOztBQUFBLE1BZ0dNLENBQUMsT0FBUCxHQUFpQixNQWhHakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLDZDQUFBO0VBQUEsa0ZBQUE7O0FBQUEsYUFBQSxHQUFzQixPQUFBLENBQVEsOEJBQVIsQ0FBdEIsQ0FBQTs7QUFBQSxtQkFDQSxHQUFzQixPQUFBLENBQVEseUNBQVIsQ0FEdEIsQ0FBQTs7QUFBQTtBQUtJLHNCQUFBLFNBQUEsR0FBWSxJQUFaLENBQUE7O0FBQUEsc0JBQ0EsRUFBQSxHQUFZLElBRFosQ0FBQTs7QUFHYyxFQUFBLG1CQUFDLFNBQUQsRUFBWSxRQUFaLEdBQUE7QUFFVixxQ0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLEVBQUQsR0FBTSxRQUFOLENBQUE7QUFBQSxJQUVBLENBQUMsQ0FBQyxJQUFGLENBQU87QUFBQSxNQUFBLEdBQUEsRUFBTSxTQUFOO0FBQUEsTUFBaUIsT0FBQSxFQUFVLElBQUMsQ0FBQSxRQUE1QjtLQUFQLENBRkEsQ0FBQTtBQUFBLElBSUEsSUFKQSxDQUZVO0VBQUEsQ0FIZDs7QUFBQSxzQkFXQSxRQUFBLEdBQVcsU0FBQyxJQUFELEdBQUE7QUFFUCxRQUFBLElBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxFQUFQLENBQUE7QUFBQSxJQUVBLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixDQUF3QixDQUFDLElBQXpCLENBQThCLFNBQUMsR0FBRCxFQUFNLEtBQU4sR0FBQTtBQUMxQixVQUFBLE1BQUE7QUFBQSxNQUFBLE1BQUEsR0FBUyxDQUFBLENBQUUsS0FBRixDQUFULENBQUE7YUFDQSxJQUFJLENBQUMsSUFBTCxDQUFjLElBQUEsYUFBQSxDQUNWO0FBQUEsUUFBQSxFQUFBLEVBQU8sTUFBTSxDQUFDLElBQVAsQ0FBWSxJQUFaLENBQWlCLENBQUMsUUFBbEIsQ0FBQSxDQUFQO0FBQUEsUUFDQSxJQUFBLEVBQU8sQ0FBQyxDQUFDLElBQUYsQ0FBTyxNQUFNLENBQUMsSUFBUCxDQUFBLENBQVAsQ0FEUDtPQURVLENBQWQsRUFGMEI7SUFBQSxDQUE5QixDQUZBLENBQUE7QUFBQSxJQVFBLElBQUMsQ0FBQSxTQUFELEdBQWlCLElBQUEsbUJBQUEsQ0FBb0IsSUFBcEIsQ0FSakIsQ0FBQTs7TUFVQSxJQUFDLENBQUE7S0FWRDtXQVlBLEtBZE87RUFBQSxDQVhYLENBQUE7O0FBQUEsc0JBMkJBLEdBQUEsR0FBTSxTQUFDLEVBQUQsR0FBQTtBQUVGLFFBQUEsQ0FBQTtBQUFBLElBQUEsQ0FBQSxHQUFJLElBQUMsQ0FBQSxTQUFTLENBQUMsS0FBWCxDQUFpQjtBQUFBLE1BQUEsRUFBQSxFQUFLLEVBQUw7S0FBakIsQ0FBSixDQUFBO0FBQUEsSUFDQSxDQUFBLEdBQUksQ0FBRSxDQUFBLENBQUEsQ0FBRSxDQUFDLEdBQUwsQ0FBUyxNQUFULENBREosQ0FBQTtBQUdBLFdBQU8sQ0FBQyxDQUFDLElBQUYsQ0FBTyxDQUFQLENBQVAsQ0FMRTtFQUFBLENBM0JOLENBQUE7O21CQUFBOztJQUxKLENBQUE7O0FBQUEsTUF1Q00sQ0FBQyxPQUFQLEdBQWlCLFNBdkNqQixDQUFBOzs7OztBQ0FBLElBQUEsYUFBQTtFQUFBOztpU0FBQTs7QUFBQTtBQUVDLGtDQUFBLENBQUE7O0FBQWMsRUFBQSx1QkFBQyxLQUFELEVBQVEsTUFBUixHQUFBO0FBRWIsbUNBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxJQUFDLENBQUEsWUFBRCxDQUFjLEtBQWQsQ0FBUixDQUFBO0FBRUEsV0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQW5CLENBQXlCLElBQXpCLEVBQTRCLFNBQTVCLENBQVAsQ0FKYTtFQUFBLENBQWQ7O0FBQUEsMEJBTUEsR0FBQSxHQUFNLFNBQUMsS0FBRCxFQUFRLE9BQVIsR0FBQTtBQUVMLElBQUEsT0FBQSxJQUFXLENBQUMsT0FBQSxHQUFVLEVBQVgsQ0FBWCxDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxLQUFkLENBRlIsQ0FBQTtBQUFBLElBSUEsT0FBTyxDQUFDLElBQVIsR0FBZSxJQUFJLENBQUMsU0FBTCxDQUFlLEtBQWYsQ0FKZixDQUFBO0FBTUEsV0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBakMsQ0FBc0MsSUFBdEMsRUFBeUMsS0FBekMsRUFBZ0QsT0FBaEQsQ0FBUCxDQVJLO0VBQUEsQ0FOTixDQUFBOztBQUFBLDBCQWdCQSxZQUFBLEdBQWUsU0FBQyxLQUFELEdBQUE7V0FFZCxNQUZjO0VBQUEsQ0FoQmYsQ0FBQTs7QUFBQSwwQkFvQkEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVKLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSTtFQUFBLENBcEJMLENBQUE7O3VCQUFBOztHQUYyQixRQUFRLENBQUMsVUFBckMsQ0FBQTs7QUFBQSxNQTBCTSxDQUFDLE9BQVAsR0FBaUIsYUExQmpCLENBQUE7Ozs7O0FDQUEsSUFBQSxrRUFBQTtFQUFBOztpU0FBQTs7QUFBQSxhQUFBLEdBQXVCLE9BQUEsQ0FBUSxrQkFBUixDQUF2QixDQUFBOztBQUFBLFdBQ0EsR0FBdUIsT0FBQSxDQUFRLHlCQUFSLENBRHZCLENBQUE7O0FBQUEsb0JBRUEsR0FBdUIsT0FBQSxDQUFRLGtDQUFSLENBRnZCLENBQUE7O0FBQUE7QUFNSSxxQ0FBQSxDQUFBOzs7Ozs7R0FBQTs7QUFBQSw2QkFBQSxRQUFBLEdBQ0k7QUFBQSxJQUFBLE1BQUEsRUFBWSxFQUFaO0FBQUEsSUFDQSxRQUFBLEVBQVksRUFEWjtBQUFBLElBRUEsU0FBQSxFQUFZLEVBRlo7QUFBQSxJQUdBLFNBQUEsRUFBWSxFQUhaO0FBQUEsSUFJQSxNQUFBLEVBQVksRUFKWjtHQURKLENBQUE7O0FBQUEsNkJBT0EsWUFBQSxHQUFlLFNBQUMsS0FBRCxHQUFBO0FBRVgsSUFBQSxJQUFHLEtBQUssQ0FBQyxJQUFUO0FBQ0ksTUFBQSxLQUFLLENBQUMsSUFBTixHQUFhLElBQUMsQ0FBQSxPQUFELENBQVMsS0FBVCxDQUFiLENBREo7S0FBQTtXQUdBLE1BTFc7RUFBQSxDQVBmLENBQUE7O0FBQUEsNkJBY0EsT0FBQSxHQUFVLFNBQUMsS0FBRCxHQUFBO0FBRU4sUUFBQSxXQUFBO0FBQUEsSUFBQSxJQUFBLEdBQVEsRUFBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsRUFEUixDQUFBO0FBR0EsSUFBQSxJQUFHLEtBQUssQ0FBQyxPQUFUO0FBQ0ksTUFBQSxJQUFBLElBQVMsWUFBQSxHQUFZLEtBQUssQ0FBQyxPQUFsQixHQUEwQix1QkFBMUIsR0FBaUQsS0FBSyxDQUFDLElBQXZELEdBQTRELE9BQXJFLENBREo7S0FBQSxNQUFBO0FBR0ksTUFBQSxJQUFBLElBQVEsRUFBQSxHQUFHLEtBQUssQ0FBQyxJQUFULEdBQWMsR0FBdEIsQ0FISjtLQUhBO0FBUUEsSUFBQSxJQUFHLEtBQUssQ0FBQyxPQUFUO0FBQXNCLE1BQUEsS0FBSyxDQUFDLElBQU4sQ0FBWSwrQkFBQSxHQUErQixLQUFLLENBQUMsT0FBckMsR0FBNkMsNkJBQXpELENBQUEsQ0FBdEI7S0FSQTtBQVNBLElBQUEsSUFBRyxLQUFLLENBQUMsTUFBVDtBQUFxQixNQUFBLEtBQUssQ0FBQyxJQUFOLENBQVksOEJBQUEsR0FBOEIsS0FBSyxDQUFDLE1BQXBDLEdBQTJDLDZCQUF2RCxDQUFBLENBQXJCO0tBVEE7QUFBQSxJQVdBLElBQUEsSUFBUyxHQUFBLEdBQUUsQ0FBQyxLQUFLLENBQUMsSUFBTixDQUFXLElBQVgsQ0FBRCxDQUFGLEdBQW9CLEdBWDdCLENBQUE7V0FhQSxLQWZNO0VBQUEsQ0FkVixDQUFBOzswQkFBQTs7R0FGMkIsY0FKL0IsQ0FBQTs7QUFBQSxNQXFDTSxDQUFDLE9BQVAsR0FBaUIsZ0JBckNqQixDQUFBOzs7OztBQ0FBLElBQUEsYUFBQTtFQUFBO2lTQUFBOztBQUFBO0FBRUksa0NBQUEsQ0FBQTs7OztHQUFBOztBQUFBLDBCQUFBLFFBQUEsR0FFSTtBQUFBLElBQUEsS0FBQSxFQUFnQixFQUFoQjtBQUFBLElBRUEsTUFBQSxFQUFnQixFQUZoQjtBQUFBLElBSUEsSUFBQSxFQUNJO0FBQUEsTUFBQSxLQUFBLEVBQWEsK0JBQWI7QUFBQSxNQUNBLFFBQUEsRUFBYSxrQ0FEYjtBQUFBLE1BRUEsUUFBQSxFQUFhLGtDQUZiO0FBQUEsTUFHQSxNQUFBLEVBQWEsZ0NBSGI7QUFBQSxNQUlBLE1BQUEsRUFBYSxnQ0FKYjtBQUFBLE1BS0EsTUFBQSxFQUFhLGdDQUxiO0tBTEo7R0FGSixDQUFBOzt1QkFBQTs7R0FGd0IsUUFBUSxDQUFDLFVBQXJDLENBQUE7O0FBQUEsTUFnQk0sQ0FBQyxPQUFQLEdBQWlCLGFBaEJqQixDQUFBOzs7OztBQ0FBLElBQUEsWUFBQTtFQUFBOztpU0FBQTs7QUFBQTtBQUVJLGlDQUFBLENBQUE7Ozs7OztHQUFBOztBQUFBLHlCQUFBLFFBQUEsR0FDSTtBQUFBLElBQUEsSUFBQSxFQUFXLElBQVg7QUFBQSxJQUNBLFFBQUEsRUFBVyxJQURYO0FBQUEsSUFFQSxPQUFBLEVBQVcsSUFGWDtHQURKLENBQUE7O0FBQUEseUJBS0EsWUFBQSxHQUFlLFNBQUEsR0FBQTtBQUNYLFdBQU8sSUFBQyxDQUFBLEdBQUQsQ0FBSyxVQUFMLENBQVAsQ0FEVztFQUFBLENBTGYsQ0FBQTs7QUFBQSx5QkFRQSxTQUFBLEdBQVksU0FBQyxFQUFELEdBQUE7QUFDUixRQUFBLHVCQUFBO0FBQUE7QUFBQSxTQUFBLFNBQUE7a0JBQUE7QUFBQztBQUFBLFdBQUEsVUFBQTtxQkFBQTtBQUFDLFFBQUEsSUFBWSxDQUFBLEtBQUssRUFBakI7QUFBQSxpQkFBTyxDQUFQLENBQUE7U0FBRDtBQUFBLE9BQUQ7QUFBQSxLQUFBO0FBQUEsSUFDQSxPQUFPLENBQUMsSUFBUixDQUFjLCtCQUFBLEdBQStCLEVBQTdDLENBREEsQ0FBQTtXQUVBLEtBSFE7RUFBQSxDQVJaLENBQUE7O3NCQUFBOztHQUZ1QixRQUFRLENBQUMsTUFBcEMsQ0FBQTs7QUFBQSxNQWVNLENBQUMsT0FBUCxHQUFpQixZQWZqQixDQUFBOzs7OztBQ0FBLElBQUEsYUFBQTtFQUFBO2lTQUFBOztBQUFBO0FBRUMsa0NBQUEsQ0FBQTs7OztHQUFBOztBQUFBLDBCQUFBLFFBQUEsR0FFQztBQUFBLElBQUEsRUFBQSxFQUFPLEVBQVA7QUFBQSxJQUNBLElBQUEsRUFBTyxFQURQO0dBRkQsQ0FBQTs7dUJBQUE7O0dBRjJCLFFBQVEsQ0FBQyxNQUFyQyxDQUFBOztBQUFBLE1BT00sQ0FBQyxPQUFQLEdBQWlCLGFBUGpCLENBQUE7Ozs7O0FDQUEsSUFBQSw2REFBQTtFQUFBOztpU0FBQTs7QUFBQSxhQUFBLEdBQXVCLE9BQUEsQ0FBUSxrQkFBUixDQUF2QixDQUFBOztBQUFBLFdBQ0EsR0FBdUIsT0FBQSxDQUFRLHlCQUFSLENBRHZCLENBQUE7O0FBQUEsb0JBRUEsR0FBdUIsT0FBQSxDQUFRLGtDQUFSLENBRnZCLENBQUE7O0FBQUE7QUFNQyxnQ0FBQSxDQUFBOzs7Ozs7R0FBQTs7QUFBQSx3QkFBQSxRQUFBLEdBRUM7QUFBQSxJQUFBLE1BQUEsRUFBUyxFQUFUO0FBQUEsSUFDQSxRQUFBLEVBQ0M7QUFBQSxNQUFBLE1BQUEsRUFBWSxFQUFaO0FBQUEsTUFDQSxRQUFBLEVBQVksRUFEWjtBQUFBLE1BRUEsU0FBQSxFQUFZLEVBRlo7QUFBQSxNQUdBLFNBQUEsRUFBWSxFQUhaO0tBRkQ7QUFBQSxJQU1BLGFBQUEsRUFBZSxFQU5mO0FBQUEsSUFPQSxNQUFBLEVBQVMsRUFQVDtBQUFBLElBUUEsYUFBQSxFQUNDO0FBQUEsTUFBQSxPQUFBLEVBQWEsSUFBYjtBQUFBLE1BQ0EsVUFBQSxFQUFhLElBRGI7QUFBQSxNQUVBLE9BQUEsRUFBYSxJQUZiO0tBVEQ7QUFBQSxJQVlBLFNBQUEsRUFBWSxFQVpaO0FBQUEsSUFhQSxNQUFBLEVBQVMsRUFiVDtBQUFBLElBY0EsT0FBQSxFQUFTLElBZFQ7QUFBQSxJQWdCQSxXQUFBLEVBQWMsRUFoQmQ7QUFBQSxJQWlCQSxRQUFBLEVBQWMsRUFqQmQ7QUFBQSxJQWtCQSxLQUFBLEVBQWMsRUFsQmQ7QUFBQSxJQW1CQSxXQUFBLEVBQ0M7QUFBQSxNQUFBLE1BQUEsRUFBZ0IsRUFBaEI7QUFBQSxNQUNBLGFBQUEsRUFBZ0IsRUFEaEI7S0FwQkQ7R0FGRCxDQUFBOztBQUFBLHdCQXlCQSxZQUFBLEdBQWUsU0FBQyxLQUFELEdBQUE7QUFFZCxJQUFBLElBQUcsS0FBSyxDQUFDLElBQVQ7QUFDQyxNQUFBLEtBQUssQ0FBQyxHQUFOLEdBQVksTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFkLEdBQXlCLEdBQXpCLEdBQStCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQXBELEdBQThELEdBQTlELEdBQW9FLEtBQUssQ0FBQyxJQUF0RixDQUREO0tBQUE7QUFHQSxJQUFBLElBQUcsS0FBSyxDQUFDLEtBQVQ7QUFDQyxNQUFBLEtBQUssQ0FBQyxLQUFOLEdBQWMsV0FBVyxDQUFDLFFBQVosQ0FBcUIsS0FBSyxDQUFDLEtBQTNCLEVBQWtDLENBQWxDLENBQWQsQ0FERDtLQUhBO0FBTUEsSUFBQSxJQUFHLEtBQUssQ0FBQyxJQUFOLElBQWUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUEvQjtBQUNDLE1BQUEsS0FBSyxDQUFDLFNBQU4sR0FDQztBQUFBLFFBQUEsSUFBQSxFQUFjLG9CQUFvQixDQUFDLGdCQUFyQixDQUFzQyxLQUFLLENBQUMsSUFBNUMsQ0FBZDtBQUFBLFFBQ0EsV0FBQSxFQUFjLG9CQUFvQixDQUFDLGdCQUFyQixDQUFzQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQW5ELENBRGQ7T0FERCxDQUREO0tBTkE7QUFXQSxJQUFBLElBQUcsS0FBSyxDQUFDLEtBQVQ7QUFDQyxNQUFBLEtBQUssQ0FBQyxTQUFOLEdBQWtCLElBQUMsQ0FBQSxZQUFELENBQWMsS0FBSyxDQUFDLEtBQXBCLENBQWxCLENBREQ7S0FYQTtXQWNBLE1BaEJjO0VBQUEsQ0F6QmYsQ0FBQTs7QUFBQSx3QkEyQ0EsWUFBQSxHQUFlLFNBQUMsS0FBRCxHQUFBO0FBRWQsUUFBQSxxQ0FBQTtBQUFBLElBQUEsSUFBQSxHQUFPLEVBQVAsQ0FBQTtBQUVBO0FBQUEsU0FBQSwyQ0FBQTtzQkFBQTtBQUNDLE1BQUEsU0FBQSxHQUFlLElBQUEsS0FBUSxHQUFYLEdBQW9CLGlCQUFwQixHQUEyQyxvQkFBdkQsQ0FBQTtBQUFBLE1BQ0EsSUFBQSxJQUFTLGdCQUFBLEdBQWdCLFNBQWhCLEdBQTBCLEtBQTFCLEdBQStCLElBQS9CLEdBQW9DLFNBRDdDLENBREQ7QUFBQSxLQUZBO1dBTUEsS0FSYztFQUFBLENBM0NmLENBQUE7O3FCQUFBOztHQUZ5QixjQUoxQixDQUFBOztBQUFBLE1BMkRNLENBQUMsT0FBUCxHQUFpQixXQTNEakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHlCQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsc0JBQVIsQ0FBZixDQUFBOztBQUFBLE1BQ0EsR0FBZSxPQUFBLENBQVEsVUFBUixDQURmLENBQUE7O0FBQUE7QUFLSSx3QkFBQSxDQUFBOztBQUFBLEVBQUEsR0FBQyxDQUFBLGlCQUFELEdBQXlCLG1CQUF6QixDQUFBOztBQUFBLEVBQ0EsR0FBQyxDQUFBLHFCQUFELEdBQXlCLHVCQUR6QixDQUFBOztBQUFBLGdCQUdBLFFBQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsZ0JBS0EsT0FBQSxHQUFXO0FBQUEsSUFBQSxJQUFBLEVBQU8sSUFBUDtBQUFBLElBQWEsR0FBQSxFQUFNLElBQW5CO0FBQUEsSUFBeUIsR0FBQSxFQUFNLElBQS9CO0dBTFgsQ0FBQTs7QUFBQSxnQkFNQSxRQUFBLEdBQVc7QUFBQSxJQUFBLElBQUEsRUFBTyxJQUFQO0FBQUEsSUFBYSxHQUFBLEVBQU0sSUFBbkI7QUFBQSxJQUF5QixHQUFBLEVBQU0sSUFBL0I7R0FOWCxDQUFBOztBQUFBLGdCQVFBLGVBQUEsR0FBa0IsQ0FSbEIsQ0FBQTs7QUFVYSxFQUFBLGFBQUEsR0FBQTtBQUVULCtEQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsUUFBRCxHQUFZLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBMUIsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE9BQUQsR0FBVyxRQUFRLENBQUMsY0FBVCxDQUF3QixTQUF4QixDQURYLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFiLENBQWdCLE1BQU0sQ0FBQyxrQkFBdkIsRUFBMkMsSUFBQyxDQUFBLFVBQTVDLENBSEEsQ0FBQTtBQUtBLFdBQU8sS0FBUCxDQVBTO0VBQUEsQ0FWYjs7QUFBQSxnQkFtQkEsVUFBQSxHQUFhLFNBQUMsT0FBRCxFQUFVLE1BQVYsR0FBQTtBQUVULFFBQUEsc0JBQUE7O01BRm1CLFNBQU87S0FFMUI7QUFBQSxJQUFBLElBQUcsQ0FBQSxNQUFBLElBQVksT0FBQSxLQUFXLEVBQTFCO0FBQWtDLGFBQU8sSUFBUCxDQUFsQztLQUFBO0FBRUE7QUFBQSxTQUFBLG1CQUFBOzhCQUFBO0FBQ0ksTUFBQSxJQUFHLEdBQUEsS0FBTyxPQUFWO0FBQXVCLGVBQU8sV0FBUCxDQUF2QjtPQURKO0FBQUEsS0FGQTtXQUtBLE1BUFM7RUFBQSxDQW5CYixDQUFBOztBQUFBLGdCQTRCQSxVQUFBLEdBQVksU0FBQyxJQUFELEVBQU8sR0FBUCxFQUFZLEdBQVosRUFBaUIsTUFBakIsR0FBQTtBQU9SLElBQUEsSUFBQyxDQUFBLGVBQUQsRUFBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxPQUZiLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxPQUFELEdBQVk7QUFBQSxNQUFBLElBQUEsRUFBTyxJQUFQO0FBQUEsTUFBYSxHQUFBLEVBQU0sR0FBbkI7QUFBQSxNQUF3QixHQUFBLEVBQU0sR0FBOUI7S0FIWixDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsT0FBRCxDQUFTLEdBQUcsQ0FBQyxpQkFBYixFQUFnQyxJQUFDLENBQUEsUUFBakMsRUFBMkMsSUFBQyxDQUFBLE9BQTVDLENBTEEsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLE9BQUQsQ0FBUyxHQUFHLENBQUMscUJBQWIsRUFBb0MsSUFBQyxDQUFBLE9BQXJDLENBTkEsQ0FBQTtBQVFBLElBQUEsSUFBRyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQTNCLENBQUEsQ0FBSDtBQUE0QyxNQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBM0IsQ0FBQSxDQUFBLENBQTVDO0tBUkE7QUFBQSxJQVVBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixHQUFwQixFQUF5QixHQUF6QixDQVZBLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxjQUFELENBQWdCLElBQWhCLENBWEEsQ0FBQTtXQWFBLEtBcEJRO0VBQUEsQ0E1QlosQ0FBQTs7QUFBQSxnQkFrREEsWUFBQSxHQUFjLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxHQUFaLEdBQUE7QUFFVixRQUFBLHlCQUFBO0FBQUEsSUFBQSxPQUFBLEdBQWUsSUFBQSxLQUFRLEVBQVgsR0FBbUIsTUFBbkIsR0FBK0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFVBQVYsQ0FBcUIsSUFBckIsQ0FBM0MsQ0FBQTtBQUFBLElBQ0EsU0FBQSxHQUFZLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWtCLGFBQUEsR0FBYSxPQUEvQixDQUFBLElBQTZDLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLGlCQUFqQixDQUR6RCxDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsU0FBaEIsRUFBMkIsSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQWxCLEVBQXdCLEdBQXhCLEVBQTZCLEdBQTdCLENBQTNCLEVBQThELEtBQTlELENBRlIsQ0FBQTtBQUlBLElBQUEsSUFBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQWhCLEtBQTJCLEtBQTlCO0FBQXlDLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFoQixHQUF3QixLQUF4QixDQUF6QztLQUpBO1dBTUEsS0FSVTtFQUFBLENBbERkLENBQUE7O0FBQUEsZ0JBNERBLGNBQUEsR0FBZ0IsU0FBQyxJQUFELEdBQUE7QUFFWixRQUFBLE1BQUE7QUFBQSxJQUFBLE1BQUE7QUFBUyxjQUFPLElBQVA7QUFBQSxhQUNBLElBQUMsQ0FBQSxRQUFRLENBQUMsSUFEVjtpQkFDb0IsTUFEcEI7QUFBQSxhQUVBLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FGVjtBQUFBLGFBRWlCLElBQUMsQ0FBQSxRQUFRLENBQUMsVUFGM0I7aUJBRTJDLFFBRjNDO0FBQUEsYUFHQSxJQUFDLENBQUEsUUFBUSxDQUFDLE9BSFY7aUJBR3VCLE9BSHZCO0FBQUE7aUJBSUEsTUFKQTtBQUFBO2lCQUFULENBQUE7QUFBQSxJQU1BLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQ1AsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULEdBQWdCLEVBQUEsR0FBRSxDQUFDLEtBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLFFBQVAsQ0FBRixHQUFrQixvQ0FBbEIsR0FBc0QsTUFBdEQsR0FBNkQsT0FEdEU7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBRUUsQ0FGRixDQU5BLENBQUE7V0FVQSxLQVpZO0VBQUEsQ0E1RGhCLENBQUE7O0FBQUEsZ0JBMEVBLGdCQUFBLEdBQWtCLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxHQUFaLEdBQUE7QUFFZCxRQUFBLFlBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxFQUFQLENBQUE7QUFFQSxJQUFBLElBQUcsSUFBQSxLQUFRLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBbEIsSUFBOEIsR0FBOUIsSUFBc0MsR0FBekM7QUFDSSxNQUFBLE1BQUEsR0FBUyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQXRCLENBQWdDO0FBQUEsUUFBQSxJQUFBLEVBQU0sRUFBQSxHQUFHLEdBQUgsR0FBTyxHQUFQLEdBQVUsR0FBaEI7T0FBaEMsQ0FBVCxDQUFBO0FBRUEsTUFBQSxJQUFHLENBQUEsTUFBSDtBQUNJLFFBQUEsSUFBSSxDQUFDLElBQUwsR0FBWSxRQUFaLENBREo7T0FBQSxNQUFBO0FBR0ksUUFBQSxJQUFJLENBQUMsSUFBTCxHQUFZLE1BQU0sQ0FBQyxHQUFQLENBQVcsYUFBWCxDQUFBLEdBQTRCLE1BQTVCLEdBQXFDLE1BQU0sQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUFyQyxHQUEwRCxHQUF0RSxDQUhKO09BSEo7S0FGQTtXQVVBLEtBWmM7RUFBQSxDQTFFbEIsQ0FBQTs7YUFBQTs7R0FGYyxhQUhsQixDQUFBOztBQUFBLE1BNkZNLENBQUMsT0FBUCxHQUFpQixHQTdGakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLE1BQUE7RUFBQTs7aVNBQUE7O0FBQUE7QUFFSSwyQkFBQSxDQUFBOzs7Ozs7OztHQUFBOztBQUFBLEVBQUEsTUFBQyxDQUFBLGtCQUFELEdBQXNCLG9CQUF0QixDQUFBOztBQUFBLG1CQUVBLFdBQUEsR0FBYyxJQUZkLENBQUE7O0FBQUEsbUJBSUEsTUFBQSxHQUNJO0FBQUEsSUFBQSw2QkFBQSxFQUFnQyxhQUFoQztBQUFBLElBQ0EsVUFBQSxFQUFnQyxZQURoQztHQUxKLENBQUE7O0FBQUEsbUJBUUEsSUFBQSxHQUFTLElBUlQsQ0FBQTs7QUFBQSxtQkFTQSxHQUFBLEdBQVMsSUFUVCxDQUFBOztBQUFBLG1CQVVBLEdBQUEsR0FBUyxJQVZULENBQUE7O0FBQUEsbUJBV0EsTUFBQSxHQUFTLElBWFQsQ0FBQTs7QUFBQSxtQkFhQSxLQUFBLEdBQVEsU0FBQSxHQUFBO0FBRUosSUFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQWpCLENBQ0k7QUFBQSxNQUFBLFNBQUEsRUFBWSxJQUFaO0FBQUEsTUFDQSxJQUFBLEVBQVksR0FEWjtLQURKLENBQUEsQ0FBQTtXQUlBLEtBTkk7RUFBQSxDQWJSLENBQUE7O0FBQUEsbUJBcUJBLFdBQUEsR0FBYyxTQUFFLElBQUYsRUFBZ0IsR0FBaEIsRUFBNkIsR0FBN0IsR0FBQTtBQUVWLElBRlcsSUFBQyxDQUFBLHNCQUFBLE9BQU8sSUFFbkIsQ0FBQTtBQUFBLElBRnlCLElBQUMsQ0FBQSxvQkFBQSxNQUFNLElBRWhDLENBQUE7QUFBQSxJQUZzQyxJQUFDLENBQUEsb0JBQUEsTUFBTSxJQUU3QyxDQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFhLGdDQUFBLEdBQWdDLElBQUMsQ0FBQSxJQUFqQyxHQUFzQyxXQUF0QyxHQUFpRCxJQUFDLENBQUEsR0FBbEQsR0FBc0QsV0FBdEQsR0FBaUUsSUFBQyxDQUFBLEdBQWxFLEdBQXNFLEtBQW5GLENBQUEsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsV0FBSjtBQUFxQixNQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsS0FBZixDQUFyQjtLQUZBO0FBSUEsSUFBQSxJQUFHLENBQUEsSUFBRSxDQUFBLElBQUw7QUFBZSxNQUFBLElBQUMsQ0FBQSxJQUFELEdBQVEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUEzQixDQUFmO0tBSkE7QUFBQSxJQU1BLElBQUMsQ0FBQSxPQUFELENBQVMsTUFBTSxDQUFDLGtCQUFoQixFQUFvQyxJQUFDLENBQUEsSUFBckMsRUFBMkMsSUFBQyxDQUFBLEdBQTVDLEVBQWlELElBQUMsQ0FBQSxHQUFsRCxFQUF1RCxJQUFDLENBQUEsTUFBeEQsQ0FOQSxDQUFBO1dBUUEsS0FWVTtFQUFBLENBckJkLENBQUE7O0FBQUEsbUJBaUNBLFVBQUEsR0FBYSxTQUFDLEtBQUQsRUFBYSxPQUFiLEVBQTZCLE9BQTdCLEVBQStDLE1BQS9DLEdBQUE7O01BQUMsUUFBUTtLQUVsQjs7TUFGc0IsVUFBVTtLQUVoQzs7TUFGc0MsVUFBVTtLQUVoRDtBQUFBLElBRnVELElBQUMsQ0FBQSxTQUFBLE1BRXhELENBQUE7QUFBQSxJQUFBLElBQUcsS0FBSyxDQUFDLE1BQU4sQ0FBYSxDQUFiLENBQUEsS0FBcUIsR0FBeEI7QUFDSSxNQUFBLEtBQUEsR0FBUyxHQUFBLEdBQUcsS0FBWixDQURKO0tBQUE7QUFFQSxJQUFBLElBQUcsS0FBSyxDQUFDLE1BQU4sQ0FBYyxLQUFLLENBQUMsTUFBTixHQUFhLENBQTNCLENBQUEsS0FBb0MsR0FBdkM7QUFDSSxNQUFBLEtBQUEsR0FBUSxFQUFBLEdBQUcsS0FBSCxHQUFTLEdBQWpCLENBREo7S0FGQTtBQUtBLElBQUEsSUFBRyxDQUFBLE9BQUg7QUFDSSxNQUFBLElBQUMsQ0FBQSxPQUFELENBQVMsTUFBTSxDQUFDLGtCQUFoQixFQUFvQyxLQUFwQyxFQUEyQyxJQUEzQyxFQUFpRCxJQUFDLENBQUEsTUFBbEQsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUZKO0tBTEE7QUFBQSxJQVNBLElBQUMsQ0FBQSxRQUFELENBQVUsS0FBVixFQUFpQjtBQUFBLE1BQUEsT0FBQSxFQUFTLElBQVQ7QUFBQSxNQUFlLE9BQUEsRUFBUyxPQUF4QjtLQUFqQixDQVRBLENBQUE7V0FXQSxLQWJTO0VBQUEsQ0FqQ2IsQ0FBQTs7QUFBQSxtQkFnREEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVELFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGQztFQUFBLENBaERMLENBQUE7O2dCQUFBOztHQUZpQixRQUFRLENBQUMsT0FBOUIsQ0FBQTs7QUFBQSxNQXNETSxDQUFDLE9BQVAsR0FBaUIsTUF0RGpCLENBQUE7Ozs7O0FDQUE7QUFBQTs7R0FBQTtBQUFBLElBQUEsU0FBQTtFQUFBLGtGQUFBOztBQUFBO0FBS0ksc0JBQUEsSUFBQSxHQUFVLElBQVYsQ0FBQTs7QUFBQSxzQkFDQSxPQUFBLEdBQVUsS0FEVixDQUFBOztBQUFBLHNCQUdBLFFBQUEsR0FBa0IsQ0FIbEIsQ0FBQTs7QUFBQSxzQkFJQSxlQUFBLEdBQWtCLENBSmxCLENBQUE7O0FBTWMsRUFBQSxtQkFBQyxJQUFELEVBQVEsUUFBUixHQUFBO0FBRVYsSUFGaUIsSUFBQyxDQUFBLFdBQUEsUUFFbEIsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsSUFBQSxDQUFDLENBQUMsT0FBRixDQUFVLElBQVYsRUFBZ0IsSUFBQyxDQUFBLGNBQWpCLENBQUEsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUpVO0VBQUEsQ0FOZDs7QUFBQSxzQkFZQSxjQUFBLEdBQWlCLFNBQUMsSUFBRCxHQUFBO0FBRWIsSUFBQSxJQUFDLENBQUEsSUFBRCxHQUFXLElBQVgsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQURYLENBQUE7O01BRUEsSUFBQyxDQUFBO0tBRkQ7V0FJQSxLQU5hO0VBQUEsQ0FaakIsQ0FBQTs7QUFvQkE7QUFBQTs7S0FwQkE7O0FBQUEsc0JBdUJBLEtBQUEsR0FBUSxTQUFDLEtBQUQsR0FBQTtBQUVKLFFBQUEsc0JBQUE7QUFBQSxJQUFBLElBQVUsQ0FBQSxJQUFFLENBQUEsT0FBWjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBRUEsSUFBQSxJQUFHLEtBQUg7QUFFSSxNQUFBLENBQUEsR0FBSSxJQUFDLENBQUEsSUFBSyxDQUFBLEtBQUEsQ0FBVixDQUFBO0FBRUEsTUFBQSxJQUFHLENBQUg7QUFFSSxRQUFBLElBQUEsR0FBTyxDQUFDLE1BQUQsRUFBUyxPQUFULENBQVAsQ0FBQTtBQUNBLGFBQUEsd0NBQUE7c0JBQUE7QUFBQSxVQUFFLElBQUksQ0FBQyxJQUFMLENBQVUsR0FBVixDQUFGLENBQUE7QUFBQSxTQURBO0FBSUEsUUFBQSxJQUFHLE1BQU0sQ0FBQyxFQUFWO0FBQ0ksVUFBQSxFQUFFLENBQUMsS0FBSCxDQUFTLElBQVQsRUFBZSxJQUFmLENBQUEsQ0FESjtTQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsUUFBRCxJQUFhLElBQUMsQ0FBQSxlQUFqQjtBQUNELFVBQUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxLQUFYLENBREM7U0FBQSxNQUFBO0FBR0QsVUFBQSxVQUFBLENBQVcsQ0FBQSxTQUFBLEtBQUEsR0FBQTttQkFBQSxTQUFBLEdBQUE7QUFDUCxjQUFBLEtBQUMsQ0FBQSxLQUFELENBQU8sS0FBUCxDQUFBLENBQUE7cUJBQ0EsS0FBQyxDQUFBLFFBQUQsR0FGTztZQUFBLEVBQUE7VUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFHRSxJQUhGLENBQUEsQ0FIQztTQVJUO09BSko7S0FGQTtXQXNCQSxLQXhCSTtFQUFBLENBdkJSLENBQUE7O21CQUFBOztJQUxKLENBQUE7O0FBQUEsTUFzRE0sQ0FBQyxPQUFQLEdBQWlCLFNBdERqQixDQUFBOzs7OztBQ0FBLElBQUEsK0NBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxzQkFBUixDQUFmLENBQUE7O0FBQUEsUUFDQSxHQUFlLE9BQUEsQ0FBUSxtQkFBUixDQURmLENBQUE7O0FBQUEsVUFFQSxHQUFlLE9BQUEsQ0FBUSxxQkFBUixDQUZmLENBQUE7O0FBQUE7QUFNQyxnQ0FBQSxDQUFBOztBQUFBLHdCQUFBLFFBQUEsR0FBWSxJQUFaLENBQUE7O0FBQUEsd0JBR0EsT0FBQSxHQUFlLEtBSGYsQ0FBQTs7QUFBQSx3QkFJQSxZQUFBLEdBQWUsSUFKZixDQUFBOztBQUFBLHdCQUtBLFdBQUEsR0FBZSxJQUxmLENBQUE7O0FBT2MsRUFBQSxxQkFBQSxHQUFBO0FBRWIsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSx5Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsUUFBRCxHQUFhLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUEzQixDQUFBO0FBQUEsSUFFQSwyQ0FBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOYTtFQUFBLENBUGQ7O0FBQUEsd0JBZUEsS0FBQSxHQUFRLFNBQUMsT0FBRCxFQUFVLEVBQVYsR0FBQTtBQUlQLFFBQUEsUUFBQTs7TUFKaUIsS0FBRztLQUlwQjtBQUFBLElBQUEsSUFBVSxJQUFDLENBQUEsT0FBWDtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBRkEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUhYLENBQUE7QUFBQSxJQUtBLFFBQUEsR0FBVyxDQUFDLENBQUMsUUFBRixDQUFBLENBTFgsQ0FBQTtBQU9BLFlBQU8sT0FBUDtBQUFBLFdBQ00sUUFETjtBQUVFLFFBQUEsVUFBVSxDQUFDLEtBQVgsQ0FBaUIsUUFBakIsQ0FBQSxDQUZGO0FBQ007QUFETixXQUdNLFVBSE47QUFJRSxRQUFBLFFBQVEsQ0FBQyxLQUFULENBQWUsUUFBZixDQUFBLENBSkY7QUFBQSxLQVBBO0FBQUEsSUFhQSxRQUFRLENBQUMsSUFBVCxDQUFjLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLEdBQUQsR0FBQTtlQUFTLEtBQUMsQ0FBQSxXQUFELENBQWEsT0FBYixFQUFzQixHQUF0QixFQUFUO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBZCxDQWJBLENBQUE7QUFBQSxJQWNBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsR0FBRCxHQUFBO2VBQVMsS0FBQyxDQUFBLFFBQUQsQ0FBVSxPQUFWLEVBQW1CLEdBQW5CLEVBQVQ7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFkLENBZEEsQ0FBQTtBQUFBLElBZUEsUUFBUSxDQUFDLE1BQVQsQ0FBZ0IsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUEsR0FBQTtlQUFNLEtBQUMsQ0FBQSxZQUFELENBQWMsRUFBZCxFQUFOO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBaEIsQ0FmQSxDQUFBO0FBaUJBO0FBQUE7OztPQWpCQTtBQUFBLElBcUJBLElBQUMsQ0FBQSxZQUFELEdBQWdCLFVBQUEsQ0FBVyxJQUFDLENBQUEsWUFBWixFQUEwQixJQUFDLENBQUEsV0FBM0IsQ0FyQmhCLENBQUE7V0F1QkEsU0EzQk87RUFBQSxDQWZSLENBQUE7O0FBQUEsd0JBNENBLFdBQUEsR0FBYyxTQUFDLE9BQUQsRUFBVSxJQUFWLEdBQUE7V0FJYixLQUphO0VBQUEsQ0E1Q2QsQ0FBQTs7QUFBQSx3QkFrREEsUUFBQSxHQUFXLFNBQUMsT0FBRCxFQUFVLElBQVYsR0FBQTtXQUlWLEtBSlU7RUFBQSxDQWxEWCxDQUFBOztBQUFBLHdCQXdEQSxZQUFBLEdBQWUsU0FBQyxFQUFELEdBQUE7O01BQUMsS0FBRztLQUVsQjtBQUFBLElBQUEsSUFBQSxDQUFBLElBQWUsQ0FBQSxPQUFmO0FBQUEsWUFBQSxDQUFBO0tBQUE7QUFBQSxJQUVBLFlBQUEsQ0FBYSxJQUFDLENBQUEsWUFBZCxDQUZBLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FKQSxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsT0FBRCxHQUFXLEtBTFgsQ0FBQTs7TUFPQTtLQVBBO1dBU0EsS0FYYztFQUFBLENBeERmLENBQUE7O0FBcUVBO0FBQUE7O0tBckVBOztBQUFBLHdCQXdFQSxVQUFBLEdBQWEsU0FBQSxHQUFBO1dBSVosS0FKWTtFQUFBLENBeEViLENBQUE7O0FBQUEsd0JBOEVBLFVBQUEsR0FBYSxTQUFBLEdBQUE7V0FJWixLQUpZO0VBQUEsQ0E5RWIsQ0FBQTs7cUJBQUE7O0dBRnlCLGFBSjFCLENBQUE7O0FBQUEsTUEwRk0sQ0FBQyxPQUFQLEdBQWlCLFdBMUZqQixDQUFBOzs7OztBQ0FBLElBQUEsNEJBQUE7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxZQUFSLENBQVQsQ0FBQTs7QUFBQTtvQ0FJQzs7QUFBQSxFQUFBLG9CQUFDLENBQUEsTUFBRCxHQUNDO0FBQUEsSUFBQSxlQUFBLEVBQWtCLENBQWxCO0FBQUEsSUFDQSxlQUFBLEVBQWtCLENBRGxCO0FBQUEsSUFHQSxpQkFBQSxFQUFvQixFQUhwQjtBQUFBLElBSUEsaUJBQUEsRUFBb0IsRUFKcEI7QUFBQSxJQU1BLGtCQUFBLEVBQXFCLEVBTnJCO0FBQUEsSUFPQSxrQkFBQSxFQUFxQixFQVByQjtBQUFBLElBU0EsS0FBQSxFQUFRLHVFQUF1RSxDQUFDLEtBQXhFLENBQThFLEVBQTlFLENBQWlGLENBQUMsR0FBbEYsQ0FBc0YsU0FBQyxJQUFELEdBQUE7QUFBVSxhQUFPLE1BQUEsQ0FBTyxJQUFQLENBQVAsQ0FBVjtJQUFBLENBQXRGLENBVFI7QUFBQSxJQVdBLGFBQUEsRUFBZ0Isb0dBWGhCO0dBREQsQ0FBQTs7QUFBQSxFQWNBLG9CQUFDLENBQUEsVUFBRCxHQUFjLEVBZGQsQ0FBQTs7QUFBQSxFQWdCQSxvQkFBQyxDQUFBLGlCQUFELEdBQXFCLFNBQUMsR0FBRCxHQUFBO0FBRXBCLFFBQUEsUUFBQTtBQUFBLElBQUEsRUFBQSxHQUFLLEdBQUcsQ0FBQyxJQUFKLENBQVMsa0JBQVQsQ0FBTCxDQUFBO0FBRUEsSUFBQSxJQUFHLEVBQUEsSUFBTyxvQkFBQyxDQUFBLFVBQVksQ0FBQSxFQUFBLENBQXZCO0FBQ0MsTUFBQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxVQUFZLENBQUEsRUFBQSxDQUFwQixDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsb0JBQUMsQ0FBQSxVQUFELENBQVksR0FBWixDQUFBLENBQUE7QUFBQSxNQUNBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGVBQUQsQ0FBaUIsR0FBakIsQ0FEUCxDQUhEO0tBRkE7V0FRQSxLQVZvQjtFQUFBLENBaEJyQixDQUFBOztBQUFBLEVBNEJBLG9CQUFDLENBQUEsZUFBRCxHQUFtQixTQUFDLEdBQUQsR0FBQTtBQUVsQixRQUFBLFNBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxFQUFSLENBQUE7QUFBQSxJQUVBLEdBQUcsQ0FBQyxJQUFKLENBQVMsc0JBQVQsQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFzQyxTQUFDLENBQUQsRUFBSSxFQUFKLEdBQUE7QUFDckMsVUFBQSxPQUFBO0FBQUEsTUFBQSxPQUFBLEdBQVUsQ0FBQSxDQUFFLEVBQUYsQ0FBVixDQUFBO2FBQ0EsS0FBSyxDQUFDLElBQU4sQ0FDQztBQUFBLFFBQUEsR0FBQSxFQUFhLE9BQWI7QUFBQSxRQUNBLFNBQUEsRUFBYSxPQUFPLENBQUMsSUFBUixDQUFhLG9CQUFiLENBRGI7T0FERCxFQUZxQztJQUFBLENBQXRDLENBRkEsQ0FBQTtBQUFBLElBUUEsRUFBQSxHQUFLLENBQUMsQ0FBQyxRQUFGLENBQUEsQ0FSTCxDQUFBO0FBQUEsSUFTQSxHQUFHLENBQUMsSUFBSixDQUFTLGtCQUFULEVBQTZCLEVBQTdCLENBVEEsQ0FBQTtBQUFBLElBV0Esb0JBQUMsQ0FBQSxVQUFZLENBQUEsRUFBQSxDQUFiLEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFBVSxDQUFDLENBQUMsS0FBRixDQUFRLEtBQVIsRUFBZSxXQUFmLENBQTJCLENBQUMsSUFBNUIsQ0FBaUMsRUFBakMsQ0FBVjtBQUFBLE1BQ0EsR0FBQSxFQUFVLEdBRFY7QUFBQSxNQUVBLEtBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxPQUFBLEVBQVUsSUFIVjtLQVpELENBQUE7V0FpQkEsb0JBQUMsQ0FBQSxVQUFZLENBQUEsRUFBQSxFQW5CSztFQUFBLENBNUJuQixDQUFBOztBQUFBLEVBaURBLG9CQUFDLENBQUEsVUFBRCxHQUFjLFNBQUMsR0FBRCxHQUFBO0FBRWIsUUFBQSxrQ0FBQTtBQUFBLElBQUEsS0FBQSxHQUFRLEdBQUcsQ0FBQyxJQUFKLENBQUEsQ0FBVSxDQUFDLEtBQVgsQ0FBaUIsRUFBakIsQ0FBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsR0FBRyxDQUFDLElBQUosQ0FBUyw2QkFBVCxDQUFBLElBQTJDLEVBRG5ELENBQUE7QUFBQSxJQUVBLElBQUEsR0FBTyxFQUZQLENBQUE7QUFHQSxTQUFBLDRDQUFBO3VCQUFBO0FBQ0MsTUFBQSxJQUFJLENBQUMsSUFBTCxDQUFVLG9CQUFDLENBQUEsZUFBRCxDQUFpQixvQkFBQyxDQUFBLE1BQU0sQ0FBQyxhQUF6QixFQUF3QztBQUFBLFFBQUEsSUFBQSxFQUFPLElBQVA7QUFBQSxRQUFhLEtBQUEsRUFBTyxLQUFwQjtPQUF4QyxDQUFWLENBQUEsQ0FERDtBQUFBLEtBSEE7QUFBQSxJQU1BLEdBQUcsQ0FBQyxJQUFKLENBQVMsSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFWLENBQVQsQ0FOQSxDQUFBO1dBUUEsS0FWYTtFQUFBLENBakRkLENBQUE7O0FBQUEsRUE2REEsb0JBQUMsQ0FBQSxZQUFELEdBQWdCLFNBQUMsSUFBRCxHQUFBO1dBRWYsS0FGZTtFQUFBLENBN0RoQixDQUFBOztBQUFBLEVBa0VBLG9CQUFDLENBQUEsWUFBRCxHQUFnQixTQUFDLElBQUQsRUFBTyxNQUFQLEVBQWUsU0FBZixHQUFBO0FBRWYsUUFBQSxtQ0FBQTs7TUFGOEIsWUFBVTtLQUV4QztBQUFBO0FBQUEsU0FBQSxtREFBQTtxQkFBQTtBQUVDLE1BQUEsVUFBQTtBQUFhLGdCQUFPLElBQVA7QUFBQSxlQUNQLE1BQUEsS0FBVSxPQURIO21CQUNnQixJQUFJLENBQUMsVUFEckI7QUFBQSxlQUVQLE1BQUEsS0FBVSxPQUZIO21CQUVnQixJQUFDLENBQUEsY0FBRCxDQUFBLEVBRmhCO0FBQUEsZUFHUCxNQUFBLEtBQVUsT0FISDttQkFHZ0IsR0FIaEI7QUFBQTttQkFJUCxNQUFNLENBQUMsTUFBUCxDQUFjLENBQWQsQ0FBQSxJQUFvQixHQUpiO0FBQUE7bUNBQWIsQ0FBQTtBQU1BLE1BQUEsSUFBRyxVQUFBLEtBQWMsR0FBakI7QUFBMEIsUUFBQSxVQUFBLEdBQWEsUUFBYixDQUExQjtPQU5BO0FBQUEsTUFRQSxJQUFJLENBQUMsVUFBTCxHQUFrQixvQkFBQyxDQUFBLG9CQUFELENBQUEsQ0FSbEIsQ0FBQTtBQUFBLE1BU0EsSUFBSSxDQUFDLFVBQUwsR0FBa0IsVUFUbEIsQ0FBQTtBQUFBLE1BVUEsSUFBSSxDQUFDLFNBQUwsR0FBa0IsU0FWbEIsQ0FGRDtBQUFBLEtBQUE7V0FjQSxLQWhCZTtFQUFBLENBbEVoQixDQUFBOztBQUFBLEVBb0ZBLG9CQUFDLENBQUEsb0JBQUQsR0FBd0IsU0FBQSxHQUFBO0FBRXZCLFFBQUEsdUJBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxFQUFSLENBQUE7QUFBQSxJQUVBLFNBQUEsR0FBWSxDQUFDLENBQUMsTUFBRixDQUFTLG9CQUFDLENBQUEsTUFBTSxDQUFDLGVBQWpCLEVBQWtDLG9CQUFDLENBQUEsTUFBTSxDQUFDLGVBQTFDLENBRlosQ0FBQTtBQUlBLFNBQVMsOEZBQVQsR0FBQTtBQUNDLE1BQUEsS0FBSyxDQUFDLElBQU4sQ0FDQztBQUFBLFFBQUEsSUFBQSxFQUFXLG9CQUFDLENBQUEsY0FBRCxDQUFBLENBQVg7QUFBQSxRQUNBLE9BQUEsRUFBVyxDQUFDLENBQUMsTUFBRixDQUFTLG9CQUFDLENBQUEsTUFBTSxDQUFDLGlCQUFqQixFQUFvQyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxpQkFBNUMsQ0FEWDtBQUFBLFFBRUEsUUFBQSxFQUFXLENBQUMsQ0FBQyxNQUFGLENBQVMsb0JBQUMsQ0FBQSxNQUFNLENBQUMsa0JBQWpCLEVBQXFDLG9CQUFDLENBQUEsTUFBTSxDQUFDLGtCQUE3QyxDQUZYO09BREQsQ0FBQSxDQUREO0FBQUEsS0FKQTtXQVVBLE1BWnVCO0VBQUEsQ0FwRnhCLENBQUE7O0FBQUEsRUFrR0Esb0JBQUMsQ0FBQSxjQUFELEdBQWtCLFNBQUEsR0FBQTtBQUVqQixRQUFBLElBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFPLENBQUEsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxDQUFULEVBQVksb0JBQUMsQ0FBQSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQWQsR0FBcUIsQ0FBakMsQ0FBQSxDQUF0QixDQUFBO1dBRUEsS0FKaUI7RUFBQSxDQWxHbEIsQ0FBQTs7QUFBQSxFQXdHQSxvQkFBQyxDQUFBLHVCQUFELEdBQTJCLFNBQUMsS0FBRCxHQUFBO0FBRTFCLFFBQUEsZ0ZBQUE7QUFBQSxJQUFBLFdBQUEsR0FBYyxDQUFkLENBQUE7QUFBQSxJQUNBLGNBQUEsR0FBaUIsQ0FEakIsQ0FBQTtBQUdBLFNBQUEsb0RBQUE7c0JBQUE7QUFFQyxNQUFBLElBQUEsR0FBTyxDQUFQLENBQUE7QUFDQTtBQUFBLFdBQUEsNkNBQUE7NkJBQUE7QUFBQSxRQUFDLElBQUEsSUFBUSxTQUFTLENBQUMsT0FBVixHQUFvQixTQUFTLENBQUMsUUFBdkMsQ0FBQTtBQUFBLE9BREE7QUFFQSxNQUFBLElBQUcsSUFBQSxHQUFPLFdBQVY7QUFDQyxRQUFBLFdBQUEsR0FBYyxJQUFkLENBQUE7QUFBQSxRQUNBLGNBQUEsR0FBaUIsQ0FEakIsQ0FERDtPQUpEO0FBQUEsS0FIQTtXQVdBLGVBYjBCO0VBQUEsQ0F4RzNCLENBQUE7O0FBQUEsRUF1SEEsb0JBQUMsQ0FBQSxhQUFELEdBQWlCLFNBQUMsSUFBRCxFQUFPLFVBQVAsRUFBbUIsRUFBbkIsR0FBQTtBQUVoQixRQUFBLHlEQUFBO0FBQUEsSUFBQSxVQUFBLEdBQWEsQ0FBYixDQUFBO0FBRUEsSUFBQSxJQUFHLFVBQUg7QUFDQyxNQUFBLG9CQUFDLENBQUEsWUFBRCxDQUFjLElBQUksQ0FBQyxLQUFuQixFQUEwQixVQUExQixFQUFzQyxJQUF0QyxFQUE0QyxFQUE1QyxDQUFBLENBREQ7S0FBQSxNQUFBO0FBR0MsTUFBQSxjQUFBLEdBQWlCLG9CQUFDLENBQUEsdUJBQUQsQ0FBeUIsSUFBSSxDQUFDLEtBQTlCLENBQWpCLENBQUE7QUFDQTtBQUFBLFdBQUEsbURBQUE7dUJBQUE7QUFDQyxRQUFBLElBQUEsR0FBTyxDQUFFLElBQUksQ0FBQyxLQUFQLEVBQWMsQ0FBZCxFQUFpQixLQUFqQixDQUFQLENBQUE7QUFDQSxRQUFBLElBQUcsQ0FBQSxLQUFLLGNBQVI7QUFBNEIsVUFBQSxJQUFJLENBQUMsSUFBTCxDQUFVLEVBQVYsQ0FBQSxDQUE1QjtTQURBO0FBQUEsUUFFQSxvQkFBQyxDQUFBLFlBQVksQ0FBQyxLQUFkLENBQW9CLG9CQUFwQixFQUF1QixJQUF2QixDQUZBLENBREQ7QUFBQSxPQUpEO0tBRkE7V0FXQSxLQWJnQjtFQUFBLENBdkhqQixDQUFBOztBQUFBLEVBc0lBLG9CQUFDLENBQUEsWUFBRCxHQUFnQixTQUFDLEtBQUQsRUFBUSxHQUFSLEVBQWEsT0FBYixFQUFzQixFQUF0QixHQUFBO0FBRWYsUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sS0FBTSxDQUFBLEdBQUEsQ0FBYixDQUFBO0FBRUEsSUFBQSxJQUFHLE9BQUg7QUFFQyxNQUFBLG9CQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsRUFBMEIsU0FBQSxHQUFBO0FBRXpCLFFBQUEsSUFBRyxHQUFBLEtBQU8sS0FBSyxDQUFDLE1BQU4sR0FBYSxDQUF2QjtpQkFDQyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEVBQW5CLEVBREQ7U0FBQSxNQUFBO2lCQUdDLG9CQUFDLENBQUEsWUFBRCxDQUFjLEtBQWQsRUFBcUIsR0FBQSxHQUFJLENBQXpCLEVBQTRCLE9BQTVCLEVBQXFDLEVBQXJDLEVBSEQ7U0FGeUI7TUFBQSxDQUExQixDQUFBLENBRkQ7S0FBQSxNQUFBO0FBV0MsTUFBQSxJQUFHLE1BQUEsQ0FBQSxFQUFBLEtBQWEsVUFBaEI7QUFDQyxRQUFBLG9CQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsRUFBMEIsU0FBQSxHQUFBO2lCQUFHLG9CQUFDLENBQUEsaUJBQUQsQ0FBbUIsRUFBbkIsRUFBSDtRQUFBLENBQTFCLENBQUEsQ0FERDtPQUFBLE1BQUE7QUFHQyxRQUFBLG9CQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsQ0FBQSxDQUhEO09BWEQ7S0FGQTtXQWtCQSxLQXBCZTtFQUFBLENBdEloQixDQUFBOztBQUFBLEVBNEpBLG9CQUFDLENBQUEsa0JBQUQsR0FBc0IsU0FBQyxJQUFELEVBQU8sRUFBUCxHQUFBO0FBRXJCLFFBQUEsU0FBQTtBQUFBLElBQUEsSUFBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQW5CO0FBRUMsTUFBQSxTQUFBLEdBQVksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFoQixDQUFBLENBQVosQ0FBQTtBQUFBLE1BRUEsVUFBQSxDQUFXLFNBQUEsR0FBQTtBQUNWLFFBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFULENBQWMsU0FBUyxDQUFDLElBQXhCLENBQUEsQ0FBQTtlQUVBLFVBQUEsQ0FBVyxTQUFBLEdBQUE7aUJBQ1Ysb0JBQUMsQ0FBQSxrQkFBRCxDQUFvQixJQUFwQixFQUEwQixFQUExQixFQURVO1FBQUEsQ0FBWCxFQUVFLFNBQVMsQ0FBQyxRQUZaLEVBSFU7TUFBQSxDQUFYLEVBT0UsU0FBUyxDQUFDLE9BUFosQ0FGQSxDQUZEO0tBQUEsTUFBQTtBQWVDLE1BQUEsSUFBSSxDQUFDLEdBQ0osQ0FBQyxJQURGLENBQ08sMEJBRFAsRUFDbUMsSUFBSSxDQUFDLFNBRHhDLENBRUMsQ0FBQyxJQUZGLENBRU8sSUFBSSxDQUFDLFVBRlosQ0FBQSxDQUFBOztRQUlBO09BbkJEO0tBQUE7V0FxQkEsS0F2QnFCO0VBQUEsQ0E1SnRCLENBQUE7O0FBQUEsRUFxTEEsb0JBQUMsQ0FBQSxpQkFBRCxHQUFxQixTQUFDLEVBQUQsR0FBQTs7TUFFcEI7S0FBQTtXQUVBLEtBSm9CO0VBQUEsQ0FyTHJCLENBQUE7O0FBQUEsRUEyTEEsb0JBQUMsQ0FBQSxlQUFELEdBQW1CLFNBQUMsR0FBRCxFQUFNLElBQU4sR0FBQTtBQUVsQixXQUFPLEdBQUcsQ0FBQyxPQUFKLENBQVksaUJBQVosRUFBK0IsU0FBQyxDQUFELEVBQUksQ0FBSixHQUFBO0FBQ3JDLFVBQUEsQ0FBQTtBQUFBLE1BQUEsQ0FBQSxHQUFJLElBQUssQ0FBQSxDQUFBLENBQVQsQ0FBQTtBQUNDLE1BQUEsSUFBRyxNQUFBLENBQUEsQ0FBQSxLQUFZLFFBQVosSUFBd0IsTUFBQSxDQUFBLENBQUEsS0FBWSxRQUF2QztlQUFxRCxFQUFyRDtPQUFBLE1BQUE7ZUFBNEQsRUFBNUQ7T0FGb0M7SUFBQSxDQUEvQixDQUFQLENBRmtCO0VBQUEsQ0EzTG5CLENBQUE7O0FBQUEsRUFpTUEsb0JBQUMsQ0FBQSxFQUFELEdBQU0sU0FBQyxVQUFELEVBQWEsR0FBYixFQUFrQixTQUFsQixFQUE2QixVQUE3QixFQUErQyxFQUEvQyxHQUFBO0FBRUwsUUFBQSxvQkFBQTs7TUFGa0MsYUFBVztLQUU3Qzs7TUFGb0QsS0FBRztLQUV2RDtBQUFBLElBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixDQUFVLEdBQVYsQ0FBSDtBQUNDLFdBQUEsMENBQUE7dUJBQUE7QUFBQSxRQUFDLG9CQUFDLENBQUEsRUFBRCxDQUFJLFVBQUosRUFBZ0IsSUFBaEIsRUFBc0IsU0FBdEIsRUFBaUMsRUFBakMsQ0FBRCxDQUFBO0FBQUEsT0FBQTtBQUNBLFlBQUEsQ0FGRDtLQUFBO0FBQUEsSUFJQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxpQkFBRCxDQUFtQixHQUFuQixDQUpQLENBQUE7QUFBQSxJQUtBLElBQUksQ0FBQyxPQUFMLEdBQWUsSUFMZixDQUFBO0FBQUEsSUFPQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLFVBQXBCLEVBQWdDLFNBQWhDLENBUEEsQ0FBQTtBQUFBLElBUUEsb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVJBLENBQUE7V0FVQSxLQVpLO0VBQUEsQ0FqTU4sQ0FBQTs7QUFBQSxFQStNQSxvQkFBQyxDQUFBLElBQUEsQ0FBRCxHQUFNLFNBQUMsR0FBRCxFQUFNLFNBQU4sRUFBaUIsVUFBakIsRUFBbUMsRUFBbkMsR0FBQTtBQUVMLFFBQUEsb0JBQUE7O01BRnNCLGFBQVc7S0FFakM7O01BRndDLEtBQUc7S0FFM0M7QUFBQSxJQUFBLElBQUcsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxHQUFWLENBQUg7QUFDQyxXQUFBLDBDQUFBO3VCQUFBO0FBQUEsUUFBQyxvQkFBQyxDQUFBLElBQUEsQ0FBRCxDQUFJLElBQUosRUFBVSxTQUFWLEVBQXFCLEVBQXJCLENBQUQsQ0FBQTtBQUFBLE9BQUE7QUFDQSxZQUFBLENBRkQ7S0FBQTtBQUFBLElBSUEsSUFBQSxHQUFPLG9CQUFDLENBQUEsaUJBQUQsQ0FBbUIsR0FBbkIsQ0FKUCxDQUFBO0FBQUEsSUFLQSxJQUFJLENBQUMsT0FBTCxHQUFlLElBTGYsQ0FBQTtBQUFBLElBT0Esb0JBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixPQUFwQixFQUE2QixTQUE3QixDQVBBLENBQUE7QUFBQSxJQVFBLG9CQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsVUFBckIsRUFBaUMsRUFBakMsQ0FSQSxDQUFBO1dBVUEsS0FaSztFQUFBLENBL01OLENBQUE7O0FBQUEsRUE2TkEsb0JBQUMsQ0FBQSxHQUFELEdBQU8sU0FBQyxHQUFELEVBQU0sU0FBTixFQUFpQixVQUFqQixFQUFtQyxFQUFuQyxHQUFBO0FBRU4sUUFBQSxvQkFBQTs7TUFGdUIsYUFBVztLQUVsQzs7TUFGeUMsS0FBRztLQUU1QztBQUFBLElBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixDQUFVLEdBQVYsQ0FBSDtBQUNDLFdBQUEsMENBQUE7dUJBQUE7QUFBQSxRQUFDLG9CQUFDLENBQUEsR0FBRCxDQUFLLElBQUwsRUFBVyxTQUFYLEVBQXNCLEVBQXRCLENBQUQsQ0FBQTtBQUFBLE9BQUE7QUFDQSxZQUFBLENBRkQ7S0FBQTtBQUFBLElBSUEsSUFBQSxHQUFPLG9CQUFDLENBQUEsaUJBQUQsQ0FBbUIsR0FBbkIsQ0FKUCxDQUFBO0FBS0EsSUFBQSxJQUFVLENBQUEsSUFBSyxDQUFDLE9BQWhCO0FBQUEsWUFBQSxDQUFBO0tBTEE7QUFBQSxJQU9BLElBQUksQ0FBQyxPQUFMLEdBQWUsS0FQZixDQUFBO0FBQUEsSUFTQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLEVBQTZCLFNBQTdCLENBVEEsQ0FBQTtBQUFBLElBVUEsb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVZBLENBQUE7V0FZQSxLQWRNO0VBQUEsQ0E3TlAsQ0FBQTs7QUFBQSxFQTZPQSxvQkFBQyxDQUFBLFFBQUQsR0FBWSxTQUFDLEdBQUQsRUFBTSxTQUFOLEVBQWlCLFVBQWpCLEVBQW1DLEVBQW5DLEdBQUE7QUFFWCxRQUFBLG9CQUFBOztNQUY0QixhQUFXO0tBRXZDOztNQUY4QyxLQUFHO0tBRWpEO0FBQUEsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLENBQVUsR0FBVixDQUFIO0FBQ0MsV0FBQSwwQ0FBQTt1QkFBQTtBQUFBLFFBQUMsb0JBQUMsQ0FBQSxRQUFELENBQVUsSUFBVixFQUFnQixTQUFoQixFQUEyQixFQUEzQixDQUFELENBQUE7QUFBQSxPQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEdBQW5CLENBSlAsQ0FBQTtBQU1BLElBQUEsSUFBVSxDQUFBLElBQUssQ0FBQyxPQUFoQjtBQUFBLFlBQUEsQ0FBQTtLQU5BO0FBQUEsSUFRQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLEVBQTZCLFNBQTdCLENBUkEsQ0FBQTtBQUFBLElBU0Esb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVRBLENBQUE7V0FXQSxLQWJXO0VBQUEsQ0E3T1osQ0FBQTs7QUFBQSxFQTRQQSxvQkFBQyxDQUFBLFVBQUQsR0FBYyxTQUFDLEdBQUQsRUFBTSxTQUFOLEVBQWlCLFVBQWpCLEVBQW1DLEVBQW5DLEdBQUE7QUFFYixRQUFBLG9CQUFBOztNQUY4QixhQUFXO0tBRXpDOztNQUZnRCxLQUFHO0tBRW5EO0FBQUEsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLENBQVUsR0FBVixDQUFIO0FBQ0MsV0FBQSwwQ0FBQTt1QkFBQTtBQUFBLFFBQUMsb0JBQUMsQ0FBQSxVQUFELENBQVksSUFBWixFQUFrQixTQUFsQixFQUE2QixFQUE3QixDQUFELENBQUE7QUFBQSxPQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEdBQW5CLENBSlAsQ0FBQTtBQU1BLElBQUEsSUFBVSxDQUFBLElBQUssQ0FBQyxPQUFoQjtBQUFBLFlBQUEsQ0FBQTtLQU5BO0FBQUEsSUFRQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLEVBQTZCLFNBQTdCLENBUkEsQ0FBQTtBQUFBLElBU0Esb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVRBLENBQUE7V0FXQSxLQWJhO0VBQUEsQ0E1UGQsQ0FBQTs7QUFBQSxFQTJRQSxvQkFBQyxDQUFBLGdCQUFELEdBQW9CLFNBQUMsSUFBRCxHQUFBO0FBRW5CLFFBQUEsOEJBQUE7QUFBQSxJQUFBLFFBQUEsR0FBVyxFQUFYLENBQUE7QUFDQTtBQUFBLFNBQUEsMkNBQUE7c0JBQUE7QUFBQSxNQUFDLFFBQVEsQ0FBQyxJQUFULENBQWMsb0JBQUMsQ0FBQSxjQUFELENBQUEsQ0FBZCxDQUFELENBQUE7QUFBQSxLQURBO0FBR0EsV0FBTyxRQUFRLENBQUMsSUFBVCxDQUFjLEVBQWQsQ0FBUCxDQUxtQjtFQUFBLENBM1FwQixDQUFBOzs4QkFBQTs7SUFKRCxDQUFBOztBQUFBLE1Bc1JNLENBQUMsT0FBUCxHQUFpQixvQkF0UmpCLENBQUE7O0FBQUEsTUF3Uk0sQ0FBQyxvQkFBUCxHQUE2QixvQkF4UjdCLENBQUE7Ozs7O0FDQUEsSUFBQSxzQkFBQTtFQUFBO2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsc0JBQVIsQ0FBZixDQUFBOztBQUVBO0FBQUE7OztHQUZBOztBQUFBO0FBU0MsNkJBQUEsQ0FBQTs7OztHQUFBOztBQUFBLEVBQUEsUUFBQyxDQUFBLEdBQUQsR0FBZSxxQ0FBZixDQUFBOztBQUFBLEVBRUEsUUFBQyxDQUFBLFdBQUQsR0FBZSxPQUZmLENBQUE7O0FBQUEsRUFJQSxRQUFDLENBQUEsUUFBRCxHQUFlLElBSmYsQ0FBQTs7QUFBQSxFQUtBLFFBQUMsQ0FBQSxNQUFELEdBQWUsS0FMZixDQUFBOztBQUFBLEVBT0EsUUFBQyxDQUFBLElBQUQsR0FBUSxTQUFBLEdBQUE7QUFFUDtBQUFBOzs7T0FBQTtXQU1BLEtBUk87RUFBQSxDQVBSLENBQUE7O0FBQUEsRUFpQkEsUUFBQyxDQUFBLElBQUQsR0FBUSxTQUFBLEdBQUE7QUFFUCxJQUFBLFFBQUMsQ0FBQSxNQUFELEdBQVUsSUFBVixDQUFBO0FBQUEsSUFFQSxFQUFFLENBQUMsSUFBSCxDQUNDO0FBQUEsTUFBQSxLQUFBLEVBQVMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUF2QjtBQUFBLE1BQ0EsTUFBQSxFQUFTLEtBRFQ7QUFBQSxNQUVBLEtBQUEsRUFBUyxLQUZUO0tBREQsQ0FGQSxDQUFBO1dBT0EsS0FUTztFQUFBLENBakJSLENBQUE7O0FBQUEsRUE0QkEsUUFBQyxDQUFBLEtBQUQsR0FBUyxTQUFFLFFBQUYsR0FBQTtBQUVSLElBRlMsUUFBQyxDQUFBLFdBQUEsUUFFVixDQUFBO0FBQUEsSUFBQSxJQUFHLENBQUEsUUFBRSxDQUFBLE1BQUw7QUFBaUIsYUFBTyxRQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsQ0FBaUIsZ0JBQWpCLENBQVAsQ0FBakI7S0FBQTtBQUFBLElBRUEsRUFBRSxDQUFDLEtBQUgsQ0FBUyxTQUFFLEdBQUYsR0FBQTtBQUVSLE1BQUEsSUFBRyxHQUFJLENBQUEsUUFBQSxDQUFKLEtBQWlCLFdBQXBCO2VBQ0MsUUFBQyxDQUFBLFdBQUQsQ0FBYSxHQUFJLENBQUEsY0FBQSxDQUFnQixDQUFBLGFBQUEsQ0FBakMsRUFERDtPQUFBLE1BQUE7ZUFHQyxRQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsQ0FBaUIsYUFBakIsRUFIRDtPQUZRO0lBQUEsQ0FBVCxFQU9FO0FBQUEsTUFBRSxLQUFBLEVBQU8sUUFBQyxDQUFBLFdBQVY7S0FQRixDQUZBLENBQUE7V0FXQSxLQWJRO0VBQUEsQ0E1QlQsQ0FBQTs7QUFBQSxFQTJDQSxRQUFDLENBQUEsV0FBRCxHQUFlLFNBQUMsS0FBRCxHQUFBO0FBRWQsUUFBQSx5QkFBQTtBQUFBLElBQUEsUUFBQSxHQUFXLEVBQVgsQ0FBQTtBQUFBLElBQ0EsUUFBUSxDQUFDLFlBQVQsR0FBd0IsS0FEeEIsQ0FBQTtBQUFBLElBR0EsTUFBQSxHQUFXLENBQUMsQ0FBQyxRQUFGLENBQUEsQ0FIWCxDQUFBO0FBQUEsSUFJQSxPQUFBLEdBQVcsQ0FBQyxDQUFDLFFBQUYsQ0FBQSxDQUpYLENBQUE7QUFBQSxJQU1BLEVBQUUsQ0FBQyxHQUFILENBQU8sS0FBUCxFQUFjLFNBQUMsR0FBRCxHQUFBO0FBRWIsTUFBQSxRQUFRLENBQUMsU0FBVCxHQUFxQixHQUFHLENBQUMsSUFBekIsQ0FBQTtBQUFBLE1BQ0EsUUFBUSxDQUFDLFNBQVQsR0FBcUIsR0FBRyxDQUFDLEVBRHpCLENBQUE7QUFBQSxNQUVBLFFBQVEsQ0FBQyxLQUFULEdBQXFCLEdBQUcsQ0FBQyxLQUFKLElBQWEsS0FGbEMsQ0FBQTthQUdBLE1BQU0sQ0FBQyxPQUFQLENBQUEsRUFMYTtJQUFBLENBQWQsQ0FOQSxDQUFBO0FBQUEsSUFhQSxFQUFFLENBQUMsR0FBSCxDQUFPLGFBQVAsRUFBc0I7QUFBQSxNQUFFLE9BQUEsRUFBUyxLQUFYO0tBQXRCLEVBQTBDLFNBQUMsR0FBRCxHQUFBO0FBRXpDLE1BQUEsUUFBUSxDQUFDLFdBQVQsR0FBdUIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFoQyxDQUFBO2FBQ0EsT0FBTyxDQUFDLE9BQVIsQ0FBQSxFQUh5QztJQUFBLENBQTFDLENBYkEsQ0FBQTtBQUFBLElBa0JBLENBQUMsQ0FBQyxJQUFGLENBQU8sTUFBUCxFQUFlLE9BQWYsQ0FBdUIsQ0FBQyxJQUF4QixDQUE2QixTQUFBLEdBQUE7YUFBRyxRQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsQ0FBa0IsUUFBbEIsRUFBSDtJQUFBLENBQTdCLENBbEJBLENBQUE7V0FvQkEsS0F0QmM7RUFBQSxDQTNDZixDQUFBOztBQUFBLEVBbUVBLFFBQUMsQ0FBQSxLQUFELEdBQVMsU0FBQyxJQUFELEVBQU8sRUFBUCxHQUFBO0FBRVIsSUFBQSxFQUFFLENBQUMsRUFBSCxDQUFNO0FBQUEsTUFDTCxNQUFBLEVBQWMsSUFBSSxDQUFDLE1BQUwsSUFBZSxNQUR4QjtBQUFBLE1BRUwsSUFBQSxFQUFjLElBQUksQ0FBQyxJQUFMLElBQWEsRUFGdEI7QUFBQSxNQUdMLElBQUEsRUFBYyxJQUFJLENBQUMsSUFBTCxJQUFhLEVBSHRCO0FBQUEsTUFJTCxPQUFBLEVBQWMsSUFBSSxDQUFDLE9BQUwsSUFBZ0IsRUFKekI7QUFBQSxNQUtMLE9BQUEsRUFBYyxJQUFJLENBQUMsT0FBTCxJQUFnQixFQUx6QjtBQUFBLE1BTUwsV0FBQSxFQUFjLElBQUksQ0FBQyxXQUFMLElBQW9CLEVBTjdCO0tBQU4sRUFPRyxTQUFDLFFBQUQsR0FBQTt3Q0FDRixHQUFJLG1CQURGO0lBQUEsQ0FQSCxDQUFBLENBQUE7V0FVQSxLQVpRO0VBQUEsQ0FuRVQsQ0FBQTs7a0JBQUE7O0dBRnNCLGFBUHZCLENBQUE7O0FBQUEsTUEwRk0sQ0FBQyxPQUFQLEdBQWlCLFFBMUZqQixDQUFBOzs7OztBQ0FBLElBQUEsd0JBQUE7RUFBQTtpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLHNCQUFSLENBQWYsQ0FBQTs7QUFFQTtBQUFBOzs7R0FGQTs7QUFBQTtBQVNDLCtCQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSxFQUFBLFVBQUMsQ0FBQSxHQUFELEdBQVksOENBQVosQ0FBQTs7QUFBQSxFQUVBLFVBQUMsQ0FBQSxNQUFELEdBQ0M7QUFBQSxJQUFBLFVBQUEsRUFBaUIsSUFBakI7QUFBQSxJQUNBLFVBQUEsRUFBaUIsSUFEakI7QUFBQSxJQUVBLE9BQUEsRUFBaUIsZ0RBRmpCO0FBQUEsSUFHQSxjQUFBLEVBQWlCLE1BSGpCO0dBSEQsQ0FBQTs7QUFBQSxFQVFBLFVBQUMsQ0FBQSxRQUFELEdBQVksSUFSWixDQUFBOztBQUFBLEVBU0EsVUFBQyxDQUFBLE1BQUQsR0FBWSxLQVRaLENBQUE7O0FBQUEsRUFXQSxVQUFDLENBQUEsSUFBRCxHQUFRLFNBQUEsR0FBQTtBQUVQO0FBQUE7OztPQUFBO1dBTUEsS0FSTztFQUFBLENBWFIsQ0FBQTs7QUFBQSxFQXFCQSxVQUFDLENBQUEsSUFBRCxHQUFRLFNBQUEsR0FBQTtBQUVQLElBQUEsVUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFWLENBQUE7QUFBQSxJQUVBLFVBQUMsQ0FBQSxNQUFPLENBQUEsVUFBQSxDQUFSLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FGcEMsQ0FBQTtBQUFBLElBR0EsVUFBQyxDQUFBLE1BQU8sQ0FBQSxVQUFBLENBQVIsR0FBc0IsVUFBQyxDQUFBLGFBSHZCLENBQUE7V0FLQSxLQVBPO0VBQUEsQ0FyQlIsQ0FBQTs7QUFBQSxFQThCQSxVQUFDLENBQUEsS0FBRCxHQUFTLFNBQUUsUUFBRixHQUFBO0FBRVIsSUFGUyxVQUFDLENBQUEsV0FBQSxRQUVWLENBQUE7QUFBQSxJQUFBLElBQUcsVUFBQyxDQUFBLE1BQUo7QUFDQyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBVixDQUFpQixVQUFDLENBQUEsTUFBbEIsQ0FBQSxDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsVUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLENBQWlCLGdCQUFqQixDQUFBLENBSEQ7S0FBQTtXQUtBLEtBUFE7RUFBQSxDQTlCVCxDQUFBOztBQUFBLEVBdUNBLFVBQUMsQ0FBQSxhQUFELEdBQWlCLFNBQUMsR0FBRCxHQUFBO0FBRWhCLElBQUEsSUFBRyxHQUFJLENBQUEsUUFBQSxDQUFVLENBQUEsV0FBQSxDQUFqQjtBQUNDLE1BQUEsVUFBQyxDQUFBLFdBQUQsQ0FBYSxHQUFJLENBQUEsY0FBQSxDQUFqQixDQUFBLENBREQ7S0FBQSxNQUVLLElBQUcsR0FBSSxDQUFBLE9BQUEsQ0FBUyxDQUFBLGVBQUEsQ0FBaEI7QUFDSixNQUFBLFVBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixDQUFpQixhQUFqQixDQUFBLENBREk7S0FGTDtXQUtBLEtBUGdCO0VBQUEsQ0F2Q2pCLENBQUE7O0FBQUEsRUFnREEsVUFBQyxDQUFBLFdBQUQsR0FBZSxTQUFDLEtBQUQsR0FBQTtBQUVkLElBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFaLENBQWlCLE1BQWpCLEVBQXdCLElBQXhCLEVBQThCLFNBQUEsR0FBQTtBQUU3QixVQUFBLE9BQUE7QUFBQSxNQUFBLE9BQUEsR0FBVSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBeEIsQ0FBNEI7QUFBQSxRQUFBLFFBQUEsRUFBVSxJQUFWO09BQTVCLENBQVYsQ0FBQTthQUNBLE9BQU8sQ0FBQyxPQUFSLENBQWdCLFNBQUMsR0FBRCxHQUFBO0FBRWYsWUFBQSxRQUFBO0FBQUEsUUFBQSxRQUFBLEdBQ0M7QUFBQSxVQUFBLFlBQUEsRUFBZSxLQUFmO0FBQUEsVUFDQSxTQUFBLEVBQWUsR0FBRyxDQUFDLFdBRG5CO0FBQUEsVUFFQSxTQUFBLEVBQWUsR0FBRyxDQUFDLEVBRm5CO0FBQUEsVUFHQSxLQUFBLEVBQWtCLEdBQUcsQ0FBQyxNQUFPLENBQUEsQ0FBQSxDQUFkLEdBQXNCLEdBQUcsQ0FBQyxNQUFPLENBQUEsQ0FBQSxDQUFFLENBQUMsS0FBcEMsR0FBK0MsS0FIOUQ7QUFBQSxVQUlBLFdBQUEsRUFBZSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBSnpCO1NBREQsQ0FBQTtlQU9BLFVBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixDQUFrQixRQUFsQixFQVRlO01BQUEsQ0FBaEIsRUFINkI7SUFBQSxDQUE5QixDQUFBLENBQUE7V0FjQSxLQWhCYztFQUFBLENBaERmLENBQUE7O29CQUFBOztHQUZ3QixhQVB6QixDQUFBOztBQUFBLE1BMkVNLENBQUMsT0FBUCxHQUFpQixVQTNFakIsQ0FBQTs7Ozs7QUNTQSxJQUFBLFlBQUE7O0FBQUE7NEJBR0k7O0FBQUEsRUFBQSxZQUFDLENBQUEsS0FBRCxHQUFlLE9BQWYsQ0FBQTs7QUFBQSxFQUNBLFlBQUMsQ0FBQSxJQUFELEdBQWUsTUFEZixDQUFBOztBQUFBLEVBRUEsWUFBQyxDQUFBLE1BQUQsR0FBZSxRQUZmLENBQUE7O0FBQUEsRUFHQSxZQUFDLENBQUEsS0FBRCxHQUFlLE9BSGYsQ0FBQTs7QUFBQSxFQUlBLFlBQUMsQ0FBQSxXQUFELEdBQWUsYUFKZixDQUFBOztBQUFBLEVBTUEsWUFBQyxDQUFBLEtBQUQsR0FBUyxTQUFBLEdBQUE7QUFFTCxJQUFBLFlBQVksQ0FBQyxnQkFBYixHQUFpQztBQUFBLE1BQUMsSUFBQSxFQUFNLE9BQVA7QUFBQSxNQUFnQixXQUFBLEVBQWEsQ0FBQyxZQUFZLENBQUMsS0FBZCxDQUE3QjtLQUFqQyxDQUFBO0FBQUEsSUFDQSxZQUFZLENBQUMsaUJBQWIsR0FBaUM7QUFBQSxNQUFDLElBQUEsRUFBTSxRQUFQO0FBQUEsTUFBaUIsV0FBQSxFQUFhLENBQUMsWUFBWSxDQUFDLE1BQWQsQ0FBOUI7S0FEakMsQ0FBQTtBQUFBLElBRUEsWUFBWSxDQUFDLGdCQUFiLEdBQWlDO0FBQUEsTUFBQyxJQUFBLEVBQU0sT0FBUDtBQUFBLE1BQWdCLFdBQUEsRUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFkLEVBQW9CLFlBQVksQ0FBQyxLQUFqQyxFQUF3QyxZQUFZLENBQUMsV0FBckQsQ0FBN0I7S0FGakMsQ0FBQTtBQUFBLElBSUEsWUFBWSxDQUFDLFdBQWIsR0FBMkIsQ0FDdkIsWUFBWSxDQUFDLGdCQURVLEVBRXZCLFlBQVksQ0FBQyxpQkFGVSxFQUd2QixZQUFZLENBQUMsZ0JBSFUsQ0FKM0IsQ0FGSztFQUFBLENBTlQsQ0FBQTs7QUFBQSxFQW1CQSxZQUFDLENBQUEsY0FBRCxHQUFrQixTQUFBLEdBQUE7QUFFZCxXQUFPLE1BQU0sQ0FBQyxnQkFBUCxDQUF3QixRQUFRLENBQUMsSUFBakMsRUFBdUMsT0FBdkMsQ0FBK0MsQ0FBQyxnQkFBaEQsQ0FBaUUsU0FBakUsQ0FBUCxDQUZjO0VBQUEsQ0FuQmxCLENBQUE7O0FBQUEsRUF1QkEsWUFBQyxDQUFBLGFBQUQsR0FBaUIsU0FBQSxHQUFBO0FBRWIsUUFBQSxrQkFBQTtBQUFBLElBQUEsS0FBQSxHQUFRLFlBQVksQ0FBQyxjQUFiLENBQUEsQ0FBUixDQUFBO0FBRUEsU0FBUyxrSEFBVCxHQUFBO0FBQ0ksTUFBQSxJQUFHLFlBQVksQ0FBQyxXQUFZLENBQUEsQ0FBQSxDQUFFLENBQUMsV0FBVyxDQUFDLE9BQXhDLENBQWdELEtBQWhELENBQUEsR0FBeUQsQ0FBQSxDQUE1RDtBQUNJLGVBQU8sWUFBWSxDQUFDLFdBQVksQ0FBQSxDQUFBLENBQUUsQ0FBQyxJQUFuQyxDQURKO09BREo7QUFBQSxLQUZBO0FBTUEsV0FBTyxFQUFQLENBUmE7RUFBQSxDQXZCakIsQ0FBQTs7QUFBQSxFQWlDQSxZQUFDLENBQUEsWUFBRCxHQUFnQixTQUFDLFVBQUQsR0FBQTtBQUVaLFFBQUEsV0FBQTtBQUFBLFNBQVMsZ0hBQVQsR0FBQTtBQUVJLE1BQUEsSUFBRyxVQUFVLENBQUMsV0FBWSxDQUFBLENBQUEsQ0FBdkIsS0FBNkIsWUFBWSxDQUFDLGNBQWIsQ0FBQSxDQUFoQztBQUNJLGVBQU8sSUFBUCxDQURKO09BRko7QUFBQSxLQUFBO0FBS0EsV0FBTyxLQUFQLENBUFk7RUFBQSxDQWpDaEIsQ0FBQTs7c0JBQUE7O0lBSEosQ0FBQTs7QUFBQSxNQTZDTSxDQUFDLFlBQVAsR0FBc0IsWUE3Q3RCLENBQUE7O0FBQUEsTUErQ00sQ0FBQyxPQUFQLEdBQWlCLFlBL0NqQixDQUFBOzs7OztBQ1RBLElBQUEsV0FBQTs7QUFBQTsyQkFFSTs7QUFBQSxFQUFBLFdBQUMsQ0FBQSxRQUFELEdBQVcsSUFBSSxDQUFDLEdBQWhCLENBQUE7O0FBQUEsRUFDQSxXQUFDLENBQUEsUUFBRCxHQUFXLElBQUksQ0FBQyxHQURoQixDQUFBOztBQUFBLEVBRUEsV0FBQyxDQUFBLFdBQUQsR0FBYyxJQUFJLENBQUMsTUFGbkIsQ0FBQTs7QUFBQSxFQUdBLFdBQUMsQ0FBQSxRQUFELEdBQVcsSUFBSSxDQUFDLEdBSGhCLENBQUE7O0FBQUEsRUFJQSxXQUFDLENBQUEsVUFBRCxHQUFhLElBQUksQ0FBQyxLQUpsQixDQUFBOztBQUFBLEVBTUEsV0FBQyxDQUFBLEtBQUQsR0FBTyxTQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsR0FBZCxHQUFBO0FBQ0gsV0FBTyxJQUFJLENBQUMsR0FBTCxDQUFVLElBQUksQ0FBQyxHQUFMLENBQVMsR0FBVCxFQUFhLE1BQWIsQ0FBVixFQUFnQyxHQUFoQyxDQUFQLENBREc7RUFBQSxDQU5QLENBQUE7O0FBQUEsRUFTQSxXQUFDLENBQUEsY0FBRCxHQUFpQixTQUFBLEdBQUE7QUFFYixRQUFBLHFCQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsa0JBQWtCLENBQUMsS0FBbkIsQ0FBeUIsRUFBekIsQ0FBVixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsR0FEUixDQUFBO0FBRUEsU0FBUyw0QkFBVCxHQUFBO0FBQ0ksTUFBQSxLQUFBLElBQVMsT0FBUSxDQUFBLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBSSxDQUFDLE1BQUwsQ0FBQSxDQUFBLEdBQWdCLEVBQTNCLENBQUEsQ0FBakIsQ0FESjtBQUFBLEtBRkE7V0FJQSxNQU5hO0VBQUEsQ0FUakIsQ0FBQTs7QUFBQSxFQWlCQSxXQUFDLENBQUEsZ0JBQUQsR0FBb0IsU0FBQyxLQUFELEVBQVEsS0FBUixHQUFBO0FBR2hCLFFBQUEsZ0RBQUE7QUFBQSxJQUFBLE9BQUEsR0FBVSxJQUFBLEdBQUssRUFBTCxHQUFRLEVBQVIsR0FBVyxFQUFyQixDQUFBO0FBQUEsSUFDQSxJQUFBLEdBQVUsRUFEVixDQUFBO0FBQUEsSUFJQSxRQUFBLEdBQVcsS0FBSyxDQUFDLE9BQU4sQ0FBQSxDQUpYLENBQUE7QUFBQSxJQUtBLFFBQUEsR0FBVyxLQUFLLENBQUMsT0FBTixDQUFBLENBTFgsQ0FBQTtBQUFBLElBUUEsYUFBQSxHQUFnQixRQUFBLEdBQVcsUUFSM0IsQ0FBQTtBQUFBLElBV0EsYUFBQSxHQUFnQixhQUFBLEdBQWMsSUFYOUIsQ0FBQTtBQUFBLElBWUEsSUFBSSxDQUFDLE9BQUwsR0FBZ0IsSUFBSSxDQUFDLEtBQUwsQ0FBVyxhQUFBLEdBQWdCLEVBQTNCLENBWmhCLENBQUE7QUFBQSxJQWNBLGFBQUEsR0FBZ0IsYUFBQSxHQUFjLEVBZDlCLENBQUE7QUFBQSxJQWVBLElBQUksQ0FBQyxPQUFMLEdBQWdCLElBQUksQ0FBQyxLQUFMLENBQVcsYUFBQSxHQUFnQixFQUEzQixDQWZoQixDQUFBO0FBQUEsSUFpQkEsYUFBQSxHQUFnQixhQUFBLEdBQWMsRUFqQjlCLENBQUE7QUFBQSxJQWtCQSxJQUFJLENBQUMsS0FBTCxHQUFnQixJQUFJLENBQUMsS0FBTCxDQUFXLGFBQUEsR0FBZ0IsRUFBM0IsQ0FsQmhCLENBQUE7QUFBQSxJQW9CQSxJQUFJLENBQUMsSUFBTCxHQUFnQixJQUFJLENBQUMsS0FBTCxDQUFXLGFBQUEsR0FBYyxFQUF6QixDQXBCaEIsQ0FBQTtXQXNCQSxLQXpCZ0I7RUFBQSxDQWpCcEIsQ0FBQTs7QUFBQSxFQTRDQSxXQUFDLENBQUEsR0FBRCxHQUFNLFNBQUUsR0FBRixFQUFPLElBQVAsRUFBYSxJQUFiLEVBQW1CLElBQW5CLEVBQXlCLElBQXpCLEVBQStCLEtBQS9CLEVBQThDLFlBQTlDLEVBQW1FLFlBQW5FLEdBQUE7QUFDRixRQUFBLFVBQUE7O01BRGlDLFFBQVE7S0FDekM7O01BRGdELGVBQWU7S0FDL0Q7O01BRHFFLGVBQWU7S0FDcEY7QUFBQSxJQUFBLElBQUcsWUFBQSxJQUFpQixHQUFBLEdBQU0sSUFBMUI7QUFBb0MsYUFBTyxJQUFQLENBQXBDO0tBQUE7QUFDQSxJQUFBLElBQUcsWUFBQSxJQUFpQixHQUFBLEdBQU0sSUFBMUI7QUFBb0MsYUFBTyxJQUFQLENBQXBDO0tBREE7QUFBQSxJQUdBLElBQUEsR0FBTyxDQUFDLEdBQUEsR0FBTSxJQUFQLENBQUEsR0FBZSxDQUFDLElBQUEsR0FBTyxJQUFSLENBSHRCLENBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxDQUFDLElBQUEsR0FBTyxDQUFDLElBQUEsR0FBTyxJQUFSLENBQVIsQ0FBQSxHQUF5QixJQUpoQyxDQUFBO0FBS0EsSUFBQSxJQUFHLEtBQUg7QUFBYyxhQUFPLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBWCxDQUFQLENBQWQ7S0FMQTtBQU9BLFdBQU8sSUFBUCxDQVJFO0VBQUEsQ0E1Q04sQ0FBQTs7QUFBQSxFQXNEQSxXQUFDLENBQUEsU0FBRCxHQUFZLFNBQUUsTUFBRixHQUFBO0FBQ1IsV0FBTyxNQUFBLEdBQVMsQ0FBRSxJQUFJLENBQUMsRUFBTCxHQUFVLEdBQVosQ0FBaEIsQ0FEUTtFQUFBLENBdERaLENBQUE7O0FBQUEsRUF5REEsV0FBQyxDQUFBLFFBQUQsR0FBVyxTQUFFLE9BQUYsR0FBQTtBQUNQLFdBQU8sT0FBQSxHQUFVLENBQUUsR0FBQSxHQUFNLElBQUksQ0FBQyxFQUFiLENBQWpCLENBRE87RUFBQSxDQXpEWCxDQUFBOztBQUFBLEVBNERBLFdBQUMsQ0FBQSxTQUFELEdBQVksU0FBRSxHQUFGLEVBQU8sR0FBUCxFQUFZLEdBQVosRUFBaUIsVUFBakIsR0FBQTtBQUNSLElBQUEsSUFBRyxVQUFIO0FBQW1CLGFBQU8sR0FBQSxJQUFPLEdBQVAsSUFBYyxHQUFBLElBQU8sR0FBNUIsQ0FBbkI7S0FBQSxNQUFBO0FBQ0ssYUFBTyxHQUFBLElBQU8sR0FBUCxJQUFjLEdBQUEsSUFBTyxHQUE1QixDQURMO0tBRFE7RUFBQSxDQTVEWixDQUFBOztBQUFBLEVBaUVBLFdBQUMsQ0FBQSxlQUFELEdBQWtCLFNBQUMsTUFBRCxHQUFBO0FBRWQsUUFBQSxFQUFBO0FBQUEsSUFBQSxJQUFHLE1BQUEsR0FBUyxJQUFaO0FBRUksYUFBTyxFQUFBLEdBQUUsQ0FBQyxJQUFJLENBQUMsS0FBTCxDQUFXLE1BQVgsQ0FBRCxDQUFGLEdBQXNCLEdBQTdCLENBRko7S0FBQSxNQUFBO0FBTUksTUFBQSxFQUFBLEdBQUssQ0FBQyxNQUFBLEdBQU8sSUFBUixDQUFhLENBQUMsT0FBZCxDQUFzQixDQUF0QixDQUFMLENBQUE7QUFDQSxhQUFPLEVBQUEsR0FBRyxFQUFILEdBQU0sSUFBYixDQVBKO0tBRmM7RUFBQSxDQWpFbEIsQ0FBQTs7QUFBQSxFQTZFQSxXQUFDLENBQUEsUUFBRCxHQUFXLFNBQUUsTUFBRixFQUFVLEtBQVYsR0FBQTtBQUVQLFFBQUEsSUFBQTtBQUFBLElBQUEsS0FBQSxJQUFTLE1BQU0sQ0FBQyxRQUFQLENBQUEsQ0FBaUIsQ0FBQyxNQUEzQixDQUFBO0FBRUEsSUFBQSxJQUFHLEtBQUEsR0FBUSxDQUFYO0FBQ0ksYUFBVyxJQUFBLEtBQUEsQ0FBTyxLQUFBLEdBQVEsNkNBQXVCO0FBQUEsUUFBQSxDQUFBLEVBQUksQ0FBSjtPQUF2QixDQUFmLENBQThDLENBQUMsSUFBL0MsQ0FBcUQsR0FBckQsQ0FBSixHQUFpRSxNQUF4RSxDQURKO0tBRkE7QUFLQSxXQUFPLE1BQUEsR0FBUyxFQUFoQixDQVBPO0VBQUEsQ0E3RVgsQ0FBQTs7cUJBQUE7O0lBRkosQ0FBQTs7QUFBQSxNQXdGTSxDQUFDLE9BQVAsR0FBaUIsV0F4RmpCLENBQUE7Ozs7O0FDQUE7QUFBQTs7OztHQUFBO0FBQUEsSUFBQSxTQUFBOztBQUFBO3lCQVFJOztBQUFBLEVBQUEsU0FBQyxDQUFBLFFBQUQsR0FBWSxFQUFaLENBQUE7O0FBQUEsRUFFQSxTQUFDLENBQUEsT0FBRCxHQUFVLFNBQUUsSUFBRixHQUFBO0FBQ047QUFBQTs7Ozs7Ozs7T0FBQTtBQUFBLFFBQUEsQ0FBQTtBQUFBLElBVUEsQ0FBQSxHQUFJLENBQUMsQ0FBQyxJQUFGLENBQU87QUFBQSxNQUVQLEdBQUEsRUFBYyxJQUFJLENBQUMsR0FGWjtBQUFBLE1BR1AsSUFBQSxFQUFpQixJQUFJLENBQUMsSUFBUixHQUFrQixJQUFJLENBQUMsSUFBdkIsR0FBaUMsTUFIeEM7QUFBQSxNQUlQLElBQUEsRUFBaUIsSUFBSSxDQUFDLElBQVIsR0FBa0IsSUFBSSxDQUFDLElBQXZCLEdBQWlDLElBSnhDO0FBQUEsTUFLUCxRQUFBLEVBQWlCLElBQUksQ0FBQyxRQUFSLEdBQXNCLElBQUksQ0FBQyxRQUEzQixHQUF5QyxNQUxoRDtBQUFBLE1BTVAsV0FBQSxFQUFpQixJQUFJLENBQUMsV0FBUixHQUF5QixJQUFJLENBQUMsV0FBOUIsR0FBK0Msa0RBTnREO0FBQUEsTUFPUCxXQUFBLEVBQWlCLElBQUksQ0FBQyxXQUFMLEtBQW9CLElBQXBCLElBQTZCLElBQUksQ0FBQyxXQUFMLEtBQW9CLE1BQXBELEdBQW1FLElBQUksQ0FBQyxXQUF4RSxHQUF5RixJQVBoRztLQUFQLENBVkosQ0FBQTtBQUFBLElBcUJBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBSSxDQUFDLElBQVosQ0FyQkEsQ0FBQTtBQUFBLElBc0JBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBSSxDQUFDLElBQVosQ0F0QkEsQ0FBQTtXQXdCQSxFQXpCTTtFQUFBLENBRlYsQ0FBQTs7QUFBQSxFQTZCQSxTQUFDLENBQUEsUUFBRCxHQUFZLFNBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxJQUFiLEdBQUE7QUFDUjtBQUFBOzs7O09BQUE7QUFBQSxJQU1BLFNBQUMsQ0FBQSxPQUFELENBQ0k7QUFBQSxNQUFBLEdBQUEsRUFBUyxjQUFUO0FBQUEsTUFDQSxJQUFBLEVBQVMsTUFEVDtBQUFBLE1BRUEsSUFBQSxFQUFTO0FBQUEsUUFBQyxZQUFBLEVBQWUsU0FBQSxDQUFVLElBQVYsQ0FBaEI7T0FGVDtBQUFBLE1BR0EsSUFBQSxFQUFTLElBSFQ7QUFBQSxNQUlBLElBQUEsRUFBUyxJQUpUO0tBREosQ0FOQSxDQUFBO1dBYUEsS0FkUTtFQUFBLENBN0JaLENBQUE7O0FBQUEsRUE2Q0EsU0FBQyxDQUFBLFdBQUQsR0FBZSxTQUFDLEVBQUQsRUFBSyxJQUFMLEVBQVcsSUFBWCxHQUFBO0FBRVgsSUFBQSxTQUFDLENBQUEsT0FBRCxDQUNJO0FBQUEsTUFBQSxHQUFBLEVBQVMsY0FBQSxHQUFlLEVBQXhCO0FBQUEsTUFDQSxJQUFBLEVBQVMsUUFEVDtBQUFBLE1BRUEsSUFBQSxFQUFTLElBRlQ7QUFBQSxNQUdBLElBQUEsRUFBUyxJQUhUO0tBREosQ0FBQSxDQUFBO1dBTUEsS0FSVztFQUFBLENBN0NmLENBQUE7O21CQUFBOztJQVJKLENBQUE7O0FBQUEsTUErRE0sQ0FBQyxPQUFQLEdBQWlCLFNBL0RqQixDQUFBOzs7OztBQ0FBO0FBQUE7OztHQUFBO0FBQUEsSUFBQSxLQUFBO0VBQUEsa0ZBQUE7O0FBQUE7QUFNSSxrQkFBQSxHQUFBLEdBQU0sSUFBTixDQUFBOztBQUVjLEVBQUEsZUFBQSxHQUFBO0FBRVYsbUNBQUEsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSwyQ0FBQSxDQUFBO0FBQUEsNkNBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSwyQ0FBQSxDQUFBO0FBQUEsaURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsR0FBRCxHQUFPLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLFFBQWIsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUpVO0VBQUEsQ0FGZDs7QUFBQSxrQkFRQSxPQUFBLEdBQVUsU0FBQyxHQUFELEVBQU0sQ0FBTixFQUFTLENBQVQsR0FBQTtBQUVOLFFBQUEsU0FBQTtBQUFBLElBQUEsSUFBQSxHQUFPLENBQUUsTUFBTSxDQUFDLFVBQVAsR0FBcUIsQ0FBdkIsQ0FBQSxJQUE4QixDQUFyQyxDQUFBO0FBQUEsSUFDQSxHQUFBLEdBQU8sQ0FBRSxNQUFNLENBQUMsV0FBUCxHQUFxQixDQUF2QixDQUFBLElBQThCLENBRHJDLENBQUE7QUFBQSxJQUdBLE1BQU0sQ0FBQyxJQUFQLENBQVksR0FBWixFQUFpQixFQUFqQixFQUFxQixNQUFBLEdBQU8sR0FBUCxHQUFXLFFBQVgsR0FBb0IsSUFBcEIsR0FBeUIsU0FBekIsR0FBbUMsQ0FBbkMsR0FBcUMsVUFBckMsR0FBZ0QsQ0FBaEQsR0FBa0QseUJBQXZFLENBSEEsQ0FBQTtXQUtBLEtBUE07RUFBQSxDQVJWLENBQUE7O0FBQUEsa0JBaUJBLElBQUEsR0FBTyxTQUFFLEdBQUYsR0FBQTtBQUVILElBQUEsR0FBQSxHQUFNLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBTixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsT0FBRCxDQUFVLG9DQUFBLEdBQW9DLEdBQTlDLEVBQXFELEdBQXJELEVBQTBELEdBQTFELENBRkEsQ0FBQTtXQUlBLEtBTkc7RUFBQSxDQWpCUCxDQUFBOztBQUFBLGtCQXlCQSxTQUFBLEdBQVksU0FBQyxHQUFELEVBQU0sS0FBTixFQUFhLEtBQWIsR0FBQTtBQUVSLElBQUEsR0FBQSxHQUFRLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FEUixDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FGUixDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsT0FBRCxDQUFVLGtEQUFBLEdBQWtELEdBQWxELEdBQXNELFNBQXRELEdBQStELEtBQS9ELEdBQXFFLGVBQXJFLEdBQW9GLEtBQTlGLEVBQXVHLEdBQXZHLEVBQTRHLEdBQTVHLENBSkEsQ0FBQTtXQU1BLEtBUlE7RUFBQSxDQXpCWixDQUFBOztBQUFBLGtCQW1DQSxNQUFBLEdBQVMsU0FBQyxHQUFELEVBQU0sS0FBTixFQUFhLEtBQWIsR0FBQTtBQUVMLElBQUEsR0FBQSxHQUFRLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FEUixDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FGUixDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsT0FBRCxDQUFVLDJDQUFBLEdBQTJDLEtBQTNDLEdBQWlELFdBQWpELEdBQTRELEtBQTVELEdBQWtFLGNBQWxFLEdBQWdGLEdBQTFGLEVBQWlHLEdBQWpHLEVBQXNHLEdBQXRHLENBSkEsQ0FBQTtXQU1BLEtBUks7RUFBQSxDQW5DVCxDQUFBOztBQUFBLGtCQTZDQSxRQUFBLEdBQVcsU0FBRSxHQUFGLEVBQVEsSUFBUixHQUFBO0FBRVAsUUFBQSxLQUFBOztNQUZlLE9BQU87S0FFdEI7QUFBQSxJQUFBLEdBQUEsR0FBUSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQVIsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLGtCQUFBLENBQW1CLElBQW5CLENBRFIsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE9BQUQsQ0FBVSxzQ0FBQSxHQUFzQyxHQUF0QyxHQUEwQyxLQUExQyxHQUErQyxLQUF6RCxFQUFrRSxHQUFsRSxFQUF1RSxHQUF2RSxDQUhBLENBQUE7V0FLQSxLQVBPO0VBQUEsQ0E3Q1gsQ0FBQTs7QUFBQSxrQkFzREEsT0FBQSxHQUFVLFNBQUUsR0FBRixFQUFRLElBQVIsR0FBQTtBQUVOLFFBQUEsS0FBQTs7TUFGYyxPQUFPO0tBRXJCO0FBQUEsSUFBQSxHQUFBLEdBQVEsa0JBQUEsQ0FBbUIsR0FBQSxJQUFPLElBQUMsQ0FBQSxHQUEzQixDQUFSLENBQUE7QUFDQSxJQUFBLElBQUcsSUFBQSxLQUFRLEVBQVg7QUFDSSxNQUFBLElBQUEsR0FBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQiw4QkFBakIsQ0FBUCxDQURKO0tBREE7QUFBQSxJQUlBLEtBQUEsR0FBUSxrQkFBQSxDQUFtQixJQUFuQixDQUpSLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxPQUFELENBQVUsd0NBQUEsR0FBd0MsS0FBeEMsR0FBOEMsT0FBOUMsR0FBcUQsR0FBL0QsRUFBc0UsR0FBdEUsRUFBMkUsR0FBM0UsQ0FOQSxDQUFBO1dBUUEsS0FWTTtFQUFBLENBdERWLENBQUE7O0FBQUEsa0JBa0VBLE1BQUEsR0FBUyxTQUFFLEdBQUYsR0FBQTtBQUVMLElBQUEsR0FBQSxHQUFNLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBTixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsT0FBRCxDQUFTLG9EQUFBLEdBQXVELEdBQWhFLEVBQXFFLEdBQXJFLEVBQTBFLEdBQTFFLENBRkEsQ0FBQTtXQUlBLEtBTks7RUFBQSxDQWxFVCxDQUFBOztBQUFBLGtCQTBFQSxLQUFBLEdBQVEsU0FBRSxHQUFGLEdBQUE7QUFFSixJQUFBLEdBQUEsR0FBTSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQU4sQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE9BQUQsQ0FBVSwrQ0FBQSxHQUErQyxHQUEvQyxHQUFtRCxpQkFBN0QsRUFBK0UsR0FBL0UsRUFBb0YsR0FBcEYsQ0FGQSxDQUFBO1dBSUEsS0FOSTtFQUFBLENBMUVSLENBQUE7O0FBQUEsa0JBa0ZBLEVBQUEsR0FBSyxTQUFBLEdBQUE7QUFFRCxXQUFPLE1BQU0sQ0FBQyxFQUFkLENBRkM7RUFBQSxDQWxGTCxDQUFBOztlQUFBOztJQU5KLENBQUE7O0FBQUEsTUE0Rk0sQ0FBQyxPQUFQLEdBQWlCLEtBNUZqQixDQUFBOzs7OztBQ0FBLElBQUEsWUFBQTtFQUFBOztpU0FBQTs7QUFBQTtBQUVDLGlDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQUFBOztBQUFBLHlCQUFBLEVBQUEsR0FBZSxJQUFmLENBQUE7O0FBQUEseUJBQ0EsRUFBQSxHQUFlLElBRGYsQ0FBQTs7QUFBQSx5QkFFQSxRQUFBLEdBQWUsSUFGZixDQUFBOztBQUFBLHlCQUdBLFFBQUEsR0FBZSxJQUhmLENBQUE7O0FBQUEseUJBSUEsWUFBQSxHQUFlLElBSmYsQ0FBQTs7QUFBQSx5QkFNQSxVQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVosUUFBQSxPQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsUUFBRCxHQUFZLEVBQVosQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsUUFBSjtBQUNDLE1BQUEsT0FBQSxHQUFVLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsU0FBUyxDQUFDLEdBQWhCLENBQW9CLElBQUMsQ0FBQSxRQUFyQixDQUFYLENBQVYsQ0FBQTtBQUFBLE1BQ0EsSUFBQyxDQUFBLFVBQUQsQ0FBWSxPQUFBLENBQVEsSUFBQyxDQUFBLFlBQVQsQ0FBWixDQURBLENBREQ7S0FGQTtBQU1BLElBQUEsSUFBdUIsSUFBQyxDQUFBLEVBQXhCO0FBQUEsTUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxJQUFWLEVBQWdCLElBQUMsQ0FBQSxFQUFqQixDQUFBLENBQUE7S0FOQTtBQU9BLElBQUEsSUFBNEIsSUFBQyxDQUFBLFNBQTdCO0FBQUEsTUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFFBQUwsQ0FBYyxJQUFDLENBQUEsU0FBZixDQUFBLENBQUE7S0FQQTtBQUFBLElBU0EsSUFBQyxDQUFBLElBQUQsQ0FBQSxDQVRBLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxNQUFELEdBQVUsS0FYVixDQUFBO1dBYUEsS0FmWTtFQUFBLENBTmIsQ0FBQTs7QUFBQSx5QkF1QkEsSUFBQSxHQUFPLFNBQUEsR0FBQTtXQUVOLEtBRk07RUFBQSxDQXZCUCxDQUFBOztBQUFBLHlCQTJCQSxNQUFBLEdBQVMsU0FBQSxHQUFBO1dBRVIsS0FGUTtFQUFBLENBM0JULENBQUE7O0FBQUEseUJBK0JBLE1BQUEsR0FBUyxTQUFBLEdBQUE7V0FFUixLQUZRO0VBQUEsQ0EvQlQsQ0FBQTs7QUFBQSx5QkFtQ0EsUUFBQSxHQUFXLFNBQUMsS0FBRCxFQUFRLE9BQVIsR0FBQTtBQUVWLFFBQUEsU0FBQTs7TUFGa0IsVUFBVTtLQUU1QjtBQUFBLElBQUEsSUFBd0IsS0FBSyxDQUFDLEVBQTlCO0FBQUEsTUFBQSxJQUFDLENBQUEsUUFBUSxDQUFDLElBQVYsQ0FBZSxLQUFmLENBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxNQUFBLEdBQVksSUFBQyxDQUFBLGFBQUosR0FBdUIsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLGFBQVgsQ0FBeUIsQ0FBQyxFQUExQixDQUE2QixDQUE3QixDQUF2QixHQUE0RCxJQUFDLENBQUEsR0FEdEUsQ0FBQTtBQUFBLElBR0EsQ0FBQSxHQUFPLEtBQUssQ0FBQyxFQUFULEdBQWlCLEtBQUssQ0FBQyxHQUF2QixHQUFnQyxLQUhwQyxDQUFBO0FBS0EsSUFBQSxJQUFHLENBQUEsT0FBSDtBQUNDLE1BQUEsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFkLENBQUEsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLE1BQU0sQ0FBQyxPQUFQLENBQWUsQ0FBZixDQUFBLENBSEQ7S0FMQTtXQVVBLEtBWlU7RUFBQSxDQW5DWCxDQUFBOztBQUFBLHlCQWlEQSxPQUFBLEdBQVUsU0FBQyxHQUFELEVBQU0sS0FBTixHQUFBO0FBRVQsUUFBQSxDQUFBO0FBQUEsSUFBQSxJQUF3QixLQUFLLENBQUMsRUFBOUI7QUFBQSxNQUFBLElBQUMsQ0FBQSxRQUFRLENBQUMsSUFBVixDQUFlLEtBQWYsQ0FBQSxDQUFBO0tBQUE7QUFBQSxJQUNBLENBQUEsR0FBTyxLQUFLLENBQUMsRUFBVCxHQUFpQixLQUFLLENBQUMsR0FBdkIsR0FBZ0MsS0FEcEMsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsR0FBZCxDQUFrQixDQUFDLFdBQW5CLENBQStCLENBQS9CLENBRkEsQ0FBQTtXQUlBLEtBTlM7RUFBQSxDQWpEVixDQUFBOztBQUFBLHlCQXlEQSxNQUFBLEdBQVMsU0FBQyxLQUFELEdBQUE7QUFFUixRQUFBLENBQUE7QUFBQSxJQUFBLElBQU8sYUFBUDtBQUNDLFlBQUEsQ0FERDtLQUFBO0FBQUEsSUFHQSxDQUFBLEdBQU8sS0FBSyxDQUFDLEVBQVQsR0FBaUIsS0FBSyxDQUFDLEdBQXZCLEdBQWdDLENBQUEsQ0FBRSxLQUFGLENBSHBDLENBQUE7QUFJQSxJQUFBLElBQW1CLENBQUEsSUFBTSxLQUFLLENBQUMsT0FBL0I7QUFBQSxNQUFBLEtBQUssQ0FBQyxPQUFOLENBQUEsQ0FBQSxDQUFBO0tBSkE7QUFNQSxJQUFBLElBQUcsQ0FBQSxJQUFLLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixDQUFrQixLQUFsQixDQUFBLEtBQTRCLENBQUEsQ0FBcEM7QUFDQyxNQUFBLElBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixDQUFrQixJQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsQ0FBa0IsS0FBbEIsQ0FBbEIsRUFBNEMsQ0FBNUMsQ0FBQSxDQUREO0tBTkE7QUFBQSxJQVNBLENBQUMsQ0FBQyxNQUFGLENBQUEsQ0FUQSxDQUFBO1dBV0EsS0FiUTtFQUFBLENBekRULENBQUE7O0FBQUEseUJBd0VBLFFBQUEsR0FBVyxTQUFDLEtBQUQsR0FBQTtBQUVWLFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7QUFBQyxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVQ7QUFBdUIsUUFBQSxLQUFLLENBQUMsUUFBTixDQUFBLENBQUEsQ0FBdkI7T0FBRDtBQUFBLEtBQUE7V0FFQSxLQUpVO0VBQUEsQ0F4RVgsQ0FBQTs7QUFBQSx5QkE4RUEsWUFBQSxHQUFlLFNBQUUsT0FBRixHQUFBO0FBRWQsSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLEdBQUwsQ0FDQztBQUFBLE1BQUEsZ0JBQUEsRUFBcUIsT0FBSCxHQUFnQixNQUFoQixHQUE0QixNQUE5QztLQURELENBQUEsQ0FBQTtXQUdBLEtBTGM7RUFBQSxDQTlFZixDQUFBOztBQUFBLHlCQXFGQSxZQUFBLEdBQWUsU0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLEtBQVAsRUFBa0IsS0FBbEIsR0FBQTtBQUVkLFFBQUEsR0FBQTs7TUFGcUIsUUFBTTtLQUUzQjtBQUFBLElBQUEsSUFBRyxTQUFTLENBQUMsZUFBYjtBQUNDLE1BQUEsR0FBQSxHQUFPLGNBQUEsR0FBYSxDQUFDLENBQUEsR0FBRSxLQUFILENBQWIsR0FBc0IsSUFBdEIsR0FBeUIsQ0FBQyxDQUFBLEdBQUUsS0FBSCxDQUF6QixHQUFrQyxNQUF6QyxDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsR0FBQSxHQUFPLFlBQUEsR0FBVyxDQUFDLENBQUEsR0FBRSxLQUFILENBQVgsR0FBb0IsSUFBcEIsR0FBdUIsQ0FBQyxDQUFBLEdBQUUsS0FBSCxDQUF2QixHQUFnQyxHQUF2QyxDQUhEO0tBQUE7QUFLQSxJQUFBLElBQUcsS0FBSDtBQUFjLE1BQUEsR0FBQSxHQUFNLEVBQUEsR0FBRyxHQUFILEdBQU8sU0FBUCxHQUFnQixLQUFoQixHQUFzQixHQUE1QixDQUFkO0tBTEE7V0FPQSxJQVRjO0VBQUEsQ0FyRmYsQ0FBQTs7QUFBQSx5QkFnR0EsU0FBQSxHQUFZLFNBQUEsR0FBQTtBQUVYLFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7O1FBRUMsS0FBSyxDQUFDO09BQU47QUFFQSxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFsQjtBQUVDLFFBQUEsS0FBSyxDQUFDLFNBQU4sQ0FBQSxDQUFBLENBRkQ7T0FKRDtBQUFBLEtBQUE7V0FRQSxLQVZXO0VBQUEsQ0FoR1osQ0FBQTs7QUFBQSx5QkE0R0EsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVULFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7O1FBRUMsS0FBSyxDQUFDO09BQU47QUFFQSxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFsQjtBQUVDLFFBQUEsS0FBSyxDQUFDLE9BQU4sQ0FBQSxDQUFBLENBRkQ7T0FKRDtBQUFBLEtBQUE7V0FRQSxLQVZTO0VBQUEsQ0E1R1YsQ0FBQTs7QUFBQSx5QkF3SEEsaUJBQUEsR0FBbUIsU0FBQSxHQUFBO0FBRWxCLFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7QUFBQSxNQUFBLElBQUMsQ0FBQSxNQUFELENBQVEsS0FBUixDQUFBLENBQUE7QUFBQSxLQUFBO1dBRUEsS0FKa0I7RUFBQSxDQXhIbkIsQ0FBQTs7QUFBQSx5QkE4SEEsZUFBQSxHQUFrQixTQUFDLEdBQUQsRUFBTSxRQUFOLEdBQUE7QUFFakIsUUFBQSxrQkFBQTs7TUFGdUIsV0FBUyxJQUFDLENBQUE7S0FFakM7QUFBQSxTQUFBLHVEQUFBOzBCQUFBO0FBRUMsTUFBQSxLQUFLLENBQUMsT0FBTixDQUFjLEdBQWQsQ0FBQSxDQUFBO0FBRUEsTUFBQSxJQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBbEI7QUFFQyxRQUFBLElBQUMsQ0FBQSxlQUFELENBQWlCLEdBQWpCLEVBQXNCLEtBQUssQ0FBQyxRQUE1QixDQUFBLENBRkQ7T0FKRDtBQUFBLEtBQUE7V0FRQSxLQVZpQjtFQUFBLENBOUhsQixDQUFBOztBQUFBLHlCQTBJQSxZQUFBLEdBQWUsU0FBQyxNQUFELEVBQVMsTUFBVCxFQUFpQixRQUFqQixHQUFBO0FBRWQsUUFBQSxrQkFBQTs7TUFGK0IsV0FBUyxJQUFDLENBQUE7S0FFekM7QUFBQSxTQUFBLHVEQUFBOzBCQUFBOztRQUVDLEtBQU0sQ0FBQSxNQUFBLEVBQVM7T0FBZjtBQUVBLE1BQUEsSUFBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQWxCO0FBRUMsUUFBQSxJQUFDLENBQUEsWUFBRCxDQUFjLE1BQWQsRUFBc0IsTUFBdEIsRUFBOEIsS0FBSyxDQUFDLFFBQXBDLENBQUEsQ0FGRDtPQUpEO0FBQUEsS0FBQTtXQVFBLEtBVmM7RUFBQSxDQTFJZixDQUFBOztBQUFBLHlCQXNKQSxtQkFBQSxHQUFzQixTQUFDLE1BQUQsRUFBUyxNQUFULEVBQWlCLFFBQWpCLEdBQUE7QUFFckIsUUFBQSxrQkFBQTs7TUFGc0MsV0FBUyxJQUFDLENBQUE7S0FFaEQ7O01BQUEsSUFBRSxDQUFBLE1BQUEsRUFBUztLQUFYO0FBRUEsU0FBQSx1REFBQTswQkFBQTs7UUFFQyxLQUFNLENBQUEsTUFBQSxFQUFTO09BQWY7QUFFQSxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFsQjtBQUVDLFFBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxNQUFkLEVBQXNCLE1BQXRCLEVBQThCLEtBQUssQ0FBQyxRQUFwQyxDQUFBLENBRkQ7T0FKRDtBQUFBLEtBRkE7V0FVQSxLQVpxQjtFQUFBLENBdEp0QixDQUFBOztBQUFBLHlCQW9LQSxjQUFBLEdBQWlCLFNBQUMsR0FBRCxFQUFNLElBQU4sRUFBWSxXQUFaLEdBQUE7QUFFaEIsUUFBQSxFQUFBOztNQUY0QixjQUFZO0tBRXhDO0FBQUEsSUFBQSxFQUFBLEdBQVEsV0FBSCxHQUF3QixJQUFBLE1BQUEsQ0FBTyxnQkFBUCxFQUF5QixHQUF6QixDQUF4QixHQUErRCxJQUFBLE1BQUEsQ0FBTyxjQUFQLEVBQXVCLEdBQXZCLENBQXBFLENBQUE7QUFFQSxXQUFPLEdBQUcsQ0FBQyxPQUFKLENBQVksRUFBWixFQUFnQixTQUFDLENBQUQsRUFBSSxDQUFKLEdBQUE7QUFDdEIsVUFBQSxDQUFBO0FBQUEsTUFBQSxDQUFBLEdBQUksSUFBSyxDQUFBLENBQUEsQ0FBVCxDQUFBO0FBQ0MsTUFBQSxJQUFHLE1BQUEsQ0FBQSxDQUFBLEtBQVksUUFBWixJQUF3QixNQUFBLENBQUEsQ0FBQSxLQUFZLFFBQXZDO2VBQXFELEVBQXJEO09BQUEsTUFBQTtlQUE0RCxFQUE1RDtPQUZxQjtJQUFBLENBQWhCLENBQVAsQ0FKZ0I7RUFBQSxDQXBLakIsQ0FBQTs7QUFBQSx5QkE0S0EsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVUO0FBQUE7O09BQUE7V0FJQSxLQU5TO0VBQUEsQ0E1S1YsQ0FBQTs7QUFBQSx5QkFvTEEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVKLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSTtFQUFBLENBcExMLENBQUE7O3NCQUFBOztHQUYwQixRQUFRLENBQUMsS0FBcEMsQ0FBQTs7QUFBQSxNQTBMTSxDQUFDLE9BQVAsR0FBaUIsWUExTGpCLENBQUE7Ozs7O0FDQUEsSUFBQSw4QkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLGdCQUFSLENBQWYsQ0FBQTs7QUFBQTtBQUlDLHFDQUFBLENBQUE7Ozs7Ozs7OztHQUFBOztBQUFBLDZCQUFBLE1BQUEsR0FBYSxLQUFiLENBQUE7O0FBQUEsNkJBQ0EsVUFBQSxHQUFhLEtBRGIsQ0FBQTs7QUFBQSw2QkFHQSxJQUFBLEdBQU8sU0FBQyxFQUFELEdBQUE7QUFFTixJQUFBLElBQUEsQ0FBQSxDQUFjLElBQUUsQ0FBQSxNQUFoQjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsTUFBRCxHQUFVLElBRFYsQ0FBQTtBQUdBO0FBQUE7O09BSEE7QUFBQSxJQU1BLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBdEIsQ0FBK0IsSUFBL0IsQ0FOQSxDQUFBO0FBQUEsSUFPQSxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsY0FBckIsRUFBcUMsSUFBckMsQ0FQQSxDQUFBO0FBU0E7QUFBQSx1REFUQTtBQUFBLElBVUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxHQUFMLENBQVM7QUFBQSxNQUFBLFlBQUEsRUFBZSxTQUFmO0tBQVQsQ0FWQSxDQUFBOztNQVdBO0tBWEE7QUFhQSxJQUFBLElBQUcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLGVBQVYsS0FBNkIsQ0FBaEM7QUFDQyxNQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFkLENBQWlCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxvQkFBL0IsRUFBcUQsSUFBQyxDQUFBLFNBQXRELENBQUEsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLElBQUMsQ0FBQSxTQUFELENBQUEsQ0FBQSxDQUhEO0tBYkE7V0FrQkEsS0FwQk07RUFBQSxDQUhQLENBQUE7O0FBQUEsNkJBeUJBLElBQUEsR0FBTyxTQUFDLEVBQUQsR0FBQTtBQUVOLElBQUEsSUFBQSxDQUFBLElBQWUsQ0FBQSxNQUFmO0FBQUEsWUFBQSxDQUFBO0tBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxNQUFELEdBQVUsS0FEVixDQUFBO0FBR0E7QUFBQTs7T0FIQTtBQUFBLElBTUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUF0QixDQUE2QixJQUE3QixDQU5BLENBQUE7QUFVQTtBQUFBLHVEQVZBO0FBQUEsSUFXQSxJQUFDLENBQUEsR0FBRyxDQUFDLEdBQUwsQ0FBUztBQUFBLE1BQUEsWUFBQSxFQUFlLFFBQWY7S0FBVCxDQVhBLENBQUE7O01BWUE7S0FaQTtXQWNBLEtBaEJNO0VBQUEsQ0F6QlAsQ0FBQTs7QUFBQSw2QkEyQ0EsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLG1CQUFELENBQXFCLGNBQXJCLEVBQXFDLEtBQXJDLENBQUEsQ0FBQTtXQUVBLEtBSlM7RUFBQSxDQTNDVixDQUFBOztBQUFBLDZCQWlEQSxZQUFBLEdBQWUsU0FBQyxPQUFELEdBQUE7QUFFZCxJQUFBLElBQWMsT0FBQSxLQUFhLElBQUMsQ0FBQSxVQUE1QjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsVUFBRCxHQUFjLE9BRGQsQ0FBQTtXQUdBLEtBTGM7RUFBQSxDQWpEZixDQUFBOztBQUFBLDZCQXdEQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVg7QUFBQTs7T0FBQTtXQUlBLEtBTlc7RUFBQSxDQXhEWixDQUFBOzswQkFBQTs7R0FGOEIsYUFGL0IsQ0FBQTs7QUFBQSxNQW9FTSxDQUFDLE9BQVAsR0FBaUIsZ0JBcEVqQixDQUFBOzs7OztBQ0FBLElBQUEsdUVBQUE7RUFBQTs7aVNBQUE7O0FBQUEsZ0JBQUEsR0FBeUIsT0FBQSxDQUFRLHFCQUFSLENBQXpCLENBQUE7O0FBQUEsc0JBQ0EsR0FBeUIsT0FBQSxDQUFRLHVEQUFSLENBRHpCLENBQUE7O0FBQUEsU0FFQSxHQUF5QixPQUFBLENBQVEsdUJBQVIsQ0FGekIsQ0FBQTs7QUFBQSxHQUdBLEdBQXlCLE9BQUEsQ0FBUSxnQkFBUixDQUh6QixDQUFBOztBQUFBO0FBT0Msa0NBQUEsQ0FBQTs7QUFBQSwwQkFBQSxRQUFBLEdBQVcsWUFBWCxDQUFBOztBQUVjLEVBQUEsdUJBQUEsR0FBQTtBQUViLDJFQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxZQUFELEdBQWdCLEdBQUEsQ0FBQSxzQkFBaEIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFlBQUQsR0FDQztBQUFBLE1BQUEsVUFBQSxFQUFrQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixrQkFBakIsQ0FBbEI7QUFBQSxNQUNBLFlBQUEsRUFBa0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsb0JBQWpCLENBRGxCO0FBQUEsTUFFQSxhQUFBLEVBQWtCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLHFCQUFqQixDQUZsQjtBQUFBLE1BR0EsZUFBQSxFQUFrQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQix1QkFBakIsQ0FIbEI7QUFBQSxNQUlBLFNBQUEsRUFBa0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsaUJBQWpCLENBSmxCO0tBSEQsQ0FBQTtBQUFBLElBU0EsZ0RBQUEsU0FBQSxDQVRBLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxzQkFBRCxDQUFBLENBWEEsQ0FBQTtBQWFBLFdBQU8sSUFBUCxDQWZhO0VBQUEsQ0FGZDs7QUFBQSwwQkFtQkEsc0JBQUEsR0FBeUIsU0FBQSxHQUFBO0FBRXhCLFFBQUEsQ0FBQTtBQUFBLElBQUEsQ0FBQSxHQUFJLFNBQVMsQ0FBQyxPQUFWLENBRU07QUFBQSxNQUFBLEdBQUEsRUFBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFOLEdBQWlCLGdDQUF4QjtBQUFBLE1BQ0EsSUFBQSxFQUFPLEtBRFA7S0FGTixDQUFKLENBQUE7QUFBQSxJQUtNLENBQUMsQ0FBQyxJQUFGLENBQU8sQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsR0FBRCxHQUFBO0FBQ04sUUFBQSxLQUFDLENBQUEsWUFBWSxDQUFDLEdBQWQsQ0FBa0IsR0FBRyxDQUFDLFlBQXRCLENBQUEsQ0FBQTtlQUNBLEtBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLHFCQUFWLENBQWdDLENBQUMsSUFBakMsQ0FBc0MsS0FBQyxDQUFBLFlBQVksQ0FBQyxZQUFkLENBQUEsQ0FBdEMsRUFGTTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVAsQ0FMTixDQUFBO0FBQUEsSUFTTSxDQUFDLENBQUMsSUFBRixDQUFPLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLEdBQUQsR0FBQTtlQUFTLE9BQU8sQ0FBQyxLQUFSLENBQWMsa0NBQWQsRUFBa0QsR0FBbEQsRUFBVDtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVAsQ0FUTixDQUFBO1dBV0EsS0Fid0I7RUFBQSxDQW5CekIsQ0FBQTs7dUJBQUE7O0dBRjJCLGlCQUw1QixDQUFBOztBQUFBLE1BeUNNLENBQUMsT0FBUCxHQUFpQixhQXpDakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLG9CQUFBO0VBQUE7aVNBQUE7O0FBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxpQkFBUixDQUFmLENBQUE7O0FBQUE7QUFJSSwyQkFBQSxDQUFBOztBQUFBLG1CQUFBLFFBQUEsR0FBVyxhQUFYLENBQUE7O0FBRWEsRUFBQSxnQkFBQSxHQUFBO0FBRVQsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQixFQUFoQixDQUFBO0FBQUEsSUFFQSxzQ0FBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOUztFQUFBLENBRmI7O2dCQUFBOztHQUZpQixhQUZyQixDQUFBOztBQUFBLE1BY00sQ0FBQyxPQUFQLEdBQWlCLE1BZGpCLENBQUE7Ozs7O0FDQUEsSUFBQSxrREFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQXVCLE9BQUEsQ0FBUSxpQkFBUixDQUF2QixDQUFBOztBQUFBLE1BQ0EsR0FBdUIsT0FBQSxDQUFRLHFCQUFSLENBRHZCLENBQUE7O0FBQUEsb0JBRUEsR0FBdUIsT0FBQSxDQUFRLGtDQUFSLENBRnZCLENBQUE7O0FBQUE7QUFNQywyQkFBQSxDQUFBOztBQUFBLG1CQUFBLFFBQUEsR0FBVyxhQUFYLENBQUE7O0FBQUEsbUJBRUEsZ0JBQUEsR0FBbUIsSUFGbkIsQ0FBQTs7QUFJYyxFQUFBLGdCQUFBLEdBQUE7QUFFYixxREFBQSxDQUFBO0FBQUEscURBQUEsQ0FBQTtBQUFBLHlEQUFBLENBQUE7QUFBQSwrREFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQUQsR0FDQztBQUFBLE1BQUEsSUFBQSxFQUNDO0FBQUEsUUFBQSxLQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsbUJBQWpCLENBQVg7QUFBQSxRQUNBLEdBQUEsRUFBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFOLEdBQWlCLEdBQWpCLEdBQXVCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFEckQ7T0FERDtBQUFBLE1BR0EsS0FBQSxFQUNDO0FBQUEsUUFBQSxLQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsb0JBQWpCLENBQVg7QUFBQSxRQUNBLEdBQUEsRUFBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxRQUFOLEdBQWlCLEdBQWpCLEdBQXVCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FEckQ7QUFBQSxRQUVBLE9BQUEsRUFBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBRjlCO09BSkQ7QUFBQSxNQU9BLFVBQUEsRUFDQztBQUFBLFFBQUEsS0FBQSxFQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLHlCQUFqQixDQUFYO0FBQUEsUUFDQSxHQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixHQUFqQixHQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBRHJEO0FBQUEsUUFFQSxPQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUY5QjtPQVJEO0FBQUEsTUFXQSxXQUFBLEVBQWMsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsb0JBQWpCLENBWGQ7QUFBQSxNQVlBLFVBQUEsRUFBYSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixtQkFBakIsQ0FaYjtLQURELENBQUE7QUFBQSxJQWVBLHNDQUFBLENBZkEsQ0FBQTtBQUFBLElBaUJBLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FqQkEsQ0FBQTtBQW1CQSxXQUFPLElBQVAsQ0FyQmE7RUFBQSxDQUpkOztBQUFBLG1CQTJCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsS0FBRCxHQUFzQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxhQUFWLENBQXRCLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxhQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFlBQVYsQ0FEdEIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLGtCQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGlCQUFWLENBRnRCLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxRQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFdBQVYsQ0FIdEIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFNBQUQsR0FBc0IsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsWUFBVixDQUp0QixDQUFBO1dBTUEsS0FSTTtFQUFBLENBM0JQLENBQUE7O0FBQUEsbUJBcUNBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWixJQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFkLENBQWlCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxvQkFBL0IsRUFBcUQsSUFBQyxDQUFBLGFBQXRELENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEVBQWIsQ0FBZ0IsTUFBTSxDQUFDLGtCQUF2QixFQUEyQyxJQUFDLENBQUEsWUFBNUMsQ0FEQSxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsR0FBRyxDQUFDLEVBQUwsQ0FBUSxZQUFSLEVBQXNCLGlCQUF0QixFQUF5QyxJQUFDLENBQUEsV0FBMUMsQ0FIQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsR0FBRyxDQUFDLEVBQUwsQ0FBUSxZQUFSLEVBQXNCLGlCQUF0QixFQUF5QyxJQUFDLENBQUEsV0FBMUMsQ0FKQSxDQUFBO1dBTUEsS0FSWTtFQUFBLENBckNiLENBQUE7O0FBQUEsbUJBK0NBLFlBQUEsR0FBZSxTQUFDLEtBQUQsR0FBQTtBQUVkLElBQUEsSUFBRyxJQUFDLENBQUEsZ0JBQUo7QUFDQyxNQUFBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixLQUFwQixDQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxZQUFELENBQWMsS0FBZCxDQUpBLENBQUE7V0FNQSxLQVJjO0VBQUEsQ0EvQ2YsQ0FBQTs7QUFBQSxtQkF5REEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRWQsUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFELENBQWtCLE9BQWxCLENBQVQsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsY0FBVixFQUEwQixPQUExQixDQUZBLENBQUE7QUFBQSxJQUlBLG9CQUFvQixDQUFDLElBQUQsQ0FBcEIsQ0FBd0IsSUFBQyxDQUFBLEtBQXpCLEVBQWdDLE1BQWhDLENBSkEsQ0FBQTtBQU9BLElBQUEsSUFBRyxPQUFBLEtBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFqQztBQUNDLE1BQUEsb0JBQW9CLENBQUMsSUFBRCxDQUFwQixDQUF3QixDQUFDLElBQUMsQ0FBQSxhQUFGLEVBQWlCLElBQUMsQ0FBQSxrQkFBbEIsQ0FBeEIsRUFBK0QsTUFBL0QsQ0FBQSxDQUFBO0FBQUEsTUFDQSxvQkFBb0IsQ0FBQyxHQUFyQixDQUF5QixDQUFDLElBQUMsQ0FBQSxTQUFGLEVBQWEsSUFBQyxDQUFBLFFBQWQsQ0FBekIsRUFBa0QsTUFBbEQsQ0FEQSxDQUREO0tBQUEsTUFHSyxJQUFHLE9BQUEsS0FBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQWpDO0FBQ0osTUFBQSxvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLENBQUMsSUFBQyxDQUFBLFNBQUYsRUFBYSxJQUFDLENBQUEsUUFBZCxDQUF4QixFQUFpRCxNQUFqRCxDQUFBLENBQUE7QUFBQSxNQUNBLG9CQUFvQixDQUFDLEdBQXJCLENBQXlCLENBQUMsSUFBQyxDQUFBLGFBQUYsRUFBaUIsSUFBQyxDQUFBLGtCQUFsQixDQUF6QixFQUFnRSxNQUFoRSxDQURBLENBREk7S0FBQSxNQUdBLElBQUcsT0FBQSxLQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBakM7QUFDSixNQUFBLG9CQUFvQixDQUFDLElBQUQsQ0FBcEIsQ0FBd0IsQ0FBQyxJQUFDLENBQUEsa0JBQUYsRUFBc0IsSUFBQyxDQUFBLFNBQXZCLENBQXhCLEVBQTJELE1BQTNELENBQUEsQ0FBQTtBQUFBLE1BQ0Esb0JBQW9CLENBQUMsSUFBRCxDQUFwQixDQUF3QixDQUFDLElBQUMsQ0FBQSxhQUFGLENBQXhCLEVBQTBDLE9BQTFDLENBREEsQ0FBQTtBQUFBLE1BRUEsb0JBQW9CLENBQUMsR0FBckIsQ0FBeUIsQ0FBQyxJQUFDLENBQUEsUUFBRixDQUF6QixFQUFzQyxNQUF0QyxDQUZBLENBREk7S0FBQSxNQUlBLElBQUcsT0FBQSxLQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBakM7QUFDSixNQUFBLG9CQUFvQixDQUFDLElBQUQsQ0FBcEIsQ0FBd0IsQ0FBQyxJQUFDLENBQUEsYUFBRixFQUFpQixJQUFDLENBQUEsU0FBbEIsQ0FBeEIsRUFBc0QsTUFBdEQsQ0FBQSxDQUFBO0FBQUEsTUFDQSxvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLENBQUMsSUFBQyxDQUFBLGtCQUFGLENBQXhCLEVBQStDLE9BQS9DLENBREEsQ0FBQTtBQUFBLE1BRUEsb0JBQW9CLENBQUMsR0FBckIsQ0FBeUIsQ0FBQyxJQUFDLENBQUEsUUFBRixDQUF6QixFQUFzQyxNQUF0QyxDQUZBLENBREk7S0FBQSxNQUFBO0FBS0osTUFBQSxvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLENBQUMsSUFBQyxDQUFBLFNBQUYsQ0FBeEIsRUFBc0MsTUFBdEMsQ0FBQSxDQUFBO0FBQUEsTUFDQSxvQkFBb0IsQ0FBQyxHQUFyQixDQUF5QixDQUFDLElBQUMsQ0FBQSxhQUFGLEVBQWlCLElBQUMsQ0FBQSxrQkFBbEIsRUFBc0MsSUFBQyxDQUFBLFFBQXZDLENBQXpCLEVBQTJFLE1BQTNFLENBREEsQ0FMSTtLQWpCTDtXQXlCQSxLQTNCYztFQUFBLENBekRmLENBQUE7O0FBQUEsbUJBc0ZBLGdCQUFBLEdBQW1CLFNBQUMsT0FBRCxFQUFVLFdBQVYsR0FBQTtBQUVsQixRQUFBLE1BQUE7O01BRjRCLGNBQVk7S0FFeEM7QUFBQSxJQUFBLE9BQUEsR0FBVSxPQUFBLElBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUE3QixJQUFxQyxNQUEvQyxDQUFBO0FBRUEsSUFBQSxJQUFHLFdBQUEsSUFBZ0IsT0FBQSxLQUFXLFdBQTlCO0FBQStDLGFBQU8sT0FBUCxDQUEvQztLQUZBO0FBQUEsSUFJQSxNQUFBO0FBQVMsY0FBTyxPQUFQO0FBQUEsYUFDSCxNQURHO2lCQUNTLE1BRFQ7QUFBQSxhQUVILElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FGaEI7aUJBRTJCLFFBRjNCO0FBQUEsYUFHSCxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBSGhCO2lCQUdnQyxRQUhoQztBQUFBO2lCQUlILFFBSkc7QUFBQTtpQkFKVCxDQUFBO1dBVUEsT0Faa0I7RUFBQSxDQXRGbkIsQ0FBQTs7QUFBQSxtQkFvR0EsYUFBQSxHQUFnQixTQUFBLEdBQUE7QUFFZixJQUFBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFoQyxDQUFBLENBQUE7V0FFQSxLQUplO0VBQUEsQ0FwR2hCLENBQUE7O0FBQUEsbUJBMEdBLFdBQUEsR0FBYyxTQUFDLENBQUQsR0FBQTtBQUViLFFBQUEsZ0JBQUE7QUFBQSxJQUFBLEdBQUEsR0FBTSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBTixDQUFBO0FBQUEsSUFDQSxXQUFBLEdBQWMsR0FBRyxDQUFDLElBQUosQ0FBUyxtQkFBVCxDQURkLENBQUE7QUFBQSxJQUdBLG9CQUFvQixDQUFDLFFBQXJCLENBQThCLEdBQTlCLEVBQW1DLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixJQUFsQixFQUF3QixXQUF4QixDQUFuQyxDQUhBLENBQUE7V0FLQSxLQVBhO0VBQUEsQ0ExR2QsQ0FBQTs7QUFBQSxtQkFtSEEsV0FBQSxHQUFjLFNBQUMsQ0FBRCxHQUFBO0FBRWIsUUFBQSxnQkFBQTtBQUFBLElBQUEsR0FBQSxHQUFNLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUFOLENBQUE7QUFBQSxJQUNBLFdBQUEsR0FBYyxHQUFHLENBQUMsSUFBSixDQUFTLG1CQUFULENBRGQsQ0FBQTtBQUFBLElBR0Esb0JBQW9CLENBQUMsVUFBckIsQ0FBZ0MsR0FBaEMsRUFBcUMsSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQWxCLEVBQXdCLFdBQXhCLENBQXJDLENBSEEsQ0FBQTtXQUtBLEtBUGE7RUFBQSxDQW5IZCxDQUFBOztnQkFBQTs7R0FGb0IsYUFKckIsQ0FBQTs7QUFBQSxNQWtJTSxDQUFDLE9BQVAsR0FBaUIsTUFsSWpCLENBQUE7Ozs7O0FDQUEsSUFBQSxnREFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSLENBQWYsQ0FBQTs7QUFBQSxRQUNBLEdBQWUsT0FBQSxDQUFRLGtCQUFSLENBRGYsQ0FBQTs7QUFBQSxNQUVBLEdBQWUsT0FBQSxDQUFRLHFCQUFSLENBRmYsQ0FBQTs7QUFBQTtBQU1JLHFDQUFBLENBQUE7O0FBQUEsNkJBQUEsUUFBQSxHQUFXLG1CQUFYLENBQUE7O0FBQUEsNkJBRUEsVUFBQSxHQUFhLElBRmIsQ0FBQTs7QUFBQSw2QkFJQSxRQUFBLEdBQ0k7QUFBQSxJQUFBLElBQUEsRUFBYSxDQUFFLE1BQU0sQ0FBQyxPQUFULEVBQWtCLE1BQU0sQ0FBQyxTQUF6QixFQUFvQyxNQUFNLENBQUMsTUFBM0MsQ0FBYjtBQUFBLElBQ0EsS0FBQSxFQUFhLENBQUUsTUFBTSxDQUFDLE1BQVQsRUFBaUIsTUFBTSxDQUFDLFNBQXhCLEVBQW1DLE1BQU0sQ0FBQyxPQUExQyxDQURiO0FBQUEsSUFFQSxVQUFBLEVBQWEsQ0FBRSxNQUFNLENBQUMsT0FBVCxFQUFrQixNQUFNLENBQUMsU0FBekIsRUFBb0MsTUFBTSxDQUFDLE1BQTNDLENBRmI7QUFBQSxJQUdBLE9BQUEsRUFBYSxDQUFFLE1BQU0sQ0FBQyxNQUFULEVBQWlCLE1BQU0sQ0FBQyxTQUF4QixFQUFtQyxNQUFNLENBQUMsT0FBMUMsQ0FIYjtHQUxKLENBQUE7O0FBQUEsNkJBVUEsWUFBQSxHQUFlLElBVmYsQ0FBQTs7QUFBQSw2QkFZQSxhQUFBLEdBQ0k7QUFBQSxJQUFBLFdBQUEsRUFDSTtBQUFBLE1BQUEsY0FBQSxFQUFpQiwwQkFBakI7QUFBQSxNQUNBLEtBQUEsRUFDSTtBQUFBLFFBQUEsVUFBQSxFQUFZLFNBQVo7QUFBQSxRQUF1QixTQUFBLEVBQVkseUJBQW5DO09BRko7QUFBQSxNQUdBLEdBQUEsRUFDSTtBQUFBLFFBQUEsVUFBQSxFQUFZLFNBQVo7QUFBQSxRQUF1QixTQUFBLEVBQVksTUFBbkM7T0FKSjtLQURKO0FBQUEsSUFNQSxXQUFBLEVBQ0k7QUFBQSxNQUFBLGNBQUEsRUFBaUIseUJBQWpCO0FBQUEsTUFDQSxLQUFBLEVBQ0k7QUFBQSxRQUFBLFVBQUEsRUFBWSxTQUFaO0FBQUEsUUFBdUIsU0FBQSxFQUFZLDBCQUFuQztPQUZKO0FBQUEsTUFHQSxHQUFBLEVBQ0k7QUFBQSxRQUFBLFVBQUEsRUFBWSxTQUFaO0FBQUEsUUFBdUIsU0FBQSxFQUFZLE1BQW5DO09BSko7S0FQSjtBQUFBLElBWUEsV0FBQSxFQUNJO0FBQUEsTUFBQSxjQUFBLEVBQWlCLHlCQUFqQjtBQUFBLE1BQ0EsS0FBQSxFQUNJO0FBQUEsUUFBQSxVQUFBLEVBQVksU0FBWjtBQUFBLFFBQXVCLFNBQUEsRUFBWSwwQkFBbkM7T0FGSjtBQUFBLE1BR0EsR0FBQSxFQUNJO0FBQUEsUUFBQSxVQUFBLEVBQVksU0FBWjtBQUFBLFFBQXVCLFNBQUEsRUFBWSxNQUFuQztPQUpKO0tBYko7QUFBQSxJQWtCQSxXQUFBLEVBQ0k7QUFBQSxNQUFBLGNBQUEsRUFBaUIsMEJBQWpCO0FBQUEsTUFDQSxLQUFBLEVBQ0k7QUFBQSxRQUFBLFVBQUEsRUFBWSxTQUFaO0FBQUEsUUFBdUIsU0FBQSxFQUFZLHlCQUFuQztPQUZKO0FBQUEsTUFHQSxHQUFBLEVBQ0k7QUFBQSxRQUFBLFVBQUEsRUFBWSxTQUFaO0FBQUEsUUFBdUIsU0FBQSxFQUFZLE1BQW5DO09BSko7S0FuQko7R0FiSixDQUFBOztBQUFBLDZCQXNDQSxlQUFBLEdBQWtCLEdBdENsQixDQUFBOztBQXdDYSxFQUFBLDBCQUFBLEdBQUE7QUFFVCxxQ0FBQSxDQUFBO0FBQUEseUNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsK0RBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSwrREFBQSxDQUFBO0FBQUEsK0VBQUEsQ0FBQTtBQUFBLGlEQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQUQsR0FDSTtBQUFBLE1BQUEsVUFBQSxFQUNJO0FBQUEsUUFBQSxJQUFBLEVBQWEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsOEJBQWpCLENBQWI7QUFBQSxRQUNBLEtBQUEsRUFBYSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQiwrQkFBakIsQ0FEYjtBQUFBLFFBRUEsVUFBQSxFQUFhLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG9DQUFqQixDQUZiO09BREo7QUFBQSxNQUlBLGVBQUEsRUFBa0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsZ0NBQWpCLENBSmxCO0tBREosQ0FBQTtBQUFBLElBT0EsZ0RBQUEsQ0FQQSxDQUFBO0FBU0EsV0FBTyxJQUFQLENBWFM7RUFBQSxDQXhDYjs7QUFBQSw2QkFxREEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVILElBQUEsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxhQUFWLENBQWQsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLFVBQUQsR0FBYyxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxtQkFBVixDQURkLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsY0FBVixDQUZkLENBQUE7V0FJQSxLQU5HO0VBQUEsQ0FyRFAsQ0FBQTs7QUFBQSw2QkE2REEsT0FBQSxHQUFVLFNBQUMsUUFBRCxFQUFXLE1BQVgsR0FBQTtBQUVOLElBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBQyxDQUFBLFVBQUQsQ0FBWSxNQUFaLENBQWQsQ0FGQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsWUFBRCxHQUFnQixJQUFDLENBQUEsU0FBRCxDQUFXLFFBQVgsRUFBcUIsTUFBckIsQ0FKaEIsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLFdBQUQsQ0FBYSxJQUFDLENBQUEsWUFBWSxDQUFDLEtBQTNCLEVBQWtDLE1BQWxDLENBTkEsQ0FBQTtBQUFBLElBT0EsSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQUMsQ0FBQSxZQUFZLENBQUMsY0FBaEMsQ0FQQSxDQUFBO0FBQUEsSUFTQSxJQUFDLENBQUEsVUFBRCxDQUFZLElBQUMsQ0FBQSxZQUFELENBQWMsTUFBZCxDQUFaLENBVEEsQ0FBQTtXQVdBLEtBYk07RUFBQSxDQTdEVixDQUFBOztBQUFBLDZCQTRFQSxVQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVQsSUFBQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYTtBQUFBLE1BQUEsT0FBQSxFQUFTLEVBQVQ7S0FBYixDQUFBLENBQUE7V0FFQSxLQUpTO0VBQUEsQ0E1RWIsQ0FBQTs7QUFBQSw2QkFrRkEsWUFBQSxHQUFlLFNBQUMsSUFBRCxFQUFPLFNBQVAsR0FBQTtBQUVYLFFBQUEsY0FBQTs7TUFGa0IsWUFBVTtLQUU1QjtBQUFBLElBQUEsT0FBQSxHQUFVLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFWLENBQXFCLElBQXJCLEVBQTJCLElBQTNCLENBQVYsQ0FBQTtBQUVBLElBQUEsSUFBRyxPQUFBLEtBQVcsU0FBZDtBQUNJLE1BQUEsS0FBQSxHQUFRLElBQUMsQ0FBQSxjQUFELENBQWdCLFNBQWhCLENBQVIsQ0FESjtLQUFBLE1BQUE7QUFHSSxNQUFBLEtBQUEsR0FBUSxJQUFDLENBQUEsWUFBWSxDQUFDLFVBQVcsQ0FBQSxPQUFBLENBQWpDLENBSEo7S0FGQTtXQU9BLE1BVFc7RUFBQSxDQWxGZixDQUFBOztBQUFBLDZCQTZGQSxjQUFBLEdBQWlCLFNBQUMsU0FBRCxHQUFBO0FBRWIsUUFBQSxzQkFBQTtBQUFBLElBQUEsT0FBQSxHQUFhLFNBQUEsS0FBYSxJQUFoQixHQUEwQixTQUExQixHQUF5QyxVQUFuRCxDQUFBO0FBQUEsSUFDQSxNQUFBLEdBQVMsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBdEIsQ0FBNEMsT0FBNUMsQ0FEVCxDQUFBO0FBR0EsSUFBQSxJQUFHLE1BQUg7QUFDSSxNQUFBLEtBQUEsR0FBUSxNQUFNLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBQSxHQUE0QixNQUE1QixHQUFxQyxNQUFNLENBQUMsR0FBUCxDQUFXLE1BQVgsQ0FBN0MsQ0FESjtLQUFBLE1BQUE7QUFHSSxNQUFBLEtBQUEsR0FBUSxRQUFSLENBSEo7S0FIQTtXQVFBLE1BVmE7RUFBQSxDQTdGakIsQ0FBQTs7QUFBQSw2QkF5R0EsVUFBQSxHQUFhLFNBQUMsT0FBRCxHQUFBO0FBRVQsSUFBQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxJQUFDLENBQUEsWUFBWSxDQUFDLGVBQWQsR0FBZ0MsR0FBaEMsR0FBc0MsT0FBdEMsR0FBZ0QsS0FBN0QsQ0FBQSxDQUFBO1dBRUEsS0FKUztFQUFBLENBekdiLENBQUE7O0FBQUEsNkJBK0dBLFVBQUEsR0FBYSxTQUFDLElBQUQsR0FBQTtBQUVULFFBQUEsT0FBQTtBQUFBLElBQUEsT0FBQSxHQUFVLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFWLENBQXFCLElBQXJCLEVBQTJCLElBQTNCLENBQVYsQ0FBQTtXQUVBLElBQUMsQ0FBQSxRQUFTLENBQUEsT0FBQSxDQUFWLElBQXNCLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FKdkI7RUFBQSxDQS9HYixDQUFBOztBQUFBLDZCQXFIQSxZQUFBLEdBQWUsU0FBQyxPQUFELEdBQUE7QUFFWCxJQUFBLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFhLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsR0FBQTtlQUFPLEtBQUMsQ0FBQSxNQUFNLENBQUMsRUFBUixDQUFXLENBQVgsQ0FBYSxDQUFDLEdBQWQsQ0FBa0I7QUFBQSxVQUFBLGtCQUFBLEVBQXFCLE9BQVEsQ0FBQSxDQUFBLENBQTdCO1NBQWxCLEVBQVA7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFiLENBQUEsQ0FBQTtXQUVBLEtBSlc7RUFBQSxDQXJIZixDQUFBOztBQUFBLDZCQTJIQSxTQUFBLEdBQVksU0FBQyxRQUFELEVBQVcsTUFBWCxHQUFBO0FBRVIsUUFBQSxNQUFBO0FBQUEsSUFBQSxJQUFHLENBQUEsUUFBUyxDQUFDLGtCQUFWLElBQWlDLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQWpFO0FBQ0ksTUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQUF4QixDQURKO0tBQUEsTUFHSyxJQUFHLFFBQUEsS0FBWSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQS9CLElBQTJDLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQTNFO0FBQ0QsTUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLHdCQUFELENBQUEsQ0FBVCxDQURDO0tBQUEsTUFHQSxJQUFHLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQTdCLElBQXNDLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQXRFO0FBRUQsTUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFELENBQUEsQ0FBVCxDQUZDO0tBQUEsTUFBQTtBQU9ELE1BQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSxnQkFBRCxDQUFBLENBQVQsQ0FQQztLQU5MO1dBZUEsT0FqQlE7RUFBQSxDQTNIWixDQUFBOztBQUFBLDZCQThJQSx3QkFBQSxHQUEyQixTQUFDLFFBQUQsRUFBVyxRQUFYLEdBQUE7QUFFdkIsUUFBQSwyRUFBQTtBQUFBLElBQUEsY0FBQSxHQUFpQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUF0QixDQUE0QyxVQUE1QyxDQUFqQixDQUFBO0FBQUEsSUFDQSxpQkFBQSxHQUFvQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQXRCLENBQThCLGNBQTlCLENBRHBCLENBQUE7QUFBQSxJQUdBLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxQkFBdEIsQ0FBNEMsU0FBNUMsQ0FIaEIsQ0FBQTtBQUFBLElBSUEsZ0JBQUEsR0FBbUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUF0QixDQUE4QixhQUE5QixDQUpuQixDQUFBO0FBQUEsSUFNQSxPQUFBLEdBQWEsaUJBQUEsR0FBb0IsZ0JBQXZCLEdBQTZDLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBNUQsR0FBNkUsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQU50RyxDQUFBO1dBUUEsUUFWdUI7RUFBQSxDQTlJM0IsQ0FBQTs7QUFBQSw2QkEwSkEsZ0JBQUEsR0FBbUIsU0FBQSxHQUFBO0FBRWYsUUFBQSxPQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxJQUFDLENBQUEsYUFBWCxDQUEwQixDQUFBLENBQUEsQ0FBcEMsQ0FBQTtXQUVBLFFBSmU7RUFBQSxDQTFKbkIsQ0FBQTs7QUFBQSw2QkFnS0EsV0FBQSxHQUFjLFNBQUMsTUFBRCxFQUFTLE1BQVQsR0FBQTtBQUVWLFFBQUEsV0FBQTs7TUFGbUIsU0FBTztLQUUxQjtBQUFBLElBQUEsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksTUFBWixDQUFBLENBQUE7QUFBQSxJQUVBLFdBQUEsR0FBaUIsTUFBQSxLQUFVLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBaEMsR0FBNkMsVUFBN0MsR0FBNkQsYUFGM0UsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLEdBQUksQ0FBQSxXQUFBLENBQUwsQ0FBa0IsV0FBbEIsQ0FIQSxDQUFBO1dBS0EsS0FQVTtFQUFBLENBaEtkLENBQUE7O0FBQUEsNkJBeUtBLGdCQUFBLEdBQW1CLFNBQUMsY0FBRCxHQUFBO0FBRWYsSUFBQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQVosQ0FBZ0I7QUFBQSxNQUFBLFdBQUEsRUFBYyxjQUFkO0tBQWhCLENBQUEsQ0FBQTtXQUVBLEtBSmU7RUFBQSxDQXpLbkIsQ0FBQTs7QUFBQSw2QkErS0EsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVILElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsTUFBZCxDQUFBLENBQUE7V0FFQSxLQUpHO0VBQUEsQ0EvS1AsQ0FBQTs7QUFBQSw2QkFxTEEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVILElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxXQUFMLENBQWlCLE1BQWpCLENBQUEsQ0FBQTtXQUVBLEtBSkc7RUFBQSxDQXJMUCxDQUFBOztBQUFBLDZCQTJMQSxLQUFBLEdBQUssU0FBQyxFQUFELEdBQUE7QUFFRCxRQUFBLHlCQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsSUFBRCxDQUFBLENBQUEsQ0FBQTtBQUFBLElBRUEsWUFBQSxHQUFlO0FBQUEsTUFBQSxTQUFBLEVBQVksTUFBWjtBQUFBLE1BQW9CLElBQUEsRUFBTyxJQUFJLENBQUMsT0FBaEM7QUFBQSxNQUF5QyxPQUFBLEVBQVMsSUFBbEQ7S0FGZixDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxDQUFELEVBQUksRUFBSixHQUFBO0FBQ1QsWUFBQSxNQUFBO0FBQUEsUUFBQSxNQUFBLEdBQVMsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxFQUFULEVBQWEsWUFBYixFQUNMO0FBQUEsVUFBQSxLQUFBLEVBQVEsQ0FBQSxHQUFJLElBQVo7U0FESyxDQUFULENBQUE7QUFFQSxRQUFBLElBQUcsQ0FBQSxLQUFLLENBQVI7QUFBZSxVQUFBLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFNBQUEsR0FBQTtBQUMvQixZQUFBLEtBQUMsQ0FBQSxXQUFELENBQWEsS0FBQyxDQUFBLFlBQVksQ0FBQyxHQUEzQixDQUFBLENBQUE7OENBQ0EsY0FGK0I7VUFBQSxDQUFwQixDQUFmO1NBRkE7ZUFNQSxTQUFTLENBQUMsRUFBVixDQUFhLENBQUEsQ0FBRSxFQUFGLENBQWIsRUFBb0IsS0FBQyxDQUFBLGVBQXJCLEVBQXNDLE1BQXRDLEVBUFM7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFiLENBSkEsQ0FBQTtBQUFBLElBYUEsV0FBQSxHQUFjLENBQUMsQ0FBQyxNQUFGLENBQVMsRUFBVCxFQUFhLFlBQWIsRUFBMkI7QUFBQSxNQUFBLEtBQUEsRUFBUSxHQUFSO0tBQTNCLENBYmQsQ0FBQTtBQUFBLElBY0EsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsVUFBZCxFQUEwQixJQUFDLENBQUEsZUFBM0IsRUFBNEMsV0FBNUMsQ0FkQSxDQUFBO1dBZ0JBLEtBbEJDO0VBQUEsQ0EzTEwsQ0FBQTs7QUFBQSw2QkErTUEsR0FBQSxHQUFNLFNBQUMsRUFBRCxHQUFBO0FBRUYsUUFBQSx5QkFBQTtBQUFBLElBQUEsWUFBQSxHQUFlO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQVo7QUFBQSxNQUFxQixPQUFBLEVBQVMsSUFBOUI7QUFBQSxNQUFvQyxVQUFBLEVBQVksS0FBaEQ7S0FBZixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxDQUFELEVBQUksRUFBSixHQUFBO0FBQ1QsWUFBQSxNQUFBO0FBQUEsUUFBQSxNQUFBLEdBQVMsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxFQUFULEVBQWEsWUFBYixFQUNMO0FBQUEsVUFBQSxLQUFBLEVBQVksR0FBQSxHQUFNLENBQUMsSUFBQSxHQUFPLENBQVIsQ0FBbEI7QUFBQSxVQUNBLFNBQUEsRUFBWSxLQUFDLENBQUEsWUFBWSxDQUFDLGNBRDFCO1NBREssQ0FBVCxDQUFBO0FBR0EsUUFBQSxJQUFHLENBQUEsS0FBSyxDQUFSO0FBQWUsVUFBQSxNQUFNLENBQUMsVUFBUCxHQUFvQixTQUFBLEdBQUE7QUFDL0IsWUFBQSxLQUFDLENBQUEsSUFBRCxDQUFBLENBQUEsQ0FBQTs4Q0FDQSxjQUYrQjtVQUFBLENBQXBCLENBQWY7U0FIQTtlQU9BLFNBQVMsQ0FBQyxFQUFWLENBQWEsQ0FBQSxDQUFFLEVBQUYsQ0FBYixFQUFvQixLQUFDLENBQUEsZUFBckIsRUFBc0MsTUFBdEMsRUFSUztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWIsQ0FGQSxDQUFBO0FBQUEsSUFZQSxXQUFBLEdBQWMsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxFQUFULEVBQWEsWUFBYixFQUEyQjtBQUFBLE1BQUEsU0FBQSxFQUFZLElBQUMsQ0FBQSxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQWhDO0tBQTNCLENBWmQsQ0FBQTtBQUFBLElBYUEsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsVUFBZCxFQUEwQixJQUFDLENBQUEsZUFBM0IsRUFBNEMsV0FBNUMsQ0FiQSxDQUFBO1dBZUEsS0FqQkU7RUFBQSxDQS9NTixDQUFBOzswQkFBQTs7R0FGMkIsYUFKL0IsQ0FBQTs7QUFBQSxNQXdPTSxDQUFDLE9BQVAsR0FBaUIsZ0JBeE9qQixDQUFBOzs7OztBQ0FBLElBQUEsNkNBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUF1QixPQUFBLENBQVEsaUJBQVIsQ0FBdkIsQ0FBQTs7QUFBQSxvQkFDQSxHQUF1QixPQUFBLENBQVEsa0NBQVIsQ0FEdkIsQ0FBQTs7QUFBQTtBQUtDLDhCQUFBLENBQUE7O0FBQUEsc0JBQUEsRUFBQSxHQUFrQixJQUFsQixDQUFBOztBQUFBLHNCQUVBLGVBQUEsR0FBa0IsR0FGbEIsQ0FBQTs7QUFBQSxzQkFJQSxlQUFBLEdBQWtCLENBSmxCLENBQUE7O0FBQUEsc0JBS0EsZUFBQSxHQUFrQixDQUxsQixDQUFBOztBQUFBLHNCQU9BLGlCQUFBLEdBQW9CLEVBUHBCLENBQUE7O0FBQUEsc0JBUUEsaUJBQUEsR0FBb0IsR0FScEIsQ0FBQTs7QUFBQSxzQkFVQSxrQkFBQSxHQUFxQixFQVZyQixDQUFBOztBQUFBLHNCQVdBLGtCQUFBLEdBQXFCLEdBWHJCLENBQUE7O0FBQUEsc0JBYUEsS0FBQSxHQUFRLHVFQUF1RSxDQUFDLEtBQXhFLENBQThFLEVBQTlFLENBYlIsQ0FBQTs7QUFlYyxFQUFBLG1CQUFBLEdBQUE7QUFFYix1REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLDJEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsMkRBQUEsQ0FBQTtBQUFBLG1FQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFZLENBQUEsQ0FBRSxZQUFGLENBQVosQ0FBQSxDQUFBO0FBQUEsSUFFQSx5Q0FBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOYTtFQUFBLENBZmQ7O0FBQUEsc0JBdUJBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxTQUFELEdBQWEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsaUJBQVYsQ0FBYixDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGVBQVYsQ0FEUixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGVBQVYsQ0FGUixDQUFBO1dBSUEsS0FOTTtFQUFBLENBdkJQLENBQUE7O0FBQUEsc0JBK0JBLGtCQUFBLEdBQXFCLFNBQUUsRUFBRixHQUFBO0FBRXBCLElBRnFCLElBQUMsQ0FBQSxLQUFBLEVBRXRCLENBQUE7QUFBQSxJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksaUJBQVosQ0FBQSxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsR0FDQSxDQUFDLElBREYsQ0FDTyxhQURQLENBRUUsQ0FBQyxNQUZILENBQUEsQ0FHRSxDQUFDLEdBSEgsQ0FBQSxDQUlDLENBQUMsUUFKRixDQUlXLGdCQUpYLENBTEEsQ0FBQTtBQUFBLElBV0Esb0JBQW9CLENBQUMsSUFBRCxDQUFwQixDQUF3QixJQUFDLENBQUEsU0FBekIsRUFBb0MsT0FBcEMsRUFBNkMsS0FBN0MsRUFBb0QsSUFBQyxDQUFBLElBQXJELENBWEEsQ0FBQTtXQWFBLEtBZm9CO0VBQUEsQ0EvQnJCLENBQUE7O0FBQUEsc0JBZ0RBLGNBQUEsR0FBaUIsU0FBQSxHQUFBOztNQUVoQixJQUFDLENBQUE7S0FBRDtXQUVBLEtBSmdCO0VBQUEsQ0FoRGpCLENBQUE7O0FBQUEsc0JBc0RBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLGNBQWIsQ0FBQSxDQUFBO1dBRUEsS0FKTTtFQUFBLENBdERQLENBQUE7O0FBQUEsc0JBNERBLGNBQUEsR0FBaUIsU0FBQSxHQUFBOztNQUVoQixJQUFDLENBQUE7S0FBRDtXQUVBLEtBSmdCO0VBQUEsQ0E1RGpCLENBQUE7O0FBQUEsc0JBa0VBLFVBQUEsR0FBYSxTQUFDLEVBQUQsR0FBQTtBQU9aLElBQUEsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7QUFDVixZQUFBLE9BQUE7QUFBQSxRQUFBLE9BQUEsR0FBVSxDQUFDLENBQUMsT0FBRixDQUFVLGNBQWMsQ0FBQyxLQUFmLENBQXFCLEVBQXJCLENBQVYsQ0FBbUMsQ0FBQyxJQUFwQyxDQUF5QyxFQUF6QyxDQUFWLENBQUE7ZUFDQSxvQkFBb0IsQ0FBQyxFQUFyQixDQUF3QixPQUF4QixFQUFpQyxLQUFDLENBQUEsU0FBbEMsRUFBNkMsT0FBN0MsRUFBc0QsS0FBdEQsRUFBNkQsU0FBQSxHQUFBO2lCQUFHLEtBQUMsQ0FBQSxZQUFELENBQWMsRUFBZCxFQUFIO1FBQUEsQ0FBN0QsRUFGVTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFHRSxJQUhGLENBQUEsQ0FBQTtXQUtBLEtBWlk7RUFBQSxDQWxFYixDQUFBOztBQUFBLHNCQWdGQSxZQUFBLEdBQWUsU0FBQyxFQUFELEdBQUE7QUFFZCxJQUFBLFNBQVMsQ0FBQyxFQUFWLENBQWEsSUFBQyxDQUFBLElBQWQsRUFBb0IsR0FBcEIsRUFBeUI7QUFBQSxNQUFFLEtBQUEsRUFBUSxHQUFWO0FBQUEsTUFBZSxLQUFBLEVBQVEsTUFBdkI7QUFBQSxNQUErQixJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQTNDO0tBQXpCLENBQUEsQ0FBQTtBQUFBLElBQ0EsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsSUFBZCxFQUFvQixHQUFwQixFQUF5QjtBQUFBLE1BQUUsS0FBQSxFQUFRLEdBQVY7QUFBQSxNQUFlLE1BQUEsRUFBUyxNQUF4QjtBQUFBLE1BQWdDLElBQUEsRUFBTyxJQUFJLENBQUMsT0FBNUM7S0FBekIsQ0FEQSxDQUFBO0FBQUEsSUFHQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxJQUFkLEVBQW9CLEdBQXBCLEVBQXlCO0FBQUEsTUFBRSxLQUFBLEVBQVEsR0FBVjtBQUFBLE1BQWUsS0FBQSxFQUFRLE1BQXZCO0FBQUEsTUFBK0IsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUEzQztLQUF6QixDQUhBLENBQUE7QUFBQSxJQUlBLFNBQVMsQ0FBQyxFQUFWLENBQWEsSUFBQyxDQUFBLElBQWQsRUFBb0IsR0FBcEIsRUFBeUI7QUFBQSxNQUFFLEtBQUEsRUFBUSxHQUFWO0FBQUEsTUFBZSxNQUFBLEVBQVMsTUFBeEI7QUFBQSxNQUFnQyxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQTVDO0FBQUEsTUFBcUQsVUFBQSxFQUFhLEVBQWxFO0tBQXpCLENBSkEsQ0FBQTtBQUFBLElBTUEsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFDVixvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLEtBQUMsQ0FBQSxTQUF6QixFQUFvQyxFQUFwQyxFQUF3QyxLQUF4QyxFQURVO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWCxFQUVFLEdBRkYsQ0FOQSxDQUFBO0FBQUEsSUFVQSxVQUFBLENBQVcsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUEsR0FBQTtlQUNWLEtBQUMsQ0FBQSxHQUFHLENBQUMsV0FBTCxDQUFpQixnQkFBakIsRUFEVTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFFRSxJQUZGLENBVkEsQ0FBQTtXQWNBLEtBaEJjO0VBQUEsQ0FoRmYsQ0FBQTs7bUJBQUE7O0dBRnVCLGFBSHhCLENBQUE7O0FBQUEsTUF1R00sQ0FBQyxPQUFQLEdBQWlCLFNBdkdqQixDQUFBOzs7OztBQ0FBLElBQUEsdUZBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUFxQixPQUFBLENBQVEsaUJBQVIsQ0FBckIsQ0FBQTs7QUFBQSxRQUNBLEdBQXFCLE9BQUEsQ0FBUSxrQkFBUixDQURyQixDQUFBOztBQUFBLGFBRUEsR0FBcUIsT0FBQSxDQUFRLDRCQUFSLENBRnJCLENBQUE7O0FBQUEsa0JBR0EsR0FBcUIsT0FBQSxDQUFRLHNDQUFSLENBSHJCLENBQUE7O0FBQUEsY0FJQSxHQUFxQixPQUFBLENBQVEsOEJBQVIsQ0FKckIsQ0FBQTs7QUFBQSxHQUtBLEdBQXFCLE9BQUEsQ0FBUSxrQkFBUixDQUxyQixDQUFBOztBQUFBO0FBU0MsNEJBQUEsQ0FBQTs7QUFBQSxvQkFBQSxjQUFBLEdBQWtCLE1BQWxCLENBQUE7O0FBQUEsb0JBRUEsUUFBQSxHQUFXLFNBRlgsQ0FBQTs7QUFBQSxvQkFJQSxLQUFBLEdBQWlCLElBSmpCLENBQUE7O0FBQUEsb0JBS0EsWUFBQSxHQUFpQixJQUxqQixDQUFBOztBQUFBLG9CQU1BLFdBQUEsR0FBaUIsSUFOakIsQ0FBQTs7QUFBQSxvQkFRQSxhQUFBLEdBQWdCLElBUmhCLENBQUE7O0FBVWMsRUFBQSxpQkFBQSxHQUFBO0FBRWIsNkRBQUEsQ0FBQTtBQUFBLHlEQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSx5Q0FBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLDJEQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEseURBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLEtBQUQsR0FDQztBQUFBLE1BQUEsSUFBQSxFQUFhO0FBQUEsUUFBQSxRQUFBLEVBQVcsUUFBWDtBQUFBLFFBQStCLEtBQUEsRUFBUSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQTFEO0FBQUEsUUFBc0UsSUFBQSxFQUFPLElBQTdFO0FBQUEsUUFBbUYsSUFBQSxFQUFPLElBQUMsQ0FBQSxjQUEzRjtPQUFiO0FBQUEsTUFDQSxLQUFBLEVBQWE7QUFBQSxRQUFBLFFBQUEsRUFBVyxhQUFYO0FBQUEsUUFBK0IsS0FBQSxFQUFRLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBMUQ7QUFBQSxRQUFzRSxJQUFBLEVBQU8sSUFBN0U7QUFBQSxRQUFtRixJQUFBLEVBQU8sSUFBQyxDQUFBLGNBQTNGO09BRGI7QUFBQSxNQUVBLFVBQUEsRUFBYTtBQUFBLFFBQUEsUUFBQSxFQUFXLGtCQUFYO0FBQUEsUUFBK0IsS0FBQSxFQUFRLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBMUQ7QUFBQSxRQUFzRSxJQUFBLEVBQU8sSUFBN0U7QUFBQSxRQUFtRixJQUFBLEVBQU8sSUFBQyxDQUFBLGNBQTNGO09BRmI7QUFBQSxNQUdBLE1BQUEsRUFBYTtBQUFBLFFBQUEsUUFBQSxFQUFXLGNBQVg7QUFBQSxRQUErQixLQUFBLEVBQVEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUExRDtBQUFBLFFBQXNFLElBQUEsRUFBTyxJQUE3RTtBQUFBLFFBQW1GLElBQUEsRUFBTyxJQUFDLENBQUEsY0FBM0Y7T0FIYjtLQURELENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FOQSxDQUFBO0FBQUEsSUFRQSx1Q0FBQSxDQVJBLENBQUE7QUFhQSxXQUFPLElBQVAsQ0FmYTtFQUFBLENBVmQ7O0FBQUEsb0JBMkJBLGFBQUEsR0FBZ0IsU0FBQSxHQUFBO0FBRWYsUUFBQSxnQkFBQTtBQUFBO0FBQUEsU0FBQSxZQUFBO3dCQUFBO0FBQUEsTUFBQyxJQUFDLENBQUEsS0FBTSxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQWIsR0FBb0IsR0FBQSxDQUFBLElBQUssQ0FBQSxLQUFNLENBQUEsSUFBQSxDQUFLLENBQUMsUUFBdEMsQ0FBQTtBQUFBLEtBQUE7V0FFQSxLQUplO0VBQUEsQ0EzQmhCLENBQUE7O0FBQUEsb0JBaUNBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWCxRQUFBLDBCQUFBO0FBQUE7QUFBQTtTQUFBLFlBQUE7d0JBQUE7QUFDQyxNQUFBLElBQUcsSUFBSSxDQUFDLElBQUwsS0FBYSxJQUFDLENBQUEsY0FBakI7c0JBQXFDLElBQUMsQ0FBQSxRQUFELENBQVUsSUFBSSxDQUFDLElBQWYsR0FBckM7T0FBQSxNQUFBOzhCQUFBO09BREQ7QUFBQTtvQkFGVztFQUFBLENBakNiLENBQUE7O0FBQUEsRUFzQ0MsSUF0Q0QsQ0FBQTs7QUFBQSxvQkF3Q0EsY0FBQSxHQUFpQixTQUFDLEtBQUQsR0FBQTtBQUVoQixRQUFBLGdCQUFBO0FBQUE7QUFBQSxTQUFBLFlBQUE7d0JBQUE7QUFDQyxNQUFBLElBQXVCLEtBQUEsS0FBUyxJQUFDLENBQUEsS0FBTSxDQUFBLElBQUEsQ0FBSyxDQUFDLEtBQTdDO0FBQUEsZUFBTyxJQUFDLENBQUEsS0FBTSxDQUFBLElBQUEsQ0FBZCxDQUFBO09BREQ7QUFBQSxLQUFBO1dBR0EsS0FMZ0I7RUFBQSxDQXhDakIsQ0FBQTs7QUFBQSxvQkErQ0EsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVOLElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLEVBQWQsQ0FBaUIsT0FBakIsRUFBMEIsSUFBQyxDQUFBLEtBQTNCLENBQUEsQ0FBQTtXQUVBLEtBSk07RUFBQSxDQS9DUCxDQUFBOztBQUFBLG9CQXFEQSxLQUFBLEdBQVEsU0FBQSxHQUFBO0FBRVAsSUFBQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsR0FBZCxDQUFrQixPQUFsQixFQUEyQixJQUFDLENBQUEsS0FBNUIsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBRkEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUhBLENBQUE7V0FLQSxLQVBPO0VBQUEsQ0FyRFIsQ0FBQTs7QUFBQSxvQkE4REEsVUFBQSxHQUFhLFNBQUEsR0FBQTtBQUVaLElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLEVBQVYsQ0FBYSxHQUFHLENBQUMsaUJBQWpCLEVBQW9DLElBQUMsQ0FBQSxVQUFyQyxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFWLENBQWEsR0FBRyxDQUFDLHFCQUFqQixFQUF3QyxJQUFDLENBQUEsYUFBekMsQ0FEQSxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsRUFBZCxDQUFpQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsdUJBQS9CLEVBQXdELElBQUMsQ0FBQSxVQUF6RCxDQUhBLENBQUE7V0FLQSxLQVBZO0VBQUEsQ0E5RGIsQ0FBQTs7QUFBQSxvQkF1RUEsVUFBQSxHQUFhLFNBQUEsR0FBQTtBQUVaLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxHQUFMLENBQVMsWUFBVCxFQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQTFDLENBQUEsQ0FBQTtXQUVBLEtBSlk7RUFBQSxDQXZFYixDQUFBOztBQUFBLG9CQTZFQSxVQUFBLEdBQWEsU0FBQyxRQUFELEVBQVcsT0FBWCxHQUFBO0FBRVosSUFBQSxJQUFHLElBQUMsQ0FBQSxhQUFELElBQW1CLElBQUMsQ0FBQSxhQUFhLENBQUMsS0FBZixDQUFBLENBQUEsS0FBNEIsVUFBbEQ7QUFDQyxNQUFHLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxDQUFBLFNBQUMsUUFBRCxFQUFXLE9BQVgsR0FBQTtpQkFBdUIsS0FBQyxDQUFBLGFBQWEsQ0FBQyxJQUFmLENBQW9CLFNBQUEsR0FBQTttQkFBRyxLQUFDLENBQUEsVUFBRCxDQUFZLFFBQVosRUFBc0IsT0FBdEIsRUFBSDtVQUFBLENBQXBCLEVBQXZCO1FBQUEsQ0FBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFILENBQUksUUFBSixFQUFjLE9BQWQsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxZQUFELEdBQWdCLElBQUMsQ0FBQSxjQUFELENBQWdCLFFBQVEsQ0FBQyxJQUF6QixDQUpoQixDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsV0FBRCxHQUFnQixJQUFDLENBQUEsY0FBRCxDQUFnQixPQUFPLENBQUMsSUFBeEIsQ0FMaEIsQ0FBQTtBQU9BLElBQUEsSUFBRyxDQUFBLElBQUUsQ0FBQSxZQUFMO0FBQ0MsTUFBQSxJQUFDLENBQUEsZUFBRCxDQUFpQixLQUFqQixFQUF3QixJQUFDLENBQUEsV0FBekIsQ0FBQSxDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsSUFBQyxDQUFBLFlBQWxCLEVBQWdDLElBQUMsQ0FBQSxXQUFqQyxDQUFBLENBSEQ7S0FQQTtXQVlBLEtBZFk7RUFBQSxDQTdFYixDQUFBOztBQUFBLG9CQTZGQSxhQUFBLEdBQWdCLFNBQUMsT0FBRCxHQUFBO0FBRWYsSUFBQSxJQUFDLENBQUEsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFsQixDQUEwQixHQUFHLENBQUMscUJBQTlCLEVBQXFELE9BQU8sQ0FBQyxHQUE3RCxDQUFBLENBQUE7V0FFQSxLQUplO0VBQUEsQ0E3RmhCLENBQUE7O0FBQUEsb0JBbUdBLGVBQUEsR0FBa0IsU0FBQyxJQUFELEVBQU8sRUFBUCxHQUFBO0FBRWpCLElBQUEsSUFBQyxDQUFBLGFBQUQsR0FBaUIsQ0FBQyxDQUFDLFFBQUYsQ0FBQSxDQUFqQixDQUFBO0FBRUEsSUFBQSxJQUFHLElBQUEsSUFBUyxFQUFaO0FBQ0MsTUFBQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQTNCLENBQW1DLElBQUksQ0FBQyxLQUF4QyxFQUErQyxFQUFFLENBQUMsS0FBbEQsQ0FBQSxDQUFBO0FBQUEsTUFDQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUQsQ0FBMUIsQ0FBOEIsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtpQkFBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQVYsQ0FBZSxTQUFBLEdBQUE7bUJBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFSLENBQWEsU0FBQSxHQUFBO3FCQUFHLEtBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBM0IsQ0FBK0IsU0FBQSxHQUFBO3VCQUFHLEtBQUMsQ0FBQSxhQUFhLENBQUMsT0FBZixDQUFBLEVBQUg7Y0FBQSxDQUEvQixFQUFIO1lBQUEsQ0FBYixFQUFIO1VBQUEsQ0FBZixFQUFIO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBOUIsQ0FEQSxDQUREO0tBQUEsTUFHSyxJQUFHLElBQUg7QUFDSixNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBVixDQUFlLElBQUMsQ0FBQSxhQUFhLENBQUMsT0FBOUIsQ0FBQSxDQURJO0tBQUEsTUFFQSxJQUFHLEVBQUg7QUFDSixNQUFBLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBUixDQUFhLElBQUMsQ0FBQSxhQUFhLENBQUMsT0FBNUIsQ0FBQSxDQURJO0tBUEw7V0FVQSxLQVppQjtFQUFBLENBbkdsQixDQUFBOztpQkFBQTs7R0FGcUIsYUFQdEIsQ0FBQTs7QUFBQSxNQTBITSxDQUFDLE9BQVAsR0FBaUIsT0ExSGpCLENBQUE7Ozs7O0FDQUEsSUFBQSxvQ0FBQTtFQUFBO2lTQUFBOztBQUFBLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUFuQixDQUFBOztBQUFBO0FBSUMsdUNBQUEsQ0FBQTs7QUFBQSwrQkFBQSxRQUFBLEdBQVcsaUJBQVgsQ0FBQTs7QUFFYyxFQUFBLDRCQUFBLEdBQUE7QUFFYixJQUFBLElBQUMsQ0FBQSxZQUFELEdBQ0M7QUFBQSxNQUFBLFlBQUEsRUFBa0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIseUJBQWpCLENBQWxCO0FBQUEsTUFDQSxjQUFBLEVBQWtCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLDJCQUFqQixDQURsQjtBQUFBLE1BRUEsYUFBQSxFQUFrQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQiwwQkFBakIsQ0FGbEI7QUFBQSxNQUdBLGVBQUEsRUFBa0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsNEJBQWpCLENBSGxCO0tBREQsQ0FBQTtBQUFBLElBTUEscURBQUEsU0FBQSxDQU5BLENBQUE7QUFRQSxXQUFPLElBQVAsQ0FWYTtFQUFBLENBRmQ7OzRCQUFBOztHQUZnQyxpQkFGakMsQ0FBQTs7QUFBQSxNQWtCTSxDQUFDLE9BQVAsR0FBaUIsa0JBbEJqQixDQUFBOzs7OztBQ0FBLElBQUEsZ0NBQUE7RUFBQTs7aVNBQUE7O0FBQUEsZ0JBQUEsR0FBbUIsT0FBQSxDQUFRLHFCQUFSLENBQW5CLENBQUE7O0FBQUE7QUFJQyxtQ0FBQSxDQUFBOztBQUFBLDJCQUFBLFFBQUEsR0FBVyxhQUFYLENBQUE7O0FBQUEsMkJBQ0EsS0FBQSxHQUFXLElBRFgsQ0FBQTs7QUFHYyxFQUFBLHdCQUFBLEdBQUE7QUFFYixpREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxZQUFELEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixhQUFqQixDQUFQO0tBREQsQ0FBQTtBQUdBO0FBQUE7Ozs7O09BSEE7QUFBQSxJQVdBLDhDQUFBLENBWEEsQ0FBQTtBQWFBO0FBQUE7Ozs7OztPQWJBO0FBc0JBLFdBQU8sSUFBUCxDQXhCYTtFQUFBLENBSGQ7O0FBQUEsMkJBNkJBLElBQUEsR0FBTyxTQUFBLEdBQUE7V0FFTixJQUFDLENBQUEsTUFBRCxHQUFVLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLHFCQUFWLEVBRko7RUFBQSxDQTdCUCxDQUFBOztBQUFBLDJCQWlDQSxJQUFBLEdBQU8sU0FBQyxFQUFELEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxLQUFELEdBQVMsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFULENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFhLEtBQWIsRUFBb0IsbUVBQXBCLENBRkEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksTUFBWixFQUFvQixFQUFwQixDQUhBLENBQUE7QUFBQSxJQUtBLHVDQUFBLENBTEEsQ0FBQTtXQU9BLEtBVE07RUFBQSxDQWpDUCxDQUFBOztBQUFBLDJCQTRDQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVgsUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUF0QixDQUFzQyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQWxCLEdBQXNCLEdBQXRCLEdBQTBCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBbEYsQ0FBVCxDQUFBO1dBRUEsT0FKVztFQUFBLENBNUNaLENBQUE7O3dCQUFBOztHQUY0QixpQkFGN0IsQ0FBQTs7QUFBQSxNQXNETSxDQUFDLE9BQVAsR0FBaUIsY0F0RGpCLENBQUE7Ozs7O0FDQUEsSUFBQSxnREFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQXVCLE9BQUEsQ0FBUSxpQkFBUixDQUF2QixDQUFBOztBQUFBLG9CQUNBLEdBQXVCLE9BQUEsQ0FBUSxrQ0FBUixDQUR2QixDQUFBOztBQUFBO0FBS0MsaUNBQUEsQ0FBQTs7QUFBQSx5QkFBQSxRQUFBLEdBQVcsZ0JBQVgsQ0FBQTs7QUFFYyxFQUFBLHNCQUFFLEtBQUYsRUFBVSxrQkFBVixHQUFBO0FBRWIsSUFGYyxJQUFDLENBQUEsUUFBQSxLQUVmLENBQUE7QUFBQSxJQUZzQixJQUFDLENBQUEscUJBQUEsa0JBRXZCLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQixDQUFDLENBQUMsTUFBRixDQUFTLEVBQVQsRUFBYSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsQ0FBQSxDQUFiLENBQWhCLENBQUE7QUFBQSxJQUVBLCtDQUFBLFNBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTmE7RUFBQSxDQUZkOztBQUFBLHlCQVVBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsK0JBQVYsQ0FBZixDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsV0FBRCxHQUFlLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLHdCQUFWLENBRGYsQ0FBQTtXQUdBLEtBTE07RUFBQSxDQVZQLENBQUE7O0FBQUEseUJBaUJBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsSUFBQyxDQUFBLEdBQUksQ0FBQSxPQUFBLENBQUwsQ0FBYyxXQUFkLEVBQTJCLElBQUMsQ0FBQSxXQUE1QixDQUFBLENBQUE7V0FFQSxLQUpjO0VBQUEsQ0FqQmYsQ0FBQTs7QUFBQSx5QkF1QkEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVOLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsV0FBZCxDQUFBLENBQUE7QUFBQSxJQUVBLG9CQUFvQixDQUFDLEVBQXJCLENBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBeEIsRUFBbUQsSUFBQyxDQUFBLFdBQXBELEVBQWlFLE1BQWpFLENBRkEsQ0FBQTtBQUFBLElBR0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUF4QixFQUE0QyxJQUFDLENBQUEsV0FBN0MsRUFBMEQsTUFBMUQsQ0FIQSxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQsQ0FMQSxDQUFBO1dBT0EsS0FUTTtFQUFBLENBdkJQLENBQUE7O0FBQUEseUJBa0NBLFdBQUEsR0FBYyxTQUFBLEdBQUE7QUFFYixJQUFBLG9CQUFvQixDQUFDLEVBQXJCLENBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBeEIsRUFBbUQsSUFBQyxDQUFBLFdBQXBELEVBQWlFLE1BQWpFLENBQUEsQ0FBQTtBQUFBLElBQ0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUF4QixFQUE0QyxJQUFDLENBQUEsV0FBN0MsRUFBMEQsTUFBMUQsQ0FEQSxDQUFBO1dBR0EsS0FMYTtFQUFBLENBbENkLENBQUE7O3NCQUFBOztHQUYwQixhQUgzQixDQUFBOztBQUFBLE1BOENNLENBQUMsT0FBUCxHQUFpQixZQTlDakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHdDQUFBO0VBQUE7O2lTQUFBOztBQUFBLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUFuQixDQUFBOztBQUFBLFlBQ0EsR0FBbUIsT0FBQSxDQUFRLGdCQUFSLENBRG5CLENBQUE7O0FBQUE7QUFPQyw2QkFBQSxDQUFBOztBQUFBLEVBQUEsUUFBQyxDQUFBLGtCQUFELEdBQXNCLEtBQXRCLENBQUE7O0FBQUEsRUFDQSxRQUFDLENBQUEsU0FBRCxHQUFhLEVBRGIsQ0FBQTs7QUFBQSxFQUVBLFFBQUMsQ0FBQSxJQUFELEdBQ0M7QUFBQSxJQUFBLElBQUEsRUFBWTtBQUFBLE1BQUEsQ0FBQSxFQUFHLEdBQUg7QUFBQSxNQUFRLENBQUEsRUFBRyxHQUFYO0FBQUEsTUFBZ0IsTUFBQSxFQUFRLEVBQXhCO0FBQUEsTUFBNEIsQ0FBQSxFQUFHLENBQS9CO0tBQVo7QUFBQSxJQUNBLFNBQUEsRUFBWTtBQUFBLE1BQUEsQ0FBQSxFQUFHLENBQUg7QUFBQSxNQUFNLENBQUEsRUFBRyxDQUFUO0FBQUEsTUFBWSxDQUFBLEVBQUcsQ0FBZjtLQURaO0dBSEQsQ0FBQTs7QUFBQSxFQUtBLFFBQUMsQ0FBQSxRQUFELEdBQVksQ0FMWixDQUFBOztBQUFBLEVBTUEsUUFBQyxDQUFBLGNBQUQsR0FBa0IsQ0FObEIsQ0FBQTs7QUFBQSxFQVFBLFFBQUMsQ0FBQSxrQkFBRCxHQUFzQixHQVJ0QixDQUFBOztBQUFBLHFCQVVBLFFBQUEsR0FBZ0IsV0FWaEIsQ0FBQTs7QUFBQSxxQkFXQSxhQUFBLEdBQWdCLGtCQVhoQixDQUFBOztBQUFBLHFCQWFBLFVBQUEsR0FBYSxJQWJiLENBQUE7O0FBZWMsRUFBQSxrQkFBQSxHQUFBO0FBRWIseURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSx1RkFBQSxDQUFBO0FBQUEsaURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxpREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQUQsR0FDQztBQUFBLE1BQUEsSUFBQSxFQUFPLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLFdBQWpCLENBQVA7S0FERCxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsVUFBRCxHQUFjLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUg1QixDQUFBO0FBQUEsSUFLQSx3Q0FBQSxDQUxBLENBQUE7QUFPQSxXQUFPLElBQVAsQ0FUYTtFQUFBLENBZmQ7O0FBQUEscUJBMEJBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxLQUFELEdBQVMsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsa0JBQVYsQ0FBVCxDQUFBO1dBRUEsS0FKTTtFQUFBLENBMUJQLENBQUE7O0FBQUEscUJBZ0NBLFNBQUEsR0FBWSxTQUFBLEdBQUE7QUFFWCxRQUFBLFNBQUE7QUFBQSxJQUFBLFNBQUEsR0FBWSxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVAsQ0FBQSxDQUFaLENBQUE7QUFBQSxJQUVBLFFBQVEsQ0FBQyxRQUFULEdBQW9CLElBQUksQ0FBQyxLQUFMLENBQVcsU0FBQSxHQUFZLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQTFDLENBRnBCLENBQUE7QUFBQSxJQUlBLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBZCxHQUNDO0FBQUEsTUFBQSxDQUFBLEVBQUcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUF0QjtBQUFBLE1BQXlCLENBQUEsRUFBRyxTQUE1QjtBQUFBLE1BQXVDLENBQUEsRUFBSSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQW5CLEdBQXVCLFNBQWxFO0tBTEQsQ0FBQTtBQUFBLElBT0EsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBbkIsR0FBdUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBbkIsR0FBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFuQixHQUF1QixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBbkIsR0FBNEIsQ0FBQyxRQUFRLENBQUMsUUFBVCxHQUFvQixDQUFyQixDQUE3QixDQUFBLEdBQXdELFFBQVEsQ0FBQyxRQUFsRSxDQUF4QixDQVA5QyxDQUFBO1dBU0EsS0FYVztFQUFBLENBaENaLENBQUE7O0FBQUEscUJBNkNBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBUSxDQUFBLE9BQUEsQ0FBZCxDQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsdUJBQXJDLEVBQThELElBQUMsQ0FBQSxRQUEvRCxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQVEsQ0FBQSxPQUFBLENBQWQsQ0FBdUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLGVBQXJDLEVBQXNELElBQUMsQ0FBQSxRQUF2RCxDQURBLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0E3Q2YsQ0FBQTs7QUFBQSxxQkFvREEsUUFBQSxHQUFXLFNBQUEsR0FBQTtBQUVWLElBQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FEQSxDQUFBO1dBR0EsS0FMVTtFQUFBLENBcERYLENBQUE7O0FBQUEscUJBMkRBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFVixRQUFBLFdBQUE7QUFBQSxJQUFBLFFBQVEsQ0FBQyxjQUFULEdBQTBCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUF4QyxDQUFBO0FBQUEsSUFFQSxXQUFBLEdBQWMsSUFBQyxDQUFBLDRCQUFELENBQUEsQ0FGZCxDQUFBO0FBR0EsSUFBQSxJQUFHLFdBQUEsR0FBYyxDQUFqQjtBQUF3QixNQUFBLElBQUMsQ0FBQSxVQUFELENBQVksV0FBWixDQUFBLENBQXhCO0tBSEE7V0FLQSxLQVBVO0VBQUEsQ0EzRFgsQ0FBQTs7QUFBQSxxQkFvRUEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVOLElBQUEsb0NBQUEsU0FBQSxDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0FwRVAsQ0FBQTs7QUFBQSxxQkEwRUEsU0FBQSxHQUFZLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFBLENBQUE7QUFFQSxJQUFBLElBQUcsQ0FBQSxRQUFTLENBQUMsa0JBQWI7QUFDQyxNQUFBLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLDRCQUFELENBQUEsQ0FBWixFQUE2QyxJQUE3QyxDQUFBLENBQUE7QUFBQSxNQUNBLFFBQVEsQ0FBQyxrQkFBVCxHQUE4QixJQUQ5QixDQUREO0tBQUEsTUFBQTtBQUlDLE1BQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUF0QixDQUFnQyxRQUFRLENBQUMsY0FBekMsQ0FBQSxDQUpEO0tBRkE7V0FRQSxLQVZXO0VBQUEsQ0ExRVosQ0FBQTs7QUFBQSxxQkFzRkEsNEJBQUEsR0FBK0IsU0FBQSxHQUFBO0FBRTlCLFFBQUEsa0NBQUE7QUFBQSxJQUFBLFNBQUEsR0FBYSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUF4QixHQUE0QixDQUFDLFFBQVEsQ0FBQyxjQUFULEdBQTBCLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQW5ELENBQXpDLENBQUE7QUFBQSxJQUNBLFVBQUEsR0FBYSxDQUFDLFNBQUEsR0FBWSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFoQyxDQUFBLEdBQXFDLFFBQVEsQ0FBQyxRQUQzRCxDQUFBO0FBQUEsSUFHQSxXQUFBLEdBQWMsSUFBSSxDQUFDLEtBQUwsQ0FBVyxVQUFYLENBQUEsR0FBeUIsUUFBUSxDQUFDLFFBSGhELENBQUE7QUFBQSxJQUlBLFdBQUEsR0FBaUIsQ0FBQyxVQUFBLEdBQWEsQ0FBZCxDQUFBLEdBQW1CLFFBQVEsQ0FBQyxrQkFBL0IsR0FBdUQsV0FBQSxHQUFjLFFBQVEsQ0FBQyxRQUE5RSxHQUE0RixXQUoxRyxDQUFBO0FBTUEsV0FBTyxXQUFBLEdBQWMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUF4QyxDQVI4QjtFQUFBLENBdEYvQixDQUFBOztBQUFBLHFCQWdHQSxVQUFBLEdBQWEsU0FBQyxLQUFELEVBQVEsa0JBQVIsR0FBQTtBQUVaLFFBQUEsc0RBQUE7O01BRm9CLHFCQUFtQjtLQUV2QztBQUFBLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBYSxxQkFBQSxHQUFxQixLQUFsQyxDQUFBLENBQUE7QUFBQSxJQUVBLFFBQUEsR0FBVyxFQUZYLENBQUE7QUFJQSxTQUFXLGtLQUFYLEdBQUE7QUFFQyxNQUFBLE1BQUEsR0FBUyxJQUFDLENBQUEsVUFBVSxDQUFDLEVBQVosQ0FBZSxHQUFmLENBQVQsQ0FBQTtBQUNBLE1BQUEsSUFBUyxDQUFBLE1BQVQ7QUFBQSxjQUFBO09BREE7QUFBQSxNQUdBLFFBQVEsQ0FBQyxJQUFULENBQWtCLElBQUEsWUFBQSxDQUFhLE1BQWIsRUFBcUIsa0JBQXJCLENBQWxCLENBSEEsQ0FGRDtBQUFBLEtBSkE7QUFBQSxJQVdBLFFBQVEsQ0FBQyxTQUFULEdBQXFCLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBbkIsQ0FBMEIsUUFBMUIsQ0FYckIsQ0FBQTtBQWFBLFNBQUEsMkRBQUE7MkJBQUE7QUFFQyxNQUFBLElBQUMsQ0FBQSxRQUFELENBQVUsSUFBVixDQUFBLENBQUE7QUFBQSxNQUNBLElBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixHQUFyQixFQUEwQixrQkFBMUIsQ0FEQSxDQUZEO0FBQUEsS0FiQTtXQWtCQSxLQXBCWTtFQUFBLENBaEdiLENBQUE7O0FBQUEscUJBc0hBLGFBQUEsR0FBZ0IsU0FBQyxJQUFELEVBQU8sS0FBUCxFQUFjLGtCQUFkLEdBQUE7QUFFZixRQUFBLDhCQUFBOztNQUY2QixxQkFBbUI7S0FFaEQ7QUFBQSxJQUFBLFFBQUEsR0FBYSxHQUFiLENBQUE7QUFBQSxJQUNBLFVBQUEsR0FBYTtBQUFBLE1BQUEsQ0FBQSxFQUFJLENBQUksa0JBQUgsR0FBMkIsTUFBTSxDQUFDLFdBQWxDLEdBQW1ELENBQXBELENBQUo7QUFBQSxNQUE0RCxPQUFBLEVBQVUsQ0FBdEU7QUFBQSxNQUF5RSxLQUFBLEVBQVEsR0FBakY7S0FEYixDQUFBO0FBQUEsSUFFQSxRQUFBLEdBQWE7QUFBQSxNQUFBLEtBQUEsRUFBUSxDQUFDLFFBQUEsR0FBVyxHQUFaLENBQUEsR0FBbUIsS0FBM0I7QUFBQSxNQUFrQyxDQUFBLEVBQUksQ0FBdEM7QUFBQSxNQUF5QyxPQUFBLEVBQVUsQ0FBbkQ7QUFBQSxNQUFzRCxLQUFBLEVBQVEsQ0FBOUQ7QUFBQSxNQUFrRSxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQTlFO0FBQUEsTUFBdUYsVUFBQSxFQUFhLElBQUksQ0FBQyxJQUF6RztLQUZiLENBQUE7QUFBQSxJQUlBLFNBQVMsQ0FBQyxNQUFWLENBQWlCLElBQUksQ0FBQyxHQUF0QixFQUEyQixRQUEzQixFQUFxQyxVQUFyQyxFQUFpRCxRQUFqRCxDQUpBLENBQUE7V0FNQSxLQVJlO0VBQUEsQ0F0SGhCLENBQUE7O2tCQUFBOztHQUpzQixpQkFIdkIsQ0FBQTs7QUFBQSxNQXVJTSxDQUFDLE9BQVAsR0FBaUIsUUF2SWpCLENBQUE7Ozs7O0FDQUEsSUFBQSwyQkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSLENBQWYsQ0FBQTs7QUFBQTtBQUlDLGtDQUFBLENBQUE7O0FBQUEsMEJBQUEsT0FBQSxHQUFVLElBQVYsQ0FBQTs7QUFFQTtBQUFBLHNDQUZBOztBQUFBLDBCQUdBLElBQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsMEJBSUEsUUFBQSxHQUFXLElBSlgsQ0FBQTs7QUFNYyxFQUFBLHVCQUFBLEdBQUE7QUFFYixtREFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLGlEQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLDZDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsT0FBRCxHQUFXLENBQUEsQ0FBRSxNQUFGLENBQVgsQ0FBQTtBQUFBLElBRUEsNkNBQUEsQ0FGQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsUUFBZCxDQUF1QixJQUF2QixDQUpBLENBQUE7QUFBQSxJQUtBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxDQUxBLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxTQUFELENBQUEsQ0FOQSxDQUFBO0FBUUEsV0FBTyxJQUFQLENBVmE7RUFBQSxDQU5kOztBQUFBLDBCQWtCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFZLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFBRyxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsTUFBZCxDQUFxQixLQUFyQixFQUFIO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWixDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0FsQlAsQ0FBQTs7QUFBQSwwQkF3QkEsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxLQUFkLENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFPLENBQUEsSUFBQyxDQUFBLElBQUQsQ0FBTSxDQUFDLElBQXpDLEdBQWdELElBRGhELENBQUE7V0FHQSxLQUxTO0VBQUEsQ0F4QlYsQ0FBQTs7QUFBQSwwQkErQkEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRWQsSUFBQSxJQUFDLENBQUEsT0FBUSxDQUFBLE9BQUEsQ0FBVCxDQUFrQixPQUFsQixFQUEyQixJQUFDLENBQUEsT0FBNUIsQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsQ0FBRCxDQUFHLGNBQUgsQ0FBbUIsQ0FBQSxPQUFBLENBQW5CLENBQTRCLE9BQTVCLEVBQXFDLElBQUMsQ0FBQSxVQUF0QyxDQURBLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0EvQmYsQ0FBQTs7QUFBQSwwQkFzQ0EsT0FBQSxHQUFVLFNBQUMsQ0FBRCxHQUFBO0FBRVQsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLEtBQWEsRUFBaEI7QUFBd0IsTUFBQSxJQUFDLENBQUEsSUFBRCxDQUFBLENBQUEsQ0FBeEI7S0FBQTtXQUVBLEtBSlM7RUFBQSxDQXRDVixDQUFBOztBQUFBLDBCQTRDQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVgsSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFkLEVBQW1CLEdBQW5CLEVBQXdCO0FBQUEsTUFBRSxZQUFBLEVBQWMsU0FBaEI7QUFBQSxNQUEyQixTQUFBLEVBQVcsQ0FBdEM7QUFBQSxNQUF5QyxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQXJEO0tBQXhCLENBQUEsQ0FBQTtBQUFBLElBQ0EsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxRQUFWLENBQWIsRUFBa0MsR0FBbEMsRUFBdUM7QUFBQSxNQUFFLEtBQUEsRUFBUSxJQUFWO0FBQUEsTUFBZ0IsV0FBQSxFQUFhLFVBQTdCO0FBQUEsTUFBeUMsWUFBQSxFQUFjLFNBQXZEO0FBQUEsTUFBa0UsU0FBQSxFQUFXLENBQTdFO0FBQUEsTUFBZ0YsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUE1RjtLQUF2QyxDQURBLENBQUE7V0FHQSxLQUxXO0VBQUEsQ0E1Q1osQ0FBQTs7QUFBQSwwQkFtREEsVUFBQSxHQUFhLFNBQUMsUUFBRCxHQUFBO0FBRVosSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFkLEVBQW1CLEdBQW5CLEVBQXdCO0FBQUEsTUFBRSxLQUFBLEVBQVEsSUFBVjtBQUFBLE1BQWdCLFNBQUEsRUFBVyxDQUEzQjtBQUFBLE1BQThCLElBQUEsRUFBTyxJQUFJLENBQUMsT0FBMUM7QUFBQSxNQUFtRCxVQUFBLEVBQVksUUFBL0Q7S0FBeEIsQ0FBQSxDQUFBO0FBQUEsSUFDQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFFBQVYsQ0FBYixFQUFrQyxHQUFsQyxFQUF1QztBQUFBLE1BQUUsV0FBQSxFQUFhLFlBQWY7QUFBQSxNQUE2QixTQUFBLEVBQVcsQ0FBeEM7QUFBQSxNQUEyQyxJQUFBLEVBQU8sSUFBSSxDQUFDLE1BQXZEO0tBQXZDLENBREEsQ0FBQTtXQUdBLEtBTFk7RUFBQSxDQW5EYixDQUFBOztBQUFBLDBCQTBEQSxVQUFBLEdBQVksU0FBRSxDQUFGLEdBQUE7QUFFWCxJQUFBLENBQUMsQ0FBQyxjQUFGLENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsSUFBRCxDQUFBLENBRkEsQ0FBQTtXQUlBLEtBTlc7RUFBQSxDQTFEWixDQUFBOzt1QkFBQTs7R0FGMkIsYUFGNUIsQ0FBQTs7QUFBQSxNQXNFTSxDQUFDLE9BQVAsR0FBaUIsYUF0RWpCLENBQUE7Ozs7O0FDQUEsSUFBQSwrQkFBQTtFQUFBOztpU0FBQTs7QUFBQSxhQUFBLEdBQWdCLE9BQUEsQ0FBUSxpQkFBUixDQUFoQixDQUFBOztBQUFBO0FBSUMscUNBQUEsQ0FBQTs7QUFBQSw2QkFBQSxJQUFBLEdBQVcsa0JBQVgsQ0FBQTs7QUFBQSw2QkFDQSxRQUFBLEdBQVcsbUJBRFgsQ0FBQTs7QUFBQSw2QkFHQSxFQUFBLEdBQVcsSUFIWCxDQUFBOztBQUtjLEVBQUEsMEJBQUUsRUFBRixHQUFBO0FBRWIsSUFGYyxJQUFDLENBQUEsS0FBQSxFQUVmLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQjtBQUFBLE1BQUUsTUFBRCxJQUFDLENBQUEsSUFBRjtLQUFoQixDQUFBO0FBQUEsSUFFQSxnREFBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOYTtFQUFBLENBTGQ7O0FBQUEsNkJBYUEsSUFBQSxHQUFPLFNBQUEsR0FBQTtXQUVOLEtBRk07RUFBQSxDQWJQLENBQUE7O0FBQUEsNkJBaUJBLElBQUEsR0FBTyxTQUFDLGNBQUQsR0FBQTs7TUFBQyxpQkFBZTtLQUV0QjtBQUFBLElBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBWSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO0FBQ1gsUUFBQSxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsTUFBZCxDQUFxQixLQUFyQixDQUFBLENBQUE7QUFDQSxRQUFBLElBQUcsQ0FBQSxjQUFIO2tEQUF3QixLQUFDLENBQUEsY0FBekI7U0FGVztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVosQ0FBQSxDQUFBO1dBSUEsS0FOTTtFQUFBLENBakJQLENBQUE7O0FBQUEsNkJBeUJBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsb0RBQUEsU0FBQSxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQVEsQ0FBQSxPQUFBLENBQWQsQ0FBdUIsWUFBdkIsRUFBcUMsSUFBQyxDQUFBLFlBQXRDLENBRkEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLEdBQUksQ0FBQSxPQUFBLENBQUwsQ0FBYyxnQkFBZCxFQUFnQyxJQUFDLENBQUEsSUFBakMsQ0FIQSxDQUFBO1dBS0EsS0FQYztFQUFBLENBekJmLENBQUE7O0FBQUEsNkJBa0NBLFlBQUEsR0FBZSxTQUFDLElBQUQsR0FBQTtBQUVkLElBQUEsSUFBRyxJQUFJLENBQUMsQ0FBTCxLQUFVLFVBQWI7QUFBNkIsTUFBQSxJQUFDLENBQUEsSUFBRCxDQUFNLEtBQU4sQ0FBQSxDQUE3QjtLQUFBO1dBRUEsS0FKYztFQUFBLENBbENmLENBQUE7OzBCQUFBOztHQUY4QixjQUYvQixDQUFBOztBQUFBLE1BNENNLENBQUMsT0FBUCxHQUFpQixnQkE1Q2pCLENBQUE7Ozs7O0FDQUEsSUFBQSw0Q0FBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQW1CLE9BQUEsQ0FBUSxpQkFBUixDQUFuQixDQUFBOztBQUFBLGdCQUNBLEdBQW1CLE9BQUEsQ0FBUSxvQkFBUixDQURuQixDQUFBOztBQUFBO0FBTUMsaUNBQUEsQ0FBQTs7QUFBQSx5QkFBQSxNQUFBLEdBQ0M7QUFBQSxJQUFBLGdCQUFBLEVBQW1CO0FBQUEsTUFBQSxRQUFBLEVBQVcsZ0JBQVg7QUFBQSxNQUE2QixJQUFBLEVBQU8sSUFBcEM7S0FBbkI7R0FERCxDQUFBOztBQUdjLEVBQUEsc0JBQUEsR0FBQTtBQUViLGlEQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsMkNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSxJQUFBLDRDQUFBLENBQUEsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUphO0VBQUEsQ0FIZDs7QUFBQSx5QkFTQSxJQUFBLEdBQU8sU0FBQSxHQUFBO1dBRU4sS0FGTTtFQUFBLENBVFAsQ0FBQTs7QUFBQSx5QkFhQSxNQUFBLEdBQVMsU0FBQSxHQUFBO0FBRVIsUUFBQSxpQkFBQTtBQUFBO0FBQUEsU0FBQSxZQUFBO3lCQUFBO0FBQUUsTUFBQSxJQUFHLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBakI7QUFBMkIsZUFBTyxJQUFQLENBQTNCO09BQUY7QUFBQSxLQUFBO1dBRUEsTUFKUTtFQUFBLENBYlQsQ0FBQTs7QUFBQSx5QkFtQkEsYUFBQSxHQUFnQixTQUFBLEdBQUE7QUFFZixRQUFBLDRCQUFBO0FBQUE7QUFBQSxTQUFBLFlBQUE7eUJBQUE7QUFBRSxNQUFBLElBQUcsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFqQjtBQUEyQixRQUFBLFNBQUEsR0FBWSxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQTFCLENBQTNCO09BQUY7QUFBQSxLQUFBOztNQUVBLFNBQVMsQ0FBRSxJQUFYLENBQUE7S0FGQTtXQUlBLEtBTmU7RUFBQSxDQW5CaEIsQ0FBQTs7QUFBQSx5QkEyQkEsU0FBQSxHQUFZLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTs7TUFBTyxLQUFHO0tBRXJCO0FBQUEsSUFBQSxJQUFVLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBeEI7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFkLEdBQXlCLElBQUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxRQUFkLENBQXVCLEVBQXZCLENBRnpCLENBQUE7V0FJQSxLQU5XO0VBQUEsQ0EzQlosQ0FBQTs7c0JBQUE7O0dBSDBCLGFBSDNCLENBQUE7O0FBQUEsTUF5Q00sQ0FBQyxPQUFQLEdBQWlCLFlBekNqQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcCA9IHJlcXVpcmUgJy4vQXBwJ1xuXG4jIFBST0RVQ1RJT04gRU5WSVJPTk1FTlQgLSBtYXkgd2FudCB0byB1c2Ugc2VydmVyLXNldCB2YXJpYWJsZXMgaGVyZVxuIyBJU19MSVZFID0gZG8gLT4gcmV0dXJuIGlmIHdpbmRvdy5sb2NhdGlvbi5ob3N0LmluZGV4T2YoJ2xvY2FsaG9zdCcpID4gLTEgb3Igd2luZG93LmxvY2F0aW9uLnNlYXJjaCBpcyAnP2QnIHRoZW4gZmFsc2UgZWxzZSB0cnVlXG5cbiMjI1xuXG5XSVAgLSB0aGlzIHdpbGwgaWRlYWxseSBjaGFuZ2UgdG8gb2xkIGZvcm1hdCAoYWJvdmUpIHdoZW4gY2FuIGZpZ3VyZSBpdCBvdXRcblxuIyMjXG5cbklTX0xJVkUgPSBmYWxzZVxuXG4jIE9OTFkgRVhQT1NFIEFQUCBHTE9CQUxMWSBJRiBMT0NBTCBPUiBERVYnSU5HXG52aWV3ID0gaWYgSVNfTElWRSB0aGVuIHt9IGVsc2UgKHdpbmRvdyBvciBkb2N1bWVudClcblxuIyBERUNMQVJFIE1BSU4gQVBQTElDQVRJT05cbnZpZXcuQ0QgPSBuZXcgQXBwIElTX0xJVkVcbnZpZXcuQ0QuaW5pdCgpXG4iLCIvKiEgaHR0cDovL210aHMuYmUvcHVueWNvZGUgdjEuMi40IGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGVzICovXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHRtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cyAmJiBtb2R1bGU7XG5cdHZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG5cdGlmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCkge1xuXHRcdHJvb3QgPSBmcmVlR2xvYmFsO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBgcHVueWNvZGVgIG9iamVjdC5cblx0ICogQG5hbWUgcHVueWNvZGVcblx0ICogQHR5cGUgT2JqZWN0XG5cdCAqL1xuXHR2YXIgcHVueWNvZGUsXG5cblx0LyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXHRtYXhJbnQgPSAyMTQ3NDgzNjQ3LCAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cblx0LyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xuXHRiYXNlID0gMzYsXG5cdHRNaW4gPSAxLFxuXHR0TWF4ID0gMjYsXG5cdHNrZXcgPSAzOCxcblx0ZGFtcCA9IDcwMCxcblx0aW5pdGlhbEJpYXMgPSA3Mixcblx0aW5pdGlhbE4gPSAxMjgsIC8vIDB4ODBcblx0ZGVsaW1pdGVyID0gJy0nLCAvLyAnXFx4MkQnXG5cblx0LyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cblx0cmVnZXhQdW55Y29kZSA9IC9eeG4tLS8sXG5cdHJlZ2V4Tm9uQVNDSUkgPSAvW14gLX5dLywgLy8gdW5wcmludGFibGUgQVNDSUkgY2hhcnMgKyBub24tQVNDSUkgY2hhcnNcblx0cmVnZXhTZXBhcmF0b3JzID0gL1xceDJFfFxcdTMwMDJ8XFx1RkYwRXxcXHVGRjYxL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdFx0YXJyYXlbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHRcdH1cblx0XHRyZXR1cm4gYXJyYXk7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZS5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHJldHVybiBtYXAoc3RyaW5nLnNwbGl0KHJlZ2V4U2VwYXJhdG9ycyksIGZuKS5qb2luKCcuJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBkZWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cblx0ICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGNvdW50ZXIgPSAwLFxuXHRcdCAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuXHRcdCAgICB2YWx1ZSxcblx0XHQgICAgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGVuY29kZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0cmV0dXJuIG1hcChhcnJheSwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHZhciBvdXRwdXQgPSAnJztcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cblx0ICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcblx0ICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdFx0aWYgKGNvZGVQb2ludCAtIDQ4IDwgMTApIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSAyMjtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDY1IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA2NTtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDk3IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA5Nztcblx0XHR9XG5cdFx0cmV0dXJuIGJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3Jcblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2Vcblx0ICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG5cdCAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG5cdCAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG5cdCAqL1xuXHRmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0XHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHRcdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRcdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG5cdH1cblxuXHQvKipcblx0ICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cblx0ICogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdFx0dmFyIGsgPSAwO1xuXHRcdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdFx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRcdGZvciAoLyogbm8gaW5pdGlhbGl6YXRpb24gKi87IGRlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdFx0fVxuXHRcdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHRcdC8vIERvbid0IHVzZSBVQ1MtMlxuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdFx0ICAgIG91dCxcblx0XHQgICAgaSA9IDAsXG5cdFx0ICAgIG4gPSBpbml0aWFsTixcblx0XHQgICAgYmlhcyA9IGluaXRpYWxCaWFzLFxuXHRcdCAgICBiYXNpYyxcblx0XHQgICAgaixcblx0XHQgICAgaW5kZXgsXG5cdFx0ICAgIG9sZGksXG5cdFx0ICAgIHcsXG5cdFx0ICAgIGssXG5cdFx0ICAgIGRpZ2l0LFxuXHRcdCAgICB0LFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgdG8gYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gVW5pY29kZS4gT25seSB0aGVcblx0ICogUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29udmVydGVkIHRvXG5cdCAqIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBQdW55Y29kZSBkb21haW4gbmFtZSB0byBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFB1bnljb2RlLiBPbmx5IHRoZVxuXHQgKiBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW4gQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSB0byBjb252ZXJ0LCBhcyBhIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMi40Jyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZSgncHVueWNvZGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fSBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiAhZnJlZUV4cG9ydHMubm9kZVR5cGUpIHtcblx0XHRpZiAoZnJlZU1vZHVsZSkgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHsgLy8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG4iLCJ2YXIgcHVueWNvZGUgPSByZXF1aXJlKCdwdW55Y29kZScpO1xudmFyIHJldkVudGl0aWVzID0gcmVxdWlyZSgnLi9yZXZlcnNlZC5qc29uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZW5jb2RlO1xuXG5mdW5jdGlvbiBlbmNvZGUgKHN0ciwgb3B0cykge1xuICAgIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhIFN0cmluZycpO1xuICAgIH1cbiAgICBpZiAoIW9wdHMpIG9wdHMgPSB7fTtcblxuICAgIHZhciBudW1lcmljID0gdHJ1ZTtcbiAgICBpZiAob3B0cy5uYW1lZCkgbnVtZXJpYyA9IGZhbHNlO1xuICAgIGlmIChvcHRzLm51bWVyaWMgIT09IHVuZGVmaW5lZCkgbnVtZXJpYyA9IG9wdHMubnVtZXJpYztcblxuICAgIHZhciBzcGVjaWFsID0gb3B0cy5zcGVjaWFsIHx8IHtcbiAgICAgICAgJ1wiJzogdHJ1ZSwgXCInXCI6IHRydWUsXG4gICAgICAgICc8JzogdHJ1ZSwgJz4nOiB0cnVlLFxuICAgICAgICAnJic6IHRydWVcbiAgICB9O1xuXG4gICAgdmFyIGNvZGVQb2ludHMgPSBwdW55Y29kZS51Y3MyLmRlY29kZShzdHIpO1xuICAgIHZhciBjaGFycyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29kZVBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2MgPSBjb2RlUG9pbnRzW2ldO1xuICAgICAgICB2YXIgYyA9IHB1bnljb2RlLnVjczIuZW5jb2RlKFsgY2MgXSk7XG4gICAgICAgIHZhciBlID0gcmV2RW50aXRpZXNbY2NdO1xuICAgICAgICBpZiAoZSAmJiAoY2MgPj0gMTI3IHx8IHNwZWNpYWxbY10pICYmICFudW1lcmljKSB7XG4gICAgICAgICAgICBjaGFycy5wdXNoKCcmJyArICgvOyQvLnRlc3QoZSkgPyBlIDogZSArICc7JykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNjIDwgMzIgfHwgY2MgPj0gMTI3IHx8IHNwZWNpYWxbY10pIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goJyYjJyArIGNjICsgJzsnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpO1xufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICAgIFwiOVwiOiBcIlRhYjtcIixcbiAgICBcIjEwXCI6IFwiTmV3TGluZTtcIixcbiAgICBcIjMzXCI6IFwiZXhjbDtcIixcbiAgICBcIjM0XCI6IFwicXVvdDtcIixcbiAgICBcIjM1XCI6IFwibnVtO1wiLFxuICAgIFwiMzZcIjogXCJkb2xsYXI7XCIsXG4gICAgXCIzN1wiOiBcInBlcmNudDtcIixcbiAgICBcIjM4XCI6IFwiYW1wO1wiLFxuICAgIFwiMzlcIjogXCJhcG9zO1wiLFxuICAgIFwiNDBcIjogXCJscGFyO1wiLFxuICAgIFwiNDFcIjogXCJycGFyO1wiLFxuICAgIFwiNDJcIjogXCJtaWRhc3Q7XCIsXG4gICAgXCI0M1wiOiBcInBsdXM7XCIsXG4gICAgXCI0NFwiOiBcImNvbW1hO1wiLFxuICAgIFwiNDZcIjogXCJwZXJpb2Q7XCIsXG4gICAgXCI0N1wiOiBcInNvbDtcIixcbiAgICBcIjU4XCI6IFwiY29sb247XCIsXG4gICAgXCI1OVwiOiBcInNlbWk7XCIsXG4gICAgXCI2MFwiOiBcImx0O1wiLFxuICAgIFwiNjFcIjogXCJlcXVhbHM7XCIsXG4gICAgXCI2MlwiOiBcImd0O1wiLFxuICAgIFwiNjNcIjogXCJxdWVzdDtcIixcbiAgICBcIjY0XCI6IFwiY29tbWF0O1wiLFxuICAgIFwiOTFcIjogXCJsc3FiO1wiLFxuICAgIFwiOTJcIjogXCJic29sO1wiLFxuICAgIFwiOTNcIjogXCJyc3FiO1wiLFxuICAgIFwiOTRcIjogXCJIYXQ7XCIsXG4gICAgXCI5NVwiOiBcIlVuZGVyQmFyO1wiLFxuICAgIFwiOTZcIjogXCJncmF2ZTtcIixcbiAgICBcIjEyM1wiOiBcImxjdWI7XCIsXG4gICAgXCIxMjRcIjogXCJWZXJ0aWNhbExpbmU7XCIsXG4gICAgXCIxMjVcIjogXCJyY3ViO1wiLFxuICAgIFwiMTYwXCI6IFwiTm9uQnJlYWtpbmdTcGFjZTtcIixcbiAgICBcIjE2MVwiOiBcImlleGNsO1wiLFxuICAgIFwiMTYyXCI6IFwiY2VudDtcIixcbiAgICBcIjE2M1wiOiBcInBvdW5kO1wiLFxuICAgIFwiMTY0XCI6IFwiY3VycmVuO1wiLFxuICAgIFwiMTY1XCI6IFwieWVuO1wiLFxuICAgIFwiMTY2XCI6IFwiYnJ2YmFyO1wiLFxuICAgIFwiMTY3XCI6IFwic2VjdDtcIixcbiAgICBcIjE2OFwiOiBcInVtbDtcIixcbiAgICBcIjE2OVwiOiBcImNvcHk7XCIsXG4gICAgXCIxNzBcIjogXCJvcmRmO1wiLFxuICAgIFwiMTcxXCI6IFwibGFxdW87XCIsXG4gICAgXCIxNzJcIjogXCJub3Q7XCIsXG4gICAgXCIxNzNcIjogXCJzaHk7XCIsXG4gICAgXCIxNzRcIjogXCJyZWc7XCIsXG4gICAgXCIxNzVcIjogXCJzdHJucztcIixcbiAgICBcIjE3NlwiOiBcImRlZztcIixcbiAgICBcIjE3N1wiOiBcInBtO1wiLFxuICAgIFwiMTc4XCI6IFwic3VwMjtcIixcbiAgICBcIjE3OVwiOiBcInN1cDM7XCIsXG4gICAgXCIxODBcIjogXCJEaWFjcml0aWNhbEFjdXRlO1wiLFxuICAgIFwiMTgxXCI6IFwibWljcm87XCIsXG4gICAgXCIxODJcIjogXCJwYXJhO1wiLFxuICAgIFwiMTgzXCI6IFwibWlkZG90O1wiLFxuICAgIFwiMTg0XCI6IFwiQ2VkaWxsYTtcIixcbiAgICBcIjE4NVwiOiBcInN1cDE7XCIsXG4gICAgXCIxODZcIjogXCJvcmRtO1wiLFxuICAgIFwiMTg3XCI6IFwicmFxdW87XCIsXG4gICAgXCIxODhcIjogXCJmcmFjMTQ7XCIsXG4gICAgXCIxODlcIjogXCJoYWxmO1wiLFxuICAgIFwiMTkwXCI6IFwiZnJhYzM0O1wiLFxuICAgIFwiMTkxXCI6IFwiaXF1ZXN0O1wiLFxuICAgIFwiMTkyXCI6IFwiQWdyYXZlO1wiLFxuICAgIFwiMTkzXCI6IFwiQWFjdXRlO1wiLFxuICAgIFwiMTk0XCI6IFwiQWNpcmM7XCIsXG4gICAgXCIxOTVcIjogXCJBdGlsZGU7XCIsXG4gICAgXCIxOTZcIjogXCJBdW1sO1wiLFxuICAgIFwiMTk3XCI6IFwiQXJpbmc7XCIsXG4gICAgXCIxOThcIjogXCJBRWxpZztcIixcbiAgICBcIjE5OVwiOiBcIkNjZWRpbDtcIixcbiAgICBcIjIwMFwiOiBcIkVncmF2ZTtcIixcbiAgICBcIjIwMVwiOiBcIkVhY3V0ZTtcIixcbiAgICBcIjIwMlwiOiBcIkVjaXJjO1wiLFxuICAgIFwiMjAzXCI6IFwiRXVtbDtcIixcbiAgICBcIjIwNFwiOiBcIklncmF2ZTtcIixcbiAgICBcIjIwNVwiOiBcIklhY3V0ZTtcIixcbiAgICBcIjIwNlwiOiBcIkljaXJjO1wiLFxuICAgIFwiMjA3XCI6IFwiSXVtbDtcIixcbiAgICBcIjIwOFwiOiBcIkVUSDtcIixcbiAgICBcIjIwOVwiOiBcIk50aWxkZTtcIixcbiAgICBcIjIxMFwiOiBcIk9ncmF2ZTtcIixcbiAgICBcIjIxMVwiOiBcIk9hY3V0ZTtcIixcbiAgICBcIjIxMlwiOiBcIk9jaXJjO1wiLFxuICAgIFwiMjEzXCI6IFwiT3RpbGRlO1wiLFxuICAgIFwiMjE0XCI6IFwiT3VtbDtcIixcbiAgICBcIjIxNVwiOiBcInRpbWVzO1wiLFxuICAgIFwiMjE2XCI6IFwiT3NsYXNoO1wiLFxuICAgIFwiMjE3XCI6IFwiVWdyYXZlO1wiLFxuICAgIFwiMjE4XCI6IFwiVWFjdXRlO1wiLFxuICAgIFwiMjE5XCI6IFwiVWNpcmM7XCIsXG4gICAgXCIyMjBcIjogXCJVdW1sO1wiLFxuICAgIFwiMjIxXCI6IFwiWWFjdXRlO1wiLFxuICAgIFwiMjIyXCI6IFwiVEhPUk47XCIsXG4gICAgXCIyMjNcIjogXCJzemxpZztcIixcbiAgICBcIjIyNFwiOiBcImFncmF2ZTtcIixcbiAgICBcIjIyNVwiOiBcImFhY3V0ZTtcIixcbiAgICBcIjIyNlwiOiBcImFjaXJjO1wiLFxuICAgIFwiMjI3XCI6IFwiYXRpbGRlO1wiLFxuICAgIFwiMjI4XCI6IFwiYXVtbDtcIixcbiAgICBcIjIyOVwiOiBcImFyaW5nO1wiLFxuICAgIFwiMjMwXCI6IFwiYWVsaWc7XCIsXG4gICAgXCIyMzFcIjogXCJjY2VkaWw7XCIsXG4gICAgXCIyMzJcIjogXCJlZ3JhdmU7XCIsXG4gICAgXCIyMzNcIjogXCJlYWN1dGU7XCIsXG4gICAgXCIyMzRcIjogXCJlY2lyYztcIixcbiAgICBcIjIzNVwiOiBcImV1bWw7XCIsXG4gICAgXCIyMzZcIjogXCJpZ3JhdmU7XCIsXG4gICAgXCIyMzdcIjogXCJpYWN1dGU7XCIsXG4gICAgXCIyMzhcIjogXCJpY2lyYztcIixcbiAgICBcIjIzOVwiOiBcIml1bWw7XCIsXG4gICAgXCIyNDBcIjogXCJldGg7XCIsXG4gICAgXCIyNDFcIjogXCJudGlsZGU7XCIsXG4gICAgXCIyNDJcIjogXCJvZ3JhdmU7XCIsXG4gICAgXCIyNDNcIjogXCJvYWN1dGU7XCIsXG4gICAgXCIyNDRcIjogXCJvY2lyYztcIixcbiAgICBcIjI0NVwiOiBcIm90aWxkZTtcIixcbiAgICBcIjI0NlwiOiBcIm91bWw7XCIsXG4gICAgXCIyNDdcIjogXCJkaXZpZGU7XCIsXG4gICAgXCIyNDhcIjogXCJvc2xhc2g7XCIsXG4gICAgXCIyNDlcIjogXCJ1Z3JhdmU7XCIsXG4gICAgXCIyNTBcIjogXCJ1YWN1dGU7XCIsXG4gICAgXCIyNTFcIjogXCJ1Y2lyYztcIixcbiAgICBcIjI1MlwiOiBcInV1bWw7XCIsXG4gICAgXCIyNTNcIjogXCJ5YWN1dGU7XCIsXG4gICAgXCIyNTRcIjogXCJ0aG9ybjtcIixcbiAgICBcIjI1NVwiOiBcInl1bWw7XCIsXG4gICAgXCIyNTZcIjogXCJBbWFjcjtcIixcbiAgICBcIjI1N1wiOiBcImFtYWNyO1wiLFxuICAgIFwiMjU4XCI6IFwiQWJyZXZlO1wiLFxuICAgIFwiMjU5XCI6IFwiYWJyZXZlO1wiLFxuICAgIFwiMjYwXCI6IFwiQW9nb247XCIsXG4gICAgXCIyNjFcIjogXCJhb2dvbjtcIixcbiAgICBcIjI2MlwiOiBcIkNhY3V0ZTtcIixcbiAgICBcIjI2M1wiOiBcImNhY3V0ZTtcIixcbiAgICBcIjI2NFwiOiBcIkNjaXJjO1wiLFxuICAgIFwiMjY1XCI6IFwiY2NpcmM7XCIsXG4gICAgXCIyNjZcIjogXCJDZG90O1wiLFxuICAgIFwiMjY3XCI6IFwiY2RvdDtcIixcbiAgICBcIjI2OFwiOiBcIkNjYXJvbjtcIixcbiAgICBcIjI2OVwiOiBcImNjYXJvbjtcIixcbiAgICBcIjI3MFwiOiBcIkRjYXJvbjtcIixcbiAgICBcIjI3MVwiOiBcImRjYXJvbjtcIixcbiAgICBcIjI3MlwiOiBcIkRzdHJvaztcIixcbiAgICBcIjI3M1wiOiBcImRzdHJvaztcIixcbiAgICBcIjI3NFwiOiBcIkVtYWNyO1wiLFxuICAgIFwiMjc1XCI6IFwiZW1hY3I7XCIsXG4gICAgXCIyNzhcIjogXCJFZG90O1wiLFxuICAgIFwiMjc5XCI6IFwiZWRvdDtcIixcbiAgICBcIjI4MFwiOiBcIkVvZ29uO1wiLFxuICAgIFwiMjgxXCI6IFwiZW9nb247XCIsXG4gICAgXCIyODJcIjogXCJFY2Fyb247XCIsXG4gICAgXCIyODNcIjogXCJlY2Fyb247XCIsXG4gICAgXCIyODRcIjogXCJHY2lyYztcIixcbiAgICBcIjI4NVwiOiBcImdjaXJjO1wiLFxuICAgIFwiMjg2XCI6IFwiR2JyZXZlO1wiLFxuICAgIFwiMjg3XCI6IFwiZ2JyZXZlO1wiLFxuICAgIFwiMjg4XCI6IFwiR2RvdDtcIixcbiAgICBcIjI4OVwiOiBcImdkb3Q7XCIsXG4gICAgXCIyOTBcIjogXCJHY2VkaWw7XCIsXG4gICAgXCIyOTJcIjogXCJIY2lyYztcIixcbiAgICBcIjI5M1wiOiBcImhjaXJjO1wiLFxuICAgIFwiMjk0XCI6IFwiSHN0cm9rO1wiLFxuICAgIFwiMjk1XCI6IFwiaHN0cm9rO1wiLFxuICAgIFwiMjk2XCI6IFwiSXRpbGRlO1wiLFxuICAgIFwiMjk3XCI6IFwiaXRpbGRlO1wiLFxuICAgIFwiMjk4XCI6IFwiSW1hY3I7XCIsXG4gICAgXCIyOTlcIjogXCJpbWFjcjtcIixcbiAgICBcIjMwMlwiOiBcIklvZ29uO1wiLFxuICAgIFwiMzAzXCI6IFwiaW9nb247XCIsXG4gICAgXCIzMDRcIjogXCJJZG90O1wiLFxuICAgIFwiMzA1XCI6IFwiaW5vZG90O1wiLFxuICAgIFwiMzA2XCI6IFwiSUpsaWc7XCIsXG4gICAgXCIzMDdcIjogXCJpamxpZztcIixcbiAgICBcIjMwOFwiOiBcIkpjaXJjO1wiLFxuICAgIFwiMzA5XCI6IFwiamNpcmM7XCIsXG4gICAgXCIzMTBcIjogXCJLY2VkaWw7XCIsXG4gICAgXCIzMTFcIjogXCJrY2VkaWw7XCIsXG4gICAgXCIzMTJcIjogXCJrZ3JlZW47XCIsXG4gICAgXCIzMTNcIjogXCJMYWN1dGU7XCIsXG4gICAgXCIzMTRcIjogXCJsYWN1dGU7XCIsXG4gICAgXCIzMTVcIjogXCJMY2VkaWw7XCIsXG4gICAgXCIzMTZcIjogXCJsY2VkaWw7XCIsXG4gICAgXCIzMTdcIjogXCJMY2Fyb247XCIsXG4gICAgXCIzMThcIjogXCJsY2Fyb247XCIsXG4gICAgXCIzMTlcIjogXCJMbWlkb3Q7XCIsXG4gICAgXCIzMjBcIjogXCJsbWlkb3Q7XCIsXG4gICAgXCIzMjFcIjogXCJMc3Ryb2s7XCIsXG4gICAgXCIzMjJcIjogXCJsc3Ryb2s7XCIsXG4gICAgXCIzMjNcIjogXCJOYWN1dGU7XCIsXG4gICAgXCIzMjRcIjogXCJuYWN1dGU7XCIsXG4gICAgXCIzMjVcIjogXCJOY2VkaWw7XCIsXG4gICAgXCIzMjZcIjogXCJuY2VkaWw7XCIsXG4gICAgXCIzMjdcIjogXCJOY2Fyb247XCIsXG4gICAgXCIzMjhcIjogXCJuY2Fyb247XCIsXG4gICAgXCIzMjlcIjogXCJuYXBvcztcIixcbiAgICBcIjMzMFwiOiBcIkVORztcIixcbiAgICBcIjMzMVwiOiBcImVuZztcIixcbiAgICBcIjMzMlwiOiBcIk9tYWNyO1wiLFxuICAgIFwiMzMzXCI6IFwib21hY3I7XCIsXG4gICAgXCIzMzZcIjogXCJPZGJsYWM7XCIsXG4gICAgXCIzMzdcIjogXCJvZGJsYWM7XCIsXG4gICAgXCIzMzhcIjogXCJPRWxpZztcIixcbiAgICBcIjMzOVwiOiBcIm9lbGlnO1wiLFxuICAgIFwiMzQwXCI6IFwiUmFjdXRlO1wiLFxuICAgIFwiMzQxXCI6IFwicmFjdXRlO1wiLFxuICAgIFwiMzQyXCI6IFwiUmNlZGlsO1wiLFxuICAgIFwiMzQzXCI6IFwicmNlZGlsO1wiLFxuICAgIFwiMzQ0XCI6IFwiUmNhcm9uO1wiLFxuICAgIFwiMzQ1XCI6IFwicmNhcm9uO1wiLFxuICAgIFwiMzQ2XCI6IFwiU2FjdXRlO1wiLFxuICAgIFwiMzQ3XCI6IFwic2FjdXRlO1wiLFxuICAgIFwiMzQ4XCI6IFwiU2NpcmM7XCIsXG4gICAgXCIzNDlcIjogXCJzY2lyYztcIixcbiAgICBcIjM1MFwiOiBcIlNjZWRpbDtcIixcbiAgICBcIjM1MVwiOiBcInNjZWRpbDtcIixcbiAgICBcIjM1MlwiOiBcIlNjYXJvbjtcIixcbiAgICBcIjM1M1wiOiBcInNjYXJvbjtcIixcbiAgICBcIjM1NFwiOiBcIlRjZWRpbDtcIixcbiAgICBcIjM1NVwiOiBcInRjZWRpbDtcIixcbiAgICBcIjM1NlwiOiBcIlRjYXJvbjtcIixcbiAgICBcIjM1N1wiOiBcInRjYXJvbjtcIixcbiAgICBcIjM1OFwiOiBcIlRzdHJvaztcIixcbiAgICBcIjM1OVwiOiBcInRzdHJvaztcIixcbiAgICBcIjM2MFwiOiBcIlV0aWxkZTtcIixcbiAgICBcIjM2MVwiOiBcInV0aWxkZTtcIixcbiAgICBcIjM2MlwiOiBcIlVtYWNyO1wiLFxuICAgIFwiMzYzXCI6IFwidW1hY3I7XCIsXG4gICAgXCIzNjRcIjogXCJVYnJldmU7XCIsXG4gICAgXCIzNjVcIjogXCJ1YnJldmU7XCIsXG4gICAgXCIzNjZcIjogXCJVcmluZztcIixcbiAgICBcIjM2N1wiOiBcInVyaW5nO1wiLFxuICAgIFwiMzY4XCI6IFwiVWRibGFjO1wiLFxuICAgIFwiMzY5XCI6IFwidWRibGFjO1wiLFxuICAgIFwiMzcwXCI6IFwiVW9nb247XCIsXG4gICAgXCIzNzFcIjogXCJ1b2dvbjtcIixcbiAgICBcIjM3MlwiOiBcIldjaXJjO1wiLFxuICAgIFwiMzczXCI6IFwid2NpcmM7XCIsXG4gICAgXCIzNzRcIjogXCJZY2lyYztcIixcbiAgICBcIjM3NVwiOiBcInljaXJjO1wiLFxuICAgIFwiMzc2XCI6IFwiWXVtbDtcIixcbiAgICBcIjM3N1wiOiBcIlphY3V0ZTtcIixcbiAgICBcIjM3OFwiOiBcInphY3V0ZTtcIixcbiAgICBcIjM3OVwiOiBcIlpkb3Q7XCIsXG4gICAgXCIzODBcIjogXCJ6ZG90O1wiLFxuICAgIFwiMzgxXCI6IFwiWmNhcm9uO1wiLFxuICAgIFwiMzgyXCI6IFwiemNhcm9uO1wiLFxuICAgIFwiNDAyXCI6IFwiZm5vZjtcIixcbiAgICBcIjQzN1wiOiBcImltcGVkO1wiLFxuICAgIFwiNTAxXCI6IFwiZ2FjdXRlO1wiLFxuICAgIFwiNTY3XCI6IFwiam1hdGg7XCIsXG4gICAgXCI3MTBcIjogXCJjaXJjO1wiLFxuICAgIFwiNzExXCI6IFwiSGFjZWs7XCIsXG4gICAgXCI3MjhcIjogXCJicmV2ZTtcIixcbiAgICBcIjcyOVwiOiBcImRvdDtcIixcbiAgICBcIjczMFwiOiBcInJpbmc7XCIsXG4gICAgXCI3MzFcIjogXCJvZ29uO1wiLFxuICAgIFwiNzMyXCI6IFwidGlsZGU7XCIsXG4gICAgXCI3MzNcIjogXCJEaWFjcml0aWNhbERvdWJsZUFjdXRlO1wiLFxuICAgIFwiNzg1XCI6IFwiRG93bkJyZXZlO1wiLFxuICAgIFwiOTEzXCI6IFwiQWxwaGE7XCIsXG4gICAgXCI5MTRcIjogXCJCZXRhO1wiLFxuICAgIFwiOTE1XCI6IFwiR2FtbWE7XCIsXG4gICAgXCI5MTZcIjogXCJEZWx0YTtcIixcbiAgICBcIjkxN1wiOiBcIkVwc2lsb247XCIsXG4gICAgXCI5MThcIjogXCJaZXRhO1wiLFxuICAgIFwiOTE5XCI6IFwiRXRhO1wiLFxuICAgIFwiOTIwXCI6IFwiVGhldGE7XCIsXG4gICAgXCI5MjFcIjogXCJJb3RhO1wiLFxuICAgIFwiOTIyXCI6IFwiS2FwcGE7XCIsXG4gICAgXCI5MjNcIjogXCJMYW1iZGE7XCIsXG4gICAgXCI5MjRcIjogXCJNdTtcIixcbiAgICBcIjkyNVwiOiBcIk51O1wiLFxuICAgIFwiOTI2XCI6IFwiWGk7XCIsXG4gICAgXCI5MjdcIjogXCJPbWljcm9uO1wiLFxuICAgIFwiOTI4XCI6IFwiUGk7XCIsXG4gICAgXCI5MjlcIjogXCJSaG87XCIsXG4gICAgXCI5MzFcIjogXCJTaWdtYTtcIixcbiAgICBcIjkzMlwiOiBcIlRhdTtcIixcbiAgICBcIjkzM1wiOiBcIlVwc2lsb247XCIsXG4gICAgXCI5MzRcIjogXCJQaGk7XCIsXG4gICAgXCI5MzVcIjogXCJDaGk7XCIsXG4gICAgXCI5MzZcIjogXCJQc2k7XCIsXG4gICAgXCI5MzdcIjogXCJPbWVnYTtcIixcbiAgICBcIjk0NVwiOiBcImFscGhhO1wiLFxuICAgIFwiOTQ2XCI6IFwiYmV0YTtcIixcbiAgICBcIjk0N1wiOiBcImdhbW1hO1wiLFxuICAgIFwiOTQ4XCI6IFwiZGVsdGE7XCIsXG4gICAgXCI5NDlcIjogXCJlcHNpbG9uO1wiLFxuICAgIFwiOTUwXCI6IFwiemV0YTtcIixcbiAgICBcIjk1MVwiOiBcImV0YTtcIixcbiAgICBcIjk1MlwiOiBcInRoZXRhO1wiLFxuICAgIFwiOTUzXCI6IFwiaW90YTtcIixcbiAgICBcIjk1NFwiOiBcImthcHBhO1wiLFxuICAgIFwiOTU1XCI6IFwibGFtYmRhO1wiLFxuICAgIFwiOTU2XCI6IFwibXU7XCIsXG4gICAgXCI5NTdcIjogXCJudTtcIixcbiAgICBcIjk1OFwiOiBcInhpO1wiLFxuICAgIFwiOTU5XCI6IFwib21pY3JvbjtcIixcbiAgICBcIjk2MFwiOiBcInBpO1wiLFxuICAgIFwiOTYxXCI6IFwicmhvO1wiLFxuICAgIFwiOTYyXCI6IFwidmFyc2lnbWE7XCIsXG4gICAgXCI5NjNcIjogXCJzaWdtYTtcIixcbiAgICBcIjk2NFwiOiBcInRhdTtcIixcbiAgICBcIjk2NVwiOiBcInVwc2lsb247XCIsXG4gICAgXCI5NjZcIjogXCJwaGk7XCIsXG4gICAgXCI5NjdcIjogXCJjaGk7XCIsXG4gICAgXCI5NjhcIjogXCJwc2k7XCIsXG4gICAgXCI5NjlcIjogXCJvbWVnYTtcIixcbiAgICBcIjk3N1wiOiBcInZhcnRoZXRhO1wiLFxuICAgIFwiOTc4XCI6IFwidXBzaWg7XCIsXG4gICAgXCI5ODFcIjogXCJ2YXJwaGk7XCIsXG4gICAgXCI5ODJcIjogXCJ2YXJwaTtcIixcbiAgICBcIjk4OFwiOiBcIkdhbW1hZDtcIixcbiAgICBcIjk4OVwiOiBcImdhbW1hZDtcIixcbiAgICBcIjEwMDhcIjogXCJ2YXJrYXBwYTtcIixcbiAgICBcIjEwMDlcIjogXCJ2YXJyaG87XCIsXG4gICAgXCIxMDEzXCI6IFwidmFyZXBzaWxvbjtcIixcbiAgICBcIjEwMTRcIjogXCJiZXBzaTtcIixcbiAgICBcIjEwMjVcIjogXCJJT2N5O1wiLFxuICAgIFwiMTAyNlwiOiBcIkRKY3k7XCIsXG4gICAgXCIxMDI3XCI6IFwiR0pjeTtcIixcbiAgICBcIjEwMjhcIjogXCJKdWtjeTtcIixcbiAgICBcIjEwMjlcIjogXCJEU2N5O1wiLFxuICAgIFwiMTAzMFwiOiBcIkl1a2N5O1wiLFxuICAgIFwiMTAzMVwiOiBcIllJY3k7XCIsXG4gICAgXCIxMDMyXCI6IFwiSnNlcmN5O1wiLFxuICAgIFwiMTAzM1wiOiBcIkxKY3k7XCIsXG4gICAgXCIxMDM0XCI6IFwiTkpjeTtcIixcbiAgICBcIjEwMzVcIjogXCJUU0hjeTtcIixcbiAgICBcIjEwMzZcIjogXCJLSmN5O1wiLFxuICAgIFwiMTAzOFwiOiBcIlVicmN5O1wiLFxuICAgIFwiMTAzOVwiOiBcIkRaY3k7XCIsXG4gICAgXCIxMDQwXCI6IFwiQWN5O1wiLFxuICAgIFwiMTA0MVwiOiBcIkJjeTtcIixcbiAgICBcIjEwNDJcIjogXCJWY3k7XCIsXG4gICAgXCIxMDQzXCI6IFwiR2N5O1wiLFxuICAgIFwiMTA0NFwiOiBcIkRjeTtcIixcbiAgICBcIjEwNDVcIjogXCJJRWN5O1wiLFxuICAgIFwiMTA0NlwiOiBcIlpIY3k7XCIsXG4gICAgXCIxMDQ3XCI6IFwiWmN5O1wiLFxuICAgIFwiMTA0OFwiOiBcIkljeTtcIixcbiAgICBcIjEwNDlcIjogXCJKY3k7XCIsXG4gICAgXCIxMDUwXCI6IFwiS2N5O1wiLFxuICAgIFwiMTA1MVwiOiBcIkxjeTtcIixcbiAgICBcIjEwNTJcIjogXCJNY3k7XCIsXG4gICAgXCIxMDUzXCI6IFwiTmN5O1wiLFxuICAgIFwiMTA1NFwiOiBcIk9jeTtcIixcbiAgICBcIjEwNTVcIjogXCJQY3k7XCIsXG4gICAgXCIxMDU2XCI6IFwiUmN5O1wiLFxuICAgIFwiMTA1N1wiOiBcIlNjeTtcIixcbiAgICBcIjEwNThcIjogXCJUY3k7XCIsXG4gICAgXCIxMDU5XCI6IFwiVWN5O1wiLFxuICAgIFwiMTA2MFwiOiBcIkZjeTtcIixcbiAgICBcIjEwNjFcIjogXCJLSGN5O1wiLFxuICAgIFwiMTA2MlwiOiBcIlRTY3k7XCIsXG4gICAgXCIxMDYzXCI6IFwiQ0hjeTtcIixcbiAgICBcIjEwNjRcIjogXCJTSGN5O1wiLFxuICAgIFwiMTA2NVwiOiBcIlNIQ0hjeTtcIixcbiAgICBcIjEwNjZcIjogXCJIQVJEY3k7XCIsXG4gICAgXCIxMDY3XCI6IFwiWWN5O1wiLFxuICAgIFwiMTA2OFwiOiBcIlNPRlRjeTtcIixcbiAgICBcIjEwNjlcIjogXCJFY3k7XCIsXG4gICAgXCIxMDcwXCI6IFwiWVVjeTtcIixcbiAgICBcIjEwNzFcIjogXCJZQWN5O1wiLFxuICAgIFwiMTA3MlwiOiBcImFjeTtcIixcbiAgICBcIjEwNzNcIjogXCJiY3k7XCIsXG4gICAgXCIxMDc0XCI6IFwidmN5O1wiLFxuICAgIFwiMTA3NVwiOiBcImdjeTtcIixcbiAgICBcIjEwNzZcIjogXCJkY3k7XCIsXG4gICAgXCIxMDc3XCI6IFwiaWVjeTtcIixcbiAgICBcIjEwNzhcIjogXCJ6aGN5O1wiLFxuICAgIFwiMTA3OVwiOiBcInpjeTtcIixcbiAgICBcIjEwODBcIjogXCJpY3k7XCIsXG4gICAgXCIxMDgxXCI6IFwiamN5O1wiLFxuICAgIFwiMTA4MlwiOiBcImtjeTtcIixcbiAgICBcIjEwODNcIjogXCJsY3k7XCIsXG4gICAgXCIxMDg0XCI6IFwibWN5O1wiLFxuICAgIFwiMTA4NVwiOiBcIm5jeTtcIixcbiAgICBcIjEwODZcIjogXCJvY3k7XCIsXG4gICAgXCIxMDg3XCI6IFwicGN5O1wiLFxuICAgIFwiMTA4OFwiOiBcInJjeTtcIixcbiAgICBcIjEwODlcIjogXCJzY3k7XCIsXG4gICAgXCIxMDkwXCI6IFwidGN5O1wiLFxuICAgIFwiMTA5MVwiOiBcInVjeTtcIixcbiAgICBcIjEwOTJcIjogXCJmY3k7XCIsXG4gICAgXCIxMDkzXCI6IFwia2hjeTtcIixcbiAgICBcIjEwOTRcIjogXCJ0c2N5O1wiLFxuICAgIFwiMTA5NVwiOiBcImNoY3k7XCIsXG4gICAgXCIxMDk2XCI6IFwic2hjeTtcIixcbiAgICBcIjEwOTdcIjogXCJzaGNoY3k7XCIsXG4gICAgXCIxMDk4XCI6IFwiaGFyZGN5O1wiLFxuICAgIFwiMTA5OVwiOiBcInljeTtcIixcbiAgICBcIjExMDBcIjogXCJzb2Z0Y3k7XCIsXG4gICAgXCIxMTAxXCI6IFwiZWN5O1wiLFxuICAgIFwiMTEwMlwiOiBcInl1Y3k7XCIsXG4gICAgXCIxMTAzXCI6IFwieWFjeTtcIixcbiAgICBcIjExMDVcIjogXCJpb2N5O1wiLFxuICAgIFwiMTEwNlwiOiBcImRqY3k7XCIsXG4gICAgXCIxMTA3XCI6IFwiZ2pjeTtcIixcbiAgICBcIjExMDhcIjogXCJqdWtjeTtcIixcbiAgICBcIjExMDlcIjogXCJkc2N5O1wiLFxuICAgIFwiMTExMFwiOiBcIml1a2N5O1wiLFxuICAgIFwiMTExMVwiOiBcInlpY3k7XCIsXG4gICAgXCIxMTEyXCI6IFwianNlcmN5O1wiLFxuICAgIFwiMTExM1wiOiBcImxqY3k7XCIsXG4gICAgXCIxMTE0XCI6IFwibmpjeTtcIixcbiAgICBcIjExMTVcIjogXCJ0c2hjeTtcIixcbiAgICBcIjExMTZcIjogXCJramN5O1wiLFxuICAgIFwiMTExOFwiOiBcInVicmN5O1wiLFxuICAgIFwiMTExOVwiOiBcImR6Y3k7XCIsXG4gICAgXCI4MTk0XCI6IFwiZW5zcDtcIixcbiAgICBcIjgxOTVcIjogXCJlbXNwO1wiLFxuICAgIFwiODE5NlwiOiBcImVtc3AxMztcIixcbiAgICBcIjgxOTdcIjogXCJlbXNwMTQ7XCIsXG4gICAgXCI4MTk5XCI6IFwibnVtc3A7XCIsXG4gICAgXCI4MjAwXCI6IFwicHVuY3NwO1wiLFxuICAgIFwiODIwMVwiOiBcIlRoaW5TcGFjZTtcIixcbiAgICBcIjgyMDJcIjogXCJWZXJ5VGhpblNwYWNlO1wiLFxuICAgIFwiODIwM1wiOiBcIlplcm9XaWR0aFNwYWNlO1wiLFxuICAgIFwiODIwNFwiOiBcInp3bmo7XCIsXG4gICAgXCI4MjA1XCI6IFwiendqO1wiLFxuICAgIFwiODIwNlwiOiBcImxybTtcIixcbiAgICBcIjgyMDdcIjogXCJybG07XCIsXG4gICAgXCI4MjA4XCI6IFwiaHlwaGVuO1wiLFxuICAgIFwiODIxMVwiOiBcIm5kYXNoO1wiLFxuICAgIFwiODIxMlwiOiBcIm1kYXNoO1wiLFxuICAgIFwiODIxM1wiOiBcImhvcmJhcjtcIixcbiAgICBcIjgyMTRcIjogXCJWZXJ0O1wiLFxuICAgIFwiODIxNlwiOiBcIk9wZW5DdXJseVF1b3RlO1wiLFxuICAgIFwiODIxN1wiOiBcInJzcXVvcjtcIixcbiAgICBcIjgyMThcIjogXCJzYnF1bztcIixcbiAgICBcIjgyMjBcIjogXCJPcGVuQ3VybHlEb3VibGVRdW90ZTtcIixcbiAgICBcIjgyMjFcIjogXCJyZHF1b3I7XCIsXG4gICAgXCI4MjIyXCI6IFwibGRxdW9yO1wiLFxuICAgIFwiODIyNFwiOiBcImRhZ2dlcjtcIixcbiAgICBcIjgyMjVcIjogXCJkZGFnZ2VyO1wiLFxuICAgIFwiODIyNlwiOiBcImJ1bGxldDtcIixcbiAgICBcIjgyMjlcIjogXCJubGRyO1wiLFxuICAgIFwiODIzMFwiOiBcIm1sZHI7XCIsXG4gICAgXCI4MjQwXCI6IFwicGVybWlsO1wiLFxuICAgIFwiODI0MVwiOiBcInBlcnRlbms7XCIsXG4gICAgXCI4MjQyXCI6IFwicHJpbWU7XCIsXG4gICAgXCI4MjQzXCI6IFwiUHJpbWU7XCIsXG4gICAgXCI4MjQ0XCI6IFwidHByaW1lO1wiLFxuICAgIFwiODI0NVwiOiBcImJwcmltZTtcIixcbiAgICBcIjgyNDlcIjogXCJsc2FxdW87XCIsXG4gICAgXCI4MjUwXCI6IFwicnNhcXVvO1wiLFxuICAgIFwiODI1NFwiOiBcIk92ZXJCYXI7XCIsXG4gICAgXCI4MjU3XCI6IFwiY2FyZXQ7XCIsXG4gICAgXCI4MjU5XCI6IFwiaHlidWxsO1wiLFxuICAgIFwiODI2MFwiOiBcImZyYXNsO1wiLFxuICAgIFwiODI3MVwiOiBcImJzZW1pO1wiLFxuICAgIFwiODI3OVwiOiBcInFwcmltZTtcIixcbiAgICBcIjgyODdcIjogXCJNZWRpdW1TcGFjZTtcIixcbiAgICBcIjgyODhcIjogXCJOb0JyZWFrO1wiLFxuICAgIFwiODI4OVwiOiBcIkFwcGx5RnVuY3Rpb247XCIsXG4gICAgXCI4MjkwXCI6IFwiaXQ7XCIsXG4gICAgXCI4MjkxXCI6IFwiSW52aXNpYmxlQ29tbWE7XCIsXG4gICAgXCI4MzY0XCI6IFwiZXVybztcIixcbiAgICBcIjg0MTFcIjogXCJUcmlwbGVEb3Q7XCIsXG4gICAgXCI4NDEyXCI6IFwiRG90RG90O1wiLFxuICAgIFwiODQ1MFwiOiBcIkNvcGY7XCIsXG4gICAgXCI4NDUzXCI6IFwiaW5jYXJlO1wiLFxuICAgIFwiODQ1OFwiOiBcImdzY3I7XCIsXG4gICAgXCI4NDU5XCI6IFwiSHNjcjtcIixcbiAgICBcIjg0NjBcIjogXCJQb2luY2FyZXBsYW5lO1wiLFxuICAgIFwiODQ2MVwiOiBcInF1YXRlcm5pb25zO1wiLFxuICAgIFwiODQ2MlwiOiBcInBsYW5ja2g7XCIsXG4gICAgXCI4NDYzXCI6IFwicGxhbmt2O1wiLFxuICAgIFwiODQ2NFwiOiBcIklzY3I7XCIsXG4gICAgXCI4NDY1XCI6IFwiaW1hZ3BhcnQ7XCIsXG4gICAgXCI4NDY2XCI6IFwiTHNjcjtcIixcbiAgICBcIjg0NjdcIjogXCJlbGw7XCIsXG4gICAgXCI4NDY5XCI6IFwiTm9wZjtcIixcbiAgICBcIjg0NzBcIjogXCJudW1lcm87XCIsXG4gICAgXCI4NDcxXCI6IFwiY29weXNyO1wiLFxuICAgIFwiODQ3MlwiOiBcIndwO1wiLFxuICAgIFwiODQ3M1wiOiBcInByaW1lcztcIixcbiAgICBcIjg0NzRcIjogXCJyYXRpb25hbHM7XCIsXG4gICAgXCI4NDc1XCI6IFwiUnNjcjtcIixcbiAgICBcIjg0NzZcIjogXCJSZnI7XCIsXG4gICAgXCI4NDc3XCI6IFwiUm9wZjtcIixcbiAgICBcIjg0NzhcIjogXCJyeDtcIixcbiAgICBcIjg0ODJcIjogXCJ0cmFkZTtcIixcbiAgICBcIjg0ODRcIjogXCJab3BmO1wiLFxuICAgIFwiODQ4N1wiOiBcIm1obztcIixcbiAgICBcIjg0ODhcIjogXCJaZnI7XCIsXG4gICAgXCI4NDg5XCI6IFwiaWlvdGE7XCIsXG4gICAgXCI4NDkyXCI6IFwiQnNjcjtcIixcbiAgICBcIjg0OTNcIjogXCJDZnI7XCIsXG4gICAgXCI4NDk1XCI6IFwiZXNjcjtcIixcbiAgICBcIjg0OTZcIjogXCJleHBlY3RhdGlvbjtcIixcbiAgICBcIjg0OTdcIjogXCJGc2NyO1wiLFxuICAgIFwiODQ5OVwiOiBcInBobW1hdDtcIixcbiAgICBcIjg1MDBcIjogXCJvc2NyO1wiLFxuICAgIFwiODUwMVwiOiBcImFsZXBoO1wiLFxuICAgIFwiODUwMlwiOiBcImJldGg7XCIsXG4gICAgXCI4NTAzXCI6IFwiZ2ltZWw7XCIsXG4gICAgXCI4NTA0XCI6IFwiZGFsZXRoO1wiLFxuICAgIFwiODUxN1wiOiBcIkREO1wiLFxuICAgIFwiODUxOFwiOiBcIkRpZmZlcmVudGlhbEQ7XCIsXG4gICAgXCI4NTE5XCI6IFwiZXhwb25lbnRpYWxlO1wiLFxuICAgIFwiODUyMFwiOiBcIkltYWdpbmFyeUk7XCIsXG4gICAgXCI4NTMxXCI6IFwiZnJhYzEzO1wiLFxuICAgIFwiODUzMlwiOiBcImZyYWMyMztcIixcbiAgICBcIjg1MzNcIjogXCJmcmFjMTU7XCIsXG4gICAgXCI4NTM0XCI6IFwiZnJhYzI1O1wiLFxuICAgIFwiODUzNVwiOiBcImZyYWMzNTtcIixcbiAgICBcIjg1MzZcIjogXCJmcmFjNDU7XCIsXG4gICAgXCI4NTM3XCI6IFwiZnJhYzE2O1wiLFxuICAgIFwiODUzOFwiOiBcImZyYWM1NjtcIixcbiAgICBcIjg1MzlcIjogXCJmcmFjMTg7XCIsXG4gICAgXCI4NTQwXCI6IFwiZnJhYzM4O1wiLFxuICAgIFwiODU0MVwiOiBcImZyYWM1ODtcIixcbiAgICBcIjg1NDJcIjogXCJmcmFjNzg7XCIsXG4gICAgXCI4NTkyXCI6IFwic2xhcnI7XCIsXG4gICAgXCI4NTkzXCI6IFwidXBhcnJvdztcIixcbiAgICBcIjg1OTRcIjogXCJzcmFycjtcIixcbiAgICBcIjg1OTVcIjogXCJTaG9ydERvd25BcnJvdztcIixcbiAgICBcIjg1OTZcIjogXCJsZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg1OTdcIjogXCJ2YXJyO1wiLFxuICAgIFwiODU5OFwiOiBcIlVwcGVyTGVmdEFycm93O1wiLFxuICAgIFwiODU5OVwiOiBcIlVwcGVyUmlnaHRBcnJvdztcIixcbiAgICBcIjg2MDBcIjogXCJzZWFycm93O1wiLFxuICAgIFwiODYwMVwiOiBcInN3YXJyb3c7XCIsXG4gICAgXCI4NjAyXCI6IFwibmxlZnRhcnJvdztcIixcbiAgICBcIjg2MDNcIjogXCJucmlnaHRhcnJvdztcIixcbiAgICBcIjg2MDVcIjogXCJyaWdodHNxdWlnYXJyb3c7XCIsXG4gICAgXCI4NjA2XCI6IFwidHdvaGVhZGxlZnRhcnJvdztcIixcbiAgICBcIjg2MDdcIjogXCJVYXJyO1wiLFxuICAgIFwiODYwOFwiOiBcInR3b2hlYWRyaWdodGFycm93O1wiLFxuICAgIFwiODYwOVwiOiBcIkRhcnI7XCIsXG4gICAgXCI4NjEwXCI6IFwibGVmdGFycm93dGFpbDtcIixcbiAgICBcIjg2MTFcIjogXCJyaWdodGFycm93dGFpbDtcIixcbiAgICBcIjg2MTJcIjogXCJtYXBzdG9sZWZ0O1wiLFxuICAgIFwiODYxM1wiOiBcIlVwVGVlQXJyb3c7XCIsXG4gICAgXCI4NjE0XCI6IFwiUmlnaHRUZWVBcnJvdztcIixcbiAgICBcIjg2MTVcIjogXCJtYXBzdG9kb3duO1wiLFxuICAgIFwiODYxN1wiOiBcImxhcnJoaztcIixcbiAgICBcIjg2MThcIjogXCJyYXJyaGs7XCIsXG4gICAgXCI4NjE5XCI6IFwibG9vcGFycm93bGVmdDtcIixcbiAgICBcIjg2MjBcIjogXCJyYXJybHA7XCIsXG4gICAgXCI4NjIxXCI6IFwibGVmdHJpZ2h0c3F1aWdhcnJvdztcIixcbiAgICBcIjg2MjJcIjogXCJubGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjI0XCI6IFwibHNoO1wiLFxuICAgIFwiODYyNVwiOiBcInJzaDtcIixcbiAgICBcIjg2MjZcIjogXCJsZHNoO1wiLFxuICAgIFwiODYyN1wiOiBcInJkc2g7XCIsXG4gICAgXCI4NjI5XCI6IFwiY3JhcnI7XCIsXG4gICAgXCI4NjMwXCI6IFwiY3VydmVhcnJvd2xlZnQ7XCIsXG4gICAgXCI4NjMxXCI6IFwiY3VydmVhcnJvd3JpZ2h0O1wiLFxuICAgIFwiODYzNFwiOiBcIm9sYXJyO1wiLFxuICAgIFwiODYzNVwiOiBcIm9yYXJyO1wiLFxuICAgIFwiODYzNlwiOiBcImxoYXJ1O1wiLFxuICAgIFwiODYzN1wiOiBcImxoYXJkO1wiLFxuICAgIFwiODYzOFwiOiBcInVwaGFycG9vbnJpZ2h0O1wiLFxuICAgIFwiODYzOVwiOiBcInVwaGFycG9vbmxlZnQ7XCIsXG4gICAgXCI4NjQwXCI6IFwiUmlnaHRWZWN0b3I7XCIsXG4gICAgXCI4NjQxXCI6IFwicmlnaHRoYXJwb29uZG93bjtcIixcbiAgICBcIjg2NDJcIjogXCJSaWdodERvd25WZWN0b3I7XCIsXG4gICAgXCI4NjQzXCI6IFwiTGVmdERvd25WZWN0b3I7XCIsXG4gICAgXCI4NjQ0XCI6IFwicmxhcnI7XCIsXG4gICAgXCI4NjQ1XCI6IFwiVXBBcnJvd0Rvd25BcnJvdztcIixcbiAgICBcIjg2NDZcIjogXCJscmFycjtcIixcbiAgICBcIjg2NDdcIjogXCJsbGFycjtcIixcbiAgICBcIjg2NDhcIjogXCJ1dWFycjtcIixcbiAgICBcIjg2NDlcIjogXCJycmFycjtcIixcbiAgICBcIjg2NTBcIjogXCJkb3duZG93bmFycm93cztcIixcbiAgICBcIjg2NTFcIjogXCJSZXZlcnNlRXF1aWxpYnJpdW07XCIsXG4gICAgXCI4NjUyXCI6IFwicmxoYXI7XCIsXG4gICAgXCI4NjUzXCI6IFwibkxlZnRhcnJvdztcIixcbiAgICBcIjg2NTRcIjogXCJuTGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjU1XCI6IFwiblJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjU2XCI6IFwiTGVmdGFycm93O1wiLFxuICAgIFwiODY1N1wiOiBcIlVwYXJyb3c7XCIsXG4gICAgXCI4NjU4XCI6IFwiUmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTlcIjogXCJEb3duYXJyb3c7XCIsXG4gICAgXCI4NjYwXCI6IFwiTGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjYxXCI6IFwidkFycjtcIixcbiAgICBcIjg2NjJcIjogXCJud0FycjtcIixcbiAgICBcIjg2NjNcIjogXCJuZUFycjtcIixcbiAgICBcIjg2NjRcIjogXCJzZUFycjtcIixcbiAgICBcIjg2NjVcIjogXCJzd0FycjtcIixcbiAgICBcIjg2NjZcIjogXCJMbGVmdGFycm93O1wiLFxuICAgIFwiODY2N1wiOiBcIlJyaWdodGFycm93O1wiLFxuICAgIFwiODY2OVwiOiBcInppZ3JhcnI7XCIsXG4gICAgXCI4Njc2XCI6IFwiTGVmdEFycm93QmFyO1wiLFxuICAgIFwiODY3N1wiOiBcIlJpZ2h0QXJyb3dCYXI7XCIsXG4gICAgXCI4NjkzXCI6IFwiZHVhcnI7XCIsXG4gICAgXCI4NzAxXCI6IFwibG9hcnI7XCIsXG4gICAgXCI4NzAyXCI6IFwicm9hcnI7XCIsXG4gICAgXCI4NzAzXCI6IFwiaG9hcnI7XCIsXG4gICAgXCI4NzA0XCI6IFwiZm9yYWxsO1wiLFxuICAgIFwiODcwNVwiOiBcImNvbXBsZW1lbnQ7XCIsXG4gICAgXCI4NzA2XCI6IFwiUGFydGlhbEQ7XCIsXG4gICAgXCI4NzA3XCI6IFwiRXhpc3RzO1wiLFxuICAgIFwiODcwOFwiOiBcIk5vdEV4aXN0cztcIixcbiAgICBcIjg3MDlcIjogXCJ2YXJub3RoaW5nO1wiLFxuICAgIFwiODcxMVwiOiBcIm5hYmxhO1wiLFxuICAgIFwiODcxMlwiOiBcImlzaW52O1wiLFxuICAgIFwiODcxM1wiOiBcIm5vdGludmE7XCIsXG4gICAgXCI4NzE1XCI6IFwiU3VjaFRoYXQ7XCIsXG4gICAgXCI4NzE2XCI6IFwiTm90UmV2ZXJzZUVsZW1lbnQ7XCIsXG4gICAgXCI4NzE5XCI6IFwiUHJvZHVjdDtcIixcbiAgICBcIjg3MjBcIjogXCJDb3Byb2R1Y3Q7XCIsXG4gICAgXCI4NzIxXCI6IFwic3VtO1wiLFxuICAgIFwiODcyMlwiOiBcIm1pbnVzO1wiLFxuICAgIFwiODcyM1wiOiBcIm1wO1wiLFxuICAgIFwiODcyNFwiOiBcInBsdXNkbztcIixcbiAgICBcIjg3MjZcIjogXCJzc2V0bW47XCIsXG4gICAgXCI4NzI3XCI6IFwibG93YXN0O1wiLFxuICAgIFwiODcyOFwiOiBcIlNtYWxsQ2lyY2xlO1wiLFxuICAgIFwiODczMFwiOiBcIlNxcnQ7XCIsXG4gICAgXCI4NzMzXCI6IFwidnByb3A7XCIsXG4gICAgXCI4NzM0XCI6IFwiaW5maW47XCIsXG4gICAgXCI4NzM1XCI6IFwiYW5ncnQ7XCIsXG4gICAgXCI4NzM2XCI6IFwiYW5nbGU7XCIsXG4gICAgXCI4NzM3XCI6IFwibWVhc3VyZWRhbmdsZTtcIixcbiAgICBcIjg3MzhcIjogXCJhbmdzcGg7XCIsXG4gICAgXCI4NzM5XCI6IFwiVmVydGljYWxCYXI7XCIsXG4gICAgXCI4NzQwXCI6IFwibnNtaWQ7XCIsXG4gICAgXCI4NzQxXCI6IFwic3BhcjtcIixcbiAgICBcIjg3NDJcIjogXCJuc3BhcjtcIixcbiAgICBcIjg3NDNcIjogXCJ3ZWRnZTtcIixcbiAgICBcIjg3NDRcIjogXCJ2ZWU7XCIsXG4gICAgXCI4NzQ1XCI6IFwiY2FwO1wiLFxuICAgIFwiODc0NlwiOiBcImN1cDtcIixcbiAgICBcIjg3NDdcIjogXCJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NDhcIjogXCJJbnQ7XCIsXG4gICAgXCI4NzQ5XCI6IFwidGludDtcIixcbiAgICBcIjg3NTBcIjogXCJvaW50O1wiLFxuICAgIFwiODc1MVwiOiBcIkRvdWJsZUNvbnRvdXJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NTJcIjogXCJDY29uaW50O1wiLFxuICAgIFwiODc1M1wiOiBcImN3aW50O1wiLFxuICAgIFwiODc1NFwiOiBcImN3Y29uaW50O1wiLFxuICAgIFwiODc1NVwiOiBcIkNvdW50ZXJDbG9ja3dpc2VDb250b3VySW50ZWdyYWw7XCIsXG4gICAgXCI4NzU2XCI6IFwidGhlcmVmb3JlO1wiLFxuICAgIFwiODc1N1wiOiBcImJlY2F1c2U7XCIsXG4gICAgXCI4NzU4XCI6IFwicmF0aW87XCIsXG4gICAgXCI4NzU5XCI6IFwiUHJvcG9ydGlvbjtcIixcbiAgICBcIjg3NjBcIjogXCJtaW51c2Q7XCIsXG4gICAgXCI4NzYyXCI6IFwibUREb3Q7XCIsXG4gICAgXCI4NzYzXCI6IFwiaG9tdGh0O1wiLFxuICAgIFwiODc2NFwiOiBcIlRpbGRlO1wiLFxuICAgIFwiODc2NVwiOiBcImJzaW07XCIsXG4gICAgXCI4NzY2XCI6IFwibXN0cG9zO1wiLFxuICAgIFwiODc2N1wiOiBcImFjZDtcIixcbiAgICBcIjg3NjhcIjogXCJ3cmVhdGg7XCIsXG4gICAgXCI4NzY5XCI6IFwibnNpbTtcIixcbiAgICBcIjg3NzBcIjogXCJlc2ltO1wiLFxuICAgIFwiODc3MVwiOiBcIlRpbGRlRXF1YWw7XCIsXG4gICAgXCI4NzcyXCI6IFwibnNpbWVxO1wiLFxuICAgIFwiODc3M1wiOiBcIlRpbGRlRnVsbEVxdWFsO1wiLFxuICAgIFwiODc3NFwiOiBcInNpbW5lO1wiLFxuICAgIFwiODc3NVwiOiBcIk5vdFRpbGRlRnVsbEVxdWFsO1wiLFxuICAgIFwiODc3NlwiOiBcIlRpbGRlVGlsZGU7XCIsXG4gICAgXCI4Nzc3XCI6IFwiTm90VGlsZGVUaWxkZTtcIixcbiAgICBcIjg3NzhcIjogXCJhcHByb3hlcTtcIixcbiAgICBcIjg3NzlcIjogXCJhcGlkO1wiLFxuICAgIFwiODc4MFwiOiBcImJjb25nO1wiLFxuICAgIFwiODc4MVwiOiBcIkN1cENhcDtcIixcbiAgICBcIjg3ODJcIjogXCJIdW1wRG93bkh1bXA7XCIsXG4gICAgXCI4NzgzXCI6IFwiSHVtcEVxdWFsO1wiLFxuICAgIFwiODc4NFwiOiBcImVzZG90O1wiLFxuICAgIFwiODc4NVwiOiBcImVEb3Q7XCIsXG4gICAgXCI4Nzg2XCI6IFwiZmFsbGluZ2RvdHNlcTtcIixcbiAgICBcIjg3ODdcIjogXCJyaXNpbmdkb3RzZXE7XCIsXG4gICAgXCI4Nzg4XCI6IFwiY29sb25lcTtcIixcbiAgICBcIjg3ODlcIjogXCJlcWNvbG9uO1wiLFxuICAgIFwiODc5MFwiOiBcImVxY2lyYztcIixcbiAgICBcIjg3OTFcIjogXCJjaXJlO1wiLFxuICAgIFwiODc5M1wiOiBcIndlZGdlcTtcIixcbiAgICBcIjg3OTRcIjogXCJ2ZWVlcTtcIixcbiAgICBcIjg3OTZcIjogXCJ0cmllO1wiLFxuICAgIFwiODc5OVwiOiBcInF1ZXN0ZXE7XCIsXG4gICAgXCI4ODAwXCI6IFwiTm90RXF1YWw7XCIsXG4gICAgXCI4ODAxXCI6IFwiZXF1aXY7XCIsXG4gICAgXCI4ODAyXCI6IFwiTm90Q29uZ3J1ZW50O1wiLFxuICAgIFwiODgwNFwiOiBcImxlcTtcIixcbiAgICBcIjg4MDVcIjogXCJHcmVhdGVyRXF1YWw7XCIsXG4gICAgXCI4ODA2XCI6IFwiTGVzc0Z1bGxFcXVhbDtcIixcbiAgICBcIjg4MDdcIjogXCJHcmVhdGVyRnVsbEVxdWFsO1wiLFxuICAgIFwiODgwOFwiOiBcImxuZXFxO1wiLFxuICAgIFwiODgwOVwiOiBcImduZXFxO1wiLFxuICAgIFwiODgxMFwiOiBcIk5lc3RlZExlc3NMZXNzO1wiLFxuICAgIFwiODgxMVwiOiBcIk5lc3RlZEdyZWF0ZXJHcmVhdGVyO1wiLFxuICAgIFwiODgxMlwiOiBcInR3aXh0O1wiLFxuICAgIFwiODgxM1wiOiBcIk5vdEN1cENhcDtcIixcbiAgICBcIjg4MTRcIjogXCJOb3RMZXNzO1wiLFxuICAgIFwiODgxNVwiOiBcIk5vdEdyZWF0ZXI7XCIsXG4gICAgXCI4ODE2XCI6IFwiTm90TGVzc0VxdWFsO1wiLFxuICAgIFwiODgxN1wiOiBcIk5vdEdyZWF0ZXJFcXVhbDtcIixcbiAgICBcIjg4MThcIjogXCJsc2ltO1wiLFxuICAgIFwiODgxOVwiOiBcImd0cnNpbTtcIixcbiAgICBcIjg4MjBcIjogXCJOb3RMZXNzVGlsZGU7XCIsXG4gICAgXCI4ODIxXCI6IFwiTm90R3JlYXRlclRpbGRlO1wiLFxuICAgIFwiODgyMlwiOiBcImxnO1wiLFxuICAgIFwiODgyM1wiOiBcImd0cmxlc3M7XCIsXG4gICAgXCI4ODI0XCI6IFwibnRsZztcIixcbiAgICBcIjg4MjVcIjogXCJudGdsO1wiLFxuICAgIFwiODgyNlwiOiBcIlByZWNlZGVzO1wiLFxuICAgIFwiODgyN1wiOiBcIlN1Y2NlZWRzO1wiLFxuICAgIFwiODgyOFwiOiBcIlByZWNlZGVzU2xhbnRFcXVhbDtcIixcbiAgICBcIjg4MjlcIjogXCJTdWNjZWVkc1NsYW50RXF1YWw7XCIsXG4gICAgXCI4ODMwXCI6IFwicHJzaW07XCIsXG4gICAgXCI4ODMxXCI6IFwic3VjY3NpbTtcIixcbiAgICBcIjg4MzJcIjogXCJucHJlYztcIixcbiAgICBcIjg4MzNcIjogXCJuc3VjYztcIixcbiAgICBcIjg4MzRcIjogXCJzdWJzZXQ7XCIsXG4gICAgXCI4ODM1XCI6IFwic3Vwc2V0O1wiLFxuICAgIFwiODgzNlwiOiBcIm5zdWI7XCIsXG4gICAgXCI4ODM3XCI6IFwibnN1cDtcIixcbiAgICBcIjg4MzhcIjogXCJTdWJzZXRFcXVhbDtcIixcbiAgICBcIjg4MzlcIjogXCJzdXBzZXRlcTtcIixcbiAgICBcIjg4NDBcIjogXCJuc3Vic2V0ZXE7XCIsXG4gICAgXCI4ODQxXCI6IFwibnN1cHNldGVxO1wiLFxuICAgIFwiODg0MlwiOiBcInN1YnNldG5lcTtcIixcbiAgICBcIjg4NDNcIjogXCJzdXBzZXRuZXE7XCIsXG4gICAgXCI4ODQ1XCI6IFwiY3VwZG90O1wiLFxuICAgIFwiODg0NlwiOiBcInVwbHVzO1wiLFxuICAgIFwiODg0N1wiOiBcIlNxdWFyZVN1YnNldDtcIixcbiAgICBcIjg4NDhcIjogXCJTcXVhcmVTdXBlcnNldDtcIixcbiAgICBcIjg4NDlcIjogXCJTcXVhcmVTdWJzZXRFcXVhbDtcIixcbiAgICBcIjg4NTBcIjogXCJTcXVhcmVTdXBlcnNldEVxdWFsO1wiLFxuICAgIFwiODg1MVwiOiBcIlNxdWFyZUludGVyc2VjdGlvbjtcIixcbiAgICBcIjg4NTJcIjogXCJTcXVhcmVVbmlvbjtcIixcbiAgICBcIjg4NTNcIjogXCJvcGx1cztcIixcbiAgICBcIjg4NTRcIjogXCJvbWludXM7XCIsXG4gICAgXCI4ODU1XCI6IFwib3RpbWVzO1wiLFxuICAgIFwiODg1NlwiOiBcIm9zb2w7XCIsXG4gICAgXCI4ODU3XCI6IFwib2RvdDtcIixcbiAgICBcIjg4NThcIjogXCJvY2lyO1wiLFxuICAgIFwiODg1OVwiOiBcIm9hc3Q7XCIsXG4gICAgXCI4ODYxXCI6IFwib2Rhc2g7XCIsXG4gICAgXCI4ODYyXCI6IFwicGx1c2I7XCIsXG4gICAgXCI4ODYzXCI6IFwibWludXNiO1wiLFxuICAgIFwiODg2NFwiOiBcInRpbWVzYjtcIixcbiAgICBcIjg4NjVcIjogXCJzZG90YjtcIixcbiAgICBcIjg4NjZcIjogXCJ2ZGFzaDtcIixcbiAgICBcIjg4NjdcIjogXCJMZWZ0VGVlO1wiLFxuICAgIFwiODg2OFwiOiBcInRvcDtcIixcbiAgICBcIjg4NjlcIjogXCJVcFRlZTtcIixcbiAgICBcIjg4NzFcIjogXCJtb2RlbHM7XCIsXG4gICAgXCI4ODcyXCI6IFwidkRhc2g7XCIsXG4gICAgXCI4ODczXCI6IFwiVmRhc2g7XCIsXG4gICAgXCI4ODc0XCI6IFwiVnZkYXNoO1wiLFxuICAgIFwiODg3NVwiOiBcIlZEYXNoO1wiLFxuICAgIFwiODg3NlwiOiBcIm52ZGFzaDtcIixcbiAgICBcIjg4NzdcIjogXCJudkRhc2g7XCIsXG4gICAgXCI4ODc4XCI6IFwiblZkYXNoO1wiLFxuICAgIFwiODg3OVwiOiBcIm5WRGFzaDtcIixcbiAgICBcIjg4ODBcIjogXCJwcnVyZWw7XCIsXG4gICAgXCI4ODgyXCI6IFwidmx0cmk7XCIsXG4gICAgXCI4ODgzXCI6IFwidnJ0cmk7XCIsXG4gICAgXCI4ODg0XCI6IFwidHJpYW5nbGVsZWZ0ZXE7XCIsXG4gICAgXCI4ODg1XCI6IFwidHJpYW5nbGVyaWdodGVxO1wiLFxuICAgIFwiODg4NlwiOiBcIm9yaWdvZjtcIixcbiAgICBcIjg4ODdcIjogXCJpbW9mO1wiLFxuICAgIFwiODg4OFwiOiBcIm11bWFwO1wiLFxuICAgIFwiODg4OVwiOiBcImhlcmNvbjtcIixcbiAgICBcIjg4OTBcIjogXCJpbnRlcmNhbDtcIixcbiAgICBcIjg4OTFcIjogXCJ2ZWViYXI7XCIsXG4gICAgXCI4ODkzXCI6IFwiYmFydmVlO1wiLFxuICAgIFwiODg5NFwiOiBcImFuZ3J0dmI7XCIsXG4gICAgXCI4ODk1XCI6IFwibHJ0cmk7XCIsXG4gICAgXCI4ODk2XCI6IFwieHdlZGdlO1wiLFxuICAgIFwiODg5N1wiOiBcInh2ZWU7XCIsXG4gICAgXCI4ODk4XCI6IFwieGNhcDtcIixcbiAgICBcIjg4OTlcIjogXCJ4Y3VwO1wiLFxuICAgIFwiODkwMFwiOiBcImRpYW1vbmQ7XCIsXG4gICAgXCI4OTAxXCI6IFwic2RvdDtcIixcbiAgICBcIjg5MDJcIjogXCJTdGFyO1wiLFxuICAgIFwiODkwM1wiOiBcImRpdm9ueDtcIixcbiAgICBcIjg5MDRcIjogXCJib3d0aWU7XCIsXG4gICAgXCI4OTA1XCI6IFwibHRpbWVzO1wiLFxuICAgIFwiODkwNlwiOiBcInJ0aW1lcztcIixcbiAgICBcIjg5MDdcIjogXCJsdGhyZWU7XCIsXG4gICAgXCI4OTA4XCI6IFwicnRocmVlO1wiLFxuICAgIFwiODkwOVwiOiBcImJzaW1lO1wiLFxuICAgIFwiODkxMFwiOiBcImN1dmVlO1wiLFxuICAgIFwiODkxMVwiOiBcImN1d2VkO1wiLFxuICAgIFwiODkxMlwiOiBcIlN1YnNldDtcIixcbiAgICBcIjg5MTNcIjogXCJTdXBzZXQ7XCIsXG4gICAgXCI4OTE0XCI6IFwiQ2FwO1wiLFxuICAgIFwiODkxNVwiOiBcIkN1cDtcIixcbiAgICBcIjg5MTZcIjogXCJwaXRjaGZvcms7XCIsXG4gICAgXCI4OTE3XCI6IFwiZXBhcjtcIixcbiAgICBcIjg5MThcIjogXCJsdGRvdDtcIixcbiAgICBcIjg5MTlcIjogXCJndHJkb3Q7XCIsXG4gICAgXCI4OTIwXCI6IFwiTGw7XCIsXG4gICAgXCI4OTIxXCI6IFwiZ2dnO1wiLFxuICAgIFwiODkyMlwiOiBcIkxlc3NFcXVhbEdyZWF0ZXI7XCIsXG4gICAgXCI4OTIzXCI6IFwiZ3RyZXFsZXNzO1wiLFxuICAgIFwiODkyNlwiOiBcImN1cmx5ZXFwcmVjO1wiLFxuICAgIFwiODkyN1wiOiBcImN1cmx5ZXFzdWNjO1wiLFxuICAgIFwiODkyOFwiOiBcIm5wcmN1ZTtcIixcbiAgICBcIjg5MjlcIjogXCJuc2NjdWU7XCIsXG4gICAgXCI4OTMwXCI6IFwibnNxc3ViZTtcIixcbiAgICBcIjg5MzFcIjogXCJuc3FzdXBlO1wiLFxuICAgIFwiODkzNFwiOiBcImxuc2ltO1wiLFxuICAgIFwiODkzNVwiOiBcImduc2ltO1wiLFxuICAgIFwiODkzNlwiOiBcInBybnNpbTtcIixcbiAgICBcIjg5MzdcIjogXCJzdWNjbnNpbTtcIixcbiAgICBcIjg5MzhcIjogXCJudHJpYW5nbGVsZWZ0O1wiLFxuICAgIFwiODkzOVwiOiBcIm50cmlhbmdsZXJpZ2h0O1wiLFxuICAgIFwiODk0MFwiOiBcIm50cmlhbmdsZWxlZnRlcTtcIixcbiAgICBcIjg5NDFcIjogXCJudHJpYW5nbGVyaWdodGVxO1wiLFxuICAgIFwiODk0MlwiOiBcInZlbGxpcDtcIixcbiAgICBcIjg5NDNcIjogXCJjdGRvdDtcIixcbiAgICBcIjg5NDRcIjogXCJ1dGRvdDtcIixcbiAgICBcIjg5NDVcIjogXCJkdGRvdDtcIixcbiAgICBcIjg5NDZcIjogXCJkaXNpbjtcIixcbiAgICBcIjg5NDdcIjogXCJpc2luc3Y7XCIsXG4gICAgXCI4OTQ4XCI6IFwiaXNpbnM7XCIsXG4gICAgXCI4OTQ5XCI6IFwiaXNpbmRvdDtcIixcbiAgICBcIjg5NTBcIjogXCJub3RpbnZjO1wiLFxuICAgIFwiODk1MVwiOiBcIm5vdGludmI7XCIsXG4gICAgXCI4OTUzXCI6IFwiaXNpbkU7XCIsXG4gICAgXCI4OTU0XCI6IFwibmlzZDtcIixcbiAgICBcIjg5NTVcIjogXCJ4bmlzO1wiLFxuICAgIFwiODk1NlwiOiBcIm5pcztcIixcbiAgICBcIjg5NTdcIjogXCJub3RuaXZjO1wiLFxuICAgIFwiODk1OFwiOiBcIm5vdG5pdmI7XCIsXG4gICAgXCI4OTY1XCI6IFwiYmFyd2VkZ2U7XCIsXG4gICAgXCI4OTY2XCI6IFwiZG91YmxlYmFyd2VkZ2U7XCIsXG4gICAgXCI4OTY4XCI6IFwiTGVmdENlaWxpbmc7XCIsXG4gICAgXCI4OTY5XCI6IFwiUmlnaHRDZWlsaW5nO1wiLFxuICAgIFwiODk3MFwiOiBcImxmbG9vcjtcIixcbiAgICBcIjg5NzFcIjogXCJSaWdodEZsb29yO1wiLFxuICAgIFwiODk3MlwiOiBcImRyY3JvcDtcIixcbiAgICBcIjg5NzNcIjogXCJkbGNyb3A7XCIsXG4gICAgXCI4OTc0XCI6IFwidXJjcm9wO1wiLFxuICAgIFwiODk3NVwiOiBcInVsY3JvcDtcIixcbiAgICBcIjg5NzZcIjogXCJibm90O1wiLFxuICAgIFwiODk3OFwiOiBcInByb2ZsaW5lO1wiLFxuICAgIFwiODk3OVwiOiBcInByb2ZzdXJmO1wiLFxuICAgIFwiODk4MVwiOiBcInRlbHJlYztcIixcbiAgICBcIjg5ODJcIjogXCJ0YXJnZXQ7XCIsXG4gICAgXCI4OTg4XCI6IFwidWxjb3JuZXI7XCIsXG4gICAgXCI4OTg5XCI6IFwidXJjb3JuZXI7XCIsXG4gICAgXCI4OTkwXCI6IFwibGxjb3JuZXI7XCIsXG4gICAgXCI4OTkxXCI6IFwibHJjb3JuZXI7XCIsXG4gICAgXCI4OTk0XCI6IFwic2Zyb3duO1wiLFxuICAgIFwiODk5NVwiOiBcInNzbWlsZTtcIixcbiAgICBcIjkwMDVcIjogXCJjeWxjdHk7XCIsXG4gICAgXCI5MDA2XCI6IFwicHJvZmFsYXI7XCIsXG4gICAgXCI5MDE0XCI6IFwidG9wYm90O1wiLFxuICAgIFwiOTAyMVwiOiBcIm92YmFyO1wiLFxuICAgIFwiOTAyM1wiOiBcInNvbGJhcjtcIixcbiAgICBcIjkwODRcIjogXCJhbmd6YXJyO1wiLFxuICAgIFwiOTEzNlwiOiBcImxtb3VzdGFjaGU7XCIsXG4gICAgXCI5MTM3XCI6IFwicm1vdXN0YWNoZTtcIixcbiAgICBcIjkxNDBcIjogXCJ0YnJrO1wiLFxuICAgIFwiOTE0MVwiOiBcIlVuZGVyQnJhY2tldDtcIixcbiAgICBcIjkxNDJcIjogXCJiYnJrdGJyaztcIixcbiAgICBcIjkxODBcIjogXCJPdmVyUGFyZW50aGVzaXM7XCIsXG4gICAgXCI5MTgxXCI6IFwiVW5kZXJQYXJlbnRoZXNpcztcIixcbiAgICBcIjkxODJcIjogXCJPdmVyQnJhY2U7XCIsXG4gICAgXCI5MTgzXCI6IFwiVW5kZXJCcmFjZTtcIixcbiAgICBcIjkxODZcIjogXCJ0cnBleml1bTtcIixcbiAgICBcIjkxOTFcIjogXCJlbGludGVycztcIixcbiAgICBcIjkyNTFcIjogXCJibGFuaztcIixcbiAgICBcIjk0MTZcIjogXCJvUztcIixcbiAgICBcIjk0NzJcIjogXCJIb3Jpem9udGFsTGluZTtcIixcbiAgICBcIjk0NzRcIjogXCJib3h2O1wiLFxuICAgIFwiOTQ4NFwiOiBcImJveGRyO1wiLFxuICAgIFwiOTQ4OFwiOiBcImJveGRsO1wiLFxuICAgIFwiOTQ5MlwiOiBcImJveHVyO1wiLFxuICAgIFwiOTQ5NlwiOiBcImJveHVsO1wiLFxuICAgIFwiOTUwMFwiOiBcImJveHZyO1wiLFxuICAgIFwiOTUwOFwiOiBcImJveHZsO1wiLFxuICAgIFwiOTUxNlwiOiBcImJveGhkO1wiLFxuICAgIFwiOTUyNFwiOiBcImJveGh1O1wiLFxuICAgIFwiOTUzMlwiOiBcImJveHZoO1wiLFxuICAgIFwiOTU1MlwiOiBcImJveEg7XCIsXG4gICAgXCI5NTUzXCI6IFwiYm94VjtcIixcbiAgICBcIjk1NTRcIjogXCJib3hkUjtcIixcbiAgICBcIjk1NTVcIjogXCJib3hEcjtcIixcbiAgICBcIjk1NTZcIjogXCJib3hEUjtcIixcbiAgICBcIjk1NTdcIjogXCJib3hkTDtcIixcbiAgICBcIjk1NThcIjogXCJib3hEbDtcIixcbiAgICBcIjk1NTlcIjogXCJib3hETDtcIixcbiAgICBcIjk1NjBcIjogXCJib3h1UjtcIixcbiAgICBcIjk1NjFcIjogXCJib3hVcjtcIixcbiAgICBcIjk1NjJcIjogXCJib3hVUjtcIixcbiAgICBcIjk1NjNcIjogXCJib3h1TDtcIixcbiAgICBcIjk1NjRcIjogXCJib3hVbDtcIixcbiAgICBcIjk1NjVcIjogXCJib3hVTDtcIixcbiAgICBcIjk1NjZcIjogXCJib3h2UjtcIixcbiAgICBcIjk1NjdcIjogXCJib3hWcjtcIixcbiAgICBcIjk1NjhcIjogXCJib3hWUjtcIixcbiAgICBcIjk1NjlcIjogXCJib3h2TDtcIixcbiAgICBcIjk1NzBcIjogXCJib3hWbDtcIixcbiAgICBcIjk1NzFcIjogXCJib3hWTDtcIixcbiAgICBcIjk1NzJcIjogXCJib3hIZDtcIixcbiAgICBcIjk1NzNcIjogXCJib3hoRDtcIixcbiAgICBcIjk1NzRcIjogXCJib3hIRDtcIixcbiAgICBcIjk1NzVcIjogXCJib3hIdTtcIixcbiAgICBcIjk1NzZcIjogXCJib3hoVTtcIixcbiAgICBcIjk1NzdcIjogXCJib3hIVTtcIixcbiAgICBcIjk1NzhcIjogXCJib3h2SDtcIixcbiAgICBcIjk1NzlcIjogXCJib3hWaDtcIixcbiAgICBcIjk1ODBcIjogXCJib3hWSDtcIixcbiAgICBcIjk2MDBcIjogXCJ1aGJsaztcIixcbiAgICBcIjk2MDRcIjogXCJsaGJsaztcIixcbiAgICBcIjk2MDhcIjogXCJibG9jaztcIixcbiAgICBcIjk2MTdcIjogXCJibGsxNDtcIixcbiAgICBcIjk2MThcIjogXCJibGsxMjtcIixcbiAgICBcIjk2MTlcIjogXCJibGszNDtcIixcbiAgICBcIjk2MzNcIjogXCJzcXVhcmU7XCIsXG4gICAgXCI5NjQyXCI6IFwic3F1ZjtcIixcbiAgICBcIjk2NDNcIjogXCJFbXB0eVZlcnlTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk2NDVcIjogXCJyZWN0O1wiLFxuICAgIFwiOTY0NlwiOiBcIm1hcmtlcjtcIixcbiAgICBcIjk2NDlcIjogXCJmbHRucztcIixcbiAgICBcIjk2NTFcIjogXCJ4dXRyaTtcIixcbiAgICBcIjk2NTJcIjogXCJ1dHJpZjtcIixcbiAgICBcIjk2NTNcIjogXCJ1dHJpO1wiLFxuICAgIFwiOTY1NlwiOiBcInJ0cmlmO1wiLFxuICAgIFwiOTY1N1wiOiBcInRyaWFuZ2xlcmlnaHQ7XCIsXG4gICAgXCI5NjYxXCI6IFwieGR0cmk7XCIsXG4gICAgXCI5NjYyXCI6IFwiZHRyaWY7XCIsXG4gICAgXCI5NjYzXCI6IFwidHJpYW5nbGVkb3duO1wiLFxuICAgIFwiOTY2NlwiOiBcImx0cmlmO1wiLFxuICAgIFwiOTY2N1wiOiBcInRyaWFuZ2xlbGVmdDtcIixcbiAgICBcIjk2NzRcIjogXCJsb3plbmdlO1wiLFxuICAgIFwiOTY3NVwiOiBcImNpcjtcIixcbiAgICBcIjk3MDhcIjogXCJ0cmlkb3Q7XCIsXG4gICAgXCI5NzExXCI6IFwieGNpcmM7XCIsXG4gICAgXCI5NzIwXCI6IFwidWx0cmk7XCIsXG4gICAgXCI5NzIxXCI6IFwidXJ0cmk7XCIsXG4gICAgXCI5NzIyXCI6IFwibGx0cmk7XCIsXG4gICAgXCI5NzIzXCI6IFwiRW1wdHlTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk3MjRcIjogXCJGaWxsZWRTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk3MzNcIjogXCJzdGFyZjtcIixcbiAgICBcIjk3MzRcIjogXCJzdGFyO1wiLFxuICAgIFwiOTc0MlwiOiBcInBob25lO1wiLFxuICAgIFwiOTc5MlwiOiBcImZlbWFsZTtcIixcbiAgICBcIjk3OTRcIjogXCJtYWxlO1wiLFxuICAgIFwiOTgyNFwiOiBcInNwYWRlc3VpdDtcIixcbiAgICBcIjk4MjdcIjogXCJjbHVic3VpdDtcIixcbiAgICBcIjk4MjlcIjogXCJoZWFydHN1aXQ7XCIsXG4gICAgXCI5ODMwXCI6IFwiZGlhbXM7XCIsXG4gICAgXCI5ODM0XCI6IFwic3VuZztcIixcbiAgICBcIjk4MzdcIjogXCJmbGF0O1wiLFxuICAgIFwiOTgzOFwiOiBcIm5hdHVyYWw7XCIsXG4gICAgXCI5ODM5XCI6IFwic2hhcnA7XCIsXG4gICAgXCIxMDAwM1wiOiBcImNoZWNrbWFyaztcIixcbiAgICBcIjEwMDA3XCI6IFwiY3Jvc3M7XCIsXG4gICAgXCIxMDAxNlwiOiBcIm1hbHRlc2U7XCIsXG4gICAgXCIxMDAzOFwiOiBcInNleHQ7XCIsXG4gICAgXCIxMDA3MlwiOiBcIlZlcnRpY2FsU2VwYXJhdG9yO1wiLFxuICAgIFwiMTAwOThcIjogXCJsYmJyaztcIixcbiAgICBcIjEwMDk5XCI6IFwicmJicms7XCIsXG4gICAgXCIxMDE4NFwiOiBcImJzb2xoc3ViO1wiLFxuICAgIFwiMTAxODVcIjogXCJzdXBoc29sO1wiLFxuICAgIFwiMTAyMTRcIjogXCJsb2JyaztcIixcbiAgICBcIjEwMjE1XCI6IFwicm9icms7XCIsXG4gICAgXCIxMDIxNlwiOiBcIkxlZnRBbmdsZUJyYWNrZXQ7XCIsXG4gICAgXCIxMDIxN1wiOiBcIlJpZ2h0QW5nbGVCcmFja2V0O1wiLFxuICAgIFwiMTAyMThcIjogXCJMYW5nO1wiLFxuICAgIFwiMTAyMTlcIjogXCJSYW5nO1wiLFxuICAgIFwiMTAyMjBcIjogXCJsb2FuZztcIixcbiAgICBcIjEwMjIxXCI6IFwicm9hbmc7XCIsXG4gICAgXCIxMDIyOVwiOiBcInhsYXJyO1wiLFxuICAgIFwiMTAyMzBcIjogXCJ4cmFycjtcIixcbiAgICBcIjEwMjMxXCI6IFwieGhhcnI7XCIsXG4gICAgXCIxMDIzMlwiOiBcInhsQXJyO1wiLFxuICAgIFwiMTAyMzNcIjogXCJ4ckFycjtcIixcbiAgICBcIjEwMjM0XCI6IFwieGhBcnI7XCIsXG4gICAgXCIxMDIzNlwiOiBcInhtYXA7XCIsXG4gICAgXCIxMDIzOVwiOiBcImR6aWdyYXJyO1wiLFxuICAgIFwiMTA0OThcIjogXCJudmxBcnI7XCIsXG4gICAgXCIxMDQ5OVwiOiBcIm52ckFycjtcIixcbiAgICBcIjEwNTAwXCI6IFwibnZIYXJyO1wiLFxuICAgIFwiMTA1MDFcIjogXCJNYXA7XCIsXG4gICAgXCIxMDUwOFwiOiBcImxiYXJyO1wiLFxuICAgIFwiMTA1MDlcIjogXCJyYmFycjtcIixcbiAgICBcIjEwNTEwXCI6IFwibEJhcnI7XCIsXG4gICAgXCIxMDUxMVwiOiBcInJCYXJyO1wiLFxuICAgIFwiMTA1MTJcIjogXCJSQmFycjtcIixcbiAgICBcIjEwNTEzXCI6IFwiRERvdHJhaGQ7XCIsXG4gICAgXCIxMDUxNFwiOiBcIlVwQXJyb3dCYXI7XCIsXG4gICAgXCIxMDUxNVwiOiBcIkRvd25BcnJvd0JhcjtcIixcbiAgICBcIjEwNTE4XCI6IFwiUmFycnRsO1wiLFxuICAgIFwiMTA1MjFcIjogXCJsYXRhaWw7XCIsXG4gICAgXCIxMDUyMlwiOiBcInJhdGFpbDtcIixcbiAgICBcIjEwNTIzXCI6IFwibEF0YWlsO1wiLFxuICAgIFwiMTA1MjRcIjogXCJyQXRhaWw7XCIsXG4gICAgXCIxMDUyNVwiOiBcImxhcnJmcztcIixcbiAgICBcIjEwNTI2XCI6IFwicmFycmZzO1wiLFxuICAgIFwiMTA1MjdcIjogXCJsYXJyYmZzO1wiLFxuICAgIFwiMTA1MjhcIjogXCJyYXJyYmZzO1wiLFxuICAgIFwiMTA1MzFcIjogXCJud2FyaGs7XCIsXG4gICAgXCIxMDUzMlwiOiBcIm5lYXJoaztcIixcbiAgICBcIjEwNTMzXCI6IFwic2VhcmhrO1wiLFxuICAgIFwiMTA1MzRcIjogXCJzd2FyaGs7XCIsXG4gICAgXCIxMDUzNVwiOiBcIm53bmVhcjtcIixcbiAgICBcIjEwNTM2XCI6IFwidG9lYTtcIixcbiAgICBcIjEwNTM3XCI6IFwidG9zYTtcIixcbiAgICBcIjEwNTM4XCI6IFwic3dud2FyO1wiLFxuICAgIFwiMTA1NDdcIjogXCJyYXJyYztcIixcbiAgICBcIjEwNTQ5XCI6IFwiY3VkYXJycjtcIixcbiAgICBcIjEwNTUwXCI6IFwibGRjYTtcIixcbiAgICBcIjEwNTUxXCI6IFwicmRjYTtcIixcbiAgICBcIjEwNTUyXCI6IFwiY3VkYXJybDtcIixcbiAgICBcIjEwNTUzXCI6IFwibGFycnBsO1wiLFxuICAgIFwiMTA1NTZcIjogXCJjdXJhcnJtO1wiLFxuICAgIFwiMTA1NTdcIjogXCJjdWxhcnJwO1wiLFxuICAgIFwiMTA1NjVcIjogXCJyYXJycGw7XCIsXG4gICAgXCIxMDU2OFwiOiBcImhhcnJjaXI7XCIsXG4gICAgXCIxMDU2OVwiOiBcIlVhcnJvY2lyO1wiLFxuICAgIFwiMTA1NzBcIjogXCJsdXJkc2hhcjtcIixcbiAgICBcIjEwNTcxXCI6IFwibGRydXNoYXI7XCIsXG4gICAgXCIxMDU3NFwiOiBcIkxlZnRSaWdodFZlY3RvcjtcIixcbiAgICBcIjEwNTc1XCI6IFwiUmlnaHRVcERvd25WZWN0b3I7XCIsXG4gICAgXCIxMDU3NlwiOiBcIkRvd25MZWZ0UmlnaHRWZWN0b3I7XCIsXG4gICAgXCIxMDU3N1wiOiBcIkxlZnRVcERvd25WZWN0b3I7XCIsXG4gICAgXCIxMDU3OFwiOiBcIkxlZnRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU3OVwiOiBcIlJpZ2h0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODBcIjogXCJSaWdodFVwVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODFcIjogXCJSaWdodERvd25WZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MlwiOiBcIkRvd25MZWZ0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODNcIjogXCJEb3duUmlnaHRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4NFwiOiBcIkxlZnRVcFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg1XCI6IFwiTGVmdERvd25WZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4NlwiOiBcIkxlZnRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4N1wiOiBcIlJpZ2h0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1ODhcIjogXCJSaWdodFVwVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1ODlcIjogXCJSaWdodERvd25UZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MFwiOiBcIkRvd25MZWZ0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTFcIjogXCJEb3duUmlnaHRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MlwiOiBcIkxlZnRVcFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkzXCI6IFwiTGVmdERvd25UZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5NFwiOiBcImxIYXI7XCIsXG4gICAgXCIxMDU5NVwiOiBcInVIYXI7XCIsXG4gICAgXCIxMDU5NlwiOiBcInJIYXI7XCIsXG4gICAgXCIxMDU5N1wiOiBcImRIYXI7XCIsXG4gICAgXCIxMDU5OFwiOiBcImx1cnVoYXI7XCIsXG4gICAgXCIxMDU5OVwiOiBcImxkcmRoYXI7XCIsXG4gICAgXCIxMDYwMFwiOiBcInJ1bHVoYXI7XCIsXG4gICAgXCIxMDYwMVwiOiBcInJkbGRoYXI7XCIsXG4gICAgXCIxMDYwMlwiOiBcImxoYXJ1bDtcIixcbiAgICBcIjEwNjAzXCI6IFwibGxoYXJkO1wiLFxuICAgIFwiMTA2MDRcIjogXCJyaGFydWw7XCIsXG4gICAgXCIxMDYwNVwiOiBcImxyaGFyZDtcIixcbiAgICBcIjEwNjA2XCI6IFwiVXBFcXVpbGlicml1bTtcIixcbiAgICBcIjEwNjA3XCI6IFwiUmV2ZXJzZVVwRXF1aWxpYnJpdW07XCIsXG4gICAgXCIxMDYwOFwiOiBcIlJvdW5kSW1wbGllcztcIixcbiAgICBcIjEwNjA5XCI6IFwiZXJhcnI7XCIsXG4gICAgXCIxMDYxMFwiOiBcInNpbXJhcnI7XCIsXG4gICAgXCIxMDYxMVwiOiBcImxhcnJzaW07XCIsXG4gICAgXCIxMDYxMlwiOiBcInJhcnJzaW07XCIsXG4gICAgXCIxMDYxM1wiOiBcInJhcnJhcDtcIixcbiAgICBcIjEwNjE0XCI6IFwibHRsYXJyO1wiLFxuICAgIFwiMTA2MTZcIjogXCJndHJhcnI7XCIsXG4gICAgXCIxMDYxN1wiOiBcInN1YnJhcnI7XCIsXG4gICAgXCIxMDYxOVwiOiBcInN1cGxhcnI7XCIsXG4gICAgXCIxMDYyMFwiOiBcImxmaXNodDtcIixcbiAgICBcIjEwNjIxXCI6IFwicmZpc2h0O1wiLFxuICAgIFwiMTA2MjJcIjogXCJ1ZmlzaHQ7XCIsXG4gICAgXCIxMDYyM1wiOiBcImRmaXNodDtcIixcbiAgICBcIjEwNjI5XCI6IFwibG9wYXI7XCIsXG4gICAgXCIxMDYzMFwiOiBcInJvcGFyO1wiLFxuICAgIFwiMTA2MzVcIjogXCJsYnJrZTtcIixcbiAgICBcIjEwNjM2XCI6IFwicmJya2U7XCIsXG4gICAgXCIxMDYzN1wiOiBcImxicmtzbHU7XCIsXG4gICAgXCIxMDYzOFwiOiBcInJicmtzbGQ7XCIsXG4gICAgXCIxMDYzOVwiOiBcImxicmtzbGQ7XCIsXG4gICAgXCIxMDY0MFwiOiBcInJicmtzbHU7XCIsXG4gICAgXCIxMDY0MVwiOiBcImxhbmdkO1wiLFxuICAgIFwiMTA2NDJcIjogXCJyYW5nZDtcIixcbiAgICBcIjEwNjQzXCI6IFwibHBhcmx0O1wiLFxuICAgIFwiMTA2NDRcIjogXCJycGFyZ3Q7XCIsXG4gICAgXCIxMDY0NVwiOiBcImd0bFBhcjtcIixcbiAgICBcIjEwNjQ2XCI6IFwibHRyUGFyO1wiLFxuICAgIFwiMTA2NTBcIjogXCJ2emlnemFnO1wiLFxuICAgIFwiMTA2NTJcIjogXCJ2YW5ncnQ7XCIsXG4gICAgXCIxMDY1M1wiOiBcImFuZ3J0dmJkO1wiLFxuICAgIFwiMTA2NjBcIjogXCJhbmdlO1wiLFxuICAgIFwiMTA2NjFcIjogXCJyYW5nZTtcIixcbiAgICBcIjEwNjYyXCI6IFwiZHdhbmdsZTtcIixcbiAgICBcIjEwNjYzXCI6IFwidXdhbmdsZTtcIixcbiAgICBcIjEwNjY0XCI6IFwiYW5nbXNkYWE7XCIsXG4gICAgXCIxMDY2NVwiOiBcImFuZ21zZGFiO1wiLFxuICAgIFwiMTA2NjZcIjogXCJhbmdtc2RhYztcIixcbiAgICBcIjEwNjY3XCI6IFwiYW5nbXNkYWQ7XCIsXG4gICAgXCIxMDY2OFwiOiBcImFuZ21zZGFlO1wiLFxuICAgIFwiMTA2NjlcIjogXCJhbmdtc2RhZjtcIixcbiAgICBcIjEwNjcwXCI6IFwiYW5nbXNkYWc7XCIsXG4gICAgXCIxMDY3MVwiOiBcImFuZ21zZGFoO1wiLFxuICAgIFwiMTA2NzJcIjogXCJiZW1wdHl2O1wiLFxuICAgIFwiMTA2NzNcIjogXCJkZW1wdHl2O1wiLFxuICAgIFwiMTA2NzRcIjogXCJjZW1wdHl2O1wiLFxuICAgIFwiMTA2NzVcIjogXCJyYWVtcHR5djtcIixcbiAgICBcIjEwNjc2XCI6IFwibGFlbXB0eXY7XCIsXG4gICAgXCIxMDY3N1wiOiBcIm9oYmFyO1wiLFxuICAgIFwiMTA2NzhcIjogXCJvbWlkO1wiLFxuICAgIFwiMTA2NzlcIjogXCJvcGFyO1wiLFxuICAgIFwiMTA2ODFcIjogXCJvcGVycDtcIixcbiAgICBcIjEwNjgzXCI6IFwib2xjcm9zcztcIixcbiAgICBcIjEwNjg0XCI6IFwib2Rzb2xkO1wiLFxuICAgIFwiMTA2ODZcIjogXCJvbGNpcjtcIixcbiAgICBcIjEwNjg3XCI6IFwib2ZjaXI7XCIsXG4gICAgXCIxMDY4OFwiOiBcIm9sdDtcIixcbiAgICBcIjEwNjg5XCI6IFwib2d0O1wiLFxuICAgIFwiMTA2OTBcIjogXCJjaXJzY2lyO1wiLFxuICAgIFwiMTA2OTFcIjogXCJjaXJFO1wiLFxuICAgIFwiMTA2OTJcIjogXCJzb2xiO1wiLFxuICAgIFwiMTA2OTNcIjogXCJic29sYjtcIixcbiAgICBcIjEwNjk3XCI6IFwiYm94Ym94O1wiLFxuICAgIFwiMTA3MDFcIjogXCJ0cmlzYjtcIixcbiAgICBcIjEwNzAyXCI6IFwicnRyaWx0cmk7XCIsXG4gICAgXCIxMDcwM1wiOiBcIkxlZnRUcmlhbmdsZUJhcjtcIixcbiAgICBcIjEwNzA0XCI6IFwiUmlnaHRUcmlhbmdsZUJhcjtcIixcbiAgICBcIjEwNzE2XCI6IFwiaWluZmluO1wiLFxuICAgIFwiMTA3MTdcIjogXCJpbmZpbnRpZTtcIixcbiAgICBcIjEwNzE4XCI6IFwibnZpbmZpbjtcIixcbiAgICBcIjEwNzIzXCI6IFwiZXBhcnNsO1wiLFxuICAgIFwiMTA3MjRcIjogXCJzbWVwYXJzbDtcIixcbiAgICBcIjEwNzI1XCI6IFwiZXF2cGFyc2w7XCIsXG4gICAgXCIxMDczMVwiOiBcImxvemY7XCIsXG4gICAgXCIxMDc0MFwiOiBcIlJ1bGVEZWxheWVkO1wiLFxuICAgIFwiMTA3NDJcIjogXCJkc29sO1wiLFxuICAgIFwiMTA3NTJcIjogXCJ4b2RvdDtcIixcbiAgICBcIjEwNzUzXCI6IFwieG9wbHVzO1wiLFxuICAgIFwiMTA3NTRcIjogXCJ4b3RpbWU7XCIsXG4gICAgXCIxMDc1NlwiOiBcInh1cGx1cztcIixcbiAgICBcIjEwNzU4XCI6IFwieHNxY3VwO1wiLFxuICAgIFwiMTA3NjRcIjogXCJxaW50O1wiLFxuICAgIFwiMTA3NjVcIjogXCJmcGFydGludDtcIixcbiAgICBcIjEwNzY4XCI6IFwiY2lyZm5pbnQ7XCIsXG4gICAgXCIxMDc2OVwiOiBcImF3aW50O1wiLFxuICAgIFwiMTA3NzBcIjogXCJycHBvbGludDtcIixcbiAgICBcIjEwNzcxXCI6IFwic2Nwb2xpbnQ7XCIsXG4gICAgXCIxMDc3MlwiOiBcIm5wb2xpbnQ7XCIsXG4gICAgXCIxMDc3M1wiOiBcInBvaW50aW50O1wiLFxuICAgIFwiMTA3NzRcIjogXCJxdWF0aW50O1wiLFxuICAgIFwiMTA3NzVcIjogXCJpbnRsYXJoaztcIixcbiAgICBcIjEwNzg2XCI6IFwicGx1c2NpcjtcIixcbiAgICBcIjEwNzg3XCI6IFwicGx1c2FjaXI7XCIsXG4gICAgXCIxMDc4OFwiOiBcInNpbXBsdXM7XCIsXG4gICAgXCIxMDc4OVwiOiBcInBsdXNkdTtcIixcbiAgICBcIjEwNzkwXCI6IFwicGx1c3NpbTtcIixcbiAgICBcIjEwNzkxXCI6IFwicGx1c3R3bztcIixcbiAgICBcIjEwNzkzXCI6IFwibWNvbW1hO1wiLFxuICAgIFwiMTA3OTRcIjogXCJtaW51c2R1O1wiLFxuICAgIFwiMTA3OTdcIjogXCJsb3BsdXM7XCIsXG4gICAgXCIxMDc5OFwiOiBcInJvcGx1cztcIixcbiAgICBcIjEwNzk5XCI6IFwiQ3Jvc3M7XCIsXG4gICAgXCIxMDgwMFwiOiBcInRpbWVzZDtcIixcbiAgICBcIjEwODAxXCI6IFwidGltZXNiYXI7XCIsXG4gICAgXCIxMDgwM1wiOiBcInNtYXNocDtcIixcbiAgICBcIjEwODA0XCI6IFwibG90aW1lcztcIixcbiAgICBcIjEwODA1XCI6IFwicm90aW1lcztcIixcbiAgICBcIjEwODA2XCI6IFwib3RpbWVzYXM7XCIsXG4gICAgXCIxMDgwN1wiOiBcIk90aW1lcztcIixcbiAgICBcIjEwODA4XCI6IFwib2RpdjtcIixcbiAgICBcIjEwODA5XCI6IFwidHJpcGx1cztcIixcbiAgICBcIjEwODEwXCI6IFwidHJpbWludXM7XCIsXG4gICAgXCIxMDgxMVwiOiBcInRyaXRpbWU7XCIsXG4gICAgXCIxMDgxMlwiOiBcImlwcm9kO1wiLFxuICAgIFwiMTA4MTVcIjogXCJhbWFsZztcIixcbiAgICBcIjEwODE2XCI6IFwiY2FwZG90O1wiLFxuICAgIFwiMTA4MThcIjogXCJuY3VwO1wiLFxuICAgIFwiMTA4MTlcIjogXCJuY2FwO1wiLFxuICAgIFwiMTA4MjBcIjogXCJjYXBhbmQ7XCIsXG4gICAgXCIxMDgyMVwiOiBcImN1cG9yO1wiLFxuICAgIFwiMTA4MjJcIjogXCJjdXBjYXA7XCIsXG4gICAgXCIxMDgyM1wiOiBcImNhcGN1cDtcIixcbiAgICBcIjEwODI0XCI6IFwiY3VwYnJjYXA7XCIsXG4gICAgXCIxMDgyNVwiOiBcImNhcGJyY3VwO1wiLFxuICAgIFwiMTA4MjZcIjogXCJjdXBjdXA7XCIsXG4gICAgXCIxMDgyN1wiOiBcImNhcGNhcDtcIixcbiAgICBcIjEwODI4XCI6IFwiY2N1cHM7XCIsXG4gICAgXCIxMDgyOVwiOiBcImNjYXBzO1wiLFxuICAgIFwiMTA4MzJcIjogXCJjY3Vwc3NtO1wiLFxuICAgIFwiMTA4MzVcIjogXCJBbmQ7XCIsXG4gICAgXCIxMDgzNlwiOiBcIk9yO1wiLFxuICAgIFwiMTA4MzdcIjogXCJhbmRhbmQ7XCIsXG4gICAgXCIxMDgzOFwiOiBcIm9yb3I7XCIsXG4gICAgXCIxMDgzOVwiOiBcIm9yc2xvcGU7XCIsXG4gICAgXCIxMDg0MFwiOiBcImFuZHNsb3BlO1wiLFxuICAgIFwiMTA4NDJcIjogXCJhbmR2O1wiLFxuICAgIFwiMTA4NDNcIjogXCJvcnY7XCIsXG4gICAgXCIxMDg0NFwiOiBcImFuZGQ7XCIsXG4gICAgXCIxMDg0NVwiOiBcIm9yZDtcIixcbiAgICBcIjEwODQ3XCI6IFwid2VkYmFyO1wiLFxuICAgIFwiMTA4NTRcIjogXCJzZG90ZTtcIixcbiAgICBcIjEwODU4XCI6IFwic2ltZG90O1wiLFxuICAgIFwiMTA4NjFcIjogXCJjb25nZG90O1wiLFxuICAgIFwiMTA4NjJcIjogXCJlYXN0ZXI7XCIsXG4gICAgXCIxMDg2M1wiOiBcImFwYWNpcjtcIixcbiAgICBcIjEwODY0XCI6IFwiYXBFO1wiLFxuICAgIFwiMTA4NjVcIjogXCJlcGx1cztcIixcbiAgICBcIjEwODY2XCI6IFwicGx1c2U7XCIsXG4gICAgXCIxMDg2N1wiOiBcIkVzaW07XCIsXG4gICAgXCIxMDg2OFwiOiBcIkNvbG9uZTtcIixcbiAgICBcIjEwODY5XCI6IFwiRXF1YWw7XCIsXG4gICAgXCIxMDg3MVwiOiBcImVERG90O1wiLFxuICAgIFwiMTA4NzJcIjogXCJlcXVpdkREO1wiLFxuICAgIFwiMTA4NzNcIjogXCJsdGNpcjtcIixcbiAgICBcIjEwODc0XCI6IFwiZ3RjaXI7XCIsXG4gICAgXCIxMDg3NVwiOiBcImx0cXVlc3Q7XCIsXG4gICAgXCIxMDg3NlwiOiBcImd0cXVlc3Q7XCIsXG4gICAgXCIxMDg3N1wiOiBcIkxlc3NTbGFudEVxdWFsO1wiLFxuICAgIFwiMTA4NzhcIjogXCJHcmVhdGVyU2xhbnRFcXVhbDtcIixcbiAgICBcIjEwODc5XCI6IFwibGVzZG90O1wiLFxuICAgIFwiMTA4ODBcIjogXCJnZXNkb3Q7XCIsXG4gICAgXCIxMDg4MVwiOiBcImxlc2RvdG87XCIsXG4gICAgXCIxMDg4MlwiOiBcImdlc2RvdG87XCIsXG4gICAgXCIxMDg4M1wiOiBcImxlc2RvdG9yO1wiLFxuICAgIFwiMTA4ODRcIjogXCJnZXNkb3RvbDtcIixcbiAgICBcIjEwODg1XCI6IFwibGVzc2FwcHJveDtcIixcbiAgICBcIjEwODg2XCI6IFwiZ3RyYXBwcm94O1wiLFxuICAgIFwiMTA4ODdcIjogXCJsbmVxO1wiLFxuICAgIFwiMTA4ODhcIjogXCJnbmVxO1wiLFxuICAgIFwiMTA4ODlcIjogXCJsbmFwcHJveDtcIixcbiAgICBcIjEwODkwXCI6IFwiZ25hcHByb3g7XCIsXG4gICAgXCIxMDg5MVwiOiBcImxlc3NlcXFndHI7XCIsXG4gICAgXCIxMDg5MlwiOiBcImd0cmVxcWxlc3M7XCIsXG4gICAgXCIxMDg5M1wiOiBcImxzaW1lO1wiLFxuICAgIFwiMTA4OTRcIjogXCJnc2ltZTtcIixcbiAgICBcIjEwODk1XCI6IFwibHNpbWc7XCIsXG4gICAgXCIxMDg5NlwiOiBcImdzaW1sO1wiLFxuICAgIFwiMTA4OTdcIjogXCJsZ0U7XCIsXG4gICAgXCIxMDg5OFwiOiBcImdsRTtcIixcbiAgICBcIjEwODk5XCI6IFwibGVzZ2VzO1wiLFxuICAgIFwiMTA5MDBcIjogXCJnZXNsZXM7XCIsXG4gICAgXCIxMDkwMVwiOiBcImVxc2xhbnRsZXNzO1wiLFxuICAgIFwiMTA5MDJcIjogXCJlcXNsYW50Z3RyO1wiLFxuICAgIFwiMTA5MDNcIjogXCJlbHNkb3Q7XCIsXG4gICAgXCIxMDkwNFwiOiBcImVnc2RvdDtcIixcbiAgICBcIjEwOTA1XCI6IFwiZWw7XCIsXG4gICAgXCIxMDkwNlwiOiBcImVnO1wiLFxuICAgIFwiMTA5MDlcIjogXCJzaW1sO1wiLFxuICAgIFwiMTA5MTBcIjogXCJzaW1nO1wiLFxuICAgIFwiMTA5MTFcIjogXCJzaW1sRTtcIixcbiAgICBcIjEwOTEyXCI6IFwic2ltZ0U7XCIsXG4gICAgXCIxMDkxM1wiOiBcIkxlc3NMZXNzO1wiLFxuICAgIFwiMTA5MTRcIjogXCJHcmVhdGVyR3JlYXRlcjtcIixcbiAgICBcIjEwOTE2XCI6IFwiZ2xqO1wiLFxuICAgIFwiMTA5MTdcIjogXCJnbGE7XCIsXG4gICAgXCIxMDkxOFwiOiBcImx0Y2M7XCIsXG4gICAgXCIxMDkxOVwiOiBcImd0Y2M7XCIsXG4gICAgXCIxMDkyMFwiOiBcImxlc2NjO1wiLFxuICAgIFwiMTA5MjFcIjogXCJnZXNjYztcIixcbiAgICBcIjEwOTIyXCI6IFwic210O1wiLFxuICAgIFwiMTA5MjNcIjogXCJsYXQ7XCIsXG4gICAgXCIxMDkyNFwiOiBcInNtdGU7XCIsXG4gICAgXCIxMDkyNVwiOiBcImxhdGU7XCIsXG4gICAgXCIxMDkyNlwiOiBcImJ1bXBFO1wiLFxuICAgIFwiMTA5MjdcIjogXCJwcmVjZXE7XCIsXG4gICAgXCIxMDkyOFwiOiBcInN1Y2NlcTtcIixcbiAgICBcIjEwOTMxXCI6IFwicHJFO1wiLFxuICAgIFwiMTA5MzJcIjogXCJzY0U7XCIsXG4gICAgXCIxMDkzM1wiOiBcInBybkU7XCIsXG4gICAgXCIxMDkzNFwiOiBcInN1Y2NuZXFxO1wiLFxuICAgIFwiMTA5MzVcIjogXCJwcmVjYXBwcm94O1wiLFxuICAgIFwiMTA5MzZcIjogXCJzdWNjYXBwcm94O1wiLFxuICAgIFwiMTA5MzdcIjogXCJwcm5hcDtcIixcbiAgICBcIjEwOTM4XCI6IFwic3VjY25hcHByb3g7XCIsXG4gICAgXCIxMDkzOVwiOiBcIlByO1wiLFxuICAgIFwiMTA5NDBcIjogXCJTYztcIixcbiAgICBcIjEwOTQxXCI6IFwic3ViZG90O1wiLFxuICAgIFwiMTA5NDJcIjogXCJzdXBkb3Q7XCIsXG4gICAgXCIxMDk0M1wiOiBcInN1YnBsdXM7XCIsXG4gICAgXCIxMDk0NFwiOiBcInN1cHBsdXM7XCIsXG4gICAgXCIxMDk0NVwiOiBcInN1Ym11bHQ7XCIsXG4gICAgXCIxMDk0NlwiOiBcInN1cG11bHQ7XCIsXG4gICAgXCIxMDk0N1wiOiBcInN1YmVkb3Q7XCIsXG4gICAgXCIxMDk0OFwiOiBcInN1cGVkb3Q7XCIsXG4gICAgXCIxMDk0OVwiOiBcInN1YnNldGVxcTtcIixcbiAgICBcIjEwOTUwXCI6IFwic3Vwc2V0ZXFxO1wiLFxuICAgIFwiMTA5NTFcIjogXCJzdWJzaW07XCIsXG4gICAgXCIxMDk1MlwiOiBcInN1cHNpbTtcIixcbiAgICBcIjEwOTU1XCI6IFwic3Vic2V0bmVxcTtcIixcbiAgICBcIjEwOTU2XCI6IFwic3Vwc2V0bmVxcTtcIixcbiAgICBcIjEwOTU5XCI6IFwiY3N1YjtcIixcbiAgICBcIjEwOTYwXCI6IFwiY3N1cDtcIixcbiAgICBcIjEwOTYxXCI6IFwiY3N1YmU7XCIsXG4gICAgXCIxMDk2MlwiOiBcImNzdXBlO1wiLFxuICAgIFwiMTA5NjNcIjogXCJzdWJzdXA7XCIsXG4gICAgXCIxMDk2NFwiOiBcInN1cHN1YjtcIixcbiAgICBcIjEwOTY1XCI6IFwic3Vic3ViO1wiLFxuICAgIFwiMTA5NjZcIjogXCJzdXBzdXA7XCIsXG4gICAgXCIxMDk2N1wiOiBcInN1cGhzdWI7XCIsXG4gICAgXCIxMDk2OFwiOiBcInN1cGRzdWI7XCIsXG4gICAgXCIxMDk2OVwiOiBcImZvcmt2O1wiLFxuICAgIFwiMTA5NzBcIjogXCJ0b3Bmb3JrO1wiLFxuICAgIFwiMTA5NzFcIjogXCJtbGNwO1wiLFxuICAgIFwiMTA5ODBcIjogXCJEb3VibGVMZWZ0VGVlO1wiLFxuICAgIFwiMTA5ODJcIjogXCJWZGFzaGw7XCIsXG4gICAgXCIxMDk4M1wiOiBcIkJhcnY7XCIsXG4gICAgXCIxMDk4NFwiOiBcInZCYXI7XCIsXG4gICAgXCIxMDk4NVwiOiBcInZCYXJ2O1wiLFxuICAgIFwiMTA5ODdcIjogXCJWYmFyO1wiLFxuICAgIFwiMTA5ODhcIjogXCJOb3Q7XCIsXG4gICAgXCIxMDk4OVwiOiBcImJOb3Q7XCIsXG4gICAgXCIxMDk5MFwiOiBcInJubWlkO1wiLFxuICAgIFwiMTA5OTFcIjogXCJjaXJtaWQ7XCIsXG4gICAgXCIxMDk5MlwiOiBcIm1pZGNpcjtcIixcbiAgICBcIjEwOTkzXCI6IFwidG9wY2lyO1wiLFxuICAgIFwiMTA5OTRcIjogXCJuaHBhcjtcIixcbiAgICBcIjEwOTk1XCI6IFwicGFyc2ltO1wiLFxuICAgIFwiMTEwMDVcIjogXCJwYXJzbDtcIixcbiAgICBcIjY0MjU2XCI6IFwiZmZsaWc7XCIsXG4gICAgXCI2NDI1N1wiOiBcImZpbGlnO1wiLFxuICAgIFwiNjQyNThcIjogXCJmbGxpZztcIixcbiAgICBcIjY0MjU5XCI6IFwiZmZpbGlnO1wiLFxuICAgIFwiNjQyNjBcIjogXCJmZmxsaWc7XCJcbn0iLCJBbmFseXRpY3MgICAgPSByZXF1aXJlICcuL3V0aWxzL0FuYWx5dGljcydcbkF1dGhNYW5hZ2VyICA9IHJlcXVpcmUgJy4vdXRpbHMvQXV0aE1hbmFnZXInXG5TaGFyZSAgICAgICAgPSByZXF1aXJlICcuL3V0aWxzL1NoYXJlJ1xuRmFjZWJvb2sgICAgID0gcmVxdWlyZSAnLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4vdXRpbHMvR29vZ2xlUGx1cydcblRlbXBsYXRlcyAgICA9IHJlcXVpcmUgJy4vZGF0YS9UZW1wbGF0ZXMnXG5Mb2NhbGUgICAgICAgPSByZXF1aXJlICcuL2RhdGEvTG9jYWxlJ1xuUm91dGVyICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvUm91dGVyJ1xuTmF2ICAgICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvTmF2J1xuQXBwRGF0YSAgICAgID0gcmVxdWlyZSAnLi9BcHBEYXRhJ1xuQXBwVmlldyAgICAgID0gcmVxdWlyZSAnLi9BcHBWaWV3J1xuTWVkaWFRdWVyaWVzID0gcmVxdWlyZSAnLi91dGlscy9NZWRpYVF1ZXJpZXMnXG5cbmNsYXNzIEFwcFxuXG4gICAgTElWRSAgICAgICA6IG51bGxcbiAgICBCQVNFX1VSTCAgIDogd2luZG93LmNvbmZpZy5ob3N0bmFtZVxuICAgIGxvY2FsZUNvZGUgOiB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcbiAgICBvYmpSZWFkeSAgIDogMFxuXG4gICAgX3RvQ2xlYW4gICA6IFsnb2JqUmVhZHknLCAnc2V0RmxhZ3MnLCAnb2JqZWN0Q29tcGxldGUnLCAnaW5pdCcsICdpbml0T2JqZWN0cycsICdpbml0U0RLcycsICdpbml0QXBwJywgJ2dvJywgJ2NsZWFudXAnLCAnX3RvQ2xlYW4nXVxuXG4gICAgY29uc3RydWN0b3IgOiAoQExJVkUpIC0+XG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIHNldEZsYWdzIDogPT5cblxuICAgICAgICB1YSA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKClcblxuICAgICAgICBNZWRpYVF1ZXJpZXMuc2V0dXAoKTtcblxuICAgICAgICBASVNfQU5EUk9JRCAgICA9IHVhLmluZGV4T2YoJ2FuZHJvaWQnKSA+IC0xXG4gICAgICAgIEBJU19GSVJFRk9YICAgID0gdWEuaW5kZXhPZignZmlyZWZveCcpID4gLTFcbiAgICAgICAgQElTX0NIUk9NRV9JT1MgPSBpZiB1YS5tYXRjaCgnY3Jpb3MnKSB0aGVuIHRydWUgZWxzZSBmYWxzZSAjIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEzODA4MDUzXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaXNNb2JpbGUgOiA9PlxuXG4gICAgICAgIHJldHVybiBASVNfSU9TIG9yIEBJU19BTkRST0lEXG5cbiAgICBvYmplY3RDb21wbGV0ZSA6ID0+XG5cbiAgICAgICAgQG9ialJlYWR5KytcbiAgICAgICAgQGluaXRBcHAoKSBpZiBAb2JqUmVhZHkgPj0gNFxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEBpbml0T2JqZWN0cygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdE9iamVjdHMgOiA9PlxuXG4gICAgICAgIEB0ZW1wbGF0ZXMgPSBuZXcgVGVtcGxhdGVzIFwiL2RhdGEvdGVtcGxhdGVzI3soaWYgQExJVkUgdGhlbiAnLm1pbicgZWxzZSAnJyl9LnhtbFwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGxvY2FsZSAgICA9IG5ldyBMb2NhbGUgXCIvZGF0YS9sb2NhbGVzL3N0cmluZ3MuanNvblwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGFuYWx5dGljcyA9IG5ldyBBbmFseXRpY3MgXCIvZGF0YS90cmFja2luZy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYXBwRGF0YSAgID0gbmV3IEFwcERhdGEgQG9iamVjdENvbXBsZXRlXG5cbiAgICAgICAgIyBpZiBuZXcgb2JqZWN0cyBhcmUgYWRkZWQgZG9uJ3QgZm9yZ2V0IHRvIGNoYW5nZSB0aGUgYEBvYmplY3RDb21wbGV0ZWAgZnVuY3Rpb25cblxuICAgICAgICBudWxsXG5cbiAgICBpbml0U0RLcyA6ID0+XG5cbiAgICAgICAgRmFjZWJvb2subG9hZCgpXG4gICAgICAgIEdvb2dsZVBsdXMubG9hZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdEFwcCA6ID0+XG5cbiAgICAgICAgQHNldEZsYWdzKClcblxuICAgICAgICAjIyMgU3RhcnRzIGFwcGxpY2F0aW9uICMjI1xuICAgICAgICBAYXBwVmlldyA9IG5ldyBBcHBWaWV3XG4gICAgICAgIEByb3V0ZXIgID0gbmV3IFJvdXRlclxuICAgICAgICBAbmF2ICAgICA9IG5ldyBOYXZcbiAgICAgICAgQGF1dGggICAgPSBuZXcgQXV0aE1hbmFnZXJcbiAgICAgICAgQHNoYXJlICAgPSBuZXcgU2hhcmVcblxuICAgICAgICBAZ28oKVxuXG4gICAgICAgIEBpbml0U0RLcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ28gOiA9PlxuXG4gICAgICAgICMjIyBBZnRlciBldmVyeXRoaW5nIGlzIGxvYWRlZCwga2lja3Mgb2ZmIHdlYnNpdGUgIyMjXG4gICAgICAgIEBhcHBWaWV3LnJlbmRlcigpXG5cbiAgICAgICAgIyMjIHJlbW92ZSByZWR1bmRhbnQgaW5pdGlhbGlzYXRpb24gbWV0aG9kcyAvIHByb3BlcnRpZXMgIyMjXG4gICAgICAgIEBjbGVhbnVwKClcblxuICAgICAgICBudWxsXG5cbiAgICBjbGVhbnVwIDogPT5cblxuICAgICAgICBmb3IgZm4gaW4gQF90b0NsZWFuXG4gICAgICAgICAgICBAW2ZuXSA9IG51bGxcbiAgICAgICAgICAgIGRlbGV0ZSBAW2ZuXVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkFic3RyYWN0RGF0YSAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0Fic3RyYWN0RGF0YSdcblJlcXVlc3RlciAgICAgICAgID0gcmVxdWlyZSAnLi91dGlscy9SZXF1ZXN0ZXInXG5BUEkgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9BUEknXG5Eb29kbGVzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4vY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbidcblxuY2xhc3MgQXBwRGF0YSBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG4gICAgY2FsbGJhY2sgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IChAY2FsbGJhY2spIC0+XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYWRkIGFsbCBkYXRhIGNsYXNzZXMgaGVyZVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICBAZG9vZGxlcyA9IG5ldyBEb29kbGVzQ29sbGVjdGlvblxuXG4gICAgICAgIEBnZXRTdGFydERhdGEoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICAjIyNcbiAgICBnZXQgYXBwIGJvb3RzdHJhcCBkYXRhIC0gZW1iZWQgaW4gSFRNTCBvciBBUEkgZW5kcG9pbnRcbiAgICAjIyNcbiAgICBnZXRTdGFydERhdGEgOiA9PlxuICAgICAgICBcbiAgICAgICAgIyBpZiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgIGlmIHRydWVcblxuICAgICAgICAgICAgciA9IFJlcXVlc3Rlci5yZXF1ZXN0XG4gICAgICAgICAgICAgICAgIyB1cmwgIDogQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICAgICAgICAgIHVybCAgOiBAQ0QoKS5CQVNFX1VSTCArICcvZGF0YS9fRFVNTVkvZG9vZGxlcy5qc29uJ1xuICAgICAgICAgICAgICAgIHR5cGUgOiAnR0VUJ1xuXG4gICAgICAgICAgICByLmRvbmUgQG9uU3RhcnREYXRhUmVjZWl2ZWRcbiAgICAgICAgICAgIHIuZmFpbCA9PlxuXG4gICAgICAgICAgICAgICAgIyBjb25zb2xlLmVycm9yIFwiZXJyb3IgbG9hZGluZyBhcGkgc3RhcnQgZGF0YVwiXG5cbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICB0aGlzIGlzIG9ubHkgdGVtcG9yYXJ5LCB3aGlsZSB0aGVyZSBpcyBubyBib290c3RyYXAgZGF0YSBoZXJlLCBub3JtYWxseSB3b3VsZCBoYW5kbGUgZXJyb3IgLyBmYWlsXG4gICAgICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICBvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgY29uc29sZS5sb2cgXCJvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XCIsIGRhdGFcblxuICAgICAgICB0b0FkZCA9IFtdXG4gICAgICAgICh0b0FkZCA9IHRvQWRkLmNvbmNhdCBkYXRhLmRvb2RsZXMpIGZvciBpIGluIFswLi4uNV1cblxuICAgICAgICBAZG9vZGxlcy5hZGQgdG9BZGRcblxuICAgICAgICAjIyNcblxuICAgICAgICBib290c3RyYXAgZGF0YSByZWNlaXZlZCwgYXBwIHJlYWR5IHRvIGdvXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcERhdGFcbiIsIkFic3RyYWN0VmlldyAgICAgPSByZXF1aXJlICcuL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUHJlbG9hZGVyICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL1ByZWxvYWRlcidcbkhlYWRlciAgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9IZWFkZXInXG5XcmFwcGVyICAgICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvV3JhcHBlcidcbkZvb3RlciAgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9Gb290ZXInXG5QYWdlVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUGFnZVRyYW5zaXRpb25lcidcbk1vZGFsTWFuYWdlciAgICAgPSByZXF1aXJlICcuL3ZpZXcvbW9kYWxzL19Nb2RhbE1hbmFnZXInXG5cbmNsYXNzIEFwcFZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ21haW4nXG5cbiAgICAkd2luZG93ICA6IG51bGxcbiAgICAkYm9keSAgICA6IG51bGxcblxuICAgIHdyYXBwZXIgIDogbnVsbFxuICAgIGZvb3RlciAgIDogbnVsbFxuXG4gICAgZGltcyA6XG4gICAgICAgIHcgOiBudWxsXG4gICAgICAgIGggOiBudWxsXG4gICAgICAgIG8gOiBudWxsXG4gICAgICAgIHVwZGF0ZU1vYmlsZSA6IHRydWVcbiAgICAgICAgbGFzdEhlaWdodCAgIDogbnVsbFxuXG4gICAgbGFzdFNjcm9sbFkgOiAwXG4gICAgdGlja2luZyAgICAgOiBmYWxzZVxuXG4gICAgRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMgOiAnRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMnXG4gICAgRVZFTlRfUFJFTE9BREVSX0hJREUgICAgOiAnRVZFTlRfUFJFTE9BREVSX0hJREUnXG4gICAgRVZFTlRfT05fU0NST0xMICAgICAgICAgOiAnRVZFTlRfT05fU0NST0xMJ1xuXG4gICAgTU9CSUxFX1dJRFRIIDogNzAwXG4gICAgTU9CSUxFICAgICAgIDogJ21vYmlsZSdcbiAgICBOT05fTU9CSUxFICAgOiAnbm9uX21vYmlsZSdcblxuICAgIGNvbnN0cnVjdG9yIDogLT5cblxuICAgICAgICBAJHdpbmRvdyA9ICQod2luZG93KVxuICAgICAgICBAJGJvZHkgICA9ICQoJ2JvZHknKS5lcSgwKVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgIGRpc2FibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vbiAndG91Y2htb3ZlJywgQG9uVG91Y2hNb3ZlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZW5hYmxlVG91Y2g6ID0+XG5cbiAgICAgICAgQCR3aW5kb3cub2ZmICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcblxuICAgICAgICBudWxsXG5cbiAgICBvblRvdWNoTW92ZTogKCBlICkgLT5cblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICBudWxsXG5cbiAgICByZW5kZXIgOiA9PlxuXG4gICAgICAgIEBiaW5kRXZlbnRzKClcblxuICAgICAgICBAcHJlbG9hZGVyICAgID0gbmV3IFByZWxvYWRlclxuICAgICAgICBAbW9kYWxNYW5hZ2VyID0gbmV3IE1vZGFsTWFuYWdlclxuXG4gICAgICAgIEBoZWFkZXIgICAgICAgPSBuZXcgSGVhZGVyXG4gICAgICAgIEB3cmFwcGVyICAgICAgPSBuZXcgV3JhcHBlclxuICAgICAgICBAZm9vdGVyICAgICAgID0gbmV3IEZvb3RlclxuICAgICAgICBAdHJhbnNpdGlvbmVyID0gbmV3IFBhZ2VUcmFuc2l0aW9uZXJcblxuICAgICAgICBAXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGhlYWRlclxuICAgICAgICAgICAgLmFkZENoaWxkIEB3cmFwcGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGZvb3RlclxuICAgICAgICAgICAgLmFkZENoaWxkIEB0cmFuc2l0aW9uZXJcblxuICAgICAgICBAb25BbGxSZW5kZXJlZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYmluZEV2ZW50cyA6ID0+XG5cbiAgICAgICAgQG9uICdhbGxSZW5kZXJlZCcsIEBvbkFsbFJlbmRlcmVkXG5cbiAgICAgICAgQG9uUmVzaXplKClcblxuICAgICAgICBAb25SZXNpemUgPSBfLmRlYm91bmNlIEBvblJlc2l6ZSwgMzAwXG4gICAgICAgIEAkd2luZG93Lm9uICdyZXNpemUgb3JpZW50YXRpb25jaGFuZ2UnLCBAb25SZXNpemVcbiAgICAgICAgQCR3aW5kb3cub24gXCJzY3JvbGxcIiwgQG9uU2Nyb2xsXG5cbiAgICAgICAgQCRib2R5Lm9uICdjbGljaycsICdhJywgQGxpbmtNYW5hZ2VyXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25TY3JvbGwgOiA9PlxuXG4gICAgICAgIEBsYXN0U2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZXG4gICAgICAgIEByZXF1ZXN0VGljaygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVxdWVzdFRpY2sgOiA9PlxuXG4gICAgICAgIGlmICFAdGlja2luZ1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIEBzY3JvbGxVcGRhdGVcbiAgICAgICAgICAgIEB0aWNraW5nID0gdHJ1ZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNjcm9sbFVwZGF0ZSA6ID0+XG5cbiAgICAgICAgQHRpY2tpbmcgPSBmYWxzZVxuXG4gICAgICAgIEAkYm9keS5hZGRDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG5cbiAgICAgICAgY2xlYXJUaW1lb3V0IEB0aW1lclNjcm9sbFxuXG4gICAgICAgIEB0aW1lclNjcm9sbCA9IHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgIEAkYm9keS5yZW1vdmVDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG4gICAgICAgICwgNTBcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfT05fU0NST0xMXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25BbGxSZW5kZXJlZCA6ID0+XG5cbiAgICAgICAgIyBjb25zb2xlLmxvZyBcIm9uQWxsUmVuZGVyZWQgOiA9PlwiXG5cbiAgICAgICAgQCRib2R5LnByZXBlbmQgQCRlbFxuXG4gICAgICAgIEBwcmVsb2FkZXIucGxheUludHJvQW5pbWF0aW9uID0+IEB0cmlnZ2VyIEBFVkVOVF9QUkVMT0FERVJfSElERVxuXG4gICAgICAgIEBiZWdpbigpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYmVnaW4gOiA9PlxuXG4gICAgICAgIEB0cmlnZ2VyICdzdGFydCdcblxuICAgICAgICBAQ0QoKS5yb3V0ZXIuc3RhcnQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uUmVzaXplIDogPT5cblxuICAgICAgICBAZ2V0RGltcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0RGltcyA6ID0+XG5cbiAgICAgICAgdyA9IHdpbmRvdy5pbm5lcldpZHRoIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCBvciBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICAgICAgIGggPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodFxuXG4gICAgICAgIGNoYW5nZSA9IGggLyBAZGltcy5sYXN0SGVpZ2h0XG5cbiAgICAgICAgQGRpbXMgPVxuICAgICAgICAgICAgdyA6IHdcbiAgICAgICAgICAgIGggOiBoXG4gICAgICAgICAgICBvIDogaWYgaCA+IHcgdGhlbiAncG9ydHJhaXQnIGVsc2UgJ2xhbmRzY2FwZSdcbiAgICAgICAgICAgIHVwZGF0ZU1vYmlsZSA6ICFAQ0QoKS5pc01vYmlsZSgpIG9yIGNoYW5nZSA8IDAuOCBvciBjaGFuZ2UgPiAxLjJcbiAgICAgICAgICAgIGxhc3RIZWlnaHQgICA6IGhcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEBkaW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbGlua01hbmFnZXIgOiAoZSkgPT5cblxuICAgICAgICBocmVmID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2hyZWYnKVxuXG4gICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgaHJlZlxuXG4gICAgICAgIEBuYXZpZ2F0ZVRvVXJsIGhyZWYsIGVcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvVXJsIDogKCBocmVmLCBlID0gbnVsbCApID0+XG5cbiAgICAgICAgcm91dGUgICA9IGlmIGhyZWYubWF0Y2goQENEKCkuQkFTRV9VUkwpIHRoZW4gaHJlZi5zcGxpdChAQ0QoKS5CQVNFX1VSTClbMV0gZWxzZSBocmVmXG4gICAgICAgIHNlY3Rpb24gPSBpZiByb3V0ZS5jaGFyQXQoMCkgaXMgJy8nIHRoZW4gcm91dGUuc3BsaXQoJy8nKVsxXS5zcGxpdCgnLycpWzBdIGVsc2Ugcm91dGUuc3BsaXQoJy8nKVswXVxuXG4gICAgICAgIGlmIEBDRCgpLm5hdi5nZXRTZWN0aW9uIHNlY3Rpb25cbiAgICAgICAgICAgIGU/LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIEBDRCgpLnJvdXRlci5uYXZpZ2F0ZVRvIHJvdXRlXG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBAaGFuZGxlRXh0ZXJuYWxMaW5rIGhyZWZcblxuICAgICAgICBudWxsXG5cbiAgICBoYW5kbGVFeHRlcm5hbExpbmsgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcImhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PiBcIlxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJpbmQgdHJhY2tpbmcgZXZlbnRzIGlmIG5lY2Vzc2FyeVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBWaWV3XG4iLCJjbGFzcyBBYnN0cmFjdENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Q29sbGVjdGlvblxuIiwiQWJzdHJhY3RDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RDb2xsZWN0aW9uJ1xuQ29udHJpYnV0b3JNb2RlbCAgID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2NvbnRyaWJ1dG9yL0NvbnRyaWJ1dG9yTW9kZWwnXG5cbmNsYXNzIENvbnRyaWJ1dG9yc0NvbGxlY3Rpb24gZXh0ZW5kcyBBYnN0cmFjdENvbGxlY3Rpb25cblxuXHRtb2RlbCA6IENvbnRyaWJ1dG9yTW9kZWxcblxuXHRnZXRBYm91dEhUTUwgOiA9PlxuXG5cdFx0cGVlcHMgPSBbXVxuXG5cdFx0KHBlZXBzLnB1c2ggbW9kZWwuZ2V0KCdodG1sJykpIGZvciBtb2RlbCBpbiBAbW9kZWxzXG5cblx0XHRwZWVwcy5qb2luKCcgXFxcXCAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyaWJ1dG9yc0NvbGxlY3Rpb25cbiIsIlRlbXBsYXRlTW9kZWwgPSByZXF1aXJlICcuLi8uLi9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsJ1xuXG5jbGFzcyBUZW1wbGF0ZXNDb2xsZWN0aW9uIGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvblxuXG5cdG1vZGVsIDogVGVtcGxhdGVNb2RlbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlc0NvbGxlY3Rpb25cbiIsIkFic3RyYWN0Q29sbGVjdGlvbiA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Q29sbGVjdGlvbidcbkRvb2RsZU1vZGVsICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9kb29kbGUvRG9vZGxlTW9kZWwnXG5cbmNsYXNzIERvb2RsZXNDb2xsZWN0aW9uIGV4dGVuZHMgQWJzdHJhY3RDb2xsZWN0aW9uXG5cblx0bW9kZWwgOiBEb29kbGVNb2RlbFxuXG5cdGdldERvb2RsZUJ5U2x1ZyA6IChzbHVnKSA9PlxuXG5cdFx0ZG9vZGxlID0gQGZpbmRXaGVyZSBzbHVnIDogc2x1Z1xuXG5cdFx0aWYgIWRvb2RsZVxuXHRcdFx0Y29uc29sZS5sb2cgXCJ5IHUgbm8gZG9vZGxlP1wiXG5cblx0XHRyZXR1cm4gZG9vZGxlXG5cblx0Z2V0RG9vZGxlQnlOYXZTZWN0aW9uIDogKHdoaWNoU2VjdGlvbikgPT5cblxuXHRcdHNlY3Rpb24gPSBAQ0QoKS5uYXZbd2hpY2hTZWN0aW9uXVxuXG5cdFx0ZG9vZGxlID0gQGZpbmRXaGVyZSBzbHVnIDogXCIje3NlY3Rpb24uc3VifS8je3NlY3Rpb24udGVyfVwiXG5cblx0XHRkb29kbGVcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVzQ29sbGVjdGlvblxuIiwiQ29sb3JzID1cblxuXHRDRF9SRUQgICAgOiAnI0VCNDIzRSdcblx0Q0RfQkxVRSAgIDogJyMzOTVDQUEnXG5cdENEX0JMQUNLICA6ICcjMTExMTExJ1xuXHRPRkZfV0hJVEUgOiAnI0YxRjFGMydcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcnNcbiIsIkFQSVJvdXRlTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsJ1xuXG5jbGFzcyBBUElcblxuXHRAbW9kZWwgOiBuZXcgQVBJUm91dGVNb2RlbFxuXG5cdEBnZXRDb250YW50cyA6ID0+XG5cblx0XHQjIyMgYWRkIG1vcmUgaWYgd2Ugd2FubmEgdXNlIGluIEFQSSBzdHJpbmdzICMjI1xuXHRcdEJBU0VfVVJMIDogQENEKCkuQkFTRV9VUkxcblxuXHRAZ2V0IDogKG5hbWUsIHZhcnMpID0+XG5cblx0XHR2YXJzID0gJC5leHRlbmQgdHJ1ZSwgdmFycywgQGdldENvbnRhbnRzKClcblx0XHRyZXR1cm4gQHN1cHBsYW50U3RyaW5nIEBtb2RlbC5nZXQobmFtZSksIHZhcnNcblxuXHRAc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdIG9yIGlmIHR5cGVvZiB2YWxzW2JdIGlzICdudW1iZXInIHRoZW4gdmFsc1tiXS50b1N0cmluZygpIGVsc2UgJydcblx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBUElcbiIsImNsYXNzIEFic3RyYWN0RGF0YVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdF8uZXh0ZW5kIEAsIEJhY2tib25lLkV2ZW50c1xuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3REYXRhXG4iLCJMb2NhbGVzTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwnXG5BUEkgICAgICAgICAgPSByZXF1aXJlICcuLi9kYXRhL0FQSSdcblxuIyMjXG4jIExvY2FsZSBMb2FkZXIgI1xuXG5GaXJlcyBiYWNrIGFuIGV2ZW50IHdoZW4gY29tcGxldGVcblxuIyMjXG5jbGFzcyBMb2NhbGVcblxuICAgIGxhbmcgICAgIDogbnVsbFxuICAgIGRhdGEgICAgIDogbnVsbFxuICAgIGNhbGxiYWNrIDogbnVsbFxuICAgIGJhY2t1cCAgIDogbnVsbFxuICAgIGRlZmF1bHQgIDogJ2VuLWdiJ1xuXG4gICAgY29uc3RydWN0b3IgOiAoZGF0YSwgY2IpIC0+XG5cbiAgICAgICAgIyMjIHN0YXJ0IExvY2FsZSBMb2FkZXIsIGRlZmluZSBsb2NhbGUgYmFzZWQgb24gYnJvd3NlciBsYW5ndWFnZSAjIyNcblxuICAgICAgICBAY2FsbGJhY2sgPSBjYlxuICAgICAgICBAYmFja3VwID0gZGF0YVxuXG4gICAgICAgIEBsYW5nID0gQGdldExhbmcoKVxuXG4gICAgICAgIGlmIEFQSS5nZXQoJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0pXG5cbiAgICAgICAgICAgICQuYWpheFxuICAgICAgICAgICAgICAgIHVybCAgICAgOiBBUEkuZ2V0KCAnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSApXG4gICAgICAgICAgICAgICAgdHlwZSAgICA6ICdHRVQnXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgICAgICBlcnJvciAgIDogQGxvYWRCYWNrdXBcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBsb2FkQmFja3VwKClcblxuICAgICAgICBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRMYW5nIDogPT5cblxuICAgICAgICBpZiB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGFuZCB3aW5kb3cubG9jYXRpb24uc2VhcmNoLm1hdGNoKCdsYW5nPScpXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KCdsYW5nPScpWzFdLnNwbGl0KCcmJylbMF1cblxuICAgICAgICBlbHNlIGlmIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBsYW5nID0gQGRlZmF1bHRcblxuICAgICAgICBsYW5nXG5cbiAgICBvblN1Y2Nlc3MgOiAoZXZlbnQpID0+XG5cbiAgICAgICAgIyMjIEZpcmVzIGJhY2sgYW4gZXZlbnQgb25jZSBpdCdzIGNvbXBsZXRlICMjI1xuXG4gICAgICAgIGQgPSBudWxsXG5cbiAgICAgICAgaWYgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgICAgICBkID0gSlNPTi5wYXJzZSBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIGQgPSBldmVudFxuXG4gICAgICAgIEBkYXRhID0gbmV3IExvY2FsZXNNb2RlbCBkXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIGxvYWRCYWNrdXAgOiA9PlxuXG4gICAgICAgICMjIyBXaGVuIEFQSSBub3QgYXZhaWxhYmxlLCB0cmllcyB0byBsb2FkIHRoZSBzdGF0aWMgLnR4dCBsb2NhbGUgIyMjXG5cbiAgICAgICAgJC5hamF4IFxuICAgICAgICAgICAgdXJsICAgICAgOiBAYmFja3VwXG4gICAgICAgICAgICBkYXRhVHlwZSA6ICdqc29uJ1xuICAgICAgICAgICAgY29tcGxldGUgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICBlcnJvciAgICA6ID0+IGNvbnNvbGUubG9nICdlcnJvciBvbiBsb2FkaW5nIGJhY2t1cCdcblxuICAgICAgICBudWxsXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgIyMjIGdldCBTdHJpbmcgZnJvbSBsb2NhbGVcbiAgICAgICAgKyBpZCA6IHN0cmluZyBpZCBvZiB0aGUgTG9jYWxpc2VkIFN0cmluZ1xuICAgICAgICAjIyNcblxuICAgICAgICByZXR1cm4gQGRhdGEuZ2V0U3RyaW5nIGlkXG5cbiAgICBnZXRMb2NhbGVJbWFnZSA6ICh1cmwpID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5jb25maWcuQ0ROICsgXCIvaW1hZ2VzL2xvY2FsZS9cIiArIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZSArIFwiL1wiICsgdXJsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlXG4iLCJUZW1wbGF0ZU1vZGVsICAgICAgID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblRlbXBsYXRlc0NvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24nXG5cbmNsYXNzIFRlbXBsYXRlc1xuXG4gICAgdGVtcGxhdGVzIDogbnVsbFxuICAgIGNiICAgICAgICA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKHRlbXBsYXRlcywgY2FsbGJhY2spIC0+XG5cbiAgICAgICAgQGNiID0gY2FsbGJhY2tcblxuICAgICAgICAkLmFqYXggdXJsIDogdGVtcGxhdGVzLCBzdWNjZXNzIDogQHBhcnNlWE1MXG4gICAgICAgICAgIFxuICAgICAgICBudWxsXG5cbiAgICBwYXJzZVhNTCA6IChkYXRhKSA9PlxuXG4gICAgICAgIHRlbXAgPSBbXVxuXG4gICAgICAgICQoZGF0YSkuZmluZCgndGVtcGxhdGUnKS5lYWNoIChrZXksIHZhbHVlKSAtPlxuICAgICAgICAgICAgJHZhbHVlID0gJCh2YWx1ZSlcbiAgICAgICAgICAgIHRlbXAucHVzaCBuZXcgVGVtcGxhdGVNb2RlbFxuICAgICAgICAgICAgICAgIGlkICAgOiAkdmFsdWUuYXR0cignaWQnKS50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgdGV4dCA6ICQudHJpbSAkdmFsdWUudGV4dCgpXG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXNDb2xsZWN0aW9uIHRlbXBcblxuICAgICAgICBAY2I/KClcbiAgICAgICAgXG4gICAgICAgIG51bGwgICAgICAgIFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgIHQgPSBAdGVtcGxhdGVzLndoZXJlIGlkIDogaWRcbiAgICAgICAgdCA9IHRbMF0uZ2V0ICd0ZXh0J1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICQudHJpbSB0XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzXG4iLCJjbGFzcyBBYnN0cmFjdE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cblx0Y29uc3RydWN0b3IgOiAoYXR0cnMsIG9wdGlvbikgLT5cblxuXHRcdGF0dHJzID0gQF9maWx0ZXJBdHRycyBhdHRyc1xuXG5cdFx0cmV0dXJuIEJhY2tib25lLkRlZXBNb2RlbC5hcHBseSBALCBhcmd1bWVudHNcblxuXHRzZXQgOiAoYXR0cnMsIG9wdGlvbnMpIC0+XG5cblx0XHRvcHRpb25zIG9yIChvcHRpb25zID0ge30pXG5cblx0XHRhdHRycyA9IEBfZmlsdGVyQXR0cnMgYXR0cnNcblxuXHRcdG9wdGlvbnMuZGF0YSA9IEpTT04uc3RyaW5naWZ5IGF0dHJzXG5cblx0XHRyZXR1cm4gQmFja2JvbmUuRGVlcE1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCBALCBhdHRycywgb3B0aW9uc1xuXG5cdF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuXHRcdGF0dHJzXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0TW9kZWxcbiIsIkFic3RyYWN0TW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RNb2RlbCdcbk51bWJlclV0aWxzICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvTnVtYmVyVXRpbHMnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBDb250cmlidXRvck1vZGVsIGV4dGVuZHMgQWJzdHJhY3RNb2RlbFxuXG4gICAgZGVmYXVsdHMgOiBcbiAgICAgICAgXCJuYW1lXCIgICAgOiBcIlwiXG4gICAgICAgIFwiZ2l0aHViXCIgIDogXCJcIlxuICAgICAgICBcIndlYnNpdGVcIiA6IFwiXCJcbiAgICAgICAgXCJ0d2l0dGVyXCIgOiBcIlwiXG4gICAgICAgIFwiaHRtbFwiICAgIDogXCJcIlxuXG4gICAgX2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG4gICAgICAgIGlmIGF0dHJzLm5hbWVcbiAgICAgICAgICAgIGF0dHJzLmh0bWwgPSBAZ2V0SHRtbCBhdHRyc1xuXG4gICAgICAgIGF0dHJzXG5cbiAgICBnZXRIdG1sIDogKGF0dHJzKSA9PlxuXG4gICAgICAgIGh0bWwgID0gXCJcIlxuICAgICAgICBsaW5rcyA9IFtdXG5cbiAgICAgICAgaWYgYXR0cnMud2Vic2l0ZVxuICAgICAgICAgICAgaHRtbCArPSBcIjxhIGhyZWY9XFxcIiN7YXR0cnMud2Vic2l0ZX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj4je2F0dHJzLm5hbWV9PC9hPiBcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBodG1sICs9IFwiI3thdHRycy5uYW1lfSBcIlxuXG4gICAgICAgIGlmIGF0dHJzLnR3aXR0ZXIgdGhlbiBsaW5rcy5wdXNoIFwiPGEgaHJlZj1cXFwiaHR0cDovL3R3aXR0ZXIuY29tLyN7YXR0cnMudHdpdHRlcn1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj50dzwvYT5cIlxuICAgICAgICBpZiBhdHRycy5naXRodWIgdGhlbiBsaW5rcy5wdXNoIFwiPGEgaHJlZj1cXFwiaHR0cDovL2dpdGh1Yi5jb20vI3thdHRycy5naXRodWJ9XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+Z2g8L2E+XCJcblxuICAgICAgICBodG1sICs9IFwiKCN7bGlua3Muam9pbignLCAnKX0pXCJcblxuICAgICAgICBodG1sXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0b3JNb2RlbFxuIiwiY2xhc3MgQVBJUm91dGVNb2RlbCBleHRlbmRzIEJhY2tib25lLkRlZXBNb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuXG4gICAgICAgIHN0YXJ0ICAgICAgICAgOiBcIlwiICMgRWc6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3N0YXJ0XCJcblxuICAgICAgICBsb2NhbGUgICAgICAgIDogXCJcIiAjIEVnOiBcInt7IEJBU0VfVVJMIH19L2FwaS9sMTBuL3t7IGNvZGUgfX1cIlxuXG4gICAgICAgIHVzZXIgICAgICAgICAgOlxuICAgICAgICAgICAgbG9naW4gICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvbG9naW5cIlxuICAgICAgICAgICAgcmVnaXN0ZXIgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcmVnaXN0ZXJcIlxuICAgICAgICAgICAgcGFzc3dvcmQgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcGFzc3dvcmRcIlxuICAgICAgICAgICAgdXBkYXRlICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvdXBkYXRlXCJcbiAgICAgICAgICAgIGxvZ291dCAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL2xvZ291dFwiXG4gICAgICAgICAgICByZW1vdmUgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9yZW1vdmVcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IEFQSVJvdXRlTW9kZWxcbiIsImNsYXNzIExvY2FsZXNNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG4gICAgICAgIGNvZGUgICAgIDogbnVsbFxuICAgICAgICBsYW5ndWFnZSA6IG51bGxcbiAgICAgICAgc3RyaW5ncyAgOiBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRfbGFuZ3VhZ2UgOiA9PlxuICAgICAgICByZXR1cm4gQGdldCgnbGFuZ3VhZ2UnKVxuXG4gICAgZ2V0U3RyaW5nIDogKGlkKSA9PlxuICAgICAgICAoKHJldHVybiBlIGlmKGEgaXMgaWQpKSBmb3IgYSwgZSBvZiB2WydzdHJpbmdzJ10pIGZvciBrLCB2IG9mIEBnZXQoJ3N0cmluZ3MnKVxuICAgICAgICBjb25zb2xlLndhcm4gXCJMb2NhbGVzIC0+IG5vdCBmb3VuZCBzdHJpbmc6ICN7aWR9XCJcbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZXNNb2RlbFxuIiwiY2xhc3MgVGVtcGxhdGVNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cblx0ZGVmYXVsdHMgOiBcblxuXHRcdGlkICAgOiBcIlwiXG5cdFx0dGV4dCA6IFwiXCJcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZU1vZGVsXG4iLCJBYnN0cmFjdE1vZGVsICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0TW9kZWwnXG5OdW1iZXJVdGlscyAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL051bWJlclV0aWxzJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgRG9vZGxlTW9kZWwgZXh0ZW5kcyBBYnN0cmFjdE1vZGVsXG5cblx0ZGVmYXVsdHMgOlxuXHRcdCMgZnJvbSBtYW5pZmVzdFxuXHRcdFwibmFtZVwiIDogXCJcIlxuXHRcdFwiYXV0aG9yXCIgOlxuXHRcdFx0XCJuYW1lXCIgICAgOiBcIlwiXG5cdFx0XHRcImdpdGh1YlwiICA6IFwiXCJcblx0XHRcdFwid2Vic2l0ZVwiIDogXCJcIlxuXHRcdFx0XCJ0d2l0dGVyXCIgOiBcIlwiXG5cdFx0XCJkZXNjcmlwdGlvblwiOiBcIlwiXG5cdFx0XCJ0YWdzXCIgOiBbXVxuXHRcdFwiaW50ZXJhY3Rpb25cIiA6XG5cdFx0XHRcIm1vdXNlXCIgICAgOiBudWxsXG5cdFx0XHRcImtleWJvYXJkXCIgOiBudWxsXG5cdFx0XHRcInRvdWNoXCIgICAgOiBudWxsXG5cdFx0XCJjcmVhdGVkXCIgOiBcIlwiXG5cdFx0XCJzbHVnXCIgOiBcIlwiXG5cdFx0XCJpbmRleFwiOiBudWxsXG5cdFx0IyBzaXRlLW9ubHlcblx0XHRcImluZGV4SFRNTFwiIDogXCJcIlxuXHRcdFwic291cmNlXCIgICAgOiBcIlwiXG5cdFx0XCJ1cmxcIiAgICAgICA6IFwiXCJcblx0XHRcInNjcmFtYmxlZFwiIDpcblx0XHRcdFwibmFtZVwiICAgICAgICA6IFwiXCJcblx0XHRcdFwiYXV0aG9yX25hbWVcIiA6IFwiXCJcblxuXHRfZmlsdGVyQXR0cnMgOiAoYXR0cnMpID0+XG5cblx0XHRpZiBhdHRycy5zbHVnXG5cdFx0XHRhdHRycy51cmwgPSB3aW5kb3cuY29uZmlnLmhvc3RuYW1lICsgJy8nICsgd2luZG93LmNvbmZpZy5yb3V0ZXMuRE9PRExFUyArICcvJyArIGF0dHJzLnNsdWdcblxuXHRcdGlmIGF0dHJzLmluZGV4XG5cdFx0XHRhdHRycy5pbmRleCA9IE51bWJlclV0aWxzLnplcm9GaWxsIGF0dHJzLmluZGV4LCAzXG5cblx0XHRpZiBhdHRycy5uYW1lIGFuZCBhdHRycy5hdXRob3IubmFtZVxuXHRcdFx0YXR0cnMuc2NyYW1ibGVkID1cblx0XHRcdFx0bmFtZSAgICAgICAgOiBDb2RlV29yZFRyYW5zaXRpb25lci5nZXRTY3JhbWJsZWRXb3JkIGF0dHJzLm5hbWVcblx0XHRcdFx0YXV0aG9yX25hbWUgOiBDb2RlV29yZFRyYW5zaXRpb25lci5nZXRTY3JhbWJsZWRXb3JkIGF0dHJzLmF1dGhvci5uYW1lXG5cblx0XHRpZiBhdHRycy5pbmRleFxuXHRcdFx0YXR0cnMuaW5kZXhIVE1MID0gQGdldEluZGV4SFRNTCBhdHRycy5pbmRleFxuXG5cdFx0YXR0cnNcblxuXHRnZXRJbmRleEhUTUwgOiAoaW5kZXgpID0+XG5cblx0XHRIVE1MID0gXCJcIlxuXG5cdFx0Zm9yIGNoYXIgaW4gaW5kZXguc3BsaXQoJycpXG5cdFx0XHRjbGFzc05hbWUgPSBpZiBjaGFyIGlzICcwJyB0aGVuICdpbmRleC1jaGFyLXplcm8nIGVsc2UgJ2luZGV4LWNoYXItbm9uemVybydcblx0XHRcdEhUTUwgKz0gXCI8c3BhbiBjbGFzcz1cXFwiI3tjbGFzc05hbWV9XFxcIj4je2NoYXJ9PC9zcGFuPlwiXG5cblx0XHRIVE1MXG5cbm1vZHVsZS5leHBvcnRzID0gRG9vZGxlTW9kZWxcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUm91dGVyICAgICAgID0gcmVxdWlyZSAnLi9Sb3V0ZXInXG5cbmNsYXNzIE5hdiBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgQEVWRU5UX0NIQU5HRV9WSUVXICAgICA6ICdFVkVOVF9DSEFOR0VfVklFVydcbiAgICBARVZFTlRfQ0hBTkdFX1NVQl9WSUVXIDogJ0VWRU5UX0NIQU5HRV9TVUJfVklFVydcblxuICAgIHNlY3Rpb25zIDogbnVsbCAjIHNldCB2aWEgd2luZG93LmNvbmZpZyBkYXRhLCBzbyBjYW4gYmUgY29uc2lzdGVudCB3aXRoIGJhY2tlbmRcblxuICAgIGN1cnJlbnQgIDogYXJlYSA6IG51bGwsIHN1YiA6IG51bGwsIHRlciA6IG51bGxcbiAgICBwcmV2aW91cyA6IGFyZWEgOiBudWxsLCBzdWIgOiBudWxsLCB0ZXIgOiBudWxsXG5cbiAgICBjaGFuZ2VWaWV3Q291bnQgOiAwXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAc2VjdGlvbnMgPSB3aW5kb3cuY29uZmlnLnJvdXRlc1xuICAgICAgICBAZmF2aWNvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYXZpY29uJylcblxuICAgICAgICBAQ0QoKS5yb3V0ZXIub24gUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQGNoYW5nZVZpZXdcblxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgIGdldFNlY3Rpb24gOiAoc2VjdGlvbiwgc3RyaWN0PWZhbHNlKSA9PlxuXG4gICAgICAgIGlmICFzdHJpY3QgYW5kIHNlY3Rpb24gaXMgJycgdGhlbiByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIGZvciBzZWN0aW9uTmFtZSwgdXJpIG9mIEBzZWN0aW9uc1xuICAgICAgICAgICAgaWYgdXJpIGlzIHNlY3Rpb24gdGhlbiByZXR1cm4gc2VjdGlvbk5hbWVcblxuICAgICAgICBmYWxzZVxuXG4gICAgY2hhbmdlVmlldzogKGFyZWEsIHN1YiwgdGVyLCBwYXJhbXMpID0+XG5cbiAgICAgICAgIyBjb25zb2xlLmxvZyBcImFyZWFcIixhcmVhXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJzdWJcIixzdWJcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInRlclwiLHRlclxuICAgICAgICAjIGNvbnNvbGUubG9nIFwicGFyYW1zXCIscGFyYW1zXG5cbiAgICAgICAgQGNoYW5nZVZpZXdDb3VudCsrXG5cbiAgICAgICAgQHByZXZpb3VzID0gQGN1cnJlbnRcbiAgICAgICAgQGN1cnJlbnQgID0gYXJlYSA6IGFyZWEsIHN1YiA6IHN1YiwgdGVyIDogdGVyXG5cbiAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9WSUVXLCBAcHJldmlvdXMsIEBjdXJyZW50XG4gICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjdXJyZW50XG5cbiAgICAgICAgaWYgQENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIuaXNPcGVuKCkgdGhlbiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5oaWRlT3Blbk1vZGFsKClcblxuICAgICAgICBAc2V0UGFnZVRpdGxlIGFyZWEsIHN1YiwgdGVyXG4gICAgICAgIEBzZXRQYWdlRmF2aWNvbiBhcmVhXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2V0UGFnZVRpdGxlOiAoYXJlYSwgc3ViLCB0ZXIpID0+XG5cbiAgICAgICAgc2VjdGlvbiAgID0gaWYgYXJlYSBpcyAnJyB0aGVuICdIT01FJyBlbHNlIEBDRCgpLm5hdi5nZXRTZWN0aW9uIGFyZWFcbiAgICAgICAgdGl0bGVUbXBsID0gQENEKCkubG9jYWxlLmdldChcInBhZ2VfdGl0bGVfI3tzZWN0aW9ufVwiKSBvciBAQ0QoKS5sb2NhbGUuZ2V0KFwicGFnZV90aXRsZV9IT01FXCIpXG4gICAgICAgIHRpdGxlID0gQHN1cHBsYW50U3RyaW5nIHRpdGxlVG1wbCwgQGdldFBhZ2VUaXRsZVZhcnMoYXJlYSwgc3ViLCB0ZXIpLCBmYWxzZVxuXG4gICAgICAgIGlmIHdpbmRvdy5kb2N1bWVudC50aXRsZSBpc250IHRpdGxlIHRoZW4gd2luZG93LmRvY3VtZW50LnRpdGxlID0gdGl0bGVcblxuICAgICAgICBudWxsXG5cbiAgICBzZXRQYWdlRmF2aWNvbjogKGFyZWEpID0+XG5cbiAgICAgICAgY29sb3VyID0gc3dpdGNoIGFyZWFcbiAgICAgICAgICAgIHdoZW4gQHNlY3Rpb25zLkhPTUUgdGhlbiAncmVkJ1xuICAgICAgICAgICAgd2hlbiBAc2VjdGlvbnMuQUJPVVQsIEBzZWN0aW9ucy5DT05UUklCVVRFIHRoZW4gJ2JsYWNrJ1xuICAgICAgICAgICAgd2hlbiBAc2VjdGlvbnMuRE9PRExFUyB0aGVuICdibHVlJ1xuICAgICAgICAgICAgZWxzZSAncmVkJ1xuXG4gICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgIEBmYXZpY29uLmhyZWYgPSBcIiN7QENEKCkuQkFTRV9VUkx9L3N0YXRpYy9pbWcvaWNvbnMvZmF2aWNvbi9mYXZpY29uXyN7Y29sb3VyfS5wbmdcIlxuICAgICAgICAsIDBcblxuICAgICAgICBudWxsXG5cbiAgICBnZXRQYWdlVGl0bGVWYXJzOiAoYXJlYSwgc3ViLCB0ZXIpID0+XG5cbiAgICAgICAgdmFycyA9IHt9XG5cbiAgICAgICAgaWYgYXJlYSBpcyBAc2VjdGlvbnMuRE9PRExFUyBhbmQgc3ViIGFuZCB0ZXJcbiAgICAgICAgICAgIGRvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5maW5kV2hlcmUgc2x1ZzogXCIje3N1Yn0vI3t0ZXJ9XCJcblxuICAgICAgICAgICAgaWYgIWRvb2RsZVxuICAgICAgICAgICAgICAgIHZhcnMubmFtZSA9IFwiZG9vZGxlXCJcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB2YXJzLm5hbWUgPSBkb29kbGUuZ2V0KCdhdXRob3IubmFtZScpICsgJyBcXFxcICcgKyBkb29kbGUuZ2V0KCduYW1lJykgKyAnICdcblxuICAgICAgICB2YXJzXG5cbm1vZHVsZS5leHBvcnRzID0gTmF2XG4iLCJjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuICAgIEBFVkVOVF9IQVNIX0NIQU5HRUQgOiAnRVZFTlRfSEFTSF9DSEFOR0VEJ1xuXG4gICAgRklSU1RfUk9VVEUgOiB0cnVlXG5cbiAgICByb3V0ZXMgOlxuICAgICAgICAnKC8pKDphcmVhKSgvOnN1YikoLzp0ZXIpKC8pJyA6ICdoYXNoQ2hhbmdlZCdcbiAgICAgICAgJyphY3Rpb25zJyAgICAgICAgICAgICAgICAgICAgOiAnbmF2aWdhdGVUbydcblxuICAgIGFyZWEgICA6IG51bGxcbiAgICBzdWIgICAgOiBudWxsXG4gICAgdGVyICAgIDogbnVsbFxuICAgIHBhcmFtcyA6IG51bGxcblxuICAgIHN0YXJ0IDogPT5cblxuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0IFxuICAgICAgICAgICAgcHVzaFN0YXRlIDogdHJ1ZVxuICAgICAgICAgICAgcm9vdCAgICAgIDogJy8nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaGFzaENoYW5nZWQgOiAoQGFyZWEgPSBudWxsLCBAc3ViID0gbnVsbCwgQHRlciA9IG51bGwpID0+XG5cbiAgICAgICAgY29uc29sZS5sb2cgXCI+PiBFVkVOVF9IQVNIX0NIQU5HRUQgQGFyZWEgPSAje0BhcmVhfSwgQHN1YiA9ICN7QHN1Yn0sIEB0ZXIgPSAje0B0ZXJ9IDw8XCJcblxuICAgICAgICBpZiBARklSU1RfUk9VVEUgdGhlbiBARklSU1RfUk9VVEUgPSBmYWxzZVxuXG4gICAgICAgIGlmICFAYXJlYSB0aGVuIEBhcmVhID0gQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcblxuICAgICAgICBAdHJpZ2dlciBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAYXJlYSwgQHN1YiwgQHRlciwgQHBhcmFtc1xuXG4gICAgICAgIG51bGxcblxuICAgIG5hdmlnYXRlVG8gOiAod2hlcmUgPSAnJywgdHJpZ2dlciA9IHRydWUsIHJlcGxhY2UgPSBmYWxzZSwgQHBhcmFtcykgPT5cblxuICAgICAgICBpZiB3aGVyZS5jaGFyQXQoMCkgaXNudCBcIi9cIlxuICAgICAgICAgICAgd2hlcmUgPSBcIi8je3doZXJlfVwiXG4gICAgICAgIGlmIHdoZXJlLmNoYXJBdCggd2hlcmUubGVuZ3RoLTEgKSBpc250IFwiL1wiXG4gICAgICAgICAgICB3aGVyZSA9IFwiI3t3aGVyZX0vXCJcblxuICAgICAgICBpZiAhdHJpZ2dlclxuICAgICAgICAgICAgQHRyaWdnZXIgUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgd2hlcmUsIG51bGwsIEBwYXJhbXNcbiAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIEBuYXZpZ2F0ZSB3aGVyZSwgdHJpZ2dlcjogdHJ1ZSwgcmVwbGFjZTogcmVwbGFjZVxuXG4gICAgICAgIG51bGxcblxuICAgIENEIDogPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyXG4iLCIjIyNcbkFuYWx5dGljcyB3cmFwcGVyXG4jIyNcbmNsYXNzIEFuYWx5dGljc1xuXG4gICAgdGFncyAgICA6IG51bGxcbiAgICBzdGFydGVkIDogZmFsc2VcblxuICAgIGF0dGVtcHRzICAgICAgICA6IDBcbiAgICBhbGxvd2VkQXR0ZW1wdHMgOiA1XG5cbiAgICBjb25zdHJ1Y3RvciA6ICh0YWdzLCBAY2FsbGJhY2spIC0+XG5cbiAgICAgICAgJC5nZXRKU09OIHRhZ3MsIEBvblRhZ3NSZWNlaXZlZFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvblRhZ3NSZWNlaXZlZCA6IChkYXRhKSA9PlxuXG4gICAgICAgIEB0YWdzICAgID0gZGF0YVxuICAgICAgICBAc3RhcnRlZCA9IHRydWVcbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgIyMjXG4gICAgQHBhcmFtIHN0cmluZyBpZCBvZiB0aGUgdHJhY2tpbmcgdGFnIHRvIGJlIHB1c2hlZCBvbiBBbmFseXRpY3MgXG4gICAgIyMjXG4gICAgdHJhY2sgOiAocGFyYW0pID0+XG5cbiAgICAgICAgcmV0dXJuIGlmICFAc3RhcnRlZFxuXG4gICAgICAgIGlmIHBhcmFtXG5cbiAgICAgICAgICAgIHYgPSBAdGFnc1twYXJhbV1cblxuICAgICAgICAgICAgaWYgdlxuXG4gICAgICAgICAgICAgICAgYXJncyA9IFsnc2VuZCcsICdldmVudCddXG4gICAgICAgICAgICAgICAgKCBhcmdzLnB1c2goYXJnKSApIGZvciBhcmcgaW4gdlxuXG4gICAgICAgICAgICAgICAgIyBsb2FkaW5nIEdBIGFmdGVyIG1haW4gYXBwIEpTLCBzbyBleHRlcm5hbCBzY3JpcHQgbWF5IG5vdCBiZSBoZXJlIHlldFxuICAgICAgICAgICAgICAgIGlmIHdpbmRvdy5nYVxuICAgICAgICAgICAgICAgICAgICBnYS5hcHBseSBudWxsLCBhcmdzXG4gICAgICAgICAgICAgICAgZWxzZSBpZiBAYXR0ZW1wdHMgPj0gQGFsbG93ZWRBdHRlbXB0c1xuICAgICAgICAgICAgICAgICAgICBAc3RhcnRlZCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICBAdHJhY2sgcGFyYW1cbiAgICAgICAgICAgICAgICAgICAgICAgIEBhdHRlbXB0cysrXG4gICAgICAgICAgICAgICAgICAgICwgMjAwMFxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBbmFseXRpY3NcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuRmFjZWJvb2sgICAgID0gcmVxdWlyZSAnLi4vdXRpbHMvRmFjZWJvb2snXG5Hb29nbGVQbHVzICAgPSByZXF1aXJlICcuLi91dGlscy9Hb29nbGVQbHVzJ1xuXG5jbGFzcyBBdXRoTWFuYWdlciBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdHVzZXJEYXRhICA6IG51bGxcblxuXHQjIEBwcm9jZXNzIHRydWUgZHVyaW5nIGxvZ2luIHByb2Nlc3Ncblx0cHJvY2VzcyAgICAgIDogZmFsc2Vcblx0cHJvY2Vzc1RpbWVyIDogbnVsbFxuXHRwcm9jZXNzV2FpdCAgOiA1MDAwXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHVzZXJEYXRhICA9IEBDRCgpLmFwcERhdGEuVVNFUlxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRsb2dpbiA6IChzZXJ2aWNlLCBjYj1udWxsKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcIisrKysgUFJPQ0VTUyBcIixAcHJvY2Vzc1xuXG5cdFx0cmV0dXJuIGlmIEBwcm9jZXNzXG5cblx0XHRAc2hvd0xvYWRlcigpXG5cdFx0QHByb2Nlc3MgPSB0cnVlXG5cblx0XHQkZGF0YURmZCA9ICQuRGVmZXJyZWQoKVxuXG5cdFx0c3dpdGNoIHNlcnZpY2Vcblx0XHRcdHdoZW4gJ2dvb2dsZSdcblx0XHRcdFx0R29vZ2xlUGx1cy5sb2dpbiAkZGF0YURmZFxuXHRcdFx0d2hlbiAnZmFjZWJvb2snXG5cdFx0XHRcdEZhY2Vib29rLmxvZ2luICRkYXRhRGZkXG5cblx0XHQkZGF0YURmZC5kb25lIChyZXMpID0+IEBhdXRoU3VjY2VzcyBzZXJ2aWNlLCByZXNcblx0XHQkZGF0YURmZC5mYWlsIChyZXMpID0+IEBhdXRoRmFpbCBzZXJ2aWNlLCByZXNcblx0XHQkZGF0YURmZC5hbHdheXMgKCkgPT4gQGF1dGhDYWxsYmFjayBjYlxuXG5cdFx0IyMjXG5cdFx0VW5mb3J0dW5hdGVseSBubyBjYWxsYmFjayBpcyBmaXJlZCBpZiB1c2VyIG1hbnVhbGx5IGNsb3NlcyBHKyBsb2dpbiBtb2RhbCxcblx0XHRzbyB0aGlzIGlzIHRvIGFsbG93IHRoZW0gdG8gY2xvc2Ugd2luZG93IGFuZCB0aGVuIHN1YnNlcXVlbnRseSB0cnkgdG8gbG9nIGluIGFnYWluLi4uXG5cdFx0IyMjXG5cdFx0QHByb2Nlc3NUaW1lciA9IHNldFRpbWVvdXQgQGF1dGhDYWxsYmFjaywgQHByb2Nlc3NXYWl0XG5cblx0XHQkZGF0YURmZFxuXG5cdGF1dGhTdWNjZXNzIDogKHNlcnZpY2UsIGRhdGEpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwibG9naW4gY2FsbGJhY2sgZm9yICN7c2VydmljZX0sIGRhdGEgPT4gXCIsIGRhdGFcblxuXHRcdG51bGxcblxuXHRhdXRoRmFpbCA6IChzZXJ2aWNlLCBkYXRhKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImxvZ2luIGZhaWwgZm9yICN7c2VydmljZX0gPT4gXCIsIGRhdGFcblxuXHRcdG51bGxcblxuXHRhdXRoQ2FsbGJhY2sgOiAoY2I9bnVsbCkgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgQHByb2Nlc3NcblxuXHRcdGNsZWFyVGltZW91dCBAcHJvY2Vzc1RpbWVyXG5cblx0XHRAaGlkZUxvYWRlcigpXG5cdFx0QHByb2Nlc3MgPSBmYWxzZVxuXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHQjIyNcblx0c2hvdyAvIGhpZGUgc29tZSBVSSBpbmRpY2F0b3IgdGhhdCB3ZSBhcmUgd2FpdGluZyBmb3Igc29jaWFsIG5ldHdvcmsgdG8gcmVzcG9uZFxuXHQjIyNcblx0c2hvd0xvYWRlciA6ID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwic2hvd0xvYWRlclwiXG5cblx0XHRudWxsXG5cblx0aGlkZUxvYWRlciA6ID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwiaGlkZUxvYWRlclwiXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXV0aE1hbmFnZXJcbiIsImVuY29kZSA9IHJlcXVpcmUgJ2VudC9lbmNvZGUnXG5cbmNsYXNzIENvZGVXb3JkVHJhbnNpdGlvbmVyXG5cblx0QGNvbmZpZyA6XG5cdFx0TUlOX1dST05HX0NIQVJTIDogMVxuXHRcdE1BWF9XUk9OR19DSEFSUyA6IDdcblxuXHRcdE1JTl9DSEFSX0lOX0RFTEFZIDogNDBcblx0XHRNQVhfQ0hBUl9JTl9ERUxBWSA6IDcwXG5cblx0XHRNSU5fQ0hBUl9PVVRfREVMQVkgOiA0MFxuXHRcdE1BWF9DSEFSX09VVF9ERUxBWSA6IDcwXG5cblx0XHRDSEFSUyA6ICdhYmNkZWZoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSE/KigpQMKjJCVeJl8tKz1bXXt9OjtcXCdcIlxcXFx8PD4sLi9+YCcuc3BsaXQoJycpLm1hcCgoY2hhcikgPT4gcmV0dXJuIGVuY29kZShjaGFyKSlcblxuXHRcdENIQVJfVEVNUExBVEUgOiBcIjxzcGFuIGRhdGEtY29kZXRleHQtY2hhcj1cXFwie3sgY2hhciB9fVxcXCIgZGF0YS1jb2RldGV4dC1jaGFyLXN0YXRlPVxcXCJ7eyBzdGF0ZSB9fVxcXCI+e3sgY2hhciB9fTwvc3Bhbj5cIlxuXG5cdEBfd29yZENhY2hlIDoge31cblxuXHRAX2dldFdvcmRGcm9tQ2FjaGUgOiAoJGVsKSA9PlxuXG5cdFx0aWQgPSAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pZCcpXG5cblx0XHRpZiBpZCBhbmQgQF93b3JkQ2FjaGVbIGlkIF1cblx0XHRcdHdvcmQgPSBAX3dvcmRDYWNoZVsgaWQgXVxuXHRcdGVsc2Vcblx0XHRcdEBfd3JhcENoYXJzICRlbFxuXHRcdFx0d29yZCA9IEBfYWRkV29yZFRvQ2FjaGUgJGVsXG5cblx0XHR3b3JkXG5cblx0QF9hZGRXb3JkVG9DYWNoZSA6ICgkZWwpID0+XG5cblx0XHRjaGFycyA9IFtdXG5cblx0XHQkZWwuZmluZCgnW2RhdGEtY29kZXRleHQtY2hhcl0nKS5lYWNoIChpLCBlbCkgPT5cblx0XHRcdCRjaGFyRWwgPSAkKGVsKVxuXHRcdFx0Y2hhcnMucHVzaFxuXHRcdFx0XHQkZWwgICAgICAgIDogJGNoYXJFbFxuXHRcdFx0XHRyaWdodENoYXIgIDogJGNoYXJFbC5hdHRyKCdkYXRhLWNvZGV0ZXh0LWNoYXInKVxuXG5cdFx0aWQgPSBfLnVuaXF1ZUlkKClcblx0XHQkZWwuYXR0ciAnZGF0YS1jb2Rld29yZC1pZCcsIGlkXG5cblx0XHRAX3dvcmRDYWNoZVsgaWQgXSA9XG5cdFx0XHR3b3JkICAgIDogXy5wbHVjayhjaGFycywgJ3JpZ2h0Q2hhcicpLmpvaW4oJycpXG5cdFx0XHQkZWwgICAgIDogJGVsXG5cdFx0XHRjaGFycyAgIDogY2hhcnNcblx0XHRcdHZpc2libGUgOiB0cnVlXG5cblx0XHRAX3dvcmRDYWNoZVsgaWQgXVxuXG5cdEBfd3JhcENoYXJzIDogKCRlbCkgPT5cblxuXHRcdGNoYXJzID0gJGVsLnRleHQoKS5zcGxpdCgnJylcblx0XHRzdGF0ZSA9ICRlbC5hdHRyKCdkYXRhLWNvZGV3b3JkLWluaXRpYWwtc3RhdGUnKSBvciBcIlwiXG5cdFx0aHRtbCA9IFtdXG5cdFx0Zm9yIGNoYXIgaW4gY2hhcnNcblx0XHRcdGh0bWwucHVzaCBAX3N1cHBsYW50U3RyaW5nIEBjb25maWcuQ0hBUl9URU1QTEFURSwgY2hhciA6IGNoYXIsIHN0YXRlOiBzdGF0ZVxuXG5cdFx0JGVsLmh0bWwgaHRtbC5qb2luKCcnKVxuXG5cdFx0bnVsbFxuXG5cdEBfaXNXb3JkRW1wdHkgOiAod29yZCkgPT5cblxuXHRcdG51bGxcblxuXHQjIEBwYXJhbSB0YXJnZXQgPSAncmlnaHQnLCAnd3JvbmcnLCAnZW1wdHknXG5cdEBfcHJlcGFyZVdvcmQgOiAod29yZCwgdGFyZ2V0LCBjaGFyU3RhdGU9JycpID0+XG5cblx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cblx0XHRcdHRhcmdldENoYXIgPSBzd2l0Y2ggdHJ1ZVxuXHRcdFx0XHR3aGVuIHRhcmdldCBpcyAncmlnaHQnIHRoZW4gY2hhci5yaWdodENoYXJcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ3dyb25nJyB0aGVuIEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICdlbXB0eScgdGhlbiAnJ1xuXHRcdFx0XHRlbHNlIHRhcmdldC5jaGFyQXQoaSkgb3IgJydcblxuXHRcdFx0aWYgdGFyZ2V0Q2hhciBpcyAnICcgdGhlbiB0YXJnZXRDaGFyID0gJyZuYnNwOydcblxuXHRcdFx0Y2hhci53cm9uZ0NoYXJzID0gQF9nZXRSYW5kb21Xcm9uZ0NoYXJzKClcblx0XHRcdGNoYXIudGFyZ2V0Q2hhciA9IHRhcmdldENoYXJcblx0XHRcdGNoYXIuY2hhclN0YXRlICA9IGNoYXJTdGF0ZVxuXG5cdFx0bnVsbFxuXG5cdEBfZ2V0UmFuZG9tV3JvbmdDaGFycyA6ID0+XG5cblx0XHRjaGFycyA9IFtdXG5cblx0XHRjaGFyQ291bnQgPSBfLnJhbmRvbSBAY29uZmlnLk1JTl9XUk9OR19DSEFSUywgQGNvbmZpZy5NQVhfV1JPTkdfQ0hBUlNcblxuXHRcdGZvciBpIGluIFswLi4uY2hhckNvdW50XVxuXHRcdFx0Y2hhcnMucHVzaFxuXHRcdFx0XHRjaGFyICAgICA6IEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdGluRGVsYXkgIDogXy5yYW5kb20gQGNvbmZpZy5NSU5fQ0hBUl9JTl9ERUxBWSwgQGNvbmZpZy5NQVhfQ0hBUl9JTl9ERUxBWVxuXHRcdFx0XHRvdXREZWxheSA6IF8ucmFuZG9tIEBjb25maWcuTUlOX0NIQVJfT1VUX0RFTEFZLCBAY29uZmlnLk1BWF9DSEFSX09VVF9ERUxBWVxuXG5cdFx0Y2hhcnNcblxuXHRAX2dldFJhbmRvbUNoYXIgOiA9PlxuXG5cdFx0Y2hhciA9IEBjb25maWcuQ0hBUlNbIF8ucmFuZG9tKDAsIEBjb25maWcuQ0hBUlMubGVuZ3RoLTEpIF1cblxuXHRcdGNoYXJcblxuXHRAX2dldExvbmdlc3RDaGFyRHVyYXRpb24gOiAoY2hhcnMpID0+XG5cblx0XHRsb25nZXN0VGltZSA9IDBcblx0XHRsb25nZXN0VGltZUlkeCA9IDBcblxuXHRcdGZvciBjaGFyLCBpIGluIGNoYXJzXG5cblx0XHRcdHRpbWUgPSAwXG5cdFx0XHQodGltZSArPSB3cm9uZ0NoYXIuaW5EZWxheSArIHdyb25nQ2hhci5vdXREZWxheSkgZm9yIHdyb25nQ2hhciBpbiBjaGFyLndyb25nQ2hhcnNcblx0XHRcdGlmIHRpbWUgPiBsb25nZXN0VGltZVxuXHRcdFx0XHRsb25nZXN0VGltZSA9IHRpbWVcblx0XHRcdFx0bG9uZ2VzdFRpbWVJZHggPSBpXG5cblx0XHRsb25nZXN0VGltZUlkeFxuXG5cdEBfYW5pbWF0ZUNoYXJzIDogKHdvcmQsIHNlcXVlbnRpYWwsIGNiKSA9PlxuXG5cdFx0YWN0aXZlQ2hhciA9IDBcblxuXHRcdGlmIHNlcXVlbnRpYWxcblx0XHRcdEBfYW5pbWF0ZUNoYXIgd29yZC5jaGFycywgYWN0aXZlQ2hhciwgdHJ1ZSwgY2Jcblx0XHRlbHNlXG5cdFx0XHRsb25nZXN0Q2hhcklkeCA9IEBfZ2V0TG9uZ2VzdENoYXJEdXJhdGlvbiB3b3JkLmNoYXJzXG5cdFx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cdFx0XHRcdGFyZ3MgPSBbIHdvcmQuY2hhcnMsIGksIGZhbHNlIF1cblx0XHRcdFx0aWYgaSBpcyBsb25nZXN0Q2hhcklkeCB0aGVuIGFyZ3MucHVzaCBjYlxuXHRcdFx0XHRAX2FuaW1hdGVDaGFyLmFwcGx5IEAsIGFyZ3NcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVDaGFyIDogKGNoYXJzLCBpZHgsIHJlY3Vyc2UsIGNiKSA9PlxuXG5cdFx0Y2hhciA9IGNoYXJzW2lkeF1cblxuXHRcdGlmIHJlY3Vyc2VcblxuXHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyLCA9PlxuXG5cdFx0XHRcdGlmIGlkeCBpcyBjaGFycy5sZW5ndGgtMVxuXHRcdFx0XHRcdEBfYW5pbWF0ZUNoYXJzRG9uZSBjYlxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0QF9hbmltYXRlQ2hhciBjaGFycywgaWR4KzEsIHJlY3Vyc2UsIGNiXG5cblx0XHRlbHNlXG5cblx0XHRcdGlmIHR5cGVvZiBjYiBpcyAnZnVuY3Rpb24nXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgPT4gQF9hbmltYXRlQ2hhcnNEb25lIGNiXG5cdFx0XHRlbHNlXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhclxuXG5cdFx0bnVsbFxuXG5cdEBfYW5pbWF0ZVdyb25nQ2hhcnMgOiAoY2hhciwgY2IpID0+XG5cblx0XHRpZiBjaGFyLndyb25nQ2hhcnMubGVuZ3RoXG5cblx0XHRcdHdyb25nQ2hhciA9IGNoYXIud3JvbmdDaGFycy5zaGlmdCgpXG5cblx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0Y2hhci4kZWwuaHRtbCB3cm9uZ0NoYXIuY2hhclxuXG5cdFx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsIGNiXG5cdFx0XHRcdCwgd3JvbmdDaGFyLm91dERlbGF5XG5cblx0XHRcdCwgd3JvbmdDaGFyLmluRGVsYXlcblxuXHRcdGVsc2VcblxuXHRcdFx0Y2hhci4kZWxcblx0XHRcdFx0LmF0dHIoJ2RhdGEtY29kZXRleHQtY2hhci1zdGF0ZScsIGNoYXIuY2hhclN0YXRlKVxuXHRcdFx0XHQuaHRtbChjaGFyLnRhcmdldENoYXIpXG5cblx0XHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlQ2hhcnNEb25lIDogKGNiKSA9PlxuXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRAX3N1cHBsYW50U3RyaW5nIDogKHN0ciwgdmFscykgPT5cblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSAve3sgKFtee31dKikgfX0vZywgKGEsIGIpID0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdEB0byA6ICh0YXJnZXRUZXh0LCAkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAdG8odGFyZ2V0VGV4dCwgXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXHRcdHdvcmQudmlzaWJsZSA9IHRydWVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgdGFyZ2V0VGV4dCwgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAaW4gOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQGluKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHR3b3JkLnZpc2libGUgPSB0cnVlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdyaWdodCcsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QG91dCA6ICgkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAb3V0KF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0d29yZC52aXNpYmxlID0gZmFsc2VcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ2VtcHR5JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHNjcmFtYmxlKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICd3cm9uZycsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QHVuc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHVuc2NyYW1ibGUoXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ3JpZ2h0JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAZ2V0U2NyYW1ibGVkV29yZCA6ICh3b3JkKSA9PlxuXG5cdFx0bmV3Q2hhcnMgPSBbXVxuXHRcdChuZXdDaGFycy5wdXNoIEBfZ2V0UmFuZG9tQ2hhcigpKSBmb3IgY2hhciBpbiB3b3JkLnNwbGl0KCcnKVxuXG5cdFx0cmV0dXJuIG5ld0NoYXJzLmpvaW4oJycpXG5cbm1vZHVsZS5leHBvcnRzID0gQ29kZVdvcmRUcmFuc2l0aW9uZXJcblxud2luZG93LkNvZGVXb3JkVHJhbnNpdGlvbmVyPSBDb2RlV29yZFRyYW5zaXRpb25lclxuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5cbiMjI1xuXG5GYWNlYm9vayBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBGYWNlYm9vayBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdEB1cmwgICAgICAgICA6ICcvL2Nvbm5lY3QuZmFjZWJvb2submV0L2VuX1VTL2FsbC5qcydcblxuXHRAcGVybWlzc2lvbnMgOiAnZW1haWwnXG5cblx0QCRkYXRhRGZkICAgIDogbnVsbFxuXHRAbG9hZGVkICAgICAgOiBmYWxzZVxuXG5cdEBsb2FkIDogPT5cblxuXHRcdCMjI1xuXHRcdFRPIERPXG5cdFx0aW5jbHVkZSBzY3JpcHQgbG9hZGVyIHdpdGggY2FsbGJhY2sgdG8gOmluaXRcblx0XHQjIyNcblx0XHQjIHJlcXVpcmUgW0B1cmxdLCBAaW5pdFxuXG5cdFx0bnVsbFxuXG5cdEBpbml0IDogPT5cblxuXHRcdEBsb2FkZWQgPSB0cnVlXG5cblx0XHRGQi5pbml0XG5cdFx0XHRhcHBJZCAgOiB3aW5kb3cuY29uZmlnLmZiX2FwcF9pZFxuXHRcdFx0c3RhdHVzIDogZmFsc2Vcblx0XHRcdHhmYm1sICA6IGZhbHNlXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmICFAbG9hZGVkIHRoZW4gcmV0dXJuIEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0RkIubG9naW4gKCByZXMgKSA9PlxuXG5cdFx0XHRpZiByZXNbJ3N0YXR1cyddIGlzICdjb25uZWN0ZWQnXG5cdFx0XHRcdEBnZXRVc2VyRGF0YSByZXNbJ2F1dGhSZXNwb25zZSddWydhY2Nlc3NUb2tlbiddXG5cdFx0XHRlbHNlXG5cdFx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0LCB7IHNjb3BlOiBAcGVybWlzc2lvbnMgfVxuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdHVzZXJEYXRhID0ge31cblx0XHR1c2VyRGF0YS5hY2Nlc3NfdG9rZW4gPSB0b2tlblxuXG5cdFx0JG1lRGZkICAgPSAkLkRlZmVycmVkKClcblx0XHQkcGljRGZkICA9ICQuRGVmZXJyZWQoKVxuXG5cdFx0RkIuYXBpICcvbWUnLCAocmVzKSAtPlxuXG5cdFx0XHR1c2VyRGF0YS5mdWxsX25hbWUgPSByZXMubmFtZVxuXHRcdFx0dXNlckRhdGEuc29jaWFsX2lkID0gcmVzLmlkXG5cdFx0XHR1c2VyRGF0YS5lbWFpbCAgICAgPSByZXMuZW1haWwgb3IgZmFsc2Vcblx0XHRcdCRtZURmZC5yZXNvbHZlKClcblxuXHRcdEZCLmFwaSAnL21lL3BpY3R1cmUnLCB7ICd3aWR0aCc6ICcyMDAnIH0sIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLnByb2ZpbGVfcGljID0gcmVzLmRhdGEudXJsXG5cdFx0XHQkcGljRGZkLnJlc29sdmUoKVxuXG5cdFx0JC53aGVuKCRtZURmZCwgJHBpY0RmZCkuZG9uZSA9PiBAJGRhdGFEZmQucmVzb2x2ZSB1c2VyRGF0YVxuXG5cdFx0bnVsbFxuXG5cdEBzaGFyZSA6IChvcHRzLCBjYikgPT5cblxuXHRcdEZCLnVpIHtcblx0XHRcdG1ldGhvZCAgICAgIDogb3B0cy5tZXRob2Qgb3IgJ2ZlZWQnXG5cdFx0XHRuYW1lICAgICAgICA6IG9wdHMubmFtZSBvciAnJ1xuXHRcdFx0bGluayAgICAgICAgOiBvcHRzLmxpbmsgb3IgJydcblx0XHRcdHBpY3R1cmUgICAgIDogb3B0cy5waWN0dXJlIG9yICcnXG5cdFx0XHRjYXB0aW9uICAgICA6IG9wdHMuY2FwdGlvbiBvciAnJ1xuXHRcdFx0ZGVzY3JpcHRpb24gOiBvcHRzLmRlc2NyaXB0aW9uIG9yICcnXG5cdFx0fSwgKHJlc3BvbnNlKSAtPlxuXHRcdFx0Y2I/KHJlc3BvbnNlKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2Vib29rXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkdvb2dsZSsgU0RLIHdyYXBwZXIgLSBsb2FkIGFzeW5jaHJvbm91c2x5LCBzb21lIGhlbHBlciBtZXRob2RzXG5cbiMjI1xuY2xhc3MgR29vZ2xlUGx1cyBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdEB1cmwgICAgICA6ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQ6cGx1c29uZS5qcydcblxuXHRAcGFyYW1zICAgOlxuXHRcdCdjbGllbnRpZCcgICAgIDogbnVsbFxuXHRcdCdjYWxsYmFjaycgICAgIDogbnVsbFxuXHRcdCdzY29wZScgICAgICAgIDogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8uZW1haWwnXG5cdFx0J2Nvb2tpZXBvbGljeScgOiAnbm9uZSdcblxuXHRAJGRhdGFEZmQgOiBudWxsXG5cdEBsb2FkZWQgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEBwYXJhbXNbJ2NsaWVudGlkJ10gPSB3aW5kb3cuY29uZmlnLmdwX2FwcF9pZFxuXHRcdEBwYXJhbXNbJ2NhbGxiYWNrJ10gPSBAbG9naW5DYWxsYmFja1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbiA6IChAJGRhdGFEZmQpID0+XG5cblx0XHRpZiBAbG9hZGVkXG5cdFx0XHRnYXBpLmF1dGguc2lnbkluIEBwYXJhbXNcblx0XHRlbHNlXG5cdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdTREsgbm90IGxvYWRlZCdcblxuXHRcdG51bGxcblxuXHRAbG9naW5DYWxsYmFjayA6IChyZXMpID0+XG5cblx0XHRpZiByZXNbJ3N0YXR1cyddWydzaWduZWRfaW4nXVxuXHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYWNjZXNzX3Rva2VuJ11cblx0XHRlbHNlIGlmIHJlc1snZXJyb3InXVsnYWNjZXNzX2RlbmllZCddXG5cdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdubyB3YXkgam9zZSdcblxuXHRcdG51bGxcblxuXHRAZ2V0VXNlckRhdGEgOiAodG9rZW4pID0+XG5cblx0XHRnYXBpLmNsaWVudC5sb2FkICdwbHVzJywndjEnLCA9PlxuXG5cdFx0XHRyZXF1ZXN0ID0gZ2FwaS5jbGllbnQucGx1cy5wZW9wbGUuZ2V0ICd1c2VySWQnOiAnbWUnXG5cdFx0XHRyZXF1ZXN0LmV4ZWN1dGUgKHJlcykgPT5cblxuXHRcdFx0XHR1c2VyRGF0YSA9XG5cdFx0XHRcdFx0YWNjZXNzX3Rva2VuIDogdG9rZW5cblx0XHRcdFx0XHRmdWxsX25hbWUgICAgOiByZXMuZGlzcGxheU5hbWVcblx0XHRcdFx0XHRzb2NpYWxfaWQgICAgOiByZXMuaWRcblx0XHRcdFx0XHRlbWFpbCAgICAgICAgOiBpZiByZXMuZW1haWxzWzBdIHRoZW4gcmVzLmVtYWlsc1swXS52YWx1ZSBlbHNlIGZhbHNlXG5cdFx0XHRcdFx0cHJvZmlsZV9waWMgIDogcmVzLmltYWdlLnVybFxuXG5cdFx0XHRcdEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlUGx1c1xuIiwiIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIE1lZGlhIFF1ZXJpZXMgTWFuYWdlciBcbiMgICAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgICBcbiMgICBAYXV0aG9yIDogRsOhYmlvIEF6ZXZlZG8gPGZhYmlvLmF6ZXZlZG9AdW5pdDkuY29tPiBVTklUOVxuIyAgIEBkYXRlICAgOiBTZXB0ZW1iZXIgMTRcbiMgICBcbiMgICBJbnN0cnVjdGlvbnMgYXJlIG9uIC9wcm9qZWN0L3Nhc3MvdXRpbHMvX3Jlc3BvbnNpdmUuc2Nzcy5cblxuY2xhc3MgTWVkaWFRdWVyaWVzXG5cbiAgICAjIEJyZWFrcG9pbnRzXG4gICAgQFNNQUxMICAgICAgIDogXCJzbWFsbFwiXG4gICAgQElQQUQgICAgICAgIDogXCJpcGFkXCJcbiAgICBATUVESVVNICAgICAgOiBcIm1lZGl1bVwiXG4gICAgQExBUkdFICAgICAgIDogXCJsYXJnZVwiXG4gICAgQEVYVFJBX0xBUkdFIDogXCJleHRyYS1sYXJnZVwiXG5cbiAgICBAc2V0dXAgOiA9PlxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UICA9IHtuYW1lOiBcIlNtYWxsXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLlNNQUxMXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLk1FRElVTV9CUkVBS1BPSU5UID0ge25hbWU6IFwiTWVkaXVtXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLk1FRElVTV19XG4gICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UICA9IHtuYW1lOiBcIkxhcmdlXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLklQQUQsIE1lZGlhUXVlcmllcy5MQVJHRSwgTWVkaWFRdWVyaWVzLkVYVFJBX0xBUkdFXX1cblxuICAgICAgICBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFMgPSBbXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuU01BTExfQlJFQUtQT0lOVFxuICAgICAgICAgICAgTWVkaWFRdWVyaWVzLk1FRElVTV9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTEFSR0VfQlJFQUtQT0lOVFxuICAgICAgICBdXG4gICAgICAgIHJldHVyblxuXG4gICAgQGdldERldmljZVN0YXRlIDogPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSwgXCJhZnRlclwiKS5nZXRQcm9wZXJ0eVZhbHVlKFwiY29udGVudFwiKTtcblxuICAgIEBnZXRCcmVha3BvaW50IDogPT5cblxuICAgICAgICBzdGF0ZSA9IE1lZGlhUXVlcmllcy5nZXREZXZpY2VTdGF0ZSgpXG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5NZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFMubGVuZ3RoXVxuICAgICAgICAgICAgaWYgTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTW2ldLmJyZWFrcG9pbnRzLmluZGV4T2Yoc3RhdGUpID4gLTFcbiAgICAgICAgICAgICAgICByZXR1cm4gTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTW2ldLm5hbWVcblxuICAgICAgICByZXR1cm4gXCJcIlxuXG4gICAgQGlzQnJlYWtwb2ludCA6IChicmVha3BvaW50KSA9PlxuXG4gICAgICAgIGZvciBpIGluIFswLi4uYnJlYWtwb2ludC5icmVha3BvaW50cy5sZW5ndGhdXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIGJyZWFrcG9pbnQuYnJlYWtwb2ludHNbaV0gPT0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG53aW5kb3cuTWVkaWFRdWVyaWVzID0gTWVkaWFRdWVyaWVzXG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWFRdWVyaWVzXG4iLCJjbGFzcyBOdW1iZXJVdGlsc1xuXG4gICAgQE1BVEhfQ09TOiBNYXRoLmNvcyBcbiAgICBATUFUSF9TSU46IE1hdGguc2luIFxuICAgIEBNQVRIX1JBTkRPTTogTWF0aC5yYW5kb20gXG4gICAgQE1BVEhfQUJTOiBNYXRoLmFic1xuICAgIEBNQVRIX0FUQU4yOiBNYXRoLmF0YW4yXG5cbiAgICBAbGltaXQ6KG51bWJlciwgbWluLCBtYXgpLT5cbiAgICAgICAgcmV0dXJuIE1hdGgubWluKCBNYXRoLm1heChtaW4sbnVtYmVyKSwgbWF4IClcblxuICAgIEBnZXRSYW5kb21Db2xvcjogLT5cblxuICAgICAgICBsZXR0ZXJzID0gJzAxMjM0NTY3ODlBQkNERUYnLnNwbGl0KCcnKVxuICAgICAgICBjb2xvciA9ICcjJ1xuICAgICAgICBmb3IgaSBpbiBbMC4uLjZdXG4gICAgICAgICAgICBjb2xvciArPSBsZXR0ZXJzW01hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDE1KV1cbiAgICAgICAgY29sb3JcblxuICAgIEBnZXRUaW1lU3RhbXBEaWZmIDogKGRhdGUxLCBkYXRlMikgLT5cblxuICAgICAgICAjIEdldCAxIGRheSBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgb25lX2RheSA9IDEwMDAqNjAqNjAqMjRcbiAgICAgICAgdGltZSAgICA9IHt9XG5cbiAgICAgICAgIyBDb252ZXJ0IGJvdGggZGF0ZXMgdG8gbWlsbGlzZWNvbmRzXG4gICAgICAgIGRhdGUxX21zID0gZGF0ZTEuZ2V0VGltZSgpXG4gICAgICAgIGRhdGUyX21zID0gZGF0ZTIuZ2V0VGltZSgpXG5cbiAgICAgICAgIyBDYWxjdWxhdGUgdGhlIGRpZmZlcmVuY2UgaW4gbWlsbGlzZWNvbmRzXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkYXRlMl9tcyAtIGRhdGUxX21zXG5cbiAgICAgICAgIyB0YWtlIG91dCBtaWxsaXNlY29uZHNcbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRpZmZlcmVuY2VfbXMvMTAwMFxuICAgICAgICB0aW1lLnNlY29uZHMgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zICUgNjApXG5cbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRpZmZlcmVuY2VfbXMvNjAgXG4gICAgICAgIHRpbWUubWludXRlcyAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMgJSA2MClcblxuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy82MCBcbiAgICAgICAgdGltZS5ob3VycyAgICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcyAlIDI0KSAgXG5cbiAgICAgICAgdGltZS5kYXlzICAgICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcy8yNClcblxuICAgICAgICB0aW1lXG5cbiAgICBAbWFwOiAoIG51bSwgbWluMSwgbWF4MSwgbWluMiwgbWF4Miwgcm91bmQgPSBmYWxzZSwgY29uc3RyYWluTWluID0gdHJ1ZSwgY29uc3RyYWluTWF4ID0gdHJ1ZSApIC0+XG4gICAgICAgIGlmIGNvbnN0cmFpbk1pbiBhbmQgbnVtIDwgbWluMSB0aGVuIHJldHVybiBtaW4yXG4gICAgICAgIGlmIGNvbnN0cmFpbk1heCBhbmQgbnVtID4gbWF4MSB0aGVuIHJldHVybiBtYXgyXG4gICAgICAgIFxuICAgICAgICBudW0xID0gKG51bSAtIG1pbjEpIC8gKG1heDEgLSBtaW4xKVxuICAgICAgICBudW0yID0gKG51bTEgKiAobWF4MiAtIG1pbjIpKSArIG1pbjJcbiAgICAgICAgaWYgcm91bmQgdGhlbiByZXR1cm4gTWF0aC5yb3VuZChudW0yKVxuXG4gICAgICAgIHJldHVybiBudW0yXG5cbiAgICBAdG9SYWRpYW5zOiAoIGRlZ3JlZSApIC0+XG4gICAgICAgIHJldHVybiBkZWdyZWUgKiAoIE1hdGguUEkgLyAxODAgKVxuXG4gICAgQHRvRGVncmVlOiAoIHJhZGlhbnMgKSAtPlxuICAgICAgICByZXR1cm4gcmFkaWFucyAqICggMTgwIC8gTWF0aC5QSSApXG5cbiAgICBAaXNJblJhbmdlOiAoIG51bSwgbWluLCBtYXgsIGNhbkJlRXF1YWwgKSAtPlxuICAgICAgICBpZiBjYW5CZUVxdWFsIHRoZW4gcmV0dXJuIG51bSA+PSBtaW4gJiYgbnVtIDw9IG1heFxuICAgICAgICBlbHNlIHJldHVybiBudW0gPj0gbWluICYmIG51bSA8PSBtYXhcblxuICAgICMgY29udmVydCBtZXRyZXMgaW4gdG8gbSAvIEtNXG4gICAgQGdldE5pY2VEaXN0YW5jZTogKG1ldHJlcykgPT5cblxuICAgICAgICBpZiBtZXRyZXMgPCAxMDAwXG5cbiAgICAgICAgICAgIHJldHVybiBcIiN7TWF0aC5yb3VuZChtZXRyZXMpfU1cIlxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAga20gPSAobWV0cmVzLzEwMDApLnRvRml4ZWQoMilcbiAgICAgICAgICAgIHJldHVybiBcIiN7a219S01cIlxuXG4gICAgIyBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyNjczMzhcbiAgICBAemVyb0ZpbGw6ICggbnVtYmVyLCB3aWR0aCApID0+XG5cbiAgICAgICAgd2lkdGggLT0gbnVtYmVyLnRvU3RyaW5nKCkubGVuZ3RoXG5cbiAgICAgICAgaWYgd2lkdGggPiAwXG4gICAgICAgICAgICByZXR1cm4gbmV3IEFycmF5KCB3aWR0aCArICgvXFwuLy50ZXN0KCBudW1iZXIgKSA/IDIgOiAxKSApLmpvaW4oICcwJyApICsgbnVtYmVyXG5cbiAgICAgICAgcmV0dXJuIG51bWJlciArIFwiXCIgIyBhbHdheXMgcmV0dXJuIGEgc3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyVXRpbHNcbiIsIiMjI1xuIyBSZXF1ZXN0ZXIgI1xuXG5XcmFwcGVyIGZvciBgJC5hamF4YCBjYWxsc1xuXG4jIyNcbmNsYXNzIFJlcXVlc3RlclxuXG4gICAgQHJlcXVlc3RzIDogW11cblxuICAgIEByZXF1ZXN0OiAoIGRhdGEgKSA9PlxuICAgICAgICAjIyNcbiAgICAgICAgYGRhdGEgPSB7YDxicj5cbiAgICAgICAgYCAgdXJsICAgICAgICAgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgICB0eXBlICAgICAgICA6IFwiUE9TVC9HRVQvUFVUXCJgPGJyPlxuICAgICAgICBgICBkYXRhICAgICAgICA6IE9iamVjdGA8YnI+XG4gICAgICAgIGAgIGRhdGFUeXBlICAgIDogalF1ZXJ5IGRhdGFUeXBlYDxicj5cbiAgICAgICAgYCAgY29udGVudFR5cGUgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgfWBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgciA9ICQuYWpheCB7XG5cbiAgICAgICAgICAgIHVybCAgICAgICAgIDogZGF0YS51cmxcbiAgICAgICAgICAgIHR5cGUgICAgICAgIDogaWYgZGF0YS50eXBlIHRoZW4gZGF0YS50eXBlIGVsc2UgXCJQT1NUXCIsXG4gICAgICAgICAgICBkYXRhICAgICAgICA6IGlmIGRhdGEuZGF0YSB0aGVuIGRhdGEuZGF0YSBlbHNlIG51bGwsXG4gICAgICAgICAgICBkYXRhVHlwZSAgICA6IGlmIGRhdGEuZGF0YVR5cGUgdGhlbiBkYXRhLmRhdGFUeXBlIGVsc2UgXCJqc29uXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZSA6IGlmIGRhdGEuY29udGVudFR5cGUgdGhlbiBkYXRhLmNvbnRlbnRUeXBlIGVsc2UgXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLThcIixcbiAgICAgICAgICAgIHByb2Nlc3NEYXRhIDogaWYgZGF0YS5wcm9jZXNzRGF0YSAhPSBudWxsIGFuZCBkYXRhLnByb2Nlc3NEYXRhICE9IHVuZGVmaW5lZCB0aGVuIGRhdGEucHJvY2Vzc0RhdGEgZWxzZSB0cnVlXG5cbiAgICAgICAgfVxuXG4gICAgICAgIHIuZG9uZSBkYXRhLmRvbmVcbiAgICAgICAgci5mYWlsIGRhdGEuZmFpbFxuICAgICAgICBcbiAgICAgICAgclxuXG4gICAgQGFkZEltYWdlIDogKGRhdGEsIGRvbmUsIGZhaWwpID0+XG4gICAgICAgICMjI1xuICAgICAgICAqKiBVc2FnZTogPGJyPlxuICAgICAgICBgZGF0YSA9IGNhbnZhc3MudG9EYXRhVVJMKFwiaW1hZ2UvanBlZ1wiKS5zbGljZShcImRhdGE6aW1hZ2UvanBlZztiYXNlNjQsXCIubGVuZ3RoKWA8YnI+XG4gICAgICAgIGBSZXF1ZXN0ZXIuYWRkSW1hZ2UgZGF0YSwgXCJ6b2V0cm9wZVwiLCBAZG9uZSwgQGZhaWxgXG4gICAgICAgICMjI1xuXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJ1xuICAgICAgICAgICAgdHlwZSAgIDogJ1BPU1QnXG4gICAgICAgICAgICBkYXRhICAgOiB7aW1hZ2VfYmFzZTY0IDogZW5jb2RlVVJJKGRhdGEpfVxuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxuICAgIEBkZWxldGVJbWFnZSA6IChpZCwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJytpZFxuICAgICAgICAgICAgdHlwZSAgIDogJ0RFTEVURSdcbiAgICAgICAgICAgIGRvbmUgICA6IGRvbmVcbiAgICAgICAgICAgIGZhaWwgICA6IGZhaWxcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdGVyXG4iLCIjIyNcblNoYXJpbmcgY2xhc3MgZm9yIG5vbi1TREsgbG9hZGVkIHNvY2lhbCBuZXR3b3Jrcy5cbklmIFNESyBpcyBsb2FkZWQsIGFuZCBwcm92aWRlcyBzaGFyZSBtZXRob2RzLCB0aGVuIHVzZSB0aGF0IGNsYXNzIGluc3RlYWQsIGVnLiBgRmFjZWJvb2suc2hhcmVgIGluc3RlYWQgb2YgYFNoYXJlLmZhY2Vib29rYFxuIyMjXG5jbGFzcyBTaGFyZVxuXG4gICAgdXJsIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAtPlxuXG4gICAgICAgIEB1cmwgPSBAQ0QoKS5CQVNFX1VSTFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvcGVuV2luIDogKHVybCwgdywgaCkgPT5cblxuICAgICAgICBsZWZ0ID0gKCBzY3JlZW4uYXZhaWxXaWR0aCAgLSB3ICkgPj4gMVxuICAgICAgICB0b3AgID0gKCBzY3JlZW4uYXZhaWxIZWlnaHQgLSBoICkgPj4gMVxuXG4gICAgICAgIHdpbmRvdy5vcGVuIHVybCwgJycsICd0b3A9Jyt0b3ArJyxsZWZ0PScrbGVmdCsnLHdpZHRoPScrdysnLGhlaWdodD0nK2grJyxsb2NhdGlvbj1ubyxtZW51YmFyPW5vJ1xuXG4gICAgICAgIG51bGxcblxuICAgIHBsdXMgOiAoIHVybCApID0+XG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vc2hhcmU/dXJsPSN7dXJsfVwiLCA2NTAsIDM4NVxuXG4gICAgICAgIG51bGxcblxuICAgIHBpbnRlcmVzdCA6ICh1cmwsIG1lZGlhLCBkZXNjcikgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgbWVkaWEgPSBlbmNvZGVVUklDb21wb25lbnQobWVkaWEpXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGRlc2NyKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9I3t1cmx9Jm1lZGlhPSN7bWVkaWF9JmRlc2NyaXB0aW9uPSN7ZGVzY3J9XCIsIDczNSwgMzEwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHVtYmxyIDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnR1bWJsci5jb20vc2hhcmUvcGhvdG8/c291cmNlPSN7bWVkaWF9JmNhcHRpb249I3tkZXNjcn0mY2xpY2tfdGhydT0je3VybH1cIiwgNDUwLCA0MzBcblxuICAgICAgICBudWxsXG5cbiAgICBmYWNlYm9vayA6ICggdXJsICwgY29weSA9ICcnKSA9PiBcblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgZGVjc3IgPSBlbmNvZGVVUklDb21wb25lbnQoY29weSlcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlLnBocD91PSN7dXJsfSZ0PSN7ZGVjc3J9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHdpdHRlciA6ICggdXJsICwgY29weSA9ICcnKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBpZiBjb3B5IGlzICcnXG4gICAgICAgICAgICBjb3B5ID0gQENEKCkubG9jYWxlLmdldCAnc2VvX3R3aXR0ZXJfY2FyZF9kZXNjcmlwdGlvbidcbiAgICAgICAgICAgIFxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldC8/dGV4dD0je2Rlc2NyfSZ1cmw9I3t1cmx9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVucmVuIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2hhcmUucmVucmVuLmNvbS9zaGFyZS9idXR0b25zaGFyZS5kbz9saW5rPVwiICsgdXJsLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHdlaWJvIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2VydmljZS53ZWliby5jb20vc2hhcmUvc2hhcmUucGhwP3VybD0je3VybH0mbGFuZ3VhZ2U9emhfY25cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlXG4iLCJjbGFzcyBBYnN0cmFjdFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblx0ZWwgICAgICAgICAgIDogbnVsbFxuXHRpZCAgICAgICAgICAgOiBudWxsXG5cdGNoaWxkcmVuICAgICA6IG51bGxcblx0dGVtcGxhdGUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZVZhcnMgOiBudWxsXG5cdFxuXHRpbml0aWFsaXplIDogLT5cblx0XHRcblx0XHRAY2hpbGRyZW4gPSBbXVxuXG5cdFx0aWYgQHRlbXBsYXRlXG5cdFx0XHR0bXBIVE1MID0gXy50ZW1wbGF0ZSBAQ0QoKS50ZW1wbGF0ZXMuZ2V0IEB0ZW1wbGF0ZVxuXHRcdFx0QHNldEVsZW1lbnQgdG1wSFRNTCBAdGVtcGxhdGVWYXJzXG5cblx0XHRAJGVsLmF0dHIgJ2lkJywgQGlkIGlmIEBpZFxuXHRcdEAkZWwuYWRkQ2xhc3MgQGNsYXNzTmFtZSBpZiBAY2xhc3NOYW1lXG5cdFx0XG5cdFx0QGluaXQoKVxuXG5cdFx0QHBhdXNlZCA9IGZhbHNlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0dXBkYXRlIDogPT5cblxuXHRcdG51bGxcblxuXHRyZW5kZXIgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGFkZENoaWxkIDogKGNoaWxkLCBwcmVwZW5kID0gZmFsc2UpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdHRhcmdldCA9IGlmIEBhZGRUb1NlbGVjdG9yIHRoZW4gQCRlbC5maW5kKEBhZGRUb1NlbGVjdG9yKS5lcSgwKSBlbHNlIEAkZWxcblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXG5cdFx0aWYgIXByZXBlbmQgXG5cdFx0XHR0YXJnZXQuYXBwZW5kIGNcblx0XHRlbHNlIFxuXHRcdFx0dGFyZ2V0LnByZXBlbmQgY1xuXG5cdFx0QFxuXG5cdHJlcGxhY2UgOiAoZG9tLCBjaGlsZCkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblx0XHRAJGVsLmNoaWxkcmVuKGRvbSkucmVwbGFjZVdpdGgoYylcblxuXHRcdG51bGxcblxuXHRyZW1vdmUgOiAoY2hpbGQpID0+XG5cblx0XHR1bmxlc3MgY2hpbGQ/XG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSAkKGNoaWxkKVxuXHRcdGNoaWxkLmRpc3Bvc2UoKSBpZiBjIGFuZCBjaGlsZC5kaXNwb3NlXG5cblx0XHRpZiBjICYmIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPSAtMVxuXHRcdFx0QGNoaWxkcmVuLnNwbGljZSggQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxIClcblxuXHRcdGMucmVtb3ZlKClcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6IChldmVudCkgPT5cblxuXHRcdChpZiBjaGlsZC5vblJlc2l6ZSB0aGVuIGNoaWxkLm9uUmVzaXplKCkpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRtb3VzZUVuYWJsZWQgOiAoIGVuYWJsZWQgKSA9PlxuXG5cdFx0QCRlbC5jc3Ncblx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogaWYgZW5hYmxlZCB0aGVuIFwiYXV0b1wiIGVsc2UgXCJub25lXCJcblxuXHRcdG51bGxcblxuXHRDU1NUcmFuc2xhdGUgOiAoeCwgeSwgdmFsdWU9JyUnLCBzY2FsZSkgPT5cblxuXHRcdGlmIE1vZGVybml6ci5jc3N0cmFuc2Zvcm1zM2Rcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlM2QoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSwgMClcIlxuXHRcdGVsc2Vcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0pXCJcblxuXHRcdGlmIHNjYWxlIHRoZW4gc3RyID0gXCIje3N0cn0gc2NhbGUoI3tzY2FsZX0pXCJcblxuXHRcdHN0clxuXG5cdHVuTXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnVuTXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC51bk11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC5tdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLm11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZUFsbENoaWxkcmVuOiA9PlxuXG5cdFx0QHJlbW92ZSBjaGlsZCBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0dHJpZ2dlckNoaWxkcmVuIDogKG1zZywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnRyaWdnZXIgbXNnXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEB0cmlnZ2VyQ2hpbGRyZW4gbXNnLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbkFuZFNlbGYgOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdEBbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0c3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzLCBhbGxvd1NwYWNlcz10cnVlKSAtPlxuXG5cdFx0cmUgPSBpZiBhbGxvd1NwYWNlcyB0aGVuIG5ldyBSZWdFeHAoJ3t7IChbXnt9XSopIH19JywgJ2cnKSBlbHNlIG5ldyBSZWdFeHAoJ3t7KFtee31dKil9fScsICdnJylcblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSByZSwgKGEsIGIpIC0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0IyMjXG5cdFx0b3ZlcnJpZGUgb24gcGVyIHZpZXcgYmFzaXMgLSB1bmJpbmQgZXZlbnQgaGFuZGxlcnMgZXRjXG5cdFx0IyMjXG5cblx0XHRudWxsXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1xuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0Vmlld1BhZ2UgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHRfc2hvd24gICAgIDogZmFsc2Vcblx0X2xpc3RlbmluZyA6IGZhbHNlXG5cblx0c2hvdyA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgIUBfc2hvd25cblx0XHRAX3Nob3duID0gdHJ1ZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLmFkZENoaWxkIEBcblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29uJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAndmlzaWJsZSdcblx0XHRjYj8oKVxuXG5cdFx0aWYgQENEKCkubmF2LmNoYW5nZVZpZXdDb3VudCBpcyAxXG5cdFx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfUFJFTE9BREVSX0hJREUsIEBhbmltYXRlSW5cblx0XHRlbHNlXG5cdFx0XHRAYW5pbWF0ZUluKClcblxuXHRcdG51bGxcblxuXHRoaWRlIDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAX3Nob3duXG5cdFx0QF9zaG93biA9IGZhbHNlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIucmVtb3ZlIEBcblxuXHRcdCMgQGNhbGxDaGlsZHJlbkFuZFNlbGYgJ3NldExpc3RlbmVycycsICdvZmYnXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICdoaWRkZW4nXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRkaXNwb3NlIDogPT5cblxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBzZXR0aW5nIGlzbnQgQF9saXN0ZW5pbmdcblx0XHRAX2xpc3RlbmluZyA9IHNldHRpbmdcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0IyMjXG5cdFx0c3R1YmJlZCBoZXJlLCBvdmVycmlkZSBpbiB1c2VkIHBhZ2UgY2xhc3Nlc1xuXHRcdCMjI1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1BhZ2VcbiIsIkFic3RyYWN0Vmlld1BhZ2UgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuQ29udHJpYnV0b3JzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4uLy4uL2NvbGxlY3Rpb25zL2NvbnRyaWJ1dG9ycy9Db250cmlidXRvcnNDb2xsZWN0aW9uJ1xuUmVxdWVzdGVyICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL1JlcXVlc3RlcidcbkFQSSAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9kYXRhL0FQSSdcblxuY2xhc3MgQWJvdXRQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWFib3V0J1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEBjb250cmlidXRvcnMgPSBuZXcgQ29udHJpYnV0b3JzQ29sbGVjdGlvblxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0bGFiZWxfd2hhdCAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2xhYmVsX3doYXRcIlxuXHRcdFx0Y29udGVudF93aGF0ICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2NvbnRlbnRfd2hhdFwiXG5cdFx0XHRsYWJlbF9jb250YWN0ICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfbGFiZWxfY29udGFjdFwiXG5cdFx0XHRjb250ZW50X2NvbnRhY3QgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfY29udGVudF9jb250YWN0XCJcblx0XHRcdGxhYmVsX3dobyAgICAgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9sYWJlbF93aG9cIlxuXG5cdFx0c3VwZXJcblxuXHRcdEBnZXRDb250cmlidXRvcnNDb250ZW50KClcblxuXHRcdHJldHVybiBudWxsXG5cblx0Z2V0Q29udHJpYnV0b3JzQ29udGVudCA6ID0+XG5cblx0XHRyID0gUmVxdWVzdGVyLnJlcXVlc3RcbiAgICAgICAgICAgICMgdXJsICA6IEFQSS5nZXQoJ3N0YXJ0JylcbiAgICAgICAgICAgIHVybCAgOiBAQ0QoKS5CQVNFX1VSTCArICcvZGF0YS9fRFVNTVkvY29udHJpYnV0b3JzLmpzb24nXG4gICAgICAgICAgICB0eXBlIDogJ0dFVCdcblxuICAgICAgICByLmRvbmUgKHJlcykgPT5cbiAgICAgICAgXHRAY29udHJpYnV0b3JzLmFkZCByZXMuY29udHJpYnV0b3JzXG4gICAgICAgIFx0QCRlbC5maW5kKCdbZGF0YS1jb250cmlidXRvcnNdJykuaHRtbCBAY29udHJpYnV0b3JzLmdldEFib3V0SFRNTCgpXG5cbiAgICAgICAgci5mYWlsIChyZXMpID0+IGNvbnNvbGUuZXJyb3IgXCJwcm9ibGVtIGdldHRpbmcgdGhlIGNvbnRyaWJ1dG9yc1wiLCByZXNcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYm91dFBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEZvb3RlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnc2l0ZS1mb290ZXInXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0ge31cblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGb290ZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuUm91dGVyICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvUm91dGVyJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgSGVhZGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0dGVtcGxhdGUgOiAnc2l0ZS1oZWFkZXInXG5cblx0RklSU1RfSEFTSENIQU5HRSA6IHRydWVcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID1cblx0XHRcdGhvbWUgICAgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfbG9nb19sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0YWJvdXQgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfYWJvdXRfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUXG5cdFx0XHRcdHNlY3Rpb24gIDogQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUXG5cdFx0XHRjb250cmlidXRlIDogXG5cdFx0XHRcdGxhYmVsICAgIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2NvbnRyaWJ1dGVfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEVcblx0XHRcdFx0c2VjdGlvbiAgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0Y2xvc2VfbGFiZWwgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY2xvc2VfbGFiZWwnKVxuXHRcdFx0aW5mb19sYWJlbCA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9pbmZvX2xhYmVsJylcblxuXHRcdHN1cGVyKClcblxuXHRcdEBiaW5kRXZlbnRzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGxvZ28gICAgICAgICAgICAgID0gQCRlbC5maW5kKCcubG9nb19fbGluaycpXG5cdFx0QCRuYXZMaW5rQWJvdXQgICAgICA9IEAkZWwuZmluZCgnLmFib3V0LWJ0bicpXG5cdFx0QCRuYXZMaW5rQ29udHJpYnV0ZSA9IEAkZWwuZmluZCgnLmNvbnRyaWJ1dGUtYnRuJylcblx0XHRAJGluZm9CdG4gICAgICAgICAgID0gQCRlbC5maW5kKCcuaW5mby1idG4nKVxuXHRcdEAkY2xvc2VCdG4gICAgICAgICAgPSBAJGVsLmZpbmQoJy5jbG9zZS1idG4nKVxuXG5cdFx0bnVsbFxuXG5cdGJpbmRFdmVudHMgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1BSRUxPQURFUl9ISURFLCBAYW5pbWF0ZVRleHRJblxuXHRcdEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAb25IYXNoQ2hhbmdlXG5cblx0XHRAJGVsLm9uICdtb3VzZWVudGVyJywgJ1tkYXRhLWNvZGV3b3JkXScsIEBvbldvcmRFbnRlclxuXHRcdEAkZWwub24gJ21vdXNlbGVhdmUnLCAnW2RhdGEtY29kZXdvcmRdJywgQG9uV29yZExlYXZlXG5cblx0XHRudWxsXG5cblx0b25IYXNoQ2hhbmdlIDogKHdoZXJlKSA9PlxuXG5cdFx0aWYgQEZJUlNUX0hBU0hDSEFOR0Vcblx0XHRcdEBGSVJTVF9IQVNIQ0hBTkdFID0gZmFsc2Vcblx0XHRcdHJldHVyblxuXHRcdFxuXHRcdEBvbkFyZWFDaGFuZ2Ugd2hlcmVcblxuXHRcdG51bGxcblxuXHRvbkFyZWFDaGFuZ2UgOiAoc2VjdGlvbikgPT5cblxuXHRcdGNvbG91ciA9IEBnZXRTZWN0aW9uQ29sb3VyIHNlY3Rpb25cblxuXHRcdEAkZWwuYXR0ciAnZGF0YS1zZWN0aW9uJywgc2VjdGlvblxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRsb2dvLCBjb2xvdXJcblxuXHRcdCMgdGhpcyBqdXN0IGZvciB0ZXN0aW5nLCB0aWR5IGxhdGVyXG5cdFx0aWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFU1xuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZV0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVRcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJG5hdkxpbmtDb250cmlidXRlLCBAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQWJvdXRdLCAnYmxhY2snXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkaW5mb0J0bl0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0Fib3V0LCBAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQ29udHJpYnV0ZV0sICdibGFjaydcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0ZWxzZVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG5dLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRuYXZMaW5rQWJvdXQsIEAkbmF2TGlua0NvbnRyaWJ1dGUsIEAkaW5mb0J0bl0sIGNvbG91clxuXG5cdFx0bnVsbFxuXG5cdGdldFNlY3Rpb25Db2xvdXIgOiAoc2VjdGlvbiwgd29yZFNlY3Rpb249bnVsbCkgPT5cblxuXHRcdHNlY3Rpb24gPSBzZWN0aW9uIG9yIEBDRCgpLm5hdi5jdXJyZW50LmFyZWEgb3IgJ2hvbWUnXG5cblx0XHRpZiB3b3JkU2VjdGlvbiBhbmQgc2VjdGlvbiBpcyB3b3JkU2VjdGlvbiB0aGVuIHJldHVybiAnYmxhY2snXG5cblx0XHRjb2xvdXIgPSBzd2l0Y2ggc2VjdGlvblxuXHRcdFx0d2hlbiAnaG9tZScgdGhlbiAncmVkJ1xuXHRcdFx0d2hlbiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQgdGhlbiAnd2hpdGUnXG5cdFx0XHR3aGVuIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFIHRoZW4gJ3doaXRlJ1xuXHRcdFx0ZWxzZSAnd2hpdGUnXG5cblx0XHRjb2xvdXJcblxuXHRhbmltYXRlVGV4dEluIDogPT5cblxuXHRcdEBvbkFyZWFDaGFuZ2UgQENEKCkubmF2LmN1cnJlbnQuYXJlYVxuXG5cdFx0bnVsbFxuXG5cdG9uV29yZEVudGVyIDogKGUpID0+XG5cblx0XHQkZWwgPSAkKGUuY3VycmVudFRhcmdldClcblx0XHR3b3JkU2VjdGlvbiA9ICRlbC5hdHRyKCdkYXRhLXdvcmQtc2VjdGlvbicpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5zY3JhbWJsZSAkZWwsIEBnZXRTZWN0aW9uQ29sb3VyKG51bGwsIHdvcmRTZWN0aW9uKVxuXG5cdFx0bnVsbFxuXG5cdG9uV29yZExlYXZlIDogKGUpID0+XG5cblx0XHQkZWwgPSAkKGUuY3VycmVudFRhcmdldClcblx0XHR3b3JkU2VjdGlvbiA9ICRlbC5hdHRyKCdkYXRhLXdvcmQtc2VjdGlvbicpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci51bnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIobnVsbCwgd29yZFNlY3Rpb24pXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Ib21lVmlldyAgICAgPSByZXF1aXJlICcuLi9ob21lL0hvbWVWaWV3J1xuQ29sb3JzICAgICAgID0gcmVxdWlyZSAnLi4vLi4vY29uZmlnL0NvbG9ycydcblxuY2xhc3MgUGFnZVRyYW5zaXRpb25lciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAncGFnZS10cmFuc2l0aW9uZXInXG5cbiAgICBwYWdlTGFiZWxzIDogbnVsbFxuXG4gICAgcGFsZXR0ZXMgOlxuICAgICAgICBIT01FICAgICAgIDogWyBDb2xvcnMuQ0RfQkxVRSwgQ29sb3JzLk9GRl9XSElURSwgQ29sb3JzLkNEX1JFRCBdXG4gICAgICAgIEFCT1VUICAgICAgOiBbIENvbG9ycy5DRF9SRUQsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9CTFVFIF1cbiAgICAgICAgQ09OVFJJQlVURSA6IFsgQ29sb3JzLkNEX0JMVUUsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9SRUQgXVxuICAgICAgICBET09ETEVTICAgIDogWyBDb2xvcnMuQ0RfUkVELCBDb2xvcnMuT0ZGX1dISVRFLCBDb2xvcnMuQ0RfQkxVRSBdXG5cbiAgICBhY3RpdmVDb25maWcgOiBudWxsXG5cbiAgICBjb25maWdQcmVzZXRzIDpcbiAgICAgICAgYm90dG9tVG9Ub3AgOlxuICAgICAgICAgICAgZmluYWxUcmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoMCwgLTEwMCUsIDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKDAsIDEwMCUsIDApJ1xuICAgICAgICAgICAgZW5kIDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICdub25lJ1xuICAgICAgICB0b3BUb0JvdHRvbSA6XG4gICAgICAgICAgICBmaW5hbFRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgwLCAxMDAlLCAwKSdcbiAgICAgICAgICAgIHN0YXJ0IDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICd0cmFuc2xhdGUzZCgwLCAtMTAwJSwgMCknXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ25vbmUnXG4gICAgICAgIGxlZnRUb1JpZ2h0IDpcbiAgICAgICAgICAgIGZpbmFsVHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKDEwMCUsIDAsIDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKC0xMDAlLCAwLCAwKSdcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm0gOiAnbm9uZSdcbiAgICAgICAgcmlnaHRUb0xlZnQgOlxuICAgICAgICAgICAgZmluYWxUcmFuc2Zvcm0gOiAndHJhbnNsYXRlM2QoLTEwMCUsIDAsIDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtIDogJ3RyYW5zbGF0ZTNkKDEwMCUsIDAsIDApJ1xuICAgICAgICAgICAgZW5kIDpcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5OiAndmlzaWJsZScsIHRyYW5zZm9ybSA6ICdub25lJ1xuXG4gICAgVFJBTlNJVElPTl9USU1FIDogMC41XG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0gXG4gICAgICAgICAgICBwYWdlTGFiZWxzIDpcbiAgICAgICAgICAgICAgICBIT01FICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcInBhZ2VfdHJhbnNpdGlvbmVyX2xhYmVsX0hPTUVcIlxuICAgICAgICAgICAgICAgIEFCT1VUICAgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfQUJPVVRcIlxuICAgICAgICAgICAgICAgIENPTlRSSUJVVEUgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfQ09OVFJJQlVURVwiXG4gICAgICAgICAgICBwYWdlTGFiZWxQcmVmaXggOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfcHJlZml4XCJcblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEAkcGFuZXMgICAgID0gQCRlbC5maW5kKCdbZGF0YS1wYW5lXScpXG4gICAgICAgIEAkbGFiZWxQYW5lID0gQCRlbC5maW5kKCdbZGF0YS1sYWJlbC1wYW5lXScpXG4gICAgICAgIEAkbGFiZWwgICAgID0gQCRlbC5maW5kKCdbZGF0YS1sYWJlbF0nKVxuXG4gICAgICAgIG51bGxcblxuICAgIHByZXBhcmUgOiAoZnJvbUFyZWEsIHRvQXJlYSkgPT5cblxuICAgICAgICBAcmVzZXRQYW5lcygpXG5cbiAgICAgICAgQGFwcGx5UGFsZXR0ZSBAZ2V0UGFsZXR0ZSB0b0FyZWFcblxuICAgICAgICBAYWN0aXZlQ29uZmlnID0gQGdldENvbmZpZyhmcm9tQXJlYSwgdG9BcmVhKVxuXG4gICAgICAgIEBhcHBseUNvbmZpZyBAYWN0aXZlQ29uZmlnLnN0YXJ0LCB0b0FyZWFcbiAgICAgICAgQGFwcGx5TGFiZWxDb25maWcgQGFjdGl2ZUNvbmZpZy5maW5hbFRyYW5zZm9ybVxuXG4gICAgICAgIEBhcHBseUxhYmVsIEBnZXRBcmVhTGFiZWwgdG9BcmVhXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVzZXRQYW5lcyA6ID0+XG5cbiAgICAgICAgQCRwYW5lcy5hdHRyICdzdHlsZSc6ICcnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0QXJlYUxhYmVsIDogKGFyZWEsIGRpcmVjdGlvbj0ndG8nKSA9PlxuXG4gICAgICAgIHNlY3Rpb24gPSBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBhcmVhLCB0cnVlXG5cbiAgICAgICAgaWYgc2VjdGlvbiBpcyAnRE9PRExFUydcbiAgICAgICAgICAgIGxhYmVsID0gQGdldERvb2RsZUxhYmVsIGRpcmVjdGlvblxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYWJlbCA9IEB0ZW1wbGF0ZVZhcnMucGFnZUxhYmVsc1tzZWN0aW9uXVxuXG4gICAgICAgIGxhYmVsXG5cbiAgICBnZXREb29kbGVMYWJlbCA6IChkaXJlY3Rpb24pID0+XG5cbiAgICAgICAgc2VjdGlvbiA9IGlmIGRpcmVjdGlvbiBpcyAndG8nIHRoZW4gJ2N1cnJlbnQnIGVsc2UgJ3ByZXZpb3VzJ1xuICAgICAgICBkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZ2V0RG9vZGxlQnlOYXZTZWN0aW9uIHNlY3Rpb25cblxuICAgICAgICBpZiBkb29kbGVcbiAgICAgICAgICAgIGxhYmVsID0gZG9vZGxlLmdldCgnYXV0aG9yLm5hbWUnKSArICcgXFxcXCAnICsgZG9vZGxlLmdldCgnbmFtZScpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxhYmVsID0gJ2Rvb2RsZSdcblxuICAgICAgICBsYWJlbFxuXG4gICAgYXBwbHlMYWJlbCA6ICh0b0xhYmVsKSA9PlxuXG4gICAgICAgIEAkbGFiZWwuaHRtbCBAdGVtcGxhdGVWYXJzLnBhZ2VMYWJlbFByZWZpeCArICcgJyArIHRvTGFiZWwgKyAnLi4uJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGdldFBhbGV0dGUgOiAoYXJlYSkgPT5cblxuICAgICAgICBzZWN0aW9uID0gQENEKCkubmF2LmdldFNlY3Rpb24gYXJlYSwgdHJ1ZVxuXG4gICAgICAgIEBwYWxldHRlc1tzZWN0aW9uXSBvciBAcGFsZXR0ZXMuSE9NRVxuXG4gICAgYXBwbHlQYWxldHRlIDogKHBhbGV0dGUpID0+XG5cbiAgICAgICAgQCRwYW5lcy5lYWNoIChpKSA9PiBAJHBhbmVzLmVxKGkpLmNzcyAnYmFja2dyb3VuZC1jb2xvcicgOiBwYWxldHRlW2ldXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0Q29uZmlnIDogKGZyb21BcmVhLCB0b0FyZWEpID0+XG5cbiAgICAgICAgaWYgIUhvbWVWaWV3LnZpc2l0ZWRUaGlzU2Vzc2lvbiBhbmQgdG9BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG4gICAgICAgICAgICBjb25maWcgPSBAY29uZmlnUHJlc2V0cy5ib3R0b21Ub1RvcFxuXG4gICAgICAgIGVsc2UgaWYgZnJvbUFyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMgYW5kIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFU1xuICAgICAgICAgICAgY29uZmlnID0gQF9nZXREb29kbGVUb0Rvb2RsZUNvbmZpZygpXG5cbiAgICAgICAgZWxzZSBpZiB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUIG9yIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuICAgICAgICAgICAgIyBjb25maWcgPSBAY29uZmlnUHJlc2V0cy50b3BUb0JvdHRvbVxuICAgICAgICAgICAgY29uZmlnID0gQF9nZXRSYW5kb21Db25maWcoKVxuXG4gICAgICAgICMgZWxzZSBpZiBmcm9tQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRSBvciB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgIyBjb25maWcgPSBAY29uZmlnUHJlc2V0cy5ib3R0b21Ub1RvcFxuICAgICAgICAgICAgY29uZmlnID0gQF9nZXRSYW5kb21Db25maWcoKVxuXG4gICAgICAgIGNvbmZpZ1xuXG4gICAgX2dldERvb2RsZVRvRG9vZGxlQ29uZmlnIDogKHByZXZTbHVnLCBuZXh0U2x1ZykgPT5cblxuICAgICAgICBwcmV2aW91c0Rvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5nZXREb29kbGVCeU5hdlNlY3Rpb24gJ3ByZXZpb3VzJ1xuICAgICAgICBwcmV2aW91c0Rvb2RsZUlkeCA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5pbmRleE9mIHByZXZpb3VzRG9vZGxlXG5cbiAgICAgICAgY3VycmVudERvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5nZXREb29kbGVCeU5hdlNlY3Rpb24gJ2N1cnJlbnQnXG4gICAgICAgIGN1cnJlbnREb29kbGVJZHggPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuaW5kZXhPZiBjdXJyZW50RG9vZGxlXG5cbiAgICAgICAgX2NvbmZpZyA9IGlmIHByZXZpb3VzRG9vZGxlSWR4ID4gY3VycmVudERvb2RsZUlkeCB0aGVuIEBjb25maWdQcmVzZXRzLmxlZnRUb1JpZ2h0IGVsc2UgQGNvbmZpZ1ByZXNldHMucmlnaHRUb0xlZnRcblxuICAgICAgICBfY29uZmlnXG5cbiAgICBfZ2V0UmFuZG9tQ29uZmlnIDogPT5cblxuICAgICAgICBfY29uZmlnID0gXy5zaHVmZmxlKEBjb25maWdQcmVzZXRzKVswXVxuXG4gICAgICAgIF9jb25maWdcblxuICAgIGFwcGx5Q29uZmlnIDogKGNvbmZpZywgdG9BcmVhPW51bGwpID0+XG5cbiAgICAgICAgQCRwYW5lcy5jc3MgY29uZmlnXG5cbiAgICAgICAgY2xhc3NDaGFuZ2UgPSBpZiB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMgdGhlbiAnYWRkQ2xhc3MnIGVsc2UgJ3JlbW92ZUNsYXNzJ1xuICAgICAgICBAJGVsW2NsYXNzQ2hhbmdlXSAnc2hvdy1kb3RzJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGFwcGx5TGFiZWxDb25maWcgOiAodHJhbnNmb3JtVmFsdWUpID0+XG5cbiAgICAgICAgQCRsYWJlbFBhbmUuY3NzICd0cmFuc2Zvcm0nIDogdHJhbnNmb3JtVmFsdWVcblxuICAgICAgICBudWxsXG5cbiAgICBzaG93IDogPT5cblxuICAgICAgICBAJGVsLmFkZENsYXNzICdzaG93J1xuXG4gICAgICAgIG51bGxcblxuICAgIGhpZGUgOiA9PlxuXG4gICAgICAgIEAkZWwucmVtb3ZlQ2xhc3MgJ3Nob3cnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW4gOiAoY2IpID0+XG5cbiAgICAgICAgQHNob3coKVxuXG4gICAgICAgIGNvbW1vblBhcmFtcyA9IHRyYW5zZm9ybSA6ICdub25lJywgZWFzZSA6IEV4cG8uZWFzZU91dCwgZm9yY2UzRDogdHJ1ZVxuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSwgZWwpID0+XG4gICAgICAgICAgICBwYXJhbXMgPSBfLmV4dGVuZCB7fSwgY29tbW9uUGFyYW1zLFxuICAgICAgICAgICAgICAgIGRlbGF5IDogaSAqIDAuMDVcbiAgICAgICAgICAgIGlmIGkgaXMgMiB0aGVuIHBhcmFtcy5vbkNvbXBsZXRlID0gPT5cbiAgICAgICAgICAgICAgICBAYXBwbHlDb25maWcgQGFjdGl2ZUNvbmZpZy5lbmRcbiAgICAgICAgICAgICAgICBjYj8oKVxuXG4gICAgICAgICAgICBUd2VlbkxpdGUudG8gJChlbCksIEBUUkFOU0lUSU9OX1RJTUUsIHBhcmFtc1xuXG4gICAgICAgIGxhYmVsUGFyYW1zID0gXy5leHRlbmQge30sIGNvbW1vblBhcmFtcywgZGVsYXkgOiAwLjFcbiAgICAgICAgVHdlZW5MaXRlLnRvIEAkbGFiZWxQYW5lLCBAVFJBTlNJVElPTl9USU1FLCBsYWJlbFBhcmFtc1xuXG4gICAgICAgIG51bGxcblxuICAgIG91dCA6IChjYikgPT5cblxuICAgICAgICBjb21tb25QYXJhbXMgPSBlYXNlIDogRXhwby5lYXNlT3V0LCBmb3JjZTNEOiB0cnVlLCBjbGVhclByb3BzOiAnYWxsJ1xuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSwgZWwpID0+XG4gICAgICAgICAgICBwYXJhbXMgPSBfLmV4dGVuZCB7fSwgY29tbW9uUGFyYW1zLCAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRlbGF5ICAgICA6IDAuMSAtICgwLjA1ICogaSlcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm0gOiBAYWN0aXZlQ29uZmlnLmZpbmFsVHJhbnNmb3JtXG4gICAgICAgICAgICBpZiBpIGlzIDAgdGhlbiBwYXJhbXMub25Db21wbGV0ZSA9ID0+XG4gICAgICAgICAgICAgICAgQGhpZGUoKVxuICAgICAgICAgICAgICAgIGNiPygpXG5cbiAgICAgICAgICAgIFR3ZWVuTGl0ZS50byAkKGVsKSwgQFRSQU5TSVRJT05fVElNRSwgcGFyYW1zXG5cbiAgICAgICAgbGFiZWxQYXJhbXMgPSBfLmV4dGVuZCB7fSwgY29tbW9uUGFyYW1zLCB0cmFuc2Zvcm0gOiBAYWN0aXZlQ29uZmlnLnN0YXJ0LnRyYW5zZm9ybVxuICAgICAgICBUd2VlbkxpdGUudG8gQCRsYWJlbFBhbmUsIEBUUkFOU0lUSU9OX1RJTUUsIGxhYmVsUGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhZ2VUcmFuc2l0aW9uZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgUHJlbG9hZGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cdFxuXHRjYiAgICAgICAgICAgICAgOiBudWxsXG5cdFxuXHRUUkFOU0lUSU9OX1RJTUUgOiAwLjVcblxuXHRNSU5fV1JPTkdfQ0hBUlMgOiAwXG5cdE1BWF9XUk9OR19DSEFSUyA6IDRcblxuXHRNSU5fQ0hBUl9JTl9ERUxBWSA6IDMwXG5cdE1BWF9DSEFSX0lOX0RFTEFZIDogMTAwXG5cblx0TUlOX0NIQVJfT1VUX0RFTEFZIDogMzBcblx0TUFYX0NIQVJfT1VUX0RFTEFZIDogMTAwXG5cblx0Q0hBUlMgOiAnYWJjZGVmaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhPyooKUDCoyQlXiZfLSs9W117fTo7XFwnXCJcXFxcfDw+LC4vfmAnLnNwbGl0KCcnKVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEBzZXRFbGVtZW50ICQoJyNwcmVsb2FkZXInKVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkY29kZVdvcmQgPSBAJGVsLmZpbmQoJ1tkYXRhLWNvZGV3b3JkXScpXG5cdFx0QCRiZzEgPSBAJGVsLmZpbmQoJ1tkYXRhLWJnPVwiMVwiXScpXG5cdFx0QCRiZzIgPSBAJGVsLmZpbmQoJ1tkYXRhLWJnPVwiMlwiXScpXG5cblx0XHRudWxsXG5cblx0cGxheUludHJvQW5pbWF0aW9uIDogKEBjYikgPT5cblxuXHRcdGNvbnNvbGUubG9nIFwic2hvdyA6IChAY2IpID0+XCJcblxuXHRcdCMgREVCVUchXG5cdFx0IyByZXR1cm4gQGNiKClcblxuXHRcdEAkZWxcblx0XHRcdC5maW5kKCdbZGF0YS1kb3RzXScpXG5cdFx0XHRcdC5yZW1vdmUoKVxuXHRcdFx0XHQuZW5kKClcblx0XHRcdC5hZGRDbGFzcygnc2hvdy1wcmVsb2FkZXInKVxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRjb2RlV29yZCwgJ3doaXRlJywgZmFsc2UsIEBoaWRlXG5cblx0XHRudWxsXG5cblx0b25TaG93Q29tcGxldGUgOiA9PlxuXG5cdFx0QGNiPygpXG5cblx0XHRudWxsXG5cblx0aGlkZSA6ID0+XG5cblx0XHRAYW5pbWF0ZU91dCBAb25IaWRlQ29tcGxldGVcblxuXHRcdG51bGxcblxuXHRvbkhpZGVDb21wbGV0ZSA6ID0+XG5cblx0XHRAY2I/KClcblxuXHRcdG51bGxcblxuXHRhbmltYXRlT3V0IDogKGNiKSA9PlxuXG5cdFx0IyBAYW5pbWF0ZUNoYXJzT3V0KClcblxuXHRcdCMgdGhhdCdsbCBkb1xuXHRcdCMgc2V0VGltZW91dCBjYiwgMjIwMFxuXG5cdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0YW5hZ3JhbSA9IF8uc2h1ZmZsZSgnY29kZWRvb2RsLmVzJy5zcGxpdCgnJykpLmpvaW4oJycpXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBhbmFncmFtLCBAJGNvZGVXb3JkLCAnd2hpdGUnLCBmYWxzZSwgPT4gQGFuaW1hdGVCZ091dCBjYlxuXHRcdCwgMjAwMFxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVCZ091dCA6IChjYikgPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMSwgMC41LCB7IGRlbGF5IDogMC4yLCB3aWR0aCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0IH1cblx0XHRUd2VlbkxpdGUudG8gQCRiZzEsIDAuNiwgeyBkZWxheSA6IDAuNywgaGVpZ2h0IDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQgfVxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcyLCAwLjQsIHsgZGVsYXkgOiAwLjQsIHdpZHRoIDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMiwgMC41LCB7IGRlbGF5IDogMC44LCBoZWlnaHQgOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCwgb25Db21wbGV0ZSA6IGNiIH1cblxuXHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIEAkY29kZVdvcmQsICcnLCBmYWxzZVxuXHRcdCwgNDAwXG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRAJGVsLnJlbW92ZUNsYXNzKCdzaG93LXByZWxvYWRlcicpXG5cdFx0LCAxMjAwXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUHJlbG9hZGVyXG4iLCJBYnN0cmFjdFZpZXcgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Ib21lVmlldyAgICAgICAgICAgPSByZXF1aXJlICcuLi9ob21lL0hvbWVWaWV3J1xuQWJvdXRQYWdlVmlldyAgICAgID0gcmVxdWlyZSAnLi4vYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcnXG5Db250cmlidXRlUGFnZVZpZXcgPSByZXF1aXJlICcuLi9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcnXG5Eb29kbGVQYWdlVmlldyAgICAgPSByZXF1aXJlICcuLi9kb29kbGVQYWdlL0Rvb2RsZVBhZ2VWaWV3J1xuTmF2ICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vcm91dGVyL05hdidcblxuY2xhc3MgV3JhcHBlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdFZJRVdfVFlQRV9QQUdFICA6ICdwYWdlJ1xuXG5cdHRlbXBsYXRlIDogJ3dyYXBwZXInXG5cblx0dmlld3MgICAgICAgICAgOiBudWxsXG5cdHByZXZpb3VzVmlldyAgIDogbnVsbFxuXHRjdXJyZW50VmlldyAgICA6IG51bGxcblxuXHRwYWdlU3dpdGNoRGZkIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB2aWV3cyA9XG5cdFx0XHRob21lICAgICAgIDogY2xhc3NSZWYgOiBIb21lVmlldywgICAgICAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkhPTUUsICAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRhYm91dCAgICAgIDogY2xhc3NSZWYgOiBBYm91dFBhZ2VWaWV3LCAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkFCT1VULCAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRjb250cmlidXRlIDogY2xhc3NSZWYgOiBDb250cmlidXRlUGFnZVZpZXcsIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEUsIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRkb29kbGUgICAgIDogY2xhc3NSZWYgOiBEb29kbGVQYWdlVmlldywgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMsICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cblx0XHRAY3JlYXRlQ2xhc3NlcygpXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIGRlY2lkZSBpZiB5b3Ugd2FudCB0byBhZGQgYWxsIGNvcmUgRE9NIHVwIGZyb250LCBvciBhZGQgb25seSB3aGVuIHJlcXVpcmVkLCBzZWUgY29tbWVudHMgaW4gQWJzdHJhY3RWaWV3UGFnZS5jb2ZmZWVcblx0XHQjIEBhZGRDbGFzc2VzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0Y3JlYXRlQ2xhc3NlcyA6ID0+XG5cblx0XHQoQHZpZXdzW25hbWVdLnZpZXcgPSBuZXcgQHZpZXdzW25hbWVdLmNsYXNzUmVmKSBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3NcblxuXHRcdG51bGxcblxuXHRhZGRDbGFzc2VzIDogPT5cblxuXHRcdCBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHQgXHRpZiBkYXRhLnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIHRoZW4gQGFkZENoaWxkIGRhdGEudmlld1xuXG5cdFx0bnVsbFxuXG5cdGdldFZpZXdCeVJvdXRlIDogKHJvdXRlKSA9PlxuXG5cdFx0Zm9yIG5hbWUsIGRhdGEgb2YgQHZpZXdzXG5cdFx0XHRyZXR1cm4gQHZpZXdzW25hbWVdIGlmIHJvdXRlIGlzIEB2aWV3c1tuYW1lXS5yb3V0ZVxuXG5cdFx0bnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdG51bGxcblxuXHRzdGFydCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9mZiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdEBiaW5kRXZlbnRzKClcblx0XHRAdXBkYXRlRGltcygpXG5cblx0XHRudWxsXG5cblx0YmluZEV2ZW50cyA6ID0+XG5cblx0XHRAQ0QoKS5uYXYub24gTmF2LkVWRU5UX0NIQU5HRV9WSUVXLCBAY2hhbmdlVmlld1xuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBAY2hhbmdlU3ViVmlld1xuXG5cdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1VQREFURV9ESU1FTlNJT05TLCBAdXBkYXRlRGltc1xuXG5cdFx0bnVsbFxuXG5cdHVwZGF0ZURpbXMgOiA9PlxuXG5cdFx0QCRlbC5jc3MgJ21pbi1oZWlnaHQnLCBAQ0QoKS5hcHBWaWV3LmRpbXMuaFxuXG5cdFx0bnVsbFxuXG5cdGNoYW5nZVZpZXcgOiAocHJldmlvdXMsIGN1cnJlbnQpID0+XG5cblx0XHRpZiBAcGFnZVN3aXRjaERmZCBhbmQgQHBhZ2VTd2l0Y2hEZmQuc3RhdGUoKSBpc250ICdyZXNvbHZlZCdcblx0XHRcdGRvIChwcmV2aW91cywgY3VycmVudCkgPT4gQHBhZ2VTd2l0Y2hEZmQuZG9uZSA9PiBAY2hhbmdlVmlldyBwcmV2aW91cywgY3VycmVudFxuXHRcdFx0cmV0dXJuXG5cblx0XHRAcHJldmlvdXNWaWV3ID0gQGdldFZpZXdCeVJvdXRlIHByZXZpb3VzLmFyZWFcblx0XHRAY3VycmVudFZpZXcgID0gQGdldFZpZXdCeVJvdXRlIGN1cnJlbnQuYXJlYVxuXG5cdFx0aWYgIUBwcmV2aW91c1ZpZXdcblx0XHRcdEB0cmFuc2l0aW9uVmlld3MgZmFsc2UsIEBjdXJyZW50Vmlld1xuXHRcdGVsc2Vcblx0XHRcdEB0cmFuc2l0aW9uVmlld3MgQHByZXZpb3VzVmlldywgQGN1cnJlbnRWaWV3XG5cblx0XHRudWxsXG5cblx0Y2hhbmdlU3ViVmlldyA6IChjdXJyZW50KSA9PlxuXG5cdFx0QGN1cnJlbnRWaWV3LnZpZXcudHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBjdXJyZW50LnN1YlxuXG5cdFx0bnVsbFxuXG5cdHRyYW5zaXRpb25WaWV3cyA6IChmcm9tLCB0bykgPT5cblxuXHRcdEBwYWdlU3dpdGNoRGZkID0gJC5EZWZlcnJlZCgpXG5cblx0XHRpZiBmcm9tIGFuZCB0b1xuXHRcdFx0QENEKCkuYXBwVmlldy50cmFuc2l0aW9uZXIucHJlcGFyZSBmcm9tLnJvdXRlLCB0by5yb3V0ZVxuXHRcdFx0QENEKCkuYXBwVmlldy50cmFuc2l0aW9uZXIuaW4gPT4gZnJvbS52aWV3LmhpZGUgPT4gdG8udmlldy5zaG93ID0+IEBDRCgpLmFwcFZpZXcudHJhbnNpdGlvbmVyLm91dCA9PiBAcGFnZVN3aXRjaERmZC5yZXNvbHZlKClcblx0XHRlbHNlIGlmIGZyb21cblx0XHRcdGZyb20udmlldy5oaWRlIEBwYWdlU3dpdGNoRGZkLnJlc29sdmVcblx0XHRlbHNlIGlmIHRvXG5cdFx0XHR0by52aWV3LnNob3cgQHBhZ2VTd2l0Y2hEZmQucmVzb2x2ZVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyYXBwZXJcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBDb250cmlidXRlUGFnZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1jb250cmlidXRlJ1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGxhYmVsX3N1Ym1pdCAgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2xhYmVsX3N1Ym1pdFwiXG5cdFx0XHRjb250ZW50X3N1Ym1pdCAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiY29udHJpYnV0ZV9jb250ZW50X3N1Ym1pdFwiXG5cdFx0XHRsYWJlbF9jb250YWN0ICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiY29udHJpYnV0ZV9sYWJlbF9jb250YWN0XCJcblx0XHRcdGNvbnRlbnRfY29udGFjdCA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2NvbnRlbnRfY29udGFjdFwiXG5cblx0XHRzdXBlclxuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cmlidXRlUGFnZVZpZXdcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBEb29kbGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWRvb2RsZSdcblx0bW9kZWwgICAgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJkb29kbGVfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBleGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRmcmFtZSA9IEAkZWwuZmluZCgnW2RhdGEtZG9vZGxlLWZyYW1lXScpXG5cblx0c2hvdyA6IChjYikgPT5cblxuXHRcdEBtb2RlbCA9IEBnZXREb29kbGUoKVxuXG5cdFx0QCRmcmFtZS5hdHRyICdzcmMnLCBcImh0dHA6Ly9zb3VyY2UuY29kZWRvb2RsLmVzL3NhbXBsZV9kb29kbGVzL3NoYXBlLXN0cmVhbS9pbmRleC5odG1sXCJcblx0XHRAJGZyYW1lLm9uZSAnbG9hZCcsIGNiXG5cblx0XHRzdXBlcigpXG5cblx0XHRudWxsXG5cblx0Z2V0RG9vZGxlIDogPT5cblxuXHRcdGRvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5nZXREb29kbGVCeVNsdWcgQENEKCkubmF2LmN1cnJlbnQuc3ViKycvJytAQ0QoKS5uYXYuY3VycmVudC50ZXJcblxuXHRcdGRvb2RsZVxuXG5tb2R1bGUuZXhwb3J0cyA9IERvb2RsZVBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXcgICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkNvZGVXb3JkVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXInXG5cbmNsYXNzIEhvbWVHcmlkSXRlbSBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdHRlbXBsYXRlIDogJ2hvbWUtZ3JpZC1pdGVtJ1xuXG5cdGNvbnN0cnVjdG9yIDogKEBtb2RlbCwgQGZ1bGxQYWdlVHJhbnNpdGlvbikgLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBfLmV4dGVuZCB7fSwgQG1vZGVsLnRvSlNPTigpXG5cblx0XHRzdXBlclxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkYXV0aG9yTmFtZSA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmQ9XCJhdXRob3JfbmFtZVwiXScpXG5cdFx0QCRkb29kbGVOYW1lID0gQCRlbC5maW5kKCdbZGF0YS1jb2Rld29yZD1cIm5hbWVcIl0nKVxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QCRlbFtzZXR0aW5nXSAnbW91c2VvdmVyJywgQG9uTW91c2VPdmVyXG5cblx0XHRudWxsXG5cblx0c2hvdyA6ID0+XG5cblx0XHRAJGVsLmFkZENsYXNzICdzaG93LWl0ZW0nXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCdhdXRob3IubmFtZScpLCBAJGF1dGhvck5hbWUsICdibHVlJ1xuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ25hbWUnKSwgQCRkb29kbGVOYW1lLCAnYmx1ZSdcblxuXHRcdEBzZXRMaXN0ZW5lcnMgJ29uJ1xuXG5cdFx0bnVsbFxuXG5cdG9uTW91c2VPdmVyIDogPT5cblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ2F1dGhvci5uYW1lJyksIEAkYXV0aG9yTmFtZSwgJ2JsdWUnXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnbmFtZScpLCBAJGRvb2RsZU5hbWUsICdibHVlJ1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWVHcmlkSXRlbVxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5Ib21lR3JpZEl0ZW0gICAgID0gcmVxdWlyZSAnLi9Ib21lR3JpZEl0ZW0nXG5cbmNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdCMgbWFuYWdlIHN0YXRlIGZvciBob21lVmlldyBvbiBwZXItc2Vzc2lvbiBiYXNpcywgYWxsb3cgbnVtYmVyIG9mXG5cdCMgZ3JpZCBpdGVtcywgYW5kIHNjcm9sbCBwb3NpdGlvbiBvZiBob21lIGdyaWQgdG8gYmUgcGVyc2lzdGVkXG5cdEB2aXNpdGVkVGhpc1Nlc3Npb24gOiBmYWxzZVxuXHRAZ3JpZEl0ZW1zIDogW11cblx0QGRpbXMgOlxuXHRcdGl0ZW0gICAgICA6IGg6IDI2OCwgdzogMjAwLCBtYXJnaW46IDIwLCBhOiAwXG5cdFx0Y29udGFpbmVyIDogaDogMCwgdzogMCwgYTogMFxuXHRAY29sQ291bnQgOiAwXG5cdEBzY3JvbGxEaXN0YW5jZSA6IDBcblxuXHRAU0hPV19ST1dfVEhSRVNIT0xEIDogMC4zICMgaG93IG11Y2ggb2YgYSBncmlkIHJvdyAoc2NhbGUgMCAtPiAxKSBtdXN0IGJlIHZpc2libGUgYmVmb3JlIGl0IGlzIFwic2hvd25cIlxuXG5cdHRlbXBsYXRlICAgICAgOiAncGFnZS1ob21lJ1xuXHRhZGRUb1NlbGVjdG9yIDogJ1tkYXRhLWhvbWUtZ3JpZF0nXG5cblx0YWxsRG9vZGxlcyA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImhvbWVfZGVzY1wiXG5cblx0XHRAYWxsRG9vZGxlcyA9IEBDRCgpLmFwcERhdGEuZG9vZGxlc1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkZ3JpZCA9IEAkZWwuZmluZCgnW2RhdGEtaG9tZS1ncmlkXScpXG5cblx0XHRudWxsXG5cblx0c2V0dXBEaW1zIDogPT5cblxuXHRcdGdyaWRXaWR0aCA9IEAkZ3JpZC5vdXRlcldpZHRoKClcblxuXHRcdEhvbWVWaWV3LmNvbENvdW50ID0gTWF0aC5yb3VuZCBncmlkV2lkdGggLyBIb21lVmlldy5kaW1zLml0ZW0ud1xuXHRcdFxuXHRcdEhvbWVWaWV3LmRpbXMuY29udGFpbmVyID1cblx0XHRcdGg6IEBDRCgpLmFwcFZpZXcuZGltcy5oLCB3OiBncmlkV2lkdGgsIGE6IChAQ0QoKS5hcHBWaWV3LmRpbXMuaCAqIGdyaWRXaWR0aClcblxuXHRcdEhvbWVWaWV3LmRpbXMuaXRlbS5hID0gSG9tZVZpZXcuZGltcy5pdGVtLmggKiAoSG9tZVZpZXcuZGltcy5pdGVtLncgKyAoKEhvbWVWaWV3LmRpbXMuaXRlbS5tYXJnaW4gKiAoSG9tZVZpZXcuY29sQ291bnQgLSAxKSkgLyBIb21lVmlldy5jb2xDb3VudCkpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddIEBDRCgpLmFwcFZpZXcuRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEBvblJlc2l6ZVxuXHRcdEBDRCgpLmFwcFZpZXdbc2V0dGluZ10gQENEKCkuYXBwVmlldy5FVkVOVF9PTl9TQ1JPTEwsIEBvblNjcm9sbFxuXG5cdFx0bnVsbFxuXG5cdG9uUmVzaXplIDogPT5cblxuXHRcdEBzZXR1cERpbXMoKVxuXHRcdEBvblNjcm9sbCgpXG5cblx0XHRudWxsXG5cblx0b25TY3JvbGwgOiA9PlxuXG5cdFx0SG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2UgPSBAQ0QoKS5hcHBWaWV3Lmxhc3RTY3JvbGxZXG5cblx0XHRpdGVtc1RvU2hvdyA9IEBnZXRSZXF1aXJlZERvb2RsZUNvdW50QnlBcmVhKClcblx0XHRpZiBpdGVtc1RvU2hvdyA+IDAgdGhlbiBAYWRkRG9vZGxlcyBpdGVtc1RvU2hvd1xuXG5cdFx0bnVsbFxuXG5cdHNob3cgOiA9PlxuXG5cdFx0c3VwZXJcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0QHNldHVwRGltcygpXG5cblx0XHRpZiAhSG9tZVZpZXcudmlzaXRlZFRoaXNTZXNzaW9uXG5cdFx0XHRAYWRkRG9vZGxlcyBAZ2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSgpLCB0cnVlXG5cdFx0XHRIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb24gPSB0cnVlXG5cdFx0ZWxzZVxuXHRcdFx0QENEKCkuYXBwVmlldy4kd2luZG93LnNjcm9sbFRvcCBIb21lVmlldy5zY3JvbGxEaXN0YW5jZVxuXG5cdFx0bnVsbFxuXG5cdGdldFJlcXVpcmVkRG9vZGxlQ291bnRCeUFyZWEgOiA9PlxuXG5cdFx0dG90YWxBcmVhICA9IEhvbWVWaWV3LmRpbXMuY29udGFpbmVyLmEgKyAoSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2UgKiBIb21lVmlldy5kaW1zLmNvbnRhaW5lci53KVxuXHRcdHRhcmdldFJvd3MgPSAodG90YWxBcmVhIC8gSG9tZVZpZXcuZGltcy5pdGVtLmEpIC8gSG9tZVZpZXcuY29sQ291bnRcblxuXHRcdHRhcmdldEl0ZW1zID0gTWF0aC5mbG9vcih0YXJnZXRSb3dzKSAqIEhvbWVWaWV3LmNvbENvdW50XG5cdFx0dGFyZ2V0SXRlbXMgPSBpZiAodGFyZ2V0Um93cyAlIDEpID4gSG9tZVZpZXcuU0hPV19ST1dfVEhSRVNIT0xEIHRoZW4gdGFyZ2V0SXRlbXMgKyBIb21lVmlldy5jb2xDb3VudCBlbHNlIHRhcmdldEl0ZW1zXG5cblx0XHRyZXR1cm4gdGFyZ2V0SXRlbXMgLSBIb21lVmlldy5ncmlkSXRlbXMubGVuZ3RoXG5cblx0YWRkRG9vZGxlcyA6IChjb3VudCwgZnVsbFBhZ2VUcmFuc2l0aW9uPWZhbHNlKSA9PlxuXG5cdFx0Y29uc29sZS5sb2cgXCJhZGRpbmcgZG9vZGxlcy4uLiB4I3tjb3VudH1cIlxuXG5cdFx0bmV3SXRlbXMgPSBbXVxuXG5cdFx0Zm9yIGlkeCBpbiBbSG9tZVZpZXcuZ3JpZEl0ZW1zLmxlbmd0aC4uLkhvbWVWaWV3LmdyaWRJdGVtcy5sZW5ndGgrY291bnRdXG5cblx0XHRcdGRvb2RsZSA9IEBhbGxEb29kbGVzLmF0IGlkeFxuXHRcdFx0YnJlYWsgaWYgIWRvb2RsZVxuXG5cdFx0XHRuZXdJdGVtcy5wdXNoIG5ldyBIb21lR3JpZEl0ZW0gZG9vZGxlLCBmdWxsUGFnZVRyYW5zaXRpb25cblxuXHRcdEhvbWVWaWV3LmdyaWRJdGVtcyA9IEhvbWVWaWV3LmdyaWRJdGVtcy5jb25jYXQgbmV3SXRlbXNcblxuXHRcdGZvciBpdGVtLCBpZHggaW4gbmV3SXRlbXNcblxuXHRcdFx0QGFkZENoaWxkIGl0ZW1cblx0XHRcdEBhbmltYXRlSXRlbUluIGl0ZW0sIGlkeCwgZnVsbFBhZ2VUcmFuc2l0aW9uXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUl0ZW1JbiA6IChpdGVtLCBpbmRleCwgZnVsbFBhZ2VUcmFuc2l0aW9uPWZhbHNlKSA9PlxuXG5cdFx0ZHVyYXRpb24gICA9IDAuNVxuXHRcdGZyb21QYXJhbXMgPSB5IDogKGlmIGZ1bGxQYWdlVHJhbnNpdGlvbiB0aGVuIHdpbmRvdy5pbm5lckhlaWdodCBlbHNlIDApLCBvcGFjaXR5IDogMCwgc2NhbGUgOiAwLjZcblx0XHR0b1BhcmFtcyAgID0gZGVsYXkgOiAoZHVyYXRpb24gKiAwLjIpICogaW5kZXgsIHkgOiAwLCBvcGFjaXR5IDogMSwgc2NhbGUgOiAxICwgZWFzZSA6IEV4cG8uZWFzZU91dCwgb25Db21wbGV0ZSA6IGl0ZW0uc2hvd1xuXG5cdFx0VHdlZW5MaXRlLmZyb21UbyBpdGVtLiRlbCwgZHVyYXRpb24sIGZyb21QYXJhbXMsIHRvUGFyYW1zXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZVZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RNb2RhbCBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCR3aW5kb3cgOiBudWxsXG5cblx0IyMjIG92ZXJyaWRlIGluIGluZGl2aWR1YWwgY2xhc3NlcyAjIyNcblx0bmFtZSAgICAgOiBudWxsXG5cdHRlbXBsYXRlIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEAkd2luZG93ID0gJCh3aW5kb3cpXG5cblx0XHRzdXBlcigpXG5cblx0XHRAQ0QoKS5hcHBWaWV3LmFkZENoaWxkIEBcblx0XHRAc2V0TGlzdGVuZXJzICdvbidcblx0XHRAYW5pbWF0ZUluKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aGlkZSA6ID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PiBAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAc2V0TGlzdGVuZXJzICdvZmYnXG5cdFx0QENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIubW9kYWxzW0BuYW1lXS52aWV3ID0gbnVsbFxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QCR3aW5kb3dbc2V0dGluZ10gJ2tleXVwJywgQG9uS2V5VXBcblx0XHRAJCgnW2RhdGEtY2xvc2VdJylbc2V0dGluZ10gJ2NsaWNrJywgQGNsb3NlQ2xpY2tcblxuXHRcdG51bGxcblxuXHRvbktleVVwIDogKGUpID0+XG5cblx0XHRpZiBlLmtleUNvZGUgaXMgMjcgdGhlbiBAaGlkZSgpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IFF1YWQuZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwuZmluZCgnLmlubmVyJyksIDAuMywgeyBkZWxheSA6IDAuMTUsICd0cmFuc2Zvcm0nOiAnc2NhbGUoMSknLCAndmlzaWJpbGl0eSc6ICd2aXNpYmxlJywgJ29wYWNpdHknOiAxLCBlYXNlIDogQmFjay5lYXNlT3V0IH1cblxuXHRcdG51bGxcblxuXHRhbmltYXRlT3V0IDogKGNhbGxiYWNrKSA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwsIDAuMywgeyBkZWxheSA6IDAuMTUsICdvcGFjaXR5JzogMCwgZWFzZSA6IFF1YWQuZWFzZU91dCwgb25Db21wbGV0ZTogY2FsbGJhY2sgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgJ3RyYW5zZm9ybSc6ICdzY2FsZSgwLjgpJywgJ29wYWNpdHknOiAwLCBlYXNlIDogQmFjay5lYXNlSW4gfVxuXG5cdFx0bnVsbFxuXG5cdGNsb3NlQ2xpY2s6ICggZSApID0+XG5cblx0XHRlLnByZXZlbnREZWZhdWx0KClcblxuXHRcdEBoaWRlKClcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdE1vZGFsXG4iLCJBYnN0cmFjdE1vZGFsID0gcmVxdWlyZSAnLi9BYnN0cmFjdE1vZGFsJ1xuXG5jbGFzcyBPcmllbnRhdGlvbk1vZGFsIGV4dGVuZHMgQWJzdHJhY3RNb2RhbFxuXG5cdG5hbWUgICAgIDogJ29yaWVudGF0aW9uTW9kYWwnXG5cdHRlbXBsYXRlIDogJ29yaWVudGF0aW9uLW1vZGFsJ1xuXG5cdGNiICAgICAgIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogKEBjYikgLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSB7QG5hbWV9XG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiAoc3RpbGxMYW5kc2NhcGU9dHJ1ZSkgPT5cblxuXHRcdEBhbmltYXRlT3V0ID0+XG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cdFx0XHRpZiAhc3RpbGxMYW5kc2NhcGUgdGhlbiBAY2I/KClcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHN1cGVyXG5cblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddICd1cGRhdGVEaW1zJywgQG9uVXBkYXRlRGltc1xuXHRcdEAkZWxbc2V0dGluZ10gJ3RvdWNoZW5kIGNsaWNrJywgQGhpZGVcblxuXHRcdG51bGxcblxuXHRvblVwZGF0ZURpbXMgOiAoZGltcykgPT5cblxuXHRcdGlmIGRpbXMubyBpcyAncG9ydHJhaXQnIHRoZW4gQGhpZGUgZmFsc2VcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBPcmllbnRhdGlvbk1vZGFsXG4iLCJBYnN0cmFjdFZpZXcgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuT3JpZW50YXRpb25Nb2RhbCA9IHJlcXVpcmUgJy4vT3JpZW50YXRpb25Nb2RhbCdcblxuY2xhc3MgTW9kYWxNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0IyB3aGVuIG5ldyBtb2RhbCBjbGFzc2VzIGFyZSBjcmVhdGVkLCBhZGQgaGVyZSwgd2l0aCByZWZlcmVuY2UgdG8gY2xhc3MgbmFtZVxuXHRtb2RhbHMgOlxuXHRcdG9yaWVudGF0aW9uTW9kYWwgOiBjbGFzc1JlZiA6IE9yaWVudGF0aW9uTW9kYWwsIHZpZXcgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRpc09wZW4gOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiByZXR1cm4gdHJ1ZSApIGZvciBuYW1lLCBtb2RhbCBvZiBAbW9kYWxzXG5cblx0XHRmYWxzZVxuXG5cdGhpZGVPcGVuTW9kYWwgOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiBvcGVuTW9kYWwgPSBAbW9kYWxzW25hbWVdLnZpZXcgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0b3Blbk1vZGFsPy5oaWRlKClcblxuXHRcdG51bGxcblxuXHRzaG93TW9kYWwgOiAobmFtZSwgY2I9bnVsbCkgPT5cblxuXHRcdHJldHVybiBpZiBAbW9kYWxzW25hbWVdLnZpZXdcblxuXHRcdEBtb2RhbHNbbmFtZV0udmlldyA9IG5ldyBAbW9kYWxzW25hbWVdLmNsYXNzUmVmIGNiXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxNYW5hZ2VyXG4iXX0=
