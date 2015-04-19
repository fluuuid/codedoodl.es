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



},{"./AppData":6,"./AppView":7,"./data/Locale":13,"./data/Templates":14,"./router/Nav":20,"./router/Router":21,"./utils/Analytics":22,"./utils/AuthManager":23,"./utils/Facebook":25,"./utils/GooglePlus":26,"./utils/MediaQueries":27,"./utils/Share":30}],6:[function(require,module,exports){
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
    console.log("onStartDataReceived : (data) =>", data);
    this.doodles.add(data.doodles);

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



},{"./collections/doodles/DoodlesCollection":10,"./data/API":11,"./data/AbstractData":12,"./utils/Requester":29}],7:[function(require,module,exports){
var AbstractView, AppView, Footer, Header, ModalManager, Preloader, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./view/AbstractView');

Preloader = require('./view/base/Preloader');

Header = require('./view/base/Header');

Wrapper = require('./view/base/Wrapper');

Footer = require('./view/base/Footer');

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
    this.addChild(this.header).addChild(this.wrapper).addChild(this.footer);
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
    console.log("scrollUpdate");
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



},{"./view/AbstractView":31,"./view/base/Footer":34,"./view/base/Header":35,"./view/base/Preloader":36,"./view/base/Wrapper":37,"./view/modals/_ModalManager":44}],8:[function(require,module,exports){
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



},{"../../models/core/TemplateModel":18}],10:[function(require,module,exports){
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
      throw new Error("y u no doodle?");
    }
    return doodle;
  };

  return DoodlesCollection;

})(AbstractCollection);

module.exports = DoodlesCollection;



},{"../../models/doodle/DoodleModel":19,"../AbstractCollection":8}],11:[function(require,module,exports){
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



},{"../models/core/APIRouteModel":16}],12:[function(require,module,exports){
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



},{}],13:[function(require,module,exports){
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



},{"../data/API":11,"../models/core/LocalesModel":17}],14:[function(require,module,exports){
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



},{"../collections/core/TemplatesCollection":9,"../models/core/TemplateModel":18}],15:[function(require,module,exports){
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



},{}],16:[function(require,module,exports){
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



},{}],17:[function(require,module,exports){
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



},{}],18:[function(require,module,exports){
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



},{}],19:[function(require,module,exports){
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



},{"../../utils/CodeWordTransitioner":24,"../../utils/NumberUtils":28,"../AbstractModel":15}],20:[function(require,module,exports){
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

  Nav.prototype.getSection = function(section) {
    var sectionName, uri, _ref;
    if (section === '') {
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
    if (this.previous.area && this.previous.area === this.current.area) {
      this.trigger(Nav.EVENT_CHANGE_SUB_VIEW, this.current);
    } else {
      this.trigger(Nav.EVENT_CHANGE_VIEW, this.previous, this.current);
      this.trigger(Nav.EVENT_CHANGE_SUB_VIEW, this.current);
    }
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



},{"../view/AbstractView":31,"./Router":21}],21:[function(require,module,exports){
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



},{}],22:[function(require,module,exports){

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



},{}],23:[function(require,module,exports){
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



},{"../data/AbstractData":12,"../utils/Facebook":25,"../utils/GooglePlus":26}],24:[function(require,module,exports){
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



},{"ent/encode":3}],25:[function(require,module,exports){
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



},{"../data/AbstractData":12}],26:[function(require,module,exports){
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



},{"../data/AbstractData":12}],27:[function(require,module,exports){
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

module.exports = MediaQueries;



},{}],28:[function(require,module,exports){
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



},{}],29:[function(require,module,exports){

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



},{}],30:[function(require,module,exports){

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



},{}],31:[function(require,module,exports){
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



},{}],32:[function(require,module,exports){
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



},{"./AbstractView":31}],33:[function(require,module,exports){
var AboutPageView, AbstractViewPage,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

AboutPageView = (function(_super) {
  __extends(AboutPageView, _super);

  AboutPageView.prototype.template = 'page-about';

  function AboutPageView() {
    this.templateVars = {
      desc: this.CD().locale.get("about_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    AboutPageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  return AboutPageView;

})(AbstractViewPage);

module.exports = AboutPageView;



},{"../AbstractViewPage":32}],34:[function(require,module,exports){
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



},{"../AbstractView":31}],35:[function(require,module,exports){
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



},{"../../router/Router":21,"../../utils/CodeWordTransitioner":24,"../AbstractView":31}],36:[function(require,module,exports){
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



},{"../../utils/CodeWordTransitioner":24,"../AbstractView":31}],37:[function(require,module,exports){
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

  Wrapper.prototype.backgroundView = null;

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
    this.previousView = this.getViewByRoute(previous.area);
    this.currentView = this.getViewByRoute(current.area);
    if (!this.previousView) {
      this.transitionViews(false, this.currentView.view);
    } else {
      this.transitionViews(this.previousView.view, this.currentView.view);
    }
    return null;
  };

  Wrapper.prototype.changeSubView = function(current) {
    this.currentView.view.trigger(Nav.EVENT_CHANGE_SUB_VIEW, current.sub);
    return null;
  };

  Wrapper.prototype.transitionViews = function(from, to) {
    if (from === to) {
      return;
    }
    if (from && to) {
      from.hide(to.show);
    } else if (from) {
      from.hide();
    } else if (to) {
      to.show();
    }
    return null;
  };

  return Wrapper;

})(AbstractView);

module.exports = Wrapper;



},{"../../router/Nav":20,"../AbstractView":31,"../aboutPage/AboutPageView":33,"../contributePage/ContributePageView":38,"../doodlePage/DoodlePageView":39,"../home/HomeView":41}],38:[function(require,module,exports){
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



},{"../AbstractViewPage":32}],39:[function(require,module,exports){
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



},{"../AbstractViewPage":32}],40:[function(require,module,exports){
var AbstractView, CodeWordTransitioner, HomeGridItem,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

HomeGridItem = (function(_super) {
  __extends(HomeGridItem, _super);

  HomeGridItem.prototype.template = 'home-grid-item';

  function HomeGridItem(model) {
    this.model = model;
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
    return this.$el[setting]('mouseover', this.onMouseOver);
  };

  HomeGridItem.prototype.show = function() {
    this.$el.addClass('show-item');
    CodeWordTransitioner.to(this.model.get('author.name'), this.$authorName, 'blue');
    CodeWordTransitioner.to(this.model.get('name'), this.$doodleName, 'blue');
    this.setListeners('on');
    return null;
  };

  HomeGridItem.prototype.onMouseOver = function() {
    CodeWordTransitioner.scramble(this.$authorName, 'blue', false, (function(_this) {
      return function() {
        return CodeWordTransitioner.to(_this.model.get('author.name'), _this.$authorName, 'blue');
      };
    })(this));
    CodeWordTransitioner.scramble(this.$doodleName, 'blue', false, (function(_this) {
      return function() {
        return CodeWordTransitioner.to(_this.model.get('name'), _this.$doodleName, 'blue');
      };
    })(this));
    return null;
  };

  return HomeGridItem;

})(AbstractView);

module.exports = HomeGridItem;



},{"../../utils/CodeWordTransitioner":24,"../AbstractView":31}],41:[function(require,module,exports){
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
    itemHeight: 0,
    containerHeight: 0
  };

  HomeView.scrollDistance = 0;

  HomeView.prototype.template = 'page-home';

  HomeView.prototype.addToSelector = '[data-home-grid]';

  HomeView.prototype.allDoodles = null;

  function HomeView() {
    this.animateItemIn = __bind(this.animateItemIn, this);
    this.addDoodles = __bind(this.addDoodles, this);
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
    this.setupDims();
    return null;
  };

  HomeView.prototype.setupDims = function() {
    return null;
  };

  HomeView.prototype.setListeners = function(setting) {
    this.CD().appView[setting](this.CD().appView.EVENT_UPDATE_DIMENSIONS, this.onResize);
    this.CD().appView[setting](this.CD().appView.EVENT_ON_SCROLL, this.onScroll);
    return null;
  };

  HomeView.prototype.onResize = function() {
    HomeView.dims.containerHeight = this.CD().appView.dims.h;
    this.setupDims();
    return null;
  };

  HomeView.prototype.onScroll = function() {
    HomeView.scrollDistance = this.CD().appView.lastScrollY;
    return null;
  };

  HomeView.prototype.show = function() {
    HomeView.__super__.show.apply(this, arguments);
    return null;
  };

  HomeView.prototype.animateIn = function() {
    if (!HomeView.visitedThisSession) {
      this.addDoodles(15, true);
      HomeView.visitedThisSession = true;
    } else {
      this.CD().appView.$window.scrollTop(HomeView.scrollDistance);
      console.log('show what been done shown already');
    }
    return null;
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
      newItems.push(new HomeGridItem(doodle));
    }
    HomeView.gridItems = HomeView.gridItems.concat(newItems);
    for (idx = _j = 0, _len = newItems.length; _j < _len; idx = ++_j) {
      item = newItems[idx];
      this.addChild(item);
      this.animateItemIn(item, idx, fullPageTransition);
    }
    return null;
  };

  HomeView.prototype.animateItemIn = function(item, index, fullPage) {
    var duration, fromParams, toParams;
    if (fullPage == null) {
      fullPage = false;
    }
    duration = 0.5;
    fromParams = {
      y: (fullPage ? window.innerHeight : 50),
      opacity: 0
    };
    toParams = {
      delay: (duration * 0.2) * index,
      y: 0,
      opacity: 1,
      ease: Expo.easeOut,
      onComplete: item.show
    };
    TweenLite.fromTo(item.$el, duration, fromParams, toParams);
    return null;
  };

  return HomeView;

})(AbstractViewPage);

module.exports = HomeView;



},{"../AbstractViewPage":32,"./HomeGridItem":40}],42:[function(require,module,exports){
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



},{"../AbstractView":31}],43:[function(require,module,exports){
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



},{"./AbstractModal":42}],44:[function(require,module,exports){
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



},{"../AbstractView":31,"./OrientationModal":43}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50L2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9lbnQvcmV2ZXJzZWQuanNvbiIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHAuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcFZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL0Fic3RyYWN0Q29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvY29yZS9UZW1wbGF0ZXNDb2xsZWN0aW9uLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb2xsZWN0aW9ucy9kb29kbGVzL0Rvb2RsZXNDb2xsZWN0aW9uLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0FQSS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BYnN0cmFjdERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvTG9jYWxlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL1RlbXBsYXRlcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL0Fic3RyYWN0TW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL0FQSVJvdXRlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL0xvY2FsZXNNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2Rvb2RsZS9Eb29kbGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvcm91dGVyL05hdi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvcm91dGVyL1JvdXRlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQW5hbHl0aWNzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9BdXRoTWFuYWdlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0ZhY2Vib29rLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Hb29nbGVQbHVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9NZWRpYVF1ZXJpZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL051bWJlclV0aWxzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9SZXF1ZXN0ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1NoYXJlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9BYnN0cmFjdFZpZXdQYWdlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Fib3V0UGFnZS9BYm91dFBhZ2VWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvRm9vdGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvSGVhZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvUHJlbG9hZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvV3JhcHBlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVHcmlkSXRlbS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x5Q0EsSUFBQSx3SEFBQTtFQUFBLGtGQUFBOztBQUFBLFNBQUEsR0FBZSxPQUFBLENBQVEsbUJBQVIsQ0FBZixDQUFBOztBQUFBLFdBQ0EsR0FBZSxPQUFBLENBQVEscUJBQVIsQ0FEZixDQUFBOztBQUFBLEtBRUEsR0FBZSxPQUFBLENBQVEsZUFBUixDQUZmLENBQUE7O0FBQUEsUUFHQSxHQUFlLE9BQUEsQ0FBUSxrQkFBUixDQUhmLENBQUE7O0FBQUEsVUFJQSxHQUFlLE9BQUEs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OztHQUgwQixhQUgzQixDQUFBOztBQUFBLE1BeUNNLENBQUMsT0FBUCxHQUFpQixZQXpDakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJBcHAgPSByZXF1aXJlICcuL0FwcCdcblxuIyBQUk9EVUNUSU9OIEVOVklST05NRU5UIC0gbWF5IHdhbnQgdG8gdXNlIHNlcnZlci1zZXQgdmFyaWFibGVzIGhlcmVcbiMgSVNfTElWRSA9IGRvIC0+IHJldHVybiBpZiB3aW5kb3cubG9jYXRpb24uaG9zdC5pbmRleE9mKCdsb2NhbGhvc3QnKSA+IC0xIG9yIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggaXMgJz9kJyB0aGVuIGZhbHNlIGVsc2UgdHJ1ZVxuXG4jIyNcblxuV0lQIC0gdGhpcyB3aWxsIGlkZWFsbHkgY2hhbmdlIHRvIG9sZCBmb3JtYXQgKGFib3ZlKSB3aGVuIGNhbiBmaWd1cmUgaXQgb3V0XG5cbiMjI1xuXG5JU19MSVZFID0gZmFsc2VcblxuIyBPTkxZIEVYUE9TRSBBUFAgR0xPQkFMTFkgSUYgTE9DQUwgT1IgREVWJ0lOR1xudmlldyA9IGlmIElTX0xJVkUgdGhlbiB7fSBlbHNlICh3aW5kb3cgb3IgZG9jdW1lbnQpXG5cbiMgREVDTEFSRSBNQUlOIEFQUExJQ0FUSU9OXG52aWV3LkNEID0gbmV3IEFwcCBJU19MSVZFXG52aWV3LkNELmluaXQoKVxuIiwiLyohIGh0dHA6Ly9tdGhzLmJlL3B1bnljb2RlIHYxLjIuNCBieSBAbWF0aGlhcyAqL1xuOyhmdW5jdGlvbihyb290KSB7XG5cblx0LyoqIERldGVjdCBmcmVlIHZhcmlhYmxlcyAqL1xuXHR2YXIgZnJlZUV4cG9ydHMgPSB0eXBlb2YgZXhwb3J0cyA9PSAnb2JqZWN0JyAmJiBleHBvcnRzO1xuXHR2YXIgZnJlZU1vZHVsZSA9IHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmXG5cdFx0bW9kdWxlLmV4cG9ydHMgPT0gZnJlZUV4cG9ydHMgJiYgbW9kdWxlO1xuXHR2YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsO1xuXHRpZiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwpIHtcblx0XHRyb290ID0gZnJlZUdsb2JhbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgYHB1bnljb2RlYCBvYmplY3QuXG5cdCAqIEBuYW1lIHB1bnljb2RlXG5cdCAqIEB0eXBlIE9iamVjdFxuXHQgKi9cblx0dmFyIHB1bnljb2RlLFxuXG5cdC8qKiBIaWdoZXN0IHBvc2l0aXZlIHNpZ25lZCAzMi1iaXQgZmxvYXQgdmFsdWUgKi9cblx0bWF4SW50ID0gMjE0NzQ4MzY0NywgLy8gYWthLiAweDdGRkZGRkZGIG9yIDJeMzEtMVxuXG5cdC8qKiBCb290c3RyaW5nIHBhcmFtZXRlcnMgKi9cblx0YmFzZSA9IDM2LFxuXHR0TWluID0gMSxcblx0dE1heCA9IDI2LFxuXHRza2V3ID0gMzgsXG5cdGRhbXAgPSA3MDAsXG5cdGluaXRpYWxCaWFzID0gNzIsXG5cdGluaXRpYWxOID0gMTI4LCAvLyAweDgwXG5cdGRlbGltaXRlciA9ICctJywgLy8gJ1xceDJEJ1xuXG5cdC8qKiBSZWd1bGFyIGV4cHJlc3Npb25zICovXG5cdHJlZ2V4UHVueWNvZGUgPSAvXnhuLS0vLFxuXHRyZWdleE5vbkFTQ0lJID0gL1teIC1+XS8sIC8vIHVucHJpbnRhYmxlIEFTQ0lJIGNoYXJzICsgbm9uLUFTQ0lJIGNoYXJzXG5cdHJlZ2V4U2VwYXJhdG9ycyA9IC9cXHgyRXxcXHUzMDAyfFxcdUZGMEV8XFx1RkY2MS9nLCAvLyBSRkMgMzQ5MCBzZXBhcmF0b3JzXG5cblx0LyoqIEVycm9yIG1lc3NhZ2VzICovXG5cdGVycm9ycyA9IHtcblx0XHQnb3ZlcmZsb3cnOiAnT3ZlcmZsb3c6IGlucHV0IG5lZWRzIHdpZGVyIGludGVnZXJzIHRvIHByb2Nlc3MnLFxuXHRcdCdub3QtYmFzaWMnOiAnSWxsZWdhbCBpbnB1dCA+PSAweDgwIChub3QgYSBiYXNpYyBjb2RlIHBvaW50KScsXG5cdFx0J2ludmFsaWQtaW5wdXQnOiAnSW52YWxpZCBpbnB1dCdcblx0fSxcblxuXHQvKiogQ29udmVuaWVuY2Ugc2hvcnRjdXRzICovXG5cdGJhc2VNaW51c1RNaW4gPSBiYXNlIC0gdE1pbixcblx0Zmxvb3IgPSBNYXRoLmZsb29yLFxuXHRzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLFxuXG5cdC8qKiBUZW1wb3JhcnkgdmFyaWFibGUgKi9cblx0a2V5O1xuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgZXJyb3IgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIGVycm9yIHR5cGUuXG5cdCAqIEByZXR1cm5zIHtFcnJvcn0gVGhyb3dzIGEgYFJhbmdlRXJyb3JgIHdpdGggdGhlIGFwcGxpY2FibGUgZXJyb3IgbWVzc2FnZS5cblx0ICovXG5cdGZ1bmN0aW9uIGVycm9yKHR5cGUpIHtcblx0XHR0aHJvdyBSYW5nZUVycm9yKGVycm9yc1t0eXBlXSk7XG5cdH1cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGBBcnJheSNtYXBgIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeSBhcnJheVxuXHQgKiBpdGVtLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXAoYXJyYXksIGZuKSB7XG5cdFx0dmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0XHR3aGlsZSAobGVuZ3RoLS0pIHtcblx0XHRcdGFycmF5W2xlbmd0aF0gPSBmbihhcnJheVtsZW5ndGhdKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFycmF5O1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgc2ltcGxlIGBBcnJheSNtYXBgLWxpa2Ugd3JhcHBlciB0byB3b3JrIHdpdGggZG9tYWluIG5hbWUgc3RyaW5ncy5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeVxuXHQgKiBjaGFyYWN0ZXIuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgc3RyaW5nIG9mIGNoYXJhY3RlcnMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrXG5cdCAqIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwRG9tYWluKHN0cmluZywgZm4pIHtcblx0XHRyZXR1cm4gbWFwKHN0cmluZy5zcGxpdChyZWdleFNlcGFyYXRvcnMpLCBmbikuam9pbignLicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgbnVtZXJpYyBjb2RlIHBvaW50cyBvZiBlYWNoIFVuaWNvZGVcblx0ICogY2hhcmFjdGVyIGluIHRoZSBzdHJpbmcuIFdoaWxlIEphdmFTY3JpcHQgdXNlcyBVQ1MtMiBpbnRlcm5hbGx5LFxuXHQgKiB0aGlzIGZ1bmN0aW9uIHdpbGwgY29udmVydCBhIHBhaXIgb2Ygc3Vycm9nYXRlIGhhbHZlcyAoZWFjaCBvZiB3aGljaFxuXHQgKiBVQ1MtMiBleHBvc2VzIGFzIHNlcGFyYXRlIGNoYXJhY3RlcnMpIGludG8gYSBzaW5nbGUgY29kZSBwb2ludCxcblx0ICogbWF0Y2hpbmcgVVRGLTE2LlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmVuY29kZWBcblx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZGVjb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gVGhlIG5ldyBhcnJheSBvZiBjb2RlIHBvaW50cy5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBjb3VudGVyID0gMCxcblx0XHQgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcblx0XHQgICAgdmFsdWUsXG5cdFx0ICAgIGV4dHJhO1xuXHRcdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHR2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuXHRcdFx0XHRleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkgeyAvLyBsb3cgc3Vycm9nYXRlXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGUgbmV4dFxuXHRcdFx0XHRcdC8vIGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpclxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZGVjb2RlYFxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBlbmNvZGVcblx0ICogQHBhcmFtIHtBcnJheX0gY29kZVBvaW50cyBUaGUgYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIG5ldyBVbmljb2RlIHN0cmluZyAoVUNTLTIpLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRcdHJldHVybiBtYXAoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHR2YXIgb3V0cHV0ID0gJyc7XG5cdFx0XHRpZiAodmFsdWUgPiAweEZGRkYpIHtcblx0XHRcdFx0dmFsdWUgLT0gMHgxMDAwMDtcblx0XHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0XHRcdHZhbHVlID0gMHhEQzAwIHwgdmFsdWUgJiAweDNGRjtcblx0XHRcdH1cblx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUpO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9KS5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG5cdCAqIEBzZWUgYGRpZ2l0VG9CYXNpYygpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludCAoZm9yIHVzZSBpblxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGluIHRoZSByYW5nZSBgMGAgdG8gYGJhc2UgLSAxYCwgb3IgYGJhc2VgIGlmXG5cdCAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuXHQgKi9cblx0ZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRcdGlmIChjb2RlUG9pbnQgLSA0OCA8IDEwKSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gMjI7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA2NSA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gNjU7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA5NyA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gOTc7XG5cdFx0fVxuXHRcdHJldHVybiBiYXNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgZGlnaXQvaW50ZWdlciBpbnRvIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkaWdpdCBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaXMgYGRpZ2l0YCwgd2hpY2ggbmVlZHMgdG8gYmUgaW4gdGhlIHJhbmdlXG5cdCAqIGAwYCB0byBgYmFzZSAtIDFgLiBJZiBgZmxhZ2AgaXMgbm9uLXplcm8sIHRoZSB1cHBlcmNhc2UgZm9ybSBpc1xuXHQgKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuXHQgKiBpZiBgZmxhZ2AgaXMgbm9uLXplcm8gYW5kIGBkaWdpdGAgaGFzIG5vIHVwcGVyY2FzZSBmb3JtLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGlnaXRUb0Jhc2ljKGRpZ2l0LCBmbGFnKSB7XG5cdFx0Ly8gIDAuLjI1IG1hcCB0byBBU0NJSSBhLi56IG9yIEEuLlpcblx0XHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0XHRyZXR1cm4gZGlnaXQgKyAyMiArIDc1ICogKGRpZ2l0IDwgMjYpIC0gKChmbGFnICE9IDApIDw8IDUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEJpYXMgYWRhcHRhdGlvbiBmdW5jdGlvbiBhcyBwZXIgc2VjdGlvbiAzLjQgb2YgUkZDIDM0OTIuXG5cdCAqIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM0OTIjc2VjdGlvbi0zLjRcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIGFkYXB0KGRlbHRhLCBudW1Qb2ludHMsIGZpcnN0VGltZSkge1xuXHRcdHZhciBrID0gMDtcblx0XHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRcdGRlbHRhICs9IGZsb29yKGRlbHRhIC8gbnVtUG9pbnRzKTtcblx0XHRmb3IgKC8qIG5vIGluaXRpYWxpemF0aW9uICovOyBkZWx0YSA+IGJhc2VNaW51c1RNaW4gKiB0TWF4ID4+IDE7IGsgKz0gYmFzZSkge1xuXHRcdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHRcdH1cblx0XHRyZXR1cm4gZmxvb3IoayArIChiYXNlTWludXNUTWluICsgMSkgKiBkZWx0YSAvIChkZWx0YSArIHNrZXcpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcblx0XHQvLyBEb24ndCB1c2UgVUNTLTJcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHRcdCAgICBvdXQsXG5cdFx0ICAgIGkgPSAwLFxuXHRcdCAgICBuID0gaW5pdGlhbE4sXG5cdFx0ICAgIGJpYXMgPSBpbml0aWFsQmlhcyxcblx0XHQgICAgYmFzaWMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIGluZGV4LFxuXHRcdCAgICBvbGRpLFxuXHRcdCAgICB3LFxuXHRcdCAgICBrLFxuXHRcdCAgICBkaWdpdCxcblx0XHQgICAgdCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGJhc2VNaW51c1Q7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0XHQvLyBwb2ludHMgYmVmb3JlIHRoZSBsYXN0IGRlbGltaXRlciwgb3IgYDBgIGlmIHRoZXJlIGlzIG5vbmUsIHRoZW4gY29weVxuXHRcdC8vIHRoZSBmaXJzdCBiYXNpYyBjb2RlIHBvaW50cyB0byB0aGUgb3V0cHV0LlxuXG5cdFx0YmFzaWMgPSBpbnB1dC5sYXN0SW5kZXhPZihkZWxpbWl0ZXIpO1xuXHRcdGlmIChiYXNpYyA8IDApIHtcblx0XHRcdGJhc2ljID0gMDtcblx0XHR9XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdFx0Ly8gaWYgaXQncyBub3QgYSBiYXNpYyBjb2RlIHBvaW50XG5cdFx0XHRpZiAoaW5wdXQuY2hhckNvZGVBdChqKSA+PSAweDgwKSB7XG5cdFx0XHRcdGVycm9yKCdub3QtYmFzaWMnKTtcblx0XHRcdH1cblx0XHRcdG91dHB1dC5wdXNoKGlucHV0LmNoYXJDb2RlQXQoaikpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0XHQvLyBwb2ludHMgd2VyZSBjb3BpZWQ7IHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmcgb3RoZXJ3aXNlLlxuXG5cdFx0Zm9yIChpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7IC8qIG5vIGZpbmFsIGV4cHJlc3Npb24gKi8pIHtcblxuXHRcdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdFx0Ly8gRGVjb2RlIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIgaW50byBgZGVsdGFgLFxuXHRcdFx0Ly8gd2hpY2ggZ2V0cyBhZGRlZCB0byBgaWAuIFRoZSBvdmVyZmxvdyBjaGVja2luZyBpcyBlYXNpZXJcblx0XHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0XHQvLyB2YWx1ZSBhdCB0aGUgZW5kIHRvIG9idGFpbiBgZGVsdGFgLlxuXHRcdFx0Zm9yIChvbGRpID0gaSwgdyA9IDEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXG5cdFx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRcdGVycm9yKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPj0gYmFzZSB8fCBkaWdpdCA+IGZsb29yKChtYXhJbnQgLSBpKSAvIHcpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0IDwgdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3ICo9IGJhc2VNaW51c1Q7XG5cblx0XHRcdH1cblxuXHRcdFx0b3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0XHRiaWFzID0gYWRhcHQoaSAtIG9sZGksIG91dCwgb2xkaSA9PSAwKTtcblxuXHRcdFx0Ly8gYGlgIHdhcyBzdXBwb3NlZCB0byB3cmFwIGFyb3VuZCBmcm9tIGBvdXRgIHRvIGAwYCxcblx0XHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0XHRpZiAoZmxvb3IoaSAvIG91dCkgPiBtYXhJbnQgLSBuKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdFx0aSAlPSBvdXQ7XG5cblx0XHRcdC8vIEluc2VydCBgbmAgYXQgcG9zaXRpb24gYGlgIG9mIHRoZSBvdXRwdXRcblx0XHRcdG91dHB1dC5zcGxpY2UoaSsrLCAwLCBuKTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB1Y3MyZW5jb2RlKG91dHB1dCk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzIHRvIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHlcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdFx0dmFyIG4sXG5cdFx0ICAgIGRlbHRhLFxuXHRcdCAgICBoYW5kbGVkQ1BDb3VudCxcblx0XHQgICAgYmFzaWNMZW5ndGgsXG5cdFx0ICAgIGJpYXMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIG0sXG5cdFx0ICAgIHEsXG5cdFx0ICAgIGssXG5cdFx0ICAgIHQsXG5cdFx0ICAgIGN1cnJlbnRWYWx1ZSxcblx0XHQgICAgb3V0cHV0ID0gW10sXG5cdFx0ICAgIC8qKiBgaW5wdXRMZW5ndGhgIHdpbGwgaG9sZCB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIGluIGBpbnB1dGAuICovXG5cdFx0ICAgIGlucHV0TGVuZ3RoLFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgaGFuZGxlZENQQ291bnRQbHVzT25lLFxuXHRcdCAgICBiYXNlTWludXNULFxuXHRcdCAgICBxTWludXNUO1xuXG5cdFx0Ly8gQ29udmVydCB0aGUgaW5wdXQgaW4gVUNTLTIgdG8gVW5pY29kZVxuXHRcdGlucHV0ID0gdWNzMmRlY29kZShpbnB1dCk7XG5cblx0XHQvLyBDYWNoZSB0aGUgbGVuZ3RoXG5cdFx0aW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZVxuXHRcdG4gPSBpbml0aWFsTjtcblx0XHRkZWx0YSA9IDA7XG5cdFx0YmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50c1xuXHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShjdXJyZW50VmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRoYW5kbGVkQ1BDb3VudCA9IGJhc2ljTGVuZ3RoID0gb3V0cHV0Lmxlbmd0aDtcblxuXHRcdC8vIGBoYW5kbGVkQ1BDb3VudGAgaXMgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyB0aGF0IGhhdmUgYmVlbiBoYW5kbGVkO1xuXHRcdC8vIGBiYXNpY0xlbmd0aGAgaXMgdGhlIG51bWJlciBvZiBiYXNpYyBjb2RlIHBvaW50cy5cblxuXHRcdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIC0gaWYgaXQgaXMgbm90IGVtcHR5IC0gd2l0aCBhIGRlbGltaXRlclxuXHRcdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdFx0b3V0cHV0LnB1c2goZGVsaW1pdGVyKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdFx0d2hpbGUgKGhhbmRsZWRDUENvdW50IDwgaW5wdXRMZW5ndGgpIHtcblxuXHRcdFx0Ly8gQWxsIG5vbi1iYXNpYyBjb2RlIHBvaW50cyA8IG4gaGF2ZSBiZWVuIGhhbmRsZWQgYWxyZWFkeS4gRmluZCB0aGUgbmV4dFxuXHRcdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHRcdGZvciAobSA9IG1heEludCwgaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID49IG4gJiYgY3VycmVudFZhbHVlIDwgbSkge1xuXHRcdFx0XHRcdG0gPSBjdXJyZW50VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5jcmVhc2UgYGRlbHRhYCBlbm91Z2ggdG8gYWR2YW5jZSB0aGUgZGVjb2RlcidzIDxuLGk+IHN0YXRlIHRvIDxtLDA+LFxuXHRcdFx0Ly8gYnV0IGd1YXJkIGFnYWluc3Qgb3ZlcmZsb3dcblx0XHRcdGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRcdGlmIChtIC0gbiA+IGZsb29yKChtYXhJbnQgLSBkZWx0YSkgLyBoYW5kbGVkQ1BDb3VudFBsdXNPbmUpKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdFx0biA9IG07XG5cblx0XHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPT0gbikge1xuXHRcdFx0XHRcdC8vIFJlcHJlc2VudCBkZWx0YSBhcyBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyXG5cdFx0XHRcdFx0Zm9yIChxID0gZGVsdGEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXHRcdFx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cdFx0XHRcdFx0XHRpZiAocSA8IHQpIHtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRxTWludXNUID0gcSAtIHQ7XG5cdFx0XHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRcdFx0c3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyh0ICsgcU1pbnVzVCAlIGJhc2VNaW51c1QsIDApKVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0KytkZWx0YTtcblx0XHRcdCsrbjtcblxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFVuaWNvZGUuIE9ubHkgdGhlXG5cdCAqIFB1bnljb2RlZCBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgb24gYSBzdHJpbmcgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbnZlcnRlZCB0b1xuXHQgKiBVbmljb2RlLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgUHVueWNvZGUgZG9tYWluIG5hbWUgdG8gY29udmVydCB0byBVbmljb2RlLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgVW5pY29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gUHVueWNvZGVcblx0ICogc3RyaW5nLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9Vbmljb2RlKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleFB1bnljb2RlLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/IGRlY29kZShzdHJpbmcuc2xpY2UoNCkudG9Mb3dlckNhc2UoKSlcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBVbmljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBQdW55Y29kZS4gT25seSB0aGVcblx0ICogbm9uLUFTQ0lJIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQncyBhbHJlYWR5IGluIEFTQ0lJLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUgdG8gY29udmVydCwgYXMgYSBVbmljb2RlIHN0cmluZy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFB1bnljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBkb21haW4gbmFtZS5cblx0ICovXG5cdGZ1bmN0aW9uIHRvQVNDSUkoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4Tm9uQVNDSUkudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gJ3huLS0nICsgZW5jb2RlKHN0cmluZylcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKiogRGVmaW5lIHRoZSBwdWJsaWMgQVBJICovXG5cdHB1bnljb2RlID0ge1xuXHRcdC8qKlxuXHRcdCAqIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBQdW55Y29kZS5qcyB2ZXJzaW9uIG51bWJlci5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBTdHJpbmdcblx0XHQgKi9cblx0XHQndmVyc2lvbic6ICcxLjIuNCcsXG5cdFx0LyoqXG5cdFx0ICogQW4gb2JqZWN0IG9mIG1ldGhvZHMgdG8gY29udmVydCBmcm9tIEphdmFTY3JpcHQncyBpbnRlcm5hbCBjaGFyYWN0ZXJcblx0XHQgKiByZXByZXNlbnRhdGlvbiAoVUNTLTIpIHRvIFVuaWNvZGUgY29kZSBwb2ludHMsIGFuZCBiYWNrLlxuXHRcdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgT2JqZWN0XG5cdFx0ICovXG5cdFx0J3VjczInOiB7XG5cdFx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHRcdCdlbmNvZGUnOiB1Y3MyZW5jb2RlXG5cdFx0fSxcblx0XHQnZGVjb2RlJzogZGVjb2RlLFxuXHRcdCdlbmNvZGUnOiBlbmNvZGUsXG5cdFx0J3RvQVNDSUknOiB0b0FTQ0lJLFxuXHRcdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcblx0fTtcblxuXHQvKiogRXhwb3NlIGBwdW55Y29kZWAgKi9cblx0Ly8gU29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zXG5cdC8vIGxpa2UgdGhlIGZvbGxvd2luZzpcblx0aWYgKFxuXHRcdHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmXG5cdFx0ZGVmaW5lLmFtZFxuXHQpIHtcblx0XHRkZWZpbmUoJ3B1bnljb2RlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcHVueWNvZGU7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoZnJlZUV4cG9ydHMgJiYgIWZyZWVFeHBvcnRzLm5vZGVUeXBlKSB7XG5cdFx0aWYgKGZyZWVNb2R1bGUpIHsgLy8gaW4gTm9kZS5qcyBvciBSaW5nb0pTIHYwLjguMCtcblx0XHRcdGZyZWVNb2R1bGUuZXhwb3J0cyA9IHB1bnljb2RlO1xuXHRcdH0gZWxzZSB7IC8vIGluIE5hcndoYWwgb3IgUmluZ29KUyB2MC43LjAtXG5cdFx0XHRmb3IgKGtleSBpbiBwdW55Y29kZSkge1xuXHRcdFx0XHRwdW55Y29kZS5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIChmcmVlRXhwb3J0c1trZXldID0gcHVueWNvZGVba2V5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgeyAvLyBpbiBSaGlubyBvciBhIHdlYiBicm93c2VyXG5cdFx0cm9vdC5wdW55Y29kZSA9IHB1bnljb2RlO1xuXHR9XG5cbn0odGhpcykpO1xuIiwidmFyIHB1bnljb2RlID0gcmVxdWlyZSgncHVueWNvZGUnKTtcbnZhciByZXZFbnRpdGllcyA9IHJlcXVpcmUoJy4vcmV2ZXJzZWQuanNvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVuY29kZTtcblxuZnVuY3Rpb24gZW5jb2RlIChzdHIsIG9wdHMpIHtcbiAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYSBTdHJpbmcnKTtcbiAgICB9XG4gICAgaWYgKCFvcHRzKSBvcHRzID0ge307XG5cbiAgICB2YXIgbnVtZXJpYyA9IHRydWU7XG4gICAgaWYgKG9wdHMubmFtZWQpIG51bWVyaWMgPSBmYWxzZTtcbiAgICBpZiAob3B0cy5udW1lcmljICE9PSB1bmRlZmluZWQpIG51bWVyaWMgPSBvcHRzLm51bWVyaWM7XG5cbiAgICB2YXIgc3BlY2lhbCA9IG9wdHMuc3BlY2lhbCB8fCB7XG4gICAgICAgICdcIic6IHRydWUsIFwiJ1wiOiB0cnVlLFxuICAgICAgICAnPCc6IHRydWUsICc+JzogdHJ1ZSxcbiAgICAgICAgJyYnOiB0cnVlXG4gICAgfTtcblxuICAgIHZhciBjb2RlUG9pbnRzID0gcHVueWNvZGUudWNzMi5kZWNvZGUoc3RyKTtcbiAgICB2YXIgY2hhcnMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvZGVQb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNjID0gY29kZVBvaW50c1tpXTtcbiAgICAgICAgdmFyIGMgPSBwdW55Y29kZS51Y3MyLmVuY29kZShbIGNjIF0pO1xuICAgICAgICB2YXIgZSA9IHJldkVudGl0aWVzW2NjXTtcbiAgICAgICAgaWYgKGUgJiYgKGNjID49IDEyNyB8fCBzcGVjaWFsW2NdKSAmJiAhbnVtZXJpYykge1xuICAgICAgICAgICAgY2hhcnMucHVzaCgnJicgKyAoLzskLy50ZXN0KGUpID8gZSA6IGUgKyAnOycpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjYyA8IDMyIHx8IGNjID49IDEyNyB8fCBzcGVjaWFsW2NdKSB7XG4gICAgICAgICAgICBjaGFycy5wdXNoKCcmIycgKyBjYyArICc7Jyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjaGFycy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgICBcIjlcIjogXCJUYWI7XCIsXG4gICAgXCIxMFwiOiBcIk5ld0xpbmU7XCIsXG4gICAgXCIzM1wiOiBcImV4Y2w7XCIsXG4gICAgXCIzNFwiOiBcInF1b3Q7XCIsXG4gICAgXCIzNVwiOiBcIm51bTtcIixcbiAgICBcIjM2XCI6IFwiZG9sbGFyO1wiLFxuICAgIFwiMzdcIjogXCJwZXJjbnQ7XCIsXG4gICAgXCIzOFwiOiBcImFtcDtcIixcbiAgICBcIjM5XCI6IFwiYXBvcztcIixcbiAgICBcIjQwXCI6IFwibHBhcjtcIixcbiAgICBcIjQxXCI6IFwicnBhcjtcIixcbiAgICBcIjQyXCI6IFwibWlkYXN0O1wiLFxuICAgIFwiNDNcIjogXCJwbHVzO1wiLFxuICAgIFwiNDRcIjogXCJjb21tYTtcIixcbiAgICBcIjQ2XCI6IFwicGVyaW9kO1wiLFxuICAgIFwiNDdcIjogXCJzb2w7XCIsXG4gICAgXCI1OFwiOiBcImNvbG9uO1wiLFxuICAgIFwiNTlcIjogXCJzZW1pO1wiLFxuICAgIFwiNjBcIjogXCJsdDtcIixcbiAgICBcIjYxXCI6IFwiZXF1YWxzO1wiLFxuICAgIFwiNjJcIjogXCJndDtcIixcbiAgICBcIjYzXCI6IFwicXVlc3Q7XCIsXG4gICAgXCI2NFwiOiBcImNvbW1hdDtcIixcbiAgICBcIjkxXCI6IFwibHNxYjtcIixcbiAgICBcIjkyXCI6IFwiYnNvbDtcIixcbiAgICBcIjkzXCI6IFwicnNxYjtcIixcbiAgICBcIjk0XCI6IFwiSGF0O1wiLFxuICAgIFwiOTVcIjogXCJVbmRlckJhcjtcIixcbiAgICBcIjk2XCI6IFwiZ3JhdmU7XCIsXG4gICAgXCIxMjNcIjogXCJsY3ViO1wiLFxuICAgIFwiMTI0XCI6IFwiVmVydGljYWxMaW5lO1wiLFxuICAgIFwiMTI1XCI6IFwicmN1YjtcIixcbiAgICBcIjE2MFwiOiBcIk5vbkJyZWFraW5nU3BhY2U7XCIsXG4gICAgXCIxNjFcIjogXCJpZXhjbDtcIixcbiAgICBcIjE2MlwiOiBcImNlbnQ7XCIsXG4gICAgXCIxNjNcIjogXCJwb3VuZDtcIixcbiAgICBcIjE2NFwiOiBcImN1cnJlbjtcIixcbiAgICBcIjE2NVwiOiBcInllbjtcIixcbiAgICBcIjE2NlwiOiBcImJydmJhcjtcIixcbiAgICBcIjE2N1wiOiBcInNlY3Q7XCIsXG4gICAgXCIxNjhcIjogXCJ1bWw7XCIsXG4gICAgXCIxNjlcIjogXCJjb3B5O1wiLFxuICAgIFwiMTcwXCI6IFwib3JkZjtcIixcbiAgICBcIjE3MVwiOiBcImxhcXVvO1wiLFxuICAgIFwiMTcyXCI6IFwibm90O1wiLFxuICAgIFwiMTczXCI6IFwic2h5O1wiLFxuICAgIFwiMTc0XCI6IFwicmVnO1wiLFxuICAgIFwiMTc1XCI6IFwic3RybnM7XCIsXG4gICAgXCIxNzZcIjogXCJkZWc7XCIsXG4gICAgXCIxNzdcIjogXCJwbTtcIixcbiAgICBcIjE3OFwiOiBcInN1cDI7XCIsXG4gICAgXCIxNzlcIjogXCJzdXAzO1wiLFxuICAgIFwiMTgwXCI6IFwiRGlhY3JpdGljYWxBY3V0ZTtcIixcbiAgICBcIjE4MVwiOiBcIm1pY3JvO1wiLFxuICAgIFwiMTgyXCI6IFwicGFyYTtcIixcbiAgICBcIjE4M1wiOiBcIm1pZGRvdDtcIixcbiAgICBcIjE4NFwiOiBcIkNlZGlsbGE7XCIsXG4gICAgXCIxODVcIjogXCJzdXAxO1wiLFxuICAgIFwiMTg2XCI6IFwib3JkbTtcIixcbiAgICBcIjE4N1wiOiBcInJhcXVvO1wiLFxuICAgIFwiMTg4XCI6IFwiZnJhYzE0O1wiLFxuICAgIFwiMTg5XCI6IFwiaGFsZjtcIixcbiAgICBcIjE5MFwiOiBcImZyYWMzNDtcIixcbiAgICBcIjE5MVwiOiBcImlxdWVzdDtcIixcbiAgICBcIjE5MlwiOiBcIkFncmF2ZTtcIixcbiAgICBcIjE5M1wiOiBcIkFhY3V0ZTtcIixcbiAgICBcIjE5NFwiOiBcIkFjaXJjO1wiLFxuICAgIFwiMTk1XCI6IFwiQXRpbGRlO1wiLFxuICAgIFwiMTk2XCI6IFwiQXVtbDtcIixcbiAgICBcIjE5N1wiOiBcIkFyaW5nO1wiLFxuICAgIFwiMTk4XCI6IFwiQUVsaWc7XCIsXG4gICAgXCIxOTlcIjogXCJDY2VkaWw7XCIsXG4gICAgXCIyMDBcIjogXCJFZ3JhdmU7XCIsXG4gICAgXCIyMDFcIjogXCJFYWN1dGU7XCIsXG4gICAgXCIyMDJcIjogXCJFY2lyYztcIixcbiAgICBcIjIwM1wiOiBcIkV1bWw7XCIsXG4gICAgXCIyMDRcIjogXCJJZ3JhdmU7XCIsXG4gICAgXCIyMDVcIjogXCJJYWN1dGU7XCIsXG4gICAgXCIyMDZcIjogXCJJY2lyYztcIixcbiAgICBcIjIwN1wiOiBcIkl1bWw7XCIsXG4gICAgXCIyMDhcIjogXCJFVEg7XCIsXG4gICAgXCIyMDlcIjogXCJOdGlsZGU7XCIsXG4gICAgXCIyMTBcIjogXCJPZ3JhdmU7XCIsXG4gICAgXCIyMTFcIjogXCJPYWN1dGU7XCIsXG4gICAgXCIyMTJcIjogXCJPY2lyYztcIixcbiAgICBcIjIxM1wiOiBcIk90aWxkZTtcIixcbiAgICBcIjIxNFwiOiBcIk91bWw7XCIsXG4gICAgXCIyMTVcIjogXCJ0aW1lcztcIixcbiAgICBcIjIxNlwiOiBcIk9zbGFzaDtcIixcbiAgICBcIjIxN1wiOiBcIlVncmF2ZTtcIixcbiAgICBcIjIxOFwiOiBcIlVhY3V0ZTtcIixcbiAgICBcIjIxOVwiOiBcIlVjaXJjO1wiLFxuICAgIFwiMjIwXCI6IFwiVXVtbDtcIixcbiAgICBcIjIyMVwiOiBcIllhY3V0ZTtcIixcbiAgICBcIjIyMlwiOiBcIlRIT1JOO1wiLFxuICAgIFwiMjIzXCI6IFwic3psaWc7XCIsXG4gICAgXCIyMjRcIjogXCJhZ3JhdmU7XCIsXG4gICAgXCIyMjVcIjogXCJhYWN1dGU7XCIsXG4gICAgXCIyMjZcIjogXCJhY2lyYztcIixcbiAgICBcIjIyN1wiOiBcImF0aWxkZTtcIixcbiAgICBcIjIyOFwiOiBcImF1bWw7XCIsXG4gICAgXCIyMjlcIjogXCJhcmluZztcIixcbiAgICBcIjIzMFwiOiBcImFlbGlnO1wiLFxuICAgIFwiMjMxXCI6IFwiY2NlZGlsO1wiLFxuICAgIFwiMjMyXCI6IFwiZWdyYXZlO1wiLFxuICAgIFwiMjMzXCI6IFwiZWFjdXRlO1wiLFxuICAgIFwiMjM0XCI6IFwiZWNpcmM7XCIsXG4gICAgXCIyMzVcIjogXCJldW1sO1wiLFxuICAgIFwiMjM2XCI6IFwiaWdyYXZlO1wiLFxuICAgIFwiMjM3XCI6IFwiaWFjdXRlO1wiLFxuICAgIFwiMjM4XCI6IFwiaWNpcmM7XCIsXG4gICAgXCIyMzlcIjogXCJpdW1sO1wiLFxuICAgIFwiMjQwXCI6IFwiZXRoO1wiLFxuICAgIFwiMjQxXCI6IFwibnRpbGRlO1wiLFxuICAgIFwiMjQyXCI6IFwib2dyYXZlO1wiLFxuICAgIFwiMjQzXCI6IFwib2FjdXRlO1wiLFxuICAgIFwiMjQ0XCI6IFwib2NpcmM7XCIsXG4gICAgXCIyNDVcIjogXCJvdGlsZGU7XCIsXG4gICAgXCIyNDZcIjogXCJvdW1sO1wiLFxuICAgIFwiMjQ3XCI6IFwiZGl2aWRlO1wiLFxuICAgIFwiMjQ4XCI6IFwib3NsYXNoO1wiLFxuICAgIFwiMjQ5XCI6IFwidWdyYXZlO1wiLFxuICAgIFwiMjUwXCI6IFwidWFjdXRlO1wiLFxuICAgIFwiMjUxXCI6IFwidWNpcmM7XCIsXG4gICAgXCIyNTJcIjogXCJ1dW1sO1wiLFxuICAgIFwiMjUzXCI6IFwieWFjdXRlO1wiLFxuICAgIFwiMjU0XCI6IFwidGhvcm47XCIsXG4gICAgXCIyNTVcIjogXCJ5dW1sO1wiLFxuICAgIFwiMjU2XCI6IFwiQW1hY3I7XCIsXG4gICAgXCIyNTdcIjogXCJhbWFjcjtcIixcbiAgICBcIjI1OFwiOiBcIkFicmV2ZTtcIixcbiAgICBcIjI1OVwiOiBcImFicmV2ZTtcIixcbiAgICBcIjI2MFwiOiBcIkFvZ29uO1wiLFxuICAgIFwiMjYxXCI6IFwiYW9nb247XCIsXG4gICAgXCIyNjJcIjogXCJDYWN1dGU7XCIsXG4gICAgXCIyNjNcIjogXCJjYWN1dGU7XCIsXG4gICAgXCIyNjRcIjogXCJDY2lyYztcIixcbiAgICBcIjI2NVwiOiBcImNjaXJjO1wiLFxuICAgIFwiMjY2XCI6IFwiQ2RvdDtcIixcbiAgICBcIjI2N1wiOiBcImNkb3Q7XCIsXG4gICAgXCIyNjhcIjogXCJDY2Fyb247XCIsXG4gICAgXCIyNjlcIjogXCJjY2Fyb247XCIsXG4gICAgXCIyNzBcIjogXCJEY2Fyb247XCIsXG4gICAgXCIyNzFcIjogXCJkY2Fyb247XCIsXG4gICAgXCIyNzJcIjogXCJEc3Ryb2s7XCIsXG4gICAgXCIyNzNcIjogXCJkc3Ryb2s7XCIsXG4gICAgXCIyNzRcIjogXCJFbWFjcjtcIixcbiAgICBcIjI3NVwiOiBcImVtYWNyO1wiLFxuICAgIFwiMjc4XCI6IFwiRWRvdDtcIixcbiAgICBcIjI3OVwiOiBcImVkb3Q7XCIsXG4gICAgXCIyODBcIjogXCJFb2dvbjtcIixcbiAgICBcIjI4MVwiOiBcImVvZ29uO1wiLFxuICAgIFwiMjgyXCI6IFwiRWNhcm9uO1wiLFxuICAgIFwiMjgzXCI6IFwiZWNhcm9uO1wiLFxuICAgIFwiMjg0XCI6IFwiR2NpcmM7XCIsXG4gICAgXCIyODVcIjogXCJnY2lyYztcIixcbiAgICBcIjI4NlwiOiBcIkdicmV2ZTtcIixcbiAgICBcIjI4N1wiOiBcImdicmV2ZTtcIixcbiAgICBcIjI4OFwiOiBcIkdkb3Q7XCIsXG4gICAgXCIyODlcIjogXCJnZG90O1wiLFxuICAgIFwiMjkwXCI6IFwiR2NlZGlsO1wiLFxuICAgIFwiMjkyXCI6IFwiSGNpcmM7XCIsXG4gICAgXCIyOTNcIjogXCJoY2lyYztcIixcbiAgICBcIjI5NFwiOiBcIkhzdHJvaztcIixcbiAgICBcIjI5NVwiOiBcImhzdHJvaztcIixcbiAgICBcIjI5NlwiOiBcIkl0aWxkZTtcIixcbiAgICBcIjI5N1wiOiBcIml0aWxkZTtcIixcbiAgICBcIjI5OFwiOiBcIkltYWNyO1wiLFxuICAgIFwiMjk5XCI6IFwiaW1hY3I7XCIsXG4gICAgXCIzMDJcIjogXCJJb2dvbjtcIixcbiAgICBcIjMwM1wiOiBcImlvZ29uO1wiLFxuICAgIFwiMzA0XCI6IFwiSWRvdDtcIixcbiAgICBcIjMwNVwiOiBcImlub2RvdDtcIixcbiAgICBcIjMwNlwiOiBcIklKbGlnO1wiLFxuICAgIFwiMzA3XCI6IFwiaWpsaWc7XCIsXG4gICAgXCIzMDhcIjogXCJKY2lyYztcIixcbiAgICBcIjMwOVwiOiBcImpjaXJjO1wiLFxuICAgIFwiMzEwXCI6IFwiS2NlZGlsO1wiLFxuICAgIFwiMzExXCI6IFwia2NlZGlsO1wiLFxuICAgIFwiMzEyXCI6IFwia2dyZWVuO1wiLFxuICAgIFwiMzEzXCI6IFwiTGFjdXRlO1wiLFxuICAgIFwiMzE0XCI6IFwibGFjdXRlO1wiLFxuICAgIFwiMzE1XCI6IFwiTGNlZGlsO1wiLFxuICAgIFwiMzE2XCI6IFwibGNlZGlsO1wiLFxuICAgIFwiMzE3XCI6IFwiTGNhcm9uO1wiLFxuICAgIFwiMzE4XCI6IFwibGNhcm9uO1wiLFxuICAgIFwiMzE5XCI6IFwiTG1pZG90O1wiLFxuICAgIFwiMzIwXCI6IFwibG1pZG90O1wiLFxuICAgIFwiMzIxXCI6IFwiTHN0cm9rO1wiLFxuICAgIFwiMzIyXCI6IFwibHN0cm9rO1wiLFxuICAgIFwiMzIzXCI6IFwiTmFjdXRlO1wiLFxuICAgIFwiMzI0XCI6IFwibmFjdXRlO1wiLFxuICAgIFwiMzI1XCI6IFwiTmNlZGlsO1wiLFxuICAgIFwiMzI2XCI6IFwibmNlZGlsO1wiLFxuICAgIFwiMzI3XCI6IFwiTmNhcm9uO1wiLFxuICAgIFwiMzI4XCI6IFwibmNhcm9uO1wiLFxuICAgIFwiMzI5XCI6IFwibmFwb3M7XCIsXG4gICAgXCIzMzBcIjogXCJFTkc7XCIsXG4gICAgXCIzMzFcIjogXCJlbmc7XCIsXG4gICAgXCIzMzJcIjogXCJPbWFjcjtcIixcbiAgICBcIjMzM1wiOiBcIm9tYWNyO1wiLFxuICAgIFwiMzM2XCI6IFwiT2RibGFjO1wiLFxuICAgIFwiMzM3XCI6IFwib2RibGFjO1wiLFxuICAgIFwiMzM4XCI6IFwiT0VsaWc7XCIsXG4gICAgXCIzMzlcIjogXCJvZWxpZztcIixcbiAgICBcIjM0MFwiOiBcIlJhY3V0ZTtcIixcbiAgICBcIjM0MVwiOiBcInJhY3V0ZTtcIixcbiAgICBcIjM0MlwiOiBcIlJjZWRpbDtcIixcbiAgICBcIjM0M1wiOiBcInJjZWRpbDtcIixcbiAgICBcIjM0NFwiOiBcIlJjYXJvbjtcIixcbiAgICBcIjM0NVwiOiBcInJjYXJvbjtcIixcbiAgICBcIjM0NlwiOiBcIlNhY3V0ZTtcIixcbiAgICBcIjM0N1wiOiBcInNhY3V0ZTtcIixcbiAgICBcIjM0OFwiOiBcIlNjaXJjO1wiLFxuICAgIFwiMzQ5XCI6IFwic2NpcmM7XCIsXG4gICAgXCIzNTBcIjogXCJTY2VkaWw7XCIsXG4gICAgXCIzNTFcIjogXCJzY2VkaWw7XCIsXG4gICAgXCIzNTJcIjogXCJTY2Fyb247XCIsXG4gICAgXCIzNTNcIjogXCJzY2Fyb247XCIsXG4gICAgXCIzNTRcIjogXCJUY2VkaWw7XCIsXG4gICAgXCIzNTVcIjogXCJ0Y2VkaWw7XCIsXG4gICAgXCIzNTZcIjogXCJUY2Fyb247XCIsXG4gICAgXCIzNTdcIjogXCJ0Y2Fyb247XCIsXG4gICAgXCIzNThcIjogXCJUc3Ryb2s7XCIsXG4gICAgXCIzNTlcIjogXCJ0c3Ryb2s7XCIsXG4gICAgXCIzNjBcIjogXCJVdGlsZGU7XCIsXG4gICAgXCIzNjFcIjogXCJ1dGlsZGU7XCIsXG4gICAgXCIzNjJcIjogXCJVbWFjcjtcIixcbiAgICBcIjM2M1wiOiBcInVtYWNyO1wiLFxuICAgIFwiMzY0XCI6IFwiVWJyZXZlO1wiLFxuICAgIFwiMzY1XCI6IFwidWJyZXZlO1wiLFxuICAgIFwiMzY2XCI6IFwiVXJpbmc7XCIsXG4gICAgXCIzNjdcIjogXCJ1cmluZztcIixcbiAgICBcIjM2OFwiOiBcIlVkYmxhYztcIixcbiAgICBcIjM2OVwiOiBcInVkYmxhYztcIixcbiAgICBcIjM3MFwiOiBcIlVvZ29uO1wiLFxuICAgIFwiMzcxXCI6IFwidW9nb247XCIsXG4gICAgXCIzNzJcIjogXCJXY2lyYztcIixcbiAgICBcIjM3M1wiOiBcIndjaXJjO1wiLFxuICAgIFwiMzc0XCI6IFwiWWNpcmM7XCIsXG4gICAgXCIzNzVcIjogXCJ5Y2lyYztcIixcbiAgICBcIjM3NlwiOiBcIll1bWw7XCIsXG4gICAgXCIzNzdcIjogXCJaYWN1dGU7XCIsXG4gICAgXCIzNzhcIjogXCJ6YWN1dGU7XCIsXG4gICAgXCIzNzlcIjogXCJaZG90O1wiLFxuICAgIFwiMzgwXCI6IFwiemRvdDtcIixcbiAgICBcIjM4MVwiOiBcIlpjYXJvbjtcIixcbiAgICBcIjM4MlwiOiBcInpjYXJvbjtcIixcbiAgICBcIjQwMlwiOiBcImZub2Y7XCIsXG4gICAgXCI0MzdcIjogXCJpbXBlZDtcIixcbiAgICBcIjUwMVwiOiBcImdhY3V0ZTtcIixcbiAgICBcIjU2N1wiOiBcImptYXRoO1wiLFxuICAgIFwiNzEwXCI6IFwiY2lyYztcIixcbiAgICBcIjcxMVwiOiBcIkhhY2VrO1wiLFxuICAgIFwiNzI4XCI6IFwiYnJldmU7XCIsXG4gICAgXCI3MjlcIjogXCJkb3Q7XCIsXG4gICAgXCI3MzBcIjogXCJyaW5nO1wiLFxuICAgIFwiNzMxXCI6IFwib2dvbjtcIixcbiAgICBcIjczMlwiOiBcInRpbGRlO1wiLFxuICAgIFwiNzMzXCI6IFwiRGlhY3JpdGljYWxEb3VibGVBY3V0ZTtcIixcbiAgICBcIjc4NVwiOiBcIkRvd25CcmV2ZTtcIixcbiAgICBcIjkxM1wiOiBcIkFscGhhO1wiLFxuICAgIFwiOTE0XCI6IFwiQmV0YTtcIixcbiAgICBcIjkxNVwiOiBcIkdhbW1hO1wiLFxuICAgIFwiOTE2XCI6IFwiRGVsdGE7XCIsXG4gICAgXCI5MTdcIjogXCJFcHNpbG9uO1wiLFxuICAgIFwiOTE4XCI6IFwiWmV0YTtcIixcbiAgICBcIjkxOVwiOiBcIkV0YTtcIixcbiAgICBcIjkyMFwiOiBcIlRoZXRhO1wiLFxuICAgIFwiOTIxXCI6IFwiSW90YTtcIixcbiAgICBcIjkyMlwiOiBcIkthcHBhO1wiLFxuICAgIFwiOTIzXCI6IFwiTGFtYmRhO1wiLFxuICAgIFwiOTI0XCI6IFwiTXU7XCIsXG4gICAgXCI5MjVcIjogXCJOdTtcIixcbiAgICBcIjkyNlwiOiBcIlhpO1wiLFxuICAgIFwiOTI3XCI6IFwiT21pY3JvbjtcIixcbiAgICBcIjkyOFwiOiBcIlBpO1wiLFxuICAgIFwiOTI5XCI6IFwiUmhvO1wiLFxuICAgIFwiOTMxXCI6IFwiU2lnbWE7XCIsXG4gICAgXCI5MzJcIjogXCJUYXU7XCIsXG4gICAgXCI5MzNcIjogXCJVcHNpbG9uO1wiLFxuICAgIFwiOTM0XCI6IFwiUGhpO1wiLFxuICAgIFwiOTM1XCI6IFwiQ2hpO1wiLFxuICAgIFwiOTM2XCI6IFwiUHNpO1wiLFxuICAgIFwiOTM3XCI6IFwiT21lZ2E7XCIsXG4gICAgXCI5NDVcIjogXCJhbHBoYTtcIixcbiAgICBcIjk0NlwiOiBcImJldGE7XCIsXG4gICAgXCI5NDdcIjogXCJnYW1tYTtcIixcbiAgICBcIjk0OFwiOiBcImRlbHRhO1wiLFxuICAgIFwiOTQ5XCI6IFwiZXBzaWxvbjtcIixcbiAgICBcIjk1MFwiOiBcInpldGE7XCIsXG4gICAgXCI5NTFcIjogXCJldGE7XCIsXG4gICAgXCI5NTJcIjogXCJ0aGV0YTtcIixcbiAgICBcIjk1M1wiOiBcImlvdGE7XCIsXG4gICAgXCI5NTRcIjogXCJrYXBwYTtcIixcbiAgICBcIjk1NVwiOiBcImxhbWJkYTtcIixcbiAgICBcIjk1NlwiOiBcIm11O1wiLFxuICAgIFwiOTU3XCI6IFwibnU7XCIsXG4gICAgXCI5NThcIjogXCJ4aTtcIixcbiAgICBcIjk1OVwiOiBcIm9taWNyb247XCIsXG4gICAgXCI5NjBcIjogXCJwaTtcIixcbiAgICBcIjk2MVwiOiBcInJobztcIixcbiAgICBcIjk2MlwiOiBcInZhcnNpZ21hO1wiLFxuICAgIFwiOTYzXCI6IFwic2lnbWE7XCIsXG4gICAgXCI5NjRcIjogXCJ0YXU7XCIsXG4gICAgXCI5NjVcIjogXCJ1cHNpbG9uO1wiLFxuICAgIFwiOTY2XCI6IFwicGhpO1wiLFxuICAgIFwiOTY3XCI6IFwiY2hpO1wiLFxuICAgIFwiOTY4XCI6IFwicHNpO1wiLFxuICAgIFwiOTY5XCI6IFwib21lZ2E7XCIsXG4gICAgXCI5NzdcIjogXCJ2YXJ0aGV0YTtcIixcbiAgICBcIjk3OFwiOiBcInVwc2loO1wiLFxuICAgIFwiOTgxXCI6IFwidmFycGhpO1wiLFxuICAgIFwiOTgyXCI6IFwidmFycGk7XCIsXG4gICAgXCI5ODhcIjogXCJHYW1tYWQ7XCIsXG4gICAgXCI5ODlcIjogXCJnYW1tYWQ7XCIsXG4gICAgXCIxMDA4XCI6IFwidmFya2FwcGE7XCIsXG4gICAgXCIxMDA5XCI6IFwidmFycmhvO1wiLFxuICAgIFwiMTAxM1wiOiBcInZhcmVwc2lsb247XCIsXG4gICAgXCIxMDE0XCI6IFwiYmVwc2k7XCIsXG4gICAgXCIxMDI1XCI6IFwiSU9jeTtcIixcbiAgICBcIjEwMjZcIjogXCJESmN5O1wiLFxuICAgIFwiMTAyN1wiOiBcIkdKY3k7XCIsXG4gICAgXCIxMDI4XCI6IFwiSnVrY3k7XCIsXG4gICAgXCIxMDI5XCI6IFwiRFNjeTtcIixcbiAgICBcIjEwMzBcIjogXCJJdWtjeTtcIixcbiAgICBcIjEwMzFcIjogXCJZSWN5O1wiLFxuICAgIFwiMTAzMlwiOiBcIkpzZXJjeTtcIixcbiAgICBcIjEwMzNcIjogXCJMSmN5O1wiLFxuICAgIFwiMTAzNFwiOiBcIk5KY3k7XCIsXG4gICAgXCIxMDM1XCI6IFwiVFNIY3k7XCIsXG4gICAgXCIxMDM2XCI6IFwiS0pjeTtcIixcbiAgICBcIjEwMzhcIjogXCJVYnJjeTtcIixcbiAgICBcIjEwMzlcIjogXCJEWmN5O1wiLFxuICAgIFwiMTA0MFwiOiBcIkFjeTtcIixcbiAgICBcIjEwNDFcIjogXCJCY3k7XCIsXG4gICAgXCIxMDQyXCI6IFwiVmN5O1wiLFxuICAgIFwiMTA0M1wiOiBcIkdjeTtcIixcbiAgICBcIjEwNDRcIjogXCJEY3k7XCIsXG4gICAgXCIxMDQ1XCI6IFwiSUVjeTtcIixcbiAgICBcIjEwNDZcIjogXCJaSGN5O1wiLFxuICAgIFwiMTA0N1wiOiBcIlpjeTtcIixcbiAgICBcIjEwNDhcIjogXCJJY3k7XCIsXG4gICAgXCIxMDQ5XCI6IFwiSmN5O1wiLFxuICAgIFwiMTA1MFwiOiBcIktjeTtcIixcbiAgICBcIjEwNTFcIjogXCJMY3k7XCIsXG4gICAgXCIxMDUyXCI6IFwiTWN5O1wiLFxuICAgIFwiMTA1M1wiOiBcIk5jeTtcIixcbiAgICBcIjEwNTRcIjogXCJPY3k7XCIsXG4gICAgXCIxMDU1XCI6IFwiUGN5O1wiLFxuICAgIFwiMTA1NlwiOiBcIlJjeTtcIixcbiAgICBcIjEwNTdcIjogXCJTY3k7XCIsXG4gICAgXCIxMDU4XCI6IFwiVGN5O1wiLFxuICAgIFwiMTA1OVwiOiBcIlVjeTtcIixcbiAgICBcIjEwNjBcIjogXCJGY3k7XCIsXG4gICAgXCIxMDYxXCI6IFwiS0hjeTtcIixcbiAgICBcIjEwNjJcIjogXCJUU2N5O1wiLFxuICAgIFwiMTA2M1wiOiBcIkNIY3k7XCIsXG4gICAgXCIxMDY0XCI6IFwiU0hjeTtcIixcbiAgICBcIjEwNjVcIjogXCJTSENIY3k7XCIsXG4gICAgXCIxMDY2XCI6IFwiSEFSRGN5O1wiLFxuICAgIFwiMTA2N1wiOiBcIlljeTtcIixcbiAgICBcIjEwNjhcIjogXCJTT0ZUY3k7XCIsXG4gICAgXCIxMDY5XCI6IFwiRWN5O1wiLFxuICAgIFwiMTA3MFwiOiBcIllVY3k7XCIsXG4gICAgXCIxMDcxXCI6IFwiWUFjeTtcIixcbiAgICBcIjEwNzJcIjogXCJhY3k7XCIsXG4gICAgXCIxMDczXCI6IFwiYmN5O1wiLFxuICAgIFwiMTA3NFwiOiBcInZjeTtcIixcbiAgICBcIjEwNzVcIjogXCJnY3k7XCIsXG4gICAgXCIxMDc2XCI6IFwiZGN5O1wiLFxuICAgIFwiMTA3N1wiOiBcImllY3k7XCIsXG4gICAgXCIxMDc4XCI6IFwiemhjeTtcIixcbiAgICBcIjEwNzlcIjogXCJ6Y3k7XCIsXG4gICAgXCIxMDgwXCI6IFwiaWN5O1wiLFxuICAgIFwiMTA4MVwiOiBcImpjeTtcIixcbiAgICBcIjEwODJcIjogXCJrY3k7XCIsXG4gICAgXCIxMDgzXCI6IFwibGN5O1wiLFxuICAgIFwiMTA4NFwiOiBcIm1jeTtcIixcbiAgICBcIjEwODVcIjogXCJuY3k7XCIsXG4gICAgXCIxMDg2XCI6IFwib2N5O1wiLFxuICAgIFwiMTA4N1wiOiBcInBjeTtcIixcbiAgICBcIjEwODhcIjogXCJyY3k7XCIsXG4gICAgXCIxMDg5XCI6IFwic2N5O1wiLFxuICAgIFwiMTA5MFwiOiBcInRjeTtcIixcbiAgICBcIjEwOTFcIjogXCJ1Y3k7XCIsXG4gICAgXCIxMDkyXCI6IFwiZmN5O1wiLFxuICAgIFwiMTA5M1wiOiBcImtoY3k7XCIsXG4gICAgXCIxMDk0XCI6IFwidHNjeTtcIixcbiAgICBcIjEwOTVcIjogXCJjaGN5O1wiLFxuICAgIFwiMTA5NlwiOiBcInNoY3k7XCIsXG4gICAgXCIxMDk3XCI6IFwic2hjaGN5O1wiLFxuICAgIFwiMTA5OFwiOiBcImhhcmRjeTtcIixcbiAgICBcIjEwOTlcIjogXCJ5Y3k7XCIsXG4gICAgXCIxMTAwXCI6IFwic29mdGN5O1wiLFxuICAgIFwiMTEwMVwiOiBcImVjeTtcIixcbiAgICBcIjExMDJcIjogXCJ5dWN5O1wiLFxuICAgIFwiMTEwM1wiOiBcInlhY3k7XCIsXG4gICAgXCIxMTA1XCI6IFwiaW9jeTtcIixcbiAgICBcIjExMDZcIjogXCJkamN5O1wiLFxuICAgIFwiMTEwN1wiOiBcImdqY3k7XCIsXG4gICAgXCIxMTA4XCI6IFwianVrY3k7XCIsXG4gICAgXCIxMTA5XCI6IFwiZHNjeTtcIixcbiAgICBcIjExMTBcIjogXCJpdWtjeTtcIixcbiAgICBcIjExMTFcIjogXCJ5aWN5O1wiLFxuICAgIFwiMTExMlwiOiBcImpzZXJjeTtcIixcbiAgICBcIjExMTNcIjogXCJsamN5O1wiLFxuICAgIFwiMTExNFwiOiBcIm5qY3k7XCIsXG4gICAgXCIxMTE1XCI6IFwidHNoY3k7XCIsXG4gICAgXCIxMTE2XCI6IFwia2pjeTtcIixcbiAgICBcIjExMThcIjogXCJ1YnJjeTtcIixcbiAgICBcIjExMTlcIjogXCJkemN5O1wiLFxuICAgIFwiODE5NFwiOiBcImVuc3A7XCIsXG4gICAgXCI4MTk1XCI6IFwiZW1zcDtcIixcbiAgICBcIjgxOTZcIjogXCJlbXNwMTM7XCIsXG4gICAgXCI4MTk3XCI6IFwiZW1zcDE0O1wiLFxuICAgIFwiODE5OVwiOiBcIm51bXNwO1wiLFxuICAgIFwiODIwMFwiOiBcInB1bmNzcDtcIixcbiAgICBcIjgyMDFcIjogXCJUaGluU3BhY2U7XCIsXG4gICAgXCI4MjAyXCI6IFwiVmVyeVRoaW5TcGFjZTtcIixcbiAgICBcIjgyMDNcIjogXCJaZXJvV2lkdGhTcGFjZTtcIixcbiAgICBcIjgyMDRcIjogXCJ6d25qO1wiLFxuICAgIFwiODIwNVwiOiBcInp3ajtcIixcbiAgICBcIjgyMDZcIjogXCJscm07XCIsXG4gICAgXCI4MjA3XCI6IFwicmxtO1wiLFxuICAgIFwiODIwOFwiOiBcImh5cGhlbjtcIixcbiAgICBcIjgyMTFcIjogXCJuZGFzaDtcIixcbiAgICBcIjgyMTJcIjogXCJtZGFzaDtcIixcbiAgICBcIjgyMTNcIjogXCJob3JiYXI7XCIsXG4gICAgXCI4MjE0XCI6IFwiVmVydDtcIixcbiAgICBcIjgyMTZcIjogXCJPcGVuQ3VybHlRdW90ZTtcIixcbiAgICBcIjgyMTdcIjogXCJyc3F1b3I7XCIsXG4gICAgXCI4MjE4XCI6IFwic2JxdW87XCIsXG4gICAgXCI4MjIwXCI6IFwiT3BlbkN1cmx5RG91YmxlUXVvdGU7XCIsXG4gICAgXCI4MjIxXCI6IFwicmRxdW9yO1wiLFxuICAgIFwiODIyMlwiOiBcImxkcXVvcjtcIixcbiAgICBcIjgyMjRcIjogXCJkYWdnZXI7XCIsXG4gICAgXCI4MjI1XCI6IFwiZGRhZ2dlcjtcIixcbiAgICBcIjgyMjZcIjogXCJidWxsZXQ7XCIsXG4gICAgXCI4MjI5XCI6IFwibmxkcjtcIixcbiAgICBcIjgyMzBcIjogXCJtbGRyO1wiLFxuICAgIFwiODI0MFwiOiBcInBlcm1pbDtcIixcbiAgICBcIjgyNDFcIjogXCJwZXJ0ZW5rO1wiLFxuICAgIFwiODI0MlwiOiBcInByaW1lO1wiLFxuICAgIFwiODI0M1wiOiBcIlByaW1lO1wiLFxuICAgIFwiODI0NFwiOiBcInRwcmltZTtcIixcbiAgICBcIjgyNDVcIjogXCJicHJpbWU7XCIsXG4gICAgXCI4MjQ5XCI6IFwibHNhcXVvO1wiLFxuICAgIFwiODI1MFwiOiBcInJzYXF1bztcIixcbiAgICBcIjgyNTRcIjogXCJPdmVyQmFyO1wiLFxuICAgIFwiODI1N1wiOiBcImNhcmV0O1wiLFxuICAgIFwiODI1OVwiOiBcImh5YnVsbDtcIixcbiAgICBcIjgyNjBcIjogXCJmcmFzbDtcIixcbiAgICBcIjgyNzFcIjogXCJic2VtaTtcIixcbiAgICBcIjgyNzlcIjogXCJxcHJpbWU7XCIsXG4gICAgXCI4Mjg3XCI6IFwiTWVkaXVtU3BhY2U7XCIsXG4gICAgXCI4Mjg4XCI6IFwiTm9CcmVhaztcIixcbiAgICBcIjgyODlcIjogXCJBcHBseUZ1bmN0aW9uO1wiLFxuICAgIFwiODI5MFwiOiBcIml0O1wiLFxuICAgIFwiODI5MVwiOiBcIkludmlzaWJsZUNvbW1hO1wiLFxuICAgIFwiODM2NFwiOiBcImV1cm87XCIsXG4gICAgXCI4NDExXCI6IFwiVHJpcGxlRG90O1wiLFxuICAgIFwiODQxMlwiOiBcIkRvdERvdDtcIixcbiAgICBcIjg0NTBcIjogXCJDb3BmO1wiLFxuICAgIFwiODQ1M1wiOiBcImluY2FyZTtcIixcbiAgICBcIjg0NThcIjogXCJnc2NyO1wiLFxuICAgIFwiODQ1OVwiOiBcIkhzY3I7XCIsXG4gICAgXCI4NDYwXCI6IFwiUG9pbmNhcmVwbGFuZTtcIixcbiAgICBcIjg0NjFcIjogXCJxdWF0ZXJuaW9ucztcIixcbiAgICBcIjg0NjJcIjogXCJwbGFuY2toO1wiLFxuICAgIFwiODQ2M1wiOiBcInBsYW5rdjtcIixcbiAgICBcIjg0NjRcIjogXCJJc2NyO1wiLFxuICAgIFwiODQ2NVwiOiBcImltYWdwYXJ0O1wiLFxuICAgIFwiODQ2NlwiOiBcIkxzY3I7XCIsXG4gICAgXCI4NDY3XCI6IFwiZWxsO1wiLFxuICAgIFwiODQ2OVwiOiBcIk5vcGY7XCIsXG4gICAgXCI4NDcwXCI6IFwibnVtZXJvO1wiLFxuICAgIFwiODQ3MVwiOiBcImNvcHlzcjtcIixcbiAgICBcIjg0NzJcIjogXCJ3cDtcIixcbiAgICBcIjg0NzNcIjogXCJwcmltZXM7XCIsXG4gICAgXCI4NDc0XCI6IFwicmF0aW9uYWxzO1wiLFxuICAgIFwiODQ3NVwiOiBcIlJzY3I7XCIsXG4gICAgXCI4NDc2XCI6IFwiUmZyO1wiLFxuICAgIFwiODQ3N1wiOiBcIlJvcGY7XCIsXG4gICAgXCI4NDc4XCI6IFwicng7XCIsXG4gICAgXCI4NDgyXCI6IFwidHJhZGU7XCIsXG4gICAgXCI4NDg0XCI6IFwiWm9wZjtcIixcbiAgICBcIjg0ODdcIjogXCJtaG87XCIsXG4gICAgXCI4NDg4XCI6IFwiWmZyO1wiLFxuICAgIFwiODQ4OVwiOiBcImlpb3RhO1wiLFxuICAgIFwiODQ5MlwiOiBcIkJzY3I7XCIsXG4gICAgXCI4NDkzXCI6IFwiQ2ZyO1wiLFxuICAgIFwiODQ5NVwiOiBcImVzY3I7XCIsXG4gICAgXCI4NDk2XCI6IFwiZXhwZWN0YXRpb247XCIsXG4gICAgXCI4NDk3XCI6IFwiRnNjcjtcIixcbiAgICBcIjg0OTlcIjogXCJwaG1tYXQ7XCIsXG4gICAgXCI4NTAwXCI6IFwib3NjcjtcIixcbiAgICBcIjg1MDFcIjogXCJhbGVwaDtcIixcbiAgICBcIjg1MDJcIjogXCJiZXRoO1wiLFxuICAgIFwiODUwM1wiOiBcImdpbWVsO1wiLFxuICAgIFwiODUwNFwiOiBcImRhbGV0aDtcIixcbiAgICBcIjg1MTdcIjogXCJERDtcIixcbiAgICBcIjg1MThcIjogXCJEaWZmZXJlbnRpYWxEO1wiLFxuICAgIFwiODUxOVwiOiBcImV4cG9uZW50aWFsZTtcIixcbiAgICBcIjg1MjBcIjogXCJJbWFnaW5hcnlJO1wiLFxuICAgIFwiODUzMVwiOiBcImZyYWMxMztcIixcbiAgICBcIjg1MzJcIjogXCJmcmFjMjM7XCIsXG4gICAgXCI4NTMzXCI6IFwiZnJhYzE1O1wiLFxuICAgIFwiODUzNFwiOiBcImZyYWMyNTtcIixcbiAgICBcIjg1MzVcIjogXCJmcmFjMzU7XCIsXG4gICAgXCI4NTM2XCI6IFwiZnJhYzQ1O1wiLFxuICAgIFwiODUzN1wiOiBcImZyYWMxNjtcIixcbiAgICBcIjg1MzhcIjogXCJmcmFjNTY7XCIsXG4gICAgXCI4NTM5XCI6IFwiZnJhYzE4O1wiLFxuICAgIFwiODU0MFwiOiBcImZyYWMzODtcIixcbiAgICBcIjg1NDFcIjogXCJmcmFjNTg7XCIsXG4gICAgXCI4NTQyXCI6IFwiZnJhYzc4O1wiLFxuICAgIFwiODU5MlwiOiBcInNsYXJyO1wiLFxuICAgIFwiODU5M1wiOiBcInVwYXJyb3c7XCIsXG4gICAgXCI4NTk0XCI6IFwic3JhcnI7XCIsXG4gICAgXCI4NTk1XCI6IFwiU2hvcnREb3duQXJyb3c7XCIsXG4gICAgXCI4NTk2XCI6IFwibGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NTk3XCI6IFwidmFycjtcIixcbiAgICBcIjg1OThcIjogXCJVcHBlckxlZnRBcnJvdztcIixcbiAgICBcIjg1OTlcIjogXCJVcHBlclJpZ2h0QXJyb3c7XCIsXG4gICAgXCI4NjAwXCI6IFwic2VhcnJvdztcIixcbiAgICBcIjg2MDFcIjogXCJzd2Fycm93O1wiLFxuICAgIFwiODYwMlwiOiBcIm5sZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjAzXCI6IFwibnJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjA1XCI6IFwicmlnaHRzcXVpZ2Fycm93O1wiLFxuICAgIFwiODYwNlwiOiBcInR3b2hlYWRsZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjA3XCI6IFwiVWFycjtcIixcbiAgICBcIjg2MDhcIjogXCJ0d29oZWFkcmlnaHRhcnJvdztcIixcbiAgICBcIjg2MDlcIjogXCJEYXJyO1wiLFxuICAgIFwiODYxMFwiOiBcImxlZnRhcnJvd3RhaWw7XCIsXG4gICAgXCI4NjExXCI6IFwicmlnaHRhcnJvd3RhaWw7XCIsXG4gICAgXCI4NjEyXCI6IFwibWFwc3RvbGVmdDtcIixcbiAgICBcIjg2MTNcIjogXCJVcFRlZUFycm93O1wiLFxuICAgIFwiODYxNFwiOiBcIlJpZ2h0VGVlQXJyb3c7XCIsXG4gICAgXCI4NjE1XCI6IFwibWFwc3RvZG93bjtcIixcbiAgICBcIjg2MTdcIjogXCJsYXJyaGs7XCIsXG4gICAgXCI4NjE4XCI6IFwicmFycmhrO1wiLFxuICAgIFwiODYxOVwiOiBcImxvb3BhcnJvd2xlZnQ7XCIsXG4gICAgXCI4NjIwXCI6IFwicmFycmxwO1wiLFxuICAgIFwiODYyMVwiOiBcImxlZnRyaWdodHNxdWlnYXJyb3c7XCIsXG4gICAgXCI4NjIyXCI6IFwibmxlZnRyaWdodGFycm93O1wiLFxuICAgIFwiODYyNFwiOiBcImxzaDtcIixcbiAgICBcIjg2MjVcIjogXCJyc2g7XCIsXG4gICAgXCI4NjI2XCI6IFwibGRzaDtcIixcbiAgICBcIjg2MjdcIjogXCJyZHNoO1wiLFxuICAgIFwiODYyOVwiOiBcImNyYXJyO1wiLFxuICAgIFwiODYzMFwiOiBcImN1cnZlYXJyb3dsZWZ0O1wiLFxuICAgIFwiODYzMVwiOiBcImN1cnZlYXJyb3dyaWdodDtcIixcbiAgICBcIjg2MzRcIjogXCJvbGFycjtcIixcbiAgICBcIjg2MzVcIjogXCJvcmFycjtcIixcbiAgICBcIjg2MzZcIjogXCJsaGFydTtcIixcbiAgICBcIjg2MzdcIjogXCJsaGFyZDtcIixcbiAgICBcIjg2MzhcIjogXCJ1cGhhcnBvb25yaWdodDtcIixcbiAgICBcIjg2MzlcIjogXCJ1cGhhcnBvb25sZWZ0O1wiLFxuICAgIFwiODY0MFwiOiBcIlJpZ2h0VmVjdG9yO1wiLFxuICAgIFwiODY0MVwiOiBcInJpZ2h0aGFycG9vbmRvd247XCIsXG4gICAgXCI4NjQyXCI6IFwiUmlnaHREb3duVmVjdG9yO1wiLFxuICAgIFwiODY0M1wiOiBcIkxlZnREb3duVmVjdG9yO1wiLFxuICAgIFwiODY0NFwiOiBcInJsYXJyO1wiLFxuICAgIFwiODY0NVwiOiBcIlVwQXJyb3dEb3duQXJyb3c7XCIsXG4gICAgXCI4NjQ2XCI6IFwibHJhcnI7XCIsXG4gICAgXCI4NjQ3XCI6IFwibGxhcnI7XCIsXG4gICAgXCI4NjQ4XCI6IFwidXVhcnI7XCIsXG4gICAgXCI4NjQ5XCI6IFwicnJhcnI7XCIsXG4gICAgXCI4NjUwXCI6IFwiZG93bmRvd25hcnJvd3M7XCIsXG4gICAgXCI4NjUxXCI6IFwiUmV2ZXJzZUVxdWlsaWJyaXVtO1wiLFxuICAgIFwiODY1MlwiOiBcInJsaGFyO1wiLFxuICAgIFwiODY1M1wiOiBcIm5MZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjU0XCI6IFwibkxlZnRyaWdodGFycm93O1wiLFxuICAgIFwiODY1NVwiOiBcIm5SaWdodGFycm93O1wiLFxuICAgIFwiODY1NlwiOiBcIkxlZnRhcnJvdztcIixcbiAgICBcIjg2NTdcIjogXCJVcGFycm93O1wiLFxuICAgIFwiODY1OFwiOiBcIlJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjU5XCI6IFwiRG93bmFycm93O1wiLFxuICAgIFwiODY2MFwiOiBcIkxlZnRyaWdodGFycm93O1wiLFxuICAgIFwiODY2MVwiOiBcInZBcnI7XCIsXG4gICAgXCI4NjYyXCI6IFwibndBcnI7XCIsXG4gICAgXCI4NjYzXCI6IFwibmVBcnI7XCIsXG4gICAgXCI4NjY0XCI6IFwic2VBcnI7XCIsXG4gICAgXCI4NjY1XCI6IFwic3dBcnI7XCIsXG4gICAgXCI4NjY2XCI6IFwiTGxlZnRhcnJvdztcIixcbiAgICBcIjg2NjdcIjogXCJScmlnaHRhcnJvdztcIixcbiAgICBcIjg2NjlcIjogXCJ6aWdyYXJyO1wiLFxuICAgIFwiODY3NlwiOiBcIkxlZnRBcnJvd0JhcjtcIixcbiAgICBcIjg2NzdcIjogXCJSaWdodEFycm93QmFyO1wiLFxuICAgIFwiODY5M1wiOiBcImR1YXJyO1wiLFxuICAgIFwiODcwMVwiOiBcImxvYXJyO1wiLFxuICAgIFwiODcwMlwiOiBcInJvYXJyO1wiLFxuICAgIFwiODcwM1wiOiBcImhvYXJyO1wiLFxuICAgIFwiODcwNFwiOiBcImZvcmFsbDtcIixcbiAgICBcIjg3MDVcIjogXCJjb21wbGVtZW50O1wiLFxuICAgIFwiODcwNlwiOiBcIlBhcnRpYWxEO1wiLFxuICAgIFwiODcwN1wiOiBcIkV4aXN0cztcIixcbiAgICBcIjg3MDhcIjogXCJOb3RFeGlzdHM7XCIsXG4gICAgXCI4NzA5XCI6IFwidmFybm90aGluZztcIixcbiAgICBcIjg3MTFcIjogXCJuYWJsYTtcIixcbiAgICBcIjg3MTJcIjogXCJpc2ludjtcIixcbiAgICBcIjg3MTNcIjogXCJub3RpbnZhO1wiLFxuICAgIFwiODcxNVwiOiBcIlN1Y2hUaGF0O1wiLFxuICAgIFwiODcxNlwiOiBcIk5vdFJldmVyc2VFbGVtZW50O1wiLFxuICAgIFwiODcxOVwiOiBcIlByb2R1Y3Q7XCIsXG4gICAgXCI4NzIwXCI6IFwiQ29wcm9kdWN0O1wiLFxuICAgIFwiODcyMVwiOiBcInN1bTtcIixcbiAgICBcIjg3MjJcIjogXCJtaW51cztcIixcbiAgICBcIjg3MjNcIjogXCJtcDtcIixcbiAgICBcIjg3MjRcIjogXCJwbHVzZG87XCIsXG4gICAgXCI4NzI2XCI6IFwic3NldG1uO1wiLFxuICAgIFwiODcyN1wiOiBcImxvd2FzdDtcIixcbiAgICBcIjg3MjhcIjogXCJTbWFsbENpcmNsZTtcIixcbiAgICBcIjg3MzBcIjogXCJTcXJ0O1wiLFxuICAgIFwiODczM1wiOiBcInZwcm9wO1wiLFxuICAgIFwiODczNFwiOiBcImluZmluO1wiLFxuICAgIFwiODczNVwiOiBcImFuZ3J0O1wiLFxuICAgIFwiODczNlwiOiBcImFuZ2xlO1wiLFxuICAgIFwiODczN1wiOiBcIm1lYXN1cmVkYW5nbGU7XCIsXG4gICAgXCI4NzM4XCI6IFwiYW5nc3BoO1wiLFxuICAgIFwiODczOVwiOiBcIlZlcnRpY2FsQmFyO1wiLFxuICAgIFwiODc0MFwiOiBcIm5zbWlkO1wiLFxuICAgIFwiODc0MVwiOiBcInNwYXI7XCIsXG4gICAgXCI4NzQyXCI6IFwibnNwYXI7XCIsXG4gICAgXCI4NzQzXCI6IFwid2VkZ2U7XCIsXG4gICAgXCI4NzQ0XCI6IFwidmVlO1wiLFxuICAgIFwiODc0NVwiOiBcImNhcDtcIixcbiAgICBcIjg3NDZcIjogXCJjdXA7XCIsXG4gICAgXCI4NzQ3XCI6IFwiSW50ZWdyYWw7XCIsXG4gICAgXCI4NzQ4XCI6IFwiSW50O1wiLFxuICAgIFwiODc0OVwiOiBcInRpbnQ7XCIsXG4gICAgXCI4NzUwXCI6IFwib2ludDtcIixcbiAgICBcIjg3NTFcIjogXCJEb3VibGVDb250b3VySW50ZWdyYWw7XCIsXG4gICAgXCI4NzUyXCI6IFwiQ2NvbmludDtcIixcbiAgICBcIjg3NTNcIjogXCJjd2ludDtcIixcbiAgICBcIjg3NTRcIjogXCJjd2NvbmludDtcIixcbiAgICBcIjg3NTVcIjogXCJDb3VudGVyQ2xvY2t3aXNlQ29udG91ckludGVncmFsO1wiLFxuICAgIFwiODc1NlwiOiBcInRoZXJlZm9yZTtcIixcbiAgICBcIjg3NTdcIjogXCJiZWNhdXNlO1wiLFxuICAgIFwiODc1OFwiOiBcInJhdGlvO1wiLFxuICAgIFwiODc1OVwiOiBcIlByb3BvcnRpb247XCIsXG4gICAgXCI4NzYwXCI6IFwibWludXNkO1wiLFxuICAgIFwiODc2MlwiOiBcIm1ERG90O1wiLFxuICAgIFwiODc2M1wiOiBcImhvbXRodDtcIixcbiAgICBcIjg3NjRcIjogXCJUaWxkZTtcIixcbiAgICBcIjg3NjVcIjogXCJic2ltO1wiLFxuICAgIFwiODc2NlwiOiBcIm1zdHBvcztcIixcbiAgICBcIjg3NjdcIjogXCJhY2Q7XCIsXG4gICAgXCI4NzY4XCI6IFwid3JlYXRoO1wiLFxuICAgIFwiODc2OVwiOiBcIm5zaW07XCIsXG4gICAgXCI4NzcwXCI6IFwiZXNpbTtcIixcbiAgICBcIjg3NzFcIjogXCJUaWxkZUVxdWFsO1wiLFxuICAgIFwiODc3MlwiOiBcIm5zaW1lcTtcIixcbiAgICBcIjg3NzNcIjogXCJUaWxkZUZ1bGxFcXVhbDtcIixcbiAgICBcIjg3NzRcIjogXCJzaW1uZTtcIixcbiAgICBcIjg3NzVcIjogXCJOb3RUaWxkZUZ1bGxFcXVhbDtcIixcbiAgICBcIjg3NzZcIjogXCJUaWxkZVRpbGRlO1wiLFxuICAgIFwiODc3N1wiOiBcIk5vdFRpbGRlVGlsZGU7XCIsXG4gICAgXCI4Nzc4XCI6IFwiYXBwcm94ZXE7XCIsXG4gICAgXCI4Nzc5XCI6IFwiYXBpZDtcIixcbiAgICBcIjg3ODBcIjogXCJiY29uZztcIixcbiAgICBcIjg3ODFcIjogXCJDdXBDYXA7XCIsXG4gICAgXCI4NzgyXCI6IFwiSHVtcERvd25IdW1wO1wiLFxuICAgIFwiODc4M1wiOiBcIkh1bXBFcXVhbDtcIixcbiAgICBcIjg3ODRcIjogXCJlc2RvdDtcIixcbiAgICBcIjg3ODVcIjogXCJlRG90O1wiLFxuICAgIFwiODc4NlwiOiBcImZhbGxpbmdkb3RzZXE7XCIsXG4gICAgXCI4Nzg3XCI6IFwicmlzaW5nZG90c2VxO1wiLFxuICAgIFwiODc4OFwiOiBcImNvbG9uZXE7XCIsXG4gICAgXCI4Nzg5XCI6IFwiZXFjb2xvbjtcIixcbiAgICBcIjg3OTBcIjogXCJlcWNpcmM7XCIsXG4gICAgXCI4NzkxXCI6IFwiY2lyZTtcIixcbiAgICBcIjg3OTNcIjogXCJ3ZWRnZXE7XCIsXG4gICAgXCI4Nzk0XCI6IFwidmVlZXE7XCIsXG4gICAgXCI4Nzk2XCI6IFwidHJpZTtcIixcbiAgICBcIjg3OTlcIjogXCJxdWVzdGVxO1wiLFxuICAgIFwiODgwMFwiOiBcIk5vdEVxdWFsO1wiLFxuICAgIFwiODgwMVwiOiBcImVxdWl2O1wiLFxuICAgIFwiODgwMlwiOiBcIk5vdENvbmdydWVudDtcIixcbiAgICBcIjg4MDRcIjogXCJsZXE7XCIsXG4gICAgXCI4ODA1XCI6IFwiR3JlYXRlckVxdWFsO1wiLFxuICAgIFwiODgwNlwiOiBcIkxlc3NGdWxsRXF1YWw7XCIsXG4gICAgXCI4ODA3XCI6IFwiR3JlYXRlckZ1bGxFcXVhbDtcIixcbiAgICBcIjg4MDhcIjogXCJsbmVxcTtcIixcbiAgICBcIjg4MDlcIjogXCJnbmVxcTtcIixcbiAgICBcIjg4MTBcIjogXCJOZXN0ZWRMZXNzTGVzcztcIixcbiAgICBcIjg4MTFcIjogXCJOZXN0ZWRHcmVhdGVyR3JlYXRlcjtcIixcbiAgICBcIjg4MTJcIjogXCJ0d2l4dDtcIixcbiAgICBcIjg4MTNcIjogXCJOb3RDdXBDYXA7XCIsXG4gICAgXCI4ODE0XCI6IFwiTm90TGVzcztcIixcbiAgICBcIjg4MTVcIjogXCJOb3RHcmVhdGVyO1wiLFxuICAgIFwiODgxNlwiOiBcIk5vdExlc3NFcXVhbDtcIixcbiAgICBcIjg4MTdcIjogXCJOb3RHcmVhdGVyRXF1YWw7XCIsXG4gICAgXCI4ODE4XCI6IFwibHNpbTtcIixcbiAgICBcIjg4MTlcIjogXCJndHJzaW07XCIsXG4gICAgXCI4ODIwXCI6IFwiTm90TGVzc1RpbGRlO1wiLFxuICAgIFwiODgyMVwiOiBcIk5vdEdyZWF0ZXJUaWxkZTtcIixcbiAgICBcIjg4MjJcIjogXCJsZztcIixcbiAgICBcIjg4MjNcIjogXCJndHJsZXNzO1wiLFxuICAgIFwiODgyNFwiOiBcIm50bGc7XCIsXG4gICAgXCI4ODI1XCI6IFwibnRnbDtcIixcbiAgICBcIjg4MjZcIjogXCJQcmVjZWRlcztcIixcbiAgICBcIjg4MjdcIjogXCJTdWNjZWVkcztcIixcbiAgICBcIjg4MjhcIjogXCJQcmVjZWRlc1NsYW50RXF1YWw7XCIsXG4gICAgXCI4ODI5XCI6IFwiU3VjY2VlZHNTbGFudEVxdWFsO1wiLFxuICAgIFwiODgzMFwiOiBcInByc2ltO1wiLFxuICAgIFwiODgzMVwiOiBcInN1Y2NzaW07XCIsXG4gICAgXCI4ODMyXCI6IFwibnByZWM7XCIsXG4gICAgXCI4ODMzXCI6IFwibnN1Y2M7XCIsXG4gICAgXCI4ODM0XCI6IFwic3Vic2V0O1wiLFxuICAgIFwiODgzNVwiOiBcInN1cHNldDtcIixcbiAgICBcIjg4MzZcIjogXCJuc3ViO1wiLFxuICAgIFwiODgzN1wiOiBcIm5zdXA7XCIsXG4gICAgXCI4ODM4XCI6IFwiU3Vic2V0RXF1YWw7XCIsXG4gICAgXCI4ODM5XCI6IFwic3Vwc2V0ZXE7XCIsXG4gICAgXCI4ODQwXCI6IFwibnN1YnNldGVxO1wiLFxuICAgIFwiODg0MVwiOiBcIm5zdXBzZXRlcTtcIixcbiAgICBcIjg4NDJcIjogXCJzdWJzZXRuZXE7XCIsXG4gICAgXCI4ODQzXCI6IFwic3Vwc2V0bmVxO1wiLFxuICAgIFwiODg0NVwiOiBcImN1cGRvdDtcIixcbiAgICBcIjg4NDZcIjogXCJ1cGx1cztcIixcbiAgICBcIjg4NDdcIjogXCJTcXVhcmVTdWJzZXQ7XCIsXG4gICAgXCI4ODQ4XCI6IFwiU3F1YXJlU3VwZXJzZXQ7XCIsXG4gICAgXCI4ODQ5XCI6IFwiU3F1YXJlU3Vic2V0RXF1YWw7XCIsXG4gICAgXCI4ODUwXCI6IFwiU3F1YXJlU3VwZXJzZXRFcXVhbDtcIixcbiAgICBcIjg4NTFcIjogXCJTcXVhcmVJbnRlcnNlY3Rpb247XCIsXG4gICAgXCI4ODUyXCI6IFwiU3F1YXJlVW5pb247XCIsXG4gICAgXCI4ODUzXCI6IFwib3BsdXM7XCIsXG4gICAgXCI4ODU0XCI6IFwib21pbnVzO1wiLFxuICAgIFwiODg1NVwiOiBcIm90aW1lcztcIixcbiAgICBcIjg4NTZcIjogXCJvc29sO1wiLFxuICAgIFwiODg1N1wiOiBcIm9kb3Q7XCIsXG4gICAgXCI4ODU4XCI6IFwib2NpcjtcIixcbiAgICBcIjg4NTlcIjogXCJvYXN0O1wiLFxuICAgIFwiODg2MVwiOiBcIm9kYXNoO1wiLFxuICAgIFwiODg2MlwiOiBcInBsdXNiO1wiLFxuICAgIFwiODg2M1wiOiBcIm1pbnVzYjtcIixcbiAgICBcIjg4NjRcIjogXCJ0aW1lc2I7XCIsXG4gICAgXCI4ODY1XCI6IFwic2RvdGI7XCIsXG4gICAgXCI4ODY2XCI6IFwidmRhc2g7XCIsXG4gICAgXCI4ODY3XCI6IFwiTGVmdFRlZTtcIixcbiAgICBcIjg4NjhcIjogXCJ0b3A7XCIsXG4gICAgXCI4ODY5XCI6IFwiVXBUZWU7XCIsXG4gICAgXCI4ODcxXCI6IFwibW9kZWxzO1wiLFxuICAgIFwiODg3MlwiOiBcInZEYXNoO1wiLFxuICAgIFwiODg3M1wiOiBcIlZkYXNoO1wiLFxuICAgIFwiODg3NFwiOiBcIlZ2ZGFzaDtcIixcbiAgICBcIjg4NzVcIjogXCJWRGFzaDtcIixcbiAgICBcIjg4NzZcIjogXCJudmRhc2g7XCIsXG4gICAgXCI4ODc3XCI6IFwibnZEYXNoO1wiLFxuICAgIFwiODg3OFwiOiBcIm5WZGFzaDtcIixcbiAgICBcIjg4NzlcIjogXCJuVkRhc2g7XCIsXG4gICAgXCI4ODgwXCI6IFwicHJ1cmVsO1wiLFxuICAgIFwiODg4MlwiOiBcInZsdHJpO1wiLFxuICAgIFwiODg4M1wiOiBcInZydHJpO1wiLFxuICAgIFwiODg4NFwiOiBcInRyaWFuZ2xlbGVmdGVxO1wiLFxuICAgIFwiODg4NVwiOiBcInRyaWFuZ2xlcmlnaHRlcTtcIixcbiAgICBcIjg4ODZcIjogXCJvcmlnb2Y7XCIsXG4gICAgXCI4ODg3XCI6IFwiaW1vZjtcIixcbiAgICBcIjg4ODhcIjogXCJtdW1hcDtcIixcbiAgICBcIjg4ODlcIjogXCJoZXJjb247XCIsXG4gICAgXCI4ODkwXCI6IFwiaW50ZXJjYWw7XCIsXG4gICAgXCI4ODkxXCI6IFwidmVlYmFyO1wiLFxuICAgIFwiODg5M1wiOiBcImJhcnZlZTtcIixcbiAgICBcIjg4OTRcIjogXCJhbmdydHZiO1wiLFxuICAgIFwiODg5NVwiOiBcImxydHJpO1wiLFxuICAgIFwiODg5NlwiOiBcInh3ZWRnZTtcIixcbiAgICBcIjg4OTdcIjogXCJ4dmVlO1wiLFxuICAgIFwiODg5OFwiOiBcInhjYXA7XCIsXG4gICAgXCI4ODk5XCI6IFwieGN1cDtcIixcbiAgICBcIjg5MDBcIjogXCJkaWFtb25kO1wiLFxuICAgIFwiODkwMVwiOiBcInNkb3Q7XCIsXG4gICAgXCI4OTAyXCI6IFwiU3RhcjtcIixcbiAgICBcIjg5MDNcIjogXCJkaXZvbng7XCIsXG4gICAgXCI4OTA0XCI6IFwiYm93dGllO1wiLFxuICAgIFwiODkwNVwiOiBcImx0aW1lcztcIixcbiAgICBcIjg5MDZcIjogXCJydGltZXM7XCIsXG4gICAgXCI4OTA3XCI6IFwibHRocmVlO1wiLFxuICAgIFwiODkwOFwiOiBcInJ0aHJlZTtcIixcbiAgICBcIjg5MDlcIjogXCJic2ltZTtcIixcbiAgICBcIjg5MTBcIjogXCJjdXZlZTtcIixcbiAgICBcIjg5MTFcIjogXCJjdXdlZDtcIixcbiAgICBcIjg5MTJcIjogXCJTdWJzZXQ7XCIsXG4gICAgXCI4OTEzXCI6IFwiU3Vwc2V0O1wiLFxuICAgIFwiODkxNFwiOiBcIkNhcDtcIixcbiAgICBcIjg5MTVcIjogXCJDdXA7XCIsXG4gICAgXCI4OTE2XCI6IFwicGl0Y2hmb3JrO1wiLFxuICAgIFwiODkxN1wiOiBcImVwYXI7XCIsXG4gICAgXCI4OTE4XCI6IFwibHRkb3Q7XCIsXG4gICAgXCI4OTE5XCI6IFwiZ3RyZG90O1wiLFxuICAgIFwiODkyMFwiOiBcIkxsO1wiLFxuICAgIFwiODkyMVwiOiBcImdnZztcIixcbiAgICBcIjg5MjJcIjogXCJMZXNzRXF1YWxHcmVhdGVyO1wiLFxuICAgIFwiODkyM1wiOiBcImd0cmVxbGVzcztcIixcbiAgICBcIjg5MjZcIjogXCJjdXJseWVxcHJlYztcIixcbiAgICBcIjg5MjdcIjogXCJjdXJseWVxc3VjYztcIixcbiAgICBcIjg5MjhcIjogXCJucHJjdWU7XCIsXG4gICAgXCI4OTI5XCI6IFwibnNjY3VlO1wiLFxuICAgIFwiODkzMFwiOiBcIm5zcXN1YmU7XCIsXG4gICAgXCI4OTMxXCI6IFwibnNxc3VwZTtcIixcbiAgICBcIjg5MzRcIjogXCJsbnNpbTtcIixcbiAgICBcIjg5MzVcIjogXCJnbnNpbTtcIixcbiAgICBcIjg5MzZcIjogXCJwcm5zaW07XCIsXG4gICAgXCI4OTM3XCI6IFwic3VjY25zaW07XCIsXG4gICAgXCI4OTM4XCI6IFwibnRyaWFuZ2xlbGVmdDtcIixcbiAgICBcIjg5MzlcIjogXCJudHJpYW5nbGVyaWdodDtcIixcbiAgICBcIjg5NDBcIjogXCJudHJpYW5nbGVsZWZ0ZXE7XCIsXG4gICAgXCI4OTQxXCI6IFwibnRyaWFuZ2xlcmlnaHRlcTtcIixcbiAgICBcIjg5NDJcIjogXCJ2ZWxsaXA7XCIsXG4gICAgXCI4OTQzXCI6IFwiY3Rkb3Q7XCIsXG4gICAgXCI4OTQ0XCI6IFwidXRkb3Q7XCIsXG4gICAgXCI4OTQ1XCI6IFwiZHRkb3Q7XCIsXG4gICAgXCI4OTQ2XCI6IFwiZGlzaW47XCIsXG4gICAgXCI4OTQ3XCI6IFwiaXNpbnN2O1wiLFxuICAgIFwiODk0OFwiOiBcImlzaW5zO1wiLFxuICAgIFwiODk0OVwiOiBcImlzaW5kb3Q7XCIsXG4gICAgXCI4OTUwXCI6IFwibm90aW52YztcIixcbiAgICBcIjg5NTFcIjogXCJub3RpbnZiO1wiLFxuICAgIFwiODk1M1wiOiBcImlzaW5FO1wiLFxuICAgIFwiODk1NFwiOiBcIm5pc2Q7XCIsXG4gICAgXCI4OTU1XCI6IFwieG5pcztcIixcbiAgICBcIjg5NTZcIjogXCJuaXM7XCIsXG4gICAgXCI4OTU3XCI6IFwibm90bml2YztcIixcbiAgICBcIjg5NThcIjogXCJub3RuaXZiO1wiLFxuICAgIFwiODk2NVwiOiBcImJhcndlZGdlO1wiLFxuICAgIFwiODk2NlwiOiBcImRvdWJsZWJhcndlZGdlO1wiLFxuICAgIFwiODk2OFwiOiBcIkxlZnRDZWlsaW5nO1wiLFxuICAgIFwiODk2OVwiOiBcIlJpZ2h0Q2VpbGluZztcIixcbiAgICBcIjg5NzBcIjogXCJsZmxvb3I7XCIsXG4gICAgXCI4OTcxXCI6IFwiUmlnaHRGbG9vcjtcIixcbiAgICBcIjg5NzJcIjogXCJkcmNyb3A7XCIsXG4gICAgXCI4OTczXCI6IFwiZGxjcm9wO1wiLFxuICAgIFwiODk3NFwiOiBcInVyY3JvcDtcIixcbiAgICBcIjg5NzVcIjogXCJ1bGNyb3A7XCIsXG4gICAgXCI4OTc2XCI6IFwiYm5vdDtcIixcbiAgICBcIjg5NzhcIjogXCJwcm9mbGluZTtcIixcbiAgICBcIjg5NzlcIjogXCJwcm9mc3VyZjtcIixcbiAgICBcIjg5ODFcIjogXCJ0ZWxyZWM7XCIsXG4gICAgXCI4OTgyXCI6IFwidGFyZ2V0O1wiLFxuICAgIFwiODk4OFwiOiBcInVsY29ybmVyO1wiLFxuICAgIFwiODk4OVwiOiBcInVyY29ybmVyO1wiLFxuICAgIFwiODk5MFwiOiBcImxsY29ybmVyO1wiLFxuICAgIFwiODk5MVwiOiBcImxyY29ybmVyO1wiLFxuICAgIFwiODk5NFwiOiBcInNmcm93bjtcIixcbiAgICBcIjg5OTVcIjogXCJzc21pbGU7XCIsXG4gICAgXCI5MDA1XCI6IFwiY3lsY3R5O1wiLFxuICAgIFwiOTAwNlwiOiBcInByb2ZhbGFyO1wiLFxuICAgIFwiOTAxNFwiOiBcInRvcGJvdDtcIixcbiAgICBcIjkwMjFcIjogXCJvdmJhcjtcIixcbiAgICBcIjkwMjNcIjogXCJzb2xiYXI7XCIsXG4gICAgXCI5MDg0XCI6IFwiYW5nemFycjtcIixcbiAgICBcIjkxMzZcIjogXCJsbW91c3RhY2hlO1wiLFxuICAgIFwiOTEzN1wiOiBcInJtb3VzdGFjaGU7XCIsXG4gICAgXCI5MTQwXCI6IFwidGJyaztcIixcbiAgICBcIjkxNDFcIjogXCJVbmRlckJyYWNrZXQ7XCIsXG4gICAgXCI5MTQyXCI6IFwiYmJya3Ricms7XCIsXG4gICAgXCI5MTgwXCI6IFwiT3ZlclBhcmVudGhlc2lzO1wiLFxuICAgIFwiOTE4MVwiOiBcIlVuZGVyUGFyZW50aGVzaXM7XCIsXG4gICAgXCI5MTgyXCI6IFwiT3ZlckJyYWNlO1wiLFxuICAgIFwiOTE4M1wiOiBcIlVuZGVyQnJhY2U7XCIsXG4gICAgXCI5MTg2XCI6IFwidHJwZXppdW07XCIsXG4gICAgXCI5MTkxXCI6IFwiZWxpbnRlcnM7XCIsXG4gICAgXCI5MjUxXCI6IFwiYmxhbms7XCIsXG4gICAgXCI5NDE2XCI6IFwib1M7XCIsXG4gICAgXCI5NDcyXCI6IFwiSG9yaXpvbnRhbExpbmU7XCIsXG4gICAgXCI5NDc0XCI6IFwiYm94djtcIixcbiAgICBcIjk0ODRcIjogXCJib3hkcjtcIixcbiAgICBcIjk0ODhcIjogXCJib3hkbDtcIixcbiAgICBcIjk0OTJcIjogXCJib3h1cjtcIixcbiAgICBcIjk0OTZcIjogXCJib3h1bDtcIixcbiAgICBcIjk1MDBcIjogXCJib3h2cjtcIixcbiAgICBcIjk1MDhcIjogXCJib3h2bDtcIixcbiAgICBcIjk1MTZcIjogXCJib3hoZDtcIixcbiAgICBcIjk1MjRcIjogXCJib3hodTtcIixcbiAgICBcIjk1MzJcIjogXCJib3h2aDtcIixcbiAgICBcIjk1NTJcIjogXCJib3hIO1wiLFxuICAgIFwiOTU1M1wiOiBcImJveFY7XCIsXG4gICAgXCI5NTU0XCI6IFwiYm94ZFI7XCIsXG4gICAgXCI5NTU1XCI6IFwiYm94RHI7XCIsXG4gICAgXCI5NTU2XCI6IFwiYm94RFI7XCIsXG4gICAgXCI5NTU3XCI6IFwiYm94ZEw7XCIsXG4gICAgXCI5NTU4XCI6IFwiYm94RGw7XCIsXG4gICAgXCI5NTU5XCI6IFwiYm94REw7XCIsXG4gICAgXCI5NTYwXCI6IFwiYm94dVI7XCIsXG4gICAgXCI5NTYxXCI6IFwiYm94VXI7XCIsXG4gICAgXCI5NTYyXCI6IFwiYm94VVI7XCIsXG4gICAgXCI5NTYzXCI6IFwiYm94dUw7XCIsXG4gICAgXCI5NTY0XCI6IFwiYm94VWw7XCIsXG4gICAgXCI5NTY1XCI6IFwiYm94VUw7XCIsXG4gICAgXCI5NTY2XCI6IFwiYm94dlI7XCIsXG4gICAgXCI5NTY3XCI6IFwiYm94VnI7XCIsXG4gICAgXCI5NTY4XCI6IFwiYm94VlI7XCIsXG4gICAgXCI5NTY5XCI6IFwiYm94dkw7XCIsXG4gICAgXCI5NTcwXCI6IFwiYm94Vmw7XCIsXG4gICAgXCI5NTcxXCI6IFwiYm94Vkw7XCIsXG4gICAgXCI5NTcyXCI6IFwiYm94SGQ7XCIsXG4gICAgXCI5NTczXCI6IFwiYm94aEQ7XCIsXG4gICAgXCI5NTc0XCI6IFwiYm94SEQ7XCIsXG4gICAgXCI5NTc1XCI6IFwiYm94SHU7XCIsXG4gICAgXCI5NTc2XCI6IFwiYm94aFU7XCIsXG4gICAgXCI5NTc3XCI6IFwiYm94SFU7XCIsXG4gICAgXCI5NTc4XCI6IFwiYm94dkg7XCIsXG4gICAgXCI5NTc5XCI6IFwiYm94Vmg7XCIsXG4gICAgXCI5NTgwXCI6IFwiYm94Vkg7XCIsXG4gICAgXCI5NjAwXCI6IFwidWhibGs7XCIsXG4gICAgXCI5NjA0XCI6IFwibGhibGs7XCIsXG4gICAgXCI5NjA4XCI6IFwiYmxvY2s7XCIsXG4gICAgXCI5NjE3XCI6IFwiYmxrMTQ7XCIsXG4gICAgXCI5NjE4XCI6IFwiYmxrMTI7XCIsXG4gICAgXCI5NjE5XCI6IFwiYmxrMzQ7XCIsXG4gICAgXCI5NjMzXCI6IFwic3F1YXJlO1wiLFxuICAgIFwiOTY0MlwiOiBcInNxdWY7XCIsXG4gICAgXCI5NjQzXCI6IFwiRW1wdHlWZXJ5U21hbGxTcXVhcmU7XCIsXG4gICAgXCI5NjQ1XCI6IFwicmVjdDtcIixcbiAgICBcIjk2NDZcIjogXCJtYXJrZXI7XCIsXG4gICAgXCI5NjQ5XCI6IFwiZmx0bnM7XCIsXG4gICAgXCI5NjUxXCI6IFwieHV0cmk7XCIsXG4gICAgXCI5NjUyXCI6IFwidXRyaWY7XCIsXG4gICAgXCI5NjUzXCI6IFwidXRyaTtcIixcbiAgICBcIjk2NTZcIjogXCJydHJpZjtcIixcbiAgICBcIjk2NTdcIjogXCJ0cmlhbmdsZXJpZ2h0O1wiLFxuICAgIFwiOTY2MVwiOiBcInhkdHJpO1wiLFxuICAgIFwiOTY2MlwiOiBcImR0cmlmO1wiLFxuICAgIFwiOTY2M1wiOiBcInRyaWFuZ2xlZG93bjtcIixcbiAgICBcIjk2NjZcIjogXCJsdHJpZjtcIixcbiAgICBcIjk2NjdcIjogXCJ0cmlhbmdsZWxlZnQ7XCIsXG4gICAgXCI5Njc0XCI6IFwibG96ZW5nZTtcIixcbiAgICBcIjk2NzVcIjogXCJjaXI7XCIsXG4gICAgXCI5NzA4XCI6IFwidHJpZG90O1wiLFxuICAgIFwiOTcxMVwiOiBcInhjaXJjO1wiLFxuICAgIFwiOTcyMFwiOiBcInVsdHJpO1wiLFxuICAgIFwiOTcyMVwiOiBcInVydHJpO1wiLFxuICAgIFwiOTcyMlwiOiBcImxsdHJpO1wiLFxuICAgIFwiOTcyM1wiOiBcIkVtcHR5U21hbGxTcXVhcmU7XCIsXG4gICAgXCI5NzI0XCI6IFwiRmlsbGVkU21hbGxTcXVhcmU7XCIsXG4gICAgXCI5NzMzXCI6IFwic3RhcmY7XCIsXG4gICAgXCI5NzM0XCI6IFwic3RhcjtcIixcbiAgICBcIjk3NDJcIjogXCJwaG9uZTtcIixcbiAgICBcIjk3OTJcIjogXCJmZW1hbGU7XCIsXG4gICAgXCI5Nzk0XCI6IFwibWFsZTtcIixcbiAgICBcIjk4MjRcIjogXCJzcGFkZXN1aXQ7XCIsXG4gICAgXCI5ODI3XCI6IFwiY2x1YnN1aXQ7XCIsXG4gICAgXCI5ODI5XCI6IFwiaGVhcnRzdWl0O1wiLFxuICAgIFwiOTgzMFwiOiBcImRpYW1zO1wiLFxuICAgIFwiOTgzNFwiOiBcInN1bmc7XCIsXG4gICAgXCI5ODM3XCI6IFwiZmxhdDtcIixcbiAgICBcIjk4MzhcIjogXCJuYXR1cmFsO1wiLFxuICAgIFwiOTgzOVwiOiBcInNoYXJwO1wiLFxuICAgIFwiMTAwMDNcIjogXCJjaGVja21hcms7XCIsXG4gICAgXCIxMDAwN1wiOiBcImNyb3NzO1wiLFxuICAgIFwiMTAwMTZcIjogXCJtYWx0ZXNlO1wiLFxuICAgIFwiMTAwMzhcIjogXCJzZXh0O1wiLFxuICAgIFwiMTAwNzJcIjogXCJWZXJ0aWNhbFNlcGFyYXRvcjtcIixcbiAgICBcIjEwMDk4XCI6IFwibGJicms7XCIsXG4gICAgXCIxMDA5OVwiOiBcInJiYnJrO1wiLFxuICAgIFwiMTAxODRcIjogXCJic29saHN1YjtcIixcbiAgICBcIjEwMTg1XCI6IFwic3VwaHNvbDtcIixcbiAgICBcIjEwMjE0XCI6IFwibG9icms7XCIsXG4gICAgXCIxMDIxNVwiOiBcInJvYnJrO1wiLFxuICAgIFwiMTAyMTZcIjogXCJMZWZ0QW5nbGVCcmFja2V0O1wiLFxuICAgIFwiMTAyMTdcIjogXCJSaWdodEFuZ2xlQnJhY2tldDtcIixcbiAgICBcIjEwMjE4XCI6IFwiTGFuZztcIixcbiAgICBcIjEwMjE5XCI6IFwiUmFuZztcIixcbiAgICBcIjEwMjIwXCI6IFwibG9hbmc7XCIsXG4gICAgXCIxMDIyMVwiOiBcInJvYW5nO1wiLFxuICAgIFwiMTAyMjlcIjogXCJ4bGFycjtcIixcbiAgICBcIjEwMjMwXCI6IFwieHJhcnI7XCIsXG4gICAgXCIxMDIzMVwiOiBcInhoYXJyO1wiLFxuICAgIFwiMTAyMzJcIjogXCJ4bEFycjtcIixcbiAgICBcIjEwMjMzXCI6IFwieHJBcnI7XCIsXG4gICAgXCIxMDIzNFwiOiBcInhoQXJyO1wiLFxuICAgIFwiMTAyMzZcIjogXCJ4bWFwO1wiLFxuICAgIFwiMTAyMzlcIjogXCJkemlncmFycjtcIixcbiAgICBcIjEwNDk4XCI6IFwibnZsQXJyO1wiLFxuICAgIFwiMTA0OTlcIjogXCJudnJBcnI7XCIsXG4gICAgXCIxMDUwMFwiOiBcIm52SGFycjtcIixcbiAgICBcIjEwNTAxXCI6IFwiTWFwO1wiLFxuICAgIFwiMTA1MDhcIjogXCJsYmFycjtcIixcbiAgICBcIjEwNTA5XCI6IFwicmJhcnI7XCIsXG4gICAgXCIxMDUxMFwiOiBcImxCYXJyO1wiLFxuICAgIFwiMTA1MTFcIjogXCJyQmFycjtcIixcbiAgICBcIjEwNTEyXCI6IFwiUkJhcnI7XCIsXG4gICAgXCIxMDUxM1wiOiBcIkREb3RyYWhkO1wiLFxuICAgIFwiMTA1MTRcIjogXCJVcEFycm93QmFyO1wiLFxuICAgIFwiMTA1MTVcIjogXCJEb3duQXJyb3dCYXI7XCIsXG4gICAgXCIxMDUxOFwiOiBcIlJhcnJ0bDtcIixcbiAgICBcIjEwNTIxXCI6IFwibGF0YWlsO1wiLFxuICAgIFwiMTA1MjJcIjogXCJyYXRhaWw7XCIsXG4gICAgXCIxMDUyM1wiOiBcImxBdGFpbDtcIixcbiAgICBcIjEwNTI0XCI6IFwickF0YWlsO1wiLFxuICAgIFwiMTA1MjVcIjogXCJsYXJyZnM7XCIsXG4gICAgXCIxMDUyNlwiOiBcInJhcnJmcztcIixcbiAgICBcIjEwNTI3XCI6IFwibGFycmJmcztcIixcbiAgICBcIjEwNTI4XCI6IFwicmFycmJmcztcIixcbiAgICBcIjEwNTMxXCI6IFwibndhcmhrO1wiLFxuICAgIFwiMTA1MzJcIjogXCJuZWFyaGs7XCIsXG4gICAgXCIxMDUzM1wiOiBcInNlYXJoaztcIixcbiAgICBcIjEwNTM0XCI6IFwic3dhcmhrO1wiLFxuICAgIFwiMTA1MzVcIjogXCJud25lYXI7XCIsXG4gICAgXCIxMDUzNlwiOiBcInRvZWE7XCIsXG4gICAgXCIxMDUzN1wiOiBcInRvc2E7XCIsXG4gICAgXCIxMDUzOFwiOiBcInN3bndhcjtcIixcbiAgICBcIjEwNTQ3XCI6IFwicmFycmM7XCIsXG4gICAgXCIxMDU0OVwiOiBcImN1ZGFycnI7XCIsXG4gICAgXCIxMDU1MFwiOiBcImxkY2E7XCIsXG4gICAgXCIxMDU1MVwiOiBcInJkY2E7XCIsXG4gICAgXCIxMDU1MlwiOiBcImN1ZGFycmw7XCIsXG4gICAgXCIxMDU1M1wiOiBcImxhcnJwbDtcIixcbiAgICBcIjEwNTU2XCI6IFwiY3VyYXJybTtcIixcbiAgICBcIjEwNTU3XCI6IFwiY3VsYXJycDtcIixcbiAgICBcIjEwNTY1XCI6IFwicmFycnBsO1wiLFxuICAgIFwiMTA1NjhcIjogXCJoYXJyY2lyO1wiLFxuICAgIFwiMTA1NjlcIjogXCJVYXJyb2NpcjtcIixcbiAgICBcIjEwNTcwXCI6IFwibHVyZHNoYXI7XCIsXG4gICAgXCIxMDU3MVwiOiBcImxkcnVzaGFyO1wiLFxuICAgIFwiMTA1NzRcIjogXCJMZWZ0UmlnaHRWZWN0b3I7XCIsXG4gICAgXCIxMDU3NVwiOiBcIlJpZ2h0VXBEb3duVmVjdG9yO1wiLFxuICAgIFwiMTA1NzZcIjogXCJEb3duTGVmdFJpZ2h0VmVjdG9yO1wiLFxuICAgIFwiMTA1NzdcIjogXCJMZWZ0VXBEb3duVmVjdG9yO1wiLFxuICAgIFwiMTA1NzhcIjogXCJMZWZ0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1NzlcIjogXCJSaWdodFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTgwXCI6IFwiUmlnaHRVcFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTgxXCI6IFwiUmlnaHREb3duVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODJcIjogXCJEb3duTGVmdFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTgzXCI6IFwiRG93blJpZ2h0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODRcIjogXCJMZWZ0VXBWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4NVwiOiBcIkxlZnREb3duVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODZcIjogXCJMZWZ0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1ODdcIjogXCJSaWdodFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTg4XCI6IFwiUmlnaHRVcFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTg5XCI6IFwiUmlnaHREb3duVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTBcIjogXCJEb3duTGVmdFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkxXCI6IFwiRG93blJpZ2h0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTJcIjogXCJMZWZ0VXBUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5M1wiOiBcIkxlZnREb3duVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTRcIjogXCJsSGFyO1wiLFxuICAgIFwiMTA1OTVcIjogXCJ1SGFyO1wiLFxuICAgIFwiMTA1OTZcIjogXCJySGFyO1wiLFxuICAgIFwiMTA1OTdcIjogXCJkSGFyO1wiLFxuICAgIFwiMTA1OThcIjogXCJsdXJ1aGFyO1wiLFxuICAgIFwiMTA1OTlcIjogXCJsZHJkaGFyO1wiLFxuICAgIFwiMTA2MDBcIjogXCJydWx1aGFyO1wiLFxuICAgIFwiMTA2MDFcIjogXCJyZGxkaGFyO1wiLFxuICAgIFwiMTA2MDJcIjogXCJsaGFydWw7XCIsXG4gICAgXCIxMDYwM1wiOiBcImxsaGFyZDtcIixcbiAgICBcIjEwNjA0XCI6IFwicmhhcnVsO1wiLFxuICAgIFwiMTA2MDVcIjogXCJscmhhcmQ7XCIsXG4gICAgXCIxMDYwNlwiOiBcIlVwRXF1aWxpYnJpdW07XCIsXG4gICAgXCIxMDYwN1wiOiBcIlJldmVyc2VVcEVxdWlsaWJyaXVtO1wiLFxuICAgIFwiMTA2MDhcIjogXCJSb3VuZEltcGxpZXM7XCIsXG4gICAgXCIxMDYwOVwiOiBcImVyYXJyO1wiLFxuICAgIFwiMTA2MTBcIjogXCJzaW1yYXJyO1wiLFxuICAgIFwiMTA2MTFcIjogXCJsYXJyc2ltO1wiLFxuICAgIFwiMTA2MTJcIjogXCJyYXJyc2ltO1wiLFxuICAgIFwiMTA2MTNcIjogXCJyYXJyYXA7XCIsXG4gICAgXCIxMDYxNFwiOiBcImx0bGFycjtcIixcbiAgICBcIjEwNjE2XCI6IFwiZ3RyYXJyO1wiLFxuICAgIFwiMTA2MTdcIjogXCJzdWJyYXJyO1wiLFxuICAgIFwiMTA2MTlcIjogXCJzdXBsYXJyO1wiLFxuICAgIFwiMTA2MjBcIjogXCJsZmlzaHQ7XCIsXG4gICAgXCIxMDYyMVwiOiBcInJmaXNodDtcIixcbiAgICBcIjEwNjIyXCI6IFwidWZpc2h0O1wiLFxuICAgIFwiMTA2MjNcIjogXCJkZmlzaHQ7XCIsXG4gICAgXCIxMDYyOVwiOiBcImxvcGFyO1wiLFxuICAgIFwiMTA2MzBcIjogXCJyb3BhcjtcIixcbiAgICBcIjEwNjM1XCI6IFwibGJya2U7XCIsXG4gICAgXCIxMDYzNlwiOiBcInJicmtlO1wiLFxuICAgIFwiMTA2MzdcIjogXCJsYnJrc2x1O1wiLFxuICAgIFwiMTA2MzhcIjogXCJyYnJrc2xkO1wiLFxuICAgIFwiMTA2MzlcIjogXCJsYnJrc2xkO1wiLFxuICAgIFwiMTA2NDBcIjogXCJyYnJrc2x1O1wiLFxuICAgIFwiMTA2NDFcIjogXCJsYW5nZDtcIixcbiAgICBcIjEwNjQyXCI6IFwicmFuZ2Q7XCIsXG4gICAgXCIxMDY0M1wiOiBcImxwYXJsdDtcIixcbiAgICBcIjEwNjQ0XCI6IFwicnBhcmd0O1wiLFxuICAgIFwiMTA2NDVcIjogXCJndGxQYXI7XCIsXG4gICAgXCIxMDY0NlwiOiBcImx0clBhcjtcIixcbiAgICBcIjEwNjUwXCI6IFwidnppZ3phZztcIixcbiAgICBcIjEwNjUyXCI6IFwidmFuZ3J0O1wiLFxuICAgIFwiMTA2NTNcIjogXCJhbmdydHZiZDtcIixcbiAgICBcIjEwNjYwXCI6IFwiYW5nZTtcIixcbiAgICBcIjEwNjYxXCI6IFwicmFuZ2U7XCIsXG4gICAgXCIxMDY2MlwiOiBcImR3YW5nbGU7XCIsXG4gICAgXCIxMDY2M1wiOiBcInV3YW5nbGU7XCIsXG4gICAgXCIxMDY2NFwiOiBcImFuZ21zZGFhO1wiLFxuICAgIFwiMTA2NjVcIjogXCJhbmdtc2RhYjtcIixcbiAgICBcIjEwNjY2XCI6IFwiYW5nbXNkYWM7XCIsXG4gICAgXCIxMDY2N1wiOiBcImFuZ21zZGFkO1wiLFxuICAgIFwiMTA2NjhcIjogXCJhbmdtc2RhZTtcIixcbiAgICBcIjEwNjY5XCI6IFwiYW5nbXNkYWY7XCIsXG4gICAgXCIxMDY3MFwiOiBcImFuZ21zZGFnO1wiLFxuICAgIFwiMTA2NzFcIjogXCJhbmdtc2RhaDtcIixcbiAgICBcIjEwNjcyXCI6IFwiYmVtcHR5djtcIixcbiAgICBcIjEwNjczXCI6IFwiZGVtcHR5djtcIixcbiAgICBcIjEwNjc0XCI6IFwiY2VtcHR5djtcIixcbiAgICBcIjEwNjc1XCI6IFwicmFlbXB0eXY7XCIsXG4gICAgXCIxMDY3NlwiOiBcImxhZW1wdHl2O1wiLFxuICAgIFwiMTA2NzdcIjogXCJvaGJhcjtcIixcbiAgICBcIjEwNjc4XCI6IFwib21pZDtcIixcbiAgICBcIjEwNjc5XCI6IFwib3BhcjtcIixcbiAgICBcIjEwNjgxXCI6IFwib3BlcnA7XCIsXG4gICAgXCIxMDY4M1wiOiBcIm9sY3Jvc3M7XCIsXG4gICAgXCIxMDY4NFwiOiBcIm9kc29sZDtcIixcbiAgICBcIjEwNjg2XCI6IFwib2xjaXI7XCIsXG4gICAgXCIxMDY4N1wiOiBcIm9mY2lyO1wiLFxuICAgIFwiMTA2ODhcIjogXCJvbHQ7XCIsXG4gICAgXCIxMDY4OVwiOiBcIm9ndDtcIixcbiAgICBcIjEwNjkwXCI6IFwiY2lyc2NpcjtcIixcbiAgICBcIjEwNjkxXCI6IFwiY2lyRTtcIixcbiAgICBcIjEwNjkyXCI6IFwic29sYjtcIixcbiAgICBcIjEwNjkzXCI6IFwiYnNvbGI7XCIsXG4gICAgXCIxMDY5N1wiOiBcImJveGJveDtcIixcbiAgICBcIjEwNzAxXCI6IFwidHJpc2I7XCIsXG4gICAgXCIxMDcwMlwiOiBcInJ0cmlsdHJpO1wiLFxuICAgIFwiMTA3MDNcIjogXCJMZWZ0VHJpYW5nbGVCYXI7XCIsXG4gICAgXCIxMDcwNFwiOiBcIlJpZ2h0VHJpYW5nbGVCYXI7XCIsXG4gICAgXCIxMDcxNlwiOiBcImlpbmZpbjtcIixcbiAgICBcIjEwNzE3XCI6IFwiaW5maW50aWU7XCIsXG4gICAgXCIxMDcxOFwiOiBcIm52aW5maW47XCIsXG4gICAgXCIxMDcyM1wiOiBcImVwYXJzbDtcIixcbiAgICBcIjEwNzI0XCI6IFwic21lcGFyc2w7XCIsXG4gICAgXCIxMDcyNVwiOiBcImVxdnBhcnNsO1wiLFxuICAgIFwiMTA3MzFcIjogXCJsb3pmO1wiLFxuICAgIFwiMTA3NDBcIjogXCJSdWxlRGVsYXllZDtcIixcbiAgICBcIjEwNzQyXCI6IFwiZHNvbDtcIixcbiAgICBcIjEwNzUyXCI6IFwieG9kb3Q7XCIsXG4gICAgXCIxMDc1M1wiOiBcInhvcGx1cztcIixcbiAgICBcIjEwNzU0XCI6IFwieG90aW1lO1wiLFxuICAgIFwiMTA3NTZcIjogXCJ4dXBsdXM7XCIsXG4gICAgXCIxMDc1OFwiOiBcInhzcWN1cDtcIixcbiAgICBcIjEwNzY0XCI6IFwicWludDtcIixcbiAgICBcIjEwNzY1XCI6IFwiZnBhcnRpbnQ7XCIsXG4gICAgXCIxMDc2OFwiOiBcImNpcmZuaW50O1wiLFxuICAgIFwiMTA3NjlcIjogXCJhd2ludDtcIixcbiAgICBcIjEwNzcwXCI6IFwicnBwb2xpbnQ7XCIsXG4gICAgXCIxMDc3MVwiOiBcInNjcG9saW50O1wiLFxuICAgIFwiMTA3NzJcIjogXCJucG9saW50O1wiLFxuICAgIFwiMTA3NzNcIjogXCJwb2ludGludDtcIixcbiAgICBcIjEwNzc0XCI6IFwicXVhdGludDtcIixcbiAgICBcIjEwNzc1XCI6IFwiaW50bGFyaGs7XCIsXG4gICAgXCIxMDc4NlwiOiBcInBsdXNjaXI7XCIsXG4gICAgXCIxMDc4N1wiOiBcInBsdXNhY2lyO1wiLFxuICAgIFwiMTA3ODhcIjogXCJzaW1wbHVzO1wiLFxuICAgIFwiMTA3ODlcIjogXCJwbHVzZHU7XCIsXG4gICAgXCIxMDc5MFwiOiBcInBsdXNzaW07XCIsXG4gICAgXCIxMDc5MVwiOiBcInBsdXN0d287XCIsXG4gICAgXCIxMDc5M1wiOiBcIm1jb21tYTtcIixcbiAgICBcIjEwNzk0XCI6IFwibWludXNkdTtcIixcbiAgICBcIjEwNzk3XCI6IFwibG9wbHVzO1wiLFxuICAgIFwiMTA3OThcIjogXCJyb3BsdXM7XCIsXG4gICAgXCIxMDc5OVwiOiBcIkNyb3NzO1wiLFxuICAgIFwiMTA4MDBcIjogXCJ0aW1lc2Q7XCIsXG4gICAgXCIxMDgwMVwiOiBcInRpbWVzYmFyO1wiLFxuICAgIFwiMTA4MDNcIjogXCJzbWFzaHA7XCIsXG4gICAgXCIxMDgwNFwiOiBcImxvdGltZXM7XCIsXG4gICAgXCIxMDgwNVwiOiBcInJvdGltZXM7XCIsXG4gICAgXCIxMDgwNlwiOiBcIm90aW1lc2FzO1wiLFxuICAgIFwiMTA4MDdcIjogXCJPdGltZXM7XCIsXG4gICAgXCIxMDgwOFwiOiBcIm9kaXY7XCIsXG4gICAgXCIxMDgwOVwiOiBcInRyaXBsdXM7XCIsXG4gICAgXCIxMDgxMFwiOiBcInRyaW1pbnVzO1wiLFxuICAgIFwiMTA4MTFcIjogXCJ0cml0aW1lO1wiLFxuICAgIFwiMTA4MTJcIjogXCJpcHJvZDtcIixcbiAgICBcIjEwODE1XCI6IFwiYW1hbGc7XCIsXG4gICAgXCIxMDgxNlwiOiBcImNhcGRvdDtcIixcbiAgICBcIjEwODE4XCI6IFwibmN1cDtcIixcbiAgICBcIjEwODE5XCI6IFwibmNhcDtcIixcbiAgICBcIjEwODIwXCI6IFwiY2FwYW5kO1wiLFxuICAgIFwiMTA4MjFcIjogXCJjdXBvcjtcIixcbiAgICBcIjEwODIyXCI6IFwiY3VwY2FwO1wiLFxuICAgIFwiMTA4MjNcIjogXCJjYXBjdXA7XCIsXG4gICAgXCIxMDgyNFwiOiBcImN1cGJyY2FwO1wiLFxuICAgIFwiMTA4MjVcIjogXCJjYXBicmN1cDtcIixcbiAgICBcIjEwODI2XCI6IFwiY3VwY3VwO1wiLFxuICAgIFwiMTA4MjdcIjogXCJjYXBjYXA7XCIsXG4gICAgXCIxMDgyOFwiOiBcImNjdXBzO1wiLFxuICAgIFwiMTA4MjlcIjogXCJjY2FwcztcIixcbiAgICBcIjEwODMyXCI6IFwiY2N1cHNzbTtcIixcbiAgICBcIjEwODM1XCI6IFwiQW5kO1wiLFxuICAgIFwiMTA4MzZcIjogXCJPcjtcIixcbiAgICBcIjEwODM3XCI6IFwiYW5kYW5kO1wiLFxuICAgIFwiMTA4MzhcIjogXCJvcm9yO1wiLFxuICAgIFwiMTA4MzlcIjogXCJvcnNsb3BlO1wiLFxuICAgIFwiMTA4NDBcIjogXCJhbmRzbG9wZTtcIixcbiAgICBcIjEwODQyXCI6IFwiYW5kdjtcIixcbiAgICBcIjEwODQzXCI6IFwib3J2O1wiLFxuICAgIFwiMTA4NDRcIjogXCJhbmRkO1wiLFxuICAgIFwiMTA4NDVcIjogXCJvcmQ7XCIsXG4gICAgXCIxMDg0N1wiOiBcIndlZGJhcjtcIixcbiAgICBcIjEwODU0XCI6IFwic2RvdGU7XCIsXG4gICAgXCIxMDg1OFwiOiBcInNpbWRvdDtcIixcbiAgICBcIjEwODYxXCI6IFwiY29uZ2RvdDtcIixcbiAgICBcIjEwODYyXCI6IFwiZWFzdGVyO1wiLFxuICAgIFwiMTA4NjNcIjogXCJhcGFjaXI7XCIsXG4gICAgXCIxMDg2NFwiOiBcImFwRTtcIixcbiAgICBcIjEwODY1XCI6IFwiZXBsdXM7XCIsXG4gICAgXCIxMDg2NlwiOiBcInBsdXNlO1wiLFxuICAgIFwiMTA4NjdcIjogXCJFc2ltO1wiLFxuICAgIFwiMTA4NjhcIjogXCJDb2xvbmU7XCIsXG4gICAgXCIxMDg2OVwiOiBcIkVxdWFsO1wiLFxuICAgIFwiMTA4NzFcIjogXCJlRERvdDtcIixcbiAgICBcIjEwODcyXCI6IFwiZXF1aXZERDtcIixcbiAgICBcIjEwODczXCI6IFwibHRjaXI7XCIsXG4gICAgXCIxMDg3NFwiOiBcImd0Y2lyO1wiLFxuICAgIFwiMTA4NzVcIjogXCJsdHF1ZXN0O1wiLFxuICAgIFwiMTA4NzZcIjogXCJndHF1ZXN0O1wiLFxuICAgIFwiMTA4NzdcIjogXCJMZXNzU2xhbnRFcXVhbDtcIixcbiAgICBcIjEwODc4XCI6IFwiR3JlYXRlclNsYW50RXF1YWw7XCIsXG4gICAgXCIxMDg3OVwiOiBcImxlc2RvdDtcIixcbiAgICBcIjEwODgwXCI6IFwiZ2VzZG90O1wiLFxuICAgIFwiMTA4ODFcIjogXCJsZXNkb3RvO1wiLFxuICAgIFwiMTA4ODJcIjogXCJnZXNkb3RvO1wiLFxuICAgIFwiMTA4ODNcIjogXCJsZXNkb3RvcjtcIixcbiAgICBcIjEwODg0XCI6IFwiZ2VzZG90b2w7XCIsXG4gICAgXCIxMDg4NVwiOiBcImxlc3NhcHByb3g7XCIsXG4gICAgXCIxMDg4NlwiOiBcImd0cmFwcHJveDtcIixcbiAgICBcIjEwODg3XCI6IFwibG5lcTtcIixcbiAgICBcIjEwODg4XCI6IFwiZ25lcTtcIixcbiAgICBcIjEwODg5XCI6IFwibG5hcHByb3g7XCIsXG4gICAgXCIxMDg5MFwiOiBcImduYXBwcm94O1wiLFxuICAgIFwiMTA4OTFcIjogXCJsZXNzZXFxZ3RyO1wiLFxuICAgIFwiMTA4OTJcIjogXCJndHJlcXFsZXNzO1wiLFxuICAgIFwiMTA4OTNcIjogXCJsc2ltZTtcIixcbiAgICBcIjEwODk0XCI6IFwiZ3NpbWU7XCIsXG4gICAgXCIxMDg5NVwiOiBcImxzaW1nO1wiLFxuICAgIFwiMTA4OTZcIjogXCJnc2ltbDtcIixcbiAgICBcIjEwODk3XCI6IFwibGdFO1wiLFxuICAgIFwiMTA4OThcIjogXCJnbEU7XCIsXG4gICAgXCIxMDg5OVwiOiBcImxlc2dlcztcIixcbiAgICBcIjEwOTAwXCI6IFwiZ2VzbGVzO1wiLFxuICAgIFwiMTA5MDFcIjogXCJlcXNsYW50bGVzcztcIixcbiAgICBcIjEwOTAyXCI6IFwiZXFzbGFudGd0cjtcIixcbiAgICBcIjEwOTAzXCI6IFwiZWxzZG90O1wiLFxuICAgIFwiMTA5MDRcIjogXCJlZ3Nkb3Q7XCIsXG4gICAgXCIxMDkwNVwiOiBcImVsO1wiLFxuICAgIFwiMTA5MDZcIjogXCJlZztcIixcbiAgICBcIjEwOTA5XCI6IFwic2ltbDtcIixcbiAgICBcIjEwOTEwXCI6IFwic2ltZztcIixcbiAgICBcIjEwOTExXCI6IFwic2ltbEU7XCIsXG4gICAgXCIxMDkxMlwiOiBcInNpbWdFO1wiLFxuICAgIFwiMTA5MTNcIjogXCJMZXNzTGVzcztcIixcbiAgICBcIjEwOTE0XCI6IFwiR3JlYXRlckdyZWF0ZXI7XCIsXG4gICAgXCIxMDkxNlwiOiBcImdsajtcIixcbiAgICBcIjEwOTE3XCI6IFwiZ2xhO1wiLFxuICAgIFwiMTA5MThcIjogXCJsdGNjO1wiLFxuICAgIFwiMTA5MTlcIjogXCJndGNjO1wiLFxuICAgIFwiMTA5MjBcIjogXCJsZXNjYztcIixcbiAgICBcIjEwOTIxXCI6IFwiZ2VzY2M7XCIsXG4gICAgXCIxMDkyMlwiOiBcInNtdDtcIixcbiAgICBcIjEwOTIzXCI6IFwibGF0O1wiLFxuICAgIFwiMTA5MjRcIjogXCJzbXRlO1wiLFxuICAgIFwiMTA5MjVcIjogXCJsYXRlO1wiLFxuICAgIFwiMTA5MjZcIjogXCJidW1wRTtcIixcbiAgICBcIjEwOTI3XCI6IFwicHJlY2VxO1wiLFxuICAgIFwiMTA5MjhcIjogXCJzdWNjZXE7XCIsXG4gICAgXCIxMDkzMVwiOiBcInByRTtcIixcbiAgICBcIjEwOTMyXCI6IFwic2NFO1wiLFxuICAgIFwiMTA5MzNcIjogXCJwcm5FO1wiLFxuICAgIFwiMTA5MzRcIjogXCJzdWNjbmVxcTtcIixcbiAgICBcIjEwOTM1XCI6IFwicHJlY2FwcHJveDtcIixcbiAgICBcIjEwOTM2XCI6IFwic3VjY2FwcHJveDtcIixcbiAgICBcIjEwOTM3XCI6IFwicHJuYXA7XCIsXG4gICAgXCIxMDkzOFwiOiBcInN1Y2NuYXBwcm94O1wiLFxuICAgIFwiMTA5MzlcIjogXCJQcjtcIixcbiAgICBcIjEwOTQwXCI6IFwiU2M7XCIsXG4gICAgXCIxMDk0MVwiOiBcInN1YmRvdDtcIixcbiAgICBcIjEwOTQyXCI6IFwic3VwZG90O1wiLFxuICAgIFwiMTA5NDNcIjogXCJzdWJwbHVzO1wiLFxuICAgIFwiMTA5NDRcIjogXCJzdXBwbHVzO1wiLFxuICAgIFwiMTA5NDVcIjogXCJzdWJtdWx0O1wiLFxuICAgIFwiMTA5NDZcIjogXCJzdXBtdWx0O1wiLFxuICAgIFwiMTA5NDdcIjogXCJzdWJlZG90O1wiLFxuICAgIFwiMTA5NDhcIjogXCJzdXBlZG90O1wiLFxuICAgIFwiMTA5NDlcIjogXCJzdWJzZXRlcXE7XCIsXG4gICAgXCIxMDk1MFwiOiBcInN1cHNldGVxcTtcIixcbiAgICBcIjEwOTUxXCI6IFwic3Vic2ltO1wiLFxuICAgIFwiMTA5NTJcIjogXCJzdXBzaW07XCIsXG4gICAgXCIxMDk1NVwiOiBcInN1YnNldG5lcXE7XCIsXG4gICAgXCIxMDk1NlwiOiBcInN1cHNldG5lcXE7XCIsXG4gICAgXCIxMDk1OVwiOiBcImNzdWI7XCIsXG4gICAgXCIxMDk2MFwiOiBcImNzdXA7XCIsXG4gICAgXCIxMDk2MVwiOiBcImNzdWJlO1wiLFxuICAgIFwiMTA5NjJcIjogXCJjc3VwZTtcIixcbiAgICBcIjEwOTYzXCI6IFwic3Vic3VwO1wiLFxuICAgIFwiMTA5NjRcIjogXCJzdXBzdWI7XCIsXG4gICAgXCIxMDk2NVwiOiBcInN1YnN1YjtcIixcbiAgICBcIjEwOTY2XCI6IFwic3Vwc3VwO1wiLFxuICAgIFwiMTA5NjdcIjogXCJzdXBoc3ViO1wiLFxuICAgIFwiMTA5NjhcIjogXCJzdXBkc3ViO1wiLFxuICAgIFwiMTA5NjlcIjogXCJmb3JrdjtcIixcbiAgICBcIjEwOTcwXCI6IFwidG9wZm9yaztcIixcbiAgICBcIjEwOTcxXCI6IFwibWxjcDtcIixcbiAgICBcIjEwOTgwXCI6IFwiRG91YmxlTGVmdFRlZTtcIixcbiAgICBcIjEwOTgyXCI6IFwiVmRhc2hsO1wiLFxuICAgIFwiMTA5ODNcIjogXCJCYXJ2O1wiLFxuICAgIFwiMTA5ODRcIjogXCJ2QmFyO1wiLFxuICAgIFwiMTA5ODVcIjogXCJ2QmFydjtcIixcbiAgICBcIjEwOTg3XCI6IFwiVmJhcjtcIixcbiAgICBcIjEwOTg4XCI6IFwiTm90O1wiLFxuICAgIFwiMTA5ODlcIjogXCJiTm90O1wiLFxuICAgIFwiMTA5OTBcIjogXCJybm1pZDtcIixcbiAgICBcIjEwOTkxXCI6IFwiY2lybWlkO1wiLFxuICAgIFwiMTA5OTJcIjogXCJtaWRjaXI7XCIsXG4gICAgXCIxMDk5M1wiOiBcInRvcGNpcjtcIixcbiAgICBcIjEwOTk0XCI6IFwibmhwYXI7XCIsXG4gICAgXCIxMDk5NVwiOiBcInBhcnNpbTtcIixcbiAgICBcIjExMDA1XCI6IFwicGFyc2w7XCIsXG4gICAgXCI2NDI1NlwiOiBcImZmbGlnO1wiLFxuICAgIFwiNjQyNTdcIjogXCJmaWxpZztcIixcbiAgICBcIjY0MjU4XCI6IFwiZmxsaWc7XCIsXG4gICAgXCI2NDI1OVwiOiBcImZmaWxpZztcIixcbiAgICBcIjY0MjYwXCI6IFwiZmZsbGlnO1wiXG59IiwiQW5hbHl0aWNzICAgID0gcmVxdWlyZSAnLi91dGlscy9BbmFseXRpY3MnXG5BdXRoTWFuYWdlciAgPSByZXF1aXJlICcuL3V0aWxzL0F1dGhNYW5hZ2VyJ1xuU2hhcmUgICAgICAgID0gcmVxdWlyZSAnLi91dGlscy9TaGFyZSdcbkZhY2Vib29rICAgICA9IHJlcXVpcmUgJy4vdXRpbHMvRmFjZWJvb2snXG5Hb29nbGVQbHVzICAgPSByZXF1aXJlICcuL3V0aWxzL0dvb2dsZVBsdXMnXG5UZW1wbGF0ZXMgICAgPSByZXF1aXJlICcuL2RhdGEvVGVtcGxhdGVzJ1xuTG9jYWxlICAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0xvY2FsZSdcblJvdXRlciAgICAgICA9IHJlcXVpcmUgJy4vcm91dGVyL1JvdXRlcidcbk5hdiAgICAgICAgICA9IHJlcXVpcmUgJy4vcm91dGVyL05hdidcbkFwcERhdGEgICAgICA9IHJlcXVpcmUgJy4vQXBwRGF0YSdcbkFwcFZpZXcgICAgICA9IHJlcXVpcmUgJy4vQXBwVmlldydcbk1lZGlhUXVlcmllcyA9IHJlcXVpcmUgJy4vdXRpbHMvTWVkaWFRdWVyaWVzJ1xuXG5jbGFzcyBBcHBcblxuICAgIExJVkUgICAgICAgOiBudWxsXG4gICAgQkFTRV9VUkwgICA6IHdpbmRvdy5jb25maWcuaG9zdG5hbWVcbiAgICBsb2NhbGVDb2RlIDogd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG4gICAgb2JqUmVhZHkgICA6IDBcblxuICAgIF90b0NsZWFuICAgOiBbJ29ialJlYWR5JywgJ3NldEZsYWdzJywgJ29iamVjdENvbXBsZXRlJywgJ2luaXQnLCAnaW5pdE9iamVjdHMnLCAnaW5pdFNES3MnLCAnaW5pdEFwcCcsICdnbycsICdjbGVhbnVwJywgJ190b0NsZWFuJ11cblxuICAgIGNvbnN0cnVjdG9yIDogKEBMSVZFKSAtPlxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBzZXRGbGFncyA6ID0+XG5cbiAgICAgICAgdWEgPSB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpXG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLnNldHVwKCk7XG5cbiAgICAgICAgQElTX0FORFJPSUQgICAgPSB1YS5pbmRleE9mKCdhbmRyb2lkJykgPiAtMVxuICAgICAgICBASVNfRklSRUZPWCAgICA9IHVhLmluZGV4T2YoJ2ZpcmVmb3gnKSA+IC0xXG4gICAgICAgIEBJU19DSFJPTUVfSU9TID0gaWYgdWEubWF0Y2goJ2NyaW9zJykgdGhlbiB0cnVlIGVsc2UgZmFsc2UgIyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMzgwODA1M1xuXG4gICAgICAgIG51bGxcblxuICAgIGlzTW9iaWxlIDogPT5cblxuICAgICAgICByZXR1cm4gQElTX0lPUyBvciBASVNfQU5EUk9JRFxuXG4gICAgb2JqZWN0Q29tcGxldGUgOiA9PlxuXG4gICAgICAgIEBvYmpSZWFkeSsrXG4gICAgICAgIEBpbml0QXBwKCkgaWYgQG9ialJlYWR5ID49IDRcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0IDogPT5cblxuICAgICAgICBAaW5pdE9iamVjdHMoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXRPYmplY3RzIDogPT5cblxuICAgICAgICBAdGVtcGxhdGVzID0gbmV3IFRlbXBsYXRlcyBcIi9kYXRhL3RlbXBsYXRlcyN7KGlmIEBMSVZFIHRoZW4gJy5taW4nIGVsc2UgJycpfS54bWxcIiwgQG9iamVjdENvbXBsZXRlXG4gICAgICAgIEBsb2NhbGUgICAgPSBuZXcgTG9jYWxlIFwiL2RhdGEvbG9jYWxlcy9zdHJpbmdzLmpzb25cIiwgQG9iamVjdENvbXBsZXRlXG4gICAgICAgIEBhbmFseXRpY3MgPSBuZXcgQW5hbHl0aWNzIFwiL2RhdGEvdHJhY2tpbmcuanNvblwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGFwcERhdGEgICA9IG5ldyBBcHBEYXRhIEBvYmplY3RDb21wbGV0ZVxuXG4gICAgICAgICMgaWYgbmV3IG9iamVjdHMgYXJlIGFkZGVkIGRvbid0IGZvcmdldCB0byBjaGFuZ2UgdGhlIGBAb2JqZWN0Q29tcGxldGVgIGZ1bmN0aW9uXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdFNES3MgOiA9PlxuXG4gICAgICAgIEZhY2Vib29rLmxvYWQoKVxuICAgICAgICBHb29nbGVQbHVzLmxvYWQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXRBcHAgOiA9PlxuXG4gICAgICAgIEBzZXRGbGFncygpXG5cbiAgICAgICAgIyMjIFN0YXJ0cyBhcHBsaWNhdGlvbiAjIyNcbiAgICAgICAgQGFwcFZpZXcgPSBuZXcgQXBwVmlld1xuICAgICAgICBAcm91dGVyICA9IG5ldyBSb3V0ZXJcbiAgICAgICAgQG5hdiAgICAgPSBuZXcgTmF2XG4gICAgICAgIEBhdXRoICAgID0gbmV3IEF1dGhNYW5hZ2VyXG4gICAgICAgIEBzaGFyZSAgID0gbmV3IFNoYXJlXG5cbiAgICAgICAgQGdvKClcblxuICAgICAgICBAaW5pdFNES3MoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGdvIDogPT5cblxuICAgICAgICAjIyMgQWZ0ZXIgZXZlcnl0aGluZyBpcyBsb2FkZWQsIGtpY2tzIG9mZiB3ZWJzaXRlICMjI1xuICAgICAgICBAYXBwVmlldy5yZW5kZXIoKVxuXG4gICAgICAgICMjIyByZW1vdmUgcmVkdW5kYW50IGluaXRpYWxpc2F0aW9uIG1ldGhvZHMgLyBwcm9wZXJ0aWVzICMjI1xuICAgICAgICBAY2xlYW51cCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgY2xlYW51cCA6ID0+XG5cbiAgICAgICAgZm9yIGZuIGluIEBfdG9DbGVhblxuICAgICAgICAgICAgQFtmbl0gPSBudWxsXG4gICAgICAgICAgICBkZWxldGUgQFtmbl1cblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwXG4iLCJBYnN0cmFjdERhdGEgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9BYnN0cmFjdERhdGEnXG5SZXF1ZXN0ZXIgICAgICAgICA9IHJlcXVpcmUgJy4vdXRpbHMvUmVxdWVzdGVyJ1xuQVBJICAgICAgICAgICAgICAgPSByZXF1aXJlICcuL2RhdGEvQVBJJ1xuRG9vZGxlc0NvbGxlY3Rpb24gPSByZXF1aXJlICcuL2NvbGxlY3Rpb25zL2Rvb2RsZXMvRG9vZGxlc0NvbGxlY3Rpb24nXG5cbmNsYXNzIEFwcERhdGEgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuICAgIGNhbGxiYWNrIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAoQGNhbGxiYWNrKSAtPlxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGFkZCBhbGwgZGF0YSBjbGFzc2VzIGhlcmVcblxuICAgICAgICAjIyNcblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgQGRvb2RsZXMgPSBuZXcgRG9vZGxlc0NvbGxlY3Rpb25cblxuICAgICAgICBAZ2V0U3RhcnREYXRhKClcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgIyMjXG4gICAgZ2V0IGFwcCBib290c3RyYXAgZGF0YSAtIGVtYmVkIGluIEhUTUwgb3IgQVBJIGVuZHBvaW50XG4gICAgIyMjXG4gICAgZ2V0U3RhcnREYXRhIDogPT5cbiAgICAgICAgXG4gICAgICAgICMgaWYgQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICBpZiB0cnVlXG5cbiAgICAgICAgICAgIHIgPSBSZXF1ZXN0ZXIucmVxdWVzdFxuICAgICAgICAgICAgICAgICMgdXJsICA6IEFQSS5nZXQoJ3N0YXJ0JylcbiAgICAgICAgICAgICAgICB1cmwgIDogQENEKCkuQkFTRV9VUkwgKyAnL2RhdGEvX0RVTU1ZL2Rvb2RsZXMuanNvbidcbiAgICAgICAgICAgICAgICB0eXBlIDogJ0dFVCdcblxuICAgICAgICAgICAgci5kb25lIEBvblN0YXJ0RGF0YVJlY2VpdmVkXG4gICAgICAgICAgICByLmZhaWwgPT5cblxuICAgICAgICAgICAgICAgICMgY29uc29sZS5lcnJvciBcImVycm9yIGxvYWRpbmcgYXBpIHN0YXJ0IGRhdGFcIlxuXG4gICAgICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICAgICAgdGhpcyBpcyBvbmx5IHRlbXBvcmFyeSwgd2hpbGUgdGhlcmUgaXMgbm8gYm9vdHN0cmFwIGRhdGEgaGVyZSwgbm9ybWFsbHkgd291bGQgaGFuZGxlIGVycm9yIC8gZmFpbFxuICAgICAgICAgICAgICAgICMjI1xuICAgICAgICAgICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25TdGFydERhdGFSZWNlaXZlZCA6IChkYXRhKSA9PlxuXG4gICAgICAgIGNvbnNvbGUubG9nIFwib25TdGFydERhdGFSZWNlaXZlZCA6IChkYXRhKSA9PlwiLCBkYXRhXG5cbiAgICAgICAgQGRvb2RsZXMuYWRkIGRhdGEuZG9vZGxlc1xuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJvb3RzdHJhcCBkYXRhIHJlY2VpdmVkLCBhcHAgcmVhZHkgdG8gZ29cblxuICAgICAgICAjIyNcblxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwRGF0YVxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi92aWV3L0Fic3RyYWN0VmlldydcblByZWxvYWRlciAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL1ByZWxvYWRlcidcbkhlYWRlciAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0hlYWRlcidcbldyYXBwZXIgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL1dyYXBwZXInXG5Gb290ZXIgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9Gb290ZXInXG5Nb2RhbE1hbmFnZXIgPSByZXF1aXJlICcuL3ZpZXcvbW9kYWxzL19Nb2RhbE1hbmFnZXInXG5cbmNsYXNzIEFwcFZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ21haW4nXG5cbiAgICAkd2luZG93ICA6IG51bGxcbiAgICAkYm9keSAgICA6IG51bGxcblxuICAgIHdyYXBwZXIgIDogbnVsbFxuICAgIGZvb3RlciAgIDogbnVsbFxuXG4gICAgZGltcyA6XG4gICAgICAgIHcgOiBudWxsXG4gICAgICAgIGggOiBudWxsXG4gICAgICAgIG8gOiBudWxsXG4gICAgICAgIHVwZGF0ZU1vYmlsZSA6IHRydWVcbiAgICAgICAgbGFzdEhlaWdodCAgIDogbnVsbFxuXG4gICAgbGFzdFNjcm9sbFkgOiAwXG4gICAgdGlja2luZyAgICAgOiBmYWxzZVxuXG4gICAgRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMgOiAnRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMnXG4gICAgRVZFTlRfUFJFTE9BREVSX0hJREUgICAgOiAnRVZFTlRfUFJFTE9BREVSX0hJREUnXG4gICAgRVZFTlRfT05fU0NST0xMICAgICAgICAgOiAnRVZFTlRfT05fU0NST0xMJ1xuXG4gICAgTU9CSUxFX1dJRFRIIDogNzAwXG4gICAgTU9CSUxFICAgICAgIDogJ21vYmlsZSdcbiAgICBOT05fTU9CSUxFICAgOiAnbm9uX21vYmlsZSdcblxuICAgIGNvbnN0cnVjdG9yIDogLT5cblxuICAgICAgICBAJHdpbmRvdyA9ICQod2luZG93KVxuICAgICAgICBAJGJvZHkgICA9ICQoJ2JvZHknKS5lcSgwKVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgIGRpc2FibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vbiAndG91Y2htb3ZlJywgQG9uVG91Y2hNb3ZlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZW5hYmxlVG91Y2g6ID0+XG5cbiAgICAgICAgQCR3aW5kb3cub2ZmICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcblxuICAgICAgICBudWxsXG5cbiAgICBvblRvdWNoTW92ZTogKCBlICkgLT5cblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICBudWxsXG5cbiAgICByZW5kZXIgOiA9PlxuXG4gICAgICAgIEBiaW5kRXZlbnRzKClcblxuICAgICAgICBAcHJlbG9hZGVyICAgID0gbmV3IFByZWxvYWRlclxuICAgICAgICBAbW9kYWxNYW5hZ2VyID0gbmV3IE1vZGFsTWFuYWdlclxuXG4gICAgICAgIEBoZWFkZXIgID0gbmV3IEhlYWRlclxuICAgICAgICBAd3JhcHBlciA9IG5ldyBXcmFwcGVyXG4gICAgICAgIEBmb290ZXIgID0gbmV3IEZvb3RlclxuXG4gICAgICAgIEBcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAaGVhZGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQHdyYXBwZXJcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAZm9vdGVyXG5cbiAgICAgICAgQG9uQWxsUmVuZGVyZWQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGJpbmRFdmVudHMgOiA9PlxuXG4gICAgICAgIEBvbiAnYWxsUmVuZGVyZWQnLCBAb25BbGxSZW5kZXJlZFxuXG4gICAgICAgIEBvblJlc2l6ZSgpXG5cbiAgICAgICAgQG9uUmVzaXplID0gXy5kZWJvdW5jZSBAb25SZXNpemUsIDMwMFxuICAgICAgICBAJHdpbmRvdy5vbiAncmVzaXplIG9yaWVudGF0aW9uY2hhbmdlJywgQG9uUmVzaXplXG4gICAgICAgIEAkd2luZG93Lm9uIFwic2Nyb2xsXCIsIEBvblNjcm9sbFxuXG4gICAgICAgIEAkYm9keS5vbiAnY2xpY2snLCAnYScsIEBsaW5rTWFuYWdlclxuXG4gICAgICAgIG51bGxcblxuICAgIG9uU2Nyb2xsIDogPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcInNjcm9sbFVwZGF0ZVwiXG4gICAgICAgIEBsYXN0U2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZXG4gICAgICAgIEByZXF1ZXN0VGljaygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVxdWVzdFRpY2sgOiA9PlxuXG4gICAgICAgIGlmICFAdGlja2luZ1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIEBzY3JvbGxVcGRhdGVcbiAgICAgICAgICAgIEB0aWNraW5nID0gdHJ1ZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNjcm9sbFVwZGF0ZSA6ID0+XG5cbiAgICAgICAgQHRpY2tpbmcgPSBmYWxzZVxuXG4gICAgICAgIEAkYm9keS5hZGRDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG5cbiAgICAgICAgY2xlYXJUaW1lb3V0IEB0aW1lclNjcm9sbFxuXG4gICAgICAgIEB0aW1lclNjcm9sbCA9IHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgIEAkYm9keS5yZW1vdmVDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG4gICAgICAgICwgNTBcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfT05fU0NST0xMXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25BbGxSZW5kZXJlZCA6ID0+XG5cbiAgICAgICAgIyBjb25zb2xlLmxvZyBcIm9uQWxsUmVuZGVyZWQgOiA9PlwiXG5cbiAgICAgICAgQCRib2R5LnByZXBlbmQgQCRlbFxuXG4gICAgICAgIEBwcmVsb2FkZXIucGxheUludHJvQW5pbWF0aW9uID0+IEB0cmlnZ2VyIEBFVkVOVF9QUkVMT0FERVJfSElERVxuXG4gICAgICAgIEBiZWdpbigpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYmVnaW4gOiA9PlxuXG4gICAgICAgIEB0cmlnZ2VyICdzdGFydCdcblxuICAgICAgICBAQ0QoKS5yb3V0ZXIuc3RhcnQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uUmVzaXplIDogPT5cblxuICAgICAgICBAZ2V0RGltcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0RGltcyA6ID0+XG5cbiAgICAgICAgdyA9IHdpbmRvdy5pbm5lcldpZHRoIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCBvciBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICAgICAgIGggPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodFxuXG4gICAgICAgIGNoYW5nZSA9IGggLyBAZGltcy5sYXN0SGVpZ2h0XG5cbiAgICAgICAgQGRpbXMgPVxuICAgICAgICAgICAgdyA6IHdcbiAgICAgICAgICAgIGggOiBoXG4gICAgICAgICAgICBvIDogaWYgaCA+IHcgdGhlbiAncG9ydHJhaXQnIGVsc2UgJ2xhbmRzY2FwZSdcbiAgICAgICAgICAgIHVwZGF0ZU1vYmlsZSA6ICFAQ0QoKS5pc01vYmlsZSgpIG9yIGNoYW5nZSA8IDAuOCBvciBjaGFuZ2UgPiAxLjJcbiAgICAgICAgICAgIGxhc3RIZWlnaHQgICA6IGhcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEBkaW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbGlua01hbmFnZXIgOiAoZSkgPT5cblxuICAgICAgICBocmVmID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2hyZWYnKVxuXG4gICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgaHJlZlxuXG4gICAgICAgIEBuYXZpZ2F0ZVRvVXJsIGhyZWYsIGVcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvVXJsIDogKCBocmVmLCBlID0gbnVsbCApID0+XG5cbiAgICAgICAgcm91dGUgICA9IGlmIGhyZWYubWF0Y2goQENEKCkuQkFTRV9VUkwpIHRoZW4gaHJlZi5zcGxpdChAQ0QoKS5CQVNFX1VSTClbMV0gZWxzZSBocmVmXG4gICAgICAgIHNlY3Rpb24gPSBpZiByb3V0ZS5jaGFyQXQoMCkgaXMgJy8nIHRoZW4gcm91dGUuc3BsaXQoJy8nKVsxXS5zcGxpdCgnLycpWzBdIGVsc2Ugcm91dGUuc3BsaXQoJy8nKVswXVxuXG4gICAgICAgIGlmIEBDRCgpLm5hdi5nZXRTZWN0aW9uIHNlY3Rpb25cbiAgICAgICAgICAgIGU/LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIEBDRCgpLnJvdXRlci5uYXZpZ2F0ZVRvIHJvdXRlXG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBAaGFuZGxlRXh0ZXJuYWxMaW5rIGhyZWZcblxuICAgICAgICBudWxsXG5cbiAgICBoYW5kbGVFeHRlcm5hbExpbmsgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcImhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PiBcIlxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJpbmQgdHJhY2tpbmcgZXZlbnRzIGlmIG5lY2Vzc2FyeVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBWaWV3XG4iLCJjbGFzcyBBYnN0cmFjdENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Q29sbGVjdGlvblxuIiwiVGVtcGxhdGVNb2RlbCA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5cbmNsYXNzIFRlbXBsYXRlc0NvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0bW9kZWwgOiBUZW1wbGF0ZU1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzQ29sbGVjdGlvblxuIiwiQWJzdHJhY3RDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RDb2xsZWN0aW9uJ1xuRG9vZGxlTW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2Rvb2RsZS9Eb29kbGVNb2RlbCdcblxuY2xhc3MgRG9vZGxlc0NvbGxlY3Rpb24gZXh0ZW5kcyBBYnN0cmFjdENvbGxlY3Rpb25cblxuXHRtb2RlbCA6IERvb2RsZU1vZGVsXG5cblx0Z2V0RG9vZGxlQnlTbHVnIDogKHNsdWcpID0+XG5cblx0XHRkb29kbGUgPSBAZmluZFdoZXJlIHNsdWcgOiBzbHVnXG5cblx0XHRpZiAhZG9vZGxlXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IgXCJ5IHUgbm8gZG9vZGxlP1wiXG5cblx0XHRyZXR1cm4gZG9vZGxlXG5cbm1vZHVsZS5leHBvcnRzID0gRG9vZGxlc0NvbGxlY3Rpb25cbiIsIkFQSVJvdXRlTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsJ1xuXG5jbGFzcyBBUElcblxuXHRAbW9kZWwgOiBuZXcgQVBJUm91dGVNb2RlbFxuXG5cdEBnZXRDb250YW50cyA6ID0+XG5cblx0XHQjIyMgYWRkIG1vcmUgaWYgd2Ugd2FubmEgdXNlIGluIEFQSSBzdHJpbmdzICMjI1xuXHRcdEJBU0VfVVJMIDogQENEKCkuQkFTRV9VUkxcblxuXHRAZ2V0IDogKG5hbWUsIHZhcnMpID0+XG5cblx0XHR2YXJzID0gJC5leHRlbmQgdHJ1ZSwgdmFycywgQGdldENvbnRhbnRzKClcblx0XHRyZXR1cm4gQHN1cHBsYW50U3RyaW5nIEBtb2RlbC5nZXQobmFtZSksIHZhcnNcblxuXHRAc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdIG9yIGlmIHR5cGVvZiB2YWxzW2JdIGlzICdudW1iZXInIHRoZW4gdmFsc1tiXS50b1N0cmluZygpIGVsc2UgJydcblx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBUElcbiIsImNsYXNzIEFic3RyYWN0RGF0YVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdF8uZXh0ZW5kIEAsIEJhY2tib25lLkV2ZW50c1xuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3REYXRhXG4iLCJMb2NhbGVzTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwnXG5BUEkgICAgICAgICAgPSByZXF1aXJlICcuLi9kYXRhL0FQSSdcblxuIyMjXG4jIExvY2FsZSBMb2FkZXIgI1xuXG5GaXJlcyBiYWNrIGFuIGV2ZW50IHdoZW4gY29tcGxldGVcblxuIyMjXG5jbGFzcyBMb2NhbGVcblxuICAgIGxhbmcgICAgIDogbnVsbFxuICAgIGRhdGEgICAgIDogbnVsbFxuICAgIGNhbGxiYWNrIDogbnVsbFxuICAgIGJhY2t1cCAgIDogbnVsbFxuICAgIGRlZmF1bHQgIDogJ2VuLWdiJ1xuXG4gICAgY29uc3RydWN0b3IgOiAoZGF0YSwgY2IpIC0+XG5cbiAgICAgICAgIyMjIHN0YXJ0IExvY2FsZSBMb2FkZXIsIGRlZmluZSBsb2NhbGUgYmFzZWQgb24gYnJvd3NlciBsYW5ndWFnZSAjIyNcblxuICAgICAgICBAY2FsbGJhY2sgPSBjYlxuICAgICAgICBAYmFja3VwID0gZGF0YVxuXG4gICAgICAgIEBsYW5nID0gQGdldExhbmcoKVxuXG4gICAgICAgIGlmIEFQSS5nZXQoJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0pXG5cbiAgICAgICAgICAgICQuYWpheFxuICAgICAgICAgICAgICAgIHVybCAgICAgOiBBUEkuZ2V0KCAnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSApXG4gICAgICAgICAgICAgICAgdHlwZSAgICA6ICdHRVQnXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgICAgICBlcnJvciAgIDogQGxvYWRCYWNrdXBcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBsb2FkQmFja3VwKClcblxuICAgICAgICBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRMYW5nIDogPT5cblxuICAgICAgICBpZiB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGFuZCB3aW5kb3cubG9jYXRpb24uc2VhcmNoLm1hdGNoKCdsYW5nPScpXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KCdsYW5nPScpWzFdLnNwbGl0KCcmJylbMF1cblxuICAgICAgICBlbHNlIGlmIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBsYW5nID0gQGRlZmF1bHRcblxuICAgICAgICBsYW5nXG5cbiAgICBvblN1Y2Nlc3MgOiAoZXZlbnQpID0+XG5cbiAgICAgICAgIyMjIEZpcmVzIGJhY2sgYW4gZXZlbnQgb25jZSBpdCdzIGNvbXBsZXRlICMjI1xuXG4gICAgICAgIGQgPSBudWxsXG5cbiAgICAgICAgaWYgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgICAgICBkID0gSlNPTi5wYXJzZSBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIGQgPSBldmVudFxuXG4gICAgICAgIEBkYXRhID0gbmV3IExvY2FsZXNNb2RlbCBkXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIGxvYWRCYWNrdXAgOiA9PlxuXG4gICAgICAgICMjIyBXaGVuIEFQSSBub3QgYXZhaWxhYmxlLCB0cmllcyB0byBsb2FkIHRoZSBzdGF0aWMgLnR4dCBsb2NhbGUgIyMjXG5cbiAgICAgICAgJC5hamF4IFxuICAgICAgICAgICAgdXJsICAgICAgOiBAYmFja3VwXG4gICAgICAgICAgICBkYXRhVHlwZSA6ICdqc29uJ1xuICAgICAgICAgICAgY29tcGxldGUgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICBlcnJvciAgICA6ID0+IGNvbnNvbGUubG9nICdlcnJvciBvbiBsb2FkaW5nIGJhY2t1cCdcblxuICAgICAgICBudWxsXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgIyMjIGdldCBTdHJpbmcgZnJvbSBsb2NhbGVcbiAgICAgICAgKyBpZCA6IHN0cmluZyBpZCBvZiB0aGUgTG9jYWxpc2VkIFN0cmluZ1xuICAgICAgICAjIyNcblxuICAgICAgICByZXR1cm4gQGRhdGEuZ2V0U3RyaW5nIGlkXG5cbiAgICBnZXRMb2NhbGVJbWFnZSA6ICh1cmwpID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5jb25maWcuQ0ROICsgXCIvaW1hZ2VzL2xvY2FsZS9cIiArIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZSArIFwiL1wiICsgdXJsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlXG4iLCJUZW1wbGF0ZU1vZGVsICAgICAgID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblRlbXBsYXRlc0NvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24nXG5cbmNsYXNzIFRlbXBsYXRlc1xuXG4gICAgdGVtcGxhdGVzIDogbnVsbFxuICAgIGNiICAgICAgICA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKHRlbXBsYXRlcywgY2FsbGJhY2spIC0+XG5cbiAgICAgICAgQGNiID0gY2FsbGJhY2tcblxuICAgICAgICAkLmFqYXggdXJsIDogdGVtcGxhdGVzLCBzdWNjZXNzIDogQHBhcnNlWE1MXG4gICAgICAgICAgIFxuICAgICAgICBudWxsXG5cbiAgICBwYXJzZVhNTCA6IChkYXRhKSA9PlxuXG4gICAgICAgIHRlbXAgPSBbXVxuXG4gICAgICAgICQoZGF0YSkuZmluZCgndGVtcGxhdGUnKS5lYWNoIChrZXksIHZhbHVlKSAtPlxuICAgICAgICAgICAgJHZhbHVlID0gJCh2YWx1ZSlcbiAgICAgICAgICAgIHRlbXAucHVzaCBuZXcgVGVtcGxhdGVNb2RlbFxuICAgICAgICAgICAgICAgIGlkICAgOiAkdmFsdWUuYXR0cignaWQnKS50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgdGV4dCA6ICQudHJpbSAkdmFsdWUudGV4dCgpXG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXNDb2xsZWN0aW9uIHRlbXBcblxuICAgICAgICBAY2I/KClcbiAgICAgICAgXG4gICAgICAgIG51bGwgICAgICAgIFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgIHQgPSBAdGVtcGxhdGVzLndoZXJlIGlkIDogaWRcbiAgICAgICAgdCA9IHRbMF0uZ2V0ICd0ZXh0J1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICQudHJpbSB0XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzXG4iLCJjbGFzcyBBYnN0cmFjdE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cblx0Y29uc3RydWN0b3IgOiAoYXR0cnMsIG9wdGlvbikgLT5cblxuXHRcdGF0dHJzID0gQF9maWx0ZXJBdHRycyBhdHRyc1xuXG5cdFx0cmV0dXJuIEJhY2tib25lLkRlZXBNb2RlbC5hcHBseSBALCBhcmd1bWVudHNcblxuXHRzZXQgOiAoYXR0cnMsIG9wdGlvbnMpIC0+XG5cblx0XHRvcHRpb25zIG9yIChvcHRpb25zID0ge30pXG5cblx0XHRhdHRycyA9IEBfZmlsdGVyQXR0cnMgYXR0cnNcblxuXHRcdG9wdGlvbnMuZGF0YSA9IEpTT04uc3RyaW5naWZ5IGF0dHJzXG5cblx0XHRyZXR1cm4gQmFja2JvbmUuRGVlcE1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCBALCBhdHRycywgb3B0aW9uc1xuXG5cdF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuXHRcdGF0dHJzXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0TW9kZWxcbiIsImNsYXNzIEFQSVJvdXRlTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5EZWVwTW9kZWxcblxuICAgIGRlZmF1bHRzIDpcblxuICAgICAgICBzdGFydCAgICAgICAgIDogXCJcIiAjIEVnOiBcInt7IEJBU0VfVVJMIH19L2FwaS9zdGFydFwiXG5cbiAgICAgICAgbG9jYWxlICAgICAgICA6IFwiXCIgIyBFZzogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvbDEwbi97eyBjb2RlIH19XCJcblxuICAgICAgICB1c2VyICAgICAgICAgIDpcbiAgICAgICAgICAgIGxvZ2luICAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL2xvZ2luXCJcbiAgICAgICAgICAgIHJlZ2lzdGVyICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3JlZ2lzdGVyXCJcbiAgICAgICAgICAgIHBhc3N3b3JkICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3Bhc3N3b3JkXCJcbiAgICAgICAgICAgIHVwZGF0ZSAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3VwZGF0ZVwiXG4gICAgICAgICAgICBsb2dvdXQgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9sb2dvdXRcIlxuICAgICAgICAgICAgcmVtb3ZlICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcmVtb3ZlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBBUElSb3V0ZU1vZGVsXG4iLCJjbGFzcyBMb2NhbGVzTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuICAgICAgICBjb2RlICAgICA6IG51bGxcbiAgICAgICAgbGFuZ3VhZ2UgOiBudWxsXG4gICAgICAgIHN0cmluZ3MgIDogbnVsbFxuICAgICAgICAgICAgXG4gICAgZ2V0X2xhbmd1YWdlIDogPT5cbiAgICAgICAgcmV0dXJuIEBnZXQoJ2xhbmd1YWdlJylcblxuICAgIGdldFN0cmluZyA6IChpZCkgPT5cbiAgICAgICAgKChyZXR1cm4gZSBpZihhIGlzIGlkKSkgZm9yIGEsIGUgb2Ygdlsnc3RyaW5ncyddKSBmb3IgaywgdiBvZiBAZ2V0KCdzdHJpbmdzJylcbiAgICAgICAgY29uc29sZS53YXJuIFwiTG9jYWxlcyAtPiBub3QgZm91bmQgc3RyaW5nOiAje2lkfVwiXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGVzTW9kZWxcbiIsImNsYXNzIFRlbXBsYXRlTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG5cdGRlZmF1bHRzIDogXG5cblx0XHRpZCAgIDogXCJcIlxuXHRcdHRleHQgOiBcIlwiXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVNb2RlbFxuIiwiQWJzdHJhY3RNb2RlbCAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdE1vZGVsJ1xuTnVtYmVyVXRpbHMgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi91dGlscy9OdW1iZXJVdGlscydcbkNvZGVXb3JkVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXInXG5cbmNsYXNzIERvb2RsZU1vZGVsIGV4dGVuZHMgQWJzdHJhY3RNb2RlbFxuXG5cdGRlZmF1bHRzIDpcblx0XHQjIGZyb20gbWFuaWZlc3Rcblx0XHRcIm5hbWVcIiA6IFwiXCJcblx0XHRcImF1dGhvclwiIDpcblx0XHRcdFwibmFtZVwiICAgIDogXCJcIlxuXHRcdFx0XCJnaXRodWJcIiAgOiBcIlwiXG5cdFx0XHRcIndlYnNpdGVcIiA6IFwiXCJcblx0XHRcdFwidHdpdHRlclwiIDogXCJcIlxuXHRcdFwiZGVzY3JpcHRpb25cIjogXCJcIlxuXHRcdFwidGFnc1wiIDogW11cblx0XHRcImludGVyYWN0aW9uXCIgOlxuXHRcdFx0XCJtb3VzZVwiICAgIDogbnVsbFxuXHRcdFx0XCJrZXlib2FyZFwiIDogbnVsbFxuXHRcdFx0XCJ0b3VjaFwiICAgIDogbnVsbFxuXHRcdFwiY3JlYXRlZFwiIDogXCJcIlxuXHRcdFwic2x1Z1wiIDogXCJcIlxuXHRcdFwiaW5kZXhcIjogbnVsbFxuXHRcdCMgc2l0ZS1vbmx5XG5cdFx0XCJpbmRleEhUTUxcIiA6IFwiXCJcblx0XHRcInNvdXJjZVwiICAgIDogXCJcIlxuXHRcdFwidXJsXCIgICAgICAgOiBcIlwiXG5cdFx0XCJzY3JhbWJsZWRcIiA6XG5cdFx0XHRcIm5hbWVcIiAgICAgICAgOiBcIlwiXG5cdFx0XHRcImF1dGhvcl9uYW1lXCIgOiBcIlwiXG5cblx0X2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG5cdFx0aWYgYXR0cnMuc2x1Z1xuXHRcdFx0YXR0cnMudXJsID0gd2luZG93LmNvbmZpZy5ob3N0bmFtZSArICcvJyArIHdpbmRvdy5jb25maWcucm91dGVzLkRPT0RMRVMgKyAnLycgKyBhdHRycy5zbHVnXG5cblx0XHRpZiBhdHRycy5pbmRleFxuXHRcdFx0YXR0cnMuaW5kZXggPSBOdW1iZXJVdGlscy56ZXJvRmlsbCBhdHRycy5pbmRleCwgM1xuXG5cdFx0aWYgYXR0cnMubmFtZSBhbmQgYXR0cnMuYXV0aG9yLm5hbWVcblx0XHRcdGF0dHJzLnNjcmFtYmxlZCA9XG5cdFx0XHRcdG5hbWUgICAgICAgIDogQ29kZVdvcmRUcmFuc2l0aW9uZXIuZ2V0U2NyYW1ibGVkV29yZCBhdHRycy5uYW1lXG5cdFx0XHRcdGF1dGhvcl9uYW1lIDogQ29kZVdvcmRUcmFuc2l0aW9uZXIuZ2V0U2NyYW1ibGVkV29yZCBhdHRycy5hdXRob3IubmFtZVxuXG5cdFx0aWYgYXR0cnMuaW5kZXhcblx0XHRcdGF0dHJzLmluZGV4SFRNTCA9IEBnZXRJbmRleEhUTUwgYXR0cnMuaW5kZXhcblxuXHRcdGF0dHJzXG5cblx0Z2V0SW5kZXhIVE1MIDogKGluZGV4KSA9PlxuXG5cdFx0SFRNTCA9IFwiXCJcblxuXHRcdGZvciBjaGFyIGluIGluZGV4LnNwbGl0KCcnKVxuXHRcdFx0Y2xhc3NOYW1lID0gaWYgY2hhciBpcyAnMCcgdGhlbiAnaW5kZXgtY2hhci16ZXJvJyBlbHNlICdpbmRleC1jaGFyLW5vbnplcm8nXG5cdFx0XHRIVE1MICs9IFwiPHNwYW4gY2xhc3M9XFxcIiN7Y2xhc3NOYW1lfVxcXCI+I3tjaGFyfTwvc3Bhbj5cIlxuXG5cdFx0SFRNTFxuXG5tb2R1bGUuZXhwb3J0cyA9IERvb2RsZU1vZGVsXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi92aWV3L0Fic3RyYWN0VmlldydcblJvdXRlciAgICAgICA9IHJlcXVpcmUgJy4vUm91dGVyJ1xuXG5jbGFzcyBOYXYgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIEBFVkVOVF9DSEFOR0VfVklFVyAgICAgOiAnRVZFTlRfQ0hBTkdFX1ZJRVcnXG4gICAgQEVWRU5UX0NIQU5HRV9TVUJfVklFVyA6ICdFVkVOVF9DSEFOR0VfU1VCX1ZJRVcnXG5cbiAgICBzZWN0aW9ucyA6IG51bGwgIyBzZXQgdmlhIHdpbmRvdy5jb25maWcgZGF0YSwgc28gY2FuIGJlIGNvbnNpc3RlbnQgd2l0aCBiYWNrZW5kXG5cbiAgICBjdXJyZW50ICA6IGFyZWEgOiBudWxsLCBzdWIgOiBudWxsLCB0ZXIgOiBudWxsXG4gICAgcHJldmlvdXMgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbCwgdGVyIDogbnVsbFxuXG4gICAgY2hhbmdlVmlld0NvdW50IDogMFxuXG4gICAgY29uc3RydWN0b3I6IC0+XG5cbiAgICAgICAgQHNlY3Rpb25zID0gd2luZG93LmNvbmZpZy5yb3V0ZXNcbiAgICAgICAgQGZhdmljb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmF2aWNvbicpXG5cbiAgICAgICAgQENEKCkucm91dGVyLm9uIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBjaGFuZ2VWaWV3XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBnZXRTZWN0aW9uIDogKHNlY3Rpb24pID0+XG5cbiAgICAgICAgaWYgc2VjdGlvbiBpcyAnJyB0aGVuIHJldHVybiB0cnVlXG5cbiAgICAgICAgZm9yIHNlY3Rpb25OYW1lLCB1cmkgb2YgQHNlY3Rpb25zXG4gICAgICAgICAgICBpZiB1cmkgaXMgc2VjdGlvbiB0aGVuIHJldHVybiBzZWN0aW9uTmFtZVxuXG4gICAgICAgIGZhbHNlXG5cbiAgICBjaGFuZ2VWaWV3OiAoYXJlYSwgc3ViLCB0ZXIsIHBhcmFtcykgPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwiYXJlYVwiLGFyZWFcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInN1YlwiLHN1YlxuICAgICAgICAjIGNvbnNvbGUubG9nIFwidGVyXCIsdGVyXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJwYXJhbXNcIixwYXJhbXNcblxuICAgICAgICBAY2hhbmdlVmlld0NvdW50KytcblxuICAgICAgICBAcHJldmlvdXMgPSBAY3VycmVudFxuICAgICAgICBAY3VycmVudCAgPSBhcmVhIDogYXJlYSwgc3ViIDogc3ViLCB0ZXIgOiB0ZXJcblxuICAgICAgICBpZiBAcHJldmlvdXMuYXJlYSBhbmQgQHByZXZpb3VzLmFyZWEgaXMgQGN1cnJlbnQuYXJlYVxuICAgICAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGN1cnJlbnRcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9WSUVXLCBAcHJldmlvdXMsIEBjdXJyZW50XG4gICAgICAgICAgICBAdHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBAY3VycmVudFxuXG4gICAgICAgIGlmIEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLmlzT3BlbigpIHRoZW4gQENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIuaGlkZU9wZW5Nb2RhbCgpXG5cbiAgICAgICAgQHNldFBhZ2VUaXRsZSBhcmVhLCBzdWIsIHRlclxuICAgICAgICBAc2V0UGFnZUZhdmljb24gYXJlYVxuXG4gICAgICAgIG51bGxcblxuICAgIHNldFBhZ2VUaXRsZTogKGFyZWEsIHN1YiwgdGVyKSA9PlxuXG4gICAgICAgIHNlY3Rpb24gICA9IGlmIGFyZWEgaXMgJycgdGhlbiAnSE9NRScgZWxzZSBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBhcmVhXG4gICAgICAgIHRpdGxlVG1wbCA9IEBDRCgpLmxvY2FsZS5nZXQoXCJwYWdlX3RpdGxlXyN7c2VjdGlvbn1cIikgb3IgQENEKCkubG9jYWxlLmdldChcInBhZ2VfdGl0bGVfSE9NRVwiKVxuICAgICAgICB0aXRsZSA9IEBzdXBwbGFudFN0cmluZyB0aXRsZVRtcGwsIEBnZXRQYWdlVGl0bGVWYXJzKGFyZWEsIHN1YiwgdGVyKSwgZmFsc2VcblxuICAgICAgICBpZiB3aW5kb3cuZG9jdW1lbnQudGl0bGUgaXNudCB0aXRsZSB0aGVuIHdpbmRvdy5kb2N1bWVudC50aXRsZSA9IHRpdGxlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2V0UGFnZUZhdmljb246IChhcmVhKSA9PlxuXG4gICAgICAgIGNvbG91ciA9IHN3aXRjaCBhcmVhXG4gICAgICAgICAgICB3aGVuIEBzZWN0aW9ucy5IT01FIHRoZW4gJ3JlZCdcbiAgICAgICAgICAgIHdoZW4gQHNlY3Rpb25zLkFCT1VULCBAc2VjdGlvbnMuQ09OVFJJQlVURSB0aGVuICdibGFjaydcbiAgICAgICAgICAgIHdoZW4gQHNlY3Rpb25zLkRPT0RMRVMgdGhlbiAnYmx1ZSdcbiAgICAgICAgICAgIGVsc2UgJ3JlZCdcblxuICAgICAgICBzZXRUaW1lb3V0ID0+XG4gICAgICAgICAgICBAZmF2aWNvbi5ocmVmID0gXCIje0BDRCgpLkJBU0VfVVJMfS9zdGF0aWMvaW1nL2ljb25zL2Zhdmljb24vZmF2aWNvbl8je2NvbG91cn0ucG5nXCJcbiAgICAgICAgLCAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0UGFnZVRpdGxlVmFyczogKGFyZWEsIHN1YiwgdGVyKSA9PlxuXG4gICAgICAgIHZhcnMgPSB7fVxuXG4gICAgICAgIGlmIGFyZWEgaXMgQHNlY3Rpb25zLkRPT0RMRVMgYW5kIHN1YiBhbmQgdGVyXG4gICAgICAgICAgICBkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZmluZFdoZXJlIHNsdWc6IFwiI3tzdWJ9LyN7dGVyfVwiXG5cbiAgICAgICAgICAgIGlmICFkb29kbGVcbiAgICAgICAgICAgICAgICB2YXJzLm5hbWUgPSBcImRvb2RsZVwiXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdmFycy5uYW1lID0gZG9vZGxlLmdldCgnYXV0aG9yLm5hbWUnKSArICcgXFxcXCAnICsgZG9vZGxlLmdldCgnbmFtZScpICsgJyAnXG5cbiAgICAgICAgdmFyc1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5hdlxuIiwiY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyXG5cbiAgICBARVZFTlRfSEFTSF9DSEFOR0VEIDogJ0VWRU5UX0hBU0hfQ0hBTkdFRCdcblxuICAgIEZJUlNUX1JPVVRFIDogdHJ1ZVxuXG4gICAgcm91dGVzIDpcbiAgICAgICAgJygvKSg6YXJlYSkoLzpzdWIpKC86dGVyKSgvKScgOiAnaGFzaENoYW5nZWQnXG4gICAgICAgICcqYWN0aW9ucycgICAgICAgICAgICAgICAgICAgIDogJ25hdmlnYXRlVG8nXG5cbiAgICBhcmVhICAgOiBudWxsXG4gICAgc3ViICAgIDogbnVsbFxuICAgIHRlciAgICA6IG51bGxcbiAgICBwYXJhbXMgOiBudWxsXG5cbiAgICBzdGFydCA6ID0+XG5cbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCBcbiAgICAgICAgICAgIHB1c2hTdGF0ZSA6IHRydWVcbiAgICAgICAgICAgIHJvb3QgICAgICA6ICcvJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGhhc2hDaGFuZ2VkIDogKEBhcmVhID0gbnVsbCwgQHN1YiA9IG51bGwsIEB0ZXIgPSBudWxsKSA9PlxuXG4gICAgICAgIGNvbnNvbGUubG9nIFwiPj4gRVZFTlRfSEFTSF9DSEFOR0VEIEBhcmVhID0gI3tAYXJlYX0sIEBzdWIgPSAje0BzdWJ9LCBAdGVyID0gI3tAdGVyfSA8PFwiXG5cbiAgICAgICAgaWYgQEZJUlNUX1JPVVRFIHRoZW4gQEZJUlNUX1JPVVRFID0gZmFsc2VcblxuICAgICAgICBpZiAhQGFyZWEgdGhlbiBAYXJlYSA9IEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cbiAgICAgICAgQHRyaWdnZXIgUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQGFyZWEsIEBzdWIsIEB0ZXIsIEBwYXJhbXNcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvIDogKHdoZXJlID0gJycsIHRyaWdnZXIgPSB0cnVlLCByZXBsYWNlID0gZmFsc2UsIEBwYXJhbXMpID0+XG5cbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KDApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIvI3t3aGVyZX1cIlxuICAgICAgICBpZiB3aGVyZS5jaGFyQXQoIHdoZXJlLmxlbmd0aC0xICkgaXNudCBcIi9cIlxuICAgICAgICAgICAgd2hlcmUgPSBcIiN7d2hlcmV9L1wiXG5cbiAgICAgICAgaWYgIXRyaWdnZXJcbiAgICAgICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIHdoZXJlLCBudWxsLCBAcGFyYW1zXG4gICAgICAgICAgICByZXR1cm5cblxuICAgICAgICBAbmF2aWdhdGUgd2hlcmUsIHRyaWdnZXI6IHRydWUsIHJlcGxhY2U6IHJlcGxhY2VcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlclxuIiwiIyMjXG5BbmFseXRpY3Mgd3JhcHBlclxuIyMjXG5jbGFzcyBBbmFseXRpY3NcblxuICAgIHRhZ3MgICAgOiBudWxsXG4gICAgc3RhcnRlZCA6IGZhbHNlXG5cbiAgICBhdHRlbXB0cyAgICAgICAgOiAwXG4gICAgYWxsb3dlZEF0dGVtcHRzIDogNVxuXG4gICAgY29uc3RydWN0b3IgOiAodGFncywgQGNhbGxiYWNrKSAtPlxuXG4gICAgICAgICQuZ2V0SlNPTiB0YWdzLCBAb25UYWdzUmVjZWl2ZWRcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgb25UYWdzUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICBAdGFncyAgICA9IGRhdGFcbiAgICAgICAgQHN0YXJ0ZWQgPSB0cnVlXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgICMjI1xuICAgIEBwYXJhbSBzdHJpbmcgaWQgb2YgdGhlIHRyYWNraW5nIHRhZyB0byBiZSBwdXNoZWQgb24gQW5hbHl0aWNzIFxuICAgICMjI1xuICAgIHRyYWNrIDogKHBhcmFtKSA9PlxuXG4gICAgICAgIHJldHVybiBpZiAhQHN0YXJ0ZWRcblxuICAgICAgICBpZiBwYXJhbVxuXG4gICAgICAgICAgICB2ID0gQHRhZ3NbcGFyYW1dXG5cbiAgICAgICAgICAgIGlmIHZcblxuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ3NlbmQnLCAnZXZlbnQnXVxuICAgICAgICAgICAgICAgICggYXJncy5wdXNoKGFyZykgKSBmb3IgYXJnIGluIHZcblxuICAgICAgICAgICAgICAgICMgbG9hZGluZyBHQSBhZnRlciBtYWluIGFwcCBKUywgc28gZXh0ZXJuYWwgc2NyaXB0IG1heSBub3QgYmUgaGVyZSB5ZXRcbiAgICAgICAgICAgICAgICBpZiB3aW5kb3cuZ2FcbiAgICAgICAgICAgICAgICAgICAgZ2EuYXBwbHkgbnVsbCwgYXJnc1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgQGF0dGVtcHRzID49IEBhbGxvd2VkQXR0ZW1wdHNcbiAgICAgICAgICAgICAgICAgICAgQHN0YXJ0ZWQgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgQHRyYWNrIHBhcmFtXG4gICAgICAgICAgICAgICAgICAgICAgICBAYXR0ZW1wdHMrK1xuICAgICAgICAgICAgICAgICAgICAsIDIwMDBcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQW5hbHl0aWNzXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcbkZhY2Vib29rICAgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi4vdXRpbHMvR29vZ2xlUGx1cydcblxuY2xhc3MgQXV0aE1hbmFnZXIgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHR1c2VyRGF0YSAgOiBudWxsXG5cblx0IyBAcHJvY2VzcyB0cnVlIGR1cmluZyBsb2dpbiBwcm9jZXNzXG5cdHByb2Nlc3MgICAgICA6IGZhbHNlXG5cdHByb2Nlc3NUaW1lciA6IG51bGxcblx0cHJvY2Vzc1dhaXQgIDogNTAwMFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB1c2VyRGF0YSAgPSBAQ0QoKS5hcHBEYXRhLlVTRVJcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0bG9naW4gOiAoc2VydmljZSwgY2I9bnVsbCkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCIrKysrIFBST0NFU1MgXCIsQHByb2Nlc3NcblxuXHRcdHJldHVybiBpZiBAcHJvY2Vzc1xuXG5cdFx0QHNob3dMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gdHJ1ZVxuXG5cdFx0JGRhdGFEZmQgPSAkLkRlZmVycmVkKClcblxuXHRcdHN3aXRjaCBzZXJ2aWNlXG5cdFx0XHR3aGVuICdnb29nbGUnXG5cdFx0XHRcdEdvb2dsZVBsdXMubG9naW4gJGRhdGFEZmRcblx0XHRcdHdoZW4gJ2ZhY2Vib29rJ1xuXHRcdFx0XHRGYWNlYm9vay5sb2dpbiAkZGF0YURmZFxuXG5cdFx0JGRhdGFEZmQuZG9uZSAocmVzKSA9PiBAYXV0aFN1Y2Nlc3Mgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuZmFpbCAocmVzKSA9PiBAYXV0aEZhaWwgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuYWx3YXlzICgpID0+IEBhdXRoQ2FsbGJhY2sgY2JcblxuXHRcdCMjI1xuXHRcdFVuZm9ydHVuYXRlbHkgbm8gY2FsbGJhY2sgaXMgZmlyZWQgaWYgdXNlciBtYW51YWxseSBjbG9zZXMgRysgbG9naW4gbW9kYWwsXG5cdFx0c28gdGhpcyBpcyB0byBhbGxvdyB0aGVtIHRvIGNsb3NlIHdpbmRvdyBhbmQgdGhlbiBzdWJzZXF1ZW50bHkgdHJ5IHRvIGxvZyBpbiBhZ2Fpbi4uLlxuXHRcdCMjI1xuXHRcdEBwcm9jZXNzVGltZXIgPSBzZXRUaW1lb3V0IEBhdXRoQ2FsbGJhY2ssIEBwcm9jZXNzV2FpdFxuXG5cdFx0JGRhdGFEZmRcblxuXHRhdXRoU3VjY2VzcyA6IChzZXJ2aWNlLCBkYXRhKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImxvZ2luIGNhbGxiYWNrIGZvciAje3NlcnZpY2V9LCBkYXRhID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aEZhaWwgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBmYWlsIGZvciAje3NlcnZpY2V9ID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aENhbGxiYWNrIDogKGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIEBwcm9jZXNzXG5cblx0XHRjbGVhclRpbWVvdXQgQHByb2Nlc3NUaW1lclxuXG5cdFx0QGhpZGVMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gZmFsc2VcblxuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0IyMjXG5cdHNob3cgLyBoaWRlIHNvbWUgVUkgaW5kaWNhdG9yIHRoYXQgd2UgYXJlIHdhaXRpbmcgZm9yIHNvY2lhbCBuZXR3b3JrIHRvIHJlc3BvbmRcblx0IyMjXG5cdHNob3dMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcInNob3dMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5cdGhpZGVMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImhpZGVMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhNYW5hZ2VyXG4iLCJlbmNvZGUgPSByZXF1aXJlICdlbnQvZW5jb2RlJ1xuXG5jbGFzcyBDb2RlV29yZFRyYW5zaXRpb25lclxuXG5cdEBjb25maWcgOlxuXHRcdE1JTl9XUk9OR19DSEFSUyA6IDFcblx0XHRNQVhfV1JPTkdfQ0hBUlMgOiA3XG5cblx0XHRNSU5fQ0hBUl9JTl9ERUxBWSA6IDQwXG5cdFx0TUFYX0NIQVJfSU5fREVMQVkgOiA3MFxuXG5cdFx0TUlOX0NIQVJfT1VUX0RFTEFZIDogNDBcblx0XHRNQVhfQ0hBUl9PVVRfREVMQVkgOiA3MFxuXG5cdFx0Q0hBUlMgOiAnYWJjZGVmaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhPyooKUDCoyQlXiZfLSs9W117fTo7XFwnXCJcXFxcfDw+LC4vfmAnLnNwbGl0KCcnKS5tYXAoKGNoYXIpID0+IHJldHVybiBlbmNvZGUoY2hhcikpXG5cblx0XHRDSEFSX1RFTVBMQVRFIDogXCI8c3BhbiBkYXRhLWNvZGV0ZXh0LWNoYXI9XFxcInt7IGNoYXIgfX1cXFwiIGRhdGEtY29kZXRleHQtY2hhci1zdGF0ZT1cXFwie3sgc3RhdGUgfX1cXFwiPnt7IGNoYXIgfX08L3NwYW4+XCJcblxuXHRAX3dvcmRDYWNoZSA6IHt9XG5cblx0QF9nZXRXb3JkRnJvbUNhY2hlIDogKCRlbCkgPT5cblxuXHRcdGlkID0gJGVsLmF0dHIoJ2RhdGEtY29kZXdvcmQtaWQnKVxuXG5cdFx0aWYgaWQgYW5kIEBfd29yZENhY2hlWyBpZCBdXG5cdFx0XHR3b3JkID0gQF93b3JkQ2FjaGVbIGlkIF1cblx0XHRlbHNlXG5cdFx0XHRAX3dyYXBDaGFycyAkZWxcblx0XHRcdHdvcmQgPSBAX2FkZFdvcmRUb0NhY2hlICRlbFxuXG5cdFx0d29yZFxuXG5cdEBfYWRkV29yZFRvQ2FjaGUgOiAoJGVsKSA9PlxuXG5cdFx0Y2hhcnMgPSBbXVxuXG5cdFx0JGVsLmZpbmQoJ1tkYXRhLWNvZGV0ZXh0LWNoYXJdJykuZWFjaCAoaSwgZWwpID0+XG5cdFx0XHQkY2hhckVsID0gJChlbClcblx0XHRcdGNoYXJzLnB1c2hcblx0XHRcdFx0JGVsICAgICAgICA6ICRjaGFyRWxcblx0XHRcdFx0cmlnaHRDaGFyICA6ICRjaGFyRWwuYXR0cignZGF0YS1jb2RldGV4dC1jaGFyJylcblxuXHRcdGlkID0gXy51bmlxdWVJZCgpXG5cdFx0JGVsLmF0dHIgJ2RhdGEtY29kZXdvcmQtaWQnLCBpZFxuXG5cdFx0QF93b3JkQ2FjaGVbIGlkIF0gPVxuXHRcdFx0d29yZCAgICA6IF8ucGx1Y2soY2hhcnMsICdyaWdodENoYXInKS5qb2luKCcnKVxuXHRcdFx0JGVsICAgICA6ICRlbFxuXHRcdFx0Y2hhcnMgICA6IGNoYXJzXG5cdFx0XHR2aXNpYmxlIDogdHJ1ZVxuXG5cdFx0QF93b3JkQ2FjaGVbIGlkIF1cblxuXHRAX3dyYXBDaGFycyA6ICgkZWwpID0+XG5cblx0XHRjaGFycyA9ICRlbC50ZXh0KCkuc3BsaXQoJycpXG5cdFx0c3RhdGUgPSAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pbml0aWFsLXN0YXRlJykgb3IgXCJcIlxuXHRcdGh0bWwgPSBbXVxuXHRcdGZvciBjaGFyIGluIGNoYXJzXG5cdFx0XHRodG1sLnB1c2ggQF9zdXBwbGFudFN0cmluZyBAY29uZmlnLkNIQVJfVEVNUExBVEUsIGNoYXIgOiBjaGFyLCBzdGF0ZTogc3RhdGVcblxuXHRcdCRlbC5odG1sIGh0bWwuam9pbignJylcblxuXHRcdG51bGxcblxuXHRAX2lzV29yZEVtcHR5IDogKHdvcmQpID0+XG5cblx0XHRudWxsXG5cblx0IyBAcGFyYW0gdGFyZ2V0ID0gJ3JpZ2h0JywgJ3dyb25nJywgJ2VtcHR5J1xuXHRAX3ByZXBhcmVXb3JkIDogKHdvcmQsIHRhcmdldCwgY2hhclN0YXRlPScnKSA9PlxuXG5cdFx0Zm9yIGNoYXIsIGkgaW4gd29yZC5jaGFyc1xuXG5cdFx0XHR0YXJnZXRDaGFyID0gc3dpdGNoIHRydWVcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ3JpZ2h0JyB0aGVuIGNoYXIucmlnaHRDaGFyXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICd3cm9uZycgdGhlbiBAX2dldFJhbmRvbUNoYXIoKVxuXHRcdFx0XHR3aGVuIHRhcmdldCBpcyAnZW1wdHknIHRoZW4gJydcblx0XHRcdFx0ZWxzZSB0YXJnZXQuY2hhckF0KGkpIG9yICcnXG5cblx0XHRcdGlmIHRhcmdldENoYXIgaXMgJyAnIHRoZW4gdGFyZ2V0Q2hhciA9ICcmbmJzcDsnXG5cblx0XHRcdGNoYXIud3JvbmdDaGFycyA9IEBfZ2V0UmFuZG9tV3JvbmdDaGFycygpXG5cdFx0XHRjaGFyLnRhcmdldENoYXIgPSB0YXJnZXRDaGFyXG5cdFx0XHRjaGFyLmNoYXJTdGF0ZSAgPSBjaGFyU3RhdGVcblxuXHRcdG51bGxcblxuXHRAX2dldFJhbmRvbVdyb25nQ2hhcnMgOiA9PlxuXG5cdFx0Y2hhcnMgPSBbXVxuXG5cdFx0Y2hhckNvdW50ID0gXy5yYW5kb20gQGNvbmZpZy5NSU5fV1JPTkdfQ0hBUlMsIEBjb25maWcuTUFYX1dST05HX0NIQVJTXG5cblx0XHRmb3IgaSBpbiBbMC4uLmNoYXJDb3VudF1cblx0XHRcdGNoYXJzLnB1c2hcblx0XHRcdFx0Y2hhciAgICAgOiBAX2dldFJhbmRvbUNoYXIoKVxuXHRcdFx0XHRpbkRlbGF5ICA6IF8ucmFuZG9tIEBjb25maWcuTUlOX0NIQVJfSU5fREVMQVksIEBjb25maWcuTUFYX0NIQVJfSU5fREVMQVlcblx0XHRcdFx0b3V0RGVsYXkgOiBfLnJhbmRvbSBAY29uZmlnLk1JTl9DSEFSX09VVF9ERUxBWSwgQGNvbmZpZy5NQVhfQ0hBUl9PVVRfREVMQVlcblxuXHRcdGNoYXJzXG5cblx0QF9nZXRSYW5kb21DaGFyIDogPT5cblxuXHRcdGNoYXIgPSBAY29uZmlnLkNIQVJTWyBfLnJhbmRvbSgwLCBAY29uZmlnLkNIQVJTLmxlbmd0aC0xKSBdXG5cblx0XHRjaGFyXG5cblx0QF9nZXRMb25nZXN0Q2hhckR1cmF0aW9uIDogKGNoYXJzKSA9PlxuXG5cdFx0bG9uZ2VzdFRpbWUgPSAwXG5cdFx0bG9uZ2VzdFRpbWVJZHggPSAwXG5cblx0XHRmb3IgY2hhciwgaSBpbiBjaGFyc1xuXG5cdFx0XHR0aW1lID0gMFxuXHRcdFx0KHRpbWUgKz0gd3JvbmdDaGFyLmluRGVsYXkgKyB3cm9uZ0NoYXIub3V0RGVsYXkpIGZvciB3cm9uZ0NoYXIgaW4gY2hhci53cm9uZ0NoYXJzXG5cdFx0XHRpZiB0aW1lID4gbG9uZ2VzdFRpbWVcblx0XHRcdFx0bG9uZ2VzdFRpbWUgPSB0aW1lXG5cdFx0XHRcdGxvbmdlc3RUaW1lSWR4ID0gaVxuXG5cdFx0bG9uZ2VzdFRpbWVJZHhcblxuXHRAX2FuaW1hdGVDaGFycyA6ICh3b3JkLCBzZXF1ZW50aWFsLCBjYikgPT5cblxuXHRcdGFjdGl2ZUNoYXIgPSAwXG5cblx0XHRpZiBzZXF1ZW50aWFsXG5cdFx0XHRAX2FuaW1hdGVDaGFyIHdvcmQuY2hhcnMsIGFjdGl2ZUNoYXIsIHRydWUsIGNiXG5cdFx0ZWxzZVxuXHRcdFx0bG9uZ2VzdENoYXJJZHggPSBAX2dldExvbmdlc3RDaGFyRHVyYXRpb24gd29yZC5jaGFyc1xuXHRcdFx0Zm9yIGNoYXIsIGkgaW4gd29yZC5jaGFyc1xuXHRcdFx0XHRhcmdzID0gWyB3b3JkLmNoYXJzLCBpLCBmYWxzZSBdXG5cdFx0XHRcdGlmIGkgaXMgbG9uZ2VzdENoYXJJZHggdGhlbiBhcmdzLnB1c2ggY2Jcblx0XHRcdFx0QF9hbmltYXRlQ2hhci5hcHBseSBALCBhcmdzXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlQ2hhciA6IChjaGFycywgaWR4LCByZWN1cnNlLCBjYikgPT5cblxuXHRcdGNoYXIgPSBjaGFyc1tpZHhdXG5cblx0XHRpZiByZWN1cnNlXG5cblx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgPT5cblxuXHRcdFx0XHRpZiBpZHggaXMgY2hhcnMubGVuZ3RoLTFcblx0XHRcdFx0XHRAX2FuaW1hdGVDaGFyc0RvbmUgY2Jcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdEBfYW5pbWF0ZUNoYXIgY2hhcnMsIGlkeCsxLCByZWN1cnNlLCBjYlxuXG5cdFx0ZWxzZVxuXG5cdFx0XHRpZiB0eXBlb2YgY2IgaXMgJ2Z1bmN0aW9uJ1xuXHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsID0+IEBfYW5pbWF0ZUNoYXJzRG9uZSBjYlxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXJcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVXcm9uZ0NoYXJzIDogKGNoYXIsIGNiKSA9PlxuXG5cdFx0aWYgY2hhci53cm9uZ0NoYXJzLmxlbmd0aFxuXG5cdFx0XHR3cm9uZ0NoYXIgPSBjaGFyLndyb25nQ2hhcnMuc2hpZnQoKVxuXG5cdFx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRcdGNoYXIuJGVsLmh0bWwgd3JvbmdDaGFyLmNoYXJcblxuXHRcdFx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyLCBjYlxuXHRcdFx0XHQsIHdyb25nQ2hhci5vdXREZWxheVxuXG5cdFx0XHQsIHdyb25nQ2hhci5pbkRlbGF5XG5cblx0XHRlbHNlXG5cblx0XHRcdGNoYXIuJGVsXG5cdFx0XHRcdC5hdHRyKCdkYXRhLWNvZGV0ZXh0LWNoYXItc3RhdGUnLCBjaGFyLmNoYXJTdGF0ZSlcblx0XHRcdFx0Lmh0bWwoY2hhci50YXJnZXRDaGFyKVxuXG5cdFx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdEBfYW5pbWF0ZUNoYXJzRG9uZSA6IChjYikgPT5cblxuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0QF9zdXBwbGFudFN0cmluZyA6IChzdHIsIHZhbHMpID0+XG5cblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UgL3t7IChbXnt9XSopIH19L2csIChhLCBiKSA9PlxuXHRcdFx0ciA9IHZhbHNbYl1cblx0XHRcdChpZiB0eXBlb2YgciBpcyBcInN0cmluZ1wiIG9yIHR5cGVvZiByIGlzIFwibnVtYmVyXCIgdGhlbiByIGVsc2UgYSlcblxuXHRAdG8gOiAodGFyZ2V0VGV4dCwgJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHRvKHRhcmdldFRleHQsIF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHR3b3JkLnZpc2libGUgPSB0cnVlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsIHRhcmdldFRleHQsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QGluIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEBpbihfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cdFx0d29yZC52aXNpYmxlID0gdHJ1ZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAncmlnaHQnLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEBvdXQgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQG91dChfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdHdvcmQudmlzaWJsZSA9IGZhbHNlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdlbXB0eScsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QHNjcmFtYmxlIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEBzY3JhbWJsZShfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAnd3JvbmcnLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEB1bnNjcmFtYmxlIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEB1bnNjcmFtYmxlKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdyaWdodCcsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QGdldFNjcmFtYmxlZFdvcmQgOiAod29yZCkgPT5cblxuXHRcdG5ld0NoYXJzID0gW11cblx0XHQobmV3Q2hhcnMucHVzaCBAX2dldFJhbmRvbUNoYXIoKSkgZm9yIGNoYXIgaW4gd29yZC5zcGxpdCgnJylcblxuXHRcdHJldHVybiBuZXdDaGFycy5qb2luKCcnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVXb3JkVHJhbnNpdGlvbmVyXG5cbndpbmRvdy5Db2RlV29yZFRyYW5zaXRpb25lcj0gQ29kZVdvcmRUcmFuc2l0aW9uZXJcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuXG4jIyNcblxuRmFjZWJvb2sgU0RLIHdyYXBwZXIgLSBsb2FkIGFzeW5jaHJvbm91c2x5LCBzb21lIGhlbHBlciBtZXRob2RzXG5cbiMjI1xuY2xhc3MgRmFjZWJvb2sgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHRAdXJsICAgICAgICAgOiAnLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9hbGwuanMnXG5cblx0QHBlcm1pc3Npb25zIDogJ2VtYWlsJ1xuXG5cdEAkZGF0YURmZCAgICA6IG51bGxcblx0QGxvYWRlZCAgICAgIDogZmFsc2VcblxuXHRAbG9hZCA6ID0+XG5cblx0XHQjIyNcblx0XHRUTyBET1xuXHRcdGluY2x1ZGUgc2NyaXB0IGxvYWRlciB3aXRoIGNhbGxiYWNrIHRvIDppbml0XG5cdFx0IyMjXG5cdFx0IyByZXF1aXJlIFtAdXJsXSwgQGluaXRcblxuXHRcdG51bGxcblxuXHRAaW5pdCA6ID0+XG5cblx0XHRAbG9hZGVkID0gdHJ1ZVxuXG5cdFx0RkIuaW5pdFxuXHRcdFx0YXBwSWQgIDogd2luZG93LmNvbmZpZy5mYl9hcHBfaWRcblx0XHRcdHN0YXR1cyA6IGZhbHNlXG5cdFx0XHR4ZmJtbCAgOiBmYWxzZVxuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbiA6IChAJGRhdGFEZmQpID0+XG5cblx0XHRpZiAhQGxvYWRlZCB0aGVuIHJldHVybiBAJGRhdGFEZmQucmVqZWN0ICdTREsgbm90IGxvYWRlZCdcblxuXHRcdEZCLmxvZ2luICggcmVzICkgPT5cblxuXHRcdFx0aWYgcmVzWydzdGF0dXMnXSBpcyAnY29ubmVjdGVkJ1xuXHRcdFx0XHRAZ2V0VXNlckRhdGEgcmVzWydhdXRoUmVzcG9uc2UnXVsnYWNjZXNzVG9rZW4nXVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdubyB3YXkgam9zZSdcblxuXHRcdCwgeyBzY29wZTogQHBlcm1pc3Npb25zIH1cblxuXHRcdG51bGxcblxuXHRAZ2V0VXNlckRhdGEgOiAodG9rZW4pID0+XG5cblx0XHR1c2VyRGF0YSA9IHt9XG5cdFx0dXNlckRhdGEuYWNjZXNzX3Rva2VuID0gdG9rZW5cblxuXHRcdCRtZURmZCAgID0gJC5EZWZlcnJlZCgpXG5cdFx0JHBpY0RmZCAgPSAkLkRlZmVycmVkKClcblxuXHRcdEZCLmFwaSAnL21lJywgKHJlcykgLT5cblxuXHRcdFx0dXNlckRhdGEuZnVsbF9uYW1lID0gcmVzLm5hbWVcblx0XHRcdHVzZXJEYXRhLnNvY2lhbF9pZCA9IHJlcy5pZFxuXHRcdFx0dXNlckRhdGEuZW1haWwgICAgID0gcmVzLmVtYWlsIG9yIGZhbHNlXG5cdFx0XHQkbWVEZmQucmVzb2x2ZSgpXG5cblx0XHRGQi5hcGkgJy9tZS9waWN0dXJlJywgeyAnd2lkdGgnOiAnMjAwJyB9LCAocmVzKSAtPlxuXG5cdFx0XHR1c2VyRGF0YS5wcm9maWxlX3BpYyA9IHJlcy5kYXRhLnVybFxuXHRcdFx0JHBpY0RmZC5yZXNvbHZlKClcblxuXHRcdCQud2hlbigkbWVEZmQsICRwaWNEZmQpLmRvbmUgPT4gQCRkYXRhRGZkLnJlc29sdmUgdXNlckRhdGFcblxuXHRcdG51bGxcblxuXHRAc2hhcmUgOiAob3B0cywgY2IpID0+XG5cblx0XHRGQi51aSB7XG5cdFx0XHRtZXRob2QgICAgICA6IG9wdHMubWV0aG9kIG9yICdmZWVkJ1xuXHRcdFx0bmFtZSAgICAgICAgOiBvcHRzLm5hbWUgb3IgJydcblx0XHRcdGxpbmsgICAgICAgIDogb3B0cy5saW5rIG9yICcnXG5cdFx0XHRwaWN0dXJlICAgICA6IG9wdHMucGljdHVyZSBvciAnJ1xuXHRcdFx0Y2FwdGlvbiAgICAgOiBvcHRzLmNhcHRpb24gb3IgJydcblx0XHRcdGRlc2NyaXB0aW9uIDogb3B0cy5kZXNjcmlwdGlvbiBvciAnJ1xuXHRcdH0sIChyZXNwb25zZSkgLT5cblx0XHRcdGNiPyhyZXNwb25zZSlcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNlYm9va1xuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5cbiMjI1xuXG5Hb29nbGUrIFNESyB3cmFwcGVyIC0gbG9hZCBhc3luY2hyb25vdXNseSwgc29tZSBoZWxwZXIgbWV0aG9kc1xuXG4jIyNcbmNsYXNzIEdvb2dsZVBsdXMgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHRAdXJsICAgICAgOiAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50OnBsdXNvbmUuanMnXG5cblx0QHBhcmFtcyAgIDpcblx0XHQnY2xpZW50aWQnICAgICA6IG51bGxcblx0XHQnY2FsbGJhY2snICAgICA6IG51bGxcblx0XHQnc2NvcGUnICAgICAgICA6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL3VzZXJpbmZvLmVtYWlsJ1xuXHRcdCdjb29raWVwb2xpY3knIDogJ25vbmUnXG5cblx0QCRkYXRhRGZkIDogbnVsbFxuXHRAbG9hZGVkICAgOiBmYWxzZVxuXG5cdEBsb2FkIDogPT5cblxuXHRcdCMjI1xuXHRcdFRPIERPXG5cdFx0aW5jbHVkZSBzY3JpcHQgbG9hZGVyIHdpdGggY2FsbGJhY2sgdG8gOmluaXRcblx0XHQjIyNcblx0XHQjIHJlcXVpcmUgW0B1cmxdLCBAaW5pdFxuXG5cdFx0bnVsbFxuXG5cdEBpbml0IDogPT5cblxuXHRcdEBsb2FkZWQgPSB0cnVlXG5cblx0XHRAcGFyYW1zWydjbGllbnRpZCddID0gd2luZG93LmNvbmZpZy5ncF9hcHBfaWRcblx0XHRAcGFyYW1zWydjYWxsYmFjayddID0gQGxvZ2luQ2FsbGJhY2tcblxuXHRcdG51bGxcblxuXHRAbG9naW4gOiAoQCRkYXRhRGZkKSA9PlxuXG5cdFx0aWYgQGxvYWRlZFxuXHRcdFx0Z2FwaS5hdXRoLnNpZ25JbiBAcGFyYW1zXG5cdFx0ZWxzZVxuXHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnU0RLIG5vdCBsb2FkZWQnXG5cblx0XHRudWxsXG5cblx0QGxvZ2luQ2FsbGJhY2sgOiAocmVzKSA9PlxuXG5cdFx0aWYgcmVzWydzdGF0dXMnXVsnc2lnbmVkX2luJ11cblx0XHRcdEBnZXRVc2VyRGF0YSByZXNbJ2FjY2Vzc190b2tlbiddXG5cdFx0ZWxzZSBpZiByZXNbJ2Vycm9yJ11bJ2FjY2Vzc19kZW5pZWQnXVxuXHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnbm8gd2F5IGpvc2UnXG5cblx0XHRudWxsXG5cblx0QGdldFVzZXJEYXRhIDogKHRva2VuKSA9PlxuXG5cdFx0Z2FwaS5jbGllbnQubG9hZCAncGx1cycsJ3YxJywgPT5cblxuXHRcdFx0cmVxdWVzdCA9IGdhcGkuY2xpZW50LnBsdXMucGVvcGxlLmdldCAndXNlcklkJzogJ21lJ1xuXHRcdFx0cmVxdWVzdC5leGVjdXRlIChyZXMpID0+XG5cblx0XHRcdFx0dXNlckRhdGEgPVxuXHRcdFx0XHRcdGFjY2Vzc190b2tlbiA6IHRva2VuXG5cdFx0XHRcdFx0ZnVsbF9uYW1lICAgIDogcmVzLmRpc3BsYXlOYW1lXG5cdFx0XHRcdFx0c29jaWFsX2lkICAgIDogcmVzLmlkXG5cdFx0XHRcdFx0ZW1haWwgICAgICAgIDogaWYgcmVzLmVtYWlsc1swXSB0aGVuIHJlcy5lbWFpbHNbMF0udmFsdWUgZWxzZSBmYWxzZVxuXHRcdFx0XHRcdHByb2ZpbGVfcGljICA6IHJlcy5pbWFnZS51cmxcblxuXHRcdFx0XHRAJGRhdGFEZmQucmVzb2x2ZSB1c2VyRGF0YVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZVBsdXNcbiIsIiMgICAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgICBNZWRpYSBRdWVyaWVzIE1hbmFnZXIgXG4jICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jICAgXG4jICAgQGF1dGhvciA6IEbDoWJpbyBBemV2ZWRvIDxmYWJpby5hemV2ZWRvQHVuaXQ5LmNvbT4gVU5JVDlcbiMgICBAZGF0ZSAgIDogU2VwdGVtYmVyIDE0XG4jICAgXG4jICAgSW5zdHJ1Y3Rpb25zIGFyZSBvbiAvcHJvamVjdC9zYXNzL3V0aWxzL19yZXNwb25zaXZlLnNjc3MuXG5cbmNsYXNzIE1lZGlhUXVlcmllc1xuXG4gICAgIyBCcmVha3BvaW50c1xuICAgIEBTTUFMTCAgICAgICA6IFwic21hbGxcIlxuICAgIEBJUEFEICAgICAgICA6IFwiaXBhZFwiXG4gICAgQE1FRElVTSAgICAgIDogXCJtZWRpdW1cIlxuICAgIEBMQVJHRSAgICAgICA6IFwibGFyZ2VcIlxuICAgIEBFWFRSQV9MQVJHRSA6IFwiZXh0cmEtbGFyZ2VcIlxuXG4gICAgQHNldHVwIDogPT5cblxuICAgICAgICBNZWRpYVF1ZXJpZXMuU01BTExfQlJFQUtQT0lOVCAgPSB7bmFtZTogXCJTbWFsbFwiLCBicmVha3BvaW50czogW01lZGlhUXVlcmllcy5TTUFMTF19XG4gICAgICAgIE1lZGlhUXVlcmllcy5NRURJVU1fQlJFQUtQT0lOVCA9IHtuYW1lOiBcIk1lZGl1bVwiLCBicmVha3BvaW50czogW01lZGlhUXVlcmllcy5NRURJVU1dfVxuICAgICAgICBNZWRpYVF1ZXJpZXMuTEFSR0VfQlJFQUtQT0lOVCAgPSB7bmFtZTogXCJMYXJnZVwiLCBicmVha3BvaW50czogW01lZGlhUXVlcmllcy5JUEFELCBNZWRpYVF1ZXJpZXMuTEFSR0UsIE1lZGlhUXVlcmllcy5FWFRSQV9MQVJHRV19XG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTID0gW1xuICAgICAgICAgICAgTWVkaWFRdWVyaWVzLlNNQUxMX0JSRUFLUE9JTlRcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5NRURJVU1fQlJFQUtQT0lOVFxuICAgICAgICAgICAgTWVkaWFRdWVyaWVzLkxBUkdFX0JSRUFLUE9JTlRcbiAgICAgICAgXVxuICAgICAgICByZXR1cm5cblxuICAgIEBnZXREZXZpY2VTdGF0ZSA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHksIFwiYWZ0ZXJcIikuZ2V0UHJvcGVydHlWYWx1ZShcImNvbnRlbnRcIik7XG5cbiAgICBAZ2V0QnJlYWtwb2ludCA6ID0+XG5cbiAgICAgICAgc3RhdGUgPSBNZWRpYVF1ZXJpZXMuZ2V0RGV2aWNlU3RhdGUoKVxuXG4gICAgICAgIGZvciBpIGluIFswLi4uTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTLmxlbmd0aF1cbiAgICAgICAgICAgIGlmIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UU1tpXS5icmVha3BvaW50cy5pbmRleE9mKHN0YXRlKSA+IC0xXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UU1tpXS5uYW1lXG5cbiAgICAgICAgcmV0dXJuIFwiXCJcblxuICAgIEBpc0JyZWFrcG9pbnQgOiAoYnJlYWtwb2ludCkgPT5cblxuICAgICAgICBmb3IgaSBpbiBbMC4uLmJyZWFrcG9pbnQuYnJlYWtwb2ludHMubGVuZ3RoXVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBicmVha3BvaW50LmJyZWFrcG9pbnRzW2ldID09IE1lZGlhUXVlcmllcy5nZXREZXZpY2VTdGF0ZSgpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcblxuICAgICAgICByZXR1cm4gZmFsc2VcblxubW9kdWxlLmV4cG9ydHMgPSBNZWRpYVF1ZXJpZXMiLCJjbGFzcyBOdW1iZXJVdGlsc1xuXG4gICAgQE1BVEhfQ09TOiBNYXRoLmNvcyBcbiAgICBATUFUSF9TSU46IE1hdGguc2luIFxuICAgIEBNQVRIX1JBTkRPTTogTWF0aC5yYW5kb20gXG4gICAgQE1BVEhfQUJTOiBNYXRoLmFic1xuICAgIEBNQVRIX0FUQU4yOiBNYXRoLmF0YW4yXG5cbiAgICBAbGltaXQ6KG51bWJlciwgbWluLCBtYXgpLT5cbiAgICAgICAgcmV0dXJuIE1hdGgubWluKCBNYXRoLm1heChtaW4sbnVtYmVyKSwgbWF4IClcblxuICAgIEBnZXRSYW5kb21Db2xvcjogLT5cblxuICAgICAgICBsZXR0ZXJzID0gJzAxMjM0NTY3ODlBQkNERUYnLnNwbGl0KCcnKVxuICAgICAgICBjb2xvciA9ICcjJ1xuICAgICAgICBmb3IgaSBpbiBbMC4uLjZdXG4gICAgICAgICAgICBjb2xvciArPSBsZXR0ZXJzW01hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDE1KV1cbiAgICAgICAgY29sb3JcblxuICAgIEBnZXRUaW1lU3RhbXBEaWZmIDogKGRhdGUxLCBkYXRlMikgLT5cblxuICAgICAgICAjIEdldCAxIGRheSBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgb25lX2RheSA9IDEwMDAqNjAqNjAqMjRcbiAgICAgICAgdGltZSAgICA9IHt9XG5cbiAgICAgICAgIyBDb252ZXJ0IGJvdGggZGF0ZXMgdG8gbWlsbGlzZWNvbmRzXG4gICAgICAgIGRhdGUxX21zID0gZGF0ZTEuZ2V0VGltZSgpXG4gICAgICAgIGRhdGUyX21zID0gZGF0ZTIuZ2V0VGltZSgpXG5cbiAgICAgICAgIyBDYWxjdWxhdGUgdGhlIGRpZmZlcmVuY2UgaW4gbWlsbGlzZWNvbmRzXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkYXRlMl9tcyAtIGRhdGUxX21zXG5cbiAgICAgICAgIyB0YWtlIG91dCBtaWxsaXNlY29uZHNcbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRpZmZlcmVuY2VfbXMvMTAwMFxuICAgICAgICB0aW1lLnNlY29uZHMgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zICUgNjApXG5cbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRpZmZlcmVuY2VfbXMvNjAgXG4gICAgICAgIHRpbWUubWludXRlcyAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMgJSA2MClcblxuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy82MCBcbiAgICAgICAgdGltZS5ob3VycyAgICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcyAlIDI0KSAgXG5cbiAgICAgICAgdGltZS5kYXlzICAgICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcy8yNClcblxuICAgICAgICB0aW1lXG5cbiAgICBAbWFwOiAoIG51bSwgbWluMSwgbWF4MSwgbWluMiwgbWF4Miwgcm91bmQgPSBmYWxzZSwgY29uc3RyYWluTWluID0gdHJ1ZSwgY29uc3RyYWluTWF4ID0gdHJ1ZSApIC0+XG4gICAgICAgIGlmIGNvbnN0cmFpbk1pbiBhbmQgbnVtIDwgbWluMSB0aGVuIHJldHVybiBtaW4yXG4gICAgICAgIGlmIGNvbnN0cmFpbk1heCBhbmQgbnVtID4gbWF4MSB0aGVuIHJldHVybiBtYXgyXG4gICAgICAgIFxuICAgICAgICBudW0xID0gKG51bSAtIG1pbjEpIC8gKG1heDEgLSBtaW4xKVxuICAgICAgICBudW0yID0gKG51bTEgKiAobWF4MiAtIG1pbjIpKSArIG1pbjJcbiAgICAgICAgaWYgcm91bmQgdGhlbiByZXR1cm4gTWF0aC5yb3VuZChudW0yKVxuXG4gICAgICAgIHJldHVybiBudW0yXG5cbiAgICBAdG9SYWRpYW5zOiAoIGRlZ3JlZSApIC0+XG4gICAgICAgIHJldHVybiBkZWdyZWUgKiAoIE1hdGguUEkgLyAxODAgKVxuXG4gICAgQHRvRGVncmVlOiAoIHJhZGlhbnMgKSAtPlxuICAgICAgICByZXR1cm4gcmFkaWFucyAqICggMTgwIC8gTWF0aC5QSSApXG5cbiAgICBAaXNJblJhbmdlOiAoIG51bSwgbWluLCBtYXgsIGNhbkJlRXF1YWwgKSAtPlxuICAgICAgICBpZiBjYW5CZUVxdWFsIHRoZW4gcmV0dXJuIG51bSA+PSBtaW4gJiYgbnVtIDw9IG1heFxuICAgICAgICBlbHNlIHJldHVybiBudW0gPj0gbWluICYmIG51bSA8PSBtYXhcblxuICAgICMgY29udmVydCBtZXRyZXMgaW4gdG8gbSAvIEtNXG4gICAgQGdldE5pY2VEaXN0YW5jZTogKG1ldHJlcykgPT5cblxuICAgICAgICBpZiBtZXRyZXMgPCAxMDAwXG5cbiAgICAgICAgICAgIHJldHVybiBcIiN7TWF0aC5yb3VuZChtZXRyZXMpfU1cIlxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAga20gPSAobWV0cmVzLzEwMDApLnRvRml4ZWQoMilcbiAgICAgICAgICAgIHJldHVybiBcIiN7a219S01cIlxuXG4gICAgIyBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyNjczMzhcbiAgICBAemVyb0ZpbGw6ICggbnVtYmVyLCB3aWR0aCApID0+XG5cbiAgICAgICAgd2lkdGggLT0gbnVtYmVyLnRvU3RyaW5nKCkubGVuZ3RoXG5cbiAgICAgICAgaWYgd2lkdGggPiAwXG4gICAgICAgICAgICByZXR1cm4gbmV3IEFycmF5KCB3aWR0aCArICgvXFwuLy50ZXN0KCBudW1iZXIgKSA/IDIgOiAxKSApLmpvaW4oICcwJyApICsgbnVtYmVyXG5cbiAgICAgICAgcmV0dXJuIG51bWJlciArIFwiXCIgIyBhbHdheXMgcmV0dXJuIGEgc3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyVXRpbHNcbiIsIiMjI1xuIyBSZXF1ZXN0ZXIgI1xuXG5XcmFwcGVyIGZvciBgJC5hamF4YCBjYWxsc1xuXG4jIyNcbmNsYXNzIFJlcXVlc3RlclxuXG4gICAgQHJlcXVlc3RzIDogW11cblxuICAgIEByZXF1ZXN0OiAoIGRhdGEgKSA9PlxuICAgICAgICAjIyNcbiAgICAgICAgYGRhdGEgPSB7YDxicj5cbiAgICAgICAgYCAgdXJsICAgICAgICAgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgICB0eXBlICAgICAgICA6IFwiUE9TVC9HRVQvUFVUXCJgPGJyPlxuICAgICAgICBgICBkYXRhICAgICAgICA6IE9iamVjdGA8YnI+XG4gICAgICAgIGAgIGRhdGFUeXBlICAgIDogalF1ZXJ5IGRhdGFUeXBlYDxicj5cbiAgICAgICAgYCAgY29udGVudFR5cGUgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgfWBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgciA9ICQuYWpheCB7XG5cbiAgICAgICAgICAgIHVybCAgICAgICAgIDogZGF0YS51cmxcbiAgICAgICAgICAgIHR5cGUgICAgICAgIDogaWYgZGF0YS50eXBlIHRoZW4gZGF0YS50eXBlIGVsc2UgXCJQT1NUXCIsXG4gICAgICAgICAgICBkYXRhICAgICAgICA6IGlmIGRhdGEuZGF0YSB0aGVuIGRhdGEuZGF0YSBlbHNlIG51bGwsXG4gICAgICAgICAgICBkYXRhVHlwZSAgICA6IGlmIGRhdGEuZGF0YVR5cGUgdGhlbiBkYXRhLmRhdGFUeXBlIGVsc2UgXCJqc29uXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZSA6IGlmIGRhdGEuY29udGVudFR5cGUgdGhlbiBkYXRhLmNvbnRlbnRUeXBlIGVsc2UgXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLThcIixcbiAgICAgICAgICAgIHByb2Nlc3NEYXRhIDogaWYgZGF0YS5wcm9jZXNzRGF0YSAhPSBudWxsIGFuZCBkYXRhLnByb2Nlc3NEYXRhICE9IHVuZGVmaW5lZCB0aGVuIGRhdGEucHJvY2Vzc0RhdGEgZWxzZSB0cnVlXG5cbiAgICAgICAgfVxuXG4gICAgICAgIHIuZG9uZSBkYXRhLmRvbmVcbiAgICAgICAgci5mYWlsIGRhdGEuZmFpbFxuICAgICAgICBcbiAgICAgICAgclxuXG4gICAgQGFkZEltYWdlIDogKGRhdGEsIGRvbmUsIGZhaWwpID0+XG4gICAgICAgICMjI1xuICAgICAgICAqKiBVc2FnZTogPGJyPlxuICAgICAgICBgZGF0YSA9IGNhbnZhc3MudG9EYXRhVVJMKFwiaW1hZ2UvanBlZ1wiKS5zbGljZShcImRhdGE6aW1hZ2UvanBlZztiYXNlNjQsXCIubGVuZ3RoKWA8YnI+XG4gICAgICAgIGBSZXF1ZXN0ZXIuYWRkSW1hZ2UgZGF0YSwgXCJ6b2V0cm9wZVwiLCBAZG9uZSwgQGZhaWxgXG4gICAgICAgICMjI1xuXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJ1xuICAgICAgICAgICAgdHlwZSAgIDogJ1BPU1QnXG4gICAgICAgICAgICBkYXRhICAgOiB7aW1hZ2VfYmFzZTY0IDogZW5jb2RlVVJJKGRhdGEpfVxuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxuICAgIEBkZWxldGVJbWFnZSA6IChpZCwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJytpZFxuICAgICAgICAgICAgdHlwZSAgIDogJ0RFTEVURSdcbiAgICAgICAgICAgIGRvbmUgICA6IGRvbmVcbiAgICAgICAgICAgIGZhaWwgICA6IGZhaWxcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdGVyXG4iLCIjIyNcblNoYXJpbmcgY2xhc3MgZm9yIG5vbi1TREsgbG9hZGVkIHNvY2lhbCBuZXR3b3Jrcy5cbklmIFNESyBpcyBsb2FkZWQsIGFuZCBwcm92aWRlcyBzaGFyZSBtZXRob2RzLCB0aGVuIHVzZSB0aGF0IGNsYXNzIGluc3RlYWQsIGVnLiBgRmFjZWJvb2suc2hhcmVgIGluc3RlYWQgb2YgYFNoYXJlLmZhY2Vib29rYFxuIyMjXG5jbGFzcyBTaGFyZVxuXG4gICAgdXJsIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAtPlxuXG4gICAgICAgIEB1cmwgPSBAQ0QoKS5CQVNFX1VSTFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvcGVuV2luIDogKHVybCwgdywgaCkgPT5cblxuICAgICAgICBsZWZ0ID0gKCBzY3JlZW4uYXZhaWxXaWR0aCAgLSB3ICkgPj4gMVxuICAgICAgICB0b3AgID0gKCBzY3JlZW4uYXZhaWxIZWlnaHQgLSBoICkgPj4gMVxuXG4gICAgICAgIHdpbmRvdy5vcGVuIHVybCwgJycsICd0b3A9Jyt0b3ArJyxsZWZ0PScrbGVmdCsnLHdpZHRoPScrdysnLGhlaWdodD0nK2grJyxsb2NhdGlvbj1ubyxtZW51YmFyPW5vJ1xuXG4gICAgICAgIG51bGxcblxuICAgIHBsdXMgOiAoIHVybCApID0+XG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vc2hhcmU/dXJsPSN7dXJsfVwiLCA2NTAsIDM4NVxuXG4gICAgICAgIG51bGxcblxuICAgIHBpbnRlcmVzdCA6ICh1cmwsIG1lZGlhLCBkZXNjcikgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgbWVkaWEgPSBlbmNvZGVVUklDb21wb25lbnQobWVkaWEpXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGRlc2NyKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9I3t1cmx9Jm1lZGlhPSN7bWVkaWF9JmRlc2NyaXB0aW9uPSN7ZGVzY3J9XCIsIDczNSwgMzEwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHVtYmxyIDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnR1bWJsci5jb20vc2hhcmUvcGhvdG8/c291cmNlPSN7bWVkaWF9JmNhcHRpb249I3tkZXNjcn0mY2xpY2tfdGhydT0je3VybH1cIiwgNDUwLCA0MzBcblxuICAgICAgICBudWxsXG5cbiAgICBmYWNlYm9vayA6ICggdXJsICwgY29weSA9ICcnKSA9PiBcblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgZGVjc3IgPSBlbmNvZGVVUklDb21wb25lbnQoY29weSlcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlLnBocD91PSN7dXJsfSZ0PSN7ZGVjc3J9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHdpdHRlciA6ICggdXJsICwgY29weSA9ICcnKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBpZiBjb3B5IGlzICcnXG4gICAgICAgICAgICBjb3B5ID0gQENEKCkubG9jYWxlLmdldCAnc2VvX3R3aXR0ZXJfY2FyZF9kZXNjcmlwdGlvbidcbiAgICAgICAgICAgIFxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldC8/dGV4dD0je2Rlc2NyfSZ1cmw9I3t1cmx9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVucmVuIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2hhcmUucmVucmVuLmNvbS9zaGFyZS9idXR0b25zaGFyZS5kbz9saW5rPVwiICsgdXJsLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHdlaWJvIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2VydmljZS53ZWliby5jb20vc2hhcmUvc2hhcmUucGhwP3VybD0je3VybH0mbGFuZ3VhZ2U9emhfY25cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlXG4iLCJjbGFzcyBBYnN0cmFjdFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblx0ZWwgICAgICAgICAgIDogbnVsbFxuXHRpZCAgICAgICAgICAgOiBudWxsXG5cdGNoaWxkcmVuICAgICA6IG51bGxcblx0dGVtcGxhdGUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZVZhcnMgOiBudWxsXG5cdFxuXHRpbml0aWFsaXplIDogLT5cblx0XHRcblx0XHRAY2hpbGRyZW4gPSBbXVxuXG5cdFx0aWYgQHRlbXBsYXRlXG5cdFx0XHR0bXBIVE1MID0gXy50ZW1wbGF0ZSBAQ0QoKS50ZW1wbGF0ZXMuZ2V0IEB0ZW1wbGF0ZVxuXHRcdFx0QHNldEVsZW1lbnQgdG1wSFRNTCBAdGVtcGxhdGVWYXJzXG5cblx0XHRAJGVsLmF0dHIgJ2lkJywgQGlkIGlmIEBpZFxuXHRcdEAkZWwuYWRkQ2xhc3MgQGNsYXNzTmFtZSBpZiBAY2xhc3NOYW1lXG5cdFx0XG5cdFx0QGluaXQoKVxuXG5cdFx0QHBhdXNlZCA9IGZhbHNlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0dXBkYXRlIDogPT5cblxuXHRcdG51bGxcblxuXHRyZW5kZXIgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGFkZENoaWxkIDogKGNoaWxkLCBwcmVwZW5kID0gZmFsc2UpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdHRhcmdldCA9IGlmIEBhZGRUb1NlbGVjdG9yIHRoZW4gQCRlbC5maW5kKEBhZGRUb1NlbGVjdG9yKS5lcSgwKSBlbHNlIEAkZWxcblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXG5cdFx0aWYgIXByZXBlbmQgXG5cdFx0XHR0YXJnZXQuYXBwZW5kIGNcblx0XHRlbHNlIFxuXHRcdFx0dGFyZ2V0LnByZXBlbmQgY1xuXG5cdFx0QFxuXG5cdHJlcGxhY2UgOiAoZG9tLCBjaGlsZCkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblx0XHRAJGVsLmNoaWxkcmVuKGRvbSkucmVwbGFjZVdpdGgoYylcblxuXHRcdG51bGxcblxuXHRyZW1vdmUgOiAoY2hpbGQpID0+XG5cblx0XHR1bmxlc3MgY2hpbGQ/XG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSAkKGNoaWxkKVxuXHRcdGNoaWxkLmRpc3Bvc2UoKSBpZiBjIGFuZCBjaGlsZC5kaXNwb3NlXG5cblx0XHRpZiBjICYmIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPSAtMVxuXHRcdFx0QGNoaWxkcmVuLnNwbGljZSggQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxIClcblxuXHRcdGMucmVtb3ZlKClcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6IChldmVudCkgPT5cblxuXHRcdChpZiBjaGlsZC5vblJlc2l6ZSB0aGVuIGNoaWxkLm9uUmVzaXplKCkpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRtb3VzZUVuYWJsZWQgOiAoIGVuYWJsZWQgKSA9PlxuXG5cdFx0QCRlbC5jc3Ncblx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogaWYgZW5hYmxlZCB0aGVuIFwiYXV0b1wiIGVsc2UgXCJub25lXCJcblxuXHRcdG51bGxcblxuXHRDU1NUcmFuc2xhdGUgOiAoeCwgeSwgdmFsdWU9JyUnLCBzY2FsZSkgPT5cblxuXHRcdGlmIE1vZGVybml6ci5jc3N0cmFuc2Zvcm1zM2Rcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlM2QoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSwgMClcIlxuXHRcdGVsc2Vcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0pXCJcblxuXHRcdGlmIHNjYWxlIHRoZW4gc3RyID0gXCIje3N0cn0gc2NhbGUoI3tzY2FsZX0pXCJcblxuXHRcdHN0clxuXG5cdHVuTXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnVuTXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC51bk11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC5tdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLm11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZUFsbENoaWxkcmVuOiA9PlxuXG5cdFx0QHJlbW92ZSBjaGlsZCBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0dHJpZ2dlckNoaWxkcmVuIDogKG1zZywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnRyaWdnZXIgbXNnXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEB0cmlnZ2VyQ2hpbGRyZW4gbXNnLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbkFuZFNlbGYgOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdEBbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0c3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzLCBhbGxvd1NwYWNlcz10cnVlKSAtPlxuXG5cdFx0cmUgPSBpZiBhbGxvd1NwYWNlcyB0aGVuIG5ldyBSZWdFeHAoJ3t7IChbXnt9XSopIH19JywgJ2cnKSBlbHNlIG5ldyBSZWdFeHAoJ3t7KFtee31dKil9fScsICdnJylcblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSByZSwgKGEsIGIpIC0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0IyMjXG5cdFx0b3ZlcnJpZGUgb24gcGVyIHZpZXcgYmFzaXMgLSB1bmJpbmQgZXZlbnQgaGFuZGxlcnMgZXRjXG5cdFx0IyMjXG5cblx0XHRudWxsXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1xuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0Vmlld1BhZ2UgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHRfc2hvd24gICAgIDogZmFsc2Vcblx0X2xpc3RlbmluZyA6IGZhbHNlXG5cblx0c2hvdyA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgIUBfc2hvd25cblx0XHRAX3Nob3duID0gdHJ1ZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLmFkZENoaWxkIEBcblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29uJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAndmlzaWJsZSdcblx0XHRjYj8oKVxuXG5cdFx0aWYgQENEKCkubmF2LmNoYW5nZVZpZXdDb3VudCBpcyAxXG5cdFx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfUFJFTE9BREVSX0hJREUsIEBhbmltYXRlSW5cblx0XHRlbHNlXG5cdFx0XHRAYW5pbWF0ZUluKClcblxuXHRcdG51bGxcblxuXHRoaWRlIDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAX3Nob3duXG5cdFx0QF9zaG93biA9IGZhbHNlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIucmVtb3ZlIEBcblxuXHRcdCMgQGNhbGxDaGlsZHJlbkFuZFNlbGYgJ3NldExpc3RlbmVycycsICdvZmYnXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICdoaWRkZW4nXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRkaXNwb3NlIDogPT5cblxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBzZXR0aW5nIGlzbnQgQF9saXN0ZW5pbmdcblx0XHRAX2xpc3RlbmluZyA9IHNldHRpbmdcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0IyMjXG5cdFx0c3R1YmJlZCBoZXJlLCBvdmVycmlkZSBpbiB1c2VkIHBhZ2UgY2xhc3Nlc1xuXHRcdCMjI1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1BhZ2VcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBBYm91dFBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtYWJvdXQnXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9kZXNjXCJcblxuXHRcdCMjI1xuXG5cdFx0aW5zdGFudGlhdGUgY2xhc3NlcyBoZXJlXG5cblx0XHRAZXhhbXBsZUNsYXNzID0gbmV3IGV4YW1wbGVDbGFzc1xuXG5cdFx0IyMjXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIyNcblxuXHRcdGFkZCBjbGFzc2VzIHRvIGFwcCBzdHJ1Y3R1cmUgaGVyZVxuXG5cdFx0QFxuXHRcdFx0LmFkZENoaWxkKEBleGFtcGxlQ2xhc3MpXG5cblx0XHQjIyNcblxuXHRcdHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJvdXRQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuXG5jbGFzcyBGb290ZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ3NpdGUtZm9vdGVyJ1xuXG4gICAgY29uc3RydWN0b3I6IC0+XG5cbiAgICAgICAgQHRlbXBsYXRlVmFycyA9IHt9XG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRm9vdGVyXG4iLCJBYnN0cmFjdFZpZXcgICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblJvdXRlciAgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vcm91dGVyL1JvdXRlcidcbkNvZGVXb3JkVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXInXG5cbmNsYXNzIEhlYWRlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdHRlbXBsYXRlIDogJ3NpdGUtaGVhZGVyJ1xuXG5cdEZJUlNUX0hBU0hDSEFOR0UgOiB0cnVlXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9XG5cdFx0XHRob21lICAgIDogXG5cdFx0XHRcdGxhYmVsICAgIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2xvZ29fbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcblx0XHRcdGFib3V0IDogXG5cdFx0XHRcdGxhYmVsICAgIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2Fib3V0X2xhYmVsJylcblx0XHRcdFx0dXJsICAgICAgOiBAQ0QoKS5CQVNFX1VSTCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5BQk9VVFxuXHRcdFx0Y29udHJpYnV0ZSA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9jb250cmlidXRlX2xhYmVsJylcblx0XHRcdFx0dXJsICAgICAgOiBAQ0QoKS5CQVNFX1VSTCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFXG5cdFx0XHRjbG9zZV9sYWJlbCA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9jbG9zZV9sYWJlbCcpXG5cdFx0XHRpbmZvX2xhYmVsIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2luZm9fbGFiZWwnKVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0QGJpbmRFdmVudHMoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkbG9nbyAgICAgICAgICAgICAgPSBAJGVsLmZpbmQoJy5sb2dvX19saW5rJylcblx0XHRAJG5hdkxpbmtBYm91dCAgICAgID0gQCRlbC5maW5kKCcuYWJvdXQtYnRuJylcblx0XHRAJG5hdkxpbmtDb250cmlidXRlID0gQCRlbC5maW5kKCcuY29udHJpYnV0ZS1idG4nKVxuXHRcdEAkaW5mb0J0biAgICAgICAgICAgPSBAJGVsLmZpbmQoJy5pbmZvLWJ0bicpXG5cdFx0QCRjbG9zZUJ0biAgICAgICAgICA9IEAkZWwuZmluZCgnLmNsb3NlLWJ0bicpXG5cblx0XHRudWxsXG5cblx0YmluZEV2ZW50cyA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfUFJFTE9BREVSX0hJREUsIEBhbmltYXRlVGV4dEluXG5cdFx0QENEKCkucm91dGVyLm9uIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBvbkhhc2hDaGFuZ2VcblxuXHRcdEAkZWwub24gJ21vdXNlZW50ZXInLCAnW2RhdGEtY29kZXdvcmRdJywgQG9uV29yZEVudGVyXG5cdFx0QCRlbC5vbiAnbW91c2VsZWF2ZScsICdbZGF0YS1jb2Rld29yZF0nLCBAb25Xb3JkTGVhdmVcblxuXHRcdG51bGxcblxuXHRvbkhhc2hDaGFuZ2UgOiAod2hlcmUpID0+XG5cblx0XHRpZiBARklSU1RfSEFTSENIQU5HRVxuXHRcdFx0QEZJUlNUX0hBU0hDSEFOR0UgPSBmYWxzZVxuXHRcdFx0cmV0dXJuXG5cdFx0XG5cdFx0QG9uQXJlYUNoYW5nZSB3aGVyZVxuXG5cdFx0bnVsbFxuXG5cdG9uQXJlYUNoYW5nZSA6IChzZWN0aW9uKSA9PlxuXG5cdFx0Y29sb3VyID0gQGdldFNlY3Rpb25Db2xvdXIgc2VjdGlvblxuXG5cdFx0QCRlbC5hdHRyICdkYXRhLXNlY3Rpb24nLCBzZWN0aW9uXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBAJGxvZ28sIGNvbG91clxuXG5cdFx0IyB0aGlzIGp1c3QgZm9yIHRlc3RpbmcsIHRpZHkgbGF0ZXJcblx0XHRpZiBzZWN0aW9uIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQWJvdXQsIEAkbmF2TGlua0NvbnRyaWJ1dGVdLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRjbG9zZUJ0biwgQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0ZWxzZSBpZiBzZWN0aW9uIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRjbG9zZUJ0biwgQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0ZWxzZVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG5dLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRuYXZMaW5rQWJvdXQsIEAkbmF2TGlua0NvbnRyaWJ1dGUsIEAkaW5mb0J0bl0sIGNvbG91clxuXG5cdFx0bnVsbFxuXG5cdGdldFNlY3Rpb25Db2xvdXIgOiAoc2VjdGlvbikgPT5cblxuXHRcdHNlY3Rpb24gPSBzZWN0aW9uIG9yIEBDRCgpLm5hdi5jdXJyZW50LmFyZWEgb3IgJ2hvbWUnXG5cblx0XHRjb2xvdXIgPSBzd2l0Y2ggc2VjdGlvblxuXHRcdFx0d2hlbiAnaG9tZScgdGhlbiAncmVkJ1xuXHRcdFx0d2hlbiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQgdGhlbiAnd2hpdGUnXG5cdFx0XHR3aGVuIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFIHRoZW4gJ3doaXRlJ1xuXHRcdFx0ZWxzZSAnd2hpdGUnXG5cblx0XHRjb2xvdXJcblxuXHRhbmltYXRlVGV4dEluIDogPT5cblxuXHRcdEBvbkFyZWFDaGFuZ2UgQENEKCkubmF2LmN1cnJlbnQuYXJlYVxuXG5cdFx0bnVsbFxuXG5cdG9uV29yZEVudGVyIDogKGUpID0+XG5cblx0XHQkZWwgPSAkKGUuY3VycmVudFRhcmdldClcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIoKVxuXG5cdFx0bnVsbFxuXG5cdG9uV29yZExlYXZlIDogKGUpID0+XG5cblx0XHQkZWwgPSAkKGUuY3VycmVudFRhcmdldClcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnVuc2NyYW1ibGUgJGVsLCBAZ2V0U2VjdGlvbkNvbG91cigpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyXG4iLCJBYnN0cmFjdFZpZXcgICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkNvZGVXb3JkVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXInXG5cbmNsYXNzIFByZWxvYWRlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXHRcblx0Y2IgICAgICAgICAgICAgIDogbnVsbFxuXHRcblx0VFJBTlNJVElPTl9USU1FIDogMC41XG5cblx0TUlOX1dST05HX0NIQVJTIDogMFxuXHRNQVhfV1JPTkdfQ0hBUlMgOiA0XG5cblx0TUlOX0NIQVJfSU5fREVMQVkgOiAzMFxuXHRNQVhfQ0hBUl9JTl9ERUxBWSA6IDEwMFxuXG5cdE1JTl9DSEFSX09VVF9ERUxBWSA6IDMwXG5cdE1BWF9DSEFSX09VVF9ERUxBWSA6IDEwMFxuXG5cdENIQVJTIDogJ2FiY2RlZmhpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5IT8qKClAwqMkJV4mXy0rPVtde306O1xcJ1wiXFxcXHw8PiwuL35gJy5zcGxpdCgnJylcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAc2V0RWxlbWVudCAkKCcjcHJlbG9hZGVyJylcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGNvZGVXb3JkID0gQCRlbC5maW5kKCdbZGF0YS1jb2Rld29yZF0nKVxuXHRcdEAkYmcxID0gQCRlbC5maW5kKCdbZGF0YS1iZz1cIjFcIl0nKVxuXHRcdEAkYmcyID0gQCRlbC5maW5kKCdbZGF0YS1iZz1cIjJcIl0nKVxuXG5cdFx0bnVsbFxuXG5cdHBsYXlJbnRyb0FuaW1hdGlvbiA6IChAY2IpID0+XG5cblx0XHRjb25zb2xlLmxvZyBcInNob3cgOiAoQGNiKSA9PlwiXG5cblx0XHQjIERFQlVHIVxuXHRcdCMgcmV0dXJuIEBjYigpXG5cblx0XHRAJGVsXG5cdFx0XHQuZmluZCgnW2RhdGEtZG90c10nKVxuXHRcdFx0XHQucmVtb3ZlKClcblx0XHRcdFx0LmVuZCgpXG5cdFx0XHQuYWRkQ2xhc3MoJ3Nob3ctcHJlbG9hZGVyJylcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIEAkY29kZVdvcmQsICd3aGl0ZScsIGZhbHNlLCBAaGlkZVxuXG5cdFx0bnVsbFxuXG5cdG9uU2hvd0NvbXBsZXRlIDogPT5cblxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgQG9uSGlkZUNvbXBsZXRlXG5cblx0XHRudWxsXG5cblx0b25IaWRlQ29tcGxldGUgOiA9PlxuXG5cdFx0QGNiPygpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZU91dCA6IChjYikgPT5cblxuXHRcdCMgQGFuaW1hdGVDaGFyc091dCgpXG5cblx0XHQjIHRoYXQnbGwgZG9cblx0XHQjIHNldFRpbWVvdXQgY2IsIDIyMDBcblxuXHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdGFuYWdyYW0gPSBfLnNodWZmbGUoJ2NvZGVkb29kbC5lcycuc3BsaXQoJycpKS5qb2luKCcnKVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gYW5hZ3JhbSwgQCRjb2RlV29yZCwgJ3doaXRlJywgZmFsc2UsID0+IEBhbmltYXRlQmdPdXQgY2Jcblx0XHQsIDIwMDBcblxuXHRcdG51bGxcblxuXHRhbmltYXRlQmdPdXQgOiAoY2IpID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRiZzEsIDAuNSwgeyBkZWxheSA6IDAuMiwgd2lkdGggOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcxLCAwLjYsIHsgZGVsYXkgOiAwLjcsIGhlaWdodCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0IH1cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMiwgMC40LCB7IGRlbGF5IDogMC40LCB3aWR0aCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0IH1cblx0XHRUd2VlbkxpdGUudG8gQCRiZzIsIDAuNSwgeyBkZWxheSA6IDAuOCwgaGVpZ2h0IDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQsIG9uQ29tcGxldGUgOiBjYiB9XG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBAJGNvZGVXb3JkLCAnJywgZmFsc2Vcblx0XHQsIDQwMFxuXG5cdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0QCRlbC5yZW1vdmVDbGFzcygnc2hvdy1wcmVsb2FkZXInKVxuXHRcdCwgMTIwMFxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZWxvYWRlclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuSG9tZVZpZXcgICAgICAgICAgID0gcmVxdWlyZSAnLi4vaG9tZS9Ib21lVmlldydcbkFib3V0UGFnZVZpZXcgICAgICA9IHJlcXVpcmUgJy4uL2Fib3V0UGFnZS9BYm91dFBhZ2VWaWV3J1xuQ29udHJpYnV0ZVBhZ2VWaWV3ID0gcmVxdWlyZSAnLi4vY29udHJpYnV0ZVBhZ2UvQ29udHJpYnV0ZVBhZ2VWaWV3J1xuRG9vZGxlUGFnZVZpZXcgICAgID0gcmVxdWlyZSAnLi4vZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldydcbk5hdiAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3JvdXRlci9OYXYnXG5cbmNsYXNzIFdyYXBwZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHRWSUVXX1RZUEVfUEFHRSAgOiAncGFnZSdcblxuXHR0ZW1wbGF0ZSA6ICd3cmFwcGVyJ1xuXG5cdHZpZXdzICAgICAgICAgIDogbnVsbFxuXHRwcmV2aW91c1ZpZXcgICA6IG51bGxcblx0Y3VycmVudFZpZXcgICAgOiBudWxsXG5cdGJhY2tncm91bmRWaWV3IDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB2aWV3cyA9XG5cdFx0XHRob21lICAgICAgIDogY2xhc3NSZWYgOiBIb21lVmlldywgICAgICAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkhPTUUsICAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRhYm91dCAgICAgIDogY2xhc3NSZWYgOiBBYm91dFBhZ2VWaWV3LCAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkFCT1VULCAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRjb250cmlidXRlIDogY2xhc3NSZWYgOiBDb250cmlidXRlUGFnZVZpZXcsIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEUsIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRkb29kbGUgICAgIDogY2xhc3NSZWYgOiBEb29kbGVQYWdlVmlldywgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMsICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cblx0XHRAY3JlYXRlQ2xhc3NlcygpXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIGRlY2lkZSBpZiB5b3Ugd2FudCB0byBhZGQgYWxsIGNvcmUgRE9NIHVwIGZyb250LCBvciBhZGQgb25seSB3aGVuIHJlcXVpcmVkLCBzZWUgY29tbWVudHMgaW4gQWJzdHJhY3RWaWV3UGFnZS5jb2ZmZWVcblx0XHQjIEBhZGRDbGFzc2VzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0Y3JlYXRlQ2xhc3NlcyA6ID0+XG5cblx0XHQoQHZpZXdzW25hbWVdLnZpZXcgPSBuZXcgQHZpZXdzW25hbWVdLmNsYXNzUmVmKSBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3NcblxuXHRcdG51bGxcblxuXHRhZGRDbGFzc2VzIDogPT5cblxuXHRcdCBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHQgXHRpZiBkYXRhLnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIHRoZW4gQGFkZENoaWxkIGRhdGEudmlld1xuXG5cdFx0bnVsbFxuXG5cdGdldFZpZXdCeVJvdXRlIDogKHJvdXRlKSA9PlxuXG5cdFx0Zm9yIG5hbWUsIGRhdGEgb2YgQHZpZXdzXG5cdFx0XHRyZXR1cm4gQHZpZXdzW25hbWVdIGlmIHJvdXRlIGlzIEB2aWV3c1tuYW1lXS5yb3V0ZVxuXG5cdFx0bnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdG51bGxcblxuXHRzdGFydCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9mZiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdEBiaW5kRXZlbnRzKClcblx0XHRAdXBkYXRlRGltcygpXG5cblx0XHRudWxsXG5cblx0YmluZEV2ZW50cyA6ID0+XG5cblx0XHRAQ0QoKS5uYXYub24gTmF2LkVWRU5UX0NIQU5HRV9WSUVXLCBAY2hhbmdlVmlld1xuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBAY2hhbmdlU3ViVmlld1xuXG5cdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1VQREFURV9ESU1FTlNJT05TLCBAdXBkYXRlRGltc1xuXG5cdFx0bnVsbFxuXG5cdHVwZGF0ZURpbXMgOiA9PlxuXG5cdFx0QCRlbC5jc3MgJ21pbi1oZWlnaHQnLCBAQ0QoKS5hcHBWaWV3LmRpbXMuaFxuXG5cdFx0bnVsbFxuXG5cdGNoYW5nZVZpZXcgOiAocHJldmlvdXMsIGN1cnJlbnQpID0+XG5cblx0XHRAcHJldmlvdXNWaWV3ID0gQGdldFZpZXdCeVJvdXRlIHByZXZpb3VzLmFyZWFcblx0XHRAY3VycmVudFZpZXcgID0gQGdldFZpZXdCeVJvdXRlIGN1cnJlbnQuYXJlYVxuXG5cdFx0aWYgIUBwcmV2aW91c1ZpZXdcblx0XHRcdEB0cmFuc2l0aW9uVmlld3MgZmFsc2UsIEBjdXJyZW50Vmlldy52aWV3XG5cdFx0ZWxzZVxuXHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LnZpZXcsIEBjdXJyZW50Vmlldy52aWV3XG5cblx0XHRudWxsXG5cblx0Y2hhbmdlU3ViVmlldyA6IChjdXJyZW50KSA9PlxuXG5cdFx0QGN1cnJlbnRWaWV3LnZpZXcudHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBjdXJyZW50LnN1YlxuXG5cdFx0bnVsbFxuXG5cdHRyYW5zaXRpb25WaWV3cyA6IChmcm9tLCB0bykgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgZnJvbSBpc250IHRvXG5cblx0XHRpZiBmcm9tIGFuZCB0b1xuXHRcdFx0ZnJvbS5oaWRlIHRvLnNob3dcblx0XHRlbHNlIGlmIGZyb21cblx0XHRcdGZyb20uaGlkZSgpXG5cdFx0ZWxzZSBpZiB0b1xuXHRcdFx0dG8uc2hvdygpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gV3JhcHBlclxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIENvbnRyaWJ1dGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWNvbnRyaWJ1dGUnXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2Rlc2NcIlxuXG5cdFx0IyMjXG5cblx0XHRpbnN0YW50aWF0ZSBjbGFzc2VzIGhlcmVcblxuXHRcdEBleGFtcGxlQ2xhc3MgPSBuZXcgZXhhbXBsZUNsYXNzXG5cblx0XHQjIyNcblxuXHRcdHN1cGVyKClcblxuXHRcdCMjI1xuXG5cdFx0YWRkIGNsYXNzZXMgdG8gYXBwIHN0cnVjdHVyZSBoZXJlXG5cblx0XHRAXG5cdFx0XHQuYWRkQ2hpbGQoQGV4YW1wbGVDbGFzcylcblxuXHRcdCMjI1xuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cmlidXRlUGFnZVZpZXdcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBEb29kbGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWRvb2RsZSdcblx0bW9kZWwgICAgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJkb29kbGVfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBleGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdHNob3cgOiA9PlxuXG5cdFx0QG1vZGVsID0gQGdldERvb2RsZSgpXG5cblx0XHRzdXBlclxuXG5cdFx0bnVsbFxuXG5cdGdldERvb2RsZSA6ID0+XG5cblx0XHRkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZ2V0RG9vZGxlQnlTbHVnIEBDRCgpLm5hdi5jdXJyZW50LnN1YisnLycrQENEKCkubmF2LmN1cnJlbnQudGVyXG5cblx0XHRkb29kbGVcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBIb21lR3JpZEl0ZW0gZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHR0ZW1wbGF0ZSA6ICdob21lLWdyaWQtaXRlbSdcblxuXHRjb25zdHJ1Y3RvciA6IChAbW9kZWwpIC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXy5leHRlbmQge30sIEBtb2RlbC50b0pTT04oKVxuXG5cdFx0c3VwZXJcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGF1dGhvck5hbWUgPSBAJGVsLmZpbmQoJ1tkYXRhLWNvZGV3b3JkPVwiYXV0aG9yX25hbWVcIl0nKVxuXHRcdEAkZG9vZGxlTmFtZSA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmQ9XCJuYW1lXCJdJylcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEAkZWxbc2V0dGluZ10gJ21vdXNlb3ZlcicsIEBvbk1vdXNlT3ZlclxuXG5cdHNob3cgOiA9PlxuXG5cdFx0QCRlbC5hZGRDbGFzcyAnc2hvdy1pdGVtJ1xuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnYXV0aG9yLm5hbWUnKSwgQCRhdXRob3JOYW1lLCAnYmx1ZSdcblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCduYW1lJyksIEAkZG9vZGxlTmFtZSwgJ2JsdWUnXG5cblx0XHRAc2V0TGlzdGVuZXJzICdvbidcblxuXHRcdG51bGxcblxuXHRvbk1vdXNlT3ZlciA6ID0+XG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5zY3JhbWJsZSBAJGF1dGhvck5hbWUsICdibHVlJywgZmFsc2UsID0+IENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ2F1dGhvci5uYW1lJyksIEAkYXV0aG9yTmFtZSwgJ2JsdWUnXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuc2NyYW1ibGUgQCRkb29kbGVOYW1lLCAnYmx1ZScsIGZhbHNlLCA9PiBDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCduYW1lJyksIEAkZG9vZGxlTmFtZSwgJ2JsdWUnXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZUdyaWRJdGVtXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcbkhvbWVHcmlkSXRlbSAgICAgPSByZXF1aXJlICcuL0hvbWVHcmlkSXRlbSdcblxuY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0IyBtYW5hZ2Ugc3RhdGUgZm9yIGhvbWVWaWV3IG9uIHBlci1zZXNzaW9uIGJhc2lzLCBhbGxvdyBudW1iZXIgb2Zcblx0IyBncmlkIGl0ZW1zLCBhbmQgc2Nyb2xsIHBvc2l0aW9uIG9mIGhvbWUgZ3JpZCB0byBiZSBwZXJzaXN0ZWRcblx0QHZpc2l0ZWRUaGlzU2Vzc2lvbiA6IGZhbHNlXG5cdEBncmlkSXRlbXMgOiBbXVxuXHRAZGltcyA6XG5cdFx0aXRlbUhlaWdodCAgICAgIDogMFxuXHRcdGNvbnRhaW5lckhlaWdodCA6IDBcblx0QHNjcm9sbERpc3RhbmNlIDogMFxuXG5cdHRlbXBsYXRlICAgICAgOiAncGFnZS1ob21lJ1xuXHRhZGRUb1NlbGVjdG9yIDogJ1tkYXRhLWhvbWUtZ3JpZF0nXG5cblx0YWxsRG9vZGxlcyA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImhvbWVfZGVzY1wiXG5cblx0XHRAYWxsRG9vZGxlcyA9IEBDRCgpLmFwcERhdGEuZG9vZGxlc1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkZ3JpZCA9IEAkZWwuZmluZCgnW2RhdGEtaG9tZS1ncmlkXScpXG5cblx0XHRAc2V0dXBEaW1zKClcblxuXHRcdG51bGxcblxuXHRzZXR1cERpbXMgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSBAQ0QoKS5hcHBWaWV3LkVWRU5UX1VQREFURV9ESU1FTlNJT05TLCBAb25SZXNpemVcblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddIEBDRCgpLmFwcFZpZXcuRVZFTlRfT05fU0NST0xMLCBAb25TY3JvbGxcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6ID0+XG5cblx0XHRIb21lVmlldy5kaW1zLmNvbnRhaW5lckhlaWdodCA9IEBDRCgpLmFwcFZpZXcuZGltcy5oXG5cblx0XHRAc2V0dXBEaW1zKClcblxuXHRcdG51bGxcblxuXHRvblNjcm9sbCA6ID0+XG5cblx0XHRIb21lVmlldy5zY3JvbGxEaXN0YW5jZSA9IEBDRCgpLmFwcFZpZXcubGFzdFNjcm9sbFlcblxuXHRcdG51bGxcblxuXHRzaG93IDogPT5cblxuXHRcdHN1cGVyXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdGlmICFIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb25cblx0XHRcdEBhZGREb29kbGVzIDE1LCB0cnVlXG5cdFx0XHRIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb24gPSB0cnVlXG5cdFx0ZWxzZVxuXHRcdFx0QENEKCkuYXBwVmlldy4kd2luZG93LnNjcm9sbFRvcCBIb21lVmlldy5zY3JvbGxEaXN0YW5jZVxuXHRcdFx0Y29uc29sZS5sb2cgJ3Nob3cgd2hhdCBiZWVuIGRvbmUgc2hvd24gYWxyZWFkeSdcblxuXHRcdG51bGxcblxuXHRhZGREb29kbGVzIDogKGNvdW50LCBmdWxsUGFnZVRyYW5zaXRpb249ZmFsc2UpID0+XG5cblx0XHRjb25zb2xlLmxvZyBcImFkZGluZyBkb29kbGVzLi4uIHgje2NvdW50fVwiXG5cblx0XHRuZXdJdGVtcyA9IFtdXG5cblx0XHRmb3IgaWR4IGluIFtIb21lVmlldy5ncmlkSXRlbXMubGVuZ3RoLi4uSG9tZVZpZXcuZ3JpZEl0ZW1zLmxlbmd0aCtjb3VudF1cblxuXHRcdFx0ZG9vZGxlID0gQGFsbERvb2RsZXMuYXQgaWR4XG5cdFx0XHRicmVhayBpZiAhZG9vZGxlXG5cblx0XHRcdG5ld0l0ZW1zLnB1c2ggbmV3IEhvbWVHcmlkSXRlbSBkb29kbGVcblxuXHRcdEhvbWVWaWV3LmdyaWRJdGVtcyA9IEhvbWVWaWV3LmdyaWRJdGVtcy5jb25jYXQgbmV3SXRlbXNcblxuXHRcdGZvciBpdGVtLCBpZHggaW4gbmV3SXRlbXNcblxuXHRcdFx0QGFkZENoaWxkIGl0ZW1cblx0XHRcdEBhbmltYXRlSXRlbUluIGl0ZW0sIGlkeCwgZnVsbFBhZ2VUcmFuc2l0aW9uXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUl0ZW1JbiA6IChpdGVtLCBpbmRleCwgZnVsbFBhZ2U9ZmFsc2UpID0+XG5cblx0XHRkdXJhdGlvbiA9IDAuNVxuXHRcdGZyb21QYXJhbXMgPSB5IDogKGlmIGZ1bGxQYWdlIHRoZW4gd2luZG93LmlubmVySGVpZ2h0IGVsc2UgNTApLCBvcGFjaXR5IDogMFxuXHRcdHRvUGFyYW1zID0gZGVsYXkgOiAoZHVyYXRpb24gKiAwLjIpICogaW5kZXgsIHkgOiAwLCBvcGFjaXR5IDogMSwgZWFzZSA6IEV4cG8uZWFzZU91dCwgb25Db21wbGV0ZSA6IGl0ZW0uc2hvd1xuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8gaXRlbS4kZWwsIGR1cmF0aW9uLCBmcm9tUGFyYW1zLCB0b1BhcmFtc1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWVWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0TW9kYWwgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHQkd2luZG93IDogbnVsbFxuXG5cdCMjIyBvdmVycmlkZSBpbiBpbmRpdmlkdWFsIGNsYXNzZXMgIyMjXG5cdG5hbWUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZSA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAJHdpbmRvdyA9ICQod2luZG93KVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0QENEKCkuYXBwVmlldy5hZGRDaGlsZCBAXG5cdFx0QHNldExpc3RlbmVycyAnb24nXG5cdFx0QGFuaW1hdGVJbigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGhpZGUgOiA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgPT4gQENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXG5cdFx0bnVsbFxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0QHNldExpc3RlbmVycyAnb2ZmJ1xuXHRcdEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLm1vZGFsc1tAbmFtZV0udmlldyA9IG51bGxcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEAkd2luZG93W3NldHRpbmddICdrZXl1cCcsIEBvbktleVVwXG5cdFx0QCQoJ1tkYXRhLWNsb3NlXScpW3NldHRpbmddICdjbGljaycsIEBjbG9zZUNsaWNrXG5cblx0XHRudWxsXG5cblx0b25LZXlVcCA6IChlKSA9PlxuXG5cdFx0aWYgZS5rZXlDb2RlIGlzIDI3IHRoZW4gQGhpZGUoKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRlbCwgMC4zLCB7ICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLCAnb3BhY2l0eSc6IDEsIGVhc2UgOiBRdWFkLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAndHJhbnNmb3JtJzogJ3NjYWxlKDEpJywgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IEJhY2suZWFzZU91dCB9XG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZU91dCA6IChjYWxsYmFjaykgPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAnb3BhY2l0eSc6IDAsIGVhc2UgOiBRdWFkLmVhc2VPdXQsIG9uQ29tcGxldGU6IGNhbGxiYWNrIH1cblx0XHRUd2VlbkxpdGUudG8gQCRlbC5maW5kKCcuaW5uZXInKSwgMC4zLCB7ICd0cmFuc2Zvcm0nOiAnc2NhbGUoMC44KScsICdvcGFjaXR5JzogMCwgZWFzZSA6IEJhY2suZWFzZUluIH1cblxuXHRcdG51bGxcblxuXHRjbG9zZUNsaWNrOiAoIGUgKSA9PlxuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRAaGlkZSgpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RNb2RhbFxuIiwiQWJzdHJhY3RNb2RhbCA9IHJlcXVpcmUgJy4vQWJzdHJhY3RNb2RhbCdcblxuY2xhc3MgT3JpZW50YXRpb25Nb2RhbCBleHRlbmRzIEFic3RyYWN0TW9kYWxcblxuXHRuYW1lICAgICA6ICdvcmllbnRhdGlvbk1vZGFsJ1xuXHR0ZW1wbGF0ZSA6ICdvcmllbnRhdGlvbi1tb2RhbCdcblxuXHRjYiAgICAgICA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IChAY2IpIC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0ge0BuYW1lfVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRoaWRlIDogKHN0aWxsTGFuZHNjYXBlPXRydWUpID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PlxuXHRcdFx0QENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXHRcdFx0aWYgIXN0aWxsTGFuZHNjYXBlIHRoZW4gQGNiPygpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRzdXBlclxuXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSAndXBkYXRlRGltcycsIEBvblVwZGF0ZURpbXNcblx0XHRAJGVsW3NldHRpbmddICd0b3VjaGVuZCBjbGljaycsIEBoaWRlXG5cblx0XHRudWxsXG5cblx0b25VcGRhdGVEaW1zIDogKGRpbXMpID0+XG5cblx0XHRpZiBkaW1zLm8gaXMgJ3BvcnRyYWl0JyB0aGVuIEBoaWRlIGZhbHNlXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gT3JpZW50YXRpb25Nb2RhbFxuIiwiQWJzdHJhY3RWaWV3ICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlldydcbk9yaWVudGF0aW9uTW9kYWwgPSByZXF1aXJlICcuL09yaWVudGF0aW9uTW9kYWwnXG5cbmNsYXNzIE1vZGFsTWFuYWdlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCMgd2hlbiBuZXcgbW9kYWwgY2xhc3NlcyBhcmUgY3JlYXRlZCwgYWRkIGhlcmUsIHdpdGggcmVmZXJlbmNlIHRvIGNsYXNzIG5hbWVcblx0bW9kYWxzIDpcblx0XHRvcmllbnRhdGlvbk1vZGFsIDogY2xhc3NSZWYgOiBPcmllbnRhdGlvbk1vZGFsLCB2aWV3IDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0aXNPcGVuIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gcmV0dXJuIHRydWUgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0ZmFsc2VcblxuXHRoaWRlT3Blbk1vZGFsIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gb3Blbk1vZGFsID0gQG1vZGFsc1tuYW1lXS52aWV3ICkgZm9yIG5hbWUsIG1vZGFsIG9mIEBtb2RhbHNcblxuXHRcdG9wZW5Nb2RhbD8uaGlkZSgpXG5cblx0XHRudWxsXG5cblx0c2hvd01vZGFsIDogKG5hbWUsIGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gaWYgQG1vZGFsc1tuYW1lXS52aWV3XG5cblx0XHRAbW9kYWxzW25hbWVdLnZpZXcgPSBuZXcgQG1vZGFsc1tuYW1lXS5jbGFzc1JlZiBjYlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGFsTWFuYWdlclxuIl19
