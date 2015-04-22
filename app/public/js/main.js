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
    } else if (section === this.CD().nav.sections.ABOUT) {
      CodeWordTransitioner["in"]([this.$navLinkAbout, this.$closeBtn], colour);
      CodeWordTransitioner.out([this.$navLinkContribute, this.$infoBtn], colour);
    } else if (section === this.CD().nav.sections.CONTRIBUTE) {
      CodeWordTransitioner["in"]([this.$navLinkContribute, this.$closeBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$infoBtn], colour);
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

  PageTransitioner.prototype.pageLabels = null;

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
      prop: 'scaleY(0)',
      start: {
        visibility: 'visible',
        transformOrigin: '50% 100%',
        transform: 'scaleY(0)'
      },
      end: {
        visibility: 'visible',
        transformOrigin: '50% 0%',
        transform: 'none'
      }
    },
    topToBottom: {
      prop: 'scaleY(0)',
      start: {
        visibility: 'visible',
        transformOrigin: '50% 0%',
        transform: 'scaleY(0)'
      },
      end: {
        visibility: 'visible',
        transformOrigin: '50% 100%',
        transform: 'none'
      }
    },
    leftToRight: {
      prop: 'scaleX(0)',
      start: {
        visibility: 'visible',
        transformOrigin: '0% 50%',
        transform: 'scaleX(0)'
      },
      end: {
        visibility: 'visible',
        transformOrigin: '100% 50%',
        transform: 'none'
      }
    },
    rightToLeft: {
      prop: 'scaleX(0)',
      start: {
        visibility: 'visible',
        transformOrigin: '100% 50%',
        transform: 'scaleX(0)'
      },
      end: {
        visibility: 'visible',
        transformOrigin: '0% 50%',
        transform: 'none'
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
    this.$label = this.$el.find('[data-label]');
    return null;
  };

  PageTransitioner.prototype.prepare = function(fromArea, toArea) {
    this.resetPanes();
    this.applyPalette(this.getPalette(toArea));
    this.activeConfig = this.getConfig(fromArea, toArea);
    this.applyConfig(this.activeConfig.start);
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
    var label, section, view;
    if (direction == null) {
      direction = 'to';
    }
    section = this.CD().nav.getSection(area, true);
    if (section === 'DOODLES') {
      view = direction === 'from' ? this.CD().nav.previous : this.CD().nav.current;
      label = this.getDoodleLabel(view.sub, view.ter);
    } else {
      label = this.templateVars.pageLabels[section];
    }
    return label;
  };

  PageTransitioner.prototype.getDoodleLabel = function(sub, ter) {
    var doodle, label;
    doodle = this.CD().appData.doodles.findWhere({
      slug: "" + sub + "/" + ter
    });
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
          ease: Expo.easeOut,
          force3D: true
        };
        params.delay = i * 0.05;
        params.transform = 'none';
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
          ease: Expo.easeOut,
          force3D: true,
          clearProps: 'all'
        };
        params.delay = 0.1 - (0.05 * i);
        params.transform = _this.activeConfig.prop;
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

  DoodlePageView.prototype.show = function() {
    this.model = this.getDoodle();
    this.$frame.attr('src', "http://source.codedoodl.es/sample_doodles/shape-stream/index.html");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50L2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9lbnQvcmV2ZXJzZWQuanNvbiIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHAuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcFZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL0Fic3RyYWN0Q29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvY29udHJpYnV0b3JzL0NvbnRyaWJ1dG9yc0NvbGxlY3Rpb24uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL2NvcmUvVGVtcGxhdGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29uZmlnL0NvbG9ycy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BUEkuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvQWJzdHJhY3REYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0xvY2FsZS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9UZW1wbGF0ZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9BYnN0cmFjdE1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29udHJpYnV0b3IvQ29udHJpYnV0b3JNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvQVBJUm91dGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvTG9jYWxlc01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvZG9vZGxlL0Rvb2RsZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvTmF2LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9yb3V0ZXIvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9BbmFseXRpY3MuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0F1dGhNYW5hZ2VyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvRmFjZWJvb2suY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0dvb2dsZVBsdXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL01lZGlhUXVlcmllcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvTnVtYmVyVXRpbHMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1JlcXVlc3Rlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvU2hhcmUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvQWJzdHJhY3RWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlld1BhZ2UuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9Gb290ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9IZWFkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9QYWdlVHJhbnNpdGlvbmVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvUHJlbG9hZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvV3JhcHBlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVHcmlkSXRlbS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QSxJQUFBLENBQUssQ0FBQyxJQUFqQjtBQUEyQixlQUFPLElBQVAsQ0FBM0I7T0FBRjtBQUFBLEtBQUE7V0FFQSxNQUpRO0VBQUEsQ0FiVCxDQUFBOztBQUFBLHlCQW1CQSxhQUFBLEdBQWdCLFNBQUEsR0FBQTtBQUVmLFFBQUEsNEJBQUE7QUFBQTtBQUFBLFNBQUEsWUFBQTt5QkFBQTtBQUFFLE1BQUEsSUFBRyxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQWpCO0FBQTJCLFFBQUEsU0FBQSxHQUFZLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBMUIsQ0FBM0I7T0FBRjtBQUFBLEtBQUE7O01BRUEsU0FBUyxDQUFFLElBQVgsQ0FBQTtLQUZBO1dBSUEsS0FOZTtFQUFBLENBbkJoQixDQUFBOztBQUFBLHlCQTJCQSxTQUFBLEdBQVksU0FBQyxJQUFELEVBQU8sRUFBUCxHQUFBOztNQUFPLEtBQUc7S0FFckI7QUFBQSxJQUFBLElBQVUsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUF4QjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQWQsR0FBeUIsSUFBQSxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLFFBQWQsQ0FBdUIsRUFBdkIsQ0FGekIsQ0FBQTtXQUlBLEtBTlc7RUFBQSxDQTNCWixDQUFBOztzQkFBQTs7R0FIMEIsYUFIM0IsQ0FBQTs7QUFBQSxNQXlDTSxDQUFDLE9BQVAsR0FBaUIsWUF6Q2pCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwID0gcmVxdWlyZSAnLi9BcHAnXG5cbiMgUFJPRFVDVElPTiBFTlZJUk9OTUVOVCAtIG1heSB3YW50IHRvIHVzZSBzZXJ2ZXItc2V0IHZhcmlhYmxlcyBoZXJlXG4jIElTX0xJVkUgPSBkbyAtPiByZXR1cm4gaWYgd2luZG93LmxvY2F0aW9uLmhvc3QuaW5kZXhPZignbG9jYWxob3N0JykgPiAtMSBvciB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGlzICc/ZCcgdGhlbiBmYWxzZSBlbHNlIHRydWVcblxuIyMjXG5cbldJUCAtIHRoaXMgd2lsbCBpZGVhbGx5IGNoYW5nZSB0byBvbGQgZm9ybWF0IChhYm92ZSkgd2hlbiBjYW4gZmlndXJlIGl0IG91dFxuXG4jIyNcblxuSVNfTElWRSA9IGZhbHNlXG5cbiMgT05MWSBFWFBPU0UgQVBQIEdMT0JBTExZIElGIExPQ0FMIE9SIERFVidJTkdcbnZpZXcgPSBpZiBJU19MSVZFIHRoZW4ge30gZWxzZSAod2luZG93IG9yIGRvY3VtZW50KVxuXG4jIERFQ0xBUkUgTUFJTiBBUFBMSUNBVElPTlxudmlldy5DRCA9IG5ldyBBcHAgSVNfTElWRVxudmlldy5DRC5pbml0KClcbiIsIi8qISBodHRwOi8vbXRocy5iZS9wdW55Y29kZSB2MS4yLjQgYnkgQG1hdGhpYXMgKi9cbjsoZnVuY3Rpb24ocm9vdCkge1xuXG5cdC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgKi9cblx0dmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cztcblx0dmFyIGZyZWVNb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJlxuXHRcdG1vZHVsZS5leHBvcnRzID09IGZyZWVFeHBvcnRzICYmIG1vZHVsZTtcblx0dmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcblx0aWYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsKSB7XG5cdFx0cm9vdCA9IGZyZWVHbG9iYWw7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGBwdW55Y29kZWAgb2JqZWN0LlxuXHQgKiBAbmFtZSBwdW55Y29kZVxuXHQgKiBAdHlwZSBPYmplY3Rcblx0ICovXG5cdHZhciBwdW55Y29kZSxcblxuXHQvKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cdG1heEludCA9IDIxNDc0ODM2NDcsIC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuXHQvKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG5cdGJhc2UgPSAzNixcblx0dE1pbiA9IDEsXG5cdHRNYXggPSAyNixcblx0c2tldyA9IDM4LFxuXHRkYW1wID0gNzAwLFxuXHRpbml0aWFsQmlhcyA9IDcyLFxuXHRpbml0aWFsTiA9IDEyOCwgLy8gMHg4MFxuXHRkZWxpbWl0ZXIgPSAnLScsIC8vICdcXHgyRCdcblxuXHQvKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xuXHRyZWdleFB1bnljb2RlID0gL154bi0tLyxcblx0cmVnZXhOb25BU0NJSSA9IC9bXiAtfl0vLCAvLyB1bnByaW50YWJsZSBBU0NJSSBjaGFycyArIG5vbi1BU0NJSSBjaGFyc1xuXHRyZWdleFNlcGFyYXRvcnMgPSAvXFx4MkV8XFx1MzAwMnxcXHVGRjBFfFxcdUZGNjEvZywgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG5cdC8qKiBFcnJvciBtZXNzYWdlcyAqL1xuXHRlcnJvcnMgPSB7XG5cdFx0J292ZXJmbG93JzogJ092ZXJmbG93OiBpbnB1dCBuZWVkcyB3aWRlciBpbnRlZ2VycyB0byBwcm9jZXNzJyxcblx0XHQnbm90LWJhc2ljJzogJ0lsbGVnYWwgaW5wdXQgPj0gMHg4MCAobm90IGEgYmFzaWMgY29kZSBwb2ludCknLFxuXHRcdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG5cdH0sXG5cblx0LyoqIENvbnZlbmllbmNlIHNob3J0Y3V0cyAqL1xuXHRiYXNlTWludXNUTWluID0gYmFzZSAtIHRNaW4sXG5cdGZsb29yID0gTWF0aC5mbG9vcixcblx0c3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZSxcblxuXHQvKiogVGVtcG9yYXJ5IHZhcmlhYmxlICovXG5cdGtleTtcblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGVycm9yIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBlcnJvciB0eXBlLlxuXHQgKiBAcmV0dXJucyB7RXJyb3J9IFRocm93cyBhIGBSYW5nZUVycm9yYCB3aXRoIHRoZSBhcHBsaWNhYmxlIGVycm9yIG1lc3NhZ2UuXG5cdCAqL1xuXHRmdW5jdGlvbiBlcnJvcih0eXBlKSB7XG5cdFx0dGhyb3cgUmFuZ2VFcnJvcihlcnJvcnNbdHlwZV0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBgQXJyYXkjbWFwYCB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnkgYXJyYXlcblx0ICogaXRlbS5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSBvZiB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHRcdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdFx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0XHRhcnJheVtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdFx0fVxuXHRcdHJldHVybiBhcnJheTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3MuXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnlcblx0ICogY2hhcmFjdGVyLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuXHQgKiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdFx0cmV0dXJuIG1hcChzdHJpbmcuc3BsaXQocmVnZXhTZXBhcmF0b3JzKSwgZm4pLmpvaW4oJy4nKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIG51bWVyaWMgY29kZSBwb2ludHMgb2YgZWFjaCBVbmljb2RlXG5cdCAqIGNoYXJhY3RlciBpbiB0aGUgc3RyaW5nLiBXaGlsZSBKYXZhU2NyaXB0IHVzZXMgVUNTLTIgaW50ZXJuYWxseSxcblx0ICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcblx0ICogVUNTLTIgZXhwb3NlcyBhcyBzZXBhcmF0ZSBjaGFyYWN0ZXJzKSBpbnRvIGEgc2luZ2xlIGNvZGUgcG9pbnQsXG5cdCAqIG1hdGNoaW5nIFVURi0xNi5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG5cdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGRlY29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBVbmljb2RlIGlucHV0IHN0cmluZyAoVUNTLTIpLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZGVjb2RlKHN0cmluZykge1xuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgY291bnRlciA9IDAsXG5cdFx0ICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG5cdFx0ICAgIHZhbHVlLFxuXHRcdCAgICBleHRyYTtcblx0XHR3aGlsZSAoY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0dmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0XHQvLyBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcblx0XHRcdFx0ZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHsgLy8gbG93IHN1cnJvZ2F0ZVxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlIG5leHRcblx0XHRcdFx0XHQvLyBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXJcblx0XHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdFx0Y291bnRlci0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIHN0cmluZyBiYXNlZCBvbiBhbiBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZW5jb2RlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBuZXcgVW5pY29kZSBzdHJpbmcgKFVDUy0yKS5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJlbmNvZGUoYXJyYXkpIHtcblx0XHRyZXR1cm4gbWFwKGFycmF5LCBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdFx0aWYgKHZhbHVlID4gMHhGRkZGKSB7XG5cdFx0XHRcdHZhbHVlIC09IDB4MTAwMDA7XG5cdFx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdFx0XHR2YWx1ZSA9IDB4REMwMCB8IHZhbHVlICYgMHgzRkY7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBiYXNpYyBjb2RlIHBvaW50IGludG8gYSBkaWdpdC9pbnRlZ2VyLlxuXHQgKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVQb2ludCBUaGUgYmFzaWMgbnVtZXJpYyBjb2RlIHBvaW50IHZhbHVlLlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpbiB0aGUgcmFuZ2UgYDBgIHRvIGBiYXNlIC0gMWAsIG9yIGBiYXNlYCBpZlxuXHQgKiB0aGUgY29kZSBwb2ludCBkb2VzIG5vdCByZXByZXNlbnQgYSB2YWx1ZS5cblx0ICovXG5cdGZ1bmN0aW9uIGJhc2ljVG9EaWdpdChjb2RlUG9pbnQpIHtcblx0XHRpZiAoY29kZVBvaW50IC0gNDggPCAxMCkge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDIyO1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gNjUgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDY1O1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gOTcgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDk3O1xuXHRcdH1cblx0XHRyZXR1cm4gYmFzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGRpZ2l0L2ludGVnZXIgaW50byBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEBzZWUgYGJhc2ljVG9EaWdpdCgpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gZGlnaXQgVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYmFzaWMgY29kZSBwb2ludCB3aG9zZSB2YWx1ZSAod2hlbiB1c2VkIGZvclxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuXHQgKiBgMGAgdG8gYGJhc2UgLSAxYC4gSWYgYGZsYWdgIGlzIG5vbi16ZXJvLCB0aGUgdXBwZXJjYXNlIGZvcm0gaXNcblx0ICogdXNlZDsgZWxzZSwgdGhlIGxvd2VyY2FzZSBmb3JtIGlzIHVzZWQuIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWRcblx0ICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cblx0ICovXG5cdGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHRcdC8vICAwLi4yNSBtYXAgdG8gQVNDSUkgYS4ueiBvciBBLi5aXG5cdFx0Ly8gMjYuLjM1IG1hcCB0byBBU0NJSSAwLi45XG5cdFx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBCaWFzIGFkYXB0YXRpb24gZnVuY3Rpb24gYXMgcGVyIHNlY3Rpb24gMy40IG9mIFJGQyAzNDkyLlxuXHQgKiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0XHR2YXIgayA9IDA7XG5cdFx0ZGVsdGEgPSBmaXJzdFRpbWUgPyBmbG9vcihkZWx0YSAvIGRhbXApIDogZGVsdGEgPj4gMTtcblx0XHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdFx0Zm9yICgvKiBubyBpbml0aWFsaXphdGlvbiAqLzsgZGVsdGEgPiBiYXNlTWludXNUTWluICogdE1heCA+PiAxOyBrICs9IGJhc2UpIHtcblx0XHRcdGRlbHRhID0gZmxvb3IoZGVsdGEgLyBiYXNlTWludXNUTWluKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZsb29yKGsgKyAoYmFzZU1pbnVzVE1pbiArIDEpICogZGVsdGEgLyAoZGVsdGEgKyBza2V3KSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzIHRvIGEgc3RyaW5nIG9mIFVuaWNvZGVcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdFx0Ly8gRG9uJ3QgdXNlIFVDUy0yXG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0XHQgICAgb3V0LFxuXHRcdCAgICBpID0gMCxcblx0XHQgICAgbiA9IGluaXRpYWxOLFxuXHRcdCAgICBiaWFzID0gaW5pdGlhbEJpYXMsXG5cdFx0ICAgIGJhc2ljLFxuXHRcdCAgICBqLFxuXHRcdCAgICBpbmRleCxcblx0XHQgICAgb2xkaSxcblx0XHQgICAgdyxcblx0XHQgICAgayxcblx0XHQgICAgZGlnaXQsXG5cdFx0ICAgIHQsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBiYXNlTWludXNUO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50czogbGV0IGBiYXNpY2AgYmUgdGhlIG51bWJlciBvZiBpbnB1dCBjb2RlXG5cdFx0Ly8gcG9pbnRzIGJlZm9yZSB0aGUgbGFzdCBkZWxpbWl0ZXIsIG9yIGAwYCBpZiB0aGVyZSBpcyBub25lLCB0aGVuIGNvcHlcblx0XHQvLyB0aGUgZmlyc3QgYmFzaWMgY29kZSBwb2ludHMgdG8gdGhlIG91dHB1dC5cblxuXHRcdGJhc2ljID0gaW5wdXQubGFzdEluZGV4T2YoZGVsaW1pdGVyKTtcblx0XHRpZiAoYmFzaWMgPCAwKSB7XG5cdFx0XHRiYXNpYyA9IDA7XG5cdFx0fVxuXG5cdFx0Zm9yIChqID0gMDsgaiA8IGJhc2ljOyArK2opIHtcblx0XHRcdC8vIGlmIGl0J3Mgbm90IGEgYmFzaWMgY29kZSBwb2ludFxuXHRcdFx0aWYgKGlucHV0LmNoYXJDb2RlQXQoaikgPj0gMHg4MCkge1xuXHRcdFx0XHRlcnJvcignbm90LWJhc2ljJyk7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQucHVzaChpbnB1dC5jaGFyQ29kZUF0KGopKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGRlY29kaW5nIGxvb3A6IHN0YXJ0IGp1c3QgYWZ0ZXIgdGhlIGxhc3QgZGVsaW1pdGVyIGlmIGFueSBiYXNpYyBjb2RlXG5cdFx0Ly8gcG9pbnRzIHdlcmUgY29waWVkOyBzdGFydCBhdCB0aGUgYmVnaW5uaW5nIG90aGVyd2lzZS5cblxuXHRcdGZvciAoaW5kZXggPSBiYXNpYyA+IDAgPyBiYXNpYyArIDEgOiAwOyBpbmRleCA8IGlucHV0TGVuZ3RoOyAvKiBubyBmaW5hbCBleHByZXNzaW9uICovKSB7XG5cblx0XHRcdC8vIGBpbmRleGAgaXMgdGhlIGluZGV4IG9mIHRoZSBuZXh0IGNoYXJhY3RlciB0byBiZSBjb25zdW1lZC5cblx0XHRcdC8vIERlY29kZSBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyIGludG8gYGRlbHRhYCxcblx0XHRcdC8vIHdoaWNoIGdldHMgYWRkZWQgdG8gYGlgLiBUaGUgb3ZlcmZsb3cgY2hlY2tpbmcgaXMgZWFzaWVyXG5cdFx0XHQvLyBpZiB3ZSBpbmNyZWFzZSBgaWAgYXMgd2UgZ28sIHRoZW4gc3VidHJhY3Qgb2ZmIGl0cyBzdGFydGluZ1xuXHRcdFx0Ly8gdmFsdWUgYXQgdGhlIGVuZCB0byBvYnRhaW4gYGRlbHRhYC5cblx0XHRcdGZvciAob2xkaSA9IGksIHcgPSAxLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblxuXHRcdFx0XHRpZiAoaW5kZXggPj0gaW5wdXRMZW5ndGgpIHtcblx0XHRcdFx0XHRlcnJvcignaW52YWxpZC1pbnB1dCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGlnaXQgPSBiYXNpY1RvRGlnaXQoaW5wdXQuY2hhckNvZGVBdChpbmRleCsrKSk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0ID49IGJhc2UgfHwgZGlnaXQgPiBmbG9vcigobWF4SW50IC0gaSkgLyB3KSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aSArPSBkaWdpdCAqIHc7XG5cdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA8IHQpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0aWYgKHcgPiBmbG9vcihtYXhJbnQgLyBiYXNlTWludXNUKSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dyAqPSBiYXNlTWludXNUO1xuXG5cdFx0XHR9XG5cblx0XHRcdG91dCA9IG91dHB1dC5sZW5ndGggKyAxO1xuXHRcdFx0YmlhcyA9IGFkYXB0KGkgLSBvbGRpLCBvdXQsIG9sZGkgPT0gMCk7XG5cblx0XHRcdC8vIGBpYCB3YXMgc3VwcG9zZWQgdG8gd3JhcCBhcm91bmQgZnJvbSBgb3V0YCB0byBgMGAsXG5cdFx0XHQvLyBpbmNyZW1lbnRpbmcgYG5gIGVhY2ggdGltZSwgc28gd2UnbGwgZml4IHRoYXQgbm93OlxuXHRcdFx0aWYgKGZsb29yKGkgLyBvdXQpID4gbWF4SW50IC0gbikge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0biArPSBmbG9vcihpIC8gb3V0KTtcblx0XHRcdGkgJT0gb3V0O1xuXG5cdFx0XHQvLyBJbnNlcnQgYG5gIGF0IHBvc2l0aW9uIGBpYCBvZiB0aGUgb3V0cHV0XG5cdFx0XHRvdXRwdXQuc3BsaWNlKGkrKywgMCwgbik7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdWNzMmVuY29kZShvdXRwdXQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scyB0byBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5XG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGVuY29kZShpbnB1dCkge1xuXHRcdHZhciBuLFxuXHRcdCAgICBkZWx0YSxcblx0XHQgICAgaGFuZGxlZENQQ291bnQsXG5cdFx0ICAgIGJhc2ljTGVuZ3RoLFxuXHRcdCAgICBiaWFzLFxuXHRcdCAgICBqLFxuXHRcdCAgICBtLFxuXHRcdCAgICBxLFxuXHRcdCAgICBrLFxuXHRcdCAgICB0LFxuXHRcdCAgICBjdXJyZW50VmFsdWUsXG5cdFx0ICAgIG91dHB1dCA9IFtdLFxuXHRcdCAgICAvKiogYGlucHV0TGVuZ3RoYCB3aWxsIGhvbGQgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyBpbiBgaW5wdXRgLiAqL1xuXHRcdCAgICBpbnB1dExlbmd0aCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50UGx1c09uZSxcblx0XHQgICAgYmFzZU1pbnVzVCxcblx0XHQgICAgcU1pbnVzVDtcblxuXHRcdC8vIENvbnZlcnQgdGhlIGlucHV0IGluIFVDUy0yIHRvIFVuaWNvZGVcblx0XHRpbnB1dCA9IHVjczJkZWNvZGUoaW5wdXQpO1xuXG5cdFx0Ly8gQ2FjaGUgdGhlIGxlbmd0aFxuXHRcdGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0aGUgc3RhdGVcblx0XHRuID0gaW5pdGlhbE47XG5cdFx0ZGVsdGEgPSAwO1xuXHRcdGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHNcblx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgMHg4MCkge1xuXHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoY3VycmVudFZhbHVlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aGFuZGxlZENQQ291bnQgPSBiYXNpY0xlbmd0aCA9IG91dHB1dC5sZW5ndGg7XG5cblx0XHQvLyBgaGFuZGxlZENQQ291bnRgIGlzIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgdGhhdCBoYXZlIGJlZW4gaGFuZGxlZDtcblx0XHQvLyBgYmFzaWNMZW5ndGhgIGlzIHRoZSBudW1iZXIgb2YgYmFzaWMgY29kZSBwb2ludHMuXG5cblx0XHQvLyBGaW5pc2ggdGhlIGJhc2ljIHN0cmluZyAtIGlmIGl0IGlzIG5vdCBlbXB0eSAtIHdpdGggYSBkZWxpbWl0ZXJcblx0XHRpZiAoYmFzaWNMZW5ndGgpIHtcblx0XHRcdG91dHB1dC5wdXNoKGRlbGltaXRlcik7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBlbmNvZGluZyBsb29wOlxuXHRcdHdoaWxlIChoYW5kbGVkQ1BDb3VudCA8IGlucHV0TGVuZ3RoKSB7XG5cblx0XHRcdC8vIEFsbCBub24tYmFzaWMgY29kZSBwb2ludHMgPCBuIGhhdmUgYmVlbiBoYW5kbGVkIGFscmVhZHkuIEZpbmQgdGhlIG5leHRcblx0XHRcdC8vIGxhcmdlciBvbmU6XG5cdFx0XHRmb3IgKG0gPSBtYXhJbnQsIGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA+PSBuICYmIGN1cnJlbnRWYWx1ZSA8IG0pIHtcblx0XHRcdFx0XHRtID0gY3VycmVudFZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluY3JlYXNlIGBkZWx0YWAgZW5vdWdoIHRvIGFkdmFuY2UgdGhlIGRlY29kZXIncyA8bixpPiBzdGF0ZSB0byA8bSwwPixcblx0XHRcdC8vIGJ1dCBndWFyZCBhZ2FpbnN0IG92ZXJmbG93XG5cdFx0XHRoYW5kbGVkQ1BDb3VudFBsdXNPbmUgPSBoYW5kbGVkQ1BDb3VudCArIDE7XG5cdFx0XHRpZiAobSAtIG4gPiBmbG9vcigobWF4SW50IC0gZGVsdGEpIC8gaGFuZGxlZENQQ291bnRQbHVzT25lKSkge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0ZGVsdGEgKz0gKG0gLSBuKSAqIGhhbmRsZWRDUENvdW50UGx1c09uZTtcblx0XHRcdG4gPSBtO1xuXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgbiAmJiArK2RlbHRhID4gbWF4SW50KSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID09IG4pIHtcblx0XHRcdFx0XHQvLyBSZXByZXNlbnQgZGVsdGEgYXMgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlclxuXHRcdFx0XHRcdGZvciAocSA9IGRlbHRhLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblx0XHRcdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXHRcdFx0XHRcdFx0aWYgKHEgPCB0KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cU1pbnVzVCA9IHEgLSB0O1xuXHRcdFx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0XHRcdHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWModCArIHFNaW51c1QgJSBiYXNlTWludXNULCAwKSlcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRxID0gZmxvb3IocU1pbnVzVCAvIGJhc2VNaW51c1QpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWMocSwgMCkpKTtcblx0XHRcdFx0XHRiaWFzID0gYWRhcHQoZGVsdGEsIGhhbmRsZWRDUENvdW50UGx1c09uZSwgaGFuZGxlZENQQ291bnQgPT0gYmFzaWNMZW5ndGgpO1xuXHRcdFx0XHRcdGRlbHRhID0gMDtcblx0XHRcdFx0XHQrK2hhbmRsZWRDUENvdW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCsrZGVsdGE7XG5cdFx0XHQrK247XG5cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dC5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBVbmljb2RlLiBPbmx5IHRoZVxuXHQgKiBQdW55Y29kZWQgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IG9uIGEgc3RyaW5nIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb252ZXJ0ZWQgdG9cblx0ICogVW5pY29kZS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIFB1bnljb2RlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQgdG8gVW5pY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG5cdCAqIHN0cmluZy5cblx0ICovXG5cdGZ1bmN0aW9uIHRvVW5pY29kZShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhQdW55Y29kZS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyBkZWNvZGUoc3RyaW5nLnNsaWNlKDQpLnRvTG93ZXJDYXNlKCkpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgVW5pY29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gUHVueWNvZGUuIE9ubHkgdGhlXG5cdCAqIG5vbi1BU0NJSSBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0J3MgYWxyZWFkeSBpbiBBU0NJSS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lIHRvIGNvbnZlcnQsIGFzIGEgVW5pY29kZSBzdHJpbmcuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBQdW55Y29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gZG9tYWluIG5hbWUuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b0FTQ0lJKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleE5vbkFTQ0lJLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/ICd4bi0tJyArIGVuY29kZShzdHJpbmcpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqIERlZmluZSB0aGUgcHVibGljIEFQSSAqL1xuXHRwdW55Y29kZSA9IHtcblx0XHQvKipcblx0XHQgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgUHVueWNvZGUuanMgdmVyc2lvbiBudW1iZXIuXG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgU3RyaW5nXG5cdFx0ICovXG5cdFx0J3ZlcnNpb24nOiAnMS4yLjQnLFxuXHRcdC8qKlxuXHRcdCAqIEFuIG9iamVjdCBvZiBtZXRob2RzIHRvIGNvbnZlcnQgZnJvbSBKYXZhU2NyaXB0J3MgaW50ZXJuYWwgY2hhcmFjdGVyXG5cdFx0ICogcmVwcmVzZW50YXRpb24gKFVDUy0yKSB0byBVbmljb2RlIGNvZGUgcG9pbnRzLCBhbmQgYmFjay5cblx0XHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIE9iamVjdFxuXHRcdCAqL1xuXHRcdCd1Y3MyJzoge1xuXHRcdFx0J2RlY29kZSc6IHVjczJkZWNvZGUsXG5cdFx0XHQnZW5jb2RlJzogdWNzMmVuY29kZVxuXHRcdH0sXG5cdFx0J2RlY29kZSc6IGRlY29kZSxcblx0XHQnZW5jb2RlJzogZW5jb2RlLFxuXHRcdCd0b0FTQ0lJJzogdG9BU0NJSSxcblx0XHQndG9Vbmljb2RlJzogdG9Vbmljb2RlXG5cdH07XG5cblx0LyoqIEV4cG9zZSBgcHVueWNvZGVgICovXG5cdC8vIFNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJuc1xuXHQvLyBsaWtlIHRoZSBmb2xsb3dpbmc6XG5cdGlmIChcblx0XHR0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiZcblx0XHR0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJlxuXHRcdGRlZmluZS5hbWRcblx0KSB7XG5cdFx0ZGVmaW5lKCdwdW55Y29kZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHB1bnljb2RlO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmICFmcmVlRXhwb3J0cy5ub2RlVHlwZSkge1xuXHRcdGlmIChmcmVlTW9kdWxlKSB7IC8vIGluIE5vZGUuanMgb3IgUmluZ29KUyB2MC44LjArXG5cdFx0XHRmcmVlTW9kdWxlLmV4cG9ydHMgPSBwdW55Y29kZTtcblx0XHR9IGVsc2UgeyAvLyBpbiBOYXJ3aGFsIG9yIFJpbmdvSlMgdjAuNy4wLVxuXHRcdFx0Zm9yIChrZXkgaW4gcHVueWNvZGUpIHtcblx0XHRcdFx0cHVueWNvZGUuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAoZnJlZUV4cG9ydHNba2V5XSA9IHB1bnljb2RlW2tleV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHsgLy8gaW4gUmhpbm8gb3IgYSB3ZWIgYnJvd3NlclxuXHRcdHJvb3QucHVueWNvZGUgPSBwdW55Y29kZTtcblx0fVxuXG59KHRoaXMpKTtcbiIsInZhciBwdW55Y29kZSA9IHJlcXVpcmUoJ3B1bnljb2RlJyk7XG52YXIgcmV2RW50aXRpZXMgPSByZXF1aXJlKCcuL3JldmVyc2VkLmpzb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbmNvZGU7XG5cbmZ1bmN0aW9uIGVuY29kZSAoc3RyLCBvcHRzKSB7XG4gICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgU3RyaW5nJyk7XG4gICAgfVxuICAgIGlmICghb3B0cykgb3B0cyA9IHt9O1xuXG4gICAgdmFyIG51bWVyaWMgPSB0cnVlO1xuICAgIGlmIChvcHRzLm5hbWVkKSBudW1lcmljID0gZmFsc2U7XG4gICAgaWYgKG9wdHMubnVtZXJpYyAhPT0gdW5kZWZpbmVkKSBudW1lcmljID0gb3B0cy5udW1lcmljO1xuXG4gICAgdmFyIHNwZWNpYWwgPSBvcHRzLnNwZWNpYWwgfHwge1xuICAgICAgICAnXCInOiB0cnVlLCBcIidcIjogdHJ1ZSxcbiAgICAgICAgJzwnOiB0cnVlLCAnPic6IHRydWUsXG4gICAgICAgICcmJzogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgY29kZVBvaW50cyA9IHB1bnljb2RlLnVjczIuZGVjb2RlKHN0cik7XG4gICAgdmFyIGNoYXJzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2RlUG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjYyA9IGNvZGVQb2ludHNbaV07XG4gICAgICAgIHZhciBjID0gcHVueWNvZGUudWNzMi5lbmNvZGUoWyBjYyBdKTtcbiAgICAgICAgdmFyIGUgPSByZXZFbnRpdGllc1tjY107XG4gICAgICAgIGlmIChlICYmIChjYyA+PSAxMjcgfHwgc3BlY2lhbFtjXSkgJiYgIW51bWVyaWMpIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goJyYnICsgKC87JC8udGVzdChlKSA/IGUgOiBlICsgJzsnKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY2MgPCAzMiB8fCBjYyA+PSAxMjcgfHwgc3BlY2lhbFtjXSkge1xuICAgICAgICAgICAgY2hhcnMucHVzaCgnJiMnICsgY2MgKyAnOycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2hhcnMucHVzaChjKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCI5XCI6IFwiVGFiO1wiLFxuICAgIFwiMTBcIjogXCJOZXdMaW5lO1wiLFxuICAgIFwiMzNcIjogXCJleGNsO1wiLFxuICAgIFwiMzRcIjogXCJxdW90O1wiLFxuICAgIFwiMzVcIjogXCJudW07XCIsXG4gICAgXCIzNlwiOiBcImRvbGxhcjtcIixcbiAgICBcIjM3XCI6IFwicGVyY250O1wiLFxuICAgIFwiMzhcIjogXCJhbXA7XCIsXG4gICAgXCIzOVwiOiBcImFwb3M7XCIsXG4gICAgXCI0MFwiOiBcImxwYXI7XCIsXG4gICAgXCI0MVwiOiBcInJwYXI7XCIsXG4gICAgXCI0MlwiOiBcIm1pZGFzdDtcIixcbiAgICBcIjQzXCI6IFwicGx1cztcIixcbiAgICBcIjQ0XCI6IFwiY29tbWE7XCIsXG4gICAgXCI0NlwiOiBcInBlcmlvZDtcIixcbiAgICBcIjQ3XCI6IFwic29sO1wiLFxuICAgIFwiNThcIjogXCJjb2xvbjtcIixcbiAgICBcIjU5XCI6IFwic2VtaTtcIixcbiAgICBcIjYwXCI6IFwibHQ7XCIsXG4gICAgXCI2MVwiOiBcImVxdWFscztcIixcbiAgICBcIjYyXCI6IFwiZ3Q7XCIsXG4gICAgXCI2M1wiOiBcInF1ZXN0O1wiLFxuICAgIFwiNjRcIjogXCJjb21tYXQ7XCIsXG4gICAgXCI5MVwiOiBcImxzcWI7XCIsXG4gICAgXCI5MlwiOiBcImJzb2w7XCIsXG4gICAgXCI5M1wiOiBcInJzcWI7XCIsXG4gICAgXCI5NFwiOiBcIkhhdDtcIixcbiAgICBcIjk1XCI6IFwiVW5kZXJCYXI7XCIsXG4gICAgXCI5NlwiOiBcImdyYXZlO1wiLFxuICAgIFwiMTIzXCI6IFwibGN1YjtcIixcbiAgICBcIjEyNFwiOiBcIlZlcnRpY2FsTGluZTtcIixcbiAgICBcIjEyNVwiOiBcInJjdWI7XCIsXG4gICAgXCIxNjBcIjogXCJOb25CcmVha2luZ1NwYWNlO1wiLFxuICAgIFwiMTYxXCI6IFwiaWV4Y2w7XCIsXG4gICAgXCIxNjJcIjogXCJjZW50O1wiLFxuICAgIFwiMTYzXCI6IFwicG91bmQ7XCIsXG4gICAgXCIxNjRcIjogXCJjdXJyZW47XCIsXG4gICAgXCIxNjVcIjogXCJ5ZW47XCIsXG4gICAgXCIxNjZcIjogXCJicnZiYXI7XCIsXG4gICAgXCIxNjdcIjogXCJzZWN0O1wiLFxuICAgIFwiMTY4XCI6IFwidW1sO1wiLFxuICAgIFwiMTY5XCI6IFwiY29weTtcIixcbiAgICBcIjE3MFwiOiBcIm9yZGY7XCIsXG4gICAgXCIxNzFcIjogXCJsYXF1bztcIixcbiAgICBcIjE3MlwiOiBcIm5vdDtcIixcbiAgICBcIjE3M1wiOiBcInNoeTtcIixcbiAgICBcIjE3NFwiOiBcInJlZztcIixcbiAgICBcIjE3NVwiOiBcInN0cm5zO1wiLFxuICAgIFwiMTc2XCI6IFwiZGVnO1wiLFxuICAgIFwiMTc3XCI6IFwicG07XCIsXG4gICAgXCIxNzhcIjogXCJzdXAyO1wiLFxuICAgIFwiMTc5XCI6IFwic3VwMztcIixcbiAgICBcIjE4MFwiOiBcIkRpYWNyaXRpY2FsQWN1dGU7XCIsXG4gICAgXCIxODFcIjogXCJtaWNybztcIixcbiAgICBcIjE4MlwiOiBcInBhcmE7XCIsXG4gICAgXCIxODNcIjogXCJtaWRkb3Q7XCIsXG4gICAgXCIxODRcIjogXCJDZWRpbGxhO1wiLFxuICAgIFwiMTg1XCI6IFwic3VwMTtcIixcbiAgICBcIjE4NlwiOiBcIm9yZG07XCIsXG4gICAgXCIxODdcIjogXCJyYXF1bztcIixcbiAgICBcIjE4OFwiOiBcImZyYWMxNDtcIixcbiAgICBcIjE4OVwiOiBcImhhbGY7XCIsXG4gICAgXCIxOTBcIjogXCJmcmFjMzQ7XCIsXG4gICAgXCIxOTFcIjogXCJpcXVlc3Q7XCIsXG4gICAgXCIxOTJcIjogXCJBZ3JhdmU7XCIsXG4gICAgXCIxOTNcIjogXCJBYWN1dGU7XCIsXG4gICAgXCIxOTRcIjogXCJBY2lyYztcIixcbiAgICBcIjE5NVwiOiBcIkF0aWxkZTtcIixcbiAgICBcIjE5NlwiOiBcIkF1bWw7XCIsXG4gICAgXCIxOTdcIjogXCJBcmluZztcIixcbiAgICBcIjE5OFwiOiBcIkFFbGlnO1wiLFxuICAgIFwiMTk5XCI6IFwiQ2NlZGlsO1wiLFxuICAgIFwiMjAwXCI6IFwiRWdyYXZlO1wiLFxuICAgIFwiMjAxXCI6IFwiRWFjdXRlO1wiLFxuICAgIFwiMjAyXCI6IFwiRWNpcmM7XCIsXG4gICAgXCIyMDNcIjogXCJFdW1sO1wiLFxuICAgIFwiMjA0XCI6IFwiSWdyYXZlO1wiLFxuICAgIFwiMjA1XCI6IFwiSWFjdXRlO1wiLFxuICAgIFwiMjA2XCI6IFwiSWNpcmM7XCIsXG4gICAgXCIyMDdcIjogXCJJdW1sO1wiLFxuICAgIFwiMjA4XCI6IFwiRVRIO1wiLFxuICAgIFwiMjA5XCI6IFwiTnRpbGRlO1wiLFxuICAgIFwiMjEwXCI6IFwiT2dyYXZlO1wiLFxuICAgIFwiMjExXCI6IFwiT2FjdXRlO1wiLFxuICAgIFwiMjEyXCI6IFwiT2NpcmM7XCIsXG4gICAgXCIyMTNcIjogXCJPdGlsZGU7XCIsXG4gICAgXCIyMTRcIjogXCJPdW1sO1wiLFxuICAgIFwiMjE1XCI6IFwidGltZXM7XCIsXG4gICAgXCIyMTZcIjogXCJPc2xhc2g7XCIsXG4gICAgXCIyMTdcIjogXCJVZ3JhdmU7XCIsXG4gICAgXCIyMThcIjogXCJVYWN1dGU7XCIsXG4gICAgXCIyMTlcIjogXCJVY2lyYztcIixcbiAgICBcIjIyMFwiOiBcIlV1bWw7XCIsXG4gICAgXCIyMjFcIjogXCJZYWN1dGU7XCIsXG4gICAgXCIyMjJcIjogXCJUSE9STjtcIixcbiAgICBcIjIyM1wiOiBcInN6bGlnO1wiLFxuICAgIFwiMjI0XCI6IFwiYWdyYXZlO1wiLFxuICAgIFwiMjI1XCI6IFwiYWFjdXRlO1wiLFxuICAgIFwiMjI2XCI6IFwiYWNpcmM7XCIsXG4gICAgXCIyMjdcIjogXCJhdGlsZGU7XCIsXG4gICAgXCIyMjhcIjogXCJhdW1sO1wiLFxuICAgIFwiMjI5XCI6IFwiYXJpbmc7XCIsXG4gICAgXCIyMzBcIjogXCJhZWxpZztcIixcbiAgICBcIjIzMVwiOiBcImNjZWRpbDtcIixcbiAgICBcIjIzMlwiOiBcImVncmF2ZTtcIixcbiAgICBcIjIzM1wiOiBcImVhY3V0ZTtcIixcbiAgICBcIjIzNFwiOiBcImVjaXJjO1wiLFxuICAgIFwiMjM1XCI6IFwiZXVtbDtcIixcbiAgICBcIjIzNlwiOiBcImlncmF2ZTtcIixcbiAgICBcIjIzN1wiOiBcImlhY3V0ZTtcIixcbiAgICBcIjIzOFwiOiBcImljaXJjO1wiLFxuICAgIFwiMjM5XCI6IFwiaXVtbDtcIixcbiAgICBcIjI0MFwiOiBcImV0aDtcIixcbiAgICBcIjI0MVwiOiBcIm50aWxkZTtcIixcbiAgICBcIjI0MlwiOiBcIm9ncmF2ZTtcIixcbiAgICBcIjI0M1wiOiBcIm9hY3V0ZTtcIixcbiAgICBcIjI0NFwiOiBcIm9jaXJjO1wiLFxuICAgIFwiMjQ1XCI6IFwib3RpbGRlO1wiLFxuICAgIFwiMjQ2XCI6IFwib3VtbDtcIixcbiAgICBcIjI0N1wiOiBcImRpdmlkZTtcIixcbiAgICBcIjI0OFwiOiBcIm9zbGFzaDtcIixcbiAgICBcIjI0OVwiOiBcInVncmF2ZTtcIixcbiAgICBcIjI1MFwiOiBcInVhY3V0ZTtcIixcbiAgICBcIjI1MVwiOiBcInVjaXJjO1wiLFxuICAgIFwiMjUyXCI6IFwidXVtbDtcIixcbiAgICBcIjI1M1wiOiBcInlhY3V0ZTtcIixcbiAgICBcIjI1NFwiOiBcInRob3JuO1wiLFxuICAgIFwiMjU1XCI6IFwieXVtbDtcIixcbiAgICBcIjI1NlwiOiBcIkFtYWNyO1wiLFxuICAgIFwiMjU3XCI6IFwiYW1hY3I7XCIsXG4gICAgXCIyNThcIjogXCJBYnJldmU7XCIsXG4gICAgXCIyNTlcIjogXCJhYnJldmU7XCIsXG4gICAgXCIyNjBcIjogXCJBb2dvbjtcIixcbiAgICBcIjI2MVwiOiBcImFvZ29uO1wiLFxuICAgIFwiMjYyXCI6IFwiQ2FjdXRlO1wiLFxuICAgIFwiMjYzXCI6IFwiY2FjdXRlO1wiLFxuICAgIFwiMjY0XCI6IFwiQ2NpcmM7XCIsXG4gICAgXCIyNjVcIjogXCJjY2lyYztcIixcbiAgICBcIjI2NlwiOiBcIkNkb3Q7XCIsXG4gICAgXCIyNjdcIjogXCJjZG90O1wiLFxuICAgIFwiMjY4XCI6IFwiQ2Nhcm9uO1wiLFxuICAgIFwiMjY5XCI6IFwiY2Nhcm9uO1wiLFxuICAgIFwiMjcwXCI6IFwiRGNhcm9uO1wiLFxuICAgIFwiMjcxXCI6IFwiZGNhcm9uO1wiLFxuICAgIFwiMjcyXCI6IFwiRHN0cm9rO1wiLFxuICAgIFwiMjczXCI6IFwiZHN0cm9rO1wiLFxuICAgIFwiMjc0XCI6IFwiRW1hY3I7XCIsXG4gICAgXCIyNzVcIjogXCJlbWFjcjtcIixcbiAgICBcIjI3OFwiOiBcIkVkb3Q7XCIsXG4gICAgXCIyNzlcIjogXCJlZG90O1wiLFxuICAgIFwiMjgwXCI6IFwiRW9nb247XCIsXG4gICAgXCIyODFcIjogXCJlb2dvbjtcIixcbiAgICBcIjI4MlwiOiBcIkVjYXJvbjtcIixcbiAgICBcIjI4M1wiOiBcImVjYXJvbjtcIixcbiAgICBcIjI4NFwiOiBcIkdjaXJjO1wiLFxuICAgIFwiMjg1XCI6IFwiZ2NpcmM7XCIsXG4gICAgXCIyODZcIjogXCJHYnJldmU7XCIsXG4gICAgXCIyODdcIjogXCJnYnJldmU7XCIsXG4gICAgXCIyODhcIjogXCJHZG90O1wiLFxuICAgIFwiMjg5XCI6IFwiZ2RvdDtcIixcbiAgICBcIjI5MFwiOiBcIkdjZWRpbDtcIixcbiAgICBcIjI5MlwiOiBcIkhjaXJjO1wiLFxuICAgIFwiMjkzXCI6IFwiaGNpcmM7XCIsXG4gICAgXCIyOTRcIjogXCJIc3Ryb2s7XCIsXG4gICAgXCIyOTVcIjogXCJoc3Ryb2s7XCIsXG4gICAgXCIyOTZcIjogXCJJdGlsZGU7XCIsXG4gICAgXCIyOTdcIjogXCJpdGlsZGU7XCIsXG4gICAgXCIyOThcIjogXCJJbWFjcjtcIixcbiAgICBcIjI5OVwiOiBcImltYWNyO1wiLFxuICAgIFwiMzAyXCI6IFwiSW9nb247XCIsXG4gICAgXCIzMDNcIjogXCJpb2dvbjtcIixcbiAgICBcIjMwNFwiOiBcIklkb3Q7XCIsXG4gICAgXCIzMDVcIjogXCJpbm9kb3Q7XCIsXG4gICAgXCIzMDZcIjogXCJJSmxpZztcIixcbiAgICBcIjMwN1wiOiBcImlqbGlnO1wiLFxuICAgIFwiMzA4XCI6IFwiSmNpcmM7XCIsXG4gICAgXCIzMDlcIjogXCJqY2lyYztcIixcbiAgICBcIjMxMFwiOiBcIktjZWRpbDtcIixcbiAgICBcIjMxMVwiOiBcImtjZWRpbDtcIixcbiAgICBcIjMxMlwiOiBcImtncmVlbjtcIixcbiAgICBcIjMxM1wiOiBcIkxhY3V0ZTtcIixcbiAgICBcIjMxNFwiOiBcImxhY3V0ZTtcIixcbiAgICBcIjMxNVwiOiBcIkxjZWRpbDtcIixcbiAgICBcIjMxNlwiOiBcImxjZWRpbDtcIixcbiAgICBcIjMxN1wiOiBcIkxjYXJvbjtcIixcbiAgICBcIjMxOFwiOiBcImxjYXJvbjtcIixcbiAgICBcIjMxOVwiOiBcIkxtaWRvdDtcIixcbiAgICBcIjMyMFwiOiBcImxtaWRvdDtcIixcbiAgICBcIjMyMVwiOiBcIkxzdHJvaztcIixcbiAgICBcIjMyMlwiOiBcImxzdHJvaztcIixcbiAgICBcIjMyM1wiOiBcIk5hY3V0ZTtcIixcbiAgICBcIjMyNFwiOiBcIm5hY3V0ZTtcIixcbiAgICBcIjMyNVwiOiBcIk5jZWRpbDtcIixcbiAgICBcIjMyNlwiOiBcIm5jZWRpbDtcIixcbiAgICBcIjMyN1wiOiBcIk5jYXJvbjtcIixcbiAgICBcIjMyOFwiOiBcIm5jYXJvbjtcIixcbiAgICBcIjMyOVwiOiBcIm5hcG9zO1wiLFxuICAgIFwiMzMwXCI6IFwiRU5HO1wiLFxuICAgIFwiMzMxXCI6IFwiZW5nO1wiLFxuICAgIFwiMzMyXCI6IFwiT21hY3I7XCIsXG4gICAgXCIzMzNcIjogXCJvbWFjcjtcIixcbiAgICBcIjMzNlwiOiBcIk9kYmxhYztcIixcbiAgICBcIjMzN1wiOiBcIm9kYmxhYztcIixcbiAgICBcIjMzOFwiOiBcIk9FbGlnO1wiLFxuICAgIFwiMzM5XCI6IFwib2VsaWc7XCIsXG4gICAgXCIzNDBcIjogXCJSYWN1dGU7XCIsXG4gICAgXCIzNDFcIjogXCJyYWN1dGU7XCIsXG4gICAgXCIzNDJcIjogXCJSY2VkaWw7XCIsXG4gICAgXCIzNDNcIjogXCJyY2VkaWw7XCIsXG4gICAgXCIzNDRcIjogXCJSY2Fyb247XCIsXG4gICAgXCIzNDVcIjogXCJyY2Fyb247XCIsXG4gICAgXCIzNDZcIjogXCJTYWN1dGU7XCIsXG4gICAgXCIzNDdcIjogXCJzYWN1dGU7XCIsXG4gICAgXCIzNDhcIjogXCJTY2lyYztcIixcbiAgICBcIjM0OVwiOiBcInNjaXJjO1wiLFxuICAgIFwiMzUwXCI6IFwiU2NlZGlsO1wiLFxuICAgIFwiMzUxXCI6IFwic2NlZGlsO1wiLFxuICAgIFwiMzUyXCI6IFwiU2Nhcm9uO1wiLFxuICAgIFwiMzUzXCI6IFwic2Nhcm9uO1wiLFxuICAgIFwiMzU0XCI6IFwiVGNlZGlsO1wiLFxuICAgIFwiMzU1XCI6IFwidGNlZGlsO1wiLFxuICAgIFwiMzU2XCI6IFwiVGNhcm9uO1wiLFxuICAgIFwiMzU3XCI6IFwidGNhcm9uO1wiLFxuICAgIFwiMzU4XCI6IFwiVHN0cm9rO1wiLFxuICAgIFwiMzU5XCI6IFwidHN0cm9rO1wiLFxuICAgIFwiMzYwXCI6IFwiVXRpbGRlO1wiLFxuICAgIFwiMzYxXCI6IFwidXRpbGRlO1wiLFxuICAgIFwiMzYyXCI6IFwiVW1hY3I7XCIsXG4gICAgXCIzNjNcIjogXCJ1bWFjcjtcIixcbiAgICBcIjM2NFwiOiBcIlVicmV2ZTtcIixcbiAgICBcIjM2NVwiOiBcInVicmV2ZTtcIixcbiAgICBcIjM2NlwiOiBcIlVyaW5nO1wiLFxuICAgIFwiMzY3XCI6IFwidXJpbmc7XCIsXG4gICAgXCIzNjhcIjogXCJVZGJsYWM7XCIsXG4gICAgXCIzNjlcIjogXCJ1ZGJsYWM7XCIsXG4gICAgXCIzNzBcIjogXCJVb2dvbjtcIixcbiAgICBcIjM3MVwiOiBcInVvZ29uO1wiLFxuICAgIFwiMzcyXCI6IFwiV2NpcmM7XCIsXG4gICAgXCIzNzNcIjogXCJ3Y2lyYztcIixcbiAgICBcIjM3NFwiOiBcIlljaXJjO1wiLFxuICAgIFwiMzc1XCI6IFwieWNpcmM7XCIsXG4gICAgXCIzNzZcIjogXCJZdW1sO1wiLFxuICAgIFwiMzc3XCI6IFwiWmFjdXRlO1wiLFxuICAgIFwiMzc4XCI6IFwiemFjdXRlO1wiLFxuICAgIFwiMzc5XCI6IFwiWmRvdDtcIixcbiAgICBcIjM4MFwiOiBcInpkb3Q7XCIsXG4gICAgXCIzODFcIjogXCJaY2Fyb247XCIsXG4gICAgXCIzODJcIjogXCJ6Y2Fyb247XCIsXG4gICAgXCI0MDJcIjogXCJmbm9mO1wiLFxuICAgIFwiNDM3XCI6IFwiaW1wZWQ7XCIsXG4gICAgXCI1MDFcIjogXCJnYWN1dGU7XCIsXG4gICAgXCI1NjdcIjogXCJqbWF0aDtcIixcbiAgICBcIjcxMFwiOiBcImNpcmM7XCIsXG4gICAgXCI3MTFcIjogXCJIYWNlaztcIixcbiAgICBcIjcyOFwiOiBcImJyZXZlO1wiLFxuICAgIFwiNzI5XCI6IFwiZG90O1wiLFxuICAgIFwiNzMwXCI6IFwicmluZztcIixcbiAgICBcIjczMVwiOiBcIm9nb247XCIsXG4gICAgXCI3MzJcIjogXCJ0aWxkZTtcIixcbiAgICBcIjczM1wiOiBcIkRpYWNyaXRpY2FsRG91YmxlQWN1dGU7XCIsXG4gICAgXCI3ODVcIjogXCJEb3duQnJldmU7XCIsXG4gICAgXCI5MTNcIjogXCJBbHBoYTtcIixcbiAgICBcIjkxNFwiOiBcIkJldGE7XCIsXG4gICAgXCI5MTVcIjogXCJHYW1tYTtcIixcbiAgICBcIjkxNlwiOiBcIkRlbHRhO1wiLFxuICAgIFwiOTE3XCI6IFwiRXBzaWxvbjtcIixcbiAgICBcIjkxOFwiOiBcIlpldGE7XCIsXG4gICAgXCI5MTlcIjogXCJFdGE7XCIsXG4gICAgXCI5MjBcIjogXCJUaGV0YTtcIixcbiAgICBcIjkyMVwiOiBcIklvdGE7XCIsXG4gICAgXCI5MjJcIjogXCJLYXBwYTtcIixcbiAgICBcIjkyM1wiOiBcIkxhbWJkYTtcIixcbiAgICBcIjkyNFwiOiBcIk11O1wiLFxuICAgIFwiOTI1XCI6IFwiTnU7XCIsXG4gICAgXCI5MjZcIjogXCJYaTtcIixcbiAgICBcIjkyN1wiOiBcIk9taWNyb247XCIsXG4gICAgXCI5MjhcIjogXCJQaTtcIixcbiAgICBcIjkyOVwiOiBcIlJobztcIixcbiAgICBcIjkzMVwiOiBcIlNpZ21hO1wiLFxuICAgIFwiOTMyXCI6IFwiVGF1O1wiLFxuICAgIFwiOTMzXCI6IFwiVXBzaWxvbjtcIixcbiAgICBcIjkzNFwiOiBcIlBoaTtcIixcbiAgICBcIjkzNVwiOiBcIkNoaTtcIixcbiAgICBcIjkzNlwiOiBcIlBzaTtcIixcbiAgICBcIjkzN1wiOiBcIk9tZWdhO1wiLFxuICAgIFwiOTQ1XCI6IFwiYWxwaGE7XCIsXG4gICAgXCI5NDZcIjogXCJiZXRhO1wiLFxuICAgIFwiOTQ3XCI6IFwiZ2FtbWE7XCIsXG4gICAgXCI5NDhcIjogXCJkZWx0YTtcIixcbiAgICBcIjk0OVwiOiBcImVwc2lsb247XCIsXG4gICAgXCI5NTBcIjogXCJ6ZXRhO1wiLFxuICAgIFwiOTUxXCI6IFwiZXRhO1wiLFxuICAgIFwiOTUyXCI6IFwidGhldGE7XCIsXG4gICAgXCI5NTNcIjogXCJpb3RhO1wiLFxuICAgIFwiOTU0XCI6IFwia2FwcGE7XCIsXG4gICAgXCI5NTVcIjogXCJsYW1iZGE7XCIsXG4gICAgXCI5NTZcIjogXCJtdTtcIixcbiAgICBcIjk1N1wiOiBcIm51O1wiLFxuICAgIFwiOTU4XCI6IFwieGk7XCIsXG4gICAgXCI5NTlcIjogXCJvbWljcm9uO1wiLFxuICAgIFwiOTYwXCI6IFwicGk7XCIsXG4gICAgXCI5NjFcIjogXCJyaG87XCIsXG4gICAgXCI5NjJcIjogXCJ2YXJzaWdtYTtcIixcbiAgICBcIjk2M1wiOiBcInNpZ21hO1wiLFxuICAgIFwiOTY0XCI6IFwidGF1O1wiLFxuICAgIFwiOTY1XCI6IFwidXBzaWxvbjtcIixcbiAgICBcIjk2NlwiOiBcInBoaTtcIixcbiAgICBcIjk2N1wiOiBcImNoaTtcIixcbiAgICBcIjk2OFwiOiBcInBzaTtcIixcbiAgICBcIjk2OVwiOiBcIm9tZWdhO1wiLFxuICAgIFwiOTc3XCI6IFwidmFydGhldGE7XCIsXG4gICAgXCI5NzhcIjogXCJ1cHNpaDtcIixcbiAgICBcIjk4MVwiOiBcInZhcnBoaTtcIixcbiAgICBcIjk4MlwiOiBcInZhcnBpO1wiLFxuICAgIFwiOTg4XCI6IFwiR2FtbWFkO1wiLFxuICAgIFwiOTg5XCI6IFwiZ2FtbWFkO1wiLFxuICAgIFwiMTAwOFwiOiBcInZhcmthcHBhO1wiLFxuICAgIFwiMTAwOVwiOiBcInZhcnJobztcIixcbiAgICBcIjEwMTNcIjogXCJ2YXJlcHNpbG9uO1wiLFxuICAgIFwiMTAxNFwiOiBcImJlcHNpO1wiLFxuICAgIFwiMTAyNVwiOiBcIklPY3k7XCIsXG4gICAgXCIxMDI2XCI6IFwiREpjeTtcIixcbiAgICBcIjEwMjdcIjogXCJHSmN5O1wiLFxuICAgIFwiMTAyOFwiOiBcIkp1a2N5O1wiLFxuICAgIFwiMTAyOVwiOiBcIkRTY3k7XCIsXG4gICAgXCIxMDMwXCI6IFwiSXVrY3k7XCIsXG4gICAgXCIxMDMxXCI6IFwiWUljeTtcIixcbiAgICBcIjEwMzJcIjogXCJKc2VyY3k7XCIsXG4gICAgXCIxMDMzXCI6IFwiTEpjeTtcIixcbiAgICBcIjEwMzRcIjogXCJOSmN5O1wiLFxuICAgIFwiMTAzNVwiOiBcIlRTSGN5O1wiLFxuICAgIFwiMTAzNlwiOiBcIktKY3k7XCIsXG4gICAgXCIxMDM4XCI6IFwiVWJyY3k7XCIsXG4gICAgXCIxMDM5XCI6IFwiRFpjeTtcIixcbiAgICBcIjEwNDBcIjogXCJBY3k7XCIsXG4gICAgXCIxMDQxXCI6IFwiQmN5O1wiLFxuICAgIFwiMTA0MlwiOiBcIlZjeTtcIixcbiAgICBcIjEwNDNcIjogXCJHY3k7XCIsXG4gICAgXCIxMDQ0XCI6IFwiRGN5O1wiLFxuICAgIFwiMTA0NVwiOiBcIklFY3k7XCIsXG4gICAgXCIxMDQ2XCI6IFwiWkhjeTtcIixcbiAgICBcIjEwNDdcIjogXCJaY3k7XCIsXG4gICAgXCIxMDQ4XCI6IFwiSWN5O1wiLFxuICAgIFwiMTA0OVwiOiBcIkpjeTtcIixcbiAgICBcIjEwNTBcIjogXCJLY3k7XCIsXG4gICAgXCIxMDUxXCI6IFwiTGN5O1wiLFxuICAgIFwiMTA1MlwiOiBcIk1jeTtcIixcbiAgICBcIjEwNTNcIjogXCJOY3k7XCIsXG4gICAgXCIxMDU0XCI6IFwiT2N5O1wiLFxuICAgIFwiMTA1NVwiOiBcIlBjeTtcIixcbiAgICBcIjEwNTZcIjogXCJSY3k7XCIsXG4gICAgXCIxMDU3XCI6IFwiU2N5O1wiLFxuICAgIFwiMTA1OFwiOiBcIlRjeTtcIixcbiAgICBcIjEwNTlcIjogXCJVY3k7XCIsXG4gICAgXCIxMDYwXCI6IFwiRmN5O1wiLFxuICAgIFwiMTA2MVwiOiBcIktIY3k7XCIsXG4gICAgXCIxMDYyXCI6IFwiVFNjeTtcIixcbiAgICBcIjEwNjNcIjogXCJDSGN5O1wiLFxuICAgIFwiMTA2NFwiOiBcIlNIY3k7XCIsXG4gICAgXCIxMDY1XCI6IFwiU0hDSGN5O1wiLFxuICAgIFwiMTA2NlwiOiBcIkhBUkRjeTtcIixcbiAgICBcIjEwNjdcIjogXCJZY3k7XCIsXG4gICAgXCIxMDY4XCI6IFwiU09GVGN5O1wiLFxuICAgIFwiMTA2OVwiOiBcIkVjeTtcIixcbiAgICBcIjEwNzBcIjogXCJZVWN5O1wiLFxuICAgIFwiMTA3MVwiOiBcIllBY3k7XCIsXG4gICAgXCIxMDcyXCI6IFwiYWN5O1wiLFxuICAgIFwiMTA3M1wiOiBcImJjeTtcIixcbiAgICBcIjEwNzRcIjogXCJ2Y3k7XCIsXG4gICAgXCIxMDc1XCI6IFwiZ2N5O1wiLFxuICAgIFwiMTA3NlwiOiBcImRjeTtcIixcbiAgICBcIjEwNzdcIjogXCJpZWN5O1wiLFxuICAgIFwiMTA3OFwiOiBcInpoY3k7XCIsXG4gICAgXCIxMDc5XCI6IFwiemN5O1wiLFxuICAgIFwiMTA4MFwiOiBcImljeTtcIixcbiAgICBcIjEwODFcIjogXCJqY3k7XCIsXG4gICAgXCIxMDgyXCI6IFwia2N5O1wiLFxuICAgIFwiMTA4M1wiOiBcImxjeTtcIixcbiAgICBcIjEwODRcIjogXCJtY3k7XCIsXG4gICAgXCIxMDg1XCI6IFwibmN5O1wiLFxuICAgIFwiMTA4NlwiOiBcIm9jeTtcIixcbiAgICBcIjEwODdcIjogXCJwY3k7XCIsXG4gICAgXCIxMDg4XCI6IFwicmN5O1wiLFxuICAgIFwiMTA4OVwiOiBcInNjeTtcIixcbiAgICBcIjEwOTBcIjogXCJ0Y3k7XCIsXG4gICAgXCIxMDkxXCI6IFwidWN5O1wiLFxuICAgIFwiMTA5MlwiOiBcImZjeTtcIixcbiAgICBcIjEwOTNcIjogXCJraGN5O1wiLFxuICAgIFwiMTA5NFwiOiBcInRzY3k7XCIsXG4gICAgXCIxMDk1XCI6IFwiY2hjeTtcIixcbiAgICBcIjEwOTZcIjogXCJzaGN5O1wiLFxuICAgIFwiMTA5N1wiOiBcInNoY2hjeTtcIixcbiAgICBcIjEwOThcIjogXCJoYXJkY3k7XCIsXG4gICAgXCIxMDk5XCI6IFwieWN5O1wiLFxuICAgIFwiMTEwMFwiOiBcInNvZnRjeTtcIixcbiAgICBcIjExMDFcIjogXCJlY3k7XCIsXG4gICAgXCIxMTAyXCI6IFwieXVjeTtcIixcbiAgICBcIjExMDNcIjogXCJ5YWN5O1wiLFxuICAgIFwiMTEwNVwiOiBcImlvY3k7XCIsXG4gICAgXCIxMTA2XCI6IFwiZGpjeTtcIixcbiAgICBcIjExMDdcIjogXCJnamN5O1wiLFxuICAgIFwiMTEwOFwiOiBcImp1a2N5O1wiLFxuICAgIFwiMTEwOVwiOiBcImRzY3k7XCIsXG4gICAgXCIxMTEwXCI6IFwiaXVrY3k7XCIsXG4gICAgXCIxMTExXCI6IFwieWljeTtcIixcbiAgICBcIjExMTJcIjogXCJqc2VyY3k7XCIsXG4gICAgXCIxMTEzXCI6IFwibGpjeTtcIixcbiAgICBcIjExMTRcIjogXCJuamN5O1wiLFxuICAgIFwiMTExNVwiOiBcInRzaGN5O1wiLFxuICAgIFwiMTExNlwiOiBcImtqY3k7XCIsXG4gICAgXCIxMTE4XCI6IFwidWJyY3k7XCIsXG4gICAgXCIxMTE5XCI6IFwiZHpjeTtcIixcbiAgICBcIjgxOTRcIjogXCJlbnNwO1wiLFxuICAgIFwiODE5NVwiOiBcImVtc3A7XCIsXG4gICAgXCI4MTk2XCI6IFwiZW1zcDEzO1wiLFxuICAgIFwiODE5N1wiOiBcImVtc3AxNDtcIixcbiAgICBcIjgxOTlcIjogXCJudW1zcDtcIixcbiAgICBcIjgyMDBcIjogXCJwdW5jc3A7XCIsXG4gICAgXCI4MjAxXCI6IFwiVGhpblNwYWNlO1wiLFxuICAgIFwiODIwMlwiOiBcIlZlcnlUaGluU3BhY2U7XCIsXG4gICAgXCI4MjAzXCI6IFwiWmVyb1dpZHRoU3BhY2U7XCIsXG4gICAgXCI4MjA0XCI6IFwienduajtcIixcbiAgICBcIjgyMDVcIjogXCJ6d2o7XCIsXG4gICAgXCI4MjA2XCI6IFwibHJtO1wiLFxuICAgIFwiODIwN1wiOiBcInJsbTtcIixcbiAgICBcIjgyMDhcIjogXCJoeXBoZW47XCIsXG4gICAgXCI4MjExXCI6IFwibmRhc2g7XCIsXG4gICAgXCI4MjEyXCI6IFwibWRhc2g7XCIsXG4gICAgXCI4MjEzXCI6IFwiaG9yYmFyO1wiLFxuICAgIFwiODIxNFwiOiBcIlZlcnQ7XCIsXG4gICAgXCI4MjE2XCI6IFwiT3BlbkN1cmx5UXVvdGU7XCIsXG4gICAgXCI4MjE3XCI6IFwicnNxdW9yO1wiLFxuICAgIFwiODIxOFwiOiBcInNicXVvO1wiLFxuICAgIFwiODIyMFwiOiBcIk9wZW5DdXJseURvdWJsZVF1b3RlO1wiLFxuICAgIFwiODIyMVwiOiBcInJkcXVvcjtcIixcbiAgICBcIjgyMjJcIjogXCJsZHF1b3I7XCIsXG4gICAgXCI4MjI0XCI6IFwiZGFnZ2VyO1wiLFxuICAgIFwiODIyNVwiOiBcImRkYWdnZXI7XCIsXG4gICAgXCI4MjI2XCI6IFwiYnVsbGV0O1wiLFxuICAgIFwiODIyOVwiOiBcIm5sZHI7XCIsXG4gICAgXCI4MjMwXCI6IFwibWxkcjtcIixcbiAgICBcIjgyNDBcIjogXCJwZXJtaWw7XCIsXG4gICAgXCI4MjQxXCI6IFwicGVydGVuaztcIixcbiAgICBcIjgyNDJcIjogXCJwcmltZTtcIixcbiAgICBcIjgyNDNcIjogXCJQcmltZTtcIixcbiAgICBcIjgyNDRcIjogXCJ0cHJpbWU7XCIsXG4gICAgXCI4MjQ1XCI6IFwiYnByaW1lO1wiLFxuICAgIFwiODI0OVwiOiBcImxzYXF1bztcIixcbiAgICBcIjgyNTBcIjogXCJyc2FxdW87XCIsXG4gICAgXCI4MjU0XCI6IFwiT3ZlckJhcjtcIixcbiAgICBcIjgyNTdcIjogXCJjYXJldDtcIixcbiAgICBcIjgyNTlcIjogXCJoeWJ1bGw7XCIsXG4gICAgXCI4MjYwXCI6IFwiZnJhc2w7XCIsXG4gICAgXCI4MjcxXCI6IFwiYnNlbWk7XCIsXG4gICAgXCI4Mjc5XCI6IFwicXByaW1lO1wiLFxuICAgIFwiODI4N1wiOiBcIk1lZGl1bVNwYWNlO1wiLFxuICAgIFwiODI4OFwiOiBcIk5vQnJlYWs7XCIsXG4gICAgXCI4Mjg5XCI6IFwiQXBwbHlGdW5jdGlvbjtcIixcbiAgICBcIjgyOTBcIjogXCJpdDtcIixcbiAgICBcIjgyOTFcIjogXCJJbnZpc2libGVDb21tYTtcIixcbiAgICBcIjgzNjRcIjogXCJldXJvO1wiLFxuICAgIFwiODQxMVwiOiBcIlRyaXBsZURvdDtcIixcbiAgICBcIjg0MTJcIjogXCJEb3REb3Q7XCIsXG4gICAgXCI4NDUwXCI6IFwiQ29wZjtcIixcbiAgICBcIjg0NTNcIjogXCJpbmNhcmU7XCIsXG4gICAgXCI4NDU4XCI6IFwiZ3NjcjtcIixcbiAgICBcIjg0NTlcIjogXCJIc2NyO1wiLFxuICAgIFwiODQ2MFwiOiBcIlBvaW5jYXJlcGxhbmU7XCIsXG4gICAgXCI4NDYxXCI6IFwicXVhdGVybmlvbnM7XCIsXG4gICAgXCI4NDYyXCI6IFwicGxhbmNraDtcIixcbiAgICBcIjg0NjNcIjogXCJwbGFua3Y7XCIsXG4gICAgXCI4NDY0XCI6IFwiSXNjcjtcIixcbiAgICBcIjg0NjVcIjogXCJpbWFncGFydDtcIixcbiAgICBcIjg0NjZcIjogXCJMc2NyO1wiLFxuICAgIFwiODQ2N1wiOiBcImVsbDtcIixcbiAgICBcIjg0NjlcIjogXCJOb3BmO1wiLFxuICAgIFwiODQ3MFwiOiBcIm51bWVybztcIixcbiAgICBcIjg0NzFcIjogXCJjb3B5c3I7XCIsXG4gICAgXCI4NDcyXCI6IFwid3A7XCIsXG4gICAgXCI4NDczXCI6IFwicHJpbWVzO1wiLFxuICAgIFwiODQ3NFwiOiBcInJhdGlvbmFscztcIixcbiAgICBcIjg0NzVcIjogXCJSc2NyO1wiLFxuICAgIFwiODQ3NlwiOiBcIlJmcjtcIixcbiAgICBcIjg0NzdcIjogXCJSb3BmO1wiLFxuICAgIFwiODQ3OFwiOiBcInJ4O1wiLFxuICAgIFwiODQ4MlwiOiBcInRyYWRlO1wiLFxuICAgIFwiODQ4NFwiOiBcIlpvcGY7XCIsXG4gICAgXCI4NDg3XCI6IFwibWhvO1wiLFxuICAgIFwiODQ4OFwiOiBcIlpmcjtcIixcbiAgICBcIjg0ODlcIjogXCJpaW90YTtcIixcbiAgICBcIjg0OTJcIjogXCJCc2NyO1wiLFxuICAgIFwiODQ5M1wiOiBcIkNmcjtcIixcbiAgICBcIjg0OTVcIjogXCJlc2NyO1wiLFxuICAgIFwiODQ5NlwiOiBcImV4cGVjdGF0aW9uO1wiLFxuICAgIFwiODQ5N1wiOiBcIkZzY3I7XCIsXG4gICAgXCI4NDk5XCI6IFwicGhtbWF0O1wiLFxuICAgIFwiODUwMFwiOiBcIm9zY3I7XCIsXG4gICAgXCI4NTAxXCI6IFwiYWxlcGg7XCIsXG4gICAgXCI4NTAyXCI6IFwiYmV0aDtcIixcbiAgICBcIjg1MDNcIjogXCJnaW1lbDtcIixcbiAgICBcIjg1MDRcIjogXCJkYWxldGg7XCIsXG4gICAgXCI4NTE3XCI6IFwiREQ7XCIsXG4gICAgXCI4NTE4XCI6IFwiRGlmZmVyZW50aWFsRDtcIixcbiAgICBcIjg1MTlcIjogXCJleHBvbmVudGlhbGU7XCIsXG4gICAgXCI4NTIwXCI6IFwiSW1hZ2luYXJ5STtcIixcbiAgICBcIjg1MzFcIjogXCJmcmFjMTM7XCIsXG4gICAgXCI4NTMyXCI6IFwiZnJhYzIzO1wiLFxuICAgIFwiODUzM1wiOiBcImZyYWMxNTtcIixcbiAgICBcIjg1MzRcIjogXCJmcmFjMjU7XCIsXG4gICAgXCI4NTM1XCI6IFwiZnJhYzM1O1wiLFxuICAgIFwiODUzNlwiOiBcImZyYWM0NTtcIixcbiAgICBcIjg1MzdcIjogXCJmcmFjMTY7XCIsXG4gICAgXCI4NTM4XCI6IFwiZnJhYzU2O1wiLFxuICAgIFwiODUzOVwiOiBcImZyYWMxODtcIixcbiAgICBcIjg1NDBcIjogXCJmcmFjMzg7XCIsXG4gICAgXCI4NTQxXCI6IFwiZnJhYzU4O1wiLFxuICAgIFwiODU0MlwiOiBcImZyYWM3ODtcIixcbiAgICBcIjg1OTJcIjogXCJzbGFycjtcIixcbiAgICBcIjg1OTNcIjogXCJ1cGFycm93O1wiLFxuICAgIFwiODU5NFwiOiBcInNyYXJyO1wiLFxuICAgIFwiODU5NVwiOiBcIlNob3J0RG93bkFycm93O1wiLFxuICAgIFwiODU5NlwiOiBcImxlZnRyaWdodGFycm93O1wiLFxuICAgIFwiODU5N1wiOiBcInZhcnI7XCIsXG4gICAgXCI4NTk4XCI6IFwiVXBwZXJMZWZ0QXJyb3c7XCIsXG4gICAgXCI4NTk5XCI6IFwiVXBwZXJSaWdodEFycm93O1wiLFxuICAgIFwiODYwMFwiOiBcInNlYXJyb3c7XCIsXG4gICAgXCI4NjAxXCI6IFwic3dhcnJvdztcIixcbiAgICBcIjg2MDJcIjogXCJubGVmdGFycm93O1wiLFxuICAgIFwiODYwM1wiOiBcIm5yaWdodGFycm93O1wiLFxuICAgIFwiODYwNVwiOiBcInJpZ2h0c3F1aWdhcnJvdztcIixcbiAgICBcIjg2MDZcIjogXCJ0d29oZWFkbGVmdGFycm93O1wiLFxuICAgIFwiODYwN1wiOiBcIlVhcnI7XCIsXG4gICAgXCI4NjA4XCI6IFwidHdvaGVhZHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjA5XCI6IFwiRGFycjtcIixcbiAgICBcIjg2MTBcIjogXCJsZWZ0YXJyb3d0YWlsO1wiLFxuICAgIFwiODYxMVwiOiBcInJpZ2h0YXJyb3d0YWlsO1wiLFxuICAgIFwiODYxMlwiOiBcIm1hcHN0b2xlZnQ7XCIsXG4gICAgXCI4NjEzXCI6IFwiVXBUZWVBcnJvdztcIixcbiAgICBcIjg2MTRcIjogXCJSaWdodFRlZUFycm93O1wiLFxuICAgIFwiODYxNVwiOiBcIm1hcHN0b2Rvd247XCIsXG4gICAgXCI4NjE3XCI6IFwibGFycmhrO1wiLFxuICAgIFwiODYxOFwiOiBcInJhcnJoaztcIixcbiAgICBcIjg2MTlcIjogXCJsb29wYXJyb3dsZWZ0O1wiLFxuICAgIFwiODYyMFwiOiBcInJhcnJscDtcIixcbiAgICBcIjg2MjFcIjogXCJsZWZ0cmlnaHRzcXVpZ2Fycm93O1wiLFxuICAgIFwiODYyMlwiOiBcIm5sZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2MjRcIjogXCJsc2g7XCIsXG4gICAgXCI4NjI1XCI6IFwicnNoO1wiLFxuICAgIFwiODYyNlwiOiBcImxkc2g7XCIsXG4gICAgXCI4NjI3XCI6IFwicmRzaDtcIixcbiAgICBcIjg2MjlcIjogXCJjcmFycjtcIixcbiAgICBcIjg2MzBcIjogXCJjdXJ2ZWFycm93bGVmdDtcIixcbiAgICBcIjg2MzFcIjogXCJjdXJ2ZWFycm93cmlnaHQ7XCIsXG4gICAgXCI4NjM0XCI6IFwib2xhcnI7XCIsXG4gICAgXCI4NjM1XCI6IFwib3JhcnI7XCIsXG4gICAgXCI4NjM2XCI6IFwibGhhcnU7XCIsXG4gICAgXCI4NjM3XCI6IFwibGhhcmQ7XCIsXG4gICAgXCI4NjM4XCI6IFwidXBoYXJwb29ucmlnaHQ7XCIsXG4gICAgXCI4NjM5XCI6IFwidXBoYXJwb29ubGVmdDtcIixcbiAgICBcIjg2NDBcIjogXCJSaWdodFZlY3RvcjtcIixcbiAgICBcIjg2NDFcIjogXCJyaWdodGhhcnBvb25kb3duO1wiLFxuICAgIFwiODY0MlwiOiBcIlJpZ2h0RG93blZlY3RvcjtcIixcbiAgICBcIjg2NDNcIjogXCJMZWZ0RG93blZlY3RvcjtcIixcbiAgICBcIjg2NDRcIjogXCJybGFycjtcIixcbiAgICBcIjg2NDVcIjogXCJVcEFycm93RG93bkFycm93O1wiLFxuICAgIFwiODY0NlwiOiBcImxyYXJyO1wiLFxuICAgIFwiODY0N1wiOiBcImxsYXJyO1wiLFxuICAgIFwiODY0OFwiOiBcInV1YXJyO1wiLFxuICAgIFwiODY0OVwiOiBcInJyYXJyO1wiLFxuICAgIFwiODY1MFwiOiBcImRvd25kb3duYXJyb3dzO1wiLFxuICAgIFwiODY1MVwiOiBcIlJldmVyc2VFcXVpbGlicml1bTtcIixcbiAgICBcIjg2NTJcIjogXCJybGhhcjtcIixcbiAgICBcIjg2NTNcIjogXCJuTGVmdGFycm93O1wiLFxuICAgIFwiODY1NFwiOiBcIm5MZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTVcIjogXCJuUmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTZcIjogXCJMZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjU3XCI6IFwiVXBhcnJvdztcIixcbiAgICBcIjg2NThcIjogXCJSaWdodGFycm93O1wiLFxuICAgIFwiODY1OVwiOiBcIkRvd25hcnJvdztcIixcbiAgICBcIjg2NjBcIjogXCJMZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg2NjFcIjogXCJ2QXJyO1wiLFxuICAgIFwiODY2MlwiOiBcIm53QXJyO1wiLFxuICAgIFwiODY2M1wiOiBcIm5lQXJyO1wiLFxuICAgIFwiODY2NFwiOiBcInNlQXJyO1wiLFxuICAgIFwiODY2NVwiOiBcInN3QXJyO1wiLFxuICAgIFwiODY2NlwiOiBcIkxsZWZ0YXJyb3c7XCIsXG4gICAgXCI4NjY3XCI6IFwiUnJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjY5XCI6IFwiemlncmFycjtcIixcbiAgICBcIjg2NzZcIjogXCJMZWZ0QXJyb3dCYXI7XCIsXG4gICAgXCI4Njc3XCI6IFwiUmlnaHRBcnJvd0JhcjtcIixcbiAgICBcIjg2OTNcIjogXCJkdWFycjtcIixcbiAgICBcIjg3MDFcIjogXCJsb2FycjtcIixcbiAgICBcIjg3MDJcIjogXCJyb2FycjtcIixcbiAgICBcIjg3MDNcIjogXCJob2FycjtcIixcbiAgICBcIjg3MDRcIjogXCJmb3JhbGw7XCIsXG4gICAgXCI4NzA1XCI6IFwiY29tcGxlbWVudDtcIixcbiAgICBcIjg3MDZcIjogXCJQYXJ0aWFsRDtcIixcbiAgICBcIjg3MDdcIjogXCJFeGlzdHM7XCIsXG4gICAgXCI4NzA4XCI6IFwiTm90RXhpc3RzO1wiLFxuICAgIFwiODcwOVwiOiBcInZhcm5vdGhpbmc7XCIsXG4gICAgXCI4NzExXCI6IFwibmFibGE7XCIsXG4gICAgXCI4NzEyXCI6IFwiaXNpbnY7XCIsXG4gICAgXCI4NzEzXCI6IFwibm90aW52YTtcIixcbiAgICBcIjg3MTVcIjogXCJTdWNoVGhhdDtcIixcbiAgICBcIjg3MTZcIjogXCJOb3RSZXZlcnNlRWxlbWVudDtcIixcbiAgICBcIjg3MTlcIjogXCJQcm9kdWN0O1wiLFxuICAgIFwiODcyMFwiOiBcIkNvcHJvZHVjdDtcIixcbiAgICBcIjg3MjFcIjogXCJzdW07XCIsXG4gICAgXCI4NzIyXCI6IFwibWludXM7XCIsXG4gICAgXCI4NzIzXCI6IFwibXA7XCIsXG4gICAgXCI4NzI0XCI6IFwicGx1c2RvO1wiLFxuICAgIFwiODcyNlwiOiBcInNzZXRtbjtcIixcbiAgICBcIjg3MjdcIjogXCJsb3dhc3Q7XCIsXG4gICAgXCI4NzI4XCI6IFwiU21hbGxDaXJjbGU7XCIsXG4gICAgXCI4NzMwXCI6IFwiU3FydDtcIixcbiAgICBcIjg3MzNcIjogXCJ2cHJvcDtcIixcbiAgICBcIjg3MzRcIjogXCJpbmZpbjtcIixcbiAgICBcIjg3MzVcIjogXCJhbmdydDtcIixcbiAgICBcIjg3MzZcIjogXCJhbmdsZTtcIixcbiAgICBcIjg3MzdcIjogXCJtZWFzdXJlZGFuZ2xlO1wiLFxuICAgIFwiODczOFwiOiBcImFuZ3NwaDtcIixcbiAgICBcIjg3MzlcIjogXCJWZXJ0aWNhbEJhcjtcIixcbiAgICBcIjg3NDBcIjogXCJuc21pZDtcIixcbiAgICBcIjg3NDFcIjogXCJzcGFyO1wiLFxuICAgIFwiODc0MlwiOiBcIm5zcGFyO1wiLFxuICAgIFwiODc0M1wiOiBcIndlZGdlO1wiLFxuICAgIFwiODc0NFwiOiBcInZlZTtcIixcbiAgICBcIjg3NDVcIjogXCJjYXA7XCIsXG4gICAgXCI4NzQ2XCI6IFwiY3VwO1wiLFxuICAgIFwiODc0N1wiOiBcIkludGVncmFsO1wiLFxuICAgIFwiODc0OFwiOiBcIkludDtcIixcbiAgICBcIjg3NDlcIjogXCJ0aW50O1wiLFxuICAgIFwiODc1MFwiOiBcIm9pbnQ7XCIsXG4gICAgXCI4NzUxXCI6IFwiRG91YmxlQ29udG91ckludGVncmFsO1wiLFxuICAgIFwiODc1MlwiOiBcIkNjb25pbnQ7XCIsXG4gICAgXCI4NzUzXCI6IFwiY3dpbnQ7XCIsXG4gICAgXCI4NzU0XCI6IFwiY3djb25pbnQ7XCIsXG4gICAgXCI4NzU1XCI6IFwiQ291bnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NTZcIjogXCJ0aGVyZWZvcmU7XCIsXG4gICAgXCI4NzU3XCI6IFwiYmVjYXVzZTtcIixcbiAgICBcIjg3NThcIjogXCJyYXRpbztcIixcbiAgICBcIjg3NTlcIjogXCJQcm9wb3J0aW9uO1wiLFxuICAgIFwiODc2MFwiOiBcIm1pbnVzZDtcIixcbiAgICBcIjg3NjJcIjogXCJtRERvdDtcIixcbiAgICBcIjg3NjNcIjogXCJob210aHQ7XCIsXG4gICAgXCI4NzY0XCI6IFwiVGlsZGU7XCIsXG4gICAgXCI4NzY1XCI6IFwiYnNpbTtcIixcbiAgICBcIjg3NjZcIjogXCJtc3Rwb3M7XCIsXG4gICAgXCI4NzY3XCI6IFwiYWNkO1wiLFxuICAgIFwiODc2OFwiOiBcIndyZWF0aDtcIixcbiAgICBcIjg3NjlcIjogXCJuc2ltO1wiLFxuICAgIFwiODc3MFwiOiBcImVzaW07XCIsXG4gICAgXCI4NzcxXCI6IFwiVGlsZGVFcXVhbDtcIixcbiAgICBcIjg3NzJcIjogXCJuc2ltZXE7XCIsXG4gICAgXCI4NzczXCI6IFwiVGlsZGVGdWxsRXF1YWw7XCIsXG4gICAgXCI4Nzc0XCI6IFwic2ltbmU7XCIsXG4gICAgXCI4Nzc1XCI6IFwiTm90VGlsZGVGdWxsRXF1YWw7XCIsXG4gICAgXCI4Nzc2XCI6IFwiVGlsZGVUaWxkZTtcIixcbiAgICBcIjg3NzdcIjogXCJOb3RUaWxkZVRpbGRlO1wiLFxuICAgIFwiODc3OFwiOiBcImFwcHJveGVxO1wiLFxuICAgIFwiODc3OVwiOiBcImFwaWQ7XCIsXG4gICAgXCI4NzgwXCI6IFwiYmNvbmc7XCIsXG4gICAgXCI4NzgxXCI6IFwiQ3VwQ2FwO1wiLFxuICAgIFwiODc4MlwiOiBcIkh1bXBEb3duSHVtcDtcIixcbiAgICBcIjg3ODNcIjogXCJIdW1wRXF1YWw7XCIsXG4gICAgXCI4Nzg0XCI6IFwiZXNkb3Q7XCIsXG4gICAgXCI4Nzg1XCI6IFwiZURvdDtcIixcbiAgICBcIjg3ODZcIjogXCJmYWxsaW5nZG90c2VxO1wiLFxuICAgIFwiODc4N1wiOiBcInJpc2luZ2RvdHNlcTtcIixcbiAgICBcIjg3ODhcIjogXCJjb2xvbmVxO1wiLFxuICAgIFwiODc4OVwiOiBcImVxY29sb247XCIsXG4gICAgXCI4NzkwXCI6IFwiZXFjaXJjO1wiLFxuICAgIFwiODc5MVwiOiBcImNpcmU7XCIsXG4gICAgXCI4NzkzXCI6IFwid2VkZ2VxO1wiLFxuICAgIFwiODc5NFwiOiBcInZlZWVxO1wiLFxuICAgIFwiODc5NlwiOiBcInRyaWU7XCIsXG4gICAgXCI4Nzk5XCI6IFwicXVlc3RlcTtcIixcbiAgICBcIjg4MDBcIjogXCJOb3RFcXVhbDtcIixcbiAgICBcIjg4MDFcIjogXCJlcXVpdjtcIixcbiAgICBcIjg4MDJcIjogXCJOb3RDb25ncnVlbnQ7XCIsXG4gICAgXCI4ODA0XCI6IFwibGVxO1wiLFxuICAgIFwiODgwNVwiOiBcIkdyZWF0ZXJFcXVhbDtcIixcbiAgICBcIjg4MDZcIjogXCJMZXNzRnVsbEVxdWFsO1wiLFxuICAgIFwiODgwN1wiOiBcIkdyZWF0ZXJGdWxsRXF1YWw7XCIsXG4gICAgXCI4ODA4XCI6IFwibG5lcXE7XCIsXG4gICAgXCI4ODA5XCI6IFwiZ25lcXE7XCIsXG4gICAgXCI4ODEwXCI6IFwiTmVzdGVkTGVzc0xlc3M7XCIsXG4gICAgXCI4ODExXCI6IFwiTmVzdGVkR3JlYXRlckdyZWF0ZXI7XCIsXG4gICAgXCI4ODEyXCI6IFwidHdpeHQ7XCIsXG4gICAgXCI4ODEzXCI6IFwiTm90Q3VwQ2FwO1wiLFxuICAgIFwiODgxNFwiOiBcIk5vdExlc3M7XCIsXG4gICAgXCI4ODE1XCI6IFwiTm90R3JlYXRlcjtcIixcbiAgICBcIjg4MTZcIjogXCJOb3RMZXNzRXF1YWw7XCIsXG4gICAgXCI4ODE3XCI6IFwiTm90R3JlYXRlckVxdWFsO1wiLFxuICAgIFwiODgxOFwiOiBcImxzaW07XCIsXG4gICAgXCI4ODE5XCI6IFwiZ3Ryc2ltO1wiLFxuICAgIFwiODgyMFwiOiBcIk5vdExlc3NUaWxkZTtcIixcbiAgICBcIjg4MjFcIjogXCJOb3RHcmVhdGVyVGlsZGU7XCIsXG4gICAgXCI4ODIyXCI6IFwibGc7XCIsXG4gICAgXCI4ODIzXCI6IFwiZ3RybGVzcztcIixcbiAgICBcIjg4MjRcIjogXCJudGxnO1wiLFxuICAgIFwiODgyNVwiOiBcIm50Z2w7XCIsXG4gICAgXCI4ODI2XCI6IFwiUHJlY2VkZXM7XCIsXG4gICAgXCI4ODI3XCI6IFwiU3VjY2VlZHM7XCIsXG4gICAgXCI4ODI4XCI6IFwiUHJlY2VkZXNTbGFudEVxdWFsO1wiLFxuICAgIFwiODgyOVwiOiBcIlN1Y2NlZWRzU2xhbnRFcXVhbDtcIixcbiAgICBcIjg4MzBcIjogXCJwcnNpbTtcIixcbiAgICBcIjg4MzFcIjogXCJzdWNjc2ltO1wiLFxuICAgIFwiODgzMlwiOiBcIm5wcmVjO1wiLFxuICAgIFwiODgzM1wiOiBcIm5zdWNjO1wiLFxuICAgIFwiODgzNFwiOiBcInN1YnNldDtcIixcbiAgICBcIjg4MzVcIjogXCJzdXBzZXQ7XCIsXG4gICAgXCI4ODM2XCI6IFwibnN1YjtcIixcbiAgICBcIjg4MzdcIjogXCJuc3VwO1wiLFxuICAgIFwiODgzOFwiOiBcIlN1YnNldEVxdWFsO1wiLFxuICAgIFwiODgzOVwiOiBcInN1cHNldGVxO1wiLFxuICAgIFwiODg0MFwiOiBcIm5zdWJzZXRlcTtcIixcbiAgICBcIjg4NDFcIjogXCJuc3Vwc2V0ZXE7XCIsXG4gICAgXCI4ODQyXCI6IFwic3Vic2V0bmVxO1wiLFxuICAgIFwiODg0M1wiOiBcInN1cHNldG5lcTtcIixcbiAgICBcIjg4NDVcIjogXCJjdXBkb3Q7XCIsXG4gICAgXCI4ODQ2XCI6IFwidXBsdXM7XCIsXG4gICAgXCI4ODQ3XCI6IFwiU3F1YXJlU3Vic2V0O1wiLFxuICAgIFwiODg0OFwiOiBcIlNxdWFyZVN1cGVyc2V0O1wiLFxuICAgIFwiODg0OVwiOiBcIlNxdWFyZVN1YnNldEVxdWFsO1wiLFxuICAgIFwiODg1MFwiOiBcIlNxdWFyZVN1cGVyc2V0RXF1YWw7XCIsXG4gICAgXCI4ODUxXCI6IFwiU3F1YXJlSW50ZXJzZWN0aW9uO1wiLFxuICAgIFwiODg1MlwiOiBcIlNxdWFyZVVuaW9uO1wiLFxuICAgIFwiODg1M1wiOiBcIm9wbHVzO1wiLFxuICAgIFwiODg1NFwiOiBcIm9taW51cztcIixcbiAgICBcIjg4NTVcIjogXCJvdGltZXM7XCIsXG4gICAgXCI4ODU2XCI6IFwib3NvbDtcIixcbiAgICBcIjg4NTdcIjogXCJvZG90O1wiLFxuICAgIFwiODg1OFwiOiBcIm9jaXI7XCIsXG4gICAgXCI4ODU5XCI6IFwib2FzdDtcIixcbiAgICBcIjg4NjFcIjogXCJvZGFzaDtcIixcbiAgICBcIjg4NjJcIjogXCJwbHVzYjtcIixcbiAgICBcIjg4NjNcIjogXCJtaW51c2I7XCIsXG4gICAgXCI4ODY0XCI6IFwidGltZXNiO1wiLFxuICAgIFwiODg2NVwiOiBcInNkb3RiO1wiLFxuICAgIFwiODg2NlwiOiBcInZkYXNoO1wiLFxuICAgIFwiODg2N1wiOiBcIkxlZnRUZWU7XCIsXG4gICAgXCI4ODY4XCI6IFwidG9wO1wiLFxuICAgIFwiODg2OVwiOiBcIlVwVGVlO1wiLFxuICAgIFwiODg3MVwiOiBcIm1vZGVscztcIixcbiAgICBcIjg4NzJcIjogXCJ2RGFzaDtcIixcbiAgICBcIjg4NzNcIjogXCJWZGFzaDtcIixcbiAgICBcIjg4NzRcIjogXCJWdmRhc2g7XCIsXG4gICAgXCI4ODc1XCI6IFwiVkRhc2g7XCIsXG4gICAgXCI4ODc2XCI6IFwibnZkYXNoO1wiLFxuICAgIFwiODg3N1wiOiBcIm52RGFzaDtcIixcbiAgICBcIjg4NzhcIjogXCJuVmRhc2g7XCIsXG4gICAgXCI4ODc5XCI6IFwiblZEYXNoO1wiLFxuICAgIFwiODg4MFwiOiBcInBydXJlbDtcIixcbiAgICBcIjg4ODJcIjogXCJ2bHRyaTtcIixcbiAgICBcIjg4ODNcIjogXCJ2cnRyaTtcIixcbiAgICBcIjg4ODRcIjogXCJ0cmlhbmdsZWxlZnRlcTtcIixcbiAgICBcIjg4ODVcIjogXCJ0cmlhbmdsZXJpZ2h0ZXE7XCIsXG4gICAgXCI4ODg2XCI6IFwib3JpZ29mO1wiLFxuICAgIFwiODg4N1wiOiBcImltb2Y7XCIsXG4gICAgXCI4ODg4XCI6IFwibXVtYXA7XCIsXG4gICAgXCI4ODg5XCI6IFwiaGVyY29uO1wiLFxuICAgIFwiODg5MFwiOiBcImludGVyY2FsO1wiLFxuICAgIFwiODg5MVwiOiBcInZlZWJhcjtcIixcbiAgICBcIjg4OTNcIjogXCJiYXJ2ZWU7XCIsXG4gICAgXCI4ODk0XCI6IFwiYW5ncnR2YjtcIixcbiAgICBcIjg4OTVcIjogXCJscnRyaTtcIixcbiAgICBcIjg4OTZcIjogXCJ4d2VkZ2U7XCIsXG4gICAgXCI4ODk3XCI6IFwieHZlZTtcIixcbiAgICBcIjg4OThcIjogXCJ4Y2FwO1wiLFxuICAgIFwiODg5OVwiOiBcInhjdXA7XCIsXG4gICAgXCI4OTAwXCI6IFwiZGlhbW9uZDtcIixcbiAgICBcIjg5MDFcIjogXCJzZG90O1wiLFxuICAgIFwiODkwMlwiOiBcIlN0YXI7XCIsXG4gICAgXCI4OTAzXCI6IFwiZGl2b254O1wiLFxuICAgIFwiODkwNFwiOiBcImJvd3RpZTtcIixcbiAgICBcIjg5MDVcIjogXCJsdGltZXM7XCIsXG4gICAgXCI4OTA2XCI6IFwicnRpbWVzO1wiLFxuICAgIFwiODkwN1wiOiBcImx0aHJlZTtcIixcbiAgICBcIjg5MDhcIjogXCJydGhyZWU7XCIsXG4gICAgXCI4OTA5XCI6IFwiYnNpbWU7XCIsXG4gICAgXCI4OTEwXCI6IFwiY3V2ZWU7XCIsXG4gICAgXCI4OTExXCI6IFwiY3V3ZWQ7XCIsXG4gICAgXCI4OTEyXCI6IFwiU3Vic2V0O1wiLFxuICAgIFwiODkxM1wiOiBcIlN1cHNldDtcIixcbiAgICBcIjg5MTRcIjogXCJDYXA7XCIsXG4gICAgXCI4OTE1XCI6IFwiQ3VwO1wiLFxuICAgIFwiODkxNlwiOiBcInBpdGNoZm9yaztcIixcbiAgICBcIjg5MTdcIjogXCJlcGFyO1wiLFxuICAgIFwiODkxOFwiOiBcImx0ZG90O1wiLFxuICAgIFwiODkxOVwiOiBcImd0cmRvdDtcIixcbiAgICBcIjg5MjBcIjogXCJMbDtcIixcbiAgICBcIjg5MjFcIjogXCJnZ2c7XCIsXG4gICAgXCI4OTIyXCI6IFwiTGVzc0VxdWFsR3JlYXRlcjtcIixcbiAgICBcIjg5MjNcIjogXCJndHJlcWxlc3M7XCIsXG4gICAgXCI4OTI2XCI6IFwiY3VybHllcXByZWM7XCIsXG4gICAgXCI4OTI3XCI6IFwiY3VybHllcXN1Y2M7XCIsXG4gICAgXCI4OTI4XCI6IFwibnByY3VlO1wiLFxuICAgIFwiODkyOVwiOiBcIm5zY2N1ZTtcIixcbiAgICBcIjg5MzBcIjogXCJuc3FzdWJlO1wiLFxuICAgIFwiODkzMVwiOiBcIm5zcXN1cGU7XCIsXG4gICAgXCI4OTM0XCI6IFwibG5zaW07XCIsXG4gICAgXCI4OTM1XCI6IFwiZ25zaW07XCIsXG4gICAgXCI4OTM2XCI6IFwicHJuc2ltO1wiLFxuICAgIFwiODkzN1wiOiBcInN1Y2Nuc2ltO1wiLFxuICAgIFwiODkzOFwiOiBcIm50cmlhbmdsZWxlZnQ7XCIsXG4gICAgXCI4OTM5XCI6IFwibnRyaWFuZ2xlcmlnaHQ7XCIsXG4gICAgXCI4OTQwXCI6IFwibnRyaWFuZ2xlbGVmdGVxO1wiLFxuICAgIFwiODk0MVwiOiBcIm50cmlhbmdsZXJpZ2h0ZXE7XCIsXG4gICAgXCI4OTQyXCI6IFwidmVsbGlwO1wiLFxuICAgIFwiODk0M1wiOiBcImN0ZG90O1wiLFxuICAgIFwiODk0NFwiOiBcInV0ZG90O1wiLFxuICAgIFwiODk0NVwiOiBcImR0ZG90O1wiLFxuICAgIFwiODk0NlwiOiBcImRpc2luO1wiLFxuICAgIFwiODk0N1wiOiBcImlzaW5zdjtcIixcbiAgICBcIjg5NDhcIjogXCJpc2lucztcIixcbiAgICBcIjg5NDlcIjogXCJpc2luZG90O1wiLFxuICAgIFwiODk1MFwiOiBcIm5vdGludmM7XCIsXG4gICAgXCI4OTUxXCI6IFwibm90aW52YjtcIixcbiAgICBcIjg5NTNcIjogXCJpc2luRTtcIixcbiAgICBcIjg5NTRcIjogXCJuaXNkO1wiLFxuICAgIFwiODk1NVwiOiBcInhuaXM7XCIsXG4gICAgXCI4OTU2XCI6IFwibmlzO1wiLFxuICAgIFwiODk1N1wiOiBcIm5vdG5pdmM7XCIsXG4gICAgXCI4OTU4XCI6IFwibm90bml2YjtcIixcbiAgICBcIjg5NjVcIjogXCJiYXJ3ZWRnZTtcIixcbiAgICBcIjg5NjZcIjogXCJkb3VibGViYXJ3ZWRnZTtcIixcbiAgICBcIjg5NjhcIjogXCJMZWZ0Q2VpbGluZztcIixcbiAgICBcIjg5NjlcIjogXCJSaWdodENlaWxpbmc7XCIsXG4gICAgXCI4OTcwXCI6IFwibGZsb29yO1wiLFxuICAgIFwiODk3MVwiOiBcIlJpZ2h0Rmxvb3I7XCIsXG4gICAgXCI4OTcyXCI6IFwiZHJjcm9wO1wiLFxuICAgIFwiODk3M1wiOiBcImRsY3JvcDtcIixcbiAgICBcIjg5NzRcIjogXCJ1cmNyb3A7XCIsXG4gICAgXCI4OTc1XCI6IFwidWxjcm9wO1wiLFxuICAgIFwiODk3NlwiOiBcImJub3Q7XCIsXG4gICAgXCI4OTc4XCI6IFwicHJvZmxpbmU7XCIsXG4gICAgXCI4OTc5XCI6IFwicHJvZnN1cmY7XCIsXG4gICAgXCI4OTgxXCI6IFwidGVscmVjO1wiLFxuICAgIFwiODk4MlwiOiBcInRhcmdldDtcIixcbiAgICBcIjg5ODhcIjogXCJ1bGNvcm5lcjtcIixcbiAgICBcIjg5ODlcIjogXCJ1cmNvcm5lcjtcIixcbiAgICBcIjg5OTBcIjogXCJsbGNvcm5lcjtcIixcbiAgICBcIjg5OTFcIjogXCJscmNvcm5lcjtcIixcbiAgICBcIjg5OTRcIjogXCJzZnJvd247XCIsXG4gICAgXCI4OTk1XCI6IFwic3NtaWxlO1wiLFxuICAgIFwiOTAwNVwiOiBcImN5bGN0eTtcIixcbiAgICBcIjkwMDZcIjogXCJwcm9mYWxhcjtcIixcbiAgICBcIjkwMTRcIjogXCJ0b3Bib3Q7XCIsXG4gICAgXCI5MDIxXCI6IFwib3ZiYXI7XCIsXG4gICAgXCI5MDIzXCI6IFwic29sYmFyO1wiLFxuICAgIFwiOTA4NFwiOiBcImFuZ3phcnI7XCIsXG4gICAgXCI5MTM2XCI6IFwibG1vdXN0YWNoZTtcIixcbiAgICBcIjkxMzdcIjogXCJybW91c3RhY2hlO1wiLFxuICAgIFwiOTE0MFwiOiBcInRicms7XCIsXG4gICAgXCI5MTQxXCI6IFwiVW5kZXJCcmFja2V0O1wiLFxuICAgIFwiOTE0MlwiOiBcImJicmt0YnJrO1wiLFxuICAgIFwiOTE4MFwiOiBcIk92ZXJQYXJlbnRoZXNpcztcIixcbiAgICBcIjkxODFcIjogXCJVbmRlclBhcmVudGhlc2lzO1wiLFxuICAgIFwiOTE4MlwiOiBcIk92ZXJCcmFjZTtcIixcbiAgICBcIjkxODNcIjogXCJVbmRlckJyYWNlO1wiLFxuICAgIFwiOTE4NlwiOiBcInRycGV6aXVtO1wiLFxuICAgIFwiOTE5MVwiOiBcImVsaW50ZXJzO1wiLFxuICAgIFwiOTI1MVwiOiBcImJsYW5rO1wiLFxuICAgIFwiOTQxNlwiOiBcIm9TO1wiLFxuICAgIFwiOTQ3MlwiOiBcIkhvcml6b250YWxMaW5lO1wiLFxuICAgIFwiOTQ3NFwiOiBcImJveHY7XCIsXG4gICAgXCI5NDg0XCI6IFwiYm94ZHI7XCIsXG4gICAgXCI5NDg4XCI6IFwiYm94ZGw7XCIsXG4gICAgXCI5NDkyXCI6IFwiYm94dXI7XCIsXG4gICAgXCI5NDk2XCI6IFwiYm94dWw7XCIsXG4gICAgXCI5NTAwXCI6IFwiYm94dnI7XCIsXG4gICAgXCI5NTA4XCI6IFwiYm94dmw7XCIsXG4gICAgXCI5NTE2XCI6IFwiYm94aGQ7XCIsXG4gICAgXCI5NTI0XCI6IFwiYm94aHU7XCIsXG4gICAgXCI5NTMyXCI6IFwiYm94dmg7XCIsXG4gICAgXCI5NTUyXCI6IFwiYm94SDtcIixcbiAgICBcIjk1NTNcIjogXCJib3hWO1wiLFxuICAgIFwiOTU1NFwiOiBcImJveGRSO1wiLFxuICAgIFwiOTU1NVwiOiBcImJveERyO1wiLFxuICAgIFwiOTU1NlwiOiBcImJveERSO1wiLFxuICAgIFwiOTU1N1wiOiBcImJveGRMO1wiLFxuICAgIFwiOTU1OFwiOiBcImJveERsO1wiLFxuICAgIFwiOTU1OVwiOiBcImJveERMO1wiLFxuICAgIFwiOTU2MFwiOiBcImJveHVSO1wiLFxuICAgIFwiOTU2MVwiOiBcImJveFVyO1wiLFxuICAgIFwiOTU2MlwiOiBcImJveFVSO1wiLFxuICAgIFwiOTU2M1wiOiBcImJveHVMO1wiLFxuICAgIFwiOTU2NFwiOiBcImJveFVsO1wiLFxuICAgIFwiOTU2NVwiOiBcImJveFVMO1wiLFxuICAgIFwiOTU2NlwiOiBcImJveHZSO1wiLFxuICAgIFwiOTU2N1wiOiBcImJveFZyO1wiLFxuICAgIFwiOTU2OFwiOiBcImJveFZSO1wiLFxuICAgIFwiOTU2OVwiOiBcImJveHZMO1wiLFxuICAgIFwiOTU3MFwiOiBcImJveFZsO1wiLFxuICAgIFwiOTU3MVwiOiBcImJveFZMO1wiLFxuICAgIFwiOTU3MlwiOiBcImJveEhkO1wiLFxuICAgIFwiOTU3M1wiOiBcImJveGhEO1wiLFxuICAgIFwiOTU3NFwiOiBcImJveEhEO1wiLFxuICAgIFwiOTU3NVwiOiBcImJveEh1O1wiLFxuICAgIFwiOTU3NlwiOiBcImJveGhVO1wiLFxuICAgIFwiOTU3N1wiOiBcImJveEhVO1wiLFxuICAgIFwiOTU3OFwiOiBcImJveHZIO1wiLFxuICAgIFwiOTU3OVwiOiBcImJveFZoO1wiLFxuICAgIFwiOTU4MFwiOiBcImJveFZIO1wiLFxuICAgIFwiOTYwMFwiOiBcInVoYmxrO1wiLFxuICAgIFwiOTYwNFwiOiBcImxoYmxrO1wiLFxuICAgIFwiOTYwOFwiOiBcImJsb2NrO1wiLFxuICAgIFwiOTYxN1wiOiBcImJsazE0O1wiLFxuICAgIFwiOTYxOFwiOiBcImJsazEyO1wiLFxuICAgIFwiOTYxOVwiOiBcImJsazM0O1wiLFxuICAgIFwiOTYzM1wiOiBcInNxdWFyZTtcIixcbiAgICBcIjk2NDJcIjogXCJzcXVmO1wiLFxuICAgIFwiOTY0M1wiOiBcIkVtcHR5VmVyeVNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTY0NVwiOiBcInJlY3Q7XCIsXG4gICAgXCI5NjQ2XCI6IFwibWFya2VyO1wiLFxuICAgIFwiOTY0OVwiOiBcImZsdG5zO1wiLFxuICAgIFwiOTY1MVwiOiBcInh1dHJpO1wiLFxuICAgIFwiOTY1MlwiOiBcInV0cmlmO1wiLFxuICAgIFwiOTY1M1wiOiBcInV0cmk7XCIsXG4gICAgXCI5NjU2XCI6IFwicnRyaWY7XCIsXG4gICAgXCI5NjU3XCI6IFwidHJpYW5nbGVyaWdodDtcIixcbiAgICBcIjk2NjFcIjogXCJ4ZHRyaTtcIixcbiAgICBcIjk2NjJcIjogXCJkdHJpZjtcIixcbiAgICBcIjk2NjNcIjogXCJ0cmlhbmdsZWRvd247XCIsXG4gICAgXCI5NjY2XCI6IFwibHRyaWY7XCIsXG4gICAgXCI5NjY3XCI6IFwidHJpYW5nbGVsZWZ0O1wiLFxuICAgIFwiOTY3NFwiOiBcImxvemVuZ2U7XCIsXG4gICAgXCI5Njc1XCI6IFwiY2lyO1wiLFxuICAgIFwiOTcwOFwiOiBcInRyaWRvdDtcIixcbiAgICBcIjk3MTFcIjogXCJ4Y2lyYztcIixcbiAgICBcIjk3MjBcIjogXCJ1bHRyaTtcIixcbiAgICBcIjk3MjFcIjogXCJ1cnRyaTtcIixcbiAgICBcIjk3MjJcIjogXCJsbHRyaTtcIixcbiAgICBcIjk3MjNcIjogXCJFbXB0eVNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTcyNFwiOiBcIkZpbGxlZFNtYWxsU3F1YXJlO1wiLFxuICAgIFwiOTczM1wiOiBcInN0YXJmO1wiLFxuICAgIFwiOTczNFwiOiBcInN0YXI7XCIsXG4gICAgXCI5NzQyXCI6IFwicGhvbmU7XCIsXG4gICAgXCI5NzkyXCI6IFwiZmVtYWxlO1wiLFxuICAgIFwiOTc5NFwiOiBcIm1hbGU7XCIsXG4gICAgXCI5ODI0XCI6IFwic3BhZGVzdWl0O1wiLFxuICAgIFwiOTgyN1wiOiBcImNsdWJzdWl0O1wiLFxuICAgIFwiOTgyOVwiOiBcImhlYXJ0c3VpdDtcIixcbiAgICBcIjk4MzBcIjogXCJkaWFtcztcIixcbiAgICBcIjk4MzRcIjogXCJzdW5nO1wiLFxuICAgIFwiOTgzN1wiOiBcImZsYXQ7XCIsXG4gICAgXCI5ODM4XCI6IFwibmF0dXJhbDtcIixcbiAgICBcIjk4MzlcIjogXCJzaGFycDtcIixcbiAgICBcIjEwMDAzXCI6IFwiY2hlY2ttYXJrO1wiLFxuICAgIFwiMTAwMDdcIjogXCJjcm9zcztcIixcbiAgICBcIjEwMDE2XCI6IFwibWFsdGVzZTtcIixcbiAgICBcIjEwMDM4XCI6IFwic2V4dDtcIixcbiAgICBcIjEwMDcyXCI6IFwiVmVydGljYWxTZXBhcmF0b3I7XCIsXG4gICAgXCIxMDA5OFwiOiBcImxiYnJrO1wiLFxuICAgIFwiMTAwOTlcIjogXCJyYmJyaztcIixcbiAgICBcIjEwMTg0XCI6IFwiYnNvbGhzdWI7XCIsXG4gICAgXCIxMDE4NVwiOiBcInN1cGhzb2w7XCIsXG4gICAgXCIxMDIxNFwiOiBcImxvYnJrO1wiLFxuICAgIFwiMTAyMTVcIjogXCJyb2JyaztcIixcbiAgICBcIjEwMjE2XCI6IFwiTGVmdEFuZ2xlQnJhY2tldDtcIixcbiAgICBcIjEwMjE3XCI6IFwiUmlnaHRBbmdsZUJyYWNrZXQ7XCIsXG4gICAgXCIxMDIxOFwiOiBcIkxhbmc7XCIsXG4gICAgXCIxMDIxOVwiOiBcIlJhbmc7XCIsXG4gICAgXCIxMDIyMFwiOiBcImxvYW5nO1wiLFxuICAgIFwiMTAyMjFcIjogXCJyb2FuZztcIixcbiAgICBcIjEwMjI5XCI6IFwieGxhcnI7XCIsXG4gICAgXCIxMDIzMFwiOiBcInhyYXJyO1wiLFxuICAgIFwiMTAyMzFcIjogXCJ4aGFycjtcIixcbiAgICBcIjEwMjMyXCI6IFwieGxBcnI7XCIsXG4gICAgXCIxMDIzM1wiOiBcInhyQXJyO1wiLFxuICAgIFwiMTAyMzRcIjogXCJ4aEFycjtcIixcbiAgICBcIjEwMjM2XCI6IFwieG1hcDtcIixcbiAgICBcIjEwMjM5XCI6IFwiZHppZ3JhcnI7XCIsXG4gICAgXCIxMDQ5OFwiOiBcIm52bEFycjtcIixcbiAgICBcIjEwNDk5XCI6IFwibnZyQXJyO1wiLFxuICAgIFwiMTA1MDBcIjogXCJudkhhcnI7XCIsXG4gICAgXCIxMDUwMVwiOiBcIk1hcDtcIixcbiAgICBcIjEwNTA4XCI6IFwibGJhcnI7XCIsXG4gICAgXCIxMDUwOVwiOiBcInJiYXJyO1wiLFxuICAgIFwiMTA1MTBcIjogXCJsQmFycjtcIixcbiAgICBcIjEwNTExXCI6IFwickJhcnI7XCIsXG4gICAgXCIxMDUxMlwiOiBcIlJCYXJyO1wiLFxuICAgIFwiMTA1MTNcIjogXCJERG90cmFoZDtcIixcbiAgICBcIjEwNTE0XCI6IFwiVXBBcnJvd0JhcjtcIixcbiAgICBcIjEwNTE1XCI6IFwiRG93bkFycm93QmFyO1wiLFxuICAgIFwiMTA1MThcIjogXCJSYXJydGw7XCIsXG4gICAgXCIxMDUyMVwiOiBcImxhdGFpbDtcIixcbiAgICBcIjEwNTIyXCI6IFwicmF0YWlsO1wiLFxuICAgIFwiMTA1MjNcIjogXCJsQXRhaWw7XCIsXG4gICAgXCIxMDUyNFwiOiBcInJBdGFpbDtcIixcbiAgICBcIjEwNTI1XCI6IFwibGFycmZzO1wiLFxuICAgIFwiMTA1MjZcIjogXCJyYXJyZnM7XCIsXG4gICAgXCIxMDUyN1wiOiBcImxhcnJiZnM7XCIsXG4gICAgXCIxMDUyOFwiOiBcInJhcnJiZnM7XCIsXG4gICAgXCIxMDUzMVwiOiBcIm53YXJoaztcIixcbiAgICBcIjEwNTMyXCI6IFwibmVhcmhrO1wiLFxuICAgIFwiMTA1MzNcIjogXCJzZWFyaGs7XCIsXG4gICAgXCIxMDUzNFwiOiBcInN3YXJoaztcIixcbiAgICBcIjEwNTM1XCI6IFwibnduZWFyO1wiLFxuICAgIFwiMTA1MzZcIjogXCJ0b2VhO1wiLFxuICAgIFwiMTA1MzdcIjogXCJ0b3NhO1wiLFxuICAgIFwiMTA1MzhcIjogXCJzd253YXI7XCIsXG4gICAgXCIxMDU0N1wiOiBcInJhcnJjO1wiLFxuICAgIFwiMTA1NDlcIjogXCJjdWRhcnJyO1wiLFxuICAgIFwiMTA1NTBcIjogXCJsZGNhO1wiLFxuICAgIFwiMTA1NTFcIjogXCJyZGNhO1wiLFxuICAgIFwiMTA1NTJcIjogXCJjdWRhcnJsO1wiLFxuICAgIFwiMTA1NTNcIjogXCJsYXJycGw7XCIsXG4gICAgXCIxMDU1NlwiOiBcImN1cmFycm07XCIsXG4gICAgXCIxMDU1N1wiOiBcImN1bGFycnA7XCIsXG4gICAgXCIxMDU2NVwiOiBcInJhcnJwbDtcIixcbiAgICBcIjEwNTY4XCI6IFwiaGFycmNpcjtcIixcbiAgICBcIjEwNTY5XCI6IFwiVWFycm9jaXI7XCIsXG4gICAgXCIxMDU3MFwiOiBcImx1cmRzaGFyO1wiLFxuICAgIFwiMTA1NzFcIjogXCJsZHJ1c2hhcjtcIixcbiAgICBcIjEwNTc0XCI6IFwiTGVmdFJpZ2h0VmVjdG9yO1wiLFxuICAgIFwiMTA1NzVcIjogXCJSaWdodFVwRG93blZlY3RvcjtcIixcbiAgICBcIjEwNTc2XCI6IFwiRG93bkxlZnRSaWdodFZlY3RvcjtcIixcbiAgICBcIjEwNTc3XCI6IFwiTGVmdFVwRG93blZlY3RvcjtcIixcbiAgICBcIjEwNTc4XCI6IFwiTGVmdFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTc5XCI6IFwiUmlnaHRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MFwiOiBcIlJpZ2h0VXBWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MVwiOiBcIlJpZ2h0RG93blZlY3RvckJhcjtcIixcbiAgICBcIjEwNTgyXCI6IFwiRG93bkxlZnRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4M1wiOiBcIkRvd25SaWdodFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg0XCI6IFwiTGVmdFVwVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODVcIjogXCJMZWZ0RG93blZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg2XCI6IFwiTGVmdFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTg3XCI6IFwiUmlnaHRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4OFwiOiBcIlJpZ2h0VXBUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4OVwiOiBcIlJpZ2h0RG93blRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkwXCI6IFwiRG93bkxlZnRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MVwiOiBcIkRvd25SaWdodFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkyXCI6IFwiTGVmdFVwVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTNcIjogXCJMZWZ0RG93blRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTk0XCI6IFwibEhhcjtcIixcbiAgICBcIjEwNTk1XCI6IFwidUhhcjtcIixcbiAgICBcIjEwNTk2XCI6IFwickhhcjtcIixcbiAgICBcIjEwNTk3XCI6IFwiZEhhcjtcIixcbiAgICBcIjEwNTk4XCI6IFwibHVydWhhcjtcIixcbiAgICBcIjEwNTk5XCI6IFwibGRyZGhhcjtcIixcbiAgICBcIjEwNjAwXCI6IFwicnVsdWhhcjtcIixcbiAgICBcIjEwNjAxXCI6IFwicmRsZGhhcjtcIixcbiAgICBcIjEwNjAyXCI6IFwibGhhcnVsO1wiLFxuICAgIFwiMTA2MDNcIjogXCJsbGhhcmQ7XCIsXG4gICAgXCIxMDYwNFwiOiBcInJoYXJ1bDtcIixcbiAgICBcIjEwNjA1XCI6IFwibHJoYXJkO1wiLFxuICAgIFwiMTA2MDZcIjogXCJVcEVxdWlsaWJyaXVtO1wiLFxuICAgIFwiMTA2MDdcIjogXCJSZXZlcnNlVXBFcXVpbGlicml1bTtcIixcbiAgICBcIjEwNjA4XCI6IFwiUm91bmRJbXBsaWVzO1wiLFxuICAgIFwiMTA2MDlcIjogXCJlcmFycjtcIixcbiAgICBcIjEwNjEwXCI6IFwic2ltcmFycjtcIixcbiAgICBcIjEwNjExXCI6IFwibGFycnNpbTtcIixcbiAgICBcIjEwNjEyXCI6IFwicmFycnNpbTtcIixcbiAgICBcIjEwNjEzXCI6IFwicmFycmFwO1wiLFxuICAgIFwiMTA2MTRcIjogXCJsdGxhcnI7XCIsXG4gICAgXCIxMDYxNlwiOiBcImd0cmFycjtcIixcbiAgICBcIjEwNjE3XCI6IFwic3VicmFycjtcIixcbiAgICBcIjEwNjE5XCI6IFwic3VwbGFycjtcIixcbiAgICBcIjEwNjIwXCI6IFwibGZpc2h0O1wiLFxuICAgIFwiMTA2MjFcIjogXCJyZmlzaHQ7XCIsXG4gICAgXCIxMDYyMlwiOiBcInVmaXNodDtcIixcbiAgICBcIjEwNjIzXCI6IFwiZGZpc2h0O1wiLFxuICAgIFwiMTA2MjlcIjogXCJsb3BhcjtcIixcbiAgICBcIjEwNjMwXCI6IFwicm9wYXI7XCIsXG4gICAgXCIxMDYzNVwiOiBcImxicmtlO1wiLFxuICAgIFwiMTA2MzZcIjogXCJyYnJrZTtcIixcbiAgICBcIjEwNjM3XCI6IFwibGJya3NsdTtcIixcbiAgICBcIjEwNjM4XCI6IFwicmJya3NsZDtcIixcbiAgICBcIjEwNjM5XCI6IFwibGJya3NsZDtcIixcbiAgICBcIjEwNjQwXCI6IFwicmJya3NsdTtcIixcbiAgICBcIjEwNjQxXCI6IFwibGFuZ2Q7XCIsXG4gICAgXCIxMDY0MlwiOiBcInJhbmdkO1wiLFxuICAgIFwiMTA2NDNcIjogXCJscGFybHQ7XCIsXG4gICAgXCIxMDY0NFwiOiBcInJwYXJndDtcIixcbiAgICBcIjEwNjQ1XCI6IFwiZ3RsUGFyO1wiLFxuICAgIFwiMTA2NDZcIjogXCJsdHJQYXI7XCIsXG4gICAgXCIxMDY1MFwiOiBcInZ6aWd6YWc7XCIsXG4gICAgXCIxMDY1MlwiOiBcInZhbmdydDtcIixcbiAgICBcIjEwNjUzXCI6IFwiYW5ncnR2YmQ7XCIsXG4gICAgXCIxMDY2MFwiOiBcImFuZ2U7XCIsXG4gICAgXCIxMDY2MVwiOiBcInJhbmdlO1wiLFxuICAgIFwiMTA2NjJcIjogXCJkd2FuZ2xlO1wiLFxuICAgIFwiMTA2NjNcIjogXCJ1d2FuZ2xlO1wiLFxuICAgIFwiMTA2NjRcIjogXCJhbmdtc2RhYTtcIixcbiAgICBcIjEwNjY1XCI6IFwiYW5nbXNkYWI7XCIsXG4gICAgXCIxMDY2NlwiOiBcImFuZ21zZGFjO1wiLFxuICAgIFwiMTA2NjdcIjogXCJhbmdtc2RhZDtcIixcbiAgICBcIjEwNjY4XCI6IFwiYW5nbXNkYWU7XCIsXG4gICAgXCIxMDY2OVwiOiBcImFuZ21zZGFmO1wiLFxuICAgIFwiMTA2NzBcIjogXCJhbmdtc2RhZztcIixcbiAgICBcIjEwNjcxXCI6IFwiYW5nbXNkYWg7XCIsXG4gICAgXCIxMDY3MlwiOiBcImJlbXB0eXY7XCIsXG4gICAgXCIxMDY3M1wiOiBcImRlbXB0eXY7XCIsXG4gICAgXCIxMDY3NFwiOiBcImNlbXB0eXY7XCIsXG4gICAgXCIxMDY3NVwiOiBcInJhZW1wdHl2O1wiLFxuICAgIFwiMTA2NzZcIjogXCJsYWVtcHR5djtcIixcbiAgICBcIjEwNjc3XCI6IFwib2hiYXI7XCIsXG4gICAgXCIxMDY3OFwiOiBcIm9taWQ7XCIsXG4gICAgXCIxMDY3OVwiOiBcIm9wYXI7XCIsXG4gICAgXCIxMDY4MVwiOiBcIm9wZXJwO1wiLFxuICAgIFwiMTA2ODNcIjogXCJvbGNyb3NzO1wiLFxuICAgIFwiMTA2ODRcIjogXCJvZHNvbGQ7XCIsXG4gICAgXCIxMDY4NlwiOiBcIm9sY2lyO1wiLFxuICAgIFwiMTA2ODdcIjogXCJvZmNpcjtcIixcbiAgICBcIjEwNjg4XCI6IFwib2x0O1wiLFxuICAgIFwiMTA2ODlcIjogXCJvZ3Q7XCIsXG4gICAgXCIxMDY5MFwiOiBcImNpcnNjaXI7XCIsXG4gICAgXCIxMDY5MVwiOiBcImNpckU7XCIsXG4gICAgXCIxMDY5MlwiOiBcInNvbGI7XCIsXG4gICAgXCIxMDY5M1wiOiBcImJzb2xiO1wiLFxuICAgIFwiMTA2OTdcIjogXCJib3hib3g7XCIsXG4gICAgXCIxMDcwMVwiOiBcInRyaXNiO1wiLFxuICAgIFwiMTA3MDJcIjogXCJydHJpbHRyaTtcIixcbiAgICBcIjEwNzAzXCI6IFwiTGVmdFRyaWFuZ2xlQmFyO1wiLFxuICAgIFwiMTA3MDRcIjogXCJSaWdodFRyaWFuZ2xlQmFyO1wiLFxuICAgIFwiMTA3MTZcIjogXCJpaW5maW47XCIsXG4gICAgXCIxMDcxN1wiOiBcImluZmludGllO1wiLFxuICAgIFwiMTA3MThcIjogXCJudmluZmluO1wiLFxuICAgIFwiMTA3MjNcIjogXCJlcGFyc2w7XCIsXG4gICAgXCIxMDcyNFwiOiBcInNtZXBhcnNsO1wiLFxuICAgIFwiMTA3MjVcIjogXCJlcXZwYXJzbDtcIixcbiAgICBcIjEwNzMxXCI6IFwibG96ZjtcIixcbiAgICBcIjEwNzQwXCI6IFwiUnVsZURlbGF5ZWQ7XCIsXG4gICAgXCIxMDc0MlwiOiBcImRzb2w7XCIsXG4gICAgXCIxMDc1MlwiOiBcInhvZG90O1wiLFxuICAgIFwiMTA3NTNcIjogXCJ4b3BsdXM7XCIsXG4gICAgXCIxMDc1NFwiOiBcInhvdGltZTtcIixcbiAgICBcIjEwNzU2XCI6IFwieHVwbHVzO1wiLFxuICAgIFwiMTA3NThcIjogXCJ4c3FjdXA7XCIsXG4gICAgXCIxMDc2NFwiOiBcInFpbnQ7XCIsXG4gICAgXCIxMDc2NVwiOiBcImZwYXJ0aW50O1wiLFxuICAgIFwiMTA3NjhcIjogXCJjaXJmbmludDtcIixcbiAgICBcIjEwNzY5XCI6IFwiYXdpbnQ7XCIsXG4gICAgXCIxMDc3MFwiOiBcInJwcG9saW50O1wiLFxuICAgIFwiMTA3NzFcIjogXCJzY3BvbGludDtcIixcbiAgICBcIjEwNzcyXCI6IFwibnBvbGludDtcIixcbiAgICBcIjEwNzczXCI6IFwicG9pbnRpbnQ7XCIsXG4gICAgXCIxMDc3NFwiOiBcInF1YXRpbnQ7XCIsXG4gICAgXCIxMDc3NVwiOiBcImludGxhcmhrO1wiLFxuICAgIFwiMTA3ODZcIjogXCJwbHVzY2lyO1wiLFxuICAgIFwiMTA3ODdcIjogXCJwbHVzYWNpcjtcIixcbiAgICBcIjEwNzg4XCI6IFwic2ltcGx1cztcIixcbiAgICBcIjEwNzg5XCI6IFwicGx1c2R1O1wiLFxuICAgIFwiMTA3OTBcIjogXCJwbHVzc2ltO1wiLFxuICAgIFwiMTA3OTFcIjogXCJwbHVzdHdvO1wiLFxuICAgIFwiMTA3OTNcIjogXCJtY29tbWE7XCIsXG4gICAgXCIxMDc5NFwiOiBcIm1pbnVzZHU7XCIsXG4gICAgXCIxMDc5N1wiOiBcImxvcGx1cztcIixcbiAgICBcIjEwNzk4XCI6IFwicm9wbHVzO1wiLFxuICAgIFwiMTA3OTlcIjogXCJDcm9zcztcIixcbiAgICBcIjEwODAwXCI6IFwidGltZXNkO1wiLFxuICAgIFwiMTA4MDFcIjogXCJ0aW1lc2JhcjtcIixcbiAgICBcIjEwODAzXCI6IFwic21hc2hwO1wiLFxuICAgIFwiMTA4MDRcIjogXCJsb3RpbWVzO1wiLFxuICAgIFwiMTA4MDVcIjogXCJyb3RpbWVzO1wiLFxuICAgIFwiMTA4MDZcIjogXCJvdGltZXNhcztcIixcbiAgICBcIjEwODA3XCI6IFwiT3RpbWVzO1wiLFxuICAgIFwiMTA4MDhcIjogXCJvZGl2O1wiLFxuICAgIFwiMTA4MDlcIjogXCJ0cmlwbHVzO1wiLFxuICAgIFwiMTA4MTBcIjogXCJ0cmltaW51cztcIixcbiAgICBcIjEwODExXCI6IFwidHJpdGltZTtcIixcbiAgICBcIjEwODEyXCI6IFwiaXByb2Q7XCIsXG4gICAgXCIxMDgxNVwiOiBcImFtYWxnO1wiLFxuICAgIFwiMTA4MTZcIjogXCJjYXBkb3Q7XCIsXG4gICAgXCIxMDgxOFwiOiBcIm5jdXA7XCIsXG4gICAgXCIxMDgxOVwiOiBcIm5jYXA7XCIsXG4gICAgXCIxMDgyMFwiOiBcImNhcGFuZDtcIixcbiAgICBcIjEwODIxXCI6IFwiY3Vwb3I7XCIsXG4gICAgXCIxMDgyMlwiOiBcImN1cGNhcDtcIixcbiAgICBcIjEwODIzXCI6IFwiY2FwY3VwO1wiLFxuICAgIFwiMTA4MjRcIjogXCJjdXBicmNhcDtcIixcbiAgICBcIjEwODI1XCI6IFwiY2FwYnJjdXA7XCIsXG4gICAgXCIxMDgyNlwiOiBcImN1cGN1cDtcIixcbiAgICBcIjEwODI3XCI6IFwiY2FwY2FwO1wiLFxuICAgIFwiMTA4MjhcIjogXCJjY3VwcztcIixcbiAgICBcIjEwODI5XCI6IFwiY2NhcHM7XCIsXG4gICAgXCIxMDgzMlwiOiBcImNjdXBzc207XCIsXG4gICAgXCIxMDgzNVwiOiBcIkFuZDtcIixcbiAgICBcIjEwODM2XCI6IFwiT3I7XCIsXG4gICAgXCIxMDgzN1wiOiBcImFuZGFuZDtcIixcbiAgICBcIjEwODM4XCI6IFwib3JvcjtcIixcbiAgICBcIjEwODM5XCI6IFwib3JzbG9wZTtcIixcbiAgICBcIjEwODQwXCI6IFwiYW5kc2xvcGU7XCIsXG4gICAgXCIxMDg0MlwiOiBcImFuZHY7XCIsXG4gICAgXCIxMDg0M1wiOiBcIm9ydjtcIixcbiAgICBcIjEwODQ0XCI6IFwiYW5kZDtcIixcbiAgICBcIjEwODQ1XCI6IFwib3JkO1wiLFxuICAgIFwiMTA4NDdcIjogXCJ3ZWRiYXI7XCIsXG4gICAgXCIxMDg1NFwiOiBcInNkb3RlO1wiLFxuICAgIFwiMTA4NThcIjogXCJzaW1kb3Q7XCIsXG4gICAgXCIxMDg2MVwiOiBcImNvbmdkb3Q7XCIsXG4gICAgXCIxMDg2MlwiOiBcImVhc3RlcjtcIixcbiAgICBcIjEwODYzXCI6IFwiYXBhY2lyO1wiLFxuICAgIFwiMTA4NjRcIjogXCJhcEU7XCIsXG4gICAgXCIxMDg2NVwiOiBcImVwbHVzO1wiLFxuICAgIFwiMTA4NjZcIjogXCJwbHVzZTtcIixcbiAgICBcIjEwODY3XCI6IFwiRXNpbTtcIixcbiAgICBcIjEwODY4XCI6IFwiQ29sb25lO1wiLFxuICAgIFwiMTA4NjlcIjogXCJFcXVhbDtcIixcbiAgICBcIjEwODcxXCI6IFwiZUREb3Q7XCIsXG4gICAgXCIxMDg3MlwiOiBcImVxdWl2REQ7XCIsXG4gICAgXCIxMDg3M1wiOiBcImx0Y2lyO1wiLFxuICAgIFwiMTA4NzRcIjogXCJndGNpcjtcIixcbiAgICBcIjEwODc1XCI6IFwibHRxdWVzdDtcIixcbiAgICBcIjEwODc2XCI6IFwiZ3RxdWVzdDtcIixcbiAgICBcIjEwODc3XCI6IFwiTGVzc1NsYW50RXF1YWw7XCIsXG4gICAgXCIxMDg3OFwiOiBcIkdyZWF0ZXJTbGFudEVxdWFsO1wiLFxuICAgIFwiMTA4NzlcIjogXCJsZXNkb3Q7XCIsXG4gICAgXCIxMDg4MFwiOiBcImdlc2RvdDtcIixcbiAgICBcIjEwODgxXCI6IFwibGVzZG90bztcIixcbiAgICBcIjEwODgyXCI6IFwiZ2VzZG90bztcIixcbiAgICBcIjEwODgzXCI6IFwibGVzZG90b3I7XCIsXG4gICAgXCIxMDg4NFwiOiBcImdlc2RvdG9sO1wiLFxuICAgIFwiMTA4ODVcIjogXCJsZXNzYXBwcm94O1wiLFxuICAgIFwiMTA4ODZcIjogXCJndHJhcHByb3g7XCIsXG4gICAgXCIxMDg4N1wiOiBcImxuZXE7XCIsXG4gICAgXCIxMDg4OFwiOiBcImduZXE7XCIsXG4gICAgXCIxMDg4OVwiOiBcImxuYXBwcm94O1wiLFxuICAgIFwiMTA4OTBcIjogXCJnbmFwcHJveDtcIixcbiAgICBcIjEwODkxXCI6IFwibGVzc2VxcWd0cjtcIixcbiAgICBcIjEwODkyXCI6IFwiZ3RyZXFxbGVzcztcIixcbiAgICBcIjEwODkzXCI6IFwibHNpbWU7XCIsXG4gICAgXCIxMDg5NFwiOiBcImdzaW1lO1wiLFxuICAgIFwiMTA4OTVcIjogXCJsc2ltZztcIixcbiAgICBcIjEwODk2XCI6IFwiZ3NpbWw7XCIsXG4gICAgXCIxMDg5N1wiOiBcImxnRTtcIixcbiAgICBcIjEwODk4XCI6IFwiZ2xFO1wiLFxuICAgIFwiMTA4OTlcIjogXCJsZXNnZXM7XCIsXG4gICAgXCIxMDkwMFwiOiBcImdlc2xlcztcIixcbiAgICBcIjEwOTAxXCI6IFwiZXFzbGFudGxlc3M7XCIsXG4gICAgXCIxMDkwMlwiOiBcImVxc2xhbnRndHI7XCIsXG4gICAgXCIxMDkwM1wiOiBcImVsc2RvdDtcIixcbiAgICBcIjEwOTA0XCI6IFwiZWdzZG90O1wiLFxuICAgIFwiMTA5MDVcIjogXCJlbDtcIixcbiAgICBcIjEwOTA2XCI6IFwiZWc7XCIsXG4gICAgXCIxMDkwOVwiOiBcInNpbWw7XCIsXG4gICAgXCIxMDkxMFwiOiBcInNpbWc7XCIsXG4gICAgXCIxMDkxMVwiOiBcInNpbWxFO1wiLFxuICAgIFwiMTA5MTJcIjogXCJzaW1nRTtcIixcbiAgICBcIjEwOTEzXCI6IFwiTGVzc0xlc3M7XCIsXG4gICAgXCIxMDkxNFwiOiBcIkdyZWF0ZXJHcmVhdGVyO1wiLFxuICAgIFwiMTA5MTZcIjogXCJnbGo7XCIsXG4gICAgXCIxMDkxN1wiOiBcImdsYTtcIixcbiAgICBcIjEwOTE4XCI6IFwibHRjYztcIixcbiAgICBcIjEwOTE5XCI6IFwiZ3RjYztcIixcbiAgICBcIjEwOTIwXCI6IFwibGVzY2M7XCIsXG4gICAgXCIxMDkyMVwiOiBcImdlc2NjO1wiLFxuICAgIFwiMTA5MjJcIjogXCJzbXQ7XCIsXG4gICAgXCIxMDkyM1wiOiBcImxhdDtcIixcbiAgICBcIjEwOTI0XCI6IFwic210ZTtcIixcbiAgICBcIjEwOTI1XCI6IFwibGF0ZTtcIixcbiAgICBcIjEwOTI2XCI6IFwiYnVtcEU7XCIsXG4gICAgXCIxMDkyN1wiOiBcInByZWNlcTtcIixcbiAgICBcIjEwOTI4XCI6IFwic3VjY2VxO1wiLFxuICAgIFwiMTA5MzFcIjogXCJwckU7XCIsXG4gICAgXCIxMDkzMlwiOiBcInNjRTtcIixcbiAgICBcIjEwOTMzXCI6IFwicHJuRTtcIixcbiAgICBcIjEwOTM0XCI6IFwic3VjY25lcXE7XCIsXG4gICAgXCIxMDkzNVwiOiBcInByZWNhcHByb3g7XCIsXG4gICAgXCIxMDkzNlwiOiBcInN1Y2NhcHByb3g7XCIsXG4gICAgXCIxMDkzN1wiOiBcInBybmFwO1wiLFxuICAgIFwiMTA5MzhcIjogXCJzdWNjbmFwcHJveDtcIixcbiAgICBcIjEwOTM5XCI6IFwiUHI7XCIsXG4gICAgXCIxMDk0MFwiOiBcIlNjO1wiLFxuICAgIFwiMTA5NDFcIjogXCJzdWJkb3Q7XCIsXG4gICAgXCIxMDk0MlwiOiBcInN1cGRvdDtcIixcbiAgICBcIjEwOTQzXCI6IFwic3VicGx1cztcIixcbiAgICBcIjEwOTQ0XCI6IFwic3VwcGx1cztcIixcbiAgICBcIjEwOTQ1XCI6IFwic3VibXVsdDtcIixcbiAgICBcIjEwOTQ2XCI6IFwic3VwbXVsdDtcIixcbiAgICBcIjEwOTQ3XCI6IFwic3ViZWRvdDtcIixcbiAgICBcIjEwOTQ4XCI6IFwic3VwZWRvdDtcIixcbiAgICBcIjEwOTQ5XCI6IFwic3Vic2V0ZXFxO1wiLFxuICAgIFwiMTA5NTBcIjogXCJzdXBzZXRlcXE7XCIsXG4gICAgXCIxMDk1MVwiOiBcInN1YnNpbTtcIixcbiAgICBcIjEwOTUyXCI6IFwic3Vwc2ltO1wiLFxuICAgIFwiMTA5NTVcIjogXCJzdWJzZXRuZXFxO1wiLFxuICAgIFwiMTA5NTZcIjogXCJzdXBzZXRuZXFxO1wiLFxuICAgIFwiMTA5NTlcIjogXCJjc3ViO1wiLFxuICAgIFwiMTA5NjBcIjogXCJjc3VwO1wiLFxuICAgIFwiMTA5NjFcIjogXCJjc3ViZTtcIixcbiAgICBcIjEwOTYyXCI6IFwiY3N1cGU7XCIsXG4gICAgXCIxMDk2M1wiOiBcInN1YnN1cDtcIixcbiAgICBcIjEwOTY0XCI6IFwic3Vwc3ViO1wiLFxuICAgIFwiMTA5NjVcIjogXCJzdWJzdWI7XCIsXG4gICAgXCIxMDk2NlwiOiBcInN1cHN1cDtcIixcbiAgICBcIjEwOTY3XCI6IFwic3VwaHN1YjtcIixcbiAgICBcIjEwOTY4XCI6IFwic3VwZHN1YjtcIixcbiAgICBcIjEwOTY5XCI6IFwiZm9ya3Y7XCIsXG4gICAgXCIxMDk3MFwiOiBcInRvcGZvcms7XCIsXG4gICAgXCIxMDk3MVwiOiBcIm1sY3A7XCIsXG4gICAgXCIxMDk4MFwiOiBcIkRvdWJsZUxlZnRUZWU7XCIsXG4gICAgXCIxMDk4MlwiOiBcIlZkYXNobDtcIixcbiAgICBcIjEwOTgzXCI6IFwiQmFydjtcIixcbiAgICBcIjEwOTg0XCI6IFwidkJhcjtcIixcbiAgICBcIjEwOTg1XCI6IFwidkJhcnY7XCIsXG4gICAgXCIxMDk4N1wiOiBcIlZiYXI7XCIsXG4gICAgXCIxMDk4OFwiOiBcIk5vdDtcIixcbiAgICBcIjEwOTg5XCI6IFwiYk5vdDtcIixcbiAgICBcIjEwOTkwXCI6IFwicm5taWQ7XCIsXG4gICAgXCIxMDk5MVwiOiBcImNpcm1pZDtcIixcbiAgICBcIjEwOTkyXCI6IFwibWlkY2lyO1wiLFxuICAgIFwiMTA5OTNcIjogXCJ0b3BjaXI7XCIsXG4gICAgXCIxMDk5NFwiOiBcIm5ocGFyO1wiLFxuICAgIFwiMTA5OTVcIjogXCJwYXJzaW07XCIsXG4gICAgXCIxMTAwNVwiOiBcInBhcnNsO1wiLFxuICAgIFwiNjQyNTZcIjogXCJmZmxpZztcIixcbiAgICBcIjY0MjU3XCI6IFwiZmlsaWc7XCIsXG4gICAgXCI2NDI1OFwiOiBcImZsbGlnO1wiLFxuICAgIFwiNjQyNTlcIjogXCJmZmlsaWc7XCIsXG4gICAgXCI2NDI2MFwiOiBcImZmbGxpZztcIlxufSIsIkFuYWx5dGljcyAgICA9IHJlcXVpcmUgJy4vdXRpbHMvQW5hbHl0aWNzJ1xuQXV0aE1hbmFnZXIgID0gcmVxdWlyZSAnLi91dGlscy9BdXRoTWFuYWdlcidcblNoYXJlICAgICAgICA9IHJlcXVpcmUgJy4vdXRpbHMvU2hhcmUnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi91dGlscy9Hb29nbGVQbHVzJ1xuVGVtcGxhdGVzICAgID0gcmVxdWlyZSAnLi9kYXRhL1RlbXBsYXRlcydcbkxvY2FsZSAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9Mb2NhbGUnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9Sb3V0ZXInXG5OYXYgICAgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9OYXYnXG5BcHBEYXRhICAgICAgPSByZXF1aXJlICcuL0FwcERhdGEnXG5BcHBWaWV3ICAgICAgPSByZXF1aXJlICcuL0FwcFZpZXcnXG5NZWRpYVF1ZXJpZXMgPSByZXF1aXJlICcuL3V0aWxzL01lZGlhUXVlcmllcydcblxuY2xhc3MgQXBwXG5cbiAgICBMSVZFICAgICAgIDogbnVsbFxuICAgIEJBU0VfVVJMICAgOiB3aW5kb3cuY29uZmlnLmhvc3RuYW1lXG4gICAgbG9jYWxlQ29kZSA6IHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuICAgIG9ialJlYWR5ICAgOiAwXG5cbiAgICBfdG9DbGVhbiAgIDogWydvYmpSZWFkeScsICdzZXRGbGFncycsICdvYmplY3RDb21wbGV0ZScsICdpbml0JywgJ2luaXRPYmplY3RzJywgJ2luaXRTREtzJywgJ2luaXRBcHAnLCAnZ28nLCAnY2xlYW51cCcsICdfdG9DbGVhbiddXG5cbiAgICBjb25zdHJ1Y3RvciA6IChATElWRSkgLT5cblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgc2V0RmxhZ3MgOiA9PlxuXG4gICAgICAgIHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5zZXR1cCgpO1xuXG4gICAgICAgIEBJU19BTkRST0lEICAgID0gdWEuaW5kZXhPZignYW5kcm9pZCcpID4gLTFcbiAgICAgICAgQElTX0ZJUkVGT1ggICAgPSB1YS5pbmRleE9mKCdmaXJlZm94JykgPiAtMVxuICAgICAgICBASVNfQ0hST01FX0lPUyA9IGlmIHVhLm1hdGNoKCdjcmlvcycpIHRoZW4gdHJ1ZSBlbHNlIGZhbHNlICMgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTM4MDgwNTNcblxuICAgICAgICBudWxsXG5cbiAgICBpc01vYmlsZSA6ID0+XG5cbiAgICAgICAgcmV0dXJuIEBJU19JT1Mgb3IgQElTX0FORFJPSURcblxuICAgIG9iamVjdENvbXBsZXRlIDogPT5cblxuICAgICAgICBAb2JqUmVhZHkrK1xuICAgICAgICBAaW5pdEFwcCgpIGlmIEBvYmpSZWFkeSA+PSA0XG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdCA6ID0+XG5cbiAgICAgICAgQGluaXRPYmplY3RzKClcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0T2JqZWN0cyA6ID0+XG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXMgXCIvZGF0YS90ZW1wbGF0ZXMjeyhpZiBATElWRSB0aGVuICcubWluJyBlbHNlICcnKX0ueG1sXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAbG9jYWxlICAgID0gbmV3IExvY2FsZSBcIi9kYXRhL2xvY2FsZXMvc3RyaW5ncy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYW5hbHl0aWNzID0gbmV3IEFuYWx5dGljcyBcIi9kYXRhL3RyYWNraW5nLmpzb25cIiwgQG9iamVjdENvbXBsZXRlXG4gICAgICAgIEBhcHBEYXRhICAgPSBuZXcgQXBwRGF0YSBAb2JqZWN0Q29tcGxldGVcblxuICAgICAgICAjIGlmIG5ldyBvYmplY3RzIGFyZSBhZGRlZCBkb24ndCBmb3JnZXQgdG8gY2hhbmdlIHRoZSBgQG9iamVjdENvbXBsZXRlYCBmdW5jdGlvblxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXRTREtzIDogPT5cblxuICAgICAgICBGYWNlYm9vay5sb2FkKClcbiAgICAgICAgR29vZ2xlUGx1cy5sb2FkKClcblxuICAgICAgICBudWxsXG5cbiAgICBpbml0QXBwIDogPT5cblxuICAgICAgICBAc2V0RmxhZ3MoKVxuXG4gICAgICAgICMjIyBTdGFydHMgYXBwbGljYXRpb24gIyMjXG4gICAgICAgIEBhcHBWaWV3ID0gbmV3IEFwcFZpZXdcbiAgICAgICAgQHJvdXRlciAgPSBuZXcgUm91dGVyXG4gICAgICAgIEBuYXYgICAgID0gbmV3IE5hdlxuICAgICAgICBAYXV0aCAgICA9IG5ldyBBdXRoTWFuYWdlclxuICAgICAgICBAc2hhcmUgICA9IG5ldyBTaGFyZVxuXG4gICAgICAgIEBnbygpXG5cbiAgICAgICAgQGluaXRTREtzKClcblxuICAgICAgICBudWxsXG5cbiAgICBnbyA6ID0+XG5cbiAgICAgICAgIyMjIEFmdGVyIGV2ZXJ5dGhpbmcgaXMgbG9hZGVkLCBraWNrcyBvZmYgd2Vic2l0ZSAjIyNcbiAgICAgICAgQGFwcFZpZXcucmVuZGVyKClcblxuICAgICAgICAjIyMgcmVtb3ZlIHJlZHVuZGFudCBpbml0aWFsaXNhdGlvbiBtZXRob2RzIC8gcHJvcGVydGllcyAjIyNcbiAgICAgICAgQGNsZWFudXAoKVxuXG4gICAgICAgIG51bGxcblxuICAgIGNsZWFudXAgOiA9PlxuXG4gICAgICAgIGZvciBmbiBpbiBAX3RvQ2xlYW5cbiAgICAgICAgICAgIEBbZm5dID0gbnVsbFxuICAgICAgICAgICAgZGVsZXRlIEBbZm5dXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxuIiwiQWJzdHJhY3REYXRhICAgICAgPSByZXF1aXJlICcuL2RhdGEvQWJzdHJhY3REYXRhJ1xuUmVxdWVzdGVyICAgICAgICAgPSByZXF1aXJlICcuL3V0aWxzL1JlcXVlc3RlcidcbkFQSSAgICAgICAgICAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0FQSSdcbkRvb2RsZXNDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi9jb2xsZWN0aW9ucy9kb29kbGVzL0Rvb2RsZXNDb2xsZWN0aW9uJ1xuXG5jbGFzcyBBcHBEYXRhIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cbiAgICBjYWxsYmFjayA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKEBjYWxsYmFjaykgLT5cblxuICAgICAgICAjIyNcblxuICAgICAgICBhZGQgYWxsIGRhdGEgY2xhc3NlcyBoZXJlXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIEBkb29kbGVzID0gbmV3IERvb2RsZXNDb2xsZWN0aW9uXG5cbiAgICAgICAgQGdldFN0YXJ0RGF0YSgpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgICMjI1xuICAgIGdldCBhcHAgYm9vdHN0cmFwIGRhdGEgLSBlbWJlZCBpbiBIVE1MIG9yIEFQSSBlbmRwb2ludFxuICAgICMjI1xuICAgIGdldFN0YXJ0RGF0YSA6ID0+XG4gICAgICAgIFxuICAgICAgICAjIGlmIEFQSS5nZXQoJ3N0YXJ0JylcbiAgICAgICAgaWYgdHJ1ZVxuXG4gICAgICAgICAgICByID0gUmVxdWVzdGVyLnJlcXVlc3RcbiAgICAgICAgICAgICAgICAjIHVybCAgOiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgICAgICAgICAgdXJsICA6IEBDRCgpLkJBU0VfVVJMICsgJy9kYXRhL19EVU1NWS9kb29kbGVzLmpzb24nXG4gICAgICAgICAgICAgICAgdHlwZSA6ICdHRVQnXG5cbiAgICAgICAgICAgIHIuZG9uZSBAb25TdGFydERhdGFSZWNlaXZlZFxuICAgICAgICAgICAgci5mYWlsID0+XG5cbiAgICAgICAgICAgICAgICAjIGNvbnNvbGUuZXJyb3IgXCJlcnJvciBsb2FkaW5nIGFwaSBzdGFydCBkYXRhXCJcblxuICAgICAgICAgICAgICAgICMjI1xuICAgICAgICAgICAgICAgIHRoaXMgaXMgb25seSB0ZW1wb3JhcnksIHdoaWxlIHRoZXJlIGlzIG5vIGJvb3RzdHJhcCBkYXRhIGhlcmUsIG5vcm1hbGx5IHdvdWxkIGhhbmRsZSBlcnJvciAvIGZhaWxcbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uU3RhcnREYXRhUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIm9uU3RhcnREYXRhUmVjZWl2ZWQgOiAoZGF0YSkgPT5cIiwgZGF0YVxuXG4gICAgICAgIHRvQWRkID0gW11cbiAgICAgICAgKHRvQWRkID0gdG9BZGQuY29uY2F0IGRhdGEuZG9vZGxlcykgZm9yIGkgaW4gWzAuLi41XVxuXG4gICAgICAgIEBkb29kbGVzLmFkZCB0b0FkZFxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJvb3RzdHJhcCBkYXRhIHJlY2VpdmVkLCBhcHAgcmVhZHkgdG8gZ29cblxuICAgICAgICAjIyNcblxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwRGF0YVxuIiwiQWJzdHJhY3RWaWV3ICAgICA9IHJlcXVpcmUgJy4vdmlldy9BYnN0cmFjdFZpZXcnXG5QcmVsb2FkZXIgICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUHJlbG9hZGVyJ1xuSGVhZGVyICAgICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0hlYWRlcidcbldyYXBwZXIgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9XcmFwcGVyJ1xuRm9vdGVyICAgICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0Zvb3RlcidcblBhZ2VUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9QYWdlVHJhbnNpdGlvbmVyJ1xuTW9kYWxNYW5hZ2VyICAgICA9IHJlcXVpcmUgJy4vdmlldy9tb2RhbHMvX01vZGFsTWFuYWdlcidcblxuY2xhc3MgQXBwVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnbWFpbidcblxuICAgICR3aW5kb3cgIDogbnVsbFxuICAgICRib2R5ICAgIDogbnVsbFxuXG4gICAgd3JhcHBlciAgOiBudWxsXG4gICAgZm9vdGVyICAgOiBudWxsXG5cbiAgICBkaW1zIDpcbiAgICAgICAgdyA6IG51bGxcbiAgICAgICAgaCA6IG51bGxcbiAgICAgICAgbyA6IG51bGxcbiAgICAgICAgdXBkYXRlTW9iaWxlIDogdHJ1ZVxuICAgICAgICBsYXN0SGVpZ2h0ICAgOiBudWxsXG5cbiAgICBsYXN0U2Nyb2xsWSA6IDBcbiAgICB0aWNraW5nICAgICA6IGZhbHNlXG5cbiAgICBFVkVOVF9VUERBVEVfRElNRU5TSU9OUyA6ICdFVkVOVF9VUERBVEVfRElNRU5TSU9OUydcbiAgICBFVkVOVF9QUkVMT0FERVJfSElERSAgICA6ICdFVkVOVF9QUkVMT0FERVJfSElERSdcbiAgICBFVkVOVF9PTl9TQ1JPTEwgICAgICAgICA6ICdFVkVOVF9PTl9TQ1JPTEwnXG5cbiAgICBNT0JJTEVfV0lEVEggOiA3MDBcbiAgICBNT0JJTEUgICAgICAgOiAnbW9iaWxlJ1xuICAgIE5PTl9NT0JJTEUgICA6ICdub25fbW9iaWxlJ1xuXG4gICAgY29uc3RydWN0b3IgOiAtPlxuXG4gICAgICAgIEAkd2luZG93ID0gJCh3aW5kb3cpXG4gICAgICAgIEAkYm9keSAgID0gJCgnYm9keScpLmVxKDApXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgZGlzYWJsZVRvdWNoOiA9PlxuXG4gICAgICAgIEAkd2luZG93Lm9uICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcblxuICAgICAgICBudWxsXG5cbiAgICBlbmFibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vZmYgJ3RvdWNobW92ZScsIEBvblRvdWNoTW92ZVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uVG91Y2hNb3ZlOiAoIGUgKSAtPlxuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIHJlbmRlciA6ID0+XG5cbiAgICAgICAgQGJpbmRFdmVudHMoKVxuXG4gICAgICAgIEBwcmVsb2FkZXIgICAgPSBuZXcgUHJlbG9hZGVyXG4gICAgICAgIEBtb2RhbE1hbmFnZXIgPSBuZXcgTW9kYWxNYW5hZ2VyXG5cbiAgICAgICAgQGhlYWRlciAgICAgICA9IG5ldyBIZWFkZXJcbiAgICAgICAgQHdyYXBwZXIgICAgICA9IG5ldyBXcmFwcGVyXG4gICAgICAgIEBmb290ZXIgICAgICAgPSBuZXcgRm9vdGVyXG4gICAgICAgIEB0cmFuc2l0aW9uZXIgPSBuZXcgUGFnZVRyYW5zaXRpb25lclxuXG4gICAgICAgIEBcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAaGVhZGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQHdyYXBwZXJcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAZm9vdGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQHRyYW5zaXRpb25lclxuXG4gICAgICAgIEBvbkFsbFJlbmRlcmVkKClcblxuICAgICAgICBudWxsXG5cbiAgICBiaW5kRXZlbnRzIDogPT5cblxuICAgICAgICBAb24gJ2FsbFJlbmRlcmVkJywgQG9uQWxsUmVuZGVyZWRcblxuICAgICAgICBAb25SZXNpemUoKVxuXG4gICAgICAgIEBvblJlc2l6ZSA9IF8uZGVib3VuY2UgQG9uUmVzaXplLCAzMDBcbiAgICAgICAgQCR3aW5kb3cub24gJ3Jlc2l6ZSBvcmllbnRhdGlvbmNoYW5nZScsIEBvblJlc2l6ZVxuICAgICAgICBAJHdpbmRvdy5vbiBcInNjcm9sbFwiLCBAb25TY3JvbGxcblxuICAgICAgICBAJGJvZHkub24gJ2NsaWNrJywgJ2EnLCBAbGlua01hbmFnZXJcblxuICAgICAgICBudWxsXG5cbiAgICBvblNjcm9sbCA6ID0+XG5cbiAgICAgICAgQGxhc3RTY3JvbGxZID0gd2luZG93LnNjcm9sbFlcbiAgICAgICAgQHJlcXVlc3RUaWNrKClcblxuICAgICAgICBudWxsXG5cbiAgICByZXF1ZXN0VGljayA6ID0+XG5cbiAgICAgICAgaWYgIUB0aWNraW5nXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgQHNjcm9sbFVwZGF0ZVxuICAgICAgICAgICAgQHRpY2tpbmcgPSB0cnVlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2Nyb2xsVXBkYXRlIDogPT5cblxuICAgICAgICBAdGlja2luZyA9IGZhbHNlXG5cbiAgICAgICAgQCRib2R5LmFkZENsYXNzKCdkaXNhYmxlLWhvdmVyJylcblxuICAgICAgICBjbGVhclRpbWVvdXQgQHRpbWVyU2Nyb2xsXG5cbiAgICAgICAgQHRpbWVyU2Nyb2xsID0gc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgQCRib2R5LnJlbW92ZUNsYXNzKCdkaXNhYmxlLWhvdmVyJylcbiAgICAgICAgLCA1MFxuXG4gICAgICAgIEB0cmlnZ2VyIEBFVkVOVF9PTl9TQ1JPTExcblxuICAgICAgICBudWxsXG5cbiAgICBvbkFsbFJlbmRlcmVkIDogPT5cblxuICAgICAgICAjIGNvbnNvbGUubG9nIFwib25BbGxSZW5kZXJlZCA6ID0+XCJcblxuICAgICAgICBAJGJvZHkucHJlcGVuZCBAJGVsXG5cbiAgICAgICAgQHByZWxvYWRlci5wbGF5SW50cm9BbmltYXRpb24gPT4gQHRyaWdnZXIgQEVWRU5UX1BSRUxPQURFUl9ISURFXG5cbiAgICAgICAgQGJlZ2luKClcblxuICAgICAgICBudWxsXG5cbiAgICBiZWdpbiA6ID0+XG5cbiAgICAgICAgQHRyaWdnZXIgJ3N0YXJ0J1xuXG4gICAgICAgIEBDRCgpLnJvdXRlci5zdGFydCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25SZXNpemUgOiA9PlxuXG4gICAgICAgIEBnZXREaW1zKClcblxuICAgICAgICBudWxsXG5cbiAgICBnZXREaW1zIDogPT5cblxuICAgICAgICB3ID0gd2luZG93LmlubmVyV2lkdGggb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIG9yIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgICAgICAgaCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0XG5cbiAgICAgICAgY2hhbmdlID0gaCAvIEBkaW1zLmxhc3RIZWlnaHRcblxuICAgICAgICBAZGltcyA9XG4gICAgICAgICAgICB3IDogd1xuICAgICAgICAgICAgaCA6IGhcbiAgICAgICAgICAgIG8gOiBpZiBoID4gdyB0aGVuICdwb3J0cmFpdCcgZWxzZSAnbGFuZHNjYXBlJ1xuICAgICAgICAgICAgdXBkYXRlTW9iaWxlIDogIUBDRCgpLmlzTW9iaWxlKCkgb3IgY2hhbmdlIDwgMC44IG9yIGNoYW5nZSA+IDEuMlxuICAgICAgICAgICAgbGFzdEhlaWdodCAgIDogaFxuXG4gICAgICAgIEB0cmlnZ2VyIEBFVkVOVF9VUERBVEVfRElNRU5TSU9OUywgQGRpbXNcblxuICAgICAgICBudWxsXG5cbiAgICBsaW5rTWFuYWdlciA6IChlKSA9PlxuXG4gICAgICAgIGhyZWYgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaHJlZicpXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBocmVmXG5cbiAgICAgICAgQG5hdmlnYXRlVG9VcmwgaHJlZiwgZVxuXG4gICAgICAgIG51bGxcblxuICAgIG5hdmlnYXRlVG9VcmwgOiAoIGhyZWYsIGUgPSBudWxsICkgPT5cblxuICAgICAgICByb3V0ZSAgID0gaWYgaHJlZi5tYXRjaChAQ0QoKS5CQVNFX1VSTCkgdGhlbiBocmVmLnNwbGl0KEBDRCgpLkJBU0VfVVJMKVsxXSBlbHNlIGhyZWZcbiAgICAgICAgc2VjdGlvbiA9IGlmIHJvdXRlLmNoYXJBdCgwKSBpcyAnLycgdGhlbiByb3V0ZS5zcGxpdCgnLycpWzFdLnNwbGl0KCcvJylbMF0gZWxzZSByb3V0ZS5zcGxpdCgnLycpWzBdXG5cbiAgICAgICAgaWYgQENEKCkubmF2LmdldFNlY3Rpb24gc2VjdGlvblxuICAgICAgICAgICAgZT8ucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgQENEKCkucm91dGVyLm5hdmlnYXRlVG8gcm91dGVcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIEBoYW5kbGVFeHRlcm5hbExpbmsgaHJlZlxuXG4gICAgICAgIG51bGxcblxuICAgIGhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PlxuXG4gICAgICAgIGNvbnNvbGUubG9nIFwiaGFuZGxlRXh0ZXJuYWxMaW5rIDogKGRhdGEpID0+IFwiXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYmluZCB0cmFja2luZyBldmVudHMgaWYgbmVjZXNzYXJ5XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXdcbiIsImNsYXNzIEFic3RyYWN0Q29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb25cblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RDb2xsZWN0aW9uXG4iLCJBYnN0cmFjdENvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9BYnN0cmFjdENvbGxlY3Rpb24nXG5Db250cmlidXRvck1vZGVsICAgPSByZXF1aXJlICcuLi8uLi9tb2RlbHMvY29udHJpYnV0b3IvQ29udHJpYnV0b3JNb2RlbCdcblxuY2xhc3MgQ29udHJpYnV0b3JzQ29sbGVjdGlvbiBleHRlbmRzIEFic3RyYWN0Q29sbGVjdGlvblxuXG5cdG1vZGVsIDogQ29udHJpYnV0b3JNb2RlbFxuXG5cdGdldEFib3V0SFRNTCA6ID0+XG5cblx0XHRwZWVwcyA9IFtdXG5cblx0XHQocGVlcHMucHVzaCBtb2RlbC5nZXQoJ2h0bWwnKSkgZm9yIG1vZGVsIGluIEBtb2RlbHNcblxuXHRcdHBlZXBzLmpvaW4oJyBcXFxcICcpXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0b3JzQ29sbGVjdGlvblxuIiwiVGVtcGxhdGVNb2RlbCA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5cbmNsYXNzIFRlbXBsYXRlc0NvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0bW9kZWwgOiBUZW1wbGF0ZU1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzQ29sbGVjdGlvblxuIiwiQWJzdHJhY3RDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RDb2xsZWN0aW9uJ1xuRG9vZGxlTW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2Rvb2RsZS9Eb29kbGVNb2RlbCdcblxuY2xhc3MgRG9vZGxlc0NvbGxlY3Rpb24gZXh0ZW5kcyBBYnN0cmFjdENvbGxlY3Rpb25cblxuXHRtb2RlbCA6IERvb2RsZU1vZGVsXG5cblx0Z2V0RG9vZGxlQnlTbHVnIDogKHNsdWcpID0+XG5cblx0XHRkb29kbGUgPSBAZmluZFdoZXJlIHNsdWcgOiBzbHVnXG5cblx0XHRpZiAhZG9vZGxlXG5cdFx0XHRjb25zb2xlLmxvZyBcInkgdSBubyBkb29kbGU/XCJcblxuXHRcdHJldHVybiBkb29kbGVcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVzQ29sbGVjdGlvblxuIiwiQ29sb3JzID1cblxuXHRDRF9SRUQgICAgOiAnI0VCNDIzRSdcblx0Q0RfQkxVRSAgIDogJyMzOTVDQUEnXG5cdENEX0JMQUNLICA6ICcjMTExMTExJ1xuXHRPRkZfV0hJVEUgOiAnI0YxRjFGMydcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcnNcbiIsIkFQSVJvdXRlTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsJ1xuXG5jbGFzcyBBUElcblxuXHRAbW9kZWwgOiBuZXcgQVBJUm91dGVNb2RlbFxuXG5cdEBnZXRDb250YW50cyA6ID0+XG5cblx0XHQjIyMgYWRkIG1vcmUgaWYgd2Ugd2FubmEgdXNlIGluIEFQSSBzdHJpbmdzICMjI1xuXHRcdEJBU0VfVVJMIDogQENEKCkuQkFTRV9VUkxcblxuXHRAZ2V0IDogKG5hbWUsIHZhcnMpID0+XG5cblx0XHR2YXJzID0gJC5leHRlbmQgdHJ1ZSwgdmFycywgQGdldENvbnRhbnRzKClcblx0XHRyZXR1cm4gQHN1cHBsYW50U3RyaW5nIEBtb2RlbC5nZXQobmFtZSksIHZhcnNcblxuXHRAc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdIG9yIGlmIHR5cGVvZiB2YWxzW2JdIGlzICdudW1iZXInIHRoZW4gdmFsc1tiXS50b1N0cmluZygpIGVsc2UgJydcblx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBUElcbiIsImNsYXNzIEFic3RyYWN0RGF0YVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdF8uZXh0ZW5kIEAsIEJhY2tib25lLkV2ZW50c1xuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3REYXRhXG4iLCJMb2NhbGVzTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwnXG5BUEkgICAgICAgICAgPSByZXF1aXJlICcuLi9kYXRhL0FQSSdcblxuIyMjXG4jIExvY2FsZSBMb2FkZXIgI1xuXG5GaXJlcyBiYWNrIGFuIGV2ZW50IHdoZW4gY29tcGxldGVcblxuIyMjXG5jbGFzcyBMb2NhbGVcblxuICAgIGxhbmcgICAgIDogbnVsbFxuICAgIGRhdGEgICAgIDogbnVsbFxuICAgIGNhbGxiYWNrIDogbnVsbFxuICAgIGJhY2t1cCAgIDogbnVsbFxuICAgIGRlZmF1bHQgIDogJ2VuLWdiJ1xuXG4gICAgY29uc3RydWN0b3IgOiAoZGF0YSwgY2IpIC0+XG5cbiAgICAgICAgIyMjIHN0YXJ0IExvY2FsZSBMb2FkZXIsIGRlZmluZSBsb2NhbGUgYmFzZWQgb24gYnJvd3NlciBsYW5ndWFnZSAjIyNcblxuICAgICAgICBAY2FsbGJhY2sgPSBjYlxuICAgICAgICBAYmFja3VwID0gZGF0YVxuXG4gICAgICAgIEBsYW5nID0gQGdldExhbmcoKVxuXG4gICAgICAgIGlmIEFQSS5nZXQoJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0pXG5cbiAgICAgICAgICAgICQuYWpheFxuICAgICAgICAgICAgICAgIHVybCAgICAgOiBBUEkuZ2V0KCAnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSApXG4gICAgICAgICAgICAgICAgdHlwZSAgICA6ICdHRVQnXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgICAgICBlcnJvciAgIDogQGxvYWRCYWNrdXBcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBsb2FkQmFja3VwKClcblxuICAgICAgICBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRMYW5nIDogPT5cblxuICAgICAgICBpZiB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGFuZCB3aW5kb3cubG9jYXRpb24uc2VhcmNoLm1hdGNoKCdsYW5nPScpXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KCdsYW5nPScpWzFdLnNwbGl0KCcmJylbMF1cblxuICAgICAgICBlbHNlIGlmIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBsYW5nID0gQGRlZmF1bHRcblxuICAgICAgICBsYW5nXG5cbiAgICBvblN1Y2Nlc3MgOiAoZXZlbnQpID0+XG5cbiAgICAgICAgIyMjIEZpcmVzIGJhY2sgYW4gZXZlbnQgb25jZSBpdCdzIGNvbXBsZXRlICMjI1xuXG4gICAgICAgIGQgPSBudWxsXG5cbiAgICAgICAgaWYgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgICAgICBkID0gSlNPTi5wYXJzZSBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIGQgPSBldmVudFxuXG4gICAgICAgIEBkYXRhID0gbmV3IExvY2FsZXNNb2RlbCBkXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIGxvYWRCYWNrdXAgOiA9PlxuXG4gICAgICAgICMjIyBXaGVuIEFQSSBub3QgYXZhaWxhYmxlLCB0cmllcyB0byBsb2FkIHRoZSBzdGF0aWMgLnR4dCBsb2NhbGUgIyMjXG5cbiAgICAgICAgJC5hamF4IFxuICAgICAgICAgICAgdXJsICAgICAgOiBAYmFja3VwXG4gICAgICAgICAgICBkYXRhVHlwZSA6ICdqc29uJ1xuICAgICAgICAgICAgY29tcGxldGUgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICBlcnJvciAgICA6ID0+IGNvbnNvbGUubG9nICdlcnJvciBvbiBsb2FkaW5nIGJhY2t1cCdcblxuICAgICAgICBudWxsXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgIyMjIGdldCBTdHJpbmcgZnJvbSBsb2NhbGVcbiAgICAgICAgKyBpZCA6IHN0cmluZyBpZCBvZiB0aGUgTG9jYWxpc2VkIFN0cmluZ1xuICAgICAgICAjIyNcblxuICAgICAgICByZXR1cm4gQGRhdGEuZ2V0U3RyaW5nIGlkXG5cbiAgICBnZXRMb2NhbGVJbWFnZSA6ICh1cmwpID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5jb25maWcuQ0ROICsgXCIvaW1hZ2VzL2xvY2FsZS9cIiArIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZSArIFwiL1wiICsgdXJsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlXG4iLCJUZW1wbGF0ZU1vZGVsICAgICAgID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblRlbXBsYXRlc0NvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24nXG5cbmNsYXNzIFRlbXBsYXRlc1xuXG4gICAgdGVtcGxhdGVzIDogbnVsbFxuICAgIGNiICAgICAgICA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKHRlbXBsYXRlcywgY2FsbGJhY2spIC0+XG5cbiAgICAgICAgQGNiID0gY2FsbGJhY2tcblxuICAgICAgICAkLmFqYXggdXJsIDogdGVtcGxhdGVzLCBzdWNjZXNzIDogQHBhcnNlWE1MXG4gICAgICAgICAgIFxuICAgICAgICBudWxsXG5cbiAgICBwYXJzZVhNTCA6IChkYXRhKSA9PlxuXG4gICAgICAgIHRlbXAgPSBbXVxuXG4gICAgICAgICQoZGF0YSkuZmluZCgndGVtcGxhdGUnKS5lYWNoIChrZXksIHZhbHVlKSAtPlxuICAgICAgICAgICAgJHZhbHVlID0gJCh2YWx1ZSlcbiAgICAgICAgICAgIHRlbXAucHVzaCBuZXcgVGVtcGxhdGVNb2RlbFxuICAgICAgICAgICAgICAgIGlkICAgOiAkdmFsdWUuYXR0cignaWQnKS50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgdGV4dCA6ICQudHJpbSAkdmFsdWUudGV4dCgpXG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXNDb2xsZWN0aW9uIHRlbXBcblxuICAgICAgICBAY2I/KClcbiAgICAgICAgXG4gICAgICAgIG51bGwgICAgICAgIFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgIHQgPSBAdGVtcGxhdGVzLndoZXJlIGlkIDogaWRcbiAgICAgICAgdCA9IHRbMF0uZ2V0ICd0ZXh0J1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICQudHJpbSB0XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzXG4iLCJjbGFzcyBBYnN0cmFjdE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cblx0Y29uc3RydWN0b3IgOiAoYXR0cnMsIG9wdGlvbikgLT5cblxuXHRcdGF0dHJzID0gQF9maWx0ZXJBdHRycyBhdHRyc1xuXG5cdFx0cmV0dXJuIEJhY2tib25lLkRlZXBNb2RlbC5hcHBseSBALCBhcmd1bWVudHNcblxuXHRzZXQgOiAoYXR0cnMsIG9wdGlvbnMpIC0+XG5cblx0XHRvcHRpb25zIG9yIChvcHRpb25zID0ge30pXG5cblx0XHRhdHRycyA9IEBfZmlsdGVyQXR0cnMgYXR0cnNcblxuXHRcdG9wdGlvbnMuZGF0YSA9IEpTT04uc3RyaW5naWZ5IGF0dHJzXG5cblx0XHRyZXR1cm4gQmFja2JvbmUuRGVlcE1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCBALCBhdHRycywgb3B0aW9uc1xuXG5cdF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuXHRcdGF0dHJzXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0TW9kZWxcbiIsIkFic3RyYWN0TW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RNb2RlbCdcbk51bWJlclV0aWxzICAgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvTnVtYmVyVXRpbHMnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBDb250cmlidXRvck1vZGVsIGV4dGVuZHMgQWJzdHJhY3RNb2RlbFxuXG4gICAgZGVmYXVsdHMgOiBcbiAgICAgICAgXCJuYW1lXCIgICAgOiBcIlwiXG4gICAgICAgIFwiZ2l0aHViXCIgIDogXCJcIlxuICAgICAgICBcIndlYnNpdGVcIiA6IFwiXCJcbiAgICAgICAgXCJ0d2l0dGVyXCIgOiBcIlwiXG4gICAgICAgIFwiaHRtbFwiICAgIDogXCJcIlxuXG4gICAgX2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG4gICAgICAgIGlmIGF0dHJzLm5hbWVcbiAgICAgICAgICAgIGF0dHJzLmh0bWwgPSBAZ2V0SHRtbCBhdHRyc1xuXG4gICAgICAgIGF0dHJzXG5cbiAgICBnZXRIdG1sIDogKGF0dHJzKSA9PlxuXG4gICAgICAgIGh0bWwgID0gXCJcIlxuICAgICAgICBsaW5rcyA9IFtdXG5cbiAgICAgICAgaWYgYXR0cnMud2Vic2l0ZVxuICAgICAgICAgICAgaHRtbCArPSBcIjxhIGhyZWY9XFxcIiN7YXR0cnMud2Vic2l0ZX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj4je2F0dHJzLm5hbWV9PC9hPiBcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBodG1sICs9IFwiI3thdHRycy5uYW1lfSBcIlxuXG4gICAgICAgIGlmIGF0dHJzLnR3aXR0ZXIgdGhlbiBsaW5rcy5wdXNoIFwiPGEgaHJlZj1cXFwiaHR0cDovL3R3aXR0ZXIuY29tLyN7YXR0cnMudHdpdHRlcn1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj50dzwvYT5cIlxuICAgICAgICBpZiBhdHRycy5naXRodWIgdGhlbiBsaW5rcy5wdXNoIFwiPGEgaHJlZj1cXFwiaHR0cDovL2dpdGh1Yi5jb20vI3thdHRycy5naXRodWJ9XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+Z2g8L2E+XCJcblxuICAgICAgICBodG1sICs9IFwiKCN7bGlua3Muam9pbignLCAnKX0pXCJcblxuICAgICAgICBodG1sXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0b3JNb2RlbFxuIiwiY2xhc3MgQVBJUm91dGVNb2RlbCBleHRlbmRzIEJhY2tib25lLkRlZXBNb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuXG4gICAgICAgIHN0YXJ0ICAgICAgICAgOiBcIlwiICMgRWc6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3N0YXJ0XCJcblxuICAgICAgICBsb2NhbGUgICAgICAgIDogXCJcIiAjIEVnOiBcInt7IEJBU0VfVVJMIH19L2FwaS9sMTBuL3t7IGNvZGUgfX1cIlxuXG4gICAgICAgIHVzZXIgICAgICAgICAgOlxuICAgICAgICAgICAgbG9naW4gICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvbG9naW5cIlxuICAgICAgICAgICAgcmVnaXN0ZXIgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcmVnaXN0ZXJcIlxuICAgICAgICAgICAgcGFzc3dvcmQgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcGFzc3dvcmRcIlxuICAgICAgICAgICAgdXBkYXRlICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvdXBkYXRlXCJcbiAgICAgICAgICAgIGxvZ291dCAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL2xvZ291dFwiXG4gICAgICAgICAgICByZW1vdmUgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9yZW1vdmVcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IEFQSVJvdXRlTW9kZWxcbiIsImNsYXNzIExvY2FsZXNNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG4gICAgICAgIGNvZGUgICAgIDogbnVsbFxuICAgICAgICBsYW5ndWFnZSA6IG51bGxcbiAgICAgICAgc3RyaW5ncyAgOiBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRfbGFuZ3VhZ2UgOiA9PlxuICAgICAgICByZXR1cm4gQGdldCgnbGFuZ3VhZ2UnKVxuXG4gICAgZ2V0U3RyaW5nIDogKGlkKSA9PlxuICAgICAgICAoKHJldHVybiBlIGlmKGEgaXMgaWQpKSBmb3IgYSwgZSBvZiB2WydzdHJpbmdzJ10pIGZvciBrLCB2IG9mIEBnZXQoJ3N0cmluZ3MnKVxuICAgICAgICBjb25zb2xlLndhcm4gXCJMb2NhbGVzIC0+IG5vdCBmb3VuZCBzdHJpbmc6ICN7aWR9XCJcbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZXNNb2RlbFxuIiwiY2xhc3MgVGVtcGxhdGVNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cblx0ZGVmYXVsdHMgOiBcblxuXHRcdGlkICAgOiBcIlwiXG5cdFx0dGV4dCA6IFwiXCJcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZU1vZGVsXG4iLCJBYnN0cmFjdE1vZGVsICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0TW9kZWwnXG5OdW1iZXJVdGlscyAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL051bWJlclV0aWxzJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgRG9vZGxlTW9kZWwgZXh0ZW5kcyBBYnN0cmFjdE1vZGVsXG5cblx0ZGVmYXVsdHMgOlxuXHRcdCMgZnJvbSBtYW5pZmVzdFxuXHRcdFwibmFtZVwiIDogXCJcIlxuXHRcdFwiYXV0aG9yXCIgOlxuXHRcdFx0XCJuYW1lXCIgICAgOiBcIlwiXG5cdFx0XHRcImdpdGh1YlwiICA6IFwiXCJcblx0XHRcdFwid2Vic2l0ZVwiIDogXCJcIlxuXHRcdFx0XCJ0d2l0dGVyXCIgOiBcIlwiXG5cdFx0XCJkZXNjcmlwdGlvblwiOiBcIlwiXG5cdFx0XCJ0YWdzXCIgOiBbXVxuXHRcdFwiaW50ZXJhY3Rpb25cIiA6XG5cdFx0XHRcIm1vdXNlXCIgICAgOiBudWxsXG5cdFx0XHRcImtleWJvYXJkXCIgOiBudWxsXG5cdFx0XHRcInRvdWNoXCIgICAgOiBudWxsXG5cdFx0XCJjcmVhdGVkXCIgOiBcIlwiXG5cdFx0XCJzbHVnXCIgOiBcIlwiXG5cdFx0XCJpbmRleFwiOiBudWxsXG5cdFx0IyBzaXRlLW9ubHlcblx0XHRcImluZGV4SFRNTFwiIDogXCJcIlxuXHRcdFwic291cmNlXCIgICAgOiBcIlwiXG5cdFx0XCJ1cmxcIiAgICAgICA6IFwiXCJcblx0XHRcInNjcmFtYmxlZFwiIDpcblx0XHRcdFwibmFtZVwiICAgICAgICA6IFwiXCJcblx0XHRcdFwiYXV0aG9yX25hbWVcIiA6IFwiXCJcblxuXHRfZmlsdGVyQXR0cnMgOiAoYXR0cnMpID0+XG5cblx0XHRpZiBhdHRycy5zbHVnXG5cdFx0XHRhdHRycy51cmwgPSB3aW5kb3cuY29uZmlnLmhvc3RuYW1lICsgJy8nICsgd2luZG93LmNvbmZpZy5yb3V0ZXMuRE9PRExFUyArICcvJyArIGF0dHJzLnNsdWdcblxuXHRcdGlmIGF0dHJzLmluZGV4XG5cdFx0XHRhdHRycy5pbmRleCA9IE51bWJlclV0aWxzLnplcm9GaWxsIGF0dHJzLmluZGV4LCAzXG5cblx0XHRpZiBhdHRycy5uYW1lIGFuZCBhdHRycy5hdXRob3IubmFtZVxuXHRcdFx0YXR0cnMuc2NyYW1ibGVkID1cblx0XHRcdFx0bmFtZSAgICAgICAgOiBDb2RlV29yZFRyYW5zaXRpb25lci5nZXRTY3JhbWJsZWRXb3JkIGF0dHJzLm5hbWVcblx0XHRcdFx0YXV0aG9yX25hbWUgOiBDb2RlV29yZFRyYW5zaXRpb25lci5nZXRTY3JhbWJsZWRXb3JkIGF0dHJzLmF1dGhvci5uYW1lXG5cblx0XHRpZiBhdHRycy5pbmRleFxuXHRcdFx0YXR0cnMuaW5kZXhIVE1MID0gQGdldEluZGV4SFRNTCBhdHRycy5pbmRleFxuXG5cdFx0YXR0cnNcblxuXHRnZXRJbmRleEhUTUwgOiAoaW5kZXgpID0+XG5cblx0XHRIVE1MID0gXCJcIlxuXG5cdFx0Zm9yIGNoYXIgaW4gaW5kZXguc3BsaXQoJycpXG5cdFx0XHRjbGFzc05hbWUgPSBpZiBjaGFyIGlzICcwJyB0aGVuICdpbmRleC1jaGFyLXplcm8nIGVsc2UgJ2luZGV4LWNoYXItbm9uemVybydcblx0XHRcdEhUTUwgKz0gXCI8c3BhbiBjbGFzcz1cXFwiI3tjbGFzc05hbWV9XFxcIj4je2NoYXJ9PC9zcGFuPlwiXG5cblx0XHRIVE1MXG5cbm1vZHVsZS5leHBvcnRzID0gRG9vZGxlTW9kZWxcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUm91dGVyICAgICAgID0gcmVxdWlyZSAnLi9Sb3V0ZXInXG5cbmNsYXNzIE5hdiBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgQEVWRU5UX0NIQU5HRV9WSUVXICAgICA6ICdFVkVOVF9DSEFOR0VfVklFVydcbiAgICBARVZFTlRfQ0hBTkdFX1NVQl9WSUVXIDogJ0VWRU5UX0NIQU5HRV9TVUJfVklFVydcblxuICAgIHNlY3Rpb25zIDogbnVsbCAjIHNldCB2aWEgd2luZG93LmNvbmZpZyBkYXRhLCBzbyBjYW4gYmUgY29uc2lzdGVudCB3aXRoIGJhY2tlbmRcblxuICAgIGN1cnJlbnQgIDogYXJlYSA6IG51bGwsIHN1YiA6IG51bGwsIHRlciA6IG51bGxcbiAgICBwcmV2aW91cyA6IGFyZWEgOiBudWxsLCBzdWIgOiBudWxsLCB0ZXIgOiBudWxsXG5cbiAgICBjaGFuZ2VWaWV3Q291bnQgOiAwXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAc2VjdGlvbnMgPSB3aW5kb3cuY29uZmlnLnJvdXRlc1xuICAgICAgICBAZmF2aWNvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYXZpY29uJylcblxuICAgICAgICBAQ0QoKS5yb3V0ZXIub24gUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQGNoYW5nZVZpZXdcblxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgIGdldFNlY3Rpb24gOiAoc2VjdGlvbiwgc3RyaWN0PWZhbHNlKSA9PlxuXG4gICAgICAgIGlmICFzdHJpY3QgYW5kIHNlY3Rpb24gaXMgJycgdGhlbiByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIGZvciBzZWN0aW9uTmFtZSwgdXJpIG9mIEBzZWN0aW9uc1xuICAgICAgICAgICAgaWYgdXJpIGlzIHNlY3Rpb24gdGhlbiByZXR1cm4gc2VjdGlvbk5hbWVcblxuICAgICAgICBmYWxzZVxuXG4gICAgY2hhbmdlVmlldzogKGFyZWEsIHN1YiwgdGVyLCBwYXJhbXMpID0+XG5cbiAgICAgICAgIyBjb25zb2xlLmxvZyBcImFyZWFcIixhcmVhXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJzdWJcIixzdWJcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInRlclwiLHRlclxuICAgICAgICAjIGNvbnNvbGUubG9nIFwicGFyYW1zXCIscGFyYW1zXG5cbiAgICAgICAgQGNoYW5nZVZpZXdDb3VudCsrXG5cbiAgICAgICAgQHByZXZpb3VzID0gQGN1cnJlbnRcbiAgICAgICAgQGN1cnJlbnQgID0gYXJlYSA6IGFyZWEsIHN1YiA6IHN1YiwgdGVyIDogdGVyXG5cbiAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9WSUVXLCBAcHJldmlvdXMsIEBjdXJyZW50XG4gICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjdXJyZW50XG5cbiAgICAgICAgaWYgQENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIuaXNPcGVuKCkgdGhlbiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5oaWRlT3Blbk1vZGFsKClcblxuICAgICAgICBAc2V0UGFnZVRpdGxlIGFyZWEsIHN1YiwgdGVyXG4gICAgICAgIEBzZXRQYWdlRmF2aWNvbiBhcmVhXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2V0UGFnZVRpdGxlOiAoYXJlYSwgc3ViLCB0ZXIpID0+XG5cbiAgICAgICAgc2VjdGlvbiAgID0gaWYgYXJlYSBpcyAnJyB0aGVuICdIT01FJyBlbHNlIEBDRCgpLm5hdi5nZXRTZWN0aW9uIGFyZWFcbiAgICAgICAgdGl0bGVUbXBsID0gQENEKCkubG9jYWxlLmdldChcInBhZ2VfdGl0bGVfI3tzZWN0aW9ufVwiKSBvciBAQ0QoKS5sb2NhbGUuZ2V0KFwicGFnZV90aXRsZV9IT01FXCIpXG4gICAgICAgIHRpdGxlID0gQHN1cHBsYW50U3RyaW5nIHRpdGxlVG1wbCwgQGdldFBhZ2VUaXRsZVZhcnMoYXJlYSwgc3ViLCB0ZXIpLCBmYWxzZVxuXG4gICAgICAgIGlmIHdpbmRvdy5kb2N1bWVudC50aXRsZSBpc250IHRpdGxlIHRoZW4gd2luZG93LmRvY3VtZW50LnRpdGxlID0gdGl0bGVcblxuICAgICAgICBudWxsXG5cbiAgICBzZXRQYWdlRmF2aWNvbjogKGFyZWEpID0+XG5cbiAgICAgICAgY29sb3VyID0gc3dpdGNoIGFyZWFcbiAgICAgICAgICAgIHdoZW4gQHNlY3Rpb25zLkhPTUUgdGhlbiAncmVkJ1xuICAgICAgICAgICAgd2hlbiBAc2VjdGlvbnMuQUJPVVQsIEBzZWN0aW9ucy5DT05UUklCVVRFIHRoZW4gJ2JsYWNrJ1xuICAgICAgICAgICAgd2hlbiBAc2VjdGlvbnMuRE9PRExFUyB0aGVuICdibHVlJ1xuICAgICAgICAgICAgZWxzZSAncmVkJ1xuXG4gICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgIEBmYXZpY29uLmhyZWYgPSBcIiN7QENEKCkuQkFTRV9VUkx9L3N0YXRpYy9pbWcvaWNvbnMvZmF2aWNvbi9mYXZpY29uXyN7Y29sb3VyfS5wbmdcIlxuICAgICAgICAsIDBcblxuICAgICAgICBudWxsXG5cbiAgICBnZXRQYWdlVGl0bGVWYXJzOiAoYXJlYSwgc3ViLCB0ZXIpID0+XG5cbiAgICAgICAgdmFycyA9IHt9XG5cbiAgICAgICAgaWYgYXJlYSBpcyBAc2VjdGlvbnMuRE9PRExFUyBhbmQgc3ViIGFuZCB0ZXJcbiAgICAgICAgICAgIGRvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5maW5kV2hlcmUgc2x1ZzogXCIje3N1Yn0vI3t0ZXJ9XCJcblxuICAgICAgICAgICAgaWYgIWRvb2RsZVxuICAgICAgICAgICAgICAgIHZhcnMubmFtZSA9IFwiZG9vZGxlXCJcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB2YXJzLm5hbWUgPSBkb29kbGUuZ2V0KCdhdXRob3IubmFtZScpICsgJyBcXFxcICcgKyBkb29kbGUuZ2V0KCduYW1lJykgKyAnICdcblxuICAgICAgICB2YXJzXG5cbm1vZHVsZS5leHBvcnRzID0gTmF2XG4iLCJjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuICAgIEBFVkVOVF9IQVNIX0NIQU5HRUQgOiAnRVZFTlRfSEFTSF9DSEFOR0VEJ1xuXG4gICAgRklSU1RfUk9VVEUgOiB0cnVlXG5cbiAgICByb3V0ZXMgOlxuICAgICAgICAnKC8pKDphcmVhKSgvOnN1YikoLzp0ZXIpKC8pJyA6ICdoYXNoQ2hhbmdlZCdcbiAgICAgICAgJyphY3Rpb25zJyAgICAgICAgICAgICAgICAgICAgOiAnbmF2aWdhdGVUbydcblxuICAgIGFyZWEgICA6IG51bGxcbiAgICBzdWIgICAgOiBudWxsXG4gICAgdGVyICAgIDogbnVsbFxuICAgIHBhcmFtcyA6IG51bGxcblxuICAgIHN0YXJ0IDogPT5cblxuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0IFxuICAgICAgICAgICAgcHVzaFN0YXRlIDogdHJ1ZVxuICAgICAgICAgICAgcm9vdCAgICAgIDogJy8nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaGFzaENoYW5nZWQgOiAoQGFyZWEgPSBudWxsLCBAc3ViID0gbnVsbCwgQHRlciA9IG51bGwpID0+XG5cbiAgICAgICAgY29uc29sZS5sb2cgXCI+PiBFVkVOVF9IQVNIX0NIQU5HRUQgQGFyZWEgPSAje0BhcmVhfSwgQHN1YiA9ICN7QHN1Yn0sIEB0ZXIgPSAje0B0ZXJ9IDw8XCJcblxuICAgICAgICBpZiBARklSU1RfUk9VVEUgdGhlbiBARklSU1RfUk9VVEUgPSBmYWxzZVxuXG4gICAgICAgIGlmICFAYXJlYSB0aGVuIEBhcmVhID0gQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcblxuICAgICAgICBAdHJpZ2dlciBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAYXJlYSwgQHN1YiwgQHRlciwgQHBhcmFtc1xuXG4gICAgICAgIG51bGxcblxuICAgIG5hdmlnYXRlVG8gOiAod2hlcmUgPSAnJywgdHJpZ2dlciA9IHRydWUsIHJlcGxhY2UgPSBmYWxzZSwgQHBhcmFtcykgPT5cblxuICAgICAgICBpZiB3aGVyZS5jaGFyQXQoMCkgaXNudCBcIi9cIlxuICAgICAgICAgICAgd2hlcmUgPSBcIi8je3doZXJlfVwiXG4gICAgICAgIGlmIHdoZXJlLmNoYXJBdCggd2hlcmUubGVuZ3RoLTEgKSBpc250IFwiL1wiXG4gICAgICAgICAgICB3aGVyZSA9IFwiI3t3aGVyZX0vXCJcblxuICAgICAgICBpZiAhdHJpZ2dlclxuICAgICAgICAgICAgQHRyaWdnZXIgUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgd2hlcmUsIG51bGwsIEBwYXJhbXNcbiAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIEBuYXZpZ2F0ZSB3aGVyZSwgdHJpZ2dlcjogdHJ1ZSwgcmVwbGFjZTogcmVwbGFjZVxuXG4gICAgICAgIG51bGxcblxuICAgIENEIDogPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyXG4iLCIjIyNcbkFuYWx5dGljcyB3cmFwcGVyXG4jIyNcbmNsYXNzIEFuYWx5dGljc1xuXG4gICAgdGFncyAgICA6IG51bGxcbiAgICBzdGFydGVkIDogZmFsc2VcblxuICAgIGF0dGVtcHRzICAgICAgICA6IDBcbiAgICBhbGxvd2VkQXR0ZW1wdHMgOiA1XG5cbiAgICBjb25zdHJ1Y3RvciA6ICh0YWdzLCBAY2FsbGJhY2spIC0+XG5cbiAgICAgICAgJC5nZXRKU09OIHRhZ3MsIEBvblRhZ3NSZWNlaXZlZFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvblRhZ3NSZWNlaXZlZCA6IChkYXRhKSA9PlxuXG4gICAgICAgIEB0YWdzICAgID0gZGF0YVxuICAgICAgICBAc3RhcnRlZCA9IHRydWVcbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgIyMjXG4gICAgQHBhcmFtIHN0cmluZyBpZCBvZiB0aGUgdHJhY2tpbmcgdGFnIHRvIGJlIHB1c2hlZCBvbiBBbmFseXRpY3MgXG4gICAgIyMjXG4gICAgdHJhY2sgOiAocGFyYW0pID0+XG5cbiAgICAgICAgcmV0dXJuIGlmICFAc3RhcnRlZFxuXG4gICAgICAgIGlmIHBhcmFtXG5cbiAgICAgICAgICAgIHYgPSBAdGFnc1twYXJhbV1cblxuICAgICAgICAgICAgaWYgdlxuXG4gICAgICAgICAgICAgICAgYXJncyA9IFsnc2VuZCcsICdldmVudCddXG4gICAgICAgICAgICAgICAgKCBhcmdzLnB1c2goYXJnKSApIGZvciBhcmcgaW4gdlxuXG4gICAgICAgICAgICAgICAgIyBsb2FkaW5nIEdBIGFmdGVyIG1haW4gYXBwIEpTLCBzbyBleHRlcm5hbCBzY3JpcHQgbWF5IG5vdCBiZSBoZXJlIHlldFxuICAgICAgICAgICAgICAgIGlmIHdpbmRvdy5nYVxuICAgICAgICAgICAgICAgICAgICBnYS5hcHBseSBudWxsLCBhcmdzXG4gICAgICAgICAgICAgICAgZWxzZSBpZiBAYXR0ZW1wdHMgPj0gQGFsbG93ZWRBdHRlbXB0c1xuICAgICAgICAgICAgICAgICAgICBAc3RhcnRlZCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICBAdHJhY2sgcGFyYW1cbiAgICAgICAgICAgICAgICAgICAgICAgIEBhdHRlbXB0cysrXG4gICAgICAgICAgICAgICAgICAgICwgMjAwMFxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBbmFseXRpY3NcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuRmFjZWJvb2sgICAgID0gcmVxdWlyZSAnLi4vdXRpbHMvRmFjZWJvb2snXG5Hb29nbGVQbHVzICAgPSByZXF1aXJlICcuLi91dGlscy9Hb29nbGVQbHVzJ1xuXG5jbGFzcyBBdXRoTWFuYWdlciBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdHVzZXJEYXRhICA6IG51bGxcblxuXHQjIEBwcm9jZXNzIHRydWUgZHVyaW5nIGxvZ2luIHByb2Nlc3Ncblx0cHJvY2VzcyAgICAgIDogZmFsc2Vcblx0cHJvY2Vzc1RpbWVyIDogbnVsbFxuXHRwcm9jZXNzV2FpdCAgOiA1MDAwXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHVzZXJEYXRhICA9IEBDRCgpLmFwcERhdGEuVVNFUlxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRsb2dpbiA6IChzZXJ2aWNlLCBjYj1udWxsKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcIisrKysgUFJPQ0VTUyBcIixAcHJvY2Vzc1xuXG5cdFx0cmV0dXJuIGlmIEBwcm9jZXNzXG5cblx0XHRAc2hvd0xvYWRlcigpXG5cdFx0QHByb2Nlc3MgPSB0cnVlXG5cblx0XHQkZGF0YURmZCA9ICQuRGVmZXJyZWQoKVxuXG5cdFx0c3dpdGNoIHNlcnZpY2Vcblx0XHRcdHdoZW4gJ2dvb2dsZSdcblx0XHRcdFx0R29vZ2xlUGx1cy5sb2dpbiAkZGF0YURmZFxuXHRcdFx0d2hlbiAnZmFjZWJvb2snXG5cdFx0XHRcdEZhY2Vib29rLmxvZ2luICRkYXRhRGZkXG5cblx0XHQkZGF0YURmZC5kb25lIChyZXMpID0+IEBhdXRoU3VjY2VzcyBzZXJ2aWNlLCByZXNcblx0XHQkZGF0YURmZC5mYWlsIChyZXMpID0+IEBhdXRoRmFpbCBzZXJ2aWNlLCByZXNcblx0XHQkZGF0YURmZC5hbHdheXMgKCkgPT4gQGF1dGhDYWxsYmFjayBjYlxuXG5cdFx0IyMjXG5cdFx0VW5mb3J0dW5hdGVseSBubyBjYWxsYmFjayBpcyBmaXJlZCBpZiB1c2VyIG1hbnVhbGx5IGNsb3NlcyBHKyBsb2dpbiBtb2RhbCxcblx0XHRzbyB0aGlzIGlzIHRvIGFsbG93IHRoZW0gdG8gY2xvc2Ugd2luZG93IGFuZCB0aGVuIHN1YnNlcXVlbnRseSB0cnkgdG8gbG9nIGluIGFnYWluLi4uXG5cdFx0IyMjXG5cdFx0QHByb2Nlc3NUaW1lciA9IHNldFRpbWVvdXQgQGF1dGhDYWxsYmFjaywgQHByb2Nlc3NXYWl0XG5cblx0XHQkZGF0YURmZFxuXG5cdGF1dGhTdWNjZXNzIDogKHNlcnZpY2UsIGRhdGEpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwibG9naW4gY2FsbGJhY2sgZm9yICN7c2VydmljZX0sIGRhdGEgPT4gXCIsIGRhdGFcblxuXHRcdG51bGxcblxuXHRhdXRoRmFpbCA6IChzZXJ2aWNlLCBkYXRhKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImxvZ2luIGZhaWwgZm9yICN7c2VydmljZX0gPT4gXCIsIGRhdGFcblxuXHRcdG51bGxcblxuXHRhdXRoQ2FsbGJhY2sgOiAoY2I9bnVsbCkgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgQHByb2Nlc3NcblxuXHRcdGNsZWFyVGltZW91dCBAcHJvY2Vzc1RpbWVyXG5cblx0XHRAaGlkZUxvYWRlcigpXG5cdFx0QHByb2Nlc3MgPSBmYWxzZVxuXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHQjIyNcblx0c2hvdyAvIGhpZGUgc29tZSBVSSBpbmRpY2F0b3IgdGhhdCB3ZSBhcmUgd2FpdGluZyBmb3Igc29jaWFsIG5ldHdvcmsgdG8gcmVzcG9uZFxuXHQjIyNcblx0c2hvd0xvYWRlciA6ID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwic2hvd0xvYWRlclwiXG5cblx0XHRudWxsXG5cblx0aGlkZUxvYWRlciA6ID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwiaGlkZUxvYWRlclwiXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXV0aE1hbmFnZXJcbiIsImVuY29kZSA9IHJlcXVpcmUgJ2VudC9lbmNvZGUnXG5cbmNsYXNzIENvZGVXb3JkVHJhbnNpdGlvbmVyXG5cblx0QGNvbmZpZyA6XG5cdFx0TUlOX1dST05HX0NIQVJTIDogMVxuXHRcdE1BWF9XUk9OR19DSEFSUyA6IDdcblxuXHRcdE1JTl9DSEFSX0lOX0RFTEFZIDogNDBcblx0XHRNQVhfQ0hBUl9JTl9ERUxBWSA6IDcwXG5cblx0XHRNSU5fQ0hBUl9PVVRfREVMQVkgOiA0MFxuXHRcdE1BWF9DSEFSX09VVF9ERUxBWSA6IDcwXG5cblx0XHRDSEFSUyA6ICdhYmNkZWZoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSE/KigpQMKjJCVeJl8tKz1bXXt9OjtcXCdcIlxcXFx8PD4sLi9+YCcuc3BsaXQoJycpLm1hcCgoY2hhcikgPT4gcmV0dXJuIGVuY29kZShjaGFyKSlcblxuXHRcdENIQVJfVEVNUExBVEUgOiBcIjxzcGFuIGRhdGEtY29kZXRleHQtY2hhcj1cXFwie3sgY2hhciB9fVxcXCIgZGF0YS1jb2RldGV4dC1jaGFyLXN0YXRlPVxcXCJ7eyBzdGF0ZSB9fVxcXCI+e3sgY2hhciB9fTwvc3Bhbj5cIlxuXG5cdEBfd29yZENhY2hlIDoge31cblxuXHRAX2dldFdvcmRGcm9tQ2FjaGUgOiAoJGVsKSA9PlxuXG5cdFx0aWQgPSAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pZCcpXG5cblx0XHRpZiBpZCBhbmQgQF93b3JkQ2FjaGVbIGlkIF1cblx0XHRcdHdvcmQgPSBAX3dvcmRDYWNoZVsgaWQgXVxuXHRcdGVsc2Vcblx0XHRcdEBfd3JhcENoYXJzICRlbFxuXHRcdFx0d29yZCA9IEBfYWRkV29yZFRvQ2FjaGUgJGVsXG5cblx0XHR3b3JkXG5cblx0QF9hZGRXb3JkVG9DYWNoZSA6ICgkZWwpID0+XG5cblx0XHRjaGFycyA9IFtdXG5cblx0XHQkZWwuZmluZCgnW2RhdGEtY29kZXRleHQtY2hhcl0nKS5lYWNoIChpLCBlbCkgPT5cblx0XHRcdCRjaGFyRWwgPSAkKGVsKVxuXHRcdFx0Y2hhcnMucHVzaFxuXHRcdFx0XHQkZWwgICAgICAgIDogJGNoYXJFbFxuXHRcdFx0XHRyaWdodENoYXIgIDogJGNoYXJFbC5hdHRyKCdkYXRhLWNvZGV0ZXh0LWNoYXInKVxuXG5cdFx0aWQgPSBfLnVuaXF1ZUlkKClcblx0XHQkZWwuYXR0ciAnZGF0YS1jb2Rld29yZC1pZCcsIGlkXG5cblx0XHRAX3dvcmRDYWNoZVsgaWQgXSA9XG5cdFx0XHR3b3JkICAgIDogXy5wbHVjayhjaGFycywgJ3JpZ2h0Q2hhcicpLmpvaW4oJycpXG5cdFx0XHQkZWwgICAgIDogJGVsXG5cdFx0XHRjaGFycyAgIDogY2hhcnNcblx0XHRcdHZpc2libGUgOiB0cnVlXG5cblx0XHRAX3dvcmRDYWNoZVsgaWQgXVxuXG5cdEBfd3JhcENoYXJzIDogKCRlbCkgPT5cblxuXHRcdGNoYXJzID0gJGVsLnRleHQoKS5zcGxpdCgnJylcblx0XHRzdGF0ZSA9ICRlbC5hdHRyKCdkYXRhLWNvZGV3b3JkLWluaXRpYWwtc3RhdGUnKSBvciBcIlwiXG5cdFx0aHRtbCA9IFtdXG5cdFx0Zm9yIGNoYXIgaW4gY2hhcnNcblx0XHRcdGh0bWwucHVzaCBAX3N1cHBsYW50U3RyaW5nIEBjb25maWcuQ0hBUl9URU1QTEFURSwgY2hhciA6IGNoYXIsIHN0YXRlOiBzdGF0ZVxuXG5cdFx0JGVsLmh0bWwgaHRtbC5qb2luKCcnKVxuXG5cdFx0bnVsbFxuXG5cdEBfaXNXb3JkRW1wdHkgOiAod29yZCkgPT5cblxuXHRcdG51bGxcblxuXHQjIEBwYXJhbSB0YXJnZXQgPSAncmlnaHQnLCAnd3JvbmcnLCAnZW1wdHknXG5cdEBfcHJlcGFyZVdvcmQgOiAod29yZCwgdGFyZ2V0LCBjaGFyU3RhdGU9JycpID0+XG5cblx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cblx0XHRcdHRhcmdldENoYXIgPSBzd2l0Y2ggdHJ1ZVxuXHRcdFx0XHR3aGVuIHRhcmdldCBpcyAncmlnaHQnIHRoZW4gY2hhci5yaWdodENoYXJcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ3dyb25nJyB0aGVuIEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICdlbXB0eScgdGhlbiAnJ1xuXHRcdFx0XHRlbHNlIHRhcmdldC5jaGFyQXQoaSkgb3IgJydcblxuXHRcdFx0aWYgdGFyZ2V0Q2hhciBpcyAnICcgdGhlbiB0YXJnZXRDaGFyID0gJyZuYnNwOydcblxuXHRcdFx0Y2hhci53cm9uZ0NoYXJzID0gQF9nZXRSYW5kb21Xcm9uZ0NoYXJzKClcblx0XHRcdGNoYXIudGFyZ2V0Q2hhciA9IHRhcmdldENoYXJcblx0XHRcdGNoYXIuY2hhclN0YXRlICA9IGNoYXJTdGF0ZVxuXG5cdFx0bnVsbFxuXG5cdEBfZ2V0UmFuZG9tV3JvbmdDaGFycyA6ID0+XG5cblx0XHRjaGFycyA9IFtdXG5cblx0XHRjaGFyQ291bnQgPSBfLnJhbmRvbSBAY29uZmlnLk1JTl9XUk9OR19DSEFSUywgQGNvbmZpZy5NQVhfV1JPTkdfQ0hBUlNcblxuXHRcdGZvciBpIGluIFswLi4uY2hhckNvdW50XVxuXHRcdFx0Y2hhcnMucHVzaFxuXHRcdFx0XHRjaGFyICAgICA6IEBfZ2V0UmFuZG9tQ2hhcigpXG5cdFx0XHRcdGluRGVsYXkgIDogXy5yYW5kb20gQGNvbmZpZy5NSU5fQ0hBUl9JTl9ERUxBWSwgQGNvbmZpZy5NQVhfQ0hBUl9JTl9ERUxBWVxuXHRcdFx0XHRvdXREZWxheSA6IF8ucmFuZG9tIEBjb25maWcuTUlOX0NIQVJfT1VUX0RFTEFZLCBAY29uZmlnLk1BWF9DSEFSX09VVF9ERUxBWVxuXG5cdFx0Y2hhcnNcblxuXHRAX2dldFJhbmRvbUNoYXIgOiA9PlxuXG5cdFx0Y2hhciA9IEBjb25maWcuQ0hBUlNbIF8ucmFuZG9tKDAsIEBjb25maWcuQ0hBUlMubGVuZ3RoLTEpIF1cblxuXHRcdGNoYXJcblxuXHRAX2dldExvbmdlc3RDaGFyRHVyYXRpb24gOiAoY2hhcnMpID0+XG5cblx0XHRsb25nZXN0VGltZSA9IDBcblx0XHRsb25nZXN0VGltZUlkeCA9IDBcblxuXHRcdGZvciBjaGFyLCBpIGluIGNoYXJzXG5cblx0XHRcdHRpbWUgPSAwXG5cdFx0XHQodGltZSArPSB3cm9uZ0NoYXIuaW5EZWxheSArIHdyb25nQ2hhci5vdXREZWxheSkgZm9yIHdyb25nQ2hhciBpbiBjaGFyLndyb25nQ2hhcnNcblx0XHRcdGlmIHRpbWUgPiBsb25nZXN0VGltZVxuXHRcdFx0XHRsb25nZXN0VGltZSA9IHRpbWVcblx0XHRcdFx0bG9uZ2VzdFRpbWVJZHggPSBpXG5cblx0XHRsb25nZXN0VGltZUlkeFxuXG5cdEBfYW5pbWF0ZUNoYXJzIDogKHdvcmQsIHNlcXVlbnRpYWwsIGNiKSA9PlxuXG5cdFx0YWN0aXZlQ2hhciA9IDBcblxuXHRcdGlmIHNlcXVlbnRpYWxcblx0XHRcdEBfYW5pbWF0ZUNoYXIgd29yZC5jaGFycywgYWN0aXZlQ2hhciwgdHJ1ZSwgY2Jcblx0XHRlbHNlXG5cdFx0XHRsb25nZXN0Q2hhcklkeCA9IEBfZ2V0TG9uZ2VzdENoYXJEdXJhdGlvbiB3b3JkLmNoYXJzXG5cdFx0XHRmb3IgY2hhciwgaSBpbiB3b3JkLmNoYXJzXG5cdFx0XHRcdGFyZ3MgPSBbIHdvcmQuY2hhcnMsIGksIGZhbHNlIF1cblx0XHRcdFx0aWYgaSBpcyBsb25nZXN0Q2hhcklkeCB0aGVuIGFyZ3MucHVzaCBjYlxuXHRcdFx0XHRAX2FuaW1hdGVDaGFyLmFwcGx5IEAsIGFyZ3NcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVDaGFyIDogKGNoYXJzLCBpZHgsIHJlY3Vyc2UsIGNiKSA9PlxuXG5cdFx0Y2hhciA9IGNoYXJzW2lkeF1cblxuXHRcdGlmIHJlY3Vyc2VcblxuXHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyLCA9PlxuXG5cdFx0XHRcdGlmIGlkeCBpcyBjaGFycy5sZW5ndGgtMVxuXHRcdFx0XHRcdEBfYW5pbWF0ZUNoYXJzRG9uZSBjYlxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0QF9hbmltYXRlQ2hhciBjaGFycywgaWR4KzEsIHJlY3Vyc2UsIGNiXG5cblx0XHRlbHNlXG5cblx0XHRcdGlmIHR5cGVvZiBjYiBpcyAnZnVuY3Rpb24nXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgPT4gQF9hbmltYXRlQ2hhcnNEb25lIGNiXG5cdFx0XHRlbHNlXG5cdFx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhclxuXG5cdFx0bnVsbFxuXG5cdEBfYW5pbWF0ZVdyb25nQ2hhcnMgOiAoY2hhciwgY2IpID0+XG5cblx0XHRpZiBjaGFyLndyb25nQ2hhcnMubGVuZ3RoXG5cblx0XHRcdHdyb25nQ2hhciA9IGNoYXIud3JvbmdDaGFycy5zaGlmdCgpXG5cblx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0Y2hhci4kZWwuaHRtbCB3cm9uZ0NoYXIuY2hhclxuXG5cdFx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsIGNiXG5cdFx0XHRcdCwgd3JvbmdDaGFyLm91dERlbGF5XG5cblx0XHRcdCwgd3JvbmdDaGFyLmluRGVsYXlcblxuXHRcdGVsc2VcblxuXHRcdFx0Y2hhci4kZWxcblx0XHRcdFx0LmF0dHIoJ2RhdGEtY29kZXRleHQtY2hhci1zdGF0ZScsIGNoYXIuY2hhclN0YXRlKVxuXHRcdFx0XHQuaHRtbChjaGFyLnRhcmdldENoYXIpXG5cblx0XHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlQ2hhcnNEb25lIDogKGNiKSA9PlxuXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRAX3N1cHBsYW50U3RyaW5nIDogKHN0ciwgdmFscykgPT5cblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSAve3sgKFtee31dKikgfX0vZywgKGEsIGIpID0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdEB0byA6ICh0YXJnZXRUZXh0LCAkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAdG8odGFyZ2V0VGV4dCwgXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXHRcdHdvcmQudmlzaWJsZSA9IHRydWVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgdGFyZ2V0VGV4dCwgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAaW4gOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQGluKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHR3b3JkLnZpc2libGUgPSB0cnVlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdyaWdodCcsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QG91dCA6ICgkZWwsIGNoYXJTdGF0ZSwgc2VxdWVudGlhbD1mYWxzZSwgY2I9bnVsbCkgPT5cblxuXHRcdGlmIF8uaXNBcnJheSAkZWxcblx0XHRcdChAb3V0KF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0d29yZC52aXNpYmxlID0gZmFsc2VcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ2VtcHR5JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHNjcmFtYmxlKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICd3cm9uZycsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QHVuc2NyYW1ibGUgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHVuc2NyYW1ibGUoXyRlbCwgY2hhclN0YXRlLCBjYikpIGZvciBfJGVsIGluICRlbFxuXHRcdFx0cmV0dXJuXG5cblx0XHR3b3JkID0gQF9nZXRXb3JkRnJvbUNhY2hlICRlbFxuXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdEBfcHJlcGFyZVdvcmQgd29yZCwgJ3JpZ2h0JywgY2hhclN0YXRlXG5cdFx0QF9hbmltYXRlQ2hhcnMgd29yZCwgc2VxdWVudGlhbCwgY2JcblxuXHRcdG51bGxcblxuXHRAZ2V0U2NyYW1ibGVkV29yZCA6ICh3b3JkKSA9PlxuXG5cdFx0bmV3Q2hhcnMgPSBbXVxuXHRcdChuZXdDaGFycy5wdXNoIEBfZ2V0UmFuZG9tQ2hhcigpKSBmb3IgY2hhciBpbiB3b3JkLnNwbGl0KCcnKVxuXG5cdFx0cmV0dXJuIG5ld0NoYXJzLmpvaW4oJycpXG5cbm1vZHVsZS5leHBvcnRzID0gQ29kZVdvcmRUcmFuc2l0aW9uZXJcblxud2luZG93LkNvZGVXb3JkVHJhbnNpdGlvbmVyPSBDb2RlV29yZFRyYW5zaXRpb25lclxuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5cbiMjI1xuXG5GYWNlYm9vayBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBGYWNlYm9vayBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdEB1cmwgICAgICAgICA6ICcvL2Nvbm5lY3QuZmFjZWJvb2submV0L2VuX1VTL2FsbC5qcydcblxuXHRAcGVybWlzc2lvbnMgOiAnZW1haWwnXG5cblx0QCRkYXRhRGZkICAgIDogbnVsbFxuXHRAbG9hZGVkICAgICAgOiBmYWxzZVxuXG5cdEBsb2FkIDogPT5cblxuXHRcdCMjI1xuXHRcdFRPIERPXG5cdFx0aW5jbHVkZSBzY3JpcHQgbG9hZGVyIHdpdGggY2FsbGJhY2sgdG8gOmluaXRcblx0XHQjIyNcblx0XHQjIHJlcXVpcmUgW0B1cmxdLCBAaW5pdFxuXG5cdFx0bnVsbFxuXG5cdEBpbml0IDogPT5cblxuXHRcdEBsb2FkZWQgPSB0cnVlXG5cblx0XHRGQi5pbml0XG5cdFx0XHRhcHBJZCAgOiB3aW5kb3cuY29uZmlnLmZiX2FwcF9pZFxuXHRcdFx0c3RhdHVzIDogZmFsc2Vcblx0XHRcdHhmYm1sICA6IGZhbHNlXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmICFAbG9hZGVkIHRoZW4gcmV0dXJuIEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0RkIubG9naW4gKCByZXMgKSA9PlxuXG5cdFx0XHRpZiByZXNbJ3N0YXR1cyddIGlzICdjb25uZWN0ZWQnXG5cdFx0XHRcdEBnZXRVc2VyRGF0YSByZXNbJ2F1dGhSZXNwb25zZSddWydhY2Nlc3NUb2tlbiddXG5cdFx0XHRlbHNlXG5cdFx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0LCB7IHNjb3BlOiBAcGVybWlzc2lvbnMgfVxuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdHVzZXJEYXRhID0ge31cblx0XHR1c2VyRGF0YS5hY2Nlc3NfdG9rZW4gPSB0b2tlblxuXG5cdFx0JG1lRGZkICAgPSAkLkRlZmVycmVkKClcblx0XHQkcGljRGZkICA9ICQuRGVmZXJyZWQoKVxuXG5cdFx0RkIuYXBpICcvbWUnLCAocmVzKSAtPlxuXG5cdFx0XHR1c2VyRGF0YS5mdWxsX25hbWUgPSByZXMubmFtZVxuXHRcdFx0dXNlckRhdGEuc29jaWFsX2lkID0gcmVzLmlkXG5cdFx0XHR1c2VyRGF0YS5lbWFpbCAgICAgPSByZXMuZW1haWwgb3IgZmFsc2Vcblx0XHRcdCRtZURmZC5yZXNvbHZlKClcblxuXHRcdEZCLmFwaSAnL21lL3BpY3R1cmUnLCB7ICd3aWR0aCc6ICcyMDAnIH0sIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLnByb2ZpbGVfcGljID0gcmVzLmRhdGEudXJsXG5cdFx0XHQkcGljRGZkLnJlc29sdmUoKVxuXG5cdFx0JC53aGVuKCRtZURmZCwgJHBpY0RmZCkuZG9uZSA9PiBAJGRhdGFEZmQucmVzb2x2ZSB1c2VyRGF0YVxuXG5cdFx0bnVsbFxuXG5cdEBzaGFyZSA6IChvcHRzLCBjYikgPT5cblxuXHRcdEZCLnVpIHtcblx0XHRcdG1ldGhvZCAgICAgIDogb3B0cy5tZXRob2Qgb3IgJ2ZlZWQnXG5cdFx0XHRuYW1lICAgICAgICA6IG9wdHMubmFtZSBvciAnJ1xuXHRcdFx0bGluayAgICAgICAgOiBvcHRzLmxpbmsgb3IgJydcblx0XHRcdHBpY3R1cmUgICAgIDogb3B0cy5waWN0dXJlIG9yICcnXG5cdFx0XHRjYXB0aW9uICAgICA6IG9wdHMuY2FwdGlvbiBvciAnJ1xuXHRcdFx0ZGVzY3JpcHRpb24gOiBvcHRzLmRlc2NyaXB0aW9uIG9yICcnXG5cdFx0fSwgKHJlc3BvbnNlKSAtPlxuXHRcdFx0Y2I/KHJlc3BvbnNlKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2Vib29rXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkdvb2dsZSsgU0RLIHdyYXBwZXIgLSBsb2FkIGFzeW5jaHJvbm91c2x5LCBzb21lIGhlbHBlciBtZXRob2RzXG5cbiMjI1xuY2xhc3MgR29vZ2xlUGx1cyBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdEB1cmwgICAgICA6ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQ6cGx1c29uZS5qcydcblxuXHRAcGFyYW1zICAgOlxuXHRcdCdjbGllbnRpZCcgICAgIDogbnVsbFxuXHRcdCdjYWxsYmFjaycgICAgIDogbnVsbFxuXHRcdCdzY29wZScgICAgICAgIDogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8uZW1haWwnXG5cdFx0J2Nvb2tpZXBvbGljeScgOiAnbm9uZSdcblxuXHRAJGRhdGFEZmQgOiBudWxsXG5cdEBsb2FkZWQgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEBwYXJhbXNbJ2NsaWVudGlkJ10gPSB3aW5kb3cuY29uZmlnLmdwX2FwcF9pZFxuXHRcdEBwYXJhbXNbJ2NhbGxiYWNrJ10gPSBAbG9naW5DYWxsYmFja1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbiA6IChAJGRhdGFEZmQpID0+XG5cblx0XHRpZiBAbG9hZGVkXG5cdFx0XHRnYXBpLmF1dGguc2lnbkluIEBwYXJhbXNcblx0XHRlbHNlXG5cdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdTREsgbm90IGxvYWRlZCdcblxuXHRcdG51bGxcblxuXHRAbG9naW5DYWxsYmFjayA6IChyZXMpID0+XG5cblx0XHRpZiByZXNbJ3N0YXR1cyddWydzaWduZWRfaW4nXVxuXHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYWNjZXNzX3Rva2VuJ11cblx0XHRlbHNlIGlmIHJlc1snZXJyb3InXVsnYWNjZXNzX2RlbmllZCddXG5cdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdubyB3YXkgam9zZSdcblxuXHRcdG51bGxcblxuXHRAZ2V0VXNlckRhdGEgOiAodG9rZW4pID0+XG5cblx0XHRnYXBpLmNsaWVudC5sb2FkICdwbHVzJywndjEnLCA9PlxuXG5cdFx0XHRyZXF1ZXN0ID0gZ2FwaS5jbGllbnQucGx1cy5wZW9wbGUuZ2V0ICd1c2VySWQnOiAnbWUnXG5cdFx0XHRyZXF1ZXN0LmV4ZWN1dGUgKHJlcykgPT5cblxuXHRcdFx0XHR1c2VyRGF0YSA9XG5cdFx0XHRcdFx0YWNjZXNzX3Rva2VuIDogdG9rZW5cblx0XHRcdFx0XHRmdWxsX25hbWUgICAgOiByZXMuZGlzcGxheU5hbWVcblx0XHRcdFx0XHRzb2NpYWxfaWQgICAgOiByZXMuaWRcblx0XHRcdFx0XHRlbWFpbCAgICAgICAgOiBpZiByZXMuZW1haWxzWzBdIHRoZW4gcmVzLmVtYWlsc1swXS52YWx1ZSBlbHNlIGZhbHNlXG5cdFx0XHRcdFx0cHJvZmlsZV9waWMgIDogcmVzLmltYWdlLnVybFxuXG5cdFx0XHRcdEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlUGx1c1xuIiwiIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIE1lZGlhIFF1ZXJpZXMgTWFuYWdlciBcbiMgICAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgICBcbiMgICBAYXV0aG9yIDogRsOhYmlvIEF6ZXZlZG8gPGZhYmlvLmF6ZXZlZG9AdW5pdDkuY29tPiBVTklUOVxuIyAgIEBkYXRlICAgOiBTZXB0ZW1iZXIgMTRcbiMgICBcbiMgICBJbnN0cnVjdGlvbnMgYXJlIG9uIC9wcm9qZWN0L3Nhc3MvdXRpbHMvX3Jlc3BvbnNpdmUuc2Nzcy5cblxuY2xhc3MgTWVkaWFRdWVyaWVzXG5cbiAgICAjIEJyZWFrcG9pbnRzXG4gICAgQFNNQUxMICAgICAgIDogXCJzbWFsbFwiXG4gICAgQElQQUQgICAgICAgIDogXCJpcGFkXCJcbiAgICBATUVESVVNICAgICAgOiBcIm1lZGl1bVwiXG4gICAgQExBUkdFICAgICAgIDogXCJsYXJnZVwiXG4gICAgQEVYVFJBX0xBUkdFIDogXCJleHRyYS1sYXJnZVwiXG5cbiAgICBAc2V0dXAgOiA9PlxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UICA9IHtuYW1lOiBcIlNtYWxsXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLlNNQUxMXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLk1FRElVTV9CUkVBS1BPSU5UID0ge25hbWU6IFwiTWVkaXVtXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLk1FRElVTV19XG4gICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UICA9IHtuYW1lOiBcIkxhcmdlXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLklQQUQsIE1lZGlhUXVlcmllcy5MQVJHRSwgTWVkaWFRdWVyaWVzLkVYVFJBX0xBUkdFXX1cblxuICAgICAgICBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFMgPSBbXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuU01BTExfQlJFQUtQT0lOVFxuICAgICAgICAgICAgTWVkaWFRdWVyaWVzLk1FRElVTV9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTEFSR0VfQlJFQUtQT0lOVFxuICAgICAgICBdXG4gICAgICAgIHJldHVyblxuXG4gICAgQGdldERldmljZVN0YXRlIDogPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSwgXCJhZnRlclwiKS5nZXRQcm9wZXJ0eVZhbHVlKFwiY29udGVudFwiKTtcblxuICAgIEBnZXRCcmVha3BvaW50IDogPT5cblxuICAgICAgICBzdGF0ZSA9IE1lZGlhUXVlcmllcy5nZXREZXZpY2VTdGF0ZSgpXG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5NZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFMubGVuZ3RoXVxuICAgICAgICAgICAgaWYgTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTW2ldLmJyZWFrcG9pbnRzLmluZGV4T2Yoc3RhdGUpID4gLTFcbiAgICAgICAgICAgICAgICByZXR1cm4gTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTW2ldLm5hbWVcblxuICAgICAgICByZXR1cm4gXCJcIlxuXG4gICAgQGlzQnJlYWtwb2ludCA6IChicmVha3BvaW50KSA9PlxuXG4gICAgICAgIGZvciBpIGluIFswLi4uYnJlYWtwb2ludC5icmVha3BvaW50cy5sZW5ndGhdXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIGJyZWFrcG9pbnQuYnJlYWtwb2ludHNbaV0gPT0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG53aW5kb3cuTWVkaWFRdWVyaWVzID0gTWVkaWFRdWVyaWVzXG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWFRdWVyaWVzXG4iLCJjbGFzcyBOdW1iZXJVdGlsc1xuXG4gICAgQE1BVEhfQ09TOiBNYXRoLmNvcyBcbiAgICBATUFUSF9TSU46IE1hdGguc2luIFxuICAgIEBNQVRIX1JBTkRPTTogTWF0aC5yYW5kb20gXG4gICAgQE1BVEhfQUJTOiBNYXRoLmFic1xuICAgIEBNQVRIX0FUQU4yOiBNYXRoLmF0YW4yXG5cbiAgICBAbGltaXQ6KG51bWJlciwgbWluLCBtYXgpLT5cbiAgICAgICAgcmV0dXJuIE1hdGgubWluKCBNYXRoLm1heChtaW4sbnVtYmVyKSwgbWF4IClcblxuICAgIEBnZXRSYW5kb21Db2xvcjogLT5cblxuICAgICAgICBsZXR0ZXJzID0gJzAxMjM0NTY3ODlBQkNERUYnLnNwbGl0KCcnKVxuICAgICAgICBjb2xvciA9ICcjJ1xuICAgICAgICBmb3IgaSBpbiBbMC4uLjZdXG4gICAgICAgICAgICBjb2xvciArPSBsZXR0ZXJzW01hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDE1KV1cbiAgICAgICAgY29sb3JcblxuICAgIEBnZXRUaW1lU3RhbXBEaWZmIDogKGRhdGUxLCBkYXRlMikgLT5cblxuICAgICAgICAjIEdldCAxIGRheSBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgb25lX2RheSA9IDEwMDAqNjAqNjAqMjRcbiAgICAgICAgdGltZSAgICA9IHt9XG5cbiAgICAgICAgIyBDb252ZXJ0IGJvdGggZGF0ZXMgdG8gbWlsbGlzZWNvbmRzXG4gICAgICAgIGRhdGUxX21zID0gZGF0ZTEuZ2V0VGltZSgpXG4gICAgICAgIGRhdGUyX21zID0gZGF0ZTIuZ2V0VGltZSgpXG5cbiAgICAgICAgIyBDYWxjdWxhdGUgdGhlIGRpZmZlcmVuY2UgaW4gbWlsbGlzZWNvbmRzXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkYXRlMl9tcyAtIGRhdGUxX21zXG5cbiAgICAgICAgIyB0YWtlIG91dCBtaWxsaXNlY29uZHNcbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRpZmZlcmVuY2VfbXMvMTAwMFxuICAgICAgICB0aW1lLnNlY29uZHMgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zICUgNjApXG5cbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRpZmZlcmVuY2VfbXMvNjAgXG4gICAgICAgIHRpbWUubWludXRlcyAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMgJSA2MClcblxuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGlmZmVyZW5jZV9tcy82MCBcbiAgICAgICAgdGltZS5ob3VycyAgICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcyAlIDI0KSAgXG5cbiAgICAgICAgdGltZS5kYXlzICAgICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcy8yNClcblxuICAgICAgICB0aW1lXG5cbiAgICBAbWFwOiAoIG51bSwgbWluMSwgbWF4MSwgbWluMiwgbWF4Miwgcm91bmQgPSBmYWxzZSwgY29uc3RyYWluTWluID0gdHJ1ZSwgY29uc3RyYWluTWF4ID0gdHJ1ZSApIC0+XG4gICAgICAgIGlmIGNvbnN0cmFpbk1pbiBhbmQgbnVtIDwgbWluMSB0aGVuIHJldHVybiBtaW4yXG4gICAgICAgIGlmIGNvbnN0cmFpbk1heCBhbmQgbnVtID4gbWF4MSB0aGVuIHJldHVybiBtYXgyXG4gICAgICAgIFxuICAgICAgICBudW0xID0gKG51bSAtIG1pbjEpIC8gKG1heDEgLSBtaW4xKVxuICAgICAgICBudW0yID0gKG51bTEgKiAobWF4MiAtIG1pbjIpKSArIG1pbjJcbiAgICAgICAgaWYgcm91bmQgdGhlbiByZXR1cm4gTWF0aC5yb3VuZChudW0yKVxuXG4gICAgICAgIHJldHVybiBudW0yXG5cbiAgICBAdG9SYWRpYW5zOiAoIGRlZ3JlZSApIC0+XG4gICAgICAgIHJldHVybiBkZWdyZWUgKiAoIE1hdGguUEkgLyAxODAgKVxuXG4gICAgQHRvRGVncmVlOiAoIHJhZGlhbnMgKSAtPlxuICAgICAgICByZXR1cm4gcmFkaWFucyAqICggMTgwIC8gTWF0aC5QSSApXG5cbiAgICBAaXNJblJhbmdlOiAoIG51bSwgbWluLCBtYXgsIGNhbkJlRXF1YWwgKSAtPlxuICAgICAgICBpZiBjYW5CZUVxdWFsIHRoZW4gcmV0dXJuIG51bSA+PSBtaW4gJiYgbnVtIDw9IG1heFxuICAgICAgICBlbHNlIHJldHVybiBudW0gPj0gbWluICYmIG51bSA8PSBtYXhcblxuICAgICMgY29udmVydCBtZXRyZXMgaW4gdG8gbSAvIEtNXG4gICAgQGdldE5pY2VEaXN0YW5jZTogKG1ldHJlcykgPT5cblxuICAgICAgICBpZiBtZXRyZXMgPCAxMDAwXG5cbiAgICAgICAgICAgIHJldHVybiBcIiN7TWF0aC5yb3VuZChtZXRyZXMpfU1cIlxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAga20gPSAobWV0cmVzLzEwMDApLnRvRml4ZWQoMilcbiAgICAgICAgICAgIHJldHVybiBcIiN7a219S01cIlxuXG4gICAgIyBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEyNjczMzhcbiAgICBAemVyb0ZpbGw6ICggbnVtYmVyLCB3aWR0aCApID0+XG5cbiAgICAgICAgd2lkdGggLT0gbnVtYmVyLnRvU3RyaW5nKCkubGVuZ3RoXG5cbiAgICAgICAgaWYgd2lkdGggPiAwXG4gICAgICAgICAgICByZXR1cm4gbmV3IEFycmF5KCB3aWR0aCArICgvXFwuLy50ZXN0KCBudW1iZXIgKSA/IDIgOiAxKSApLmpvaW4oICcwJyApICsgbnVtYmVyXG5cbiAgICAgICAgcmV0dXJuIG51bWJlciArIFwiXCIgIyBhbHdheXMgcmV0dXJuIGEgc3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyVXRpbHNcbiIsIiMjI1xuIyBSZXF1ZXN0ZXIgI1xuXG5XcmFwcGVyIGZvciBgJC5hamF4YCBjYWxsc1xuXG4jIyNcbmNsYXNzIFJlcXVlc3RlclxuXG4gICAgQHJlcXVlc3RzIDogW11cblxuICAgIEByZXF1ZXN0OiAoIGRhdGEgKSA9PlxuICAgICAgICAjIyNcbiAgICAgICAgYGRhdGEgPSB7YDxicj5cbiAgICAgICAgYCAgdXJsICAgICAgICAgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgICB0eXBlICAgICAgICA6IFwiUE9TVC9HRVQvUFVUXCJgPGJyPlxuICAgICAgICBgICBkYXRhICAgICAgICA6IE9iamVjdGA8YnI+XG4gICAgICAgIGAgIGRhdGFUeXBlICAgIDogalF1ZXJ5IGRhdGFUeXBlYDxicj5cbiAgICAgICAgYCAgY29udGVudFR5cGUgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgfWBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgciA9ICQuYWpheCB7XG5cbiAgICAgICAgICAgIHVybCAgICAgICAgIDogZGF0YS51cmxcbiAgICAgICAgICAgIHR5cGUgICAgICAgIDogaWYgZGF0YS50eXBlIHRoZW4gZGF0YS50eXBlIGVsc2UgXCJQT1NUXCIsXG4gICAgICAgICAgICBkYXRhICAgICAgICA6IGlmIGRhdGEuZGF0YSB0aGVuIGRhdGEuZGF0YSBlbHNlIG51bGwsXG4gICAgICAgICAgICBkYXRhVHlwZSAgICA6IGlmIGRhdGEuZGF0YVR5cGUgdGhlbiBkYXRhLmRhdGFUeXBlIGVsc2UgXCJqc29uXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZSA6IGlmIGRhdGEuY29udGVudFR5cGUgdGhlbiBkYXRhLmNvbnRlbnRUeXBlIGVsc2UgXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLThcIixcbiAgICAgICAgICAgIHByb2Nlc3NEYXRhIDogaWYgZGF0YS5wcm9jZXNzRGF0YSAhPSBudWxsIGFuZCBkYXRhLnByb2Nlc3NEYXRhICE9IHVuZGVmaW5lZCB0aGVuIGRhdGEucHJvY2Vzc0RhdGEgZWxzZSB0cnVlXG5cbiAgICAgICAgfVxuXG4gICAgICAgIHIuZG9uZSBkYXRhLmRvbmVcbiAgICAgICAgci5mYWlsIGRhdGEuZmFpbFxuICAgICAgICBcbiAgICAgICAgclxuXG4gICAgQGFkZEltYWdlIDogKGRhdGEsIGRvbmUsIGZhaWwpID0+XG4gICAgICAgICMjI1xuICAgICAgICAqKiBVc2FnZTogPGJyPlxuICAgICAgICBgZGF0YSA9IGNhbnZhc3MudG9EYXRhVVJMKFwiaW1hZ2UvanBlZ1wiKS5zbGljZShcImRhdGE6aW1hZ2UvanBlZztiYXNlNjQsXCIubGVuZ3RoKWA8YnI+XG4gICAgICAgIGBSZXF1ZXN0ZXIuYWRkSW1hZ2UgZGF0YSwgXCJ6b2V0cm9wZVwiLCBAZG9uZSwgQGZhaWxgXG4gICAgICAgICMjI1xuXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJ1xuICAgICAgICAgICAgdHlwZSAgIDogJ1BPU1QnXG4gICAgICAgICAgICBkYXRhICAgOiB7aW1hZ2VfYmFzZTY0IDogZW5jb2RlVVJJKGRhdGEpfVxuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxuICAgIEBkZWxldGVJbWFnZSA6IChpZCwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJytpZFxuICAgICAgICAgICAgdHlwZSAgIDogJ0RFTEVURSdcbiAgICAgICAgICAgIGRvbmUgICA6IGRvbmVcbiAgICAgICAgICAgIGZhaWwgICA6IGZhaWxcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdGVyXG4iLCIjIyNcblNoYXJpbmcgY2xhc3MgZm9yIG5vbi1TREsgbG9hZGVkIHNvY2lhbCBuZXR3b3Jrcy5cbklmIFNESyBpcyBsb2FkZWQsIGFuZCBwcm92aWRlcyBzaGFyZSBtZXRob2RzLCB0aGVuIHVzZSB0aGF0IGNsYXNzIGluc3RlYWQsIGVnLiBgRmFjZWJvb2suc2hhcmVgIGluc3RlYWQgb2YgYFNoYXJlLmZhY2Vib29rYFxuIyMjXG5jbGFzcyBTaGFyZVxuXG4gICAgdXJsIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAtPlxuXG4gICAgICAgIEB1cmwgPSBAQ0QoKS5CQVNFX1VSTFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvcGVuV2luIDogKHVybCwgdywgaCkgPT5cblxuICAgICAgICBsZWZ0ID0gKCBzY3JlZW4uYXZhaWxXaWR0aCAgLSB3ICkgPj4gMVxuICAgICAgICB0b3AgID0gKCBzY3JlZW4uYXZhaWxIZWlnaHQgLSBoICkgPj4gMVxuXG4gICAgICAgIHdpbmRvdy5vcGVuIHVybCwgJycsICd0b3A9Jyt0b3ArJyxsZWZ0PScrbGVmdCsnLHdpZHRoPScrdysnLGhlaWdodD0nK2grJyxsb2NhdGlvbj1ubyxtZW51YmFyPW5vJ1xuXG4gICAgICAgIG51bGxcblxuICAgIHBsdXMgOiAoIHVybCApID0+XG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vc2hhcmU/dXJsPSN7dXJsfVwiLCA2NTAsIDM4NVxuXG4gICAgICAgIG51bGxcblxuICAgIHBpbnRlcmVzdCA6ICh1cmwsIG1lZGlhLCBkZXNjcikgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgbWVkaWEgPSBlbmNvZGVVUklDb21wb25lbnQobWVkaWEpXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGRlc2NyKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9I3t1cmx9Jm1lZGlhPSN7bWVkaWF9JmRlc2NyaXB0aW9uPSN7ZGVzY3J9XCIsIDczNSwgMzEwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHVtYmxyIDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnR1bWJsci5jb20vc2hhcmUvcGhvdG8/c291cmNlPSN7bWVkaWF9JmNhcHRpb249I3tkZXNjcn0mY2xpY2tfdGhydT0je3VybH1cIiwgNDUwLCA0MzBcblxuICAgICAgICBudWxsXG5cbiAgICBmYWNlYm9vayA6ICggdXJsICwgY29weSA9ICcnKSA9PiBcblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgZGVjc3IgPSBlbmNvZGVVUklDb21wb25lbnQoY29weSlcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlLnBocD91PSN7dXJsfSZ0PSN7ZGVjc3J9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHdpdHRlciA6ICggdXJsICwgY29weSA9ICcnKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBpZiBjb3B5IGlzICcnXG4gICAgICAgICAgICBjb3B5ID0gQENEKCkubG9jYWxlLmdldCAnc2VvX3R3aXR0ZXJfY2FyZF9kZXNjcmlwdGlvbidcbiAgICAgICAgICAgIFxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldC8/dGV4dD0je2Rlc2NyfSZ1cmw9I3t1cmx9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVucmVuIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2hhcmUucmVucmVuLmNvbS9zaGFyZS9idXR0b25zaGFyZS5kbz9saW5rPVwiICsgdXJsLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHdlaWJvIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2VydmljZS53ZWliby5jb20vc2hhcmUvc2hhcmUucGhwP3VybD0je3VybH0mbGFuZ3VhZ2U9emhfY25cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlXG4iLCJjbGFzcyBBYnN0cmFjdFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblx0ZWwgICAgICAgICAgIDogbnVsbFxuXHRpZCAgICAgICAgICAgOiBudWxsXG5cdGNoaWxkcmVuICAgICA6IG51bGxcblx0dGVtcGxhdGUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZVZhcnMgOiBudWxsXG5cdFxuXHRpbml0aWFsaXplIDogLT5cblx0XHRcblx0XHRAY2hpbGRyZW4gPSBbXVxuXG5cdFx0aWYgQHRlbXBsYXRlXG5cdFx0XHR0bXBIVE1MID0gXy50ZW1wbGF0ZSBAQ0QoKS50ZW1wbGF0ZXMuZ2V0IEB0ZW1wbGF0ZVxuXHRcdFx0QHNldEVsZW1lbnQgdG1wSFRNTCBAdGVtcGxhdGVWYXJzXG5cblx0XHRAJGVsLmF0dHIgJ2lkJywgQGlkIGlmIEBpZFxuXHRcdEAkZWwuYWRkQ2xhc3MgQGNsYXNzTmFtZSBpZiBAY2xhc3NOYW1lXG5cdFx0XG5cdFx0QGluaXQoKVxuXG5cdFx0QHBhdXNlZCA9IGZhbHNlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0dXBkYXRlIDogPT5cblxuXHRcdG51bGxcblxuXHRyZW5kZXIgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGFkZENoaWxkIDogKGNoaWxkLCBwcmVwZW5kID0gZmFsc2UpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdHRhcmdldCA9IGlmIEBhZGRUb1NlbGVjdG9yIHRoZW4gQCRlbC5maW5kKEBhZGRUb1NlbGVjdG9yKS5lcSgwKSBlbHNlIEAkZWxcblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXG5cdFx0aWYgIXByZXBlbmQgXG5cdFx0XHR0YXJnZXQuYXBwZW5kIGNcblx0XHRlbHNlIFxuXHRcdFx0dGFyZ2V0LnByZXBlbmQgY1xuXG5cdFx0QFxuXG5cdHJlcGxhY2UgOiAoZG9tLCBjaGlsZCkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblx0XHRAJGVsLmNoaWxkcmVuKGRvbSkucmVwbGFjZVdpdGgoYylcblxuXHRcdG51bGxcblxuXHRyZW1vdmUgOiAoY2hpbGQpID0+XG5cblx0XHR1bmxlc3MgY2hpbGQ/XG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSAkKGNoaWxkKVxuXHRcdGNoaWxkLmRpc3Bvc2UoKSBpZiBjIGFuZCBjaGlsZC5kaXNwb3NlXG5cblx0XHRpZiBjICYmIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPSAtMVxuXHRcdFx0QGNoaWxkcmVuLnNwbGljZSggQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxIClcblxuXHRcdGMucmVtb3ZlKClcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6IChldmVudCkgPT5cblxuXHRcdChpZiBjaGlsZC5vblJlc2l6ZSB0aGVuIGNoaWxkLm9uUmVzaXplKCkpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRtb3VzZUVuYWJsZWQgOiAoIGVuYWJsZWQgKSA9PlxuXG5cdFx0QCRlbC5jc3Ncblx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogaWYgZW5hYmxlZCB0aGVuIFwiYXV0b1wiIGVsc2UgXCJub25lXCJcblxuXHRcdG51bGxcblxuXHRDU1NUcmFuc2xhdGUgOiAoeCwgeSwgdmFsdWU9JyUnLCBzY2FsZSkgPT5cblxuXHRcdGlmIE1vZGVybml6ci5jc3N0cmFuc2Zvcm1zM2Rcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlM2QoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSwgMClcIlxuXHRcdGVsc2Vcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0pXCJcblxuXHRcdGlmIHNjYWxlIHRoZW4gc3RyID0gXCIje3N0cn0gc2NhbGUoI3tzY2FsZX0pXCJcblxuXHRcdHN0clxuXG5cdHVuTXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnVuTXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC51bk11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC5tdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLm11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZUFsbENoaWxkcmVuOiA9PlxuXG5cdFx0QHJlbW92ZSBjaGlsZCBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0dHJpZ2dlckNoaWxkcmVuIDogKG1zZywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnRyaWdnZXIgbXNnXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEB0cmlnZ2VyQ2hpbGRyZW4gbXNnLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbkFuZFNlbGYgOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdEBbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0c3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzLCBhbGxvd1NwYWNlcz10cnVlKSAtPlxuXG5cdFx0cmUgPSBpZiBhbGxvd1NwYWNlcyB0aGVuIG5ldyBSZWdFeHAoJ3t7IChbXnt9XSopIH19JywgJ2cnKSBlbHNlIG5ldyBSZWdFeHAoJ3t7KFtee31dKil9fScsICdnJylcblxuXHRcdHJldHVybiBzdHIucmVwbGFjZSByZSwgKGEsIGIpIC0+XG5cdFx0XHRyID0gdmFsc1tiXVxuXHRcdFx0KGlmIHR5cGVvZiByIGlzIFwic3RyaW5nXCIgb3IgdHlwZW9mIHIgaXMgXCJudW1iZXJcIiB0aGVuIHIgZWxzZSBhKVxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0IyMjXG5cdFx0b3ZlcnJpZGUgb24gcGVyIHZpZXcgYmFzaXMgLSB1bmJpbmQgZXZlbnQgaGFuZGxlcnMgZXRjXG5cdFx0IyMjXG5cblx0XHRudWxsXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1xuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0Vmlld1BhZ2UgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHRfc2hvd24gICAgIDogZmFsc2Vcblx0X2xpc3RlbmluZyA6IGZhbHNlXG5cblx0c2hvdyA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgIUBfc2hvd25cblx0XHRAX3Nob3duID0gdHJ1ZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLmFkZENoaWxkIEBcblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29uJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAndmlzaWJsZSdcblx0XHRjYj8oKVxuXG5cdFx0aWYgQENEKCkubmF2LmNoYW5nZVZpZXdDb3VudCBpcyAxXG5cdFx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfUFJFTE9BREVSX0hJREUsIEBhbmltYXRlSW5cblx0XHRlbHNlXG5cdFx0XHRAYW5pbWF0ZUluKClcblxuXHRcdG51bGxcblxuXHRoaWRlIDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAX3Nob3duXG5cdFx0QF9zaG93biA9IGZhbHNlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIucmVtb3ZlIEBcblxuXHRcdCMgQGNhbGxDaGlsZHJlbkFuZFNlbGYgJ3NldExpc3RlbmVycycsICdvZmYnXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICdoaWRkZW4nXG5cdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRkaXNwb3NlIDogPT5cblxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBzZXR0aW5nIGlzbnQgQF9saXN0ZW5pbmdcblx0XHRAX2xpc3RlbmluZyA9IHNldHRpbmdcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0IyMjXG5cdFx0c3R1YmJlZCBoZXJlLCBvdmVycmlkZSBpbiB1c2VkIHBhZ2UgY2xhc3Nlc1xuXHRcdCMjI1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Vmlld1BhZ2VcbiIsIkFic3RyYWN0Vmlld1BhZ2UgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuQ29udHJpYnV0b3JzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4uLy4uL2NvbGxlY3Rpb25zL2NvbnRyaWJ1dG9ycy9Db250cmlidXRvcnNDb2xsZWN0aW9uJ1xuUmVxdWVzdGVyICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL1JlcXVlc3RlcidcbkFQSSAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9kYXRhL0FQSSdcblxuY2xhc3MgQWJvdXRQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWFib3V0J1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEBjb250cmlidXRvcnMgPSBuZXcgQ29udHJpYnV0b3JzQ29sbGVjdGlvblxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0bGFiZWxfd2hhdCAgICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2xhYmVsX3doYXRcIlxuXHRcdFx0Y29udGVudF93aGF0ICAgIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2NvbnRlbnRfd2hhdFwiXG5cdFx0XHRsYWJlbF9jb250YWN0ICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfbGFiZWxfY29udGFjdFwiXG5cdFx0XHRjb250ZW50X2NvbnRhY3QgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfY29udGVudF9jb250YWN0XCJcblx0XHRcdGxhYmVsX3dobyAgICAgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJhYm91dF9sYWJlbF93aG9cIlxuXG5cdFx0c3VwZXJcblxuXHRcdEBnZXRDb250cmlidXRvcnNDb250ZW50KClcblxuXHRcdHJldHVybiBudWxsXG5cblx0Z2V0Q29udHJpYnV0b3JzQ29udGVudCA6ID0+XG5cblx0XHRyID0gUmVxdWVzdGVyLnJlcXVlc3RcbiAgICAgICAgICAgICMgdXJsICA6IEFQSS5nZXQoJ3N0YXJ0JylcbiAgICAgICAgICAgIHVybCAgOiBAQ0QoKS5CQVNFX1VSTCArICcvZGF0YS9fRFVNTVkvY29udHJpYnV0b3JzLmpzb24nXG4gICAgICAgICAgICB0eXBlIDogJ0dFVCdcblxuICAgICAgICByLmRvbmUgKHJlcykgPT5cbiAgICAgICAgXHRAY29udHJpYnV0b3JzLmFkZCByZXMuY29udHJpYnV0b3JzXG4gICAgICAgIFx0QCRlbC5maW5kKCdbZGF0YS1jb250cmlidXRvcnNdJykuaHRtbCBAY29udHJpYnV0b3JzLmdldEFib3V0SFRNTCgpXG5cbiAgICAgICAgci5mYWlsIChyZXMpID0+IGNvbnNvbGUuZXJyb3IgXCJwcm9ibGVtIGdldHRpbmcgdGhlIGNvbnRyaWJ1dG9yc1wiLCByZXNcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYm91dFBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEZvb3RlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnc2l0ZS1mb290ZXInXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0ge31cblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGb290ZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuUm91dGVyICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvUm91dGVyJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgSGVhZGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0dGVtcGxhdGUgOiAnc2l0ZS1oZWFkZXInXG5cblx0RklSU1RfSEFTSENIQU5HRSA6IHRydWVcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID1cblx0XHRcdGhvbWUgICAgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfbG9nb19sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0YWJvdXQgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfYWJvdXRfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUXG5cdFx0XHRjb250cmlidXRlIDogXG5cdFx0XHRcdGxhYmVsICAgIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2NvbnRyaWJ1dGVfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEVcblx0XHRcdGNsb3NlX2xhYmVsIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2Nsb3NlX2xhYmVsJylcblx0XHRcdGluZm9fbGFiZWwgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfaW5mb19sYWJlbCcpXG5cblx0XHRzdXBlcigpXG5cblx0XHRAYmluZEV2ZW50cygpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRsb2dvICAgICAgICAgICAgICA9IEAkZWwuZmluZCgnLmxvZ29fX2xpbmsnKVxuXHRcdEAkbmF2TGlua0Fib3V0ICAgICAgPSBAJGVsLmZpbmQoJy5hYm91dC1idG4nKVxuXHRcdEAkbmF2TGlua0NvbnRyaWJ1dGUgPSBAJGVsLmZpbmQoJy5jb250cmlidXRlLWJ0bicpXG5cdFx0QCRpbmZvQnRuICAgICAgICAgICA9IEAkZWwuZmluZCgnLmluZm8tYnRuJylcblx0XHRAJGNsb3NlQnRuICAgICAgICAgID0gQCRlbC5maW5kKCcuY2xvc2UtYnRuJylcblxuXHRcdG51bGxcblxuXHRiaW5kRXZlbnRzIDogPT5cblxuXHRcdEBDRCgpLmFwcFZpZXcub24gQENEKCkuYXBwVmlldy5FVkVOVF9QUkVMT0FERVJfSElERSwgQGFuaW1hdGVUZXh0SW5cblx0XHRAQ0QoKS5yb3V0ZXIub24gUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQG9uSGFzaENoYW5nZVxuXG5cdFx0QCRlbC5vbiAnbW91c2VlbnRlcicsICdbZGF0YS1jb2Rld29yZF0nLCBAb25Xb3JkRW50ZXJcblx0XHRAJGVsLm9uICdtb3VzZWxlYXZlJywgJ1tkYXRhLWNvZGV3b3JkXScsIEBvbldvcmRMZWF2ZVxuXG5cdFx0bnVsbFxuXG5cdG9uSGFzaENoYW5nZSA6ICh3aGVyZSkgPT5cblxuXHRcdGlmIEBGSVJTVF9IQVNIQ0hBTkdFXG5cdFx0XHRARklSU1RfSEFTSENIQU5HRSA9IGZhbHNlXG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRAb25BcmVhQ2hhbmdlIHdoZXJlXG5cblx0XHRudWxsXG5cblx0b25BcmVhQ2hhbmdlIDogKHNlY3Rpb24pID0+XG5cblx0XHRjb2xvdXIgPSBAZ2V0U2VjdGlvbkNvbG91ciBzZWN0aW9uXG5cblx0XHRAJGVsLmF0dHIgJ2RhdGEtc2VjdGlvbicsIHNlY3Rpb25cblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIEAkbG9nbywgY29sb3VyXG5cblx0XHQjIHRoaXMganVzdCBmb3IgdGVzdGluZywgdGlkeSBsYXRlclxuXHRcdGlmIHNlY3Rpb24gaXMgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZV0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJGNsb3NlQnRuLCBAJGluZm9CdG5dLCBjb2xvdXJcblx0XHRlbHNlIGlmIHNlY3Rpb24gaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVNcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJGNsb3NlQnRuLCBAJGluZm9CdG5dLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRuYXZMaW5rQWJvdXQsIEAkbmF2TGlua0NvbnRyaWJ1dGVdLCBjb2xvdXJcblx0XHRlbHNlIGlmIHNlY3Rpb24gaXMgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQWJvdXQsIEAkY2xvc2VCdG5dLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRuYXZMaW5rQ29udHJpYnV0ZSwgQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0ZWxzZSBpZiBzZWN0aW9uIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBbQCRuYXZMaW5rQ29udHJpYnV0ZSwgQCRjbG9zZUJ0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRpbmZvQnRuXSwgY29sb3VyXG5cdFx0ZWxzZVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG5dLCBjb2xvdXJcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLm91dCBbQCRuYXZMaW5rQWJvdXQsIEAkbmF2TGlua0NvbnRyaWJ1dGUsIEAkaW5mb0J0bl0sIGNvbG91clxuXG5cdFx0bnVsbFxuXG5cdGdldFNlY3Rpb25Db2xvdXIgOiAoc2VjdGlvbikgPT5cblxuXHRcdHNlY3Rpb24gPSBzZWN0aW9uIG9yIEBDRCgpLm5hdi5jdXJyZW50LmFyZWEgb3IgJ2hvbWUnXG5cblx0XHRjb2xvdXIgPSBzd2l0Y2ggc2VjdGlvblxuXHRcdFx0d2hlbiAnaG9tZScgdGhlbiAncmVkJ1xuXHRcdFx0d2hlbiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQgdGhlbiAnd2hpdGUnXG5cdFx0XHR3aGVuIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFIHRoZW4gJ3doaXRlJ1xuXHRcdFx0ZWxzZSAnd2hpdGUnXG5cblx0XHRjb2xvdXJcblxuXHRhbmltYXRlVGV4dEluIDogPT5cblxuXHRcdEBvbkFyZWFDaGFuZ2UgQENEKCkubmF2LmN1cnJlbnQuYXJlYVxuXG5cdFx0bnVsbFxuXG5cdG9uV29yZEVudGVyIDogKGUpID0+XG5cblx0XHQkZWwgPSAkKGUuY3VycmVudFRhcmdldClcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIoKVxuXG5cdFx0bnVsbFxuXG5cdG9uV29yZExlYXZlIDogKGUpID0+XG5cblx0XHQkZWwgPSAkKGUuY3VycmVudFRhcmdldClcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnVuc2NyYW1ibGUgJGVsLCBAZ2V0U2VjdGlvbkNvbG91cigpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Ib21lVmlldyAgICAgPSByZXF1aXJlICcuLi9ob21lL0hvbWVWaWV3J1xuQ29sb3JzICAgICAgID0gcmVxdWlyZSAnLi4vLi4vY29uZmlnL0NvbG9ycydcblxuY2xhc3MgUGFnZVRyYW5zaXRpb25lciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAncGFnZS10cmFuc2l0aW9uZXInXG5cbiAgICBwYWdlTGFiZWxzIDogbnVsbFxuXG4gICAgcGFsZXR0ZXMgOlxuICAgICAgICBIT01FICAgICAgIDogWyBDb2xvcnMuQ0RfQkxVRSwgQ29sb3JzLk9GRl9XSElURSwgQ29sb3JzLkNEX1JFRCBdXG4gICAgICAgIEFCT1VUICAgICAgOiBbIENvbG9ycy5DRF9SRUQsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9CTFVFIF1cbiAgICAgICAgQ09OVFJJQlVURSA6IFsgQ29sb3JzLkNEX0JMVUUsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9SRUQgXVxuICAgICAgICBET09ETEVTICAgIDogWyBDb2xvcnMuQ0RfUkVELCBDb2xvcnMuT0ZGX1dISVRFLCBDb2xvcnMuQ0RfQkxVRSBdXG5cbiAgICBhY3RpdmVDb25maWcgOlxuICAgICAgICBwcm9wIDogbnVsbFxuICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICB0b3AgOiBudWxsLCBib3R0b20gOiBudWxsLCBsZWZ0IDogbnVsbCwgcmlnaHQgOiBudWxsLCB3aWR0aCA6IG51bGwsIGhlaWdodCA6IG51bGxcbiAgICAgICAgZW5kIDpcbiAgICAgICAgICAgIHRvcCA6IG51bGwsIGJvdHRvbSA6IG51bGwsIGxlZnQgOiBudWxsLCByaWdodCA6IG51bGwsIHdpZHRoIDogbnVsbCwgaGVpZ2h0IDogbnVsbFxuXG4gICAgY29uZmlnUHJlc2V0cyA6XG4gICAgICAgIGJvdHRvbVRvVG9wIDpcbiAgICAgICAgICAgIHByb3AgOiAnc2NhbGVZKDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtT3JpZ2luIDogJzUwJSAxMDAlJywgdHJhbnNmb3JtIDogJ3NjYWxlWSgwKSdcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm1PcmlnaW4gOiAnNTAlIDAlJywgdHJhbnNmb3JtIDogJ25vbmUnXG4gICAgICAgIHRvcFRvQm90dG9tIDpcbiAgICAgICAgICAgIHByb3AgOiAnc2NhbGVZKDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtT3JpZ2luIDogJzUwJSAwJScsIHRyYW5zZm9ybSA6ICdzY2FsZVkoMCknXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtT3JpZ2luIDogJzUwJSAxMDAlJywgdHJhbnNmb3JtIDogJ25vbmUnXG4gICAgICAgIGxlZnRUb1JpZ2h0IDpcbiAgICAgICAgICAgIHByb3AgOiAnc2NhbGVYKDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtT3JpZ2luIDogJzAlIDUwJScsIHRyYW5zZm9ybSA6ICdzY2FsZVgoMCknXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtT3JpZ2luIDogJzEwMCUgNTAlJywgdHJhbnNmb3JtIDogJ25vbmUnXG4gICAgICAgIHJpZ2h0VG9MZWZ0IDpcbiAgICAgICAgICAgIHByb3AgOiAnc2NhbGVYKDApJ1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHZpc2liaWxpdHk6ICd2aXNpYmxlJywgdHJhbnNmb3JtT3JpZ2luIDogJzEwMCUgNTAlJywgdHJhbnNmb3JtIDogJ3NjYWxlWCgwKSdcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLCB0cmFuc2Zvcm1PcmlnaW4gOiAnMCUgNTAlJywgdHJhbnNmb3JtIDogJ25vbmUnXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0gXG4gICAgICAgICAgICBwYWdlTGFiZWxzIDpcbiAgICAgICAgICAgICAgICBIT01FICAgICAgIDogQENEKCkubG9jYWxlLmdldCBcInBhZ2VfdHJhbnNpdGlvbmVyX2xhYmVsX0hPTUVcIlxuICAgICAgICAgICAgICAgIEFCT1VUICAgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfQUJPVVRcIlxuICAgICAgICAgICAgICAgIENPTlRSSUJVVEUgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfQ09OVFJJQlVURVwiXG4gICAgICAgICAgICBwYWdlTGFiZWxQcmVmaXggOiBAQ0QoKS5sb2NhbGUuZ2V0IFwicGFnZV90cmFuc2l0aW9uZXJfbGFiZWxfcHJlZml4XCJcblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEAkcGFuZXMgPSBAJGVsLmZpbmQoJ1tkYXRhLXBhbmVdJylcbiAgICAgICAgQCRsYWJlbCA9IEAkZWwuZmluZCgnW2RhdGEtbGFiZWxdJylcblxuICAgICAgICBudWxsXG5cbiAgICBwcmVwYXJlIDogKGZyb21BcmVhLCB0b0FyZWEpID0+XG5cbiAgICAgICAgQHJlc2V0UGFuZXMoKVxuXG4gICAgICAgIEBhcHBseVBhbGV0dGUgQGdldFBhbGV0dGUgdG9BcmVhXG5cbiAgICAgICAgQGFjdGl2ZUNvbmZpZyA9IEBnZXRDb25maWcoZnJvbUFyZWEsIHRvQXJlYSlcblxuICAgICAgICBAYXBwbHlDb25maWcgQGFjdGl2ZUNvbmZpZy5zdGFydFxuXG4gICAgICAgIEBhcHBseUxhYmVsIEBnZXRBcmVhTGFiZWwgdG9BcmVhXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVzZXRQYW5lcyA6ID0+XG5cbiAgICAgICAgQCRwYW5lcy5hdHRyICdzdHlsZSc6ICcnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0QXJlYUxhYmVsIDogKGFyZWEsIGRpcmVjdGlvbj0ndG8nKSA9PlxuXG4gICAgICAgIHNlY3Rpb24gPSBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBhcmVhLCB0cnVlXG5cbiAgICAgICAgaWYgc2VjdGlvbiBpcyAnRE9PRExFUydcbiAgICAgICAgICAgIHZpZXcgPSBpZiBkaXJlY3Rpb24gaXMgJ2Zyb20nIHRoZW4gQENEKCkubmF2LnByZXZpb3VzIGVsc2UgQENEKCkubmF2LmN1cnJlbnRcbiAgICAgICAgICAgIGxhYmVsID0gQGdldERvb2RsZUxhYmVsIHZpZXcuc3ViLCB2aWV3LnRlclxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYWJlbCA9IEB0ZW1wbGF0ZVZhcnMucGFnZUxhYmVsc1tzZWN0aW9uXVxuXG4gICAgICAgIGxhYmVsXG5cbiAgICBnZXREb29kbGVMYWJlbCA6IChzdWIsIHRlcikgPT5cblxuICAgICAgICBkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZmluZFdoZXJlIHNsdWcgOiBcIiN7c3VifS8je3Rlcn1cIlxuXG4gICAgICAgIGlmIGRvb2RsZVxuICAgICAgICAgICAgbGFiZWwgPSBkb29kbGUuZ2V0KCdhdXRob3IubmFtZScpICsgJyBcXFxcICcgKyBkb29kbGUuZ2V0KCduYW1lJylcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbGFiZWwgPSAnZG9vZGxlJ1xuXG4gICAgICAgIGxhYmVsXG5cbiAgICBhcHBseUxhYmVsIDogKHRvTGFiZWwpID0+XG5cbiAgICAgICAgQCRsYWJlbC5odG1sIEB0ZW1wbGF0ZVZhcnMucGFnZUxhYmVsUHJlZml4ICsgJyAnICsgdG9MYWJlbCArICcuLi4nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0UGFsZXR0ZSA6IChhcmVhKSA9PlxuXG4gICAgICAgIHNlY3Rpb24gPSBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBhcmVhLCB0cnVlXG5cbiAgICAgICAgQHBhbGV0dGVzW3NlY3Rpb25dIG9yIEBwYWxldHRlcy5IT01FXG5cbiAgICBhcHBseVBhbGV0dGUgOiAocGFsZXR0ZSkgPT5cblxuICAgICAgICBAJHBhbmVzLmVhY2ggKGkpID0+IEAkcGFuZXMuZXEoaSkuY3NzICdiYWNrZ3JvdW5kLWNvbG9yJyA6IHBhbGV0dGVbaV1cblxuICAgICAgICBudWxsXG5cbiAgICBnZXRDb25maWcgOiAoZnJvbUFyZWEsIHRvQXJlYSkgPT5cblxuICAgICAgICBpZiAhSG9tZVZpZXcudmlzaXRlZFRoaXNTZXNzaW9uIGFuZCB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcbiAgICAgICAgICAgIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLmJvdHRvbVRvVG9wXG5cbiAgICAgICAgZWxzZSBpZiBmcm9tQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFUyBhbmQgdG9BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldERvb2RsZVRvRG9vZGxlQ29uZmlnIFwiI3tAQ0QoKS5uYXYucHJldmlvdXMuc3VifS8je0BDRCgpLm5hdi5wcmV2aW91cy50ZXJ9XCIsIFwiI3tAQ0QoKS5uYXYuY3VycmVudC5zdWJ9LyN7QENEKCkubmF2LmN1cnJlbnQudGVyfVwiXG5cbiAgICAgICAgZWxzZSBpZiB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUIG9yIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuICAgICAgICAgICAgIyBjb25maWcgPSBAY29uZmlnUHJlc2V0cy50b3BUb0JvdHRvbVxuICAgICAgICAgICAgY29uZmlnID0gQF9nZXRSYW5kb21Db25maWcoKVxuXG4gICAgICAgICMgZWxzZSBpZiBmcm9tQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRSBvciB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkhPTUVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgIyBjb25maWcgPSBAY29uZmlnUHJlc2V0cy5ib3R0b21Ub1RvcFxuICAgICAgICAgICAgY29uZmlnID0gQF9nZXRSYW5kb21Db25maWcoKVxuXG4gICAgICAgIGNvbmZpZ1xuXG4gICAgX2dldERvb2RsZVRvRG9vZGxlQ29uZmlnIDogKHByZXZTbHVnLCBuZXh0U2x1ZykgPT5cblxuICAgICAgICBwcmV2aW91c0Rvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5maW5kV2hlcmUgc2x1ZyA6IHByZXZTbHVnXG4gICAgICAgIHByZXZpb3VzRG9vZGxlSWR4ID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmluZGV4T2YgcHJldmlvdXNEb29kbGVcblxuICAgICAgICBjdXJyZW50RG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmZpbmRXaGVyZSBzbHVnIDogbmV4dFNsdWdcbiAgICAgICAgY3VycmVudERvb2RsZUlkeCA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5pbmRleE9mIGN1cnJlbnREb29kbGVcblxuICAgICAgICBfY29uZmlnID0gaWYgcHJldmlvdXNEb29kbGVJZHggPiBjdXJyZW50RG9vZGxlSWR4IHRoZW4gQGNvbmZpZ1ByZXNldHMubGVmdFRvUmlnaHQgZWxzZSBAY29uZmlnUHJlc2V0cy5yaWdodFRvTGVmdFxuXG4gICAgICAgIF9jb25maWdcblxuICAgIF9nZXRSYW5kb21Db25maWcgOiA9PlxuXG4gICAgICAgIF9jb25maWcgPSBfLnNodWZmbGUoQGNvbmZpZ1ByZXNldHMpWzBdXG5cbiAgICAgICAgX2NvbmZpZ1xuXG4gICAgYXBwbHlDb25maWcgOiAoY29uZmlnKSA9PlxuXG4gICAgICAgIEAkcGFuZXMuY3NzIGNvbmZpZ1xuXG4gICAgICAgIG51bGxcblxuICAgIHNob3cgOiA9PlxuXG4gICAgICAgIEAkZWwuYWRkQ2xhc3MgJ3Nob3cnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaGlkZSA6ID0+XG5cbiAgICAgICAgQCRlbC5yZW1vdmVDbGFzcyAnc2hvdydcblxuICAgICAgICBudWxsXG5cbiAgICBpbiA6IChjYikgPT5cblxuICAgICAgICBAc2hvdygpXG5cbiAgICAgICAgQCRwYW5lcy5lYWNoIChpLCBlbCkgPT5cbiAgICAgICAgICAgIHBhcmFtcyA9IGVhc2UgOiBFeHBvLmVhc2VPdXQsIGZvcmNlM0Q6IHRydWVcbiAgICAgICAgICAgIHBhcmFtcy5kZWxheSA9IGkgKiAwLjA1XG4gICAgICAgICAgICBwYXJhbXMudHJhbnNmb3JtID0gJ25vbmUnXG4gICAgICAgICAgICBpZiBpIGlzIDIgdGhlbiBwYXJhbXMub25Db21wbGV0ZSA9ID0+XG4gICAgICAgICAgICAgICAgQGFwcGx5Q29uZmlnIEBhY3RpdmVDb25maWcuZW5kXG4gICAgICAgICAgICAgICAgY2I/KClcblxuICAgICAgICAgICAgVHdlZW5MaXRlLnRvICQoZWwpLCAwLjUsIHBhcmFtc1xuXG4gICAgICAgIG51bGxcblxuICAgIG91dCA6IChjYikgPT5cblxuICAgICAgICBAJHBhbmVzLmVhY2ggKGksIGVsKSA9PlxuICAgICAgICAgICAgcGFyYW1zID0gZWFzZSA6IEV4cG8uZWFzZU91dCwgZm9yY2UzRDogdHJ1ZSwgY2xlYXJQcm9wczogJ2FsbCdcbiAgICAgICAgICAgIHBhcmFtcy5kZWxheSA9IDAuMSAtICgwLjA1ICogaSlcbiAgICAgICAgICAgIHBhcmFtcy50cmFuc2Zvcm0gPSBAYWN0aXZlQ29uZmlnLnByb3BcbiAgICAgICAgICAgIGlmIGkgaXMgMCB0aGVuIHBhcmFtcy5vbkNvbXBsZXRlID0gPT5cbiAgICAgICAgICAgICAgICBAaGlkZSgpXG4gICAgICAgICAgICAgICAgY2I/KClcblxuICAgICAgICAgICAgVHdlZW5MaXRlLnRvICQoZWwpLCAwLjUsIHBhcmFtc1xuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBQYWdlVHJhbnNpdGlvbmVyXG4iLCJBYnN0cmFjdFZpZXcgICAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkNvZGVXb3JkVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXInXG5cbmNsYXNzIFByZWxvYWRlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXHRcblx0Y2IgICAgICAgICAgICAgIDogbnVsbFxuXHRcblx0VFJBTlNJVElPTl9USU1FIDogMC41XG5cblx0TUlOX1dST05HX0NIQVJTIDogMFxuXHRNQVhfV1JPTkdfQ0hBUlMgOiA0XG5cblx0TUlOX0NIQVJfSU5fREVMQVkgOiAzMFxuXHRNQVhfQ0hBUl9JTl9ERUxBWSA6IDEwMFxuXG5cdE1JTl9DSEFSX09VVF9ERUxBWSA6IDMwXG5cdE1BWF9DSEFSX09VVF9ERUxBWSA6IDEwMFxuXG5cdENIQVJTIDogJ2FiY2RlZmhpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5IT8qKClAwqMkJV4mXy0rPVtde306O1xcJ1wiXFxcXHw8PiwuL35gJy5zcGxpdCgnJylcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAc2V0RWxlbWVudCAkKCcjcHJlbG9hZGVyJylcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGNvZGVXb3JkID0gQCRlbC5maW5kKCdbZGF0YS1jb2Rld29yZF0nKVxuXHRcdEAkYmcxID0gQCRlbC5maW5kKCdbZGF0YS1iZz1cIjFcIl0nKVxuXHRcdEAkYmcyID0gQCRlbC5maW5kKCdbZGF0YS1iZz1cIjJcIl0nKVxuXG5cdFx0bnVsbFxuXG5cdHBsYXlJbnRyb0FuaW1hdGlvbiA6IChAY2IpID0+XG5cblx0XHRjb25zb2xlLmxvZyBcInNob3cgOiAoQGNiKSA9PlwiXG5cblx0XHQjIERFQlVHIVxuXHRcdCMgcmV0dXJuIEBjYigpXG5cblx0XHRAJGVsXG5cdFx0XHQuZmluZCgnW2RhdGEtZG90c10nKVxuXHRcdFx0XHQucmVtb3ZlKClcblx0XHRcdFx0LmVuZCgpXG5cdFx0XHQuYWRkQ2xhc3MoJ3Nob3ctcHJlbG9hZGVyJylcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIEAkY29kZVdvcmQsICd3aGl0ZScsIGZhbHNlLCBAaGlkZVxuXG5cdFx0bnVsbFxuXG5cdG9uU2hvd0NvbXBsZXRlIDogPT5cblxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgQG9uSGlkZUNvbXBsZXRlXG5cblx0XHRudWxsXG5cblx0b25IaWRlQ29tcGxldGUgOiA9PlxuXG5cdFx0QGNiPygpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZU91dCA6IChjYikgPT5cblxuXHRcdCMgQGFuaW1hdGVDaGFyc091dCgpXG5cblx0XHQjIHRoYXQnbGwgZG9cblx0XHQjIHNldFRpbWVvdXQgY2IsIDIyMDBcblxuXHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdGFuYWdyYW0gPSBfLnNodWZmbGUoJ2NvZGVkb29kbC5lcycuc3BsaXQoJycpKS5qb2luKCcnKVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gYW5hZ3JhbSwgQCRjb2RlV29yZCwgJ3doaXRlJywgZmFsc2UsID0+IEBhbmltYXRlQmdPdXQgY2Jcblx0XHQsIDIwMDBcblxuXHRcdG51bGxcblxuXHRhbmltYXRlQmdPdXQgOiAoY2IpID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRiZzEsIDAuNSwgeyBkZWxheSA6IDAuMiwgd2lkdGggOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcxLCAwLjYsIHsgZGVsYXkgOiAwLjcsIGhlaWdodCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0IH1cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMiwgMC40LCB7IGRlbGF5IDogMC40LCB3aWR0aCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0IH1cblx0XHRUd2VlbkxpdGUudG8gQCRiZzIsIDAuNSwgeyBkZWxheSA6IDAuOCwgaGVpZ2h0IDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQsIG9uQ29tcGxldGUgOiBjYiB9XG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBAJGNvZGVXb3JkLCAnJywgZmFsc2Vcblx0XHQsIDQwMFxuXG5cdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0QCRlbC5yZW1vdmVDbGFzcygnc2hvdy1wcmVsb2FkZXInKVxuXHRcdCwgMTIwMFxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFByZWxvYWRlclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuSG9tZVZpZXcgICAgICAgICAgID0gcmVxdWlyZSAnLi4vaG9tZS9Ib21lVmlldydcbkFib3V0UGFnZVZpZXcgICAgICA9IHJlcXVpcmUgJy4uL2Fib3V0UGFnZS9BYm91dFBhZ2VWaWV3J1xuQ29udHJpYnV0ZVBhZ2VWaWV3ID0gcmVxdWlyZSAnLi4vY29udHJpYnV0ZVBhZ2UvQ29udHJpYnV0ZVBhZ2VWaWV3J1xuRG9vZGxlUGFnZVZpZXcgICAgID0gcmVxdWlyZSAnLi4vZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldydcbk5hdiAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3JvdXRlci9OYXYnXG5cbmNsYXNzIFdyYXBwZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHRWSUVXX1RZUEVfUEFHRSAgOiAncGFnZSdcblxuXHR0ZW1wbGF0ZSA6ICd3cmFwcGVyJ1xuXG5cdHZpZXdzICAgICAgICAgIDogbnVsbFxuXHRwcmV2aW91c1ZpZXcgICA6IG51bGxcblx0Y3VycmVudFZpZXcgICAgOiBudWxsXG5cblx0cGFnZVN3aXRjaERmZCA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdmlld3MgPVxuXHRcdFx0aG9tZSAgICAgICA6IGNsYXNzUmVmIDogSG9tZVZpZXcsICAgICAgICAgICByb3V0ZSA6IEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FLCAgICAgICB2aWV3IDogbnVsbCwgdHlwZSA6IEBWSUVXX1RZUEVfUEFHRVxuXHRcdFx0YWJvdXQgICAgICA6IGNsYXNzUmVmIDogQWJvdXRQYWdlVmlldywgICAgICByb3V0ZSA6IEBDRCgpLm5hdi5zZWN0aW9ucy5BQk9VVCwgICAgICB2aWV3IDogbnVsbCwgdHlwZSA6IEBWSUVXX1RZUEVfUEFHRVxuXHRcdFx0Y29udHJpYnV0ZSA6IGNsYXNzUmVmIDogQ29udHJpYnV0ZVBhZ2VWaWV3LCByb3V0ZSA6IEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFLCB2aWV3IDogbnVsbCwgdHlwZSA6IEBWSUVXX1RZUEVfUEFHRVxuXHRcdFx0ZG9vZGxlICAgICA6IGNsYXNzUmVmIDogRG9vZGxlUGFnZVZpZXcsICAgICByb3V0ZSA6IEBDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTLCAgICB2aWV3IDogbnVsbCwgdHlwZSA6IEBWSUVXX1RZUEVfUEFHRVxuXG5cdFx0QGNyZWF0ZUNsYXNzZXMoKVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyBkZWNpZGUgaWYgeW91IHdhbnQgdG8gYWRkIGFsbCBjb3JlIERPTSB1cCBmcm9udCwgb3IgYWRkIG9ubHkgd2hlbiByZXF1aXJlZCwgc2VlIGNvbW1lbnRzIGluIEFic3RyYWN0Vmlld1BhZ2UuY29mZmVlXG5cdFx0IyBAYWRkQ2xhc3NlcygpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGNyZWF0ZUNsYXNzZXMgOiA9PlxuXG5cdFx0KEB2aWV3c1tuYW1lXS52aWV3ID0gbmV3IEB2aWV3c1tuYW1lXS5jbGFzc1JlZikgZm9yIG5hbWUsIGRhdGEgb2YgQHZpZXdzXG5cblx0XHRudWxsXG5cblx0YWRkQ2xhc3NlcyA6ID0+XG5cblx0XHQgZm9yIG5hbWUsIGRhdGEgb2YgQHZpZXdzXG5cdFx0IFx0aWYgZGF0YS50eXBlIGlzIEBWSUVXX1RZUEVfUEFHRSB0aGVuIEBhZGRDaGlsZCBkYXRhLnZpZXdcblxuXHRcdG51bGxcblxuXHRnZXRWaWV3QnlSb3V0ZSA6IChyb3V0ZSkgPT5cblxuXHRcdGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXHRcdFx0cmV0dXJuIEB2aWV3c1tuYW1lXSBpZiByb3V0ZSBpcyBAdmlld3NbbmFtZV0ucm91dGVcblxuXHRcdG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEBDRCgpLmFwcFZpZXcub24gJ3N0YXJ0JywgQHN0YXJ0XG5cblx0XHRudWxsXG5cblx0c3RhcnQgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vZmYgJ3N0YXJ0JywgQHN0YXJ0XG5cblx0XHRAYmluZEV2ZW50cygpXG5cdFx0QHVwZGF0ZURpbXMoKVxuXG5cdFx0bnVsbFxuXG5cdGJpbmRFdmVudHMgOiA9PlxuXG5cdFx0QENEKCkubmF2Lm9uIE5hdi5FVkVOVF9DSEFOR0VfVklFVywgQGNoYW5nZVZpZXdcblx0XHRAQ0QoKS5uYXYub24gTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGNoYW5nZVN1YlZpZXdcblxuXHRcdEBDRCgpLmFwcFZpZXcub24gQENEKCkuYXBwVmlldy5FVkVOVF9VUERBVEVfRElNRU5TSU9OUywgQHVwZGF0ZURpbXNcblxuXHRcdG51bGxcblxuXHR1cGRhdGVEaW1zIDogPT5cblxuXHRcdEAkZWwuY3NzICdtaW4taGVpZ2h0JywgQENEKCkuYXBwVmlldy5kaW1zLmhcblxuXHRcdG51bGxcblxuXHRjaGFuZ2VWaWV3IDogKHByZXZpb3VzLCBjdXJyZW50KSA9PlxuXG5cdFx0aWYgQHBhZ2VTd2l0Y2hEZmQgYW5kIEBwYWdlU3dpdGNoRGZkLnN0YXRlKCkgaXNudCAncmVzb2x2ZWQnXG5cdFx0XHRkbyAocHJldmlvdXMsIGN1cnJlbnQpID0+IEBwYWdlU3dpdGNoRGZkLmRvbmUgPT4gQGNoYW5nZVZpZXcgcHJldmlvdXMsIGN1cnJlbnRcblx0XHRcdHJldHVyblxuXG5cdFx0QHByZXZpb3VzVmlldyA9IEBnZXRWaWV3QnlSb3V0ZSBwcmV2aW91cy5hcmVhXG5cdFx0QGN1cnJlbnRWaWV3ICA9IEBnZXRWaWV3QnlSb3V0ZSBjdXJyZW50LmFyZWFcblxuXHRcdGlmICFAcHJldmlvdXNWaWV3XG5cdFx0XHRAdHJhbnNpdGlvblZpZXdzIGZhbHNlLCBAY3VycmVudFZpZXdcblx0XHRlbHNlXG5cdFx0XHRAdHJhbnNpdGlvblZpZXdzIEBwcmV2aW91c1ZpZXcsIEBjdXJyZW50Vmlld1xuXG5cdFx0bnVsbFxuXG5cdGNoYW5nZVN1YlZpZXcgOiAoY3VycmVudCkgPT5cblxuXHRcdEBjdXJyZW50Vmlldy52aWV3LnRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgY3VycmVudC5zdWJcblxuXHRcdG51bGxcblxuXHR0cmFuc2l0aW9uVmlld3MgOiAoZnJvbSwgdG8pID0+XG5cblx0XHRAcGFnZVN3aXRjaERmZCA9ICQuRGVmZXJyZWQoKVxuXG5cdFx0aWYgZnJvbSBhbmQgdG9cblx0XHRcdEBDRCgpLmFwcFZpZXcudHJhbnNpdGlvbmVyLnByZXBhcmUgZnJvbS5yb3V0ZSwgdG8ucm91dGVcblx0XHRcdEBDRCgpLmFwcFZpZXcudHJhbnNpdGlvbmVyLmluID0+IGZyb20udmlldy5oaWRlID0+IHRvLnZpZXcuc2hvdyA9PiBAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5vdXQgPT4gQHBhZ2VTd2l0Y2hEZmQucmVzb2x2ZSgpXG5cdFx0ZWxzZSBpZiBmcm9tXG5cdFx0XHRmcm9tLnZpZXcuaGlkZSBAcGFnZVN3aXRjaERmZC5yZXNvbHZlXG5cdFx0ZWxzZSBpZiB0b1xuXHRcdFx0dG8udmlldy5zaG93IEBwYWdlU3dpdGNoRGZkLnJlc29sdmVcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBXcmFwcGVyXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcblxuY2xhc3MgQ29udHJpYnV0ZVBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtY29udHJpYnV0ZSdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRsYWJlbF9zdWJtaXQgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiY29udHJpYnV0ZV9sYWJlbF9zdWJtaXRcIlxuXHRcdFx0Y29udGVudF9zdWJtaXQgIDogQENEKCkubG9jYWxlLmdldCBcImNvbnRyaWJ1dGVfY29udGVudF9zdWJtaXRcIlxuXHRcdFx0bGFiZWxfY29udGFjdCAgIDogQENEKCkubG9jYWxlLmdldCBcImNvbnRyaWJ1dGVfbGFiZWxfY29udGFjdFwiXG5cdFx0XHRjb250ZW50X2NvbnRhY3QgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiY29udHJpYnV0ZV9jb250ZW50X2NvbnRhY3RcIlxuXG5cdFx0c3VwZXJcblxuXHRcdHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0ZVBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcblxuY2xhc3MgRG9vZGxlUGFnZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1kb29kbGUnXG5cdG1vZGVsICAgIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGRlc2MgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiZG9vZGxlX2Rlc2NcIlxuXG5cdFx0IyMjXG5cblx0XHRpbnN0YW50aWF0ZSBjbGFzc2VzIGhlcmVcblxuXHRcdEBleGFtcGxlQ2xhc3MgPSBuZXcgZXhhbXBsZUNsYXNzXG5cblx0XHQjIyNcblxuXHRcdHN1cGVyKClcblxuXHRcdCMjI1xuXG5cdFx0YWRkIGNsYXNzZXMgdG8gYXBwIHN0cnVjdHVyZSBoZXJlXG5cblx0XHRAXG5cdFx0XHQuYWRkQ2hpbGQoQGV4YW1wbGVDbGFzcylcblxuXHRcdCMjI1xuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdEAkZnJhbWUgPSBAJGVsLmZpbmQoJ1tkYXRhLWRvb2RsZS1mcmFtZV0nKVxuXG5cdHNob3cgOiA9PlxuXG5cdFx0QG1vZGVsID0gQGdldERvb2RsZSgpXG5cblx0XHRAJGZyYW1lLmF0dHIgJ3NyYycsIFwiaHR0cDovL3NvdXJjZS5jb2RlZG9vZGwuZXMvc2FtcGxlX2Rvb2RsZXMvc2hhcGUtc3RyZWFtL2luZGV4Lmh0bWxcIlxuXG5cdFx0c3VwZXJcblxuXHRcdG51bGxcblxuXHRnZXREb29kbGUgOiA9PlxuXG5cdFx0ZG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmdldERvb2RsZUJ5U2x1ZyBAQ0QoKS5uYXYuY3VycmVudC5zdWIrJy8nK0BDRCgpLm5hdi5jdXJyZW50LnRlclxuXG5cdFx0ZG9vZGxlXG5cbm1vZHVsZS5leHBvcnRzID0gRG9vZGxlUGFnZVZpZXdcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgSG9tZUdyaWRJdGVtIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0dGVtcGxhdGUgOiAnaG9tZS1ncmlkLWl0ZW0nXG5cblx0Y29uc3RydWN0b3IgOiAoQG1vZGVsLCBAZnVsbFBhZ2VUcmFuc2l0aW9uKSAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IF8uZXh0ZW5kIHt9LCBAbW9kZWwudG9KU09OKClcblxuXHRcdHN1cGVyXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRhdXRob3JOYW1lID0gQCRlbC5maW5kKCdbZGF0YS1jb2Rld29yZD1cImF1dGhvcl9uYW1lXCJdJylcblx0XHRAJGRvb2RsZU5hbWUgPSBAJGVsLmZpbmQoJ1tkYXRhLWNvZGV3b3JkPVwibmFtZVwiXScpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRAJGVsW3NldHRpbmddICdtb3VzZW92ZXInLCBAb25Nb3VzZU92ZXJcblxuXHRcdG51bGxcblxuXHRzaG93IDogPT5cblxuXHRcdEAkZWwuYWRkQ2xhc3MgJ3Nob3ctaXRlbSdcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ2F1dGhvci5uYW1lJyksIEAkYXV0aG9yTmFtZSwgJ2JsdWUnXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnbmFtZScpLCBAJGRvb2RsZU5hbWUsICdibHVlJ1xuXG5cdFx0QHNldExpc3RlbmVycyAnb24nXG5cblx0XHRudWxsXG5cblx0b25Nb3VzZU92ZXIgOiA9PlxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnYXV0aG9yLm5hbWUnKSwgQCRhdXRob3JOYW1lLCAnYmx1ZSdcblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCduYW1lJyksIEAkZG9vZGxlTmFtZSwgJ2JsdWUnXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZUdyaWRJdGVtXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcbkhvbWVHcmlkSXRlbSAgICAgPSByZXF1aXJlICcuL0hvbWVHcmlkSXRlbSdcblxuY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0IyBtYW5hZ2Ugc3RhdGUgZm9yIGhvbWVWaWV3IG9uIHBlci1zZXNzaW9uIGJhc2lzLCBhbGxvdyBudW1iZXIgb2Zcblx0IyBncmlkIGl0ZW1zLCBhbmQgc2Nyb2xsIHBvc2l0aW9uIG9mIGhvbWUgZ3JpZCB0byBiZSBwZXJzaXN0ZWRcblx0QHZpc2l0ZWRUaGlzU2Vzc2lvbiA6IGZhbHNlXG5cdEBncmlkSXRlbXMgOiBbXVxuXHRAZGltcyA6XG5cdFx0aXRlbSAgICAgIDogaDogMjY4LCB3OiAyMDAsIG1hcmdpbjogMjAsIGE6IDBcblx0XHRjb250YWluZXIgOiBoOiAwLCB3OiAwLCBhOiAwXG5cdEBjb2xDb3VudCA6IDBcblx0QHNjcm9sbERpc3RhbmNlIDogMFxuXG5cdEBTSE9XX1JPV19USFJFU0hPTEQgOiAwLjMgIyBob3cgbXVjaCBvZiBhIGdyaWQgcm93IChzY2FsZSAwIC0+IDEpIG11c3QgYmUgdmlzaWJsZSBiZWZvcmUgaXQgaXMgXCJzaG93blwiXG5cblx0dGVtcGxhdGUgICAgICA6ICdwYWdlLWhvbWUnXG5cdGFkZFRvU2VsZWN0b3IgOiAnW2RhdGEtaG9tZS1ncmlkXSdcblxuXHRhbGxEb29kbGVzIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGRlc2MgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiaG9tZV9kZXNjXCJcblxuXHRcdEBhbGxEb29kbGVzID0gQENEKCkuYXBwRGF0YS5kb29kbGVzXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRncmlkID0gQCRlbC5maW5kKCdbZGF0YS1ob21lLWdyaWRdJylcblxuXHRcdG51bGxcblxuXHRzZXR1cERpbXMgOiA9PlxuXG5cdFx0Z3JpZFdpZHRoID0gQCRncmlkLm91dGVyV2lkdGgoKVxuXG5cdFx0SG9tZVZpZXcuY29sQ291bnQgPSBNYXRoLnJvdW5kIGdyaWRXaWR0aCAvIEhvbWVWaWV3LmRpbXMuaXRlbS53XG5cdFx0XG5cdFx0SG9tZVZpZXcuZGltcy5jb250YWluZXIgPVxuXHRcdFx0aDogQENEKCkuYXBwVmlldy5kaW1zLmgsIHc6IGdyaWRXaWR0aCwgYTogKEBDRCgpLmFwcFZpZXcuZGltcy5oICogZ3JpZFdpZHRoKVxuXG5cdFx0SG9tZVZpZXcuZGltcy5pdGVtLmEgPSBIb21lVmlldy5kaW1zLml0ZW0uaCAqIChIb21lVmlldy5kaW1zLml0ZW0udyArICgoSG9tZVZpZXcuZGltcy5pdGVtLm1hcmdpbiAqIChIb21lVmlldy5jb2xDb3VudCAtIDEpKSAvIEhvbWVWaWV3LmNvbENvdW50KSlcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEBDRCgpLmFwcFZpZXdbc2V0dGluZ10gQENEKCkuYXBwVmlldy5FVkVOVF9VUERBVEVfRElNRU5TSU9OUywgQG9uUmVzaXplXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSBAQ0QoKS5hcHBWaWV3LkVWRU5UX09OX1NDUk9MTCwgQG9uU2Nyb2xsXG5cblx0XHRudWxsXG5cblx0b25SZXNpemUgOiA9PlxuXG5cdFx0QHNldHVwRGltcygpXG5cdFx0QG9uU2Nyb2xsKClcblxuXHRcdG51bGxcblxuXHRvblNjcm9sbCA6ID0+XG5cblx0XHRIb21lVmlldy5zY3JvbGxEaXN0YW5jZSA9IEBDRCgpLmFwcFZpZXcubGFzdFNjcm9sbFlcblxuXHRcdGl0ZW1zVG9TaG93ID0gQGdldFJlcXVpcmVkRG9vZGxlQ291bnRCeUFyZWEoKVxuXHRcdGlmIGl0ZW1zVG9TaG93ID4gMCB0aGVuIEBhZGREb29kbGVzIGl0ZW1zVG9TaG93XG5cblx0XHRudWxsXG5cblx0c2hvdyA6ID0+XG5cblx0XHRzdXBlclxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHRAc2V0dXBEaW1zKClcblxuXHRcdGlmICFIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb25cblx0XHRcdEBhZGREb29kbGVzIEBnZXRSZXF1aXJlZERvb2RsZUNvdW50QnlBcmVhKCksIHRydWVcblx0XHRcdEhvbWVWaWV3LnZpc2l0ZWRUaGlzU2Vzc2lvbiA9IHRydWVcblx0XHRlbHNlXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LiR3aW5kb3cuc2Nyb2xsVG9wIEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlXG5cblx0XHRudWxsXG5cblx0Z2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSA6ID0+XG5cblx0XHR0b3RhbEFyZWEgID0gSG9tZVZpZXcuZGltcy5jb250YWluZXIuYSArIChIb21lVmlldy5zY3JvbGxEaXN0YW5jZSAqIEhvbWVWaWV3LmRpbXMuY29udGFpbmVyLncpXG5cdFx0dGFyZ2V0Um93cyA9ICh0b3RhbEFyZWEgLyBIb21lVmlldy5kaW1zLml0ZW0uYSkgLyBIb21lVmlldy5jb2xDb3VudFxuXG5cdFx0dGFyZ2V0SXRlbXMgPSBNYXRoLmZsb29yKHRhcmdldFJvd3MpICogSG9tZVZpZXcuY29sQ291bnRcblx0XHR0YXJnZXRJdGVtcyA9IGlmICh0YXJnZXRSb3dzICUgMSkgPiBIb21lVmlldy5TSE9XX1JPV19USFJFU0hPTEQgdGhlbiB0YXJnZXRJdGVtcyArIEhvbWVWaWV3LmNvbENvdW50IGVsc2UgdGFyZ2V0SXRlbXNcblxuXHRcdHJldHVybiB0YXJnZXRJdGVtcyAtIEhvbWVWaWV3LmdyaWRJdGVtcy5sZW5ndGhcblxuXHRhZGREb29kbGVzIDogKGNvdW50LCBmdWxsUGFnZVRyYW5zaXRpb249ZmFsc2UpID0+XG5cblx0XHRjb25zb2xlLmxvZyBcImFkZGluZyBkb29kbGVzLi4uIHgje2NvdW50fVwiXG5cblx0XHRuZXdJdGVtcyA9IFtdXG5cblx0XHRmb3IgaWR4IGluIFtIb21lVmlldy5ncmlkSXRlbXMubGVuZ3RoLi4uSG9tZVZpZXcuZ3JpZEl0ZW1zLmxlbmd0aCtjb3VudF1cblxuXHRcdFx0ZG9vZGxlID0gQGFsbERvb2RsZXMuYXQgaWR4XG5cdFx0XHRicmVhayBpZiAhZG9vZGxlXG5cblx0XHRcdG5ld0l0ZW1zLnB1c2ggbmV3IEhvbWVHcmlkSXRlbSBkb29kbGUsIGZ1bGxQYWdlVHJhbnNpdGlvblxuXG5cdFx0SG9tZVZpZXcuZ3JpZEl0ZW1zID0gSG9tZVZpZXcuZ3JpZEl0ZW1zLmNvbmNhdCBuZXdJdGVtc1xuXG5cdFx0Zm9yIGl0ZW0sIGlkeCBpbiBuZXdJdGVtc1xuXG5cdFx0XHRAYWRkQ2hpbGQgaXRlbVxuXHRcdFx0QGFuaW1hdGVJdGVtSW4gaXRlbSwgaWR4LCBmdWxsUGFnZVRyYW5zaXRpb25cblxuXHRcdG51bGxcblxuXHRhbmltYXRlSXRlbUluIDogKGl0ZW0sIGluZGV4LCBmdWxsUGFnZVRyYW5zaXRpb249ZmFsc2UpID0+XG5cblx0XHRkdXJhdGlvbiAgID0gMC41XG5cdFx0ZnJvbVBhcmFtcyA9IHkgOiAoaWYgZnVsbFBhZ2VUcmFuc2l0aW9uIHRoZW4gd2luZG93LmlubmVySGVpZ2h0IGVsc2UgMCksIG9wYWNpdHkgOiAwLCBzY2FsZSA6IDAuNlxuXHRcdHRvUGFyYW1zICAgPSBkZWxheSA6IChkdXJhdGlvbiAqIDAuMikgKiBpbmRleCwgeSA6IDAsIG9wYWNpdHkgOiAxLCBzY2FsZSA6IDEgLCBlYXNlIDogRXhwby5lYXNlT3V0LCBvbkNvbXBsZXRlIDogaXRlbS5zaG93XG5cblx0XHRUd2VlbkxpdGUuZnJvbVRvIGl0ZW0uJGVsLCBkdXJhdGlvbiwgZnJvbVBhcmFtcywgdG9QYXJhbXNcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBIb21lVmlld1xuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuXG5jbGFzcyBBYnN0cmFjdE1vZGFsIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0JHdpbmRvdyA6IG51bGxcblxuXHQjIyMgb3ZlcnJpZGUgaW4gaW5kaXZpZHVhbCBjbGFzc2VzICMjI1xuXHRuYW1lICAgICA6IG51bGxcblx0dGVtcGxhdGUgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QCR3aW5kb3cgPSAkKHdpbmRvdylcblxuXHRcdHN1cGVyKClcblxuXHRcdEBDRCgpLmFwcFZpZXcuYWRkQ2hpbGQgQFxuXHRcdEBzZXRMaXN0ZW5lcnMgJ29uJ1xuXHRcdEBhbmltYXRlSW4oKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRoaWRlIDogPT5cblxuXHRcdEBhbmltYXRlT3V0ID0+IEBDRCgpLmFwcFZpZXcucmVtb3ZlIEBcblxuXHRcdG51bGxcblxuXHRkaXNwb3NlIDogPT5cblxuXHRcdEBzZXRMaXN0ZW5lcnMgJ29mZidcblx0XHRAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5tb2RhbHNbQG5hbWVdLnZpZXcgPSBudWxsXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRAJHdpbmRvd1tzZXR0aW5nXSAna2V5dXAnLCBAb25LZXlVcFxuXHRcdEAkKCdbZGF0YS1jbG9zZV0nKVtzZXR0aW5nXSAnY2xpY2snLCBAY2xvc2VDbGlja1xuXG5cdFx0bnVsbFxuXG5cdG9uS2V5VXAgOiAoZSkgPT5cblxuXHRcdGlmIGUua2V5Q29kZSBpcyAyNyB0aGVuIEBoaWRlKClcblxuXHRcdG51bGxcblxuXHRhbmltYXRlSW4gOiA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwsIDAuMywgeyAndmlzaWJpbGl0eSc6ICd2aXNpYmxlJywgJ29wYWNpdHknOiAxLCBlYXNlIDogUXVhZC5lYXNlT3V0IH1cblx0XHRUd2VlbkxpdGUudG8gQCRlbC5maW5kKCcuaW5uZXInKSwgMC4zLCB7IGRlbGF5IDogMC4xNSwgJ3RyYW5zZm9ybSc6ICdzY2FsZSgxKScsICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLCAnb3BhY2l0eSc6IDEsIGVhc2UgOiBCYWNrLmVhc2VPdXQgfVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVPdXQgOiAoY2FsbGJhY2spID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRlbCwgMC4zLCB7IGRlbGF5IDogMC4xNSwgJ29wYWNpdHknOiAwLCBlYXNlIDogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBjYWxsYmFjayB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwuZmluZCgnLmlubmVyJyksIDAuMywgeyAndHJhbnNmb3JtJzogJ3NjYWxlKDAuOCknLCAnb3BhY2l0eSc6IDAsIGVhc2UgOiBCYWNrLmVhc2VJbiB9XG5cblx0XHRudWxsXG5cblx0Y2xvc2VDbGljazogKCBlICkgPT5cblxuXHRcdGUucHJldmVudERlZmF1bHQoKVxuXG5cdFx0QGhpZGUoKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0TW9kYWxcbiIsIkFic3RyYWN0TW9kYWwgPSByZXF1aXJlICcuL0Fic3RyYWN0TW9kYWwnXG5cbmNsYXNzIE9yaWVudGF0aW9uTW9kYWwgZXh0ZW5kcyBBYnN0cmFjdE1vZGFsXG5cblx0bmFtZSAgICAgOiAnb3JpZW50YXRpb25Nb2RhbCdcblx0dGVtcGxhdGUgOiAnb3JpZW50YXRpb24tbW9kYWwnXG5cblx0Y2IgICAgICAgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAoQGNiKSAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IHtAbmFtZX1cblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0aGlkZSA6IChzdGlsbExhbmRzY2FwZT10cnVlKSA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgPT5cblx0XHRcdEBDRCgpLmFwcFZpZXcucmVtb3ZlIEBcblx0XHRcdGlmICFzdGlsbExhbmRzY2FwZSB0aGVuIEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0c3VwZXJcblxuXHRcdEBDRCgpLmFwcFZpZXdbc2V0dGluZ10gJ3VwZGF0ZURpbXMnLCBAb25VcGRhdGVEaW1zXG5cdFx0QCRlbFtzZXR0aW5nXSAndG91Y2hlbmQgY2xpY2snLCBAaGlkZVxuXG5cdFx0bnVsbFxuXG5cdG9uVXBkYXRlRGltcyA6IChkaW1zKSA9PlxuXG5cdFx0aWYgZGltcy5vIGlzICdwb3J0cmFpdCcgdGhlbiBAaGlkZSBmYWxzZVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IE9yaWVudGF0aW9uTW9kYWxcbiIsIkFic3RyYWN0VmlldyAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5PcmllbnRhdGlvbk1vZGFsID0gcmVxdWlyZSAnLi9PcmllbnRhdGlvbk1vZGFsJ1xuXG5jbGFzcyBNb2RhbE1hbmFnZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHQjIHdoZW4gbmV3IG1vZGFsIGNsYXNzZXMgYXJlIGNyZWF0ZWQsIGFkZCBoZXJlLCB3aXRoIHJlZmVyZW5jZSB0byBjbGFzcyBuYW1lXG5cdG1vZGFscyA6XG5cdFx0b3JpZW50YXRpb25Nb2RhbCA6IGNsYXNzUmVmIDogT3JpZW50YXRpb25Nb2RhbCwgdmlldyA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGlzT3BlbiA6ID0+XG5cblx0XHQoIGlmIEBtb2RhbHNbbmFtZV0udmlldyB0aGVuIHJldHVybiB0cnVlICkgZm9yIG5hbWUsIG1vZGFsIG9mIEBtb2RhbHNcblxuXHRcdGZhbHNlXG5cblx0aGlkZU9wZW5Nb2RhbCA6ID0+XG5cblx0XHQoIGlmIEBtb2RhbHNbbmFtZV0udmlldyB0aGVuIG9wZW5Nb2RhbCA9IEBtb2RhbHNbbmFtZV0udmlldyApIGZvciBuYW1lLCBtb2RhbCBvZiBAbW9kYWxzXG5cblx0XHRvcGVuTW9kYWw/LmhpZGUoKVxuXG5cdFx0bnVsbFxuXG5cdHNob3dNb2RhbCA6IChuYW1lLCBjYj1udWxsKSA9PlxuXG5cdFx0cmV0dXJuIGlmIEBtb2RhbHNbbmFtZV0udmlld1xuXG5cdFx0QG1vZGFsc1tuYW1lXS52aWV3ID0gbmV3IEBtb2RhbHNbbmFtZV0uY2xhc3NSZWYgY2JcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbE1hbmFnZXJcbiJdfQ==
