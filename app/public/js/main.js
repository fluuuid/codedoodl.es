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



},{"./AppData":6,"./AppView":7,"./data/Locale":14,"./data/Templates":15,"./router/Nav":21,"./router/Router":22,"./utils/Analytics":23,"./utils/AuthManager":24,"./utils/Facebook":26,"./utils/GooglePlus":27,"./utils/MediaQueries":28,"./utils/Share":31}],6:[function(require,module,exports){
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



},{"./collections/doodles/DoodlesCollection":10,"./data/API":12,"./data/AbstractData":13,"./utils/Requester":30}],7:[function(require,module,exports){
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



},{"./view/AbstractView":32,"./view/base/Footer":35,"./view/base/Header":36,"./view/base/PageTransitioner":37,"./view/base/Preloader":38,"./view/base/Wrapper":39,"./view/modals/_ModalManager":46}],8:[function(require,module,exports){
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



},{"../../models/core/TemplateModel":19}],10:[function(require,module,exports){
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



},{"../../models/doodle/DoodleModel":20,"../AbstractCollection":8}],11:[function(require,module,exports){
var Colors;

Colors = {
  CD_RED: '#EB423E',
  CD_BLUE: '#395CAA',
  CD_BLACK: '#111111',
  OFF_WHITE: '#F1F1F3'
};

module.exports = Colors;



},{}],12:[function(require,module,exports){
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



},{"../models/core/APIRouteModel":17}],13:[function(require,module,exports){
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



},{}],14:[function(require,module,exports){
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



},{"../data/API":12,"../models/core/LocalesModel":18}],15:[function(require,module,exports){
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



},{"../collections/core/TemplatesCollection":9,"../models/core/TemplateModel":19}],16:[function(require,module,exports){
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



},{}],17:[function(require,module,exports){
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



},{}],18:[function(require,module,exports){
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



},{}],19:[function(require,module,exports){
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



},{}],20:[function(require,module,exports){
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



},{"../../utils/CodeWordTransitioner":25,"../../utils/NumberUtils":29,"../AbstractModel":16}],21:[function(require,module,exports){
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



},{"../view/AbstractView":32,"./Router":22}],22:[function(require,module,exports){
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



},{}],23:[function(require,module,exports){

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



},{}],24:[function(require,module,exports){
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



},{"../data/AbstractData":13,"../utils/Facebook":26,"../utils/GooglePlus":27}],25:[function(require,module,exports){
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



},{"ent/encode":3}],26:[function(require,module,exports){
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



},{"../data/AbstractData":13}],27:[function(require,module,exports){
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



},{"../data/AbstractData":13}],28:[function(require,module,exports){
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



},{}],29:[function(require,module,exports){
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



},{}],30:[function(require,module,exports){

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



},{}],31:[function(require,module,exports){

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



},{}],32:[function(require,module,exports){
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



},{}],33:[function(require,module,exports){
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



},{"./AbstractView":32}],34:[function(require,module,exports){
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



},{"../AbstractViewPage":33}],35:[function(require,module,exports){
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



},{"../AbstractView":32}],36:[function(require,module,exports){
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



},{"../../router/Router":22,"../../utils/CodeWordTransitioner":25,"../AbstractView":32}],37:[function(require,module,exports){
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



},{"../../config/Colors":11,"../AbstractView":32,"../home/HomeView":43}],38:[function(require,module,exports){
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



},{"../../utils/CodeWordTransitioner":25,"../AbstractView":32}],39:[function(require,module,exports){
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



},{"../../router/Nav":21,"../AbstractView":32,"../aboutPage/AboutPageView":34,"../contributePage/ContributePageView":40,"../doodlePage/DoodlePageView":41,"../home/HomeView":43}],40:[function(require,module,exports){
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



},{"../AbstractViewPage":33}],41:[function(require,module,exports){
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



},{"../AbstractViewPage":33}],42:[function(require,module,exports){
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



},{"../../utils/CodeWordTransitioner":25,"../AbstractView":32}],43:[function(require,module,exports){
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



},{"../AbstractViewPage":33,"./HomeGridItem":42}],44:[function(require,module,exports){
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



},{"../AbstractView":32}],45:[function(require,module,exports){
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



},{"./AbstractModal":44}],46:[function(require,module,exports){
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



},{"../AbstractView":32,"./OrientationModal":45}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50L2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9lbnQvcmV2ZXJzZWQuanNvbiIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHAuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL0FwcFZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL0Fic3RyYWN0Q29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvY29yZS9UZW1wbGF0ZXNDb2xsZWN0aW9uLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb2xsZWN0aW9ucy9kb29kbGVzL0Rvb2RsZXNDb2xsZWN0aW9uLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb25maWcvQ29sb3JzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0FQSS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BYnN0cmFjdERhdGEuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvTG9jYWxlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL1RlbXBsYXRlcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL0Fic3RyYWN0TW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL0FQSVJvdXRlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL0xvY2FsZXNNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvbW9kZWxzL2Rvb2RsZS9Eb29kbGVNb2RlbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvcm91dGVyL05hdi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvcm91dGVyL1JvdXRlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQW5hbHl0aWNzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9BdXRoTWFuYWdlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0ZhY2Vib29rLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Hb29nbGVQbHVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9NZWRpYVF1ZXJpZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL051bWJlclV0aWxzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9SZXF1ZXN0ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1NoYXJlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9BYnN0cmFjdFZpZXdQYWdlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Fib3V0UGFnZS9BYm91dFBhZ2VWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvRm9vdGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvSGVhZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvUGFnZVRyYW5zaXRpb25lci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9iYXNlL1ByZWxvYWRlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9iYXNlL1dyYXBwZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvY29udHJpYnV0ZVBhZ2UvQ29udHJpYnV0ZVBhZ2VWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Rvb2RsZVBhZ2UvRG9vZGxlUGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvaG9tZS9Ib21lR3JpZEl0ZW0uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvaG9tZS9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9tb2RhbHMvQWJzdHJhY3RNb2RhbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9tb2RhbHMvT3JpZW50YXRpb25Nb2RhbC5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9tb2RhbHMvX01vZGFsTWFuYWdlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBLGtCQUFBOztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsT0FBUixDQUFOLENBQUE7O0FBS0E7QUFBQTs7O0dBTEE7O0FBQUEsT0FXQSxHQUFVLEtBWFYsQ0FBQTs7QUFBQSxJQWNBLEdBQVUsT0FBSCxHQUFnQixFQUFoQixHQUF5QixNQUFBLElBQVUsUUFkMUMsQ0FBQTs7QUFBQSxJQWlCSSxDQUFDLEVBQUwsR0FBYyxJQUFBLEdBQUEsQ0FBSSxPQUFKLENBakJkLENBQUE7O0FBQUEsSUFrQkksQ0FBQyxFQUFFLENBQUMsSUFBUixDQUFBLENBbEJBLENBQUE7Ozs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNseUNBLElBQUEsd0hBQUE7RUFBQSxrRkFBQTs7QUFBQSxTQUFBLEdBQWUsT0FBQSxDQUFRLG1CQUFSLENBQWYsQ0FBQTs7QUFBQSxXQUNBLEdBQWUsT0FBQSxDQUFRLHFCQUFSLENBRGYsQ0FBQTs7QUFBQSxLQUVBLEdBQWUsT0FBQSxDQUFRLGVBQVIsQ0FGZixDQUFBOztBQUFBLFFBR0EsR0FBZSxPQUFBLENBQVEsa0JBQVIsQ0FIZixDQUFBOztBQUFBLFVBSUEsR0FBZSxPQUFBLENBQVEsb0JBQVIsQ0FKZixDQUFBOztBQUFBLFNBS0EsR0FBZSxPQUFBLENBQVEsa0JBQVIsQ0FMZixDQUFBOztBQUFBLE1BTUEsR0FBZSxPQUFBLENBQVEsZUFBUixDQU5mLENBQUE7O0FBQUEsTUFPQSxHQUFlLE9BQUEsQ0FBUSxpQkFBUixDQVBmLENBQUE7O0FBQUEsR0FRQSxHQUFlLE9BQUEsQ0FBUSxjQUFSLENBUmYsQ0FBQTs7QUFBQSxPQVNBLEdBQWUsT0FBQSxDQUFRLFdBQVIsQ0FUZixDQUFBOztBQUFBLE9BVUEsR0FBZSxPQUFBLENBQVEsV0FBUixDQVZmLENBQUE7O0FBQUEsWUFXQSxHQUFlLE9BQUEsQ0FBUSxzQkFBUixDQVhmLENBQUE7O0FBQUE7QUFlSSxnQkFBQSxJQUFBLEdBQWEsSUFBYixDQUFBOztBQUFBLGdCQUNBLFFBQUEsR0FBYSxNQUFNLENBQUMsTUFBTSxDQUFDLFFBRDNCLENBQUE7O0FBQUEsZ0JBRUEsVUFBQSxHQUFhLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFGM0IsQ0FBQTs7QUFBQSxnQkFHQSxRQUFBLEdBQWEsQ0FIYixDQUFBOztBQUFBLGdCQUtBLFFBQUEsR0FBYSxDQUFDLFVBQUQsRUFBYSxVQUFiLEVBQXlCLGdCQUF6QixFQUEyQyxNQUEzQyxFQUFtRCxhQUFuRCxFQUFrRSxVQUFsRSxFQUE4RSxTQUE5RSxFQUF5RixJQUF6RixFQUErRixTQUEvRixFQUEwRyxVQUExRyxDQUxiLENBQUE7O0FBT2MsRUFBQSxhQUFFLElBQUYsR0FBQTtBQUVWLElBRlcsSUFBQyxDQUFBLE9BQUEsSUFFWixDQUFBO0FBQUEsNkNBQUEsQ0FBQTtBQUFBLG1DQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsMkRBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEsV0FBTyxJQUFQLENBRlU7RUFBQSxDQVBkOztBQUFBLGdCQVdBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFUCxRQUFBLEVBQUE7QUFBQSxJQUFBLEVBQUEsR0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxXQUEzQixDQUFBLENBQUwsQ0FBQTtBQUFBLElBRUEsWUFBWSxDQUFDLEtBQWIsQ0FBQSxDQUZBLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxVQUFELEdBQWlCLEVBQUUsQ0FBQyxPQUFILENBQVcsU0FBWCxDQUFBLEdBQXdCLENBQUEsQ0FKekMsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLFVBQUQsR0FBaUIsRUFBRSxDQUFDLE9BQUgsQ0FBVyxTQUFYLENBQUEsR0FBd0IsQ0FBQSxDQUx6QyxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsYUFBRCxHQUFvQixFQUFFLENBQUMsS0FBSCxDQUFTLE9BQVQsQ0FBSCxHQUEwQixJQUExQixHQUFvQyxLQU5yRCxDQUFBO1dBUUEsS0FWTztFQUFBLENBWFgsQ0FBQTs7QUFBQSxnQkF1QkEsUUFBQSxHQUFXLFNBQUEsR0FBQTtBQUVQLFdBQU8sSUFBQyxDQUFBLE1BQUQsSUFBVyxJQUFDLENBQUEsVUFBbkIsQ0FGTztFQUFBLENBdkJYLENBQUE7O0FBQUEsZ0JBMkJBLGNBQUEsR0FBaUIsU0FBQSxHQUFBO0FBRWIsSUFBQSxJQUFDLENBQUEsUUFBRCxFQUFBLENBQUE7QUFDQSxJQUFBLElBQWMsSUFBQyxDQUFBLFFBQUQsSUFBYSxDQUEzQjtBQUFBLE1BQUEsSUFBQyxDQUFBLE9BQUQsQ0FBQSxDQUFBLENBQUE7S0FEQTtXQUdBLEtBTGE7RUFBQSxDQTNCakIsQ0FBQTs7QUFBQSxnQkFrQ0EsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVILElBQUEsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQUFBLENBQUE7V0FFQSxLQUpHO0VBQUEsQ0FsQ1AsQ0FBQTs7QUFBQSxnQkF3Q0EsV0FBQSxHQUFjLFNBQUEsR0FBQTtBQUVWLElBQUEsSUFBQyxDQUFBLFNBQUQsR0FBaUIsSUFBQSxTQUFBLENBQVcsaUJBQUEsR0FBaUIsQ0FBSSxJQUFDLENBQUEsSUFBSixHQUFjLE1BQWQsR0FBMEIsRUFBM0IsQ0FBakIsR0FBZ0QsTUFBM0QsRUFBa0UsSUFBQyxDQUFBLGNBQW5FLENBQWpCLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxNQUFELEdBQWlCLElBQUEsTUFBQSxDQUFPLDRCQUFQLEVBQXFDLElBQUMsQ0FBQSxjQUF0QyxDQURqQixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsU0FBRCxHQUFpQixJQUFBLFNBQUEsQ0FBVSxxQkFBVixFQUFpQyxJQUFDLENBQUEsY0FBbEMsQ0FGakIsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE9BQUQsR0FBaUIsSUFBQSxPQUFBLENBQVEsSUFBQyxDQUFBLGNBQVQsQ0FIakIsQ0FBQTtXQU9BLEtBVFU7RUFBQSxDQXhDZCxDQUFBOztBQUFBLGdCQW1EQSxRQUFBLEdBQVcsU0FBQSxHQUFBO0FBRVAsSUFBQSxRQUFRLENBQUMsSUFBVCxDQUFBLENBQUEsQ0FBQTtBQUFBLElBQ0EsVUFBVSxDQUFDLElBQVgsQ0FBQSxDQURBLENBQUE7V0FHQSxLQUxPO0VBQUEsQ0FuRFgsQ0FBQTs7QUFBQSxnQkEwREEsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVOLElBQUEsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUFBLENBQUE7QUFFQTtBQUFBLDRCQUZBO0FBQUEsSUFHQSxJQUFDLENBQUEsT0FBRCxHQUFXLEdBQUEsQ0FBQSxPQUhYLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxNQUFELEdBQVcsR0FBQSxDQUFBLE1BSlgsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLEdBQUQsR0FBVyxHQUFBLENBQUEsR0FMWCxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsSUFBRCxHQUFXLEdBQUEsQ0FBQSxXQU5YLENBQUE7QUFBQSxJQU9BLElBQUMsQ0FBQSxLQUFELEdBQVcsR0FBQSxDQUFBLEtBUFgsQ0FBQTtBQUFBLElBU0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQVRBLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FYQSxDQUFBO1dBYUEsS0FmTTtFQUFBLENBMURWLENBQUE7O0FBQUEsZ0JBMkVBLEVBQUEsR0FBSyxTQUFBLEdBQUE7QUFFRDtBQUFBLHVEQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLE1BQVQsQ0FBQSxDQURBLENBQUE7QUFHQTtBQUFBLDhEQUhBO0FBQUEsSUFJQSxJQUFDLENBQUEsT0FBRCxDQUFBLENBSkEsQ0FBQTtXQU1BLEtBUkM7RUFBQSxDQTNFTCxDQUFBOztBQUFBLGdCQXFGQSxPQUFBLEdBQVUsU0FBQSxHQUFBO0FBRU4sUUFBQSxrQkFBQTtBQUFBO0FBQUEsU0FBQSwyQ0FBQTtvQkFBQTtBQUNJLE1BQUEsSUFBRSxDQUFBLEVBQUEsQ0FBRixHQUFRLElBQVIsQ0FBQTtBQUFBLE1BQ0EsTUFBQSxDQUFBLElBQVMsQ0FBQSxFQUFBLENBRFQsQ0FESjtBQUFBLEtBQUE7V0FJQSxLQU5NO0VBQUEsQ0FyRlYsQ0FBQTs7YUFBQTs7SUFmSixDQUFBOztBQUFBLE1BNEdNLENBQUMsT0FBUCxHQUFpQixHQTVHakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHdEQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBb0IsT0FBQSxDQUFRLHFCQUFSLENBQXBCLENBQUE7O0FBQUEsU0FDQSxHQUFvQixPQUFBLENBQVEsbUJBQVIsQ0FEcEIsQ0FBQTs7QUFBQSxHQUVBLEdBQW9CLE9BQUEsQ0FBUSxZQUFSLENBRnBCLENBQUE7O0FBQUEsaUJBR0EsR0FBb0IsT0FBQSxDQUFRLHlDQUFSLENBSHBCLENBQUE7O0FBQUE7QUFPSSw0QkFBQSxDQUFBOztBQUFBLG9CQUFBLFFBQUEsR0FBVyxJQUFYLENBQUE7O0FBRWMsRUFBQSxpQkFBRSxRQUFGLEdBQUE7QUFFVixJQUZXLElBQUMsQ0FBQSxXQUFBLFFBRVosQ0FBQTtBQUFBLHFFQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUE7QUFBQTs7O09BQUE7QUFBQSxJQU1BLHVDQUFBLENBTkEsQ0FBQTtBQUFBLElBUUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxHQUFBLENBQUEsaUJBUlgsQ0FBQTtBQUFBLElBVUEsSUFBQyxDQUFBLFlBQUQsQ0FBQSxDQVZBLENBQUE7QUFZQSxXQUFPLElBQVAsQ0FkVTtFQUFBLENBRmQ7O0FBa0JBO0FBQUE7O0tBbEJBOztBQUFBLG9CQXFCQSxZQUFBLEdBQWUsU0FBQSxHQUFBO0FBR1gsUUFBQSxDQUFBO0FBQUEsSUFBQSxJQUFHLElBQUg7QUFFSSxNQUFBLENBQUEsR0FBSSxTQUFTLENBQUMsT0FBVixDQUVBO0FBQUEsUUFBQSxHQUFBLEVBQU8sSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQiwyQkFBeEI7QUFBQSxRQUNBLElBQUEsRUFBTyxLQURQO09BRkEsQ0FBSixDQUFBO0FBQUEsTUFLQSxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxtQkFBUixDQUxBLENBQUE7QUFBQSxNQU1BLENBQUMsQ0FBQyxJQUFGLENBQU8sQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtBQUlIO0FBQUE7O2FBQUE7d0RBR0EsS0FBQyxDQUFBLG9CQVBFO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBUCxDQU5BLENBRko7S0FBQSxNQUFBOztRQW1CSSxJQUFDLENBQUE7T0FuQkw7S0FBQTtXQXFCQSxLQXhCVztFQUFBLENBckJmLENBQUE7O0FBQUEsb0JBK0NBLG1CQUFBLEdBQXNCLFNBQUMsSUFBRCxHQUFBO0FBRWxCLFFBQUEsWUFBQTtBQUFBLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxpQ0FBWixFQUErQyxJQUEvQyxDQUFBLENBQUE7QUFBQSxJQUVBLEtBQUEsR0FBUSxFQUZSLENBQUE7QUFHQSxTQUE2Qyw0QkFBN0MsR0FBQTtBQUFBLE1BQUMsS0FBQSxHQUFRLEtBQUssQ0FBQyxNQUFOLENBQWEsSUFBSSxDQUFDLE9BQWxCLENBQVQsQ0FBQTtBQUFBLEtBSEE7QUFBQSxJQUtBLElBQUMsQ0FBQSxPQUFPLENBQUMsR0FBVCxDQUFhLEtBQWIsQ0FMQSxDQUFBO0FBT0E7QUFBQTs7O09BUEE7O01BYUEsSUFBQyxDQUFBO0tBYkQ7V0FlQSxLQWpCa0I7RUFBQSxDQS9DdEIsQ0FBQTs7aUJBQUE7O0dBRmtCLGFBTHRCLENBQUE7O0FBQUEsTUF5RU0sQ0FBQyxPQUFQLEdBQWlCLE9BekVqQixDQUFBOzs7OztBQ0FBLElBQUEseUZBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUFtQixPQUFBLENBQVEscUJBQVIsQ0FBbkIsQ0FBQTs7QUFBQSxTQUNBLEdBQW1CLE9BQUEsQ0FBUSx1QkFBUixDQURuQixDQUFBOztBQUFBLE1BRUEsR0FBbUIsT0FBQSxDQUFRLG9CQUFSLENBRm5CLENBQUE7O0FBQUEsT0FHQSxHQUFtQixPQUFBLENBQVEscUJBQVIsQ0FIbkIsQ0FBQTs7QUFBQSxNQUlBLEdBQW1CLE9BQUEsQ0FBUSxvQkFBUixDQUpuQixDQUFBOztBQUFBLGdCQUtBLEdBQW1CLE9BQUEsQ0FBUSw4QkFBUixDQUxuQixDQUFBOztBQUFBLFlBTUEsR0FBbUIsT0FBQSxDQUFRLDZCQUFSLENBTm5CLENBQUE7O0FBQUE7QUFVSSw0QkFBQSxDQUFBOztBQUFBLG9CQUFBLFFBQUEsR0FBVyxNQUFYLENBQUE7O0FBQUEsb0JBRUEsT0FBQSxHQUFXLElBRlgsQ0FBQTs7QUFBQSxvQkFHQSxLQUFBLEdBQVcsSUFIWCxDQUFBOztBQUFBLG9CQUtBLE9BQUEsR0FBVyxJQUxYLENBQUE7O0FBQUEsb0JBTUEsTUFBQSxHQUFXLElBTlgsQ0FBQTs7QUFBQSxvQkFRQSxJQUFBLEdBQ0k7QUFBQSxJQUFBLENBQUEsRUFBSSxJQUFKO0FBQUEsSUFDQSxDQUFBLEVBQUksSUFESjtBQUFBLElBRUEsQ0FBQSxFQUFJLElBRko7QUFBQSxJQUdBLFlBQUEsRUFBZSxJQUhmO0FBQUEsSUFJQSxVQUFBLEVBQWUsSUFKZjtHQVRKLENBQUE7O0FBQUEsb0JBZUEsV0FBQSxHQUFjLENBZmQsQ0FBQTs7QUFBQSxvQkFnQkEsT0FBQSxHQUFjLEtBaEJkLENBQUE7O0FBQUEsb0JBa0JBLHVCQUFBLEdBQTBCLHlCQWxCMUIsQ0FBQTs7QUFBQSxvQkFtQkEsb0JBQUEsR0FBMEIsc0JBbkIxQixDQUFBOztBQUFBLG9CQW9CQSxlQUFBLEdBQTBCLGlCQXBCMUIsQ0FBQTs7QUFBQSxvQkFzQkEsWUFBQSxHQUFlLEdBdEJmLENBQUE7O0FBQUEsb0JBdUJBLE1BQUEsR0FBZSxRQXZCZixDQUFBOztBQUFBLG9CQXdCQSxVQUFBLEdBQWUsWUF4QmYsQ0FBQTs7QUEwQmMsRUFBQSxpQkFBQSxHQUFBO0FBRVYsbUVBQUEsQ0FBQTtBQUFBLHlEQUFBLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEsNkNBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSx5Q0FBQSxDQUFBO0FBQUEseURBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSwyQ0FBQSxDQUFBO0FBQUEscURBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxPQUFELEdBQVcsQ0FBQSxDQUFFLE1BQUYsQ0FBWCxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsS0FBRCxHQUFXLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxFQUFWLENBQWEsQ0FBYixDQURYLENBQUE7QUFBQSxJQUdBLHVDQUFBLENBSEEsQ0FGVTtFQUFBLENBMUJkOztBQUFBLG9CQWlDQSxZQUFBLEdBQWMsU0FBQSxHQUFBO0FBRVYsSUFBQSxJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSxXQUFaLEVBQXlCLElBQUMsQ0FBQSxXQUExQixDQUFBLENBQUE7V0FFQSxLQUpVO0VBQUEsQ0FqQ2QsQ0FBQTs7QUFBQSxvQkF1Q0EsV0FBQSxHQUFhLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxHQUFULENBQWEsV0FBYixFQUEwQixJQUFDLENBQUEsV0FBM0IsQ0FBQSxDQUFBO1dBRUEsS0FKUztFQUFBLENBdkNiLENBQUE7O0FBQUEsb0JBNkNBLFdBQUEsR0FBYSxTQUFFLENBQUYsR0FBQTtBQUVULElBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQSxDQUFBLENBQUE7V0FFQSxLQUpTO0VBQUEsQ0E3Q2IsQ0FBQTs7QUFBQSxvQkFtREEsTUFBQSxHQUFTLFNBQUEsR0FBQTtBQUVMLElBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxTQUFELEdBQWdCLEdBQUEsQ0FBQSxTQUZoQixDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsWUFBRCxHQUFnQixHQUFBLENBQUEsWUFIaEIsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLE1BQUQsR0FBZ0IsR0FBQSxDQUFBLE1BTGhCLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxPQUFELEdBQWdCLEdBQUEsQ0FBQSxPQU5oQixDQUFBO0FBQUEsSUFPQSxJQUFDLENBQUEsTUFBRCxHQUFnQixHQUFBLENBQUEsTUFQaEIsQ0FBQTtBQUFBLElBUUEsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsR0FBQSxDQUFBLGdCQVJoQixDQUFBO0FBQUEsSUFVQSxJQUNJLENBQUMsUUFETCxDQUNjLElBQUMsQ0FBQSxNQURmLENBRUksQ0FBQyxRQUZMLENBRWMsSUFBQyxDQUFBLE9BRmYsQ0FHSSxDQUFDLFFBSEwsQ0FHYyxJQUFDLENBQUEsTUFIZixDQUlJLENBQUMsUUFKTCxDQUljLElBQUMsQ0FBQSxZQUpmLENBVkEsQ0FBQTtBQUFBLElBZ0JBLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FoQkEsQ0FBQTtXQWtCQSxLQXBCSztFQUFBLENBbkRULENBQUE7O0FBQUEsb0JBeUVBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFVCxJQUFBLElBQUMsQ0FBQSxFQUFELENBQUksYUFBSixFQUFtQixJQUFDLENBQUEsYUFBcEIsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsUUFBRCxDQUFBLENBRkEsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFFBQUQsR0FBWSxDQUFDLENBQUMsUUFBRixDQUFXLElBQUMsQ0FBQSxRQUFaLEVBQXNCLEdBQXRCLENBSlosQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksMEJBQVosRUFBd0MsSUFBQyxDQUFBLFFBQXpDLENBTEEsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksUUFBWixFQUFzQixJQUFDLENBQUEsUUFBdkIsQ0FOQSxDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsS0FBSyxDQUFDLEVBQVAsQ0FBVSxPQUFWLEVBQW1CLEdBQW5CLEVBQXdCLElBQUMsQ0FBQSxXQUF6QixDQVJBLENBQUE7V0FVQSxLQVpTO0VBQUEsQ0F6RWIsQ0FBQTs7QUFBQSxvQkF1RkEsUUFBQSxHQUFXLFNBQUEsR0FBQTtBQUVQLElBQUEsSUFBQyxDQUFBLFdBQUQsR0FBZSxNQUFNLENBQUMsT0FBdEIsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQURBLENBQUE7V0FHQSxLQUxPO0VBQUEsQ0F2RlgsQ0FBQTs7QUFBQSxvQkE4RkEsV0FBQSxHQUFjLFNBQUEsR0FBQTtBQUVWLElBQUEsSUFBRyxDQUFBLElBQUUsQ0FBQSxPQUFMO0FBQ0ksTUFBQSxxQkFBQSxDQUFzQixJQUFDLENBQUEsWUFBdkIsQ0FBQSxDQUFBO0FBQUEsTUFDQSxJQUFDLENBQUEsT0FBRCxHQUFXLElBRFgsQ0FESjtLQUFBO1dBSUEsS0FOVTtFQUFBLENBOUZkLENBQUE7O0FBQUEsb0JBc0dBLFlBQUEsR0FBZSxTQUFBLEdBQUE7QUFFWCxJQUFBLElBQUMsQ0FBQSxPQUFELEdBQVcsS0FBWCxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsQ0FBZ0IsZUFBaEIsQ0FGQSxDQUFBO0FBQUEsSUFJQSxZQUFBLENBQWEsSUFBQyxDQUFBLFdBQWQsQ0FKQSxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsV0FBRCxHQUFlLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQ3RCLEtBQUMsQ0FBQSxLQUFLLENBQUMsV0FBUCxDQUFtQixlQUFuQixFQURzQjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFFYixFQUZhLENBTmYsQ0FBQTtBQUFBLElBVUEsSUFBQyxDQUFBLE9BQUQsQ0FBUyxJQUFDLENBQUEsZUFBVixDQVZBLENBQUE7V0FZQSxLQWRXO0VBQUEsQ0F0R2YsQ0FBQTs7QUFBQSxvQkFzSEEsYUFBQSxHQUFnQixTQUFBLEdBQUE7QUFJWixJQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBUCxDQUFlLElBQUMsQ0FBQSxHQUFoQixDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxTQUFTLENBQUMsa0JBQVgsQ0FBOEIsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUEsR0FBQTtlQUFHLEtBQUMsQ0FBQSxPQUFELENBQVMsS0FBQyxDQUFBLG9CQUFWLEVBQUg7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QixDQUZBLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxLQUFELENBQUEsQ0FKQSxDQUFBO1dBTUEsS0FWWTtFQUFBLENBdEhoQixDQUFBOztBQUFBLG9CQWtJQSxLQUFBLEdBQVEsU0FBQSxHQUFBO0FBRUosSUFBQSxJQUFDLENBQUEsT0FBRCxDQUFTLE9BQVQsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsS0FBYixDQUFBLENBRkEsQ0FBQTtXQUlBLEtBTkk7RUFBQSxDQWxJUixDQUFBOztBQUFBLG9CQTBJQSxRQUFBLEdBQVcsU0FBQSxHQUFBO0FBRVAsSUFBQSxJQUFDLENBQUEsT0FBRCxDQUFBLENBQUEsQ0FBQTtXQUVBLEtBSk87RUFBQSxDQTFJWCxDQUFBOztBQUFBLG9CQWdKQSxPQUFBLEdBQVUsU0FBQSxHQUFBO0FBRU4sUUFBQSxZQUFBO0FBQUEsSUFBQSxDQUFBLEdBQUksTUFBTSxDQUFDLFVBQVAsSUFBcUIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUE5QyxJQUE2RCxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQS9FLENBQUE7QUFBQSxJQUNBLENBQUEsR0FBSSxNQUFNLENBQUMsV0FBUCxJQUFzQixRQUFRLENBQUMsZUFBZSxDQUFDLFlBQS9DLElBQStELFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFEakYsQ0FBQTtBQUFBLElBR0EsTUFBQSxHQUFTLENBQUEsR0FBSSxJQUFDLENBQUEsSUFBSSxDQUFDLFVBSG5CLENBQUE7QUFBQSxJQUtBLElBQUMsQ0FBQSxJQUFELEdBQ0k7QUFBQSxNQUFBLENBQUEsRUFBSSxDQUFKO0FBQUEsTUFDQSxDQUFBLEVBQUksQ0FESjtBQUFBLE1BRUEsQ0FBQSxFQUFPLENBQUEsR0FBSSxDQUFQLEdBQWMsVUFBZCxHQUE4QixXQUZsQztBQUFBLE1BR0EsWUFBQSxFQUFlLENBQUEsSUFBRSxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixDQUFBLENBQUQsSUFBcUIsTUFBQSxHQUFTLEdBQTlCLElBQXFDLE1BQUEsR0FBUyxHQUg3RDtBQUFBLE1BSUEsVUFBQSxFQUFlLENBSmY7S0FOSixDQUFBO0FBQUEsSUFZQSxJQUFDLENBQUEsT0FBRCxDQUFTLElBQUMsQ0FBQSx1QkFBVixFQUFtQyxJQUFDLENBQUEsSUFBcEMsQ0FaQSxDQUFBO1dBY0EsS0FoQk07RUFBQSxDQWhKVixDQUFBOztBQUFBLG9CQWtLQSxXQUFBLEdBQWMsU0FBQyxDQUFELEdBQUE7QUFFVixRQUFBLElBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxJQUFuQixDQUF3QixNQUF4QixDQUFQLENBQUE7QUFFQSxJQUFBLElBQUEsQ0FBQSxJQUFBO0FBQUEsYUFBTyxLQUFQLENBQUE7S0FGQTtBQUFBLElBSUEsSUFBQyxDQUFBLGFBQUQsQ0FBZSxJQUFmLEVBQXFCLENBQXJCLENBSkEsQ0FBQTtXQU1BLEtBUlU7RUFBQSxDQWxLZCxDQUFBOztBQUFBLG9CQTRLQSxhQUFBLEdBQWdCLFNBQUUsSUFBRixFQUFRLENBQVIsR0FBQTtBQUVaLFFBQUEsY0FBQTs7TUFGb0IsSUFBSTtLQUV4QjtBQUFBLElBQUEsS0FBQSxHQUFhLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBakIsQ0FBSCxHQUFtQyxJQUFJLENBQUMsS0FBTCxDQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLFFBQWpCLENBQTJCLENBQUEsQ0FBQSxDQUE5RCxHQUFzRSxJQUFoRixDQUFBO0FBQUEsSUFDQSxPQUFBLEdBQWEsS0FBSyxDQUFDLE1BQU4sQ0FBYSxDQUFiLENBQUEsS0FBbUIsR0FBdEIsR0FBK0IsS0FBSyxDQUFDLEtBQU4sQ0FBWSxHQUFaLENBQWlCLENBQUEsQ0FBQSxDQUFFLENBQUMsS0FBcEIsQ0FBMEIsR0FBMUIsQ0FBK0IsQ0FBQSxDQUFBLENBQTlELEdBQXNFLEtBQUssQ0FBQyxLQUFOLENBQVksR0FBWixDQUFpQixDQUFBLENBQUEsQ0FEakcsQ0FBQTtBQUdBLElBQUEsSUFBRyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsVUFBVixDQUFxQixPQUFyQixDQUFIOztRQUNJLENBQUMsQ0FBRSxjQUFILENBQUE7T0FBQTtBQUFBLE1BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLFVBQWIsQ0FBd0IsS0FBeEIsQ0FEQSxDQURKO0tBQUEsTUFBQTtBQUlJLE1BQUEsSUFBQyxDQUFBLGtCQUFELENBQW9CLElBQXBCLENBQUEsQ0FKSjtLQUhBO1dBU0EsS0FYWTtFQUFBLENBNUtoQixDQUFBOztBQUFBLG9CQXlMQSxrQkFBQSxHQUFxQixTQUFDLElBQUQsR0FBQTtBQUVqQixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksaUNBQVosQ0FBQSxDQUFBO0FBRUE7QUFBQTs7O09BRkE7V0FRQSxLQVZpQjtFQUFBLENBekxyQixDQUFBOztpQkFBQTs7R0FGa0IsYUFSdEIsQ0FBQTs7QUFBQSxNQStNTSxDQUFDLE9BQVAsR0FBaUIsT0EvTWpCLENBQUE7Ozs7O0FDQUEsSUFBQSxrQkFBQTtFQUFBOztpU0FBQTs7QUFBQTtBQUVDLHVDQUFBLENBQUE7Ozs7O0dBQUE7O0FBQUEsK0JBQUEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVKLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSTtFQUFBLENBQUwsQ0FBQTs7NEJBQUE7O0dBRmdDLFFBQVEsQ0FBQyxXQUExQyxDQUFBOztBQUFBLE1BTU0sQ0FBQyxPQUFQLEdBQWlCLGtCQU5qQixDQUFBOzs7OztBQ0FBLElBQUEsa0NBQUE7RUFBQTtpU0FBQTs7QUFBQSxhQUFBLEdBQWdCLE9BQUEsQ0FBUSxpQ0FBUixDQUFoQixDQUFBOztBQUFBO0FBSUMsd0NBQUEsQ0FBQTs7OztHQUFBOztBQUFBLGdDQUFBLEtBQUEsR0FBUSxhQUFSLENBQUE7OzZCQUFBOztHQUZpQyxRQUFRLENBQUMsV0FGM0MsQ0FBQTs7QUFBQSxNQU1NLENBQUMsT0FBUCxHQUFpQixtQkFOakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGtEQUFBO0VBQUE7O2lTQUFBOztBQUFBLGtCQUFBLEdBQXFCLE9BQUEsQ0FBUSx1QkFBUixDQUFyQixDQUFBOztBQUFBLFdBQ0EsR0FBcUIsT0FBQSxDQUFRLGlDQUFSLENBRHJCLENBQUE7O0FBQUE7QUFLQyxzQ0FBQSxDQUFBOzs7OztHQUFBOztBQUFBLDhCQUFBLEtBQUEsR0FBUSxXQUFSLENBQUE7O0FBQUEsOEJBRUEsZUFBQSxHQUFrQixTQUFDLElBQUQsR0FBQTtBQUVqQixRQUFBLE1BQUE7QUFBQSxJQUFBLE1BQUEsR0FBUyxJQUFDLENBQUEsU0FBRCxDQUFXO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBUDtLQUFYLENBQVQsQ0FBQTtBQUVBLElBQUEsSUFBRyxDQUFBLE1BQUg7QUFDQyxNQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksZ0JBQVosQ0FBQSxDQUREO0tBRkE7QUFLQSxXQUFPLE1BQVAsQ0FQaUI7RUFBQSxDQUZsQixDQUFBOzsyQkFBQTs7R0FGK0IsbUJBSGhDLENBQUE7O0FBQUEsTUFnQk0sQ0FBQyxPQUFQLEdBQWlCLGlCQWhCakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLE1BQUE7O0FBQUEsTUFBQSxHQUVDO0FBQUEsRUFBQSxNQUFBLEVBQVksU0FBWjtBQUFBLEVBQ0EsT0FBQSxFQUFZLFNBRFo7QUFBQSxFQUVBLFFBQUEsRUFBWSxTQUZaO0FBQUEsRUFHQSxTQUFBLEVBQVksU0FIWjtDQUZELENBQUE7O0FBQUEsTUFPTSxDQUFDLE9BQVAsR0FBaUIsTUFQakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGtCQUFBOztBQUFBLGFBQUEsR0FBZ0IsT0FBQSxDQUFRLDhCQUFSLENBQWhCLENBQUE7O0FBQUE7bUJBSUM7O0FBQUEsRUFBQSxHQUFDLENBQUEsS0FBRCxHQUFTLEdBQUEsQ0FBQSxhQUFULENBQUE7O0FBQUEsRUFFQSxHQUFDLENBQUEsV0FBRCxHQUFlLFNBQUEsR0FBQTtXQUVkO0FBQUE7QUFBQSxtREFBQTtBQUFBLE1BQ0EsUUFBQSxFQUFXLEdBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLFFBRGpCO01BRmM7RUFBQSxDQUZmLENBQUE7O0FBQUEsRUFPQSxHQUFDLENBQUEsR0FBRCxHQUFPLFNBQUMsSUFBRCxFQUFPLElBQVAsR0FBQTtBQUVOLElBQUEsSUFBQSxHQUFPLENBQUMsQ0FBQyxNQUFGLENBQVMsSUFBVCxFQUFlLElBQWYsRUFBcUIsR0FBQyxDQUFBLFdBQUQsQ0FBQSxDQUFyQixDQUFQLENBQUE7QUFDQSxXQUFPLEdBQUMsQ0FBQSxjQUFELENBQWdCLEdBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLElBQVgsQ0FBaEIsRUFBa0MsSUFBbEMsQ0FBUCxDQUhNO0VBQUEsQ0FQUCxDQUFBOztBQUFBLEVBWUEsR0FBQyxDQUFBLGNBQUQsR0FBa0IsU0FBQyxHQUFELEVBQU0sSUFBTixHQUFBO0FBRWpCLFdBQU8sR0FBRyxDQUFDLE9BQUosQ0FBWSxpQkFBWixFQUErQixTQUFDLENBQUQsRUFBSSxDQUFKLEdBQUE7QUFDckMsVUFBQSxDQUFBO2FBQUEsQ0FBQSxHQUFJLElBQUssQ0FBQSxDQUFBLENBQUwsSUFBVyxDQUFHLE1BQUEsQ0FBQSxJQUFZLENBQUEsQ0FBQSxDQUFaLEtBQWtCLFFBQXJCLEdBQW1DLElBQUssQ0FBQSxDQUFBLENBQUUsQ0FBQyxRQUFSLENBQUEsQ0FBbkMsR0FBMkQsRUFBM0QsRUFEc0I7SUFBQSxDQUEvQixDQUFQLENBQUE7QUFFQyxJQUFBLElBQUcsTUFBQSxDQUFBLENBQUEsS0FBWSxRQUFaLElBQXdCLE1BQUEsQ0FBQSxDQUFBLEtBQVksUUFBdkM7YUFBcUQsRUFBckQ7S0FBQSxNQUFBO2FBQTRELEVBQTVEO0tBSmdCO0VBQUEsQ0FabEIsQ0FBQTs7QUFBQSxFQWtCQSxHQUFDLENBQUEsRUFBRCxHQUFNLFNBQUEsR0FBQTtBQUVMLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSztFQUFBLENBbEJOLENBQUE7O2FBQUE7O0lBSkQsQ0FBQTs7QUFBQSxNQTBCTSxDQUFDLE9BQVAsR0FBaUIsR0ExQmpCLENBQUE7Ozs7O0FDQUEsSUFBQSxZQUFBO0VBQUEsa0ZBQUE7O0FBQUE7QUFFZSxFQUFBLHNCQUFBLEdBQUE7QUFFYixtQ0FBQSxDQUFBO0FBQUEsSUFBQSxDQUFDLENBQUMsTUFBRixDQUFTLElBQVQsRUFBWSxRQUFRLENBQUMsTUFBckIsQ0FBQSxDQUFBO0FBRUEsV0FBTyxJQUFQLENBSmE7RUFBQSxDQUFkOztBQUFBLHlCQU1BLEVBQUEsR0FBSyxTQUFBLEdBQUE7QUFFSixXQUFPLE1BQU0sQ0FBQyxFQUFkLENBRkk7RUFBQSxDQU5MLENBQUE7O3NCQUFBOztJQUZELENBQUE7O0FBQUEsTUFZTSxDQUFDLE9BQVAsR0FBaUIsWUFaakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHlCQUFBO0VBQUEsa0ZBQUE7O0FBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSw2QkFBUixDQUFmLENBQUE7O0FBQUEsR0FDQSxHQUFlLE9BQUEsQ0FBUSxhQUFSLENBRGYsQ0FBQTs7QUFHQTtBQUFBOzs7O0dBSEE7O0FBQUE7QUFXSSxtQkFBQSxJQUFBLEdBQVcsSUFBWCxDQUFBOztBQUFBLG1CQUNBLElBQUEsR0FBVyxJQURYLENBQUE7O0FBQUEsbUJBRUEsUUFBQSxHQUFXLElBRlgsQ0FBQTs7QUFBQSxtQkFHQSxNQUFBLEdBQVcsSUFIWCxDQUFBOztBQUFBLG1CQUlBLFVBQUEsR0FBVyxPQUpYLENBQUE7O0FBTWMsRUFBQSxnQkFBQyxJQUFELEVBQU8sRUFBUCxHQUFBO0FBRVYsMkRBQUEsQ0FBQTtBQUFBLHFDQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEsaURBQUEsQ0FBQTtBQUFBLDZDQUFBLENBQUE7QUFBQTtBQUFBLHNFQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsUUFBRCxHQUFZLEVBRlosQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUhWLENBQUE7QUFBQSxJQUtBLElBQUMsQ0FBQSxJQUFELEdBQVEsSUFBQyxDQUFBLE9BQUQsQ0FBQSxDQUxSLENBQUE7QUFPQSxJQUFBLElBQUcsR0FBRyxDQUFDLEdBQUosQ0FBUSxRQUFSLEVBQWtCO0FBQUEsTUFBRSxJQUFBLEVBQU8sSUFBQyxDQUFBLElBQVY7S0FBbEIsQ0FBSDtBQUVJLE1BQUEsQ0FBQyxDQUFDLElBQUYsQ0FDSTtBQUFBLFFBQUEsR0FBQSxFQUFVLEdBQUcsQ0FBQyxHQUFKLENBQVMsUUFBVCxFQUFtQjtBQUFBLFVBQUUsSUFBQSxFQUFPLElBQUMsQ0FBQSxJQUFWO1NBQW5CLENBQVY7QUFBQSxRQUNBLElBQUEsRUFBVSxLQURWO0FBQUEsUUFFQSxPQUFBLEVBQVUsSUFBQyxDQUFBLFNBRlg7QUFBQSxRQUdBLEtBQUEsRUFBVSxJQUFDLENBQUEsVUFIWDtPQURKLENBQUEsQ0FGSjtLQUFBLE1BQUE7QUFVSSxNQUFBLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FBQSxDQVZKO0tBUEE7QUFBQSxJQW1CQSxJQW5CQSxDQUZVO0VBQUEsQ0FOZDs7QUFBQSxtQkE2QkEsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVOLFFBQUEsSUFBQTtBQUFBLElBQUEsSUFBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQWhCLElBQTJCLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQXZCLENBQTZCLE9BQTdCLENBQTlCO0FBRUksTUFBQSxJQUFBLEdBQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBdkIsQ0FBNkIsT0FBN0IsQ0FBc0MsQ0FBQSxDQUFBLENBQUUsQ0FBQyxLQUF6QyxDQUErQyxHQUEvQyxDQUFvRCxDQUFBLENBQUEsQ0FBM0QsQ0FGSjtLQUFBLE1BSUssSUFBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQWpCO0FBRUQsTUFBQSxJQUFBLEdBQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFyQixDQUZDO0tBQUEsTUFBQTtBQU1ELE1BQUEsSUFBQSxHQUFPLElBQUMsQ0FBQSxTQUFBLENBQVIsQ0FOQztLQUpMO1dBWUEsS0FkTTtFQUFBLENBN0JWLENBQUE7O0FBQUEsbUJBNkNBLFNBQUEsR0FBWSxTQUFDLEtBQUQsR0FBQTtBQUVSO0FBQUEsZ0RBQUE7QUFBQSxRQUFBLENBQUE7QUFBQSxJQUVBLENBQUEsR0FBSSxJQUZKLENBQUE7QUFJQSxJQUFBLElBQUcsS0FBSyxDQUFDLFlBQVQ7QUFDSSxNQUFBLENBQUEsR0FBSSxJQUFJLENBQUMsS0FBTCxDQUFXLEtBQUssQ0FBQyxZQUFqQixDQUFKLENBREo7S0FBQSxNQUFBO0FBR0ksTUFBQSxDQUFBLEdBQUksS0FBSixDQUhKO0tBSkE7QUFBQSxJQVNBLElBQUMsQ0FBQSxJQUFELEdBQVksSUFBQSxZQUFBLENBQWEsQ0FBYixDQVRaLENBQUE7O01BVUEsSUFBQyxDQUFBO0tBVkQ7V0FZQSxLQWRRO0VBQUEsQ0E3Q1osQ0FBQTs7QUFBQSxtQkE2REEsVUFBQSxHQUFhLFNBQUEsR0FBQTtBQUVUO0FBQUEsc0VBQUE7QUFBQSxJQUVBLENBQUMsQ0FBQyxJQUFGLENBQ0k7QUFBQSxNQUFBLEdBQUEsRUFBVyxJQUFDLENBQUEsTUFBWjtBQUFBLE1BQ0EsUUFBQSxFQUFXLE1BRFg7QUFBQSxNQUVBLFFBQUEsRUFBVyxJQUFDLENBQUEsU0FGWjtBQUFBLE1BR0EsS0FBQSxFQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFBLEdBQUE7aUJBQUcsT0FBTyxDQUFDLEdBQVIsQ0FBWSx5QkFBWixFQUFIO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FIWDtLQURKLENBRkEsQ0FBQTtXQVFBLEtBVlM7RUFBQSxDQTdEYixDQUFBOztBQUFBLG1CQXlFQSxHQUFBLEdBQU0sU0FBQyxFQUFELEdBQUE7QUFFRjtBQUFBOztPQUFBO0FBSUEsV0FBTyxJQUFDLENBQUEsSUFBSSxDQUFDLFNBQU4sQ0FBZ0IsRUFBaEIsQ0FBUCxDQU5FO0VBQUEsQ0F6RU4sQ0FBQTs7QUFBQSxtQkFpRkEsY0FBQSxHQUFpQixTQUFDLEdBQUQsR0FBQTtBQUViLFdBQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFkLEdBQW9CLGlCQUFwQixHQUF3QyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQXRELEdBQW1FLEdBQW5FLEdBQXlFLEdBQWhGLENBRmE7RUFBQSxDQWpGakIsQ0FBQTs7Z0JBQUE7O0lBWEosQ0FBQTs7QUFBQSxNQWdHTSxDQUFDLE9BQVAsR0FBaUIsTUFoR2pCLENBQUE7Ozs7O0FDQUEsSUFBQSw2Q0FBQTtFQUFBLGtGQUFBOztBQUFBLGFBQUEsR0FBc0IsT0FBQSxDQUFRLDhCQUFSLENBQXRCLENBQUE7O0FBQUEsbUJBQ0EsR0FBc0IsT0FBQSxDQUFRLHlDQUFSLENBRHRCLENBQUE7O0FBQUE7QUFLSSxzQkFBQSxTQUFBLEdBQVksSUFBWixDQUFBOztBQUFBLHNCQUNBLEVBQUEsR0FBWSxJQURaLENBQUE7O0FBR2MsRUFBQSxtQkFBQyxTQUFELEVBQVksUUFBWixHQUFBO0FBRVYscUNBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxFQUFELEdBQU0sUUFBTixDQUFBO0FBQUEsSUFFQSxDQUFDLENBQUMsSUFBRixDQUFPO0FBQUEsTUFBQSxHQUFBLEVBQU0sU0FBTjtBQUFBLE1BQWlCLE9BQUEsRUFBVSxJQUFDLENBQUEsUUFBNUI7S0FBUCxDQUZBLENBQUE7QUFBQSxJQUlBLElBSkEsQ0FGVTtFQUFBLENBSGQ7O0FBQUEsc0JBV0EsUUFBQSxHQUFXLFNBQUMsSUFBRCxHQUFBO0FBRVAsUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sRUFBUCxDQUFBO0FBQUEsSUFFQSxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFhLFVBQWIsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUFDLEdBQUQsRUFBTSxLQUFOLEdBQUE7QUFDMUIsVUFBQSxNQUFBO0FBQUEsTUFBQSxNQUFBLEdBQVMsQ0FBQSxDQUFFLEtBQUYsQ0FBVCxDQUFBO2FBQ0EsSUFBSSxDQUFDLElBQUwsQ0FBYyxJQUFBLGFBQUEsQ0FDVjtBQUFBLFFBQUEsRUFBQSxFQUFPLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBWixDQUFpQixDQUFDLFFBQWxCLENBQUEsQ0FBUDtBQUFBLFFBQ0EsSUFBQSxFQUFPLENBQUMsQ0FBQyxJQUFGLENBQU8sTUFBTSxDQUFDLElBQVAsQ0FBQSxDQUFQLENBRFA7T0FEVSxDQUFkLEVBRjBCO0lBQUEsQ0FBOUIsQ0FGQSxDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsU0FBRCxHQUFpQixJQUFBLG1CQUFBLENBQW9CLElBQXBCLENBUmpCLENBQUE7O01BVUEsSUFBQyxDQUFBO0tBVkQ7V0FZQSxLQWRPO0VBQUEsQ0FYWCxDQUFBOztBQUFBLHNCQTJCQSxHQUFBLEdBQU0sU0FBQyxFQUFELEdBQUE7QUFFRixRQUFBLENBQUE7QUFBQSxJQUFBLENBQUEsR0FBSSxJQUFDLENBQUEsU0FBUyxDQUFDLEtBQVgsQ0FBaUI7QUFBQSxNQUFBLEVBQUEsRUFBSyxFQUFMO0tBQWpCLENBQUosQ0FBQTtBQUFBLElBQ0EsQ0FBQSxHQUFJLENBQUUsQ0FBQSxDQUFBLENBQUUsQ0FBQyxHQUFMLENBQVMsTUFBVCxDQURKLENBQUE7QUFHQSxXQUFPLENBQUMsQ0FBQyxJQUFGLENBQU8sQ0FBUCxDQUFQLENBTEU7RUFBQSxDQTNCTixDQUFBOzttQkFBQTs7SUFMSixDQUFBOztBQUFBLE1BdUNNLENBQUMsT0FBUCxHQUFpQixTQXZDakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGFBQUE7RUFBQTs7aVNBQUE7O0FBQUE7QUFFQyxrQ0FBQSxDQUFBOztBQUFjLEVBQUEsdUJBQUMsS0FBRCxFQUFRLE1BQVIsR0FBQTtBQUViLG1DQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsSUFBQSxLQUFBLEdBQVEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxLQUFkLENBQVIsQ0FBQTtBQUVBLFdBQU8sUUFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFuQixDQUF5QixJQUF6QixFQUE0QixTQUE1QixDQUFQLENBSmE7RUFBQSxDQUFkOztBQUFBLDBCQU1BLEdBQUEsR0FBTSxTQUFDLEtBQUQsRUFBUSxPQUFSLEdBQUE7QUFFTCxJQUFBLE9BQUEsSUFBVyxDQUFDLE9BQUEsR0FBVSxFQUFYLENBQVgsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFRLElBQUMsQ0FBQSxZQUFELENBQWMsS0FBZCxDQUZSLENBQUE7QUFBQSxJQUlBLE9BQU8sQ0FBQyxJQUFSLEdBQWUsSUFBSSxDQUFDLFNBQUwsQ0FBZSxLQUFmLENBSmYsQ0FBQTtBQU1BLFdBQU8sUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQWpDLENBQXNDLElBQXRDLEVBQXlDLEtBQXpDLEVBQWdELE9BQWhELENBQVAsQ0FSSztFQUFBLENBTk4sQ0FBQTs7QUFBQSwwQkFnQkEsWUFBQSxHQUFlLFNBQUMsS0FBRCxHQUFBO1dBRWQsTUFGYztFQUFBLENBaEJmLENBQUE7O0FBQUEsMEJBb0JBLEVBQUEsR0FBSyxTQUFBLEdBQUE7QUFFSixXQUFPLE1BQU0sQ0FBQyxFQUFkLENBRkk7RUFBQSxDQXBCTCxDQUFBOzt1QkFBQTs7R0FGMkIsUUFBUSxDQUFDLFVBQXJDLENBQUE7O0FBQUEsTUEwQk0sQ0FBQyxPQUFQLEdBQWlCLGFBMUJqQixDQUFBOzs7OztBQ0FBLElBQUEsYUFBQTtFQUFBO2lTQUFBOztBQUFBO0FBRUksa0NBQUEsQ0FBQTs7OztHQUFBOztBQUFBLDBCQUFBLFFBQUEsR0FFSTtBQUFBLElBQUEsS0FBQSxFQUFnQixFQUFoQjtBQUFBLElBRUEsTUFBQSxFQUFnQixFQUZoQjtBQUFBLElBSUEsSUFBQSxFQUNJO0FBQUEsTUFBQSxLQUFBLEVBQWEsK0JBQWI7QUFBQSxNQUNBLFFBQUEsRUFBYSxrQ0FEYjtBQUFBLE1BRUEsUUFBQSxFQUFhLGtDQUZiO0FBQUEsTUFHQSxNQUFBLEVBQWEsZ0NBSGI7QUFBQSxNQUlBLE1BQUEsRUFBYSxnQ0FKYjtBQUFBLE1BS0EsTUFBQSxFQUFhLGdDQUxiO0tBTEo7R0FGSixDQUFBOzt1QkFBQTs7R0FGd0IsUUFBUSxDQUFDLFVBQXJDLENBQUE7O0FBQUEsTUFnQk0sQ0FBQyxPQUFQLEdBQWlCLGFBaEJqQixDQUFBOzs7OztBQ0FBLElBQUEsWUFBQTtFQUFBOztpU0FBQTs7QUFBQTtBQUVJLGlDQUFBLENBQUE7Ozs7OztHQUFBOztBQUFBLHlCQUFBLFFBQUEsR0FDSTtBQUFBLElBQUEsSUFBQSxFQUFXLElBQVg7QUFBQSxJQUNBLFFBQUEsRUFBVyxJQURYO0FBQUEsSUFFQSxPQUFBLEVBQVcsSUFGWDtHQURKLENBQUE7O0FBQUEseUJBS0EsWUFBQSxHQUFlLFNBQUEsR0FBQTtBQUNYLFdBQU8sSUFBQyxDQUFBLEdBQUQsQ0FBSyxVQUFMLENBQVAsQ0FEVztFQUFBLENBTGYsQ0FBQTs7QUFBQSx5QkFRQSxTQUFBLEdBQVksU0FBQyxFQUFELEdBQUE7QUFDUixRQUFBLHVCQUFBO0FBQUE7QUFBQSxTQUFBLFNBQUE7a0JBQUE7QUFBQztBQUFBLFdBQUEsVUFBQTtxQkFBQTtBQUFDLFFBQUEsSUFBWSxDQUFBLEtBQUssRUFBakI7QUFBQSxpQkFBTyxDQUFQLENBQUE7U0FBRDtBQUFBLE9BQUQ7QUFBQSxLQUFBO0FBQUEsSUFDQSxPQUFPLENBQUMsSUFBUixDQUFjLCtCQUFBLEdBQStCLEVBQTdDLENBREEsQ0FBQTtXQUVBLEtBSFE7RUFBQSxDQVJaLENBQUE7O3NCQUFBOztHQUZ1QixRQUFRLENBQUMsTUFBcEMsQ0FBQTs7QUFBQSxNQWVNLENBQUMsT0FBUCxHQUFpQixZQWZqQixDQUFBOzs7OztBQ0FBLElBQUEsYUFBQTtFQUFBO2lTQUFBOztBQUFBO0FBRUMsa0NBQUEsQ0FBQTs7OztHQUFBOztBQUFBLDBCQUFBLFFBQUEsR0FFQztBQUFBLElBQUEsRUFBQSxFQUFPLEVBQVA7QUFBQSxJQUNBLElBQUEsRUFBTyxFQURQO0dBRkQsQ0FBQTs7dUJBQUE7O0dBRjJCLFFBQVEsQ0FBQyxNQUFyQyxDQUFBOztBQUFBLE1BT00sQ0FBQyxPQUFQLEdBQWlCLGFBUGpCLENBQUE7Ozs7O0FDQUEsSUFBQSw2REFBQTtFQUFBOztpU0FBQTs7QUFBQSxhQUFBLEdBQXVCLE9BQUEsQ0FBUSxrQkFBUixDQUF2QixDQUFBOztBQUFBLFdBQ0EsR0FBdUIsT0FBQSxDQUFRLHlCQUFSLENBRHZCLENBQUE7O0FBQUEsb0JBRUEsR0FBdUIsT0FBQSxDQUFRLGtDQUFSLENBRnZCLENBQUE7O0FBQUE7QUFNQyxnQ0FBQSxDQUFBOzs7Ozs7R0FBQTs7QUFBQSx3QkFBQSxRQUFBLEdBRUM7QUFBQSxJQUFBLE1BQUEsRUFBUyxFQUFUO0FBQUEsSUFDQSxRQUFBLEVBQ0M7QUFBQSxNQUFBLE1BQUEsRUFBWSxFQUFaO0FBQUEsTUFDQSxRQUFBLEVBQVksRUFEWjtBQUFBLE1BRUEsU0FBQSxFQUFZLEVBRlo7QUFBQSxNQUdBLFNBQUEsRUFBWSxFQUhaO0tBRkQ7QUFBQSxJQU1BLGFBQUEsRUFBZSxFQU5mO0FBQUEsSUFPQSxNQUFBLEVBQVMsRUFQVDtBQUFBLElBUUEsYUFBQSxFQUNDO0FBQUEsTUFBQSxPQUFBLEVBQWEsSUFBYjtBQUFBLE1BQ0EsVUFBQSxFQUFhLElBRGI7QUFBQSxNQUVBLE9BQUEsRUFBYSxJQUZiO0tBVEQ7QUFBQSxJQVlBLFNBQUEsRUFBWSxFQVpaO0FBQUEsSUFhQSxNQUFBLEVBQVMsRUFiVDtBQUFBLElBY0EsT0FBQSxFQUFTLElBZFQ7QUFBQSxJQWdCQSxXQUFBLEVBQWMsRUFoQmQ7QUFBQSxJQWlCQSxRQUFBLEVBQWMsRUFqQmQ7QUFBQSxJQWtCQSxLQUFBLEVBQWMsRUFsQmQ7QUFBQSxJQW1CQSxXQUFBLEVBQ0M7QUFBQSxNQUFBLE1BQUEsRUFBZ0IsRUFBaEI7QUFBQSxNQUNBLGFBQUEsRUFBZ0IsRUFEaEI7S0FwQkQ7R0FGRCxDQUFBOztBQUFBLHdCQXlCQSxZQUFBLEdBQWUsU0FBQyxLQUFELEdBQUE7QUFFZCxJQUFBLElBQUcsS0FBSyxDQUFDLElBQVQ7QUFDQyxNQUFBLEtBQUssQ0FBQyxHQUFOLEdBQVksTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFkLEdBQXlCLEdBQXpCLEdBQStCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQXBELEdBQThELEdBQTlELEdBQW9FLEtBQUssQ0FBQyxJQUF0RixDQUREO0tBQUE7QUFHQSxJQUFBLElBQUcsS0FBSyxDQUFDLEtBQVQ7QUFDQyxNQUFBLEtBQUssQ0FBQyxLQUFOLEdBQWMsV0FBVyxDQUFDLFFBQVosQ0FBcUIsS0FBSyxDQUFDLEtBQTNCLEVBQWtDLENBQWxDLENBQWQsQ0FERDtLQUhBO0FBTUEsSUFBQSxJQUFHLEtBQUssQ0FBQyxJQUFOLElBQWUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUEvQjtBQUNDLE1BQUEsS0FBSyxDQUFDLFNBQU4sR0FDQztBQUFBLFFBQUEsSUFBQSxFQUFjLG9CQUFvQixDQUFDLGdCQUFyQixDQUFzQyxLQUFLLENBQUMsSUFBNUMsQ0FBZDtBQUFBLFFBQ0EsV0FBQSxFQUFjLG9CQUFvQixDQUFDLGdCQUFyQixDQUFzQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQW5ELENBRGQ7T0FERCxDQUREO0tBTkE7QUFXQSxJQUFBLElBQUcsS0FBSyxDQUFDLEtBQVQ7QUFDQyxNQUFBLEtBQUssQ0FBQyxTQUFOLEdBQWtCLElBQUMsQ0FBQSxZQUFELENBQWMsS0FBSyxDQUFDLEtBQXBCLENBQWxCLENBREQ7S0FYQTtXQWNBLE1BaEJjO0VBQUEsQ0F6QmYsQ0FBQTs7QUFBQSx3QkEyQ0EsWUFBQSxHQUFlLFNBQUMsS0FBRCxHQUFBO0FBRWQsUUFBQSxxQ0FBQTtBQUFBLElBQUEsSUFBQSxHQUFPLEVBQVAsQ0FBQTtBQUVBO0FBQUEsU0FBQSwyQ0FBQTtzQkFBQTtBQUNDLE1BQUEsU0FBQSxHQUFlLElBQUEsS0FBUSxHQUFYLEdBQW9CLGlCQUFwQixHQUEyQyxvQkFBdkQsQ0FBQTtBQUFBLE1BQ0EsSUFBQSxJQUFTLGdCQUFBLEdBQWdCLFNBQWhCLEdBQTBCLEtBQTFCLEdBQStCLElBQS9CLEdBQW9DLFNBRDdDLENBREQ7QUFBQSxLQUZBO1dBTUEsS0FSYztFQUFBLENBM0NmLENBQUE7O3FCQUFBOztHQUZ5QixjQUoxQixDQUFBOztBQUFBLE1BMkRNLENBQUMsT0FBUCxHQUFpQixXQTNEakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHlCQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsc0JBQVIsQ0FBZixDQUFBOztBQUFBLE1BQ0EsR0FBZSxPQUFBLENBQVEsVUFBUixDQURmLENBQUE7O0FBQUE7QUFLSSx3QkFBQSxDQUFBOztBQUFBLEVBQUEsR0FBQyxDQUFBLGlCQUFELEdBQXlCLG1CQUF6QixDQUFBOztBQUFBLEVBQ0EsR0FBQyxDQUFBLHFCQUFELEdBQXlCLHVCQUR6QixDQUFBOztBQUFBLGdCQUdBLFFBQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsZ0JBS0EsT0FBQSxHQUFXO0FBQUEsSUFBQSxJQUFBLEVBQU8sSUFBUDtBQUFBLElBQWEsR0FBQSxFQUFNLElBQW5CO0FBQUEsSUFBeUIsR0FBQSxFQUFNLElBQS9CO0dBTFgsQ0FBQTs7QUFBQSxnQkFNQSxRQUFBLEdBQVc7QUFBQSxJQUFBLElBQUEsRUFBTyxJQUFQO0FBQUEsSUFBYSxHQUFBLEVBQU0sSUFBbkI7QUFBQSxJQUF5QixHQUFBLEVBQU0sSUFBL0I7R0FOWCxDQUFBOztBQUFBLGdCQVFBLGVBQUEsR0FBa0IsQ0FSbEIsQ0FBQTs7QUFVYSxFQUFBLGFBQUEsR0FBQTtBQUVULCtEQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsUUFBRCxHQUFZLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBMUIsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE9BQUQsR0FBVyxRQUFRLENBQUMsY0FBVCxDQUF3QixTQUF4QixDQURYLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFiLENBQWdCLE1BQU0sQ0FBQyxrQkFBdkIsRUFBMkMsSUFBQyxDQUFBLFVBQTVDLENBSEEsQ0FBQTtBQUtBLFdBQU8sS0FBUCxDQVBTO0VBQUEsQ0FWYjs7QUFBQSxnQkFtQkEsVUFBQSxHQUFhLFNBQUMsT0FBRCxFQUFVLE1BQVYsR0FBQTtBQUVULFFBQUEsc0JBQUE7O01BRm1CLFNBQU87S0FFMUI7QUFBQSxJQUFBLElBQUcsQ0FBQSxNQUFBLElBQVksT0FBQSxLQUFXLEVBQTFCO0FBQWtDLGFBQU8sSUFBUCxDQUFsQztLQUFBO0FBRUE7QUFBQSxTQUFBLG1CQUFBOzhCQUFBO0FBQ0ksTUFBQSxJQUFHLEdBQUEsS0FBTyxPQUFWO0FBQXVCLGVBQU8sV0FBUCxDQUF2QjtPQURKO0FBQUEsS0FGQTtXQUtBLE1BUFM7RUFBQSxDQW5CYixDQUFBOztBQUFBLGdCQTRCQSxVQUFBLEdBQVksU0FBQyxJQUFELEVBQU8sR0FBUCxFQUFZLEdBQVosRUFBaUIsTUFBakIsR0FBQTtBQU9SLElBQUEsSUFBQyxDQUFBLGVBQUQsRUFBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxPQUZiLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxPQUFELEdBQVk7QUFBQSxNQUFBLElBQUEsRUFBTyxJQUFQO0FBQUEsTUFBYSxHQUFBLEVBQU0sR0FBbkI7QUFBQSxNQUF3QixHQUFBLEVBQU0sR0FBOUI7S0FIWixDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsT0FBRCxDQUFTLEdBQUcsQ0FBQyxpQkFBYixFQUFnQyxJQUFDLENBQUEsUUFBakMsRUFBMkMsSUFBQyxDQUFBLE9BQTVDLENBTEEsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLE9BQUQsQ0FBUyxHQUFHLENBQUMscUJBQWIsRUFBb0MsSUFBQyxDQUFBLE9BQXJDLENBTkEsQ0FBQTtBQVFBLElBQUEsSUFBRyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQTNCLENBQUEsQ0FBSDtBQUE0QyxNQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBM0IsQ0FBQSxDQUFBLENBQTVDO0tBUkE7QUFBQSxJQVVBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixHQUFwQixFQUF5QixHQUF6QixDQVZBLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxjQUFELENBQWdCLElBQWhCLENBWEEsQ0FBQTtXQWFBLEtBcEJRO0VBQUEsQ0E1QlosQ0FBQTs7QUFBQSxnQkFrREEsWUFBQSxHQUFjLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxHQUFaLEdBQUE7QUFFVixRQUFBLHlCQUFBO0FBQUEsSUFBQSxPQUFBLEdBQWUsSUFBQSxLQUFRLEVBQVgsR0FBbUIsTUFBbkIsR0FBK0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFVBQVYsQ0FBcUIsSUFBckIsQ0FBM0MsQ0FBQTtBQUFBLElBQ0EsU0FBQSxHQUFZLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWtCLGFBQUEsR0FBYSxPQUEvQixDQUFBLElBQTZDLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLGlCQUFqQixDQUR6RCxDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsU0FBaEIsRUFBMkIsSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQWxCLEVBQXdCLEdBQXhCLEVBQTZCLEdBQTdCLENBQTNCLEVBQThELEtBQTlELENBRlIsQ0FBQTtBQUlBLElBQUEsSUFBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQWhCLEtBQTJCLEtBQTlCO0FBQXlDLE1BQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFoQixHQUF3QixLQUF4QixDQUF6QztLQUpBO1dBTUEsS0FSVTtFQUFBLENBbERkLENBQUE7O0FBQUEsZ0JBNERBLGNBQUEsR0FBZ0IsU0FBQyxJQUFELEdBQUE7QUFFWixRQUFBLE1BQUE7QUFBQSxJQUFBLE1BQUE7QUFBUyxjQUFPLElBQVA7QUFBQSxhQUNBLElBQUMsQ0FBQSxRQUFRLENBQUMsSUFEVjtpQkFDb0IsTUFEcEI7QUFBQSxhQUVBLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FGVjtBQUFBLGFBRWlCLElBQUMsQ0FBQSxRQUFRLENBQUMsVUFGM0I7aUJBRTJDLFFBRjNDO0FBQUEsYUFHQSxJQUFDLENBQUEsUUFBUSxDQUFDLE9BSFY7aUJBR3VCLE9BSHZCO0FBQUE7aUJBSUEsTUFKQTtBQUFBO2lCQUFULENBQUE7QUFBQSxJQU1BLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQ1AsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULEdBQWdCLEVBQUEsR0FBRSxDQUFDLEtBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLFFBQVAsQ0FBRixHQUFrQixvQ0FBbEIsR0FBc0QsTUFBdEQsR0FBNkQsT0FEdEU7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBRUUsQ0FGRixDQU5BLENBQUE7V0FVQSxLQVpZO0VBQUEsQ0E1RGhCLENBQUE7O0FBQUEsZ0JBMEVBLGdCQUFBLEdBQWtCLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxHQUFaLEdBQUE7QUFFZCxRQUFBLFlBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxFQUFQLENBQUE7QUFFQSxJQUFBLElBQUcsSUFBQSxLQUFRLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBbEIsSUFBOEIsR0FBOUIsSUFBc0MsR0FBekM7QUFDSSxNQUFBLE1BQUEsR0FBUyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQXRCLENBQWdDO0FBQUEsUUFBQSxJQUFBLEVBQU0sRUFBQSxHQUFHLEdBQUgsR0FBTyxHQUFQLEdBQVUsR0FBaEI7T0FBaEMsQ0FBVCxDQUFBO0FBRUEsTUFBQSxJQUFHLENBQUEsTUFBSDtBQUNJLFFBQUEsSUFBSSxDQUFDLElBQUwsR0FBWSxRQUFaLENBREo7T0FBQSxNQUFBO0FBR0ksUUFBQSxJQUFJLENBQUMsSUFBTCxHQUFZLE1BQU0sQ0FBQyxHQUFQLENBQVcsYUFBWCxDQUFBLEdBQTRCLE1BQTVCLEdBQXFDLE1BQU0sQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUFyQyxHQUEwRCxHQUF0RSxDQUhKO09BSEo7S0FGQTtXQVVBLEtBWmM7RUFBQSxDQTFFbEIsQ0FBQTs7YUFBQTs7R0FGYyxhQUhsQixDQUFBOztBQUFBLE1BNkZNLENBQUMsT0FBUCxHQUFpQixHQTdGakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLE1BQUE7RUFBQTs7aVNBQUE7O0FBQUE7QUFFSSwyQkFBQSxDQUFBOzs7Ozs7OztHQUFBOztBQUFBLEVBQUEsTUFBQyxDQUFBLGtCQUFELEdBQXNCLG9CQUF0QixDQUFBOztBQUFBLG1CQUVBLFdBQUEsR0FBYyxJQUZkLENBQUE7O0FBQUEsbUJBSUEsTUFBQSxHQUNJO0FBQUEsSUFBQSw2QkFBQSxFQUFnQyxhQUFoQztBQUFBLElBQ0EsVUFBQSxFQUFnQyxZQURoQztHQUxKLENBQUE7O0FBQUEsbUJBUUEsSUFBQSxHQUFTLElBUlQsQ0FBQTs7QUFBQSxtQkFTQSxHQUFBLEdBQVMsSUFUVCxDQUFBOztBQUFBLG1CQVVBLEdBQUEsR0FBUyxJQVZULENBQUE7O0FBQUEsbUJBV0EsTUFBQSxHQUFTLElBWFQsQ0FBQTs7QUFBQSxtQkFhQSxLQUFBLEdBQVEsU0FBQSxHQUFBO0FBRUosSUFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQWpCLENBQ0k7QUFBQSxNQUFBLFNBQUEsRUFBWSxJQUFaO0FBQUEsTUFDQSxJQUFBLEVBQVksR0FEWjtLQURKLENBQUEsQ0FBQTtXQUlBLEtBTkk7RUFBQSxDQWJSLENBQUE7O0FBQUEsbUJBcUJBLFdBQUEsR0FBYyxTQUFFLElBQUYsRUFBZ0IsR0FBaEIsRUFBNkIsR0FBN0IsR0FBQTtBQUVWLElBRlcsSUFBQyxDQUFBLHNCQUFBLE9BQU8sSUFFbkIsQ0FBQTtBQUFBLElBRnlCLElBQUMsQ0FBQSxvQkFBQSxNQUFNLElBRWhDLENBQUE7QUFBQSxJQUZzQyxJQUFDLENBQUEsb0JBQUEsTUFBTSxJQUU3QyxDQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFhLGdDQUFBLEdBQWdDLElBQUMsQ0FBQSxJQUFqQyxHQUFzQyxXQUF0QyxHQUFpRCxJQUFDLENBQUEsR0FBbEQsR0FBc0QsV0FBdEQsR0FBaUUsSUFBQyxDQUFBLEdBQWxFLEdBQXNFLEtBQW5GLENBQUEsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsV0FBSjtBQUFxQixNQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsS0FBZixDQUFyQjtLQUZBO0FBSUEsSUFBQSxJQUFHLENBQUEsSUFBRSxDQUFBLElBQUw7QUFBZSxNQUFBLElBQUMsQ0FBQSxJQUFELEdBQVEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUEzQixDQUFmO0tBSkE7QUFBQSxJQU1BLElBQUMsQ0FBQSxPQUFELENBQVMsTUFBTSxDQUFDLGtCQUFoQixFQUFvQyxJQUFDLENBQUEsSUFBckMsRUFBMkMsSUFBQyxDQUFBLEdBQTVDLEVBQWlELElBQUMsQ0FBQSxHQUFsRCxFQUF1RCxJQUFDLENBQUEsTUFBeEQsQ0FOQSxDQUFBO1dBUUEsS0FWVTtFQUFBLENBckJkLENBQUE7O0FBQUEsbUJBaUNBLFVBQUEsR0FBYSxTQUFDLEtBQUQsRUFBYSxPQUFiLEVBQTZCLE9BQTdCLEVBQStDLE1BQS9DLEdBQUE7O01BQUMsUUFBUTtLQUVsQjs7TUFGc0IsVUFBVTtLQUVoQzs7TUFGc0MsVUFBVTtLQUVoRDtBQUFBLElBRnVELElBQUMsQ0FBQSxTQUFBLE1BRXhELENBQUE7QUFBQSxJQUFBLElBQUcsS0FBSyxDQUFDLE1BQU4sQ0FBYSxDQUFiLENBQUEsS0FBcUIsR0FBeEI7QUFDSSxNQUFBLEtBQUEsR0FBUyxHQUFBLEdBQUcsS0FBWixDQURKO0tBQUE7QUFFQSxJQUFBLElBQUcsS0FBSyxDQUFDLE1BQU4sQ0FBYyxLQUFLLENBQUMsTUFBTixHQUFhLENBQTNCLENBQUEsS0FBb0MsR0FBdkM7QUFDSSxNQUFBLEtBQUEsR0FBUSxFQUFBLEdBQUcsS0FBSCxHQUFTLEdBQWpCLENBREo7S0FGQTtBQUtBLElBQUEsSUFBRyxDQUFBLE9BQUg7QUFDSSxNQUFBLElBQUMsQ0FBQSxPQUFELENBQVMsTUFBTSxDQUFDLGtCQUFoQixFQUFvQyxLQUFwQyxFQUEyQyxJQUEzQyxFQUFpRCxJQUFDLENBQUEsTUFBbEQsQ0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUZKO0tBTEE7QUFBQSxJQVNBLElBQUMsQ0FBQSxRQUFELENBQVUsS0FBVixFQUFpQjtBQUFBLE1BQUEsT0FBQSxFQUFTLElBQVQ7QUFBQSxNQUFlLE9BQUEsRUFBUyxPQUF4QjtLQUFqQixDQVRBLENBQUE7V0FXQSxLQWJTO0VBQUEsQ0FqQ2IsQ0FBQTs7QUFBQSxtQkFnREEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVELFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGQztFQUFBLENBaERMLENBQUE7O2dCQUFBOztHQUZpQixRQUFRLENBQUMsT0FBOUIsQ0FBQTs7QUFBQSxNQXNETSxDQUFDLE9BQVAsR0FBaUIsTUF0RGpCLENBQUE7Ozs7O0FDQUE7QUFBQTs7R0FBQTtBQUFBLElBQUEsU0FBQTtFQUFBLGtGQUFBOztBQUFBO0FBS0ksc0JBQUEsSUFBQSxHQUFVLElBQVYsQ0FBQTs7QUFBQSxzQkFDQSxPQUFBLEdBQVUsS0FEVixDQUFBOztBQUFBLHNCQUdBLFFBQUEsR0FBa0IsQ0FIbEIsQ0FBQTs7QUFBQSxzQkFJQSxlQUFBLEdBQWtCLENBSmxCLENBQUE7O0FBTWMsRUFBQSxtQkFBQyxJQUFELEVBQVEsUUFBUixHQUFBO0FBRVYsSUFGaUIsSUFBQyxDQUFBLFdBQUEsUUFFbEIsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsSUFBQSxDQUFDLENBQUMsT0FBRixDQUFVLElBQVYsRUFBZ0IsSUFBQyxDQUFBLGNBQWpCLENBQUEsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUpVO0VBQUEsQ0FOZDs7QUFBQSxzQkFZQSxjQUFBLEdBQWlCLFNBQUMsSUFBRCxHQUFBO0FBRWIsSUFBQSxJQUFDLENBQUEsSUFBRCxHQUFXLElBQVgsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQURYLENBQUE7O01BRUEsSUFBQyxDQUFBO0tBRkQ7V0FJQSxLQU5hO0VBQUEsQ0FaakIsQ0FBQTs7QUFvQkE7QUFBQTs7S0FwQkE7O0FBQUEsc0JBdUJBLEtBQUEsR0FBUSxTQUFDLEtBQUQsR0FBQTtBQUVKLFFBQUEsc0JBQUE7QUFBQSxJQUFBLElBQVUsQ0FBQSxJQUFFLENBQUEsT0FBWjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBRUEsSUFBQSxJQUFHLEtBQUg7QUFFSSxNQUFBLENBQUEsR0FBSSxJQUFDLENBQUEsSUFBSyxDQUFBLEtBQUEsQ0FBVixDQUFBO0FBRUEsTUFBQSxJQUFHLENBQUg7QUFFSSxRQUFBLElBQUEsR0FBTyxDQUFDLE1BQUQsRUFBUyxPQUFULENBQVAsQ0FBQTtBQUNBLGFBQUEsd0NBQUE7c0JBQUE7QUFBQSxVQUFFLElBQUksQ0FBQyxJQUFMLENBQVUsR0FBVixDQUFGLENBQUE7QUFBQSxTQURBO0FBSUEsUUFBQSxJQUFHLE1BQU0sQ0FBQyxFQUFWO0FBQ0ksVUFBQSxFQUFFLENBQUMsS0FBSCxDQUFTLElBQVQsRUFBZSxJQUFmLENBQUEsQ0FESjtTQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsUUFBRCxJQUFhLElBQUMsQ0FBQSxlQUFqQjtBQUNELFVBQUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxLQUFYLENBREM7U0FBQSxNQUFBO0FBR0QsVUFBQSxVQUFBLENBQVcsQ0FBQSxTQUFBLEtBQUEsR0FBQTttQkFBQSxTQUFBLEdBQUE7QUFDUCxjQUFBLEtBQUMsQ0FBQSxLQUFELENBQU8sS0FBUCxDQUFBLENBQUE7cUJBQ0EsS0FBQyxDQUFBLFFBQUQsR0FGTztZQUFBLEVBQUE7VUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFHRSxJQUhGLENBQUEsQ0FIQztTQVJUO09BSko7S0FGQTtXQXNCQSxLQXhCSTtFQUFBLENBdkJSLENBQUE7O21CQUFBOztJQUxKLENBQUE7O0FBQUEsTUFzRE0sQ0FBQyxPQUFQLEdBQWlCLFNBdERqQixDQUFBOzs7OztBQ0FBLElBQUEsK0NBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxzQkFBUixDQUFmLENBQUE7O0FBQUEsUUFDQSxHQUFlLE9BQUEsQ0FBUSxtQkFBUixDQURmLENBQUE7O0FBQUEsVUFFQSxHQUFlLE9BQUEsQ0FBUSxxQkFBUixDQUZmLENBQUE7O0FBQUE7QUFNQyxnQ0FBQSxDQUFBOztBQUFBLHdCQUFBLFFBQUEsR0FBWSxJQUFaLENBQUE7O0FBQUEsd0JBR0EsT0FBQSxHQUFlLEtBSGYsQ0FBQTs7QUFBQSx3QkFJQSxZQUFBLEdBQWUsSUFKZixDQUFBOztBQUFBLHdCQUtBLFdBQUEsR0FBZSxJQUxmLENBQUE7O0FBT2MsRUFBQSxxQkFBQSxHQUFBO0FBRWIsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSx5Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsUUFBRCxHQUFhLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUEzQixDQUFBO0FBQUEsSUFFQSwyQ0FBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOYTtFQUFBLENBUGQ7O0FBQUEsd0JBZUEsS0FBQSxHQUFRLFNBQUMsT0FBRCxFQUFVLEVBQVYsR0FBQTtBQUlQLFFBQUEsUUFBQTs7TUFKaUIsS0FBRztLQUlwQjtBQUFBLElBQUEsSUFBVSxJQUFDLENBQUEsT0FBWDtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBRkEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUhYLENBQUE7QUFBQSxJQUtBLFFBQUEsR0FBVyxDQUFDLENBQUMsUUFBRixDQUFBLENBTFgsQ0FBQTtBQU9BLFlBQU8sT0FBUDtBQUFBLFdBQ00sUUFETjtBQUVFLFFBQUEsVUFBVSxDQUFDLEtBQVgsQ0FBaUIsUUFBakIsQ0FBQSxDQUZGO0FBQ007QUFETixXQUdNLFVBSE47QUFJRSxRQUFBLFFBQVEsQ0FBQyxLQUFULENBQWUsUUFBZixDQUFBLENBSkY7QUFBQSxLQVBBO0FBQUEsSUFhQSxRQUFRLENBQUMsSUFBVCxDQUFjLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLEdBQUQsR0FBQTtlQUFTLEtBQUMsQ0FBQSxXQUFELENBQWEsT0FBYixFQUFzQixHQUF0QixFQUFUO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBZCxDQWJBLENBQUE7QUFBQSxJQWNBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsR0FBRCxHQUFBO2VBQVMsS0FBQyxDQUFBLFFBQUQsQ0FBVSxPQUFWLEVBQW1CLEdBQW5CLEVBQVQ7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFkLENBZEEsQ0FBQTtBQUFBLElBZUEsUUFBUSxDQUFDLE1BQVQsQ0FBZ0IsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUEsR0FBQTtlQUFNLEtBQUMsQ0FBQSxZQUFELENBQWMsRUFBZCxFQUFOO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBaEIsQ0FmQSxDQUFBO0FBaUJBO0FBQUE7OztPQWpCQTtBQUFBLElBcUJBLElBQUMsQ0FBQSxZQUFELEdBQWdCLFVBQUEsQ0FBVyxJQUFDLENBQUEsWUFBWixFQUEwQixJQUFDLENBQUEsV0FBM0IsQ0FyQmhCLENBQUE7V0F1QkEsU0EzQk87RUFBQSxDQWZSLENBQUE7O0FBQUEsd0JBNENBLFdBQUEsR0FBYyxTQUFDLE9BQUQsRUFBVSxJQUFWLEdBQUE7V0FJYixLQUphO0VBQUEsQ0E1Q2QsQ0FBQTs7QUFBQSx3QkFrREEsUUFBQSxHQUFXLFNBQUMsT0FBRCxFQUFVLElBQVYsR0FBQTtXQUlWLEtBSlU7RUFBQSxDQWxEWCxDQUFBOztBQUFBLHdCQXdEQSxZQUFBLEdBQWUsU0FBQyxFQUFELEdBQUE7O01BQUMsS0FBRztLQUVsQjtBQUFBLElBQUEsSUFBQSxDQUFBLElBQWUsQ0FBQSxPQUFmO0FBQUEsWUFBQSxDQUFBO0tBQUE7QUFBQSxJQUVBLFlBQUEsQ0FBYSxJQUFDLENBQUEsWUFBZCxDQUZBLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FKQSxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsT0FBRCxHQUFXLEtBTFgsQ0FBQTs7TUFPQTtLQVBBO1dBU0EsS0FYYztFQUFBLENBeERmLENBQUE7O0FBcUVBO0FBQUE7O0tBckVBOztBQUFBLHdCQXdFQSxVQUFBLEdBQWEsU0FBQSxHQUFBO1dBSVosS0FKWTtFQUFBLENBeEViLENBQUE7O0FBQUEsd0JBOEVBLFVBQUEsR0FBYSxTQUFBLEdBQUE7V0FJWixLQUpZO0VBQUEsQ0E5RWIsQ0FBQTs7cUJBQUE7O0dBRnlCLGFBSjFCLENBQUE7O0FBQUEsTUEwRk0sQ0FBQyxPQUFQLEdBQWlCLFdBMUZqQixDQUFBOzs7OztBQ0FBLElBQUEsNEJBQUE7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxZQUFSLENBQVQsQ0FBQTs7QUFBQTtvQ0FJQzs7QUFBQSxFQUFBLG9CQUFDLENBQUEsTUFBRCxHQUNDO0FBQUEsSUFBQSxlQUFBLEVBQWtCLENBQWxCO0FBQUEsSUFDQSxlQUFBLEVBQWtCLENBRGxCO0FBQUEsSUFHQSxpQkFBQSxFQUFvQixFQUhwQjtBQUFBLElBSUEsaUJBQUEsRUFBb0IsRUFKcEI7QUFBQSxJQU1BLGtCQUFBLEVBQXFCLEVBTnJCO0FBQUEsSUFPQSxrQkFBQSxFQUFxQixFQVByQjtBQUFBLElBU0EsS0FBQSxFQUFRLHVFQUF1RSxDQUFDLEtBQXhFLENBQThFLEVBQTlFLENBQWlGLENBQUMsR0FBbEYsQ0FBc0YsU0FBQyxJQUFELEdBQUE7QUFBVSxhQUFPLE1BQUEsQ0FBTyxJQUFQLENBQVAsQ0FBVjtJQUFBLENBQXRGLENBVFI7QUFBQSxJQVdBLGFBQUEsRUFBZ0Isb0dBWGhCO0dBREQsQ0FBQTs7QUFBQSxFQWNBLG9CQUFDLENBQUEsVUFBRCxHQUFjLEVBZGQsQ0FBQTs7QUFBQSxFQWdCQSxvQkFBQyxDQUFBLGlCQUFELEdBQXFCLFNBQUMsR0FBRCxHQUFBO0FBRXBCLFFBQUEsUUFBQTtBQUFBLElBQUEsRUFBQSxHQUFLLEdBQUcsQ0FBQyxJQUFKLENBQVMsa0JBQVQsQ0FBTCxDQUFBO0FBRUEsSUFBQSxJQUFHLEVBQUEsSUFBTyxvQkFBQyxDQUFBLFVBQVksQ0FBQSxFQUFBLENBQXZCO0FBQ0MsTUFBQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxVQUFZLENBQUEsRUFBQSxDQUFwQixDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsb0JBQUMsQ0FBQSxVQUFELENBQVksR0FBWixDQUFBLENBQUE7QUFBQSxNQUNBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGVBQUQsQ0FBaUIsR0FBakIsQ0FEUCxDQUhEO0tBRkE7V0FRQSxLQVZvQjtFQUFBLENBaEJyQixDQUFBOztBQUFBLEVBNEJBLG9CQUFDLENBQUEsZUFBRCxHQUFtQixTQUFDLEdBQUQsR0FBQTtBQUVsQixRQUFBLFNBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxFQUFSLENBQUE7QUFBQSxJQUVBLEdBQUcsQ0FBQyxJQUFKLENBQVMsc0JBQVQsQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFzQyxTQUFDLENBQUQsRUFBSSxFQUFKLEdBQUE7QUFDckMsVUFBQSxPQUFBO0FBQUEsTUFBQSxPQUFBLEdBQVUsQ0FBQSxDQUFFLEVBQUYsQ0FBVixDQUFBO2FBQ0EsS0FBSyxDQUFDLElBQU4sQ0FDQztBQUFBLFFBQUEsR0FBQSxFQUFhLE9BQWI7QUFBQSxRQUNBLFNBQUEsRUFBYSxPQUFPLENBQUMsSUFBUixDQUFhLG9CQUFiLENBRGI7T0FERCxFQUZxQztJQUFBLENBQXRDLENBRkEsQ0FBQTtBQUFBLElBUUEsRUFBQSxHQUFLLENBQUMsQ0FBQyxRQUFGLENBQUEsQ0FSTCxDQUFBO0FBQUEsSUFTQSxHQUFHLENBQUMsSUFBSixDQUFTLGtCQUFULEVBQTZCLEVBQTdCLENBVEEsQ0FBQTtBQUFBLElBV0Esb0JBQUMsQ0FBQSxVQUFZLENBQUEsRUFBQSxDQUFiLEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFBVSxDQUFDLENBQUMsS0FBRixDQUFRLEtBQVIsRUFBZSxXQUFmLENBQTJCLENBQUMsSUFBNUIsQ0FBaUMsRUFBakMsQ0FBVjtBQUFBLE1BQ0EsR0FBQSxFQUFVLEdBRFY7QUFBQSxNQUVBLEtBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxPQUFBLEVBQVUsSUFIVjtLQVpELENBQUE7V0FpQkEsb0JBQUMsQ0FBQSxVQUFZLENBQUEsRUFBQSxFQW5CSztFQUFBLENBNUJuQixDQUFBOztBQUFBLEVBaURBLG9CQUFDLENBQUEsVUFBRCxHQUFjLFNBQUMsR0FBRCxHQUFBO0FBRWIsUUFBQSxrQ0FBQTtBQUFBLElBQUEsS0FBQSxHQUFRLEdBQUcsQ0FBQyxJQUFKLENBQUEsQ0FBVSxDQUFDLEtBQVgsQ0FBaUIsRUFBakIsQ0FBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsR0FBRyxDQUFDLElBQUosQ0FBUyw2QkFBVCxDQUFBLElBQTJDLEVBRG5ELENBQUE7QUFBQSxJQUVBLElBQUEsR0FBTyxFQUZQLENBQUE7QUFHQSxTQUFBLDRDQUFBO3VCQUFBO0FBQ0MsTUFBQSxJQUFJLENBQUMsSUFBTCxDQUFVLG9CQUFDLENBQUEsZUFBRCxDQUFpQixvQkFBQyxDQUFBLE1BQU0sQ0FBQyxhQUF6QixFQUF3QztBQUFBLFFBQUEsSUFBQSxFQUFPLElBQVA7QUFBQSxRQUFhLEtBQUEsRUFBTyxLQUFwQjtPQUF4QyxDQUFWLENBQUEsQ0FERDtBQUFBLEtBSEE7QUFBQSxJQU1BLEdBQUcsQ0FBQyxJQUFKLENBQVMsSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFWLENBQVQsQ0FOQSxDQUFBO1dBUUEsS0FWYTtFQUFBLENBakRkLENBQUE7O0FBQUEsRUE2REEsb0JBQUMsQ0FBQSxZQUFELEdBQWdCLFNBQUMsSUFBRCxHQUFBO1dBRWYsS0FGZTtFQUFBLENBN0RoQixDQUFBOztBQUFBLEVBa0VBLG9CQUFDLENBQUEsWUFBRCxHQUFnQixTQUFDLElBQUQsRUFBTyxNQUFQLEVBQWUsU0FBZixHQUFBO0FBRWYsUUFBQSxtQ0FBQTs7TUFGOEIsWUFBVTtLQUV4QztBQUFBO0FBQUEsU0FBQSxtREFBQTtxQkFBQTtBQUVDLE1BQUEsVUFBQTtBQUFhLGdCQUFPLElBQVA7QUFBQSxlQUNQLE1BQUEsS0FBVSxPQURIO21CQUNnQixJQUFJLENBQUMsVUFEckI7QUFBQSxlQUVQLE1BQUEsS0FBVSxPQUZIO21CQUVnQixJQUFDLENBQUEsY0FBRCxDQUFBLEVBRmhCO0FBQUEsZUFHUCxNQUFBLEtBQVUsT0FISDttQkFHZ0IsR0FIaEI7QUFBQTttQkFJUCxNQUFNLENBQUMsTUFBUCxDQUFjLENBQWQsQ0FBQSxJQUFvQixHQUpiO0FBQUE7bUNBQWIsQ0FBQTtBQU1BLE1BQUEsSUFBRyxVQUFBLEtBQWMsR0FBakI7QUFBMEIsUUFBQSxVQUFBLEdBQWEsUUFBYixDQUExQjtPQU5BO0FBQUEsTUFRQSxJQUFJLENBQUMsVUFBTCxHQUFrQixvQkFBQyxDQUFBLG9CQUFELENBQUEsQ0FSbEIsQ0FBQTtBQUFBLE1BU0EsSUFBSSxDQUFDLFVBQUwsR0FBa0IsVUFUbEIsQ0FBQTtBQUFBLE1BVUEsSUFBSSxDQUFDLFNBQUwsR0FBa0IsU0FWbEIsQ0FGRDtBQUFBLEtBQUE7V0FjQSxLQWhCZTtFQUFBLENBbEVoQixDQUFBOztBQUFBLEVBb0ZBLG9CQUFDLENBQUEsb0JBQUQsR0FBd0IsU0FBQSxHQUFBO0FBRXZCLFFBQUEsdUJBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxFQUFSLENBQUE7QUFBQSxJQUVBLFNBQUEsR0FBWSxDQUFDLENBQUMsTUFBRixDQUFTLG9CQUFDLENBQUEsTUFBTSxDQUFDLGVBQWpCLEVBQWtDLG9CQUFDLENBQUEsTUFBTSxDQUFDLGVBQTFDLENBRlosQ0FBQTtBQUlBLFNBQVMsOEZBQVQsR0FBQTtBQUNDLE1BQUEsS0FBSyxDQUFDLElBQU4sQ0FDQztBQUFBLFFBQUEsSUFBQSxFQUFXLG9CQUFDLENBQUEsY0FBRCxDQUFBLENBQVg7QUFBQSxRQUNBLE9BQUEsRUFBVyxDQUFDLENBQUMsTUFBRixDQUFTLG9CQUFDLENBQUEsTUFBTSxDQUFDLGlCQUFqQixFQUFvQyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxpQkFBNUMsQ0FEWDtBQUFBLFFBRUEsUUFBQSxFQUFXLENBQUMsQ0FBQyxNQUFGLENBQVMsb0JBQUMsQ0FBQSxNQUFNLENBQUMsa0JBQWpCLEVBQXFDLG9CQUFDLENBQUEsTUFBTSxDQUFDLGtCQUE3QyxDQUZYO09BREQsQ0FBQSxDQUREO0FBQUEsS0FKQTtXQVVBLE1BWnVCO0VBQUEsQ0FwRnhCLENBQUE7O0FBQUEsRUFrR0Esb0JBQUMsQ0FBQSxjQUFELEdBQWtCLFNBQUEsR0FBQTtBQUVqQixRQUFBLElBQUE7QUFBQSxJQUFBLElBQUEsR0FBTyxvQkFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFPLENBQUEsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxDQUFULEVBQVksb0JBQUMsQ0FBQSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQWQsR0FBcUIsQ0FBakMsQ0FBQSxDQUF0QixDQUFBO1dBRUEsS0FKaUI7RUFBQSxDQWxHbEIsQ0FBQTs7QUFBQSxFQXdHQSxvQkFBQyxDQUFBLHVCQUFELEdBQTJCLFNBQUMsS0FBRCxHQUFBO0FBRTFCLFFBQUEsZ0ZBQUE7QUFBQSxJQUFBLFdBQUEsR0FBYyxDQUFkLENBQUE7QUFBQSxJQUNBLGNBQUEsR0FBaUIsQ0FEakIsQ0FBQTtBQUdBLFNBQUEsb0RBQUE7c0JBQUE7QUFFQyxNQUFBLElBQUEsR0FBTyxDQUFQLENBQUE7QUFDQTtBQUFBLFdBQUEsNkNBQUE7NkJBQUE7QUFBQSxRQUFDLElBQUEsSUFBUSxTQUFTLENBQUMsT0FBVixHQUFvQixTQUFTLENBQUMsUUFBdkMsQ0FBQTtBQUFBLE9BREE7QUFFQSxNQUFBLElBQUcsSUFBQSxHQUFPLFdBQVY7QUFDQyxRQUFBLFdBQUEsR0FBYyxJQUFkLENBQUE7QUFBQSxRQUNBLGNBQUEsR0FBaUIsQ0FEakIsQ0FERDtPQUpEO0FBQUEsS0FIQTtXQVdBLGVBYjBCO0VBQUEsQ0F4RzNCLENBQUE7O0FBQUEsRUF1SEEsb0JBQUMsQ0FBQSxhQUFELEdBQWlCLFNBQUMsSUFBRCxFQUFPLFVBQVAsRUFBbUIsRUFBbkIsR0FBQTtBQUVoQixRQUFBLHlEQUFBO0FBQUEsSUFBQSxVQUFBLEdBQWEsQ0FBYixDQUFBO0FBRUEsSUFBQSxJQUFHLFVBQUg7QUFDQyxNQUFBLG9CQUFDLENBQUEsWUFBRCxDQUFjLElBQUksQ0FBQyxLQUFuQixFQUEwQixVQUExQixFQUFzQyxJQUF0QyxFQUE0QyxFQUE1QyxDQUFBLENBREQ7S0FBQSxNQUFBO0FBR0MsTUFBQSxjQUFBLEdBQWlCLG9CQUFDLENBQUEsdUJBQUQsQ0FBeUIsSUFBSSxDQUFDLEtBQTlCLENBQWpCLENBQUE7QUFDQTtBQUFBLFdBQUEsbURBQUE7dUJBQUE7QUFDQyxRQUFBLElBQUEsR0FBTyxDQUFFLElBQUksQ0FBQyxLQUFQLEVBQWMsQ0FBZCxFQUFpQixLQUFqQixDQUFQLENBQUE7QUFDQSxRQUFBLElBQUcsQ0FBQSxLQUFLLGNBQVI7QUFBNEIsVUFBQSxJQUFJLENBQUMsSUFBTCxDQUFVLEVBQVYsQ0FBQSxDQUE1QjtTQURBO0FBQUEsUUFFQSxvQkFBQyxDQUFBLFlBQVksQ0FBQyxLQUFkLENBQW9CLG9CQUFwQixFQUF1QixJQUF2QixDQUZBLENBREQ7QUFBQSxPQUpEO0tBRkE7V0FXQSxLQWJnQjtFQUFBLENBdkhqQixDQUFBOztBQUFBLEVBc0lBLG9CQUFDLENBQUEsWUFBRCxHQUFnQixTQUFDLEtBQUQsRUFBUSxHQUFSLEVBQWEsT0FBYixFQUFzQixFQUF0QixHQUFBO0FBRWYsUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sS0FBTSxDQUFBLEdBQUEsQ0FBYixDQUFBO0FBRUEsSUFBQSxJQUFHLE9BQUg7QUFFQyxNQUFBLG9CQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsRUFBMEIsU0FBQSxHQUFBO0FBRXpCLFFBQUEsSUFBRyxHQUFBLEtBQU8sS0FBSyxDQUFDLE1BQU4sR0FBYSxDQUF2QjtpQkFDQyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEVBQW5CLEVBREQ7U0FBQSxNQUFBO2lCQUdDLG9CQUFDLENBQUEsWUFBRCxDQUFjLEtBQWQsRUFBcUIsR0FBQSxHQUFJLENBQXpCLEVBQTRCLE9BQTVCLEVBQXFDLEVBQXJDLEVBSEQ7U0FGeUI7TUFBQSxDQUExQixDQUFBLENBRkQ7S0FBQSxNQUFBO0FBV0MsTUFBQSxJQUFHLE1BQUEsQ0FBQSxFQUFBLEtBQWEsVUFBaEI7QUFDQyxRQUFBLG9CQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsRUFBMEIsU0FBQSxHQUFBO2lCQUFHLG9CQUFDLENBQUEsaUJBQUQsQ0FBbUIsRUFBbkIsRUFBSDtRQUFBLENBQTFCLENBQUEsQ0FERDtPQUFBLE1BQUE7QUFHQyxRQUFBLG9CQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBcEIsQ0FBQSxDQUhEO09BWEQ7S0FGQTtXQWtCQSxLQXBCZTtFQUFBLENBdEloQixDQUFBOztBQUFBLEVBNEpBLG9CQUFDLENBQUEsa0JBQUQsR0FBc0IsU0FBQyxJQUFELEVBQU8sRUFBUCxHQUFBO0FBRXJCLFFBQUEsU0FBQTtBQUFBLElBQUEsSUFBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQW5CO0FBRUMsTUFBQSxTQUFBLEdBQVksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFoQixDQUFBLENBQVosQ0FBQTtBQUFBLE1BRUEsVUFBQSxDQUFXLFNBQUEsR0FBQTtBQUNWLFFBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFULENBQWMsU0FBUyxDQUFDLElBQXhCLENBQUEsQ0FBQTtlQUVBLFVBQUEsQ0FBVyxTQUFBLEdBQUE7aUJBQ1Ysb0JBQUMsQ0FBQSxrQkFBRCxDQUFvQixJQUFwQixFQUEwQixFQUExQixFQURVO1FBQUEsQ0FBWCxFQUVFLFNBQVMsQ0FBQyxRQUZaLEVBSFU7TUFBQSxDQUFYLEVBT0UsU0FBUyxDQUFDLE9BUFosQ0FGQSxDQUZEO0tBQUEsTUFBQTtBQWVDLE1BQUEsSUFBSSxDQUFDLEdBQ0osQ0FBQyxJQURGLENBQ08sMEJBRFAsRUFDbUMsSUFBSSxDQUFDLFNBRHhDLENBRUMsQ0FBQyxJQUZGLENBRU8sSUFBSSxDQUFDLFVBRlosQ0FBQSxDQUFBOztRQUlBO09BbkJEO0tBQUE7V0FxQkEsS0F2QnFCO0VBQUEsQ0E1SnRCLENBQUE7O0FBQUEsRUFxTEEsb0JBQUMsQ0FBQSxpQkFBRCxHQUFxQixTQUFDLEVBQUQsR0FBQTs7TUFFcEI7S0FBQTtXQUVBLEtBSm9CO0VBQUEsQ0FyTHJCLENBQUE7O0FBQUEsRUEyTEEsb0JBQUMsQ0FBQSxlQUFELEdBQW1CLFNBQUMsR0FBRCxFQUFNLElBQU4sR0FBQTtBQUVsQixXQUFPLEdBQUcsQ0FBQyxPQUFKLENBQVksaUJBQVosRUFBK0IsU0FBQyxDQUFELEVBQUksQ0FBSixHQUFBO0FBQ3JDLFVBQUEsQ0FBQTtBQUFBLE1BQUEsQ0FBQSxHQUFJLElBQUssQ0FBQSxDQUFBLENBQVQsQ0FBQTtBQUNDLE1BQUEsSUFBRyxNQUFBLENBQUEsQ0FBQSxLQUFZLFFBQVosSUFBd0IsTUFBQSxDQUFBLENBQUEsS0FBWSxRQUF2QztlQUFxRCxFQUFyRDtPQUFBLE1BQUE7ZUFBNEQsRUFBNUQ7T0FGb0M7SUFBQSxDQUEvQixDQUFQLENBRmtCO0VBQUEsQ0EzTG5CLENBQUE7O0FBQUEsRUFpTUEsb0JBQUMsQ0FBQSxFQUFELEdBQU0sU0FBQyxVQUFELEVBQWEsR0FBYixFQUFrQixTQUFsQixFQUE2QixVQUE3QixFQUErQyxFQUEvQyxHQUFBO0FBRUwsUUFBQSxvQkFBQTs7TUFGa0MsYUFBVztLQUU3Qzs7TUFGb0QsS0FBRztLQUV2RDtBQUFBLElBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixDQUFVLEdBQVYsQ0FBSDtBQUNDLFdBQUEsMENBQUE7dUJBQUE7QUFBQSxRQUFDLG9CQUFDLENBQUEsRUFBRCxDQUFJLFVBQUosRUFBZ0IsSUFBaEIsRUFBc0IsU0FBdEIsRUFBaUMsRUFBakMsQ0FBRCxDQUFBO0FBQUEsT0FBQTtBQUNBLFlBQUEsQ0FGRDtLQUFBO0FBQUEsSUFJQSxJQUFBLEdBQU8sb0JBQUMsQ0FBQSxpQkFBRCxDQUFtQixHQUFuQixDQUpQLENBQUE7QUFBQSxJQUtBLElBQUksQ0FBQyxPQUFMLEdBQWUsSUFMZixDQUFBO0FBQUEsSUFPQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLFVBQXBCLEVBQWdDLFNBQWhDLENBUEEsQ0FBQTtBQUFBLElBUUEsb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVJBLENBQUE7V0FVQSxLQVpLO0VBQUEsQ0FqTU4sQ0FBQTs7QUFBQSxFQStNQSxvQkFBQyxDQUFBLElBQUEsQ0FBRCxHQUFNLFNBQUMsR0FBRCxFQUFNLFNBQU4sRUFBaUIsVUFBakIsRUFBbUMsRUFBbkMsR0FBQTtBQUVMLFFBQUEsb0JBQUE7O01BRnNCLGFBQVc7S0FFakM7O01BRndDLEtBQUc7S0FFM0M7QUFBQSxJQUFBLElBQUcsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxHQUFWLENBQUg7QUFDQyxXQUFBLDBDQUFBO3VCQUFBO0FBQUEsUUFBQyxvQkFBQyxDQUFBLElBQUEsQ0FBRCxDQUFJLElBQUosRUFBVSxTQUFWLEVBQXFCLEVBQXJCLENBQUQsQ0FBQTtBQUFBLE9BQUE7QUFDQSxZQUFBLENBRkQ7S0FBQTtBQUFBLElBSUEsSUFBQSxHQUFPLG9CQUFDLENBQUEsaUJBQUQsQ0FBbUIsR0FBbkIsQ0FKUCxDQUFBO0FBQUEsSUFLQSxJQUFJLENBQUMsT0FBTCxHQUFlLElBTGYsQ0FBQTtBQUFBLElBT0Esb0JBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQUFvQixPQUFwQixFQUE2QixTQUE3QixDQVBBLENBQUE7QUFBQSxJQVFBLG9CQUFDLENBQUEsYUFBRCxDQUFlLElBQWYsRUFBcUIsVUFBckIsRUFBaUMsRUFBakMsQ0FSQSxDQUFBO1dBVUEsS0FaSztFQUFBLENBL01OLENBQUE7O0FBQUEsRUE2TkEsb0JBQUMsQ0FBQSxHQUFELEdBQU8sU0FBQyxHQUFELEVBQU0sU0FBTixFQUFpQixVQUFqQixFQUFtQyxFQUFuQyxHQUFBO0FBRU4sUUFBQSxvQkFBQTs7TUFGdUIsYUFBVztLQUVsQzs7TUFGeUMsS0FBRztLQUU1QztBQUFBLElBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixDQUFVLEdBQVYsQ0FBSDtBQUNDLFdBQUEsMENBQUE7dUJBQUE7QUFBQSxRQUFDLG9CQUFDLENBQUEsR0FBRCxDQUFLLElBQUwsRUFBVyxTQUFYLEVBQXNCLEVBQXRCLENBQUQsQ0FBQTtBQUFBLE9BQUE7QUFDQSxZQUFBLENBRkQ7S0FBQTtBQUFBLElBSUEsSUFBQSxHQUFPLG9CQUFDLENBQUEsaUJBQUQsQ0FBbUIsR0FBbkIsQ0FKUCxDQUFBO0FBS0EsSUFBQSxJQUFVLENBQUEsSUFBSyxDQUFDLE9BQWhCO0FBQUEsWUFBQSxDQUFBO0tBTEE7QUFBQSxJQU9BLElBQUksQ0FBQyxPQUFMLEdBQWUsS0FQZixDQUFBO0FBQUEsSUFTQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLEVBQTZCLFNBQTdCLENBVEEsQ0FBQTtBQUFBLElBVUEsb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVZBLENBQUE7V0FZQSxLQWRNO0VBQUEsQ0E3TlAsQ0FBQTs7QUFBQSxFQTZPQSxvQkFBQyxDQUFBLFFBQUQsR0FBWSxTQUFDLEdBQUQsRUFBTSxTQUFOLEVBQWlCLFVBQWpCLEVBQW1DLEVBQW5DLEdBQUE7QUFFWCxRQUFBLG9CQUFBOztNQUY0QixhQUFXO0tBRXZDOztNQUY4QyxLQUFHO0tBRWpEO0FBQUEsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLENBQVUsR0FBVixDQUFIO0FBQ0MsV0FBQSwwQ0FBQTt1QkFBQTtBQUFBLFFBQUMsb0JBQUMsQ0FBQSxRQUFELENBQVUsSUFBVixFQUFnQixTQUFoQixFQUEyQixFQUEzQixDQUFELENBQUE7QUFBQSxPQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEdBQW5CLENBSlAsQ0FBQTtBQU1BLElBQUEsSUFBVSxDQUFBLElBQUssQ0FBQyxPQUFoQjtBQUFBLFlBQUEsQ0FBQTtLQU5BO0FBQUEsSUFRQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLEVBQTZCLFNBQTdCLENBUkEsQ0FBQTtBQUFBLElBU0Esb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVRBLENBQUE7V0FXQSxLQWJXO0VBQUEsQ0E3T1osQ0FBQTs7QUFBQSxFQTRQQSxvQkFBQyxDQUFBLFVBQUQsR0FBYyxTQUFDLEdBQUQsRUFBTSxTQUFOLEVBQWlCLFVBQWpCLEVBQW1DLEVBQW5DLEdBQUE7QUFFYixRQUFBLG9CQUFBOztNQUY4QixhQUFXO0tBRXpDOztNQUZnRCxLQUFHO0tBRW5EO0FBQUEsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLENBQVUsR0FBVixDQUFIO0FBQ0MsV0FBQSwwQ0FBQTt1QkFBQTtBQUFBLFFBQUMsb0JBQUMsQ0FBQSxVQUFELENBQVksSUFBWixFQUFrQixTQUFsQixFQUE2QixFQUE3QixDQUFELENBQUE7QUFBQSxPQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxvQkFBQyxDQUFBLGlCQUFELENBQW1CLEdBQW5CLENBSlAsQ0FBQTtBQU1BLElBQUEsSUFBVSxDQUFBLElBQUssQ0FBQyxPQUFoQjtBQUFBLFlBQUEsQ0FBQTtLQU5BO0FBQUEsSUFRQSxvQkFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLEVBQTZCLFNBQTdCLENBUkEsQ0FBQTtBQUFBLElBU0Esb0JBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixVQUFyQixFQUFpQyxFQUFqQyxDQVRBLENBQUE7V0FXQSxLQWJhO0VBQUEsQ0E1UGQsQ0FBQTs7QUFBQSxFQTJRQSxvQkFBQyxDQUFBLGdCQUFELEdBQW9CLFNBQUMsSUFBRCxHQUFBO0FBRW5CLFFBQUEsOEJBQUE7QUFBQSxJQUFBLFFBQUEsR0FBVyxFQUFYLENBQUE7QUFDQTtBQUFBLFNBQUEsMkNBQUE7c0JBQUE7QUFBQSxNQUFDLFFBQVEsQ0FBQyxJQUFULENBQWMsb0JBQUMsQ0FBQSxjQUFELENBQUEsQ0FBZCxDQUFELENBQUE7QUFBQSxLQURBO0FBR0EsV0FBTyxRQUFRLENBQUMsSUFBVCxDQUFjLEVBQWQsQ0FBUCxDQUxtQjtFQUFBLENBM1FwQixDQUFBOzs4QkFBQTs7SUFKRCxDQUFBOztBQUFBLE1Bc1JNLENBQUMsT0FBUCxHQUFpQixvQkF0UmpCLENBQUE7O0FBQUEsTUF3Uk0sQ0FBQyxvQkFBUCxHQUE2QixvQkF4UjdCLENBQUE7Ozs7O0FDQUEsSUFBQSxzQkFBQTtFQUFBO2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsc0JBQVIsQ0FBZixDQUFBOztBQUVBO0FBQUE7OztHQUZBOztBQUFBO0FBU0MsNkJBQUEsQ0FBQTs7OztHQUFBOztBQUFBLEVBQUEsUUFBQyxDQUFBLEdBQUQsR0FBZSxxQ0FBZixDQUFBOztBQUFBLEVBRUEsUUFBQyxDQUFBLFdBQUQsR0FBZSxPQUZmLENBQUE7O0FBQUEsRUFJQSxRQUFDLENBQUEsUUFBRCxHQUFlLElBSmYsQ0FBQTs7QUFBQSxFQUtBLFFBQUMsQ0FBQSxNQUFELEdBQWUsS0FMZixDQUFBOztBQUFBLEVBT0EsUUFBQyxDQUFBLElBQUQsR0FBUSxTQUFBLEdBQUE7QUFFUDtBQUFBOzs7T0FBQTtXQU1BLEtBUk87RUFBQSxDQVBSLENBQUE7O0FBQUEsRUFpQkEsUUFBQyxDQUFBLElBQUQsR0FBUSxTQUFBLEdBQUE7QUFFUCxJQUFBLFFBQUMsQ0FBQSxNQUFELEdBQVUsSUFBVixDQUFBO0FBQUEsSUFFQSxFQUFFLENBQUMsSUFBSCxDQUNDO0FBQUEsTUFBQSxLQUFBLEVBQVMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUF2QjtBQUFBLE1BQ0EsTUFBQSxFQUFTLEtBRFQ7QUFBQSxNQUVBLEtBQUEsRUFBUyxLQUZUO0tBREQsQ0FGQSxDQUFBO1dBT0EsS0FUTztFQUFBLENBakJSLENBQUE7O0FBQUEsRUE0QkEsUUFBQyxDQUFBLEtBQUQsR0FBUyxTQUFFLFFBQUYsR0FBQTtBQUVSLElBRlMsUUFBQyxDQUFBLFdBQUEsUUFFVixDQUFBO0FBQUEsSUFBQSxJQUFHLENBQUEsUUFBRSxDQUFBLE1BQUw7QUFBaUIsYUFBTyxRQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsQ0FBaUIsZ0JBQWpCLENBQVAsQ0FBakI7S0FBQTtBQUFBLElBRUEsRUFBRSxDQUFDLEtBQUgsQ0FBUyxTQUFFLEdBQUYsR0FBQTtBQUVSLE1BQUEsSUFBRyxHQUFJLENBQUEsUUFBQSxDQUFKLEtBQWlCLFdBQXBCO2VBQ0MsUUFBQyxDQUFBLFdBQUQsQ0FBYSxHQUFJLENBQUEsY0FBQSxDQUFnQixDQUFBLGFBQUEsQ0FBakMsRUFERDtPQUFBLE1BQUE7ZUFHQyxRQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsQ0FBaUIsYUFBakIsRUFIRDtPQUZRO0lBQUEsQ0FBVCxFQU9FO0FBQUEsTUFBRSxLQUFBLEVBQU8sUUFBQyxDQUFBLFdBQVY7S0FQRixDQUZBLENBQUE7V0FXQSxLQWJRO0VBQUEsQ0E1QlQsQ0FBQTs7QUFBQSxFQTJDQSxRQUFDLENBQUEsV0FBRCxHQUFlLFNBQUMsS0FBRCxHQUFBO0FBRWQsUUFBQSx5QkFBQTtBQUFBLElBQUEsUUFBQSxHQUFXLEVBQVgsQ0FBQTtBQUFBLElBQ0EsUUFBUSxDQUFDLFlBQVQsR0FBd0IsS0FEeEIsQ0FBQTtBQUFBLElBR0EsTUFBQSxHQUFXLENBQUMsQ0FBQyxRQUFGLENBQUEsQ0FIWCxDQUFBO0FBQUEsSUFJQSxPQUFBLEdBQVcsQ0FBQyxDQUFDLFFBQUYsQ0FBQSxDQUpYLENBQUE7QUFBQSxJQU1BLEVBQUUsQ0FBQyxHQUFILENBQU8sS0FBUCxFQUFjLFNBQUMsR0FBRCxHQUFBO0FBRWIsTUFBQSxRQUFRLENBQUMsU0FBVCxHQUFxQixHQUFHLENBQUMsSUFBekIsQ0FBQTtBQUFBLE1BQ0EsUUFBUSxDQUFDLFNBQVQsR0FBcUIsR0FBRyxDQUFDLEVBRHpCLENBQUE7QUFBQSxNQUVBLFFBQVEsQ0FBQyxLQUFULEdBQXFCLEdBQUcsQ0FBQyxLQUFKLElBQWEsS0FGbEMsQ0FBQTthQUdBLE1BQU0sQ0FBQyxPQUFQLENBQUEsRUFMYTtJQUFBLENBQWQsQ0FOQSxDQUFBO0FBQUEsSUFhQSxFQUFFLENBQUMsR0FBSCxDQUFPLGFBQVAsRUFBc0I7QUFBQSxNQUFFLE9BQUEsRUFBUyxLQUFYO0tBQXRCLEVBQTBDLFNBQUMsR0FBRCxHQUFBO0FBRXpDLE1BQUEsUUFBUSxDQUFDLFdBQVQsR0FBdUIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFoQyxDQUFBO2FBQ0EsT0FBTyxDQUFDLE9BQVIsQ0FBQSxFQUh5QztJQUFBLENBQTFDLENBYkEsQ0FBQTtBQUFBLElBa0JBLENBQUMsQ0FBQyxJQUFGLENBQU8sTUFBUCxFQUFlLE9BQWYsQ0FBdUIsQ0FBQyxJQUF4QixDQUE2QixTQUFBLEdBQUE7YUFBRyxRQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsQ0FBa0IsUUFBbEIsRUFBSDtJQUFBLENBQTdCLENBbEJBLENBQUE7V0FvQkEsS0F0QmM7RUFBQSxDQTNDZixDQUFBOztBQUFBLEVBbUVBLFFBQUMsQ0FBQSxLQUFELEdBQVMsU0FBQyxJQUFELEVBQU8sRUFBUCxHQUFBO0FBRVIsSUFBQSxFQUFFLENBQUMsRUFBSCxDQUFNO0FBQUEsTUFDTCxNQUFBLEVBQWMsSUFBSSxDQUFDLE1BQUwsSUFBZSxNQUR4QjtBQUFBLE1BRUwsSUFBQSxFQUFjLElBQUksQ0FBQyxJQUFMLElBQWEsRUFGdEI7QUFBQSxNQUdMLElBQUEsRUFBYyxJQUFJLENBQUMsSUFBTCxJQUFhLEVBSHRCO0FBQUEsTUFJTCxPQUFBLEVBQWMsSUFBSSxDQUFDLE9BQUwsSUFBZ0IsRUFKekI7QUFBQSxNQUtMLE9BQUEsRUFBYyxJQUFJLENBQUMsT0FBTCxJQUFnQixFQUx6QjtBQUFBLE1BTUwsV0FBQSxFQUFjLElBQUksQ0FBQyxXQUFMLElBQW9CLEVBTjdCO0tBQU4sRUFPRyxTQUFDLFFBQUQsR0FBQTt3Q0FDRixHQUFJLG1CQURGO0lBQUEsQ0FQSCxDQUFBLENBQUE7V0FVQSxLQVpRO0VBQUEsQ0FuRVQsQ0FBQTs7a0JBQUE7O0dBRnNCLGFBUHZCLENBQUE7O0FBQUEsTUEwRk0sQ0FBQyxPQUFQLEdBQWlCLFFBMUZqQixDQUFBOzs7OztBQ0FBLElBQUEsd0JBQUE7RUFBQTtpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLHNCQUFSLENBQWYsQ0FBQTs7QUFFQTtBQUFBOzs7R0FGQTs7QUFBQTtBQVNDLCtCQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSxFQUFBLFVBQUMsQ0FBQSxHQUFELEdBQVksOENBQVosQ0FBQTs7QUFBQSxFQUVBLFVBQUMsQ0FBQSxNQUFELEdBQ0M7QUFBQSxJQUFBLFVBQUEsRUFBaUIsSUFBakI7QUFBQSxJQUNBLFVBQUEsRUFBaUIsSUFEakI7QUFBQSxJQUVBLE9BQUEsRUFBaUIsZ0RBRmpCO0FBQUEsSUFHQSxjQUFBLEVBQWlCLE1BSGpCO0dBSEQsQ0FBQTs7QUFBQSxFQVFBLFVBQUMsQ0FBQSxRQUFELEdBQVksSUFSWixDQUFBOztBQUFBLEVBU0EsVUFBQyxDQUFBLE1BQUQsR0FBWSxLQVRaLENBQUE7O0FBQUEsRUFXQSxVQUFDLENBQUEsSUFBRCxHQUFRLFNBQUEsR0FBQTtBQUVQO0FBQUE7OztPQUFBO1dBTUEsS0FSTztFQUFBLENBWFIsQ0FBQTs7QUFBQSxFQXFCQSxVQUFDLENBQUEsSUFBRCxHQUFRLFNBQUEsR0FBQTtBQUVQLElBQUEsVUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFWLENBQUE7QUFBQSxJQUVBLFVBQUMsQ0FBQSxNQUFPLENBQUEsVUFBQSxDQUFSLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FGcEMsQ0FBQTtBQUFBLElBR0EsVUFBQyxDQUFBLE1BQU8sQ0FBQSxVQUFBLENBQVIsR0FBc0IsVUFBQyxDQUFBLGFBSHZCLENBQUE7V0FLQSxLQVBPO0VBQUEsQ0FyQlIsQ0FBQTs7QUFBQSxFQThCQSxVQUFDLENBQUEsS0FBRCxHQUFTLFNBQUUsUUFBRixHQUFBO0FBRVIsSUFGUyxVQUFDLENBQUEsV0FBQSxRQUVWLENBQUE7QUFBQSxJQUFBLElBQUcsVUFBQyxDQUFBLE1BQUo7QUFDQyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBVixDQUFpQixVQUFDLENBQUEsTUFBbEIsQ0FBQSxDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsVUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLENBQWlCLGdCQUFqQixDQUFBLENBSEQ7S0FBQTtXQUtBLEtBUFE7RUFBQSxDQTlCVCxDQUFBOztBQUFBLEVBdUNBLFVBQUMsQ0FBQSxhQUFELEdBQWlCLFNBQUMsR0FBRCxHQUFBO0FBRWhCLElBQUEsSUFBRyxHQUFJLENBQUEsUUFBQSxDQUFVLENBQUEsV0FBQSxDQUFqQjtBQUNDLE1BQUEsVUFBQyxDQUFBLFdBQUQsQ0FBYSxHQUFJLENBQUEsY0FBQSxDQUFqQixDQUFBLENBREQ7S0FBQSxNQUVLLElBQUcsR0FBSSxDQUFBLE9BQUEsQ0FBUyxDQUFBLGVBQUEsQ0FBaEI7QUFDSixNQUFBLFVBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixDQUFpQixhQUFqQixDQUFBLENBREk7S0FGTDtXQUtBLEtBUGdCO0VBQUEsQ0F2Q2pCLENBQUE7O0FBQUEsRUFnREEsVUFBQyxDQUFBLFdBQUQsR0FBZSxTQUFDLEtBQUQsR0FBQTtBQUVkLElBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFaLENBQWlCLE1BQWpCLEVBQXdCLElBQXhCLEVBQThCLFNBQUEsR0FBQTtBQUU3QixVQUFBLE9BQUE7QUFBQSxNQUFBLE9BQUEsR0FBVSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBeEIsQ0FBNEI7QUFBQSxRQUFBLFFBQUEsRUFBVSxJQUFWO09BQTVCLENBQVYsQ0FBQTthQUNBLE9BQU8sQ0FBQyxPQUFSLENBQWdCLFNBQUMsR0FBRCxHQUFBO0FBRWYsWUFBQSxRQUFBO0FBQUEsUUFBQSxRQUFBLEdBQ0M7QUFBQSxVQUFBLFlBQUEsRUFBZSxLQUFmO0FBQUEsVUFDQSxTQUFBLEVBQWUsR0FBRyxDQUFDLFdBRG5CO0FBQUEsVUFFQSxTQUFBLEVBQWUsR0FBRyxDQUFDLEVBRm5CO0FBQUEsVUFHQSxLQUFBLEVBQWtCLEdBQUcsQ0FBQyxNQUFPLENBQUEsQ0FBQSxDQUFkLEdBQXNCLEdBQUcsQ0FBQyxNQUFPLENBQUEsQ0FBQSxDQUFFLENBQUMsS0FBcEMsR0FBK0MsS0FIOUQ7QUFBQSxVQUlBLFdBQUEsRUFBZSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBSnpCO1NBREQsQ0FBQTtlQU9BLFVBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixDQUFrQixRQUFsQixFQVRlO01BQUEsQ0FBaEIsRUFINkI7SUFBQSxDQUE5QixDQUFBLENBQUE7V0FjQSxLQWhCYztFQUFBLENBaERmLENBQUE7O29CQUFBOztHQUZ3QixhQVB6QixDQUFBOztBQUFBLE1BMkVNLENBQUMsT0FBUCxHQUFpQixVQTNFakIsQ0FBQTs7Ozs7QUNTQSxJQUFBLFlBQUE7O0FBQUE7NEJBR0k7O0FBQUEsRUFBQSxZQUFDLENBQUEsS0FBRCxHQUFlLE9BQWYsQ0FBQTs7QUFBQSxFQUNBLFlBQUMsQ0FBQSxJQUFELEdBQWUsTUFEZixDQUFBOztBQUFBLEVBRUEsWUFBQyxDQUFBLE1BQUQsR0FBZSxRQUZmLENBQUE7O0FBQUEsRUFHQSxZQUFDLENBQUEsS0FBRCxHQUFlLE9BSGYsQ0FBQTs7QUFBQSxFQUlBLFlBQUMsQ0FBQSxXQUFELEdBQWUsYUFKZixDQUFBOztBQUFBLEVBTUEsWUFBQyxDQUFBLEtBQUQsR0FBUyxTQUFBLEdBQUE7QUFFTCxJQUFBLFlBQVksQ0FBQyxnQkFBYixHQUFpQztBQUFBLE1BQUMsSUFBQSxFQUFNLE9BQVA7QUFBQSxNQUFnQixXQUFBLEVBQWEsQ0FBQyxZQUFZLENBQUMsS0FBZCxDQUE3QjtLQUFqQyxDQUFBO0FBQUEsSUFDQSxZQUFZLENBQUMsaUJBQWIsR0FBaUM7QUFBQSxNQUFDLElBQUEsRUFBTSxRQUFQO0FBQUEsTUFBaUIsV0FBQSxFQUFhLENBQUMsWUFBWSxDQUFDLE1BQWQsQ0FBOUI7S0FEakMsQ0FBQTtBQUFBLElBRUEsWUFBWSxDQUFDLGdCQUFiLEdBQWlDO0FBQUEsTUFBQyxJQUFBLEVBQU0sT0FBUDtBQUFBLE1BQWdCLFdBQUEsRUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFkLEVBQW9CLFlBQVksQ0FBQyxLQUFqQyxFQUF3QyxZQUFZLENBQUMsV0FBckQsQ0FBN0I7S0FGakMsQ0FBQTtBQUFBLElBSUEsWUFBWSxDQUFDLFdBQWIsR0FBMkIsQ0FDdkIsWUFBWSxDQUFDLGdCQURVLEVBRXZCLFlBQVksQ0FBQyxpQkFGVSxFQUd2QixZQUFZLENBQUMsZ0JBSFUsQ0FKM0IsQ0FGSztFQUFBLENBTlQsQ0FBQTs7QUFBQSxFQW1CQSxZQUFDLENBQUEsY0FBRCxHQUFrQixTQUFBLEdBQUE7QUFFZCxXQUFPLE1BQU0sQ0FBQyxnQkFBUCxDQUF3QixRQUFRLENBQUMsSUFBakMsRUFBdUMsT0FBdkMsQ0FBK0MsQ0FBQyxnQkFBaEQsQ0FBaUUsU0FBakUsQ0FBUCxDQUZjO0VBQUEsQ0FuQmxCLENBQUE7O0FBQUEsRUF1QkEsWUFBQyxDQUFBLGFBQUQsR0FBaUIsU0FBQSxHQUFBO0FBRWIsUUFBQSxrQkFBQTtBQUFBLElBQUEsS0FBQSxHQUFRLFlBQVksQ0FBQyxjQUFiLENBQUEsQ0FBUixDQUFBO0FBRUEsU0FBUyxrSEFBVCxHQUFBO0FBQ0ksTUFBQSxJQUFHLFlBQVksQ0FBQyxXQUFZLENBQUEsQ0FBQSxDQUFFLENBQUMsV0FBVyxDQUFDLE9BQXhDLENBQWdELEtBQWhELENBQUEsR0FBeUQsQ0FBQSxDQUE1RDtBQUNJLGVBQU8sWUFBWSxDQUFDLFdBQVksQ0FBQSxDQUFBLENBQUUsQ0FBQyxJQUFuQyxDQURKO09BREo7QUFBQSxLQUZBO0FBTUEsV0FBTyxFQUFQLENBUmE7RUFBQSxDQXZCakIsQ0FBQTs7QUFBQSxFQWlDQSxZQUFDLENBQUEsWUFBRCxHQUFnQixTQUFDLFVBQUQsR0FBQTtBQUVaLFFBQUEsV0FBQTtBQUFBLFNBQVMsZ0hBQVQsR0FBQTtBQUVJLE1BQUEsSUFBRyxVQUFVLENBQUMsV0FBWSxDQUFBLENBQUEsQ0FBdkIsS0FBNkIsWUFBWSxDQUFDLGNBQWIsQ0FBQSxDQUFoQztBQUNJLGVBQU8sSUFBUCxDQURKO09BRko7QUFBQSxLQUFBO0FBS0EsV0FBTyxLQUFQLENBUFk7RUFBQSxDQWpDaEIsQ0FBQTs7c0JBQUE7O0lBSEosQ0FBQTs7QUFBQSxNQTZDTSxDQUFDLFlBQVAsR0FBc0IsWUE3Q3RCLENBQUE7O0FBQUEsTUErQ00sQ0FBQyxPQUFQLEdBQWlCLFlBL0NqQixDQUFBOzs7OztBQ1RBLElBQUEsV0FBQTs7QUFBQTsyQkFFSTs7QUFBQSxFQUFBLFdBQUMsQ0FBQSxRQUFELEdBQVcsSUFBSSxDQUFDLEdBQWhCLENBQUE7O0FBQUEsRUFDQSxXQUFDLENBQUEsUUFBRCxHQUFXLElBQUksQ0FBQyxHQURoQixDQUFBOztBQUFBLEVBRUEsV0FBQyxDQUFBLFdBQUQsR0FBYyxJQUFJLENBQUMsTUFGbkIsQ0FBQTs7QUFBQSxFQUdBLFdBQUMsQ0FBQSxRQUFELEdBQVcsSUFBSSxDQUFDLEdBSGhCLENBQUE7O0FBQUEsRUFJQSxXQUFDLENBQUEsVUFBRCxHQUFhLElBQUksQ0FBQyxLQUpsQixDQUFBOztBQUFBLEVBTUEsV0FBQyxDQUFBLEtBQUQsR0FBTyxTQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsR0FBZCxHQUFBO0FBQ0gsV0FBTyxJQUFJLENBQUMsR0FBTCxDQUFVLElBQUksQ0FBQyxHQUFMLENBQVMsR0FBVCxFQUFhLE1BQWIsQ0FBVixFQUFnQyxHQUFoQyxDQUFQLENBREc7RUFBQSxDQU5QLENBQUE7O0FBQUEsRUFTQSxXQUFDLENBQUEsY0FBRCxHQUFpQixTQUFBLEdBQUE7QUFFYixRQUFBLHFCQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsa0JBQWtCLENBQUMsS0FBbkIsQ0FBeUIsRUFBekIsQ0FBVixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsR0FEUixDQUFBO0FBRUEsU0FBUyw0QkFBVCxHQUFBO0FBQ0ksTUFBQSxLQUFBLElBQVMsT0FBUSxDQUFBLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBSSxDQUFDLE1BQUwsQ0FBQSxDQUFBLEdBQWdCLEVBQTNCLENBQUEsQ0FBakIsQ0FESjtBQUFBLEtBRkE7V0FJQSxNQU5hO0VBQUEsQ0FUakIsQ0FBQTs7QUFBQSxFQWlCQSxXQUFDLENBQUEsZ0JBQUQsR0FBb0IsU0FBQyxLQUFELEVBQVEsS0FBUixHQUFBO0FBR2hCLFFBQUEsZ0RBQUE7QUFBQSxJQUFBLE9BQUEsR0FBVSxJQUFBLEdBQUssRUFBTCxHQUFRLEVBQVIsR0FBVyxFQUFyQixDQUFBO0FBQUEsSUFDQSxJQUFBLEdBQVUsRUFEVixDQUFBO0FBQUEsSUFJQSxRQUFBLEdBQVcsS0FBSyxDQUFDLE9BQU4sQ0FBQSxDQUpYLENBQUE7QUFBQSxJQUtBLFFBQUEsR0FBVyxLQUFLLENBQUMsT0FBTixDQUFBLENBTFgsQ0FBQTtBQUFBLElBUUEsYUFBQSxHQUFnQixRQUFBLEdBQVcsUUFSM0IsQ0FBQTtBQUFBLElBV0EsYUFBQSxHQUFnQixhQUFBLEdBQWMsSUFYOUIsQ0FBQTtBQUFBLElBWUEsSUFBSSxDQUFDLE9BQUwsR0FBZ0IsSUFBSSxDQUFDLEtBQUwsQ0FBVyxhQUFBLEdBQWdCLEVBQTNCLENBWmhCLENBQUE7QUFBQSxJQWNBLGFBQUEsR0FBZ0IsYUFBQSxHQUFjLEVBZDlCLENBQUE7QUFBQSxJQWVBLElBQUksQ0FBQyxPQUFMLEdBQWdCLElBQUksQ0FBQyxLQUFMLENBQVcsYUFBQSxHQUFnQixFQUEzQixDQWZoQixDQUFBO0FBQUEsSUFpQkEsYUFBQSxHQUFnQixhQUFBLEdBQWMsRUFqQjlCLENBQUE7QUFBQSxJQWtCQSxJQUFJLENBQUMsS0FBTCxHQUFnQixJQUFJLENBQUMsS0FBTCxDQUFXLGFBQUEsR0FBZ0IsRUFBM0IsQ0FsQmhCLENBQUE7QUFBQSxJQW9CQSxJQUFJLENBQUMsSUFBTCxHQUFnQixJQUFJLENBQUMsS0FBTCxDQUFXLGFBQUEsR0FBYyxFQUF6QixDQXBCaEIsQ0FBQTtXQXNCQSxLQXpCZ0I7RUFBQSxDQWpCcEIsQ0FBQTs7QUFBQSxFQTRDQSxXQUFDLENBQUEsR0FBRCxHQUFNLFNBQUUsR0FBRixFQUFPLElBQVAsRUFBYSxJQUFiLEVBQW1CLElBQW5CLEVBQXlCLElBQXpCLEVBQStCLEtBQS9CLEVBQThDLFlBQTlDLEVBQW1FLFlBQW5FLEdBQUE7QUFDRixRQUFBLFVBQUE7O01BRGlDLFFBQVE7S0FDekM7O01BRGdELGVBQWU7S0FDL0Q7O01BRHFFLGVBQWU7S0FDcEY7QUFBQSxJQUFBLElBQUcsWUFBQSxJQUFpQixHQUFBLEdBQU0sSUFBMUI7QUFBb0MsYUFBTyxJQUFQLENBQXBDO0tBQUE7QUFDQSxJQUFBLElBQUcsWUFBQSxJQUFpQixHQUFBLEdBQU0sSUFBMUI7QUFBb0MsYUFBTyxJQUFQLENBQXBDO0tBREE7QUFBQSxJQUdBLElBQUEsR0FBTyxDQUFDLEdBQUEsR0FBTSxJQUFQLENBQUEsR0FBZSxDQUFDLElBQUEsR0FBTyxJQUFSLENBSHRCLENBQUE7QUFBQSxJQUlBLElBQUEsR0FBTyxDQUFDLElBQUEsR0FBTyxDQUFDLElBQUEsR0FBTyxJQUFSLENBQVIsQ0FBQSxHQUF5QixJQUpoQyxDQUFBO0FBS0EsSUFBQSxJQUFHLEtBQUg7QUFBYyxhQUFPLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBWCxDQUFQLENBQWQ7S0FMQTtBQU9BLFdBQU8sSUFBUCxDQVJFO0VBQUEsQ0E1Q04sQ0FBQTs7QUFBQSxFQXNEQSxXQUFDLENBQUEsU0FBRCxHQUFZLFNBQUUsTUFBRixHQUFBO0FBQ1IsV0FBTyxNQUFBLEdBQVMsQ0FBRSxJQUFJLENBQUMsRUFBTCxHQUFVLEdBQVosQ0FBaEIsQ0FEUTtFQUFBLENBdERaLENBQUE7O0FBQUEsRUF5REEsV0FBQyxDQUFBLFFBQUQsR0FBVyxTQUFFLE9BQUYsR0FBQTtBQUNQLFdBQU8sT0FBQSxHQUFVLENBQUUsR0FBQSxHQUFNLElBQUksQ0FBQyxFQUFiLENBQWpCLENBRE87RUFBQSxDQXpEWCxDQUFBOztBQUFBLEVBNERBLFdBQUMsQ0FBQSxTQUFELEdBQVksU0FBRSxHQUFGLEVBQU8sR0FBUCxFQUFZLEdBQVosRUFBaUIsVUFBakIsR0FBQTtBQUNSLElBQUEsSUFBRyxVQUFIO0FBQW1CLGFBQU8sR0FBQSxJQUFPLEdBQVAsSUFBYyxHQUFBLElBQU8sR0FBNUIsQ0FBbkI7S0FBQSxNQUFBO0FBQ0ssYUFBTyxHQUFBLElBQU8sR0FBUCxJQUFjLEdBQUEsSUFBTyxHQUE1QixDQURMO0tBRFE7RUFBQSxDQTVEWixDQUFBOztBQUFBLEVBaUVBLFdBQUMsQ0FBQSxlQUFELEdBQWtCLFNBQUMsTUFBRCxHQUFBO0FBRWQsUUFBQSxFQUFBO0FBQUEsSUFBQSxJQUFHLE1BQUEsR0FBUyxJQUFaO0FBRUksYUFBTyxFQUFBLEdBQUUsQ0FBQyxJQUFJLENBQUMsS0FBTCxDQUFXLE1BQVgsQ0FBRCxDQUFGLEdBQXNCLEdBQTdCLENBRko7S0FBQSxNQUFBO0FBTUksTUFBQSxFQUFBLEdBQUssQ0FBQyxNQUFBLEdBQU8sSUFBUixDQUFhLENBQUMsT0FBZCxDQUFzQixDQUF0QixDQUFMLENBQUE7QUFDQSxhQUFPLEVBQUEsR0FBRyxFQUFILEdBQU0sSUFBYixDQVBKO0tBRmM7RUFBQSxDQWpFbEIsQ0FBQTs7QUFBQSxFQTZFQSxXQUFDLENBQUEsUUFBRCxHQUFXLFNBQUUsTUFBRixFQUFVLEtBQVYsR0FBQTtBQUVQLFFBQUEsSUFBQTtBQUFBLElBQUEsS0FBQSxJQUFTLE1BQU0sQ0FBQyxRQUFQLENBQUEsQ0FBaUIsQ0FBQyxNQUEzQixDQUFBO0FBRUEsSUFBQSxJQUFHLEtBQUEsR0FBUSxDQUFYO0FBQ0ksYUFBVyxJQUFBLEtBQUEsQ0FBTyxLQUFBLEdBQVEsNkNBQXVCO0FBQUEsUUFBQSxDQUFBLEVBQUksQ0FBSjtPQUF2QixDQUFmLENBQThDLENBQUMsSUFBL0MsQ0FBcUQsR0FBckQsQ0FBSixHQUFpRSxNQUF4RSxDQURKO0tBRkE7QUFLQSxXQUFPLE1BQUEsR0FBUyxFQUFoQixDQVBPO0VBQUEsQ0E3RVgsQ0FBQTs7cUJBQUE7O0lBRkosQ0FBQTs7QUFBQSxNQXdGTSxDQUFDLE9BQVAsR0FBaUIsV0F4RmpCLENBQUE7Ozs7O0FDQUE7QUFBQTs7OztHQUFBO0FBQUEsSUFBQSxTQUFBOztBQUFBO3lCQVFJOztBQUFBLEVBQUEsU0FBQyxDQUFBLFFBQUQsR0FBWSxFQUFaLENBQUE7O0FBQUEsRUFFQSxTQUFDLENBQUEsT0FBRCxHQUFVLFNBQUUsSUFBRixHQUFBO0FBQ047QUFBQTs7Ozs7Ozs7T0FBQTtBQUFBLFFBQUEsQ0FBQTtBQUFBLElBVUEsQ0FBQSxHQUFJLENBQUMsQ0FBQyxJQUFGLENBQU87QUFBQSxNQUVQLEdBQUEsRUFBYyxJQUFJLENBQUMsR0FGWjtBQUFBLE1BR1AsSUFBQSxFQUFpQixJQUFJLENBQUMsSUFBUixHQUFrQixJQUFJLENBQUMsSUFBdkIsR0FBaUMsTUFIeEM7QUFBQSxNQUlQLElBQUEsRUFBaUIsSUFBSSxDQUFDLElBQVIsR0FBa0IsSUFBSSxDQUFDLElBQXZCLEdBQWlDLElBSnhDO0FBQUEsTUFLUCxRQUFBLEVBQWlCLElBQUksQ0FBQyxRQUFSLEdBQXNCLElBQUksQ0FBQyxRQUEzQixHQUF5QyxNQUxoRDtBQUFBLE1BTVAsV0FBQSxFQUFpQixJQUFJLENBQUMsV0FBUixHQUF5QixJQUFJLENBQUMsV0FBOUIsR0FBK0Msa0RBTnREO0FBQUEsTUFPUCxXQUFBLEVBQWlCLElBQUksQ0FBQyxXQUFMLEtBQW9CLElBQXBCLElBQTZCLElBQUksQ0FBQyxXQUFMLEtBQW9CLE1BQXBELEdBQW1FLElBQUksQ0FBQyxXQUF4RSxHQUF5RixJQVBoRztLQUFQLENBVkosQ0FBQTtBQUFBLElBcUJBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBSSxDQUFDLElBQVosQ0FyQkEsQ0FBQTtBQUFBLElBc0JBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBSSxDQUFDLElBQVosQ0F0QkEsQ0FBQTtXQXdCQSxFQXpCTTtFQUFBLENBRlYsQ0FBQTs7QUFBQSxFQTZCQSxTQUFDLENBQUEsUUFBRCxHQUFZLFNBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxJQUFiLEdBQUE7QUFDUjtBQUFBOzs7O09BQUE7QUFBQSxJQU1BLFNBQUMsQ0FBQSxPQUFELENBQ0k7QUFBQSxNQUFBLEdBQUEsRUFBUyxjQUFUO0FBQUEsTUFDQSxJQUFBLEVBQVMsTUFEVDtBQUFBLE1BRUEsSUFBQSxFQUFTO0FBQUEsUUFBQyxZQUFBLEVBQWUsU0FBQSxDQUFVLElBQVYsQ0FBaEI7T0FGVDtBQUFBLE1BR0EsSUFBQSxFQUFTLElBSFQ7QUFBQSxNQUlBLElBQUEsRUFBUyxJQUpUO0tBREosQ0FOQSxDQUFBO1dBYUEsS0FkUTtFQUFBLENBN0JaLENBQUE7O0FBQUEsRUE2Q0EsU0FBQyxDQUFBLFdBQUQsR0FBZSxTQUFDLEVBQUQsRUFBSyxJQUFMLEVBQVcsSUFBWCxHQUFBO0FBRVgsSUFBQSxTQUFDLENBQUEsT0FBRCxDQUNJO0FBQUEsTUFBQSxHQUFBLEVBQVMsY0FBQSxHQUFlLEVBQXhCO0FBQUEsTUFDQSxJQUFBLEVBQVMsUUFEVDtBQUFBLE1BRUEsSUFBQSxFQUFTLElBRlQ7QUFBQSxNQUdBLElBQUEsRUFBUyxJQUhUO0tBREosQ0FBQSxDQUFBO1dBTUEsS0FSVztFQUFBLENBN0NmLENBQUE7O21CQUFBOztJQVJKLENBQUE7O0FBQUEsTUErRE0sQ0FBQyxPQUFQLEdBQWlCLFNBL0RqQixDQUFBOzs7OztBQ0FBO0FBQUE7OztHQUFBO0FBQUEsSUFBQSxLQUFBO0VBQUEsa0ZBQUE7O0FBQUE7QUFNSSxrQkFBQSxHQUFBLEdBQU0sSUFBTixDQUFBOztBQUVjLEVBQUEsZUFBQSxHQUFBO0FBRVYsbUNBQUEsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSwyQ0FBQSxDQUFBO0FBQUEsNkNBQUEsQ0FBQTtBQUFBLCtDQUFBLENBQUE7QUFBQSwyQ0FBQSxDQUFBO0FBQUEsaURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsR0FBRCxHQUFPLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLFFBQWIsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUpVO0VBQUEsQ0FGZDs7QUFBQSxrQkFRQSxPQUFBLEdBQVUsU0FBQyxHQUFELEVBQU0sQ0FBTixFQUFTLENBQVQsR0FBQTtBQUVOLFFBQUEsU0FBQTtBQUFBLElBQUEsSUFBQSxHQUFPLENBQUUsTUFBTSxDQUFDLFVBQVAsR0FBcUIsQ0FBdkIsQ0FBQSxJQUE4QixDQUFyQyxDQUFBO0FBQUEsSUFDQSxHQUFBLEdBQU8sQ0FBRSxNQUFNLENBQUMsV0FBUCxHQUFxQixDQUF2QixDQUFBLElBQThCLENBRHJDLENBQUE7QUFBQSxJQUdBLE1BQU0sQ0FBQyxJQUFQLENBQVksR0FBWixFQUFpQixFQUFqQixFQUFxQixNQUFBLEdBQU8sR0FBUCxHQUFXLFFBQVgsR0FBb0IsSUFBcEIsR0FBeUIsU0FBekIsR0FBbUMsQ0FBbkMsR0FBcUMsVUFBckMsR0FBZ0QsQ0FBaEQsR0FBa0QseUJBQXZFLENBSEEsQ0FBQTtXQUtBLEtBUE07RUFBQSxDQVJWLENBQUE7O0FBQUEsa0JBaUJBLElBQUEsR0FBTyxTQUFFLEdBQUYsR0FBQTtBQUVILElBQUEsR0FBQSxHQUFNLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBTixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsT0FBRCxDQUFVLG9DQUFBLEdBQW9DLEdBQTlDLEVBQXFELEdBQXJELEVBQTBELEdBQTFELENBRkEsQ0FBQTtXQUlBLEtBTkc7RUFBQSxDQWpCUCxDQUFBOztBQUFBLGtCQXlCQSxTQUFBLEdBQVksU0FBQyxHQUFELEVBQU0sS0FBTixFQUFhLEtBQWIsR0FBQTtBQUVSLElBQUEsR0FBQSxHQUFRLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FEUixDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FGUixDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsT0FBRCxDQUFVLGtEQUFBLEdBQWtELEdBQWxELEdBQXNELFNBQXRELEdBQStELEtBQS9ELEdBQXFFLGVBQXJFLEdBQW9GLEtBQTlGLEVBQXVHLEdBQXZHLEVBQTRHLEdBQTVHLENBSkEsQ0FBQTtXQU1BLEtBUlE7RUFBQSxDQXpCWixDQUFBOztBQUFBLGtCQW1DQSxNQUFBLEdBQVMsU0FBQyxHQUFELEVBQU0sS0FBTixFQUFhLEtBQWIsR0FBQTtBQUVMLElBQUEsR0FBQSxHQUFRLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBUixDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FEUixDQUFBO0FBQUEsSUFFQSxLQUFBLEdBQVEsa0JBQUEsQ0FBbUIsS0FBbkIsQ0FGUixDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsT0FBRCxDQUFVLDJDQUFBLEdBQTJDLEtBQTNDLEdBQWlELFdBQWpELEdBQTRELEtBQTVELEdBQWtFLGNBQWxFLEdBQWdGLEdBQTFGLEVBQWlHLEdBQWpHLEVBQXNHLEdBQXRHLENBSkEsQ0FBQTtXQU1BLEtBUks7RUFBQSxDQW5DVCxDQUFBOztBQUFBLGtCQTZDQSxRQUFBLEdBQVcsU0FBRSxHQUFGLEVBQVEsSUFBUixHQUFBO0FBRVAsUUFBQSxLQUFBOztNQUZlLE9BQU87S0FFdEI7QUFBQSxJQUFBLEdBQUEsR0FBUSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQVIsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLGtCQUFBLENBQW1CLElBQW5CLENBRFIsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE9BQUQsQ0FBVSxzQ0FBQSxHQUFzQyxHQUF0QyxHQUEwQyxLQUExQyxHQUErQyxLQUF6RCxFQUFrRSxHQUFsRSxFQUF1RSxHQUF2RSxDQUhBLENBQUE7V0FLQSxLQVBPO0VBQUEsQ0E3Q1gsQ0FBQTs7QUFBQSxrQkFzREEsT0FBQSxHQUFVLFNBQUUsR0FBRixFQUFRLElBQVIsR0FBQTtBQUVOLFFBQUEsS0FBQTs7TUFGYyxPQUFPO0tBRXJCO0FBQUEsSUFBQSxHQUFBLEdBQVEsa0JBQUEsQ0FBbUIsR0FBQSxJQUFPLElBQUMsQ0FBQSxHQUEzQixDQUFSLENBQUE7QUFDQSxJQUFBLElBQUcsSUFBQSxLQUFRLEVBQVg7QUFDSSxNQUFBLElBQUEsR0FBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQiw4QkFBakIsQ0FBUCxDQURKO0tBREE7QUFBQSxJQUlBLEtBQUEsR0FBUSxrQkFBQSxDQUFtQixJQUFuQixDQUpSLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxPQUFELENBQVUsd0NBQUEsR0FBd0MsS0FBeEMsR0FBOEMsT0FBOUMsR0FBcUQsR0FBL0QsRUFBc0UsR0FBdEUsRUFBMkUsR0FBM0UsQ0FOQSxDQUFBO1dBUUEsS0FWTTtFQUFBLENBdERWLENBQUE7O0FBQUEsa0JBa0VBLE1BQUEsR0FBUyxTQUFFLEdBQUYsR0FBQTtBQUVMLElBQUEsR0FBQSxHQUFNLGtCQUFBLENBQW1CLEdBQUEsSUFBTyxJQUFDLENBQUEsR0FBM0IsQ0FBTixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsT0FBRCxDQUFTLG9EQUFBLEdBQXVELEdBQWhFLEVBQXFFLEdBQXJFLEVBQTBFLEdBQTFFLENBRkEsQ0FBQTtXQUlBLEtBTks7RUFBQSxDQWxFVCxDQUFBOztBQUFBLGtCQTBFQSxLQUFBLEdBQVEsU0FBRSxHQUFGLEdBQUE7QUFFSixJQUFBLEdBQUEsR0FBTSxrQkFBQSxDQUFtQixHQUFBLElBQU8sSUFBQyxDQUFBLEdBQTNCLENBQU4sQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE9BQUQsQ0FBVSwrQ0FBQSxHQUErQyxHQUEvQyxHQUFtRCxpQkFBN0QsRUFBK0UsR0FBL0UsRUFBb0YsR0FBcEYsQ0FGQSxDQUFBO1dBSUEsS0FOSTtFQUFBLENBMUVSLENBQUE7O0FBQUEsa0JBa0ZBLEVBQUEsR0FBSyxTQUFBLEdBQUE7QUFFRCxXQUFPLE1BQU0sQ0FBQyxFQUFkLENBRkM7RUFBQSxDQWxGTCxDQUFBOztlQUFBOztJQU5KLENBQUE7O0FBQUEsTUE0Rk0sQ0FBQyxPQUFQLEdBQWlCLEtBNUZqQixDQUFBOzs7OztBQ0FBLElBQUEsWUFBQTtFQUFBOztpU0FBQTs7QUFBQTtBQUVDLGlDQUFBLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQUFBOztBQUFBLHlCQUFBLEVBQUEsR0FBZSxJQUFmLENBQUE7O0FBQUEseUJBQ0EsRUFBQSxHQUFlLElBRGYsQ0FBQTs7QUFBQSx5QkFFQSxRQUFBLEdBQWUsSUFGZixDQUFBOztBQUFBLHlCQUdBLFFBQUEsR0FBZSxJQUhmLENBQUE7O0FBQUEseUJBSUEsWUFBQSxHQUFlLElBSmYsQ0FBQTs7QUFBQSx5QkFNQSxVQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVosUUFBQSxPQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsUUFBRCxHQUFZLEVBQVosQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsUUFBSjtBQUNDLE1BQUEsT0FBQSxHQUFVLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsU0FBUyxDQUFDLEdBQWhCLENBQW9CLElBQUMsQ0FBQSxRQUFyQixDQUFYLENBQVYsQ0FBQTtBQUFBLE1BQ0EsSUFBQyxDQUFBLFVBQUQsQ0FBWSxPQUFBLENBQVEsSUFBQyxDQUFBLFlBQVQsQ0FBWixDQURBLENBREQ7S0FGQTtBQU1BLElBQUEsSUFBdUIsSUFBQyxDQUFBLEVBQXhCO0FBQUEsTUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxJQUFWLEVBQWdCLElBQUMsQ0FBQSxFQUFqQixDQUFBLENBQUE7S0FOQTtBQU9BLElBQUEsSUFBNEIsSUFBQyxDQUFBLFNBQTdCO0FBQUEsTUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFFBQUwsQ0FBYyxJQUFDLENBQUEsU0FBZixDQUFBLENBQUE7S0FQQTtBQUFBLElBU0EsSUFBQyxDQUFBLElBQUQsQ0FBQSxDQVRBLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxNQUFELEdBQVUsS0FYVixDQUFBO1dBYUEsS0FmWTtFQUFBLENBTmIsQ0FBQTs7QUFBQSx5QkF1QkEsSUFBQSxHQUFPLFNBQUEsR0FBQTtXQUVOLEtBRk07RUFBQSxDQXZCUCxDQUFBOztBQUFBLHlCQTJCQSxNQUFBLEdBQVMsU0FBQSxHQUFBO1dBRVIsS0FGUTtFQUFBLENBM0JULENBQUE7O0FBQUEseUJBK0JBLE1BQUEsR0FBUyxTQUFBLEdBQUE7V0FFUixLQUZRO0VBQUEsQ0EvQlQsQ0FBQTs7QUFBQSx5QkFtQ0EsUUFBQSxHQUFXLFNBQUMsS0FBRCxFQUFRLE9BQVIsR0FBQTtBQUVWLFFBQUEsU0FBQTs7TUFGa0IsVUFBVTtLQUU1QjtBQUFBLElBQUEsSUFBd0IsS0FBSyxDQUFDLEVBQTlCO0FBQUEsTUFBQSxJQUFDLENBQUEsUUFBUSxDQUFDLElBQVYsQ0FBZSxLQUFmLENBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxNQUFBLEdBQVksSUFBQyxDQUFBLGFBQUosR0FBdUIsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLGFBQVgsQ0FBeUIsQ0FBQyxFQUExQixDQUE2QixDQUE3QixDQUF2QixHQUE0RCxJQUFDLENBQUEsR0FEdEUsQ0FBQTtBQUFBLElBR0EsQ0FBQSxHQUFPLEtBQUssQ0FBQyxFQUFULEdBQWlCLEtBQUssQ0FBQyxHQUF2QixHQUFnQyxLQUhwQyxDQUFBO0FBS0EsSUFBQSxJQUFHLENBQUEsT0FBSDtBQUNDLE1BQUEsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFkLENBQUEsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLE1BQU0sQ0FBQyxPQUFQLENBQWUsQ0FBZixDQUFBLENBSEQ7S0FMQTtXQVVBLEtBWlU7RUFBQSxDQW5DWCxDQUFBOztBQUFBLHlCQWlEQSxPQUFBLEdBQVUsU0FBQyxHQUFELEVBQU0sS0FBTixHQUFBO0FBRVQsUUFBQSxDQUFBO0FBQUEsSUFBQSxJQUF3QixLQUFLLENBQUMsRUFBOUI7QUFBQSxNQUFBLElBQUMsQ0FBQSxRQUFRLENBQUMsSUFBVixDQUFlLEtBQWYsQ0FBQSxDQUFBO0tBQUE7QUFBQSxJQUNBLENBQUEsR0FBTyxLQUFLLENBQUMsRUFBVCxHQUFpQixLQUFLLENBQUMsR0FBdkIsR0FBZ0MsS0FEcEMsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsR0FBZCxDQUFrQixDQUFDLFdBQW5CLENBQStCLENBQS9CLENBRkEsQ0FBQTtXQUlBLEtBTlM7RUFBQSxDQWpEVixDQUFBOztBQUFBLHlCQXlEQSxNQUFBLEdBQVMsU0FBQyxLQUFELEdBQUE7QUFFUixRQUFBLENBQUE7QUFBQSxJQUFBLElBQU8sYUFBUDtBQUNDLFlBQUEsQ0FERDtLQUFBO0FBQUEsSUFHQSxDQUFBLEdBQU8sS0FBSyxDQUFDLEVBQVQsR0FBaUIsS0FBSyxDQUFDLEdBQXZCLEdBQWdDLENBQUEsQ0FBRSxLQUFGLENBSHBDLENBQUE7QUFJQSxJQUFBLElBQW1CLENBQUEsSUFBTSxLQUFLLENBQUMsT0FBL0I7QUFBQSxNQUFBLEtBQUssQ0FBQyxPQUFOLENBQUEsQ0FBQSxDQUFBO0tBSkE7QUFNQSxJQUFBLElBQUcsQ0FBQSxJQUFLLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixDQUFrQixLQUFsQixDQUFBLEtBQTRCLENBQUEsQ0FBcEM7QUFDQyxNQUFBLElBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixDQUFrQixJQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsQ0FBa0IsS0FBbEIsQ0FBbEIsRUFBNEMsQ0FBNUMsQ0FBQSxDQUREO0tBTkE7QUFBQSxJQVNBLENBQUMsQ0FBQyxNQUFGLENBQUEsQ0FUQSxDQUFBO1dBV0EsS0FiUTtFQUFBLENBekRULENBQUE7O0FBQUEseUJBd0VBLFFBQUEsR0FBVyxTQUFDLEtBQUQsR0FBQTtBQUVWLFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7QUFBQyxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVQ7QUFBdUIsUUFBQSxLQUFLLENBQUMsUUFBTixDQUFBLENBQUEsQ0FBdkI7T0FBRDtBQUFBLEtBQUE7V0FFQSxLQUpVO0VBQUEsQ0F4RVgsQ0FBQTs7QUFBQSx5QkE4RUEsWUFBQSxHQUFlLFNBQUUsT0FBRixHQUFBO0FBRWQsSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLEdBQUwsQ0FDQztBQUFBLE1BQUEsZ0JBQUEsRUFBcUIsT0FBSCxHQUFnQixNQUFoQixHQUE0QixNQUE5QztLQURELENBQUEsQ0FBQTtXQUdBLEtBTGM7RUFBQSxDQTlFZixDQUFBOztBQUFBLHlCQXFGQSxZQUFBLEdBQWUsU0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLEtBQVAsRUFBa0IsS0FBbEIsR0FBQTtBQUVkLFFBQUEsR0FBQTs7TUFGcUIsUUFBTTtLQUUzQjtBQUFBLElBQUEsSUFBRyxTQUFTLENBQUMsZUFBYjtBQUNDLE1BQUEsR0FBQSxHQUFPLGNBQUEsR0FBYSxDQUFDLENBQUEsR0FBRSxLQUFILENBQWIsR0FBc0IsSUFBdEIsR0FBeUIsQ0FBQyxDQUFBLEdBQUUsS0FBSCxDQUF6QixHQUFrQyxNQUF6QyxDQUREO0tBQUEsTUFBQTtBQUdDLE1BQUEsR0FBQSxHQUFPLFlBQUEsR0FBVyxDQUFDLENBQUEsR0FBRSxLQUFILENBQVgsR0FBb0IsSUFBcEIsR0FBdUIsQ0FBQyxDQUFBLEdBQUUsS0FBSCxDQUF2QixHQUFnQyxHQUF2QyxDQUhEO0tBQUE7QUFLQSxJQUFBLElBQUcsS0FBSDtBQUFjLE1BQUEsR0FBQSxHQUFNLEVBQUEsR0FBRyxHQUFILEdBQU8sU0FBUCxHQUFnQixLQUFoQixHQUFzQixHQUE1QixDQUFkO0tBTEE7V0FPQSxJQVRjO0VBQUEsQ0FyRmYsQ0FBQTs7QUFBQSx5QkFnR0EsU0FBQSxHQUFZLFNBQUEsR0FBQTtBQUVYLFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7O1FBRUMsS0FBSyxDQUFDO09BQU47QUFFQSxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFsQjtBQUVDLFFBQUEsS0FBSyxDQUFDLFNBQU4sQ0FBQSxDQUFBLENBRkQ7T0FKRDtBQUFBLEtBQUE7V0FRQSxLQVZXO0VBQUEsQ0FoR1osQ0FBQTs7QUFBQSx5QkE0R0EsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVULFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7O1FBRUMsS0FBSyxDQUFDO09BQU47QUFFQSxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFsQjtBQUVDLFFBQUEsS0FBSyxDQUFDLE9BQU4sQ0FBQSxDQUFBLENBRkQ7T0FKRDtBQUFBLEtBQUE7V0FRQSxLQVZTO0VBQUEsQ0E1R1YsQ0FBQTs7QUFBQSx5QkF3SEEsaUJBQUEsR0FBbUIsU0FBQSxHQUFBO0FBRWxCLFFBQUEscUJBQUE7QUFBQTtBQUFBLFNBQUEsMkNBQUE7dUJBQUE7QUFBQSxNQUFBLElBQUMsQ0FBQSxNQUFELENBQVEsS0FBUixDQUFBLENBQUE7QUFBQSxLQUFBO1dBRUEsS0FKa0I7RUFBQSxDQXhIbkIsQ0FBQTs7QUFBQSx5QkE4SEEsZUFBQSxHQUFrQixTQUFDLEdBQUQsRUFBTSxRQUFOLEdBQUE7QUFFakIsUUFBQSxrQkFBQTs7TUFGdUIsV0FBUyxJQUFDLENBQUE7S0FFakM7QUFBQSxTQUFBLHVEQUFBOzBCQUFBO0FBRUMsTUFBQSxLQUFLLENBQUMsT0FBTixDQUFjLEdBQWQsQ0FBQSxDQUFBO0FBRUEsTUFBQSxJQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBbEI7QUFFQyxRQUFBLElBQUMsQ0FBQSxlQUFELENBQWlCLEdBQWpCLEVBQXNCLEtBQUssQ0FBQyxRQUE1QixDQUFBLENBRkQ7T0FKRDtBQUFBLEtBQUE7V0FRQSxLQVZpQjtFQUFBLENBOUhsQixDQUFBOztBQUFBLHlCQTBJQSxZQUFBLEdBQWUsU0FBQyxNQUFELEVBQVMsTUFBVCxFQUFpQixRQUFqQixHQUFBO0FBRWQsUUFBQSxrQkFBQTs7TUFGK0IsV0FBUyxJQUFDLENBQUE7S0FFekM7QUFBQSxTQUFBLHVEQUFBOzBCQUFBOztRQUVDLEtBQU0sQ0FBQSxNQUFBLEVBQVM7T0FBZjtBQUVBLE1BQUEsSUFBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQWxCO0FBRUMsUUFBQSxJQUFDLENBQUEsWUFBRCxDQUFjLE1BQWQsRUFBc0IsTUFBdEIsRUFBOEIsS0FBSyxDQUFDLFFBQXBDLENBQUEsQ0FGRDtPQUpEO0FBQUEsS0FBQTtXQVFBLEtBVmM7RUFBQSxDQTFJZixDQUFBOztBQUFBLHlCQXNKQSxtQkFBQSxHQUFzQixTQUFDLE1BQUQsRUFBUyxNQUFULEVBQWlCLFFBQWpCLEdBQUE7QUFFckIsUUFBQSxrQkFBQTs7TUFGc0MsV0FBUyxJQUFDLENBQUE7S0FFaEQ7O01BQUEsSUFBRSxDQUFBLE1BQUEsRUFBUztLQUFYO0FBRUEsU0FBQSx1REFBQTswQkFBQTs7UUFFQyxLQUFNLENBQUEsTUFBQSxFQUFTO09BQWY7QUFFQSxNQUFBLElBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFsQjtBQUVDLFFBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxNQUFkLEVBQXNCLE1BQXRCLEVBQThCLEtBQUssQ0FBQyxRQUFwQyxDQUFBLENBRkQ7T0FKRDtBQUFBLEtBRkE7V0FVQSxLQVpxQjtFQUFBLENBdEp0QixDQUFBOztBQUFBLHlCQW9LQSxjQUFBLEdBQWlCLFNBQUMsR0FBRCxFQUFNLElBQU4sRUFBWSxXQUFaLEdBQUE7QUFFaEIsUUFBQSxFQUFBOztNQUY0QixjQUFZO0tBRXhDO0FBQUEsSUFBQSxFQUFBLEdBQVEsV0FBSCxHQUF3QixJQUFBLE1BQUEsQ0FBTyxnQkFBUCxFQUF5QixHQUF6QixDQUF4QixHQUErRCxJQUFBLE1BQUEsQ0FBTyxjQUFQLEVBQXVCLEdBQXZCLENBQXBFLENBQUE7QUFFQSxXQUFPLEdBQUcsQ0FBQyxPQUFKLENBQVksRUFBWixFQUFnQixTQUFDLENBQUQsRUFBSSxDQUFKLEdBQUE7QUFDdEIsVUFBQSxDQUFBO0FBQUEsTUFBQSxDQUFBLEdBQUksSUFBSyxDQUFBLENBQUEsQ0FBVCxDQUFBO0FBQ0MsTUFBQSxJQUFHLE1BQUEsQ0FBQSxDQUFBLEtBQVksUUFBWixJQUF3QixNQUFBLENBQUEsQ0FBQSxLQUFZLFFBQXZDO2VBQXFELEVBQXJEO09BQUEsTUFBQTtlQUE0RCxFQUE1RDtPQUZxQjtJQUFBLENBQWhCLENBQVAsQ0FKZ0I7RUFBQSxDQXBLakIsQ0FBQTs7QUFBQSx5QkE0S0EsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVUO0FBQUE7O09BQUE7V0FJQSxLQU5TO0VBQUEsQ0E1S1YsQ0FBQTs7QUFBQSx5QkFvTEEsRUFBQSxHQUFLLFNBQUEsR0FBQTtBQUVKLFdBQU8sTUFBTSxDQUFDLEVBQWQsQ0FGSTtFQUFBLENBcExMLENBQUE7O3NCQUFBOztHQUYwQixRQUFRLENBQUMsS0FBcEMsQ0FBQTs7QUFBQSxNQTBMTSxDQUFDLE9BQVAsR0FBaUIsWUExTGpCLENBQUE7Ozs7O0FDQUEsSUFBQSw4QkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLGdCQUFSLENBQWYsQ0FBQTs7QUFBQTtBQUlDLHFDQUFBLENBQUE7Ozs7Ozs7OztHQUFBOztBQUFBLDZCQUFBLE1BQUEsR0FBYSxLQUFiLENBQUE7O0FBQUEsNkJBQ0EsVUFBQSxHQUFhLEtBRGIsQ0FBQTs7QUFBQSw2QkFHQSxJQUFBLEdBQU8sU0FBQyxFQUFELEdBQUE7QUFFTixJQUFBLElBQUEsQ0FBQSxDQUFjLElBQUUsQ0FBQSxNQUFoQjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsTUFBRCxHQUFVLElBRFYsQ0FBQTtBQUdBO0FBQUE7O09BSEE7QUFBQSxJQU1BLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBdEIsQ0FBK0IsSUFBL0IsQ0FOQSxDQUFBO0FBQUEsSUFPQSxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsY0FBckIsRUFBcUMsSUFBckMsQ0FQQSxDQUFBO0FBU0E7QUFBQSx1REFUQTtBQUFBLElBVUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxHQUFMLENBQVM7QUFBQSxNQUFBLFlBQUEsRUFBZSxTQUFmO0tBQVQsQ0FWQSxDQUFBOztNQVdBO0tBWEE7QUFhQSxJQUFBLElBQUcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLGVBQVYsS0FBNkIsQ0FBaEM7QUFDQyxNQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFkLENBQWlCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxvQkFBL0IsRUFBcUQsSUFBQyxDQUFBLFNBQXRELENBQUEsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLElBQUMsQ0FBQSxTQUFELENBQUEsQ0FBQSxDQUhEO0tBYkE7V0FrQkEsS0FwQk07RUFBQSxDQUhQLENBQUE7O0FBQUEsNkJBeUJBLElBQUEsR0FBTyxTQUFDLEVBQUQsR0FBQTtBQUVOLElBQUEsSUFBQSxDQUFBLElBQWUsQ0FBQSxNQUFmO0FBQUEsWUFBQSxDQUFBO0tBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxNQUFELEdBQVUsS0FEVixDQUFBO0FBR0E7QUFBQTs7T0FIQTtBQUFBLElBTUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUF0QixDQUE2QixJQUE3QixDQU5BLENBQUE7QUFVQTtBQUFBLHVEQVZBO0FBQUEsSUFXQSxJQUFDLENBQUEsR0FBRyxDQUFDLEdBQUwsQ0FBUztBQUFBLE1BQUEsWUFBQSxFQUFlLFFBQWY7S0FBVCxDQVhBLENBQUE7O01BWUE7S0FaQTtXQWNBLEtBaEJNO0VBQUEsQ0F6QlAsQ0FBQTs7QUFBQSw2QkEyQ0EsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLG1CQUFELENBQXFCLGNBQXJCLEVBQXFDLEtBQXJDLENBQUEsQ0FBQTtXQUVBLEtBSlM7RUFBQSxDQTNDVixDQUFBOztBQUFBLDZCQWlEQSxZQUFBLEdBQWUsU0FBQyxPQUFELEdBQUE7QUFFZCxJQUFBLElBQWMsT0FBQSxLQUFhLElBQUMsQ0FBQSxVQUE1QjtBQUFBLFlBQUEsQ0FBQTtLQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsVUFBRCxHQUFjLE9BRGQsQ0FBQTtXQUdBLEtBTGM7RUFBQSxDQWpEZixDQUFBOztBQUFBLDZCQXdEQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVg7QUFBQTs7T0FBQTtXQUlBLEtBTlc7RUFBQSxDQXhEWixDQUFBOzswQkFBQTs7R0FGOEIsYUFGL0IsQ0FBQTs7QUFBQSxNQW9FTSxDQUFDLE9BQVAsR0FBaUIsZ0JBcEVqQixDQUFBOzs7OztBQ0FBLElBQUEsK0JBQUE7RUFBQTtpU0FBQTs7QUFBQSxnQkFBQSxHQUFtQixPQUFBLENBQVEscUJBQVIsQ0FBbkIsQ0FBQTs7QUFBQTtBQUlDLGtDQUFBLENBQUE7O0FBQUEsMEJBQUEsUUFBQSxHQUFXLFlBQVgsQ0FBQTs7QUFFYyxFQUFBLHVCQUFBLEdBQUE7QUFFYixJQUFBLElBQUMsQ0FBQSxZQUFELEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFBTyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixZQUFqQixDQUFQO0tBREQsQ0FBQTtBQUdBO0FBQUE7Ozs7O09BSEE7QUFBQSxJQVdBLDZDQUFBLENBWEEsQ0FBQTtBQWFBO0FBQUE7Ozs7OztPQWJBO0FBc0JBLFdBQU8sSUFBUCxDQXhCYTtFQUFBLENBRmQ7O3VCQUFBOztHQUYyQixpQkFGNUIsQ0FBQTs7QUFBQSxNQWdDTSxDQUFDLE9BQVAsR0FBaUIsYUFoQ2pCLENBQUE7Ozs7O0FDQUEsSUFBQSxvQkFBQTtFQUFBO2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsaUJBQVIsQ0FBZixDQUFBOztBQUFBO0FBSUksMkJBQUEsQ0FBQTs7QUFBQSxtQkFBQSxRQUFBLEdBQVcsYUFBWCxDQUFBOztBQUVhLEVBQUEsZ0JBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsRUFBaEIsQ0FBQTtBQUFBLElBRUEsc0NBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTlM7RUFBQSxDQUZiOztnQkFBQTs7R0FGaUIsYUFGckIsQ0FBQTs7QUFBQSxNQWNNLENBQUMsT0FBUCxHQUFpQixNQWRqQixDQUFBOzs7OztBQ0FBLElBQUEsa0RBQUE7RUFBQTs7aVNBQUE7O0FBQUEsWUFBQSxHQUF1QixPQUFBLENBQVEsaUJBQVIsQ0FBdkIsQ0FBQTs7QUFBQSxNQUNBLEdBQXVCLE9BQUEsQ0FBUSxxQkFBUixDQUR2QixDQUFBOztBQUFBLG9CQUVBLEdBQXVCLE9BQUEsQ0FBUSxrQ0FBUixDQUZ2QixDQUFBOztBQUFBO0FBTUMsMkJBQUEsQ0FBQTs7QUFBQSxtQkFBQSxRQUFBLEdBQVcsYUFBWCxDQUFBOztBQUFBLG1CQUVBLGdCQUFBLEdBQW1CLElBRm5CLENBQUE7O0FBSWMsRUFBQSxnQkFBQSxHQUFBO0FBRWIscURBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsK0RBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxZQUFELEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFDQztBQUFBLFFBQUEsS0FBQSxFQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG1CQUFqQixDQUFYO0FBQUEsUUFDQSxHQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixHQUFqQixHQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBRHJEO09BREQ7QUFBQSxNQUdBLEtBQUEsRUFDQztBQUFBLFFBQUEsS0FBQSxFQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG9CQUFqQixDQUFYO0FBQUEsUUFDQSxHQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixHQUFqQixHQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBRHJEO09BSkQ7QUFBQSxNQU1BLFVBQUEsRUFDQztBQUFBLFFBQUEsS0FBQSxFQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLHlCQUFqQixDQUFYO0FBQUEsUUFDQSxHQUFBLEVBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsUUFBTixHQUFpQixHQUFqQixHQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBRHJEO09BUEQ7QUFBQSxNQVNBLFdBQUEsRUFBYyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxNQUFNLENBQUMsR0FBYixDQUFpQixvQkFBakIsQ0FUZDtBQUFBLE1BVUEsVUFBQSxFQUFhLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLG1CQUFqQixDQVZiO0tBREQsQ0FBQTtBQUFBLElBYUEsc0NBQUEsQ0FiQSxDQUFBO0FBQUEsSUFlQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBZkEsQ0FBQTtBQWlCQSxXQUFPLElBQVAsQ0FuQmE7RUFBQSxDQUpkOztBQUFBLG1CQXlCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsS0FBRCxHQUFzQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxhQUFWLENBQXRCLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxhQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFlBQVYsQ0FEdEIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLGtCQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGlCQUFWLENBRnRCLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxRQUFELEdBQXNCLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFdBQVYsQ0FIdEIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFNBQUQsR0FBc0IsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsWUFBVixDQUp0QixDQUFBO1dBTUEsS0FSTTtFQUFBLENBekJQLENBQUE7O0FBQUEsbUJBbUNBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWixJQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFkLENBQWlCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxvQkFBL0IsRUFBcUQsSUFBQyxDQUFBLGFBQXRELENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEVBQWIsQ0FBZ0IsTUFBTSxDQUFDLGtCQUF2QixFQUEyQyxJQUFDLENBQUEsWUFBNUMsQ0FEQSxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsR0FBRyxDQUFDLEVBQUwsQ0FBUSxZQUFSLEVBQXNCLGlCQUF0QixFQUF5QyxJQUFDLENBQUEsV0FBMUMsQ0FIQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsR0FBRyxDQUFDLEVBQUwsQ0FBUSxZQUFSLEVBQXNCLGlCQUF0QixFQUF5QyxJQUFDLENBQUEsV0FBMUMsQ0FKQSxDQUFBO1dBTUEsS0FSWTtFQUFBLENBbkNiLENBQUE7O0FBQUEsbUJBNkNBLFlBQUEsR0FBZSxTQUFDLEtBQUQsR0FBQTtBQUVkLElBQUEsSUFBRyxJQUFDLENBQUEsZ0JBQUo7QUFDQyxNQUFBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixLQUFwQixDQUFBO0FBQ0EsWUFBQSxDQUZEO0tBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxZQUFELENBQWMsS0FBZCxDQUpBLENBQUE7V0FNQSxLQVJjO0VBQUEsQ0E3Q2YsQ0FBQTs7QUFBQSxtQkF1REEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRWQsUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFELENBQWtCLE9BQWxCLENBQVQsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsY0FBVixFQUEwQixPQUExQixDQUZBLENBQUE7QUFBQSxJQUlBLG9CQUFvQixDQUFDLElBQUQsQ0FBcEIsQ0FBd0IsSUFBQyxDQUFBLEtBQXpCLEVBQWdDLE1BQWhDLENBSkEsQ0FBQTtBQU9BLElBQUEsSUFBRyxPQUFBLEtBQVcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFqQztBQUNDLE1BQUEsb0JBQW9CLENBQUMsSUFBRCxDQUFwQixDQUF3QixDQUFDLElBQUMsQ0FBQSxhQUFGLEVBQWlCLElBQUMsQ0FBQSxrQkFBbEIsQ0FBeEIsRUFBK0QsTUFBL0QsQ0FBQSxDQUFBO0FBQUEsTUFDQSxvQkFBb0IsQ0FBQyxHQUFyQixDQUF5QixDQUFDLElBQUMsQ0FBQSxTQUFGLEVBQWEsSUFBQyxDQUFBLFFBQWQsQ0FBekIsRUFBa0QsTUFBbEQsQ0FEQSxDQUREO0tBQUEsTUFHSyxJQUFHLE9BQUEsS0FBVyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQWpDO0FBQ0osTUFBQSxvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLENBQUMsSUFBQyxDQUFBLFNBQUYsRUFBYSxJQUFDLENBQUEsUUFBZCxDQUF4QixFQUFpRCxNQUFqRCxDQUFBLENBQUE7QUFBQSxNQUNBLG9CQUFvQixDQUFDLEdBQXJCLENBQXlCLENBQUMsSUFBQyxDQUFBLGFBQUYsRUFBaUIsSUFBQyxDQUFBLGtCQUFsQixDQUF6QixFQUFnRSxNQUFoRSxDQURBLENBREk7S0FBQSxNQUFBO0FBSUosTUFBQSxvQkFBb0IsQ0FBQyxJQUFELENBQXBCLENBQXdCLENBQUMsSUFBQyxDQUFBLFNBQUYsQ0FBeEIsRUFBc0MsTUFBdEMsQ0FBQSxDQUFBO0FBQUEsTUFDQSxvQkFBb0IsQ0FBQyxHQUFyQixDQUF5QixDQUFDLElBQUMsQ0FBQSxhQUFGLEVBQWlCLElBQUMsQ0FBQSxrQkFBbEIsRUFBc0MsSUFBQyxDQUFBLFFBQXZDLENBQXpCLEVBQTJFLE1BQTNFLENBREEsQ0FKSTtLQVZMO1dBaUJBLEtBbkJjO0VBQUEsQ0F2RGYsQ0FBQTs7QUFBQSxtQkE0RUEsZ0JBQUEsR0FBbUIsU0FBQyxPQUFELEdBQUE7QUFFbEIsUUFBQSxNQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsT0FBQSxJQUFXLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBN0IsSUFBcUMsTUFBL0MsQ0FBQTtBQUFBLElBRUEsTUFBQTtBQUFTLGNBQU8sT0FBUDtBQUFBLGFBQ0gsTUFERztpQkFDUyxNQURUO0FBQUEsYUFFSCxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBRmhCO2lCQUUyQixRQUYzQjtBQUFBLGFBR0gsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUhoQjtpQkFHZ0MsUUFIaEM7QUFBQTtpQkFJSCxRQUpHO0FBQUE7aUJBRlQsQ0FBQTtXQVFBLE9BVmtCO0VBQUEsQ0E1RW5CLENBQUE7O0FBQUEsbUJBd0ZBLGFBQUEsR0FBZ0IsU0FBQSxHQUFBO0FBRWYsSUFBQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBaEMsQ0FBQSxDQUFBO1dBRUEsS0FKZTtFQUFBLENBeEZoQixDQUFBOztBQUFBLG1CQThGQSxXQUFBLEdBQWMsU0FBQyxDQUFELEdBQUE7QUFFYixRQUFBLEdBQUE7QUFBQSxJQUFBLEdBQUEsR0FBTSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBTixDQUFBO0FBQUEsSUFFQSxvQkFBb0IsQ0FBQyxRQUFyQixDQUE4QixHQUE5QixFQUFtQyxJQUFDLENBQUEsZ0JBQUQsQ0FBQSxDQUFuQyxDQUZBLENBQUE7V0FJQSxLQU5hO0VBQUEsQ0E5RmQsQ0FBQTs7QUFBQSxtQkFzR0EsV0FBQSxHQUFjLFNBQUMsQ0FBRCxHQUFBO0FBRWIsUUFBQSxHQUFBO0FBQUEsSUFBQSxHQUFBLEdBQU0sQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQU4sQ0FBQTtBQUFBLElBRUEsb0JBQW9CLENBQUMsVUFBckIsQ0FBZ0MsR0FBaEMsRUFBcUMsSUFBQyxDQUFBLGdCQUFELENBQUEsQ0FBckMsQ0FGQSxDQUFBO1dBSUEsS0FOYTtFQUFBLENBdEdkLENBQUE7O2dCQUFBOztHQUZvQixhQUpyQixDQUFBOztBQUFBLE1Bb0hNLENBQUMsT0FBUCxHQUFpQixNQXBIakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGdEQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsaUJBQVIsQ0FBZixDQUFBOztBQUFBLFFBQ0EsR0FBZSxPQUFBLENBQVEsa0JBQVIsQ0FEZixDQUFBOztBQUFBLE1BRUEsR0FBZSxPQUFBLENBQVEscUJBQVIsQ0FGZixDQUFBOztBQUFBO0FBTUkscUNBQUEsQ0FBQTs7QUFBQSw2QkFBQSxRQUFBLEdBQVcsbUJBQVgsQ0FBQTs7QUFBQSw2QkFFQSxRQUFBLEdBQ0k7QUFBQSxJQUFBLElBQUEsRUFBYSxDQUFFLE1BQU0sQ0FBQyxPQUFULEVBQWtCLE1BQU0sQ0FBQyxTQUF6QixFQUFvQyxNQUFNLENBQUMsTUFBM0MsQ0FBYjtBQUFBLElBQ0EsS0FBQSxFQUFhLENBQUUsTUFBTSxDQUFDLE1BQVQsRUFBaUIsTUFBTSxDQUFDLFNBQXhCLEVBQW1DLE1BQU0sQ0FBQyxPQUExQyxDQURiO0FBQUEsSUFFQSxVQUFBLEVBQWEsQ0FBRSxNQUFNLENBQUMsT0FBVCxFQUFrQixNQUFNLENBQUMsU0FBekIsRUFBb0MsTUFBTSxDQUFDLE1BQTNDLENBRmI7QUFBQSxJQUdBLE9BQUEsRUFBYSxDQUFFLE1BQU0sQ0FBQyxNQUFULEVBQWlCLE1BQU0sQ0FBQyxTQUF4QixFQUFtQyxNQUFNLENBQUMsT0FBMUMsQ0FIYjtHQUhKLENBQUE7O0FBQUEsNkJBUUEsWUFBQSxHQUNJO0FBQUEsSUFBQSxJQUFBLEVBQU8sSUFBUDtBQUFBLElBQ0EsS0FBQSxFQUNJO0FBQUEsTUFBQSxHQUFBLEVBQU0sSUFBTjtBQUFBLE1BQVksTUFBQSxFQUFTLElBQXJCO0FBQUEsTUFBMkIsSUFBQSxFQUFPLElBQWxDO0FBQUEsTUFBd0MsS0FBQSxFQUFRLElBQWhEO0FBQUEsTUFBc0QsS0FBQSxFQUFRLElBQTlEO0FBQUEsTUFBb0UsTUFBQSxFQUFTLElBQTdFO0tBRko7QUFBQSxJQUdBLEdBQUEsRUFDSTtBQUFBLE1BQUEsR0FBQSxFQUFNLElBQU47QUFBQSxNQUFZLE1BQUEsRUFBUyxJQUFyQjtBQUFBLE1BQTJCLElBQUEsRUFBTyxJQUFsQztBQUFBLE1BQXdDLEtBQUEsRUFBUSxJQUFoRDtBQUFBLE1BQXNELEtBQUEsRUFBUSxJQUE5RDtBQUFBLE1BQW9FLE1BQUEsRUFBUyxJQUE3RTtLQUpKO0dBVEosQ0FBQTs7QUFBQSw2QkFlQSxhQUFBLEdBQ0k7QUFBQSxJQUFBLFdBQUEsRUFDSTtBQUFBLE1BQUEsSUFBQSxFQUFPLFFBQVA7QUFBQSxNQUNBLEtBQUEsRUFDSTtBQUFBLFFBQUEsR0FBQSxFQUFNLE1BQU47QUFBQSxRQUFjLE1BQUEsRUFBUyxDQUF2QjtBQUFBLFFBQTBCLElBQUEsRUFBTyxDQUFqQztBQUFBLFFBQW9DLEtBQUEsRUFBUSxDQUE1QztBQUFBLFFBQStDLEtBQUEsRUFBUSxNQUF2RDtBQUFBLFFBQStELE1BQUEsRUFBUyxDQUF4RTtPQUZKO0FBQUEsTUFHQSxHQUFBLEVBQ0k7QUFBQSxRQUFBLEdBQUEsRUFBTSxDQUFOO0FBQUEsUUFBUyxNQUFBLEVBQVMsTUFBbEI7QUFBQSxRQUEwQixJQUFBLEVBQU8sQ0FBakM7QUFBQSxRQUFvQyxLQUFBLEVBQVEsQ0FBNUM7QUFBQSxRQUErQyxLQUFBLEVBQVEsTUFBdkQ7QUFBQSxRQUErRCxNQUFBLEVBQVMsTUFBeEU7T0FKSjtLQURKO0FBQUEsSUFNQSxXQUFBLEVBQ0k7QUFBQSxNQUFBLElBQUEsRUFBTyxRQUFQO0FBQUEsTUFDQSxLQUFBLEVBQ0k7QUFBQSxRQUFBLEdBQUEsRUFBTSxDQUFOO0FBQUEsUUFBUyxNQUFBLEVBQVMsTUFBbEI7QUFBQSxRQUEwQixJQUFBLEVBQU8sQ0FBakM7QUFBQSxRQUFvQyxLQUFBLEVBQVEsQ0FBNUM7QUFBQSxRQUErQyxLQUFBLEVBQVEsTUFBdkQ7QUFBQSxRQUErRCxNQUFBLEVBQVMsQ0FBeEU7T0FGSjtBQUFBLE1BR0EsR0FBQSxFQUNJO0FBQUEsUUFBQSxHQUFBLEVBQU0sTUFBTjtBQUFBLFFBQWMsTUFBQSxFQUFTLENBQXZCO0FBQUEsUUFBMEIsSUFBQSxFQUFPLENBQWpDO0FBQUEsUUFBb0MsS0FBQSxFQUFRLENBQTVDO0FBQUEsUUFBK0MsS0FBQSxFQUFRLE1BQXZEO0FBQUEsUUFBK0QsTUFBQSxFQUFTLE1BQXhFO09BSko7S0FQSjtBQUFBLElBWUEsV0FBQSxFQUNJO0FBQUEsTUFBQSxJQUFBLEVBQU8sT0FBUDtBQUFBLE1BQ0EsS0FBQSxFQUNJO0FBQUEsUUFBQSxHQUFBLEVBQU0sQ0FBTjtBQUFBLFFBQVMsTUFBQSxFQUFTLENBQWxCO0FBQUEsUUFBcUIsSUFBQSxFQUFPLENBQTVCO0FBQUEsUUFBK0IsS0FBQSxFQUFRLE1BQXZDO0FBQUEsUUFBK0MsS0FBQSxFQUFRLENBQXZEO0FBQUEsUUFBMEQsTUFBQSxFQUFTLE1BQW5FO09BRko7QUFBQSxNQUdBLEdBQUEsRUFDSTtBQUFBLFFBQUEsR0FBQSxFQUFNLENBQU47QUFBQSxRQUFTLE1BQUEsRUFBUyxDQUFsQjtBQUFBLFFBQXFCLElBQUEsRUFBTyxNQUE1QjtBQUFBLFFBQW9DLEtBQUEsRUFBUSxDQUE1QztBQUFBLFFBQStDLEtBQUEsRUFBUSxNQUF2RDtBQUFBLFFBQStELE1BQUEsRUFBUyxNQUF4RTtPQUpKO0tBYko7QUFBQSxJQWtCQSxXQUFBLEVBQ0k7QUFBQSxNQUFBLElBQUEsRUFBTyxPQUFQO0FBQUEsTUFDQSxLQUFBLEVBQ0k7QUFBQSxRQUFBLEdBQUEsRUFBTSxDQUFOO0FBQUEsUUFBUyxNQUFBLEVBQVMsQ0FBbEI7QUFBQSxRQUFxQixJQUFBLEVBQU8sTUFBNUI7QUFBQSxRQUFvQyxLQUFBLEVBQVEsQ0FBNUM7QUFBQSxRQUErQyxLQUFBLEVBQVEsQ0FBdkQ7QUFBQSxRQUEwRCxNQUFBLEVBQVMsTUFBbkU7T0FGSjtBQUFBLE1BR0EsR0FBQSxFQUNJO0FBQUEsUUFBQSxHQUFBLEVBQU0sQ0FBTjtBQUFBLFFBQVMsTUFBQSxFQUFTLENBQWxCO0FBQUEsUUFBcUIsSUFBQSxFQUFPLENBQTVCO0FBQUEsUUFBK0IsS0FBQSxFQUFRLE1BQXZDO0FBQUEsUUFBK0MsS0FBQSxFQUFRLE1BQXZEO0FBQUEsUUFBK0QsTUFBQSxFQUFTLE1BQXhFO09BSko7S0FuQko7R0FoQkosQ0FBQTs7QUF5Q2EsRUFBQSwwQkFBQSxHQUFBO0FBRVQscUNBQUEsQ0FBQTtBQUFBLHlDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLHFEQUFBLENBQUE7QUFBQSwrREFBQSxDQUFBO0FBQUEsK0VBQUEsQ0FBQTtBQUFBLGlEQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsRUFBaEIsQ0FBQTtBQUFBLElBRUEsZ0RBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTlM7RUFBQSxDQXpDYjs7QUFBQSw2QkFpREEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVILElBQUEsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxhQUFWLENBQVYsQ0FBQTtXQUVBLEtBSkc7RUFBQSxDQWpEUCxDQUFBOztBQUFBLDZCQXVEQSxPQUFBLEdBQVUsU0FBQyxRQUFELEVBQVcsTUFBWCxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFBLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFDLENBQUEsVUFBRCxDQUFZLE1BQVosQ0FBZCxDQUZBLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxZQUFELEdBQWdCLElBQUMsQ0FBQSxTQUFELENBQVcsUUFBWCxFQUFxQixNQUFyQixDQUpoQixDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsV0FBRCxDQUFhLElBQUMsQ0FBQSxZQUFZLENBQUMsS0FBM0IsQ0FOQSxDQUFBO1dBUUEsS0FWTTtFQUFBLENBdkRWLENBQUE7O0FBQUEsNkJBbUVBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFVCxJQUFBLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFhO0FBQUEsTUFBQSxPQUFBLEVBQVMsRUFBVDtLQUFiLENBQUEsQ0FBQTtXQUVBLEtBSlM7RUFBQSxDQW5FYixDQUFBOztBQUFBLDZCQXlFQSxVQUFBLEdBQWEsU0FBQyxJQUFELEdBQUE7QUFFVCxRQUFBLE9BQUE7QUFBQSxJQUFBLE9BQUEsR0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsVUFBVixDQUFxQixJQUFyQixFQUEyQixJQUEzQixDQUFWLENBQUE7V0FFQSxJQUFDLENBQUEsUUFBUyxDQUFBLE9BQUEsQ0FBVixJQUFzQixJQUFDLENBQUEsUUFBUSxDQUFDLEtBSnZCO0VBQUEsQ0F6RWIsQ0FBQTs7QUFBQSw2QkErRUEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRVgsSUFBQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxDQUFELEdBQUE7ZUFBTyxLQUFDLENBQUEsTUFBTSxDQUFDLEVBQVIsQ0FBVyxDQUFYLENBQWEsQ0FBQyxHQUFkLENBQWtCO0FBQUEsVUFBQSxrQkFBQSxFQUFxQixPQUFRLENBQUEsQ0FBQSxDQUE3QjtTQUFsQixFQUFQO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYixDQUFBLENBQUE7V0FFQSxLQUpXO0VBQUEsQ0EvRWYsQ0FBQTs7QUFBQSw2QkFxRkEsU0FBQSxHQUFZLFNBQUMsUUFBRCxFQUFXLE1BQVgsR0FBQTtBQUVSLFFBQUEsTUFBQTtBQUFBLElBQUEsSUFBRyxDQUFBLFFBQVMsQ0FBQyxrQkFBVixJQUFpQyxNQUFBLEtBQVUsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFqRTtBQUNJLE1BQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBeEIsQ0FESjtLQUFBLE1BR0ssSUFBRyxRQUFBLEtBQVksSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUEvQixJQUEyQyxNQUFBLEtBQVUsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUEzRTtBQUNELE1BQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixFQUFBLEdBQUUsQ0FBQyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQXBCLENBQUYsR0FBMEIsR0FBMUIsR0FBNEIsQ0FBQyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQXBCLENBQXRELEVBQWlGLEVBQUEsR0FBRSxDQUFDLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBbkIsQ0FBRixHQUF5QixHQUF6QixHQUEyQixDQUFDLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBbkIsQ0FBNUcsQ0FBVCxDQURDO0tBQUEsTUFHQSxJQUFHLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQTdCLElBQXNDLE1BQUEsS0FBVSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQXRFO0FBRUQsTUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFELENBQUEsQ0FBVCxDQUZDO0tBQUEsTUFBQTtBQU9ELE1BQUEsTUFBQSxHQUFTLElBQUMsQ0FBQSxnQkFBRCxDQUFBLENBQVQsQ0FQQztLQU5MO1dBZUEsT0FqQlE7RUFBQSxDQXJGWixDQUFBOztBQUFBLDZCQXdHQSx3QkFBQSxHQUEyQixTQUFDLFFBQUQsRUFBVyxRQUFYLEdBQUE7QUFFdkIsUUFBQSwyRUFBQTtBQUFBLElBQUEsY0FBQSxHQUFpQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQXRCLENBQWdDO0FBQUEsTUFBQSxJQUFBLEVBQU8sUUFBUDtLQUFoQyxDQUFqQixDQUFBO0FBQUEsSUFDQSxpQkFBQSxHQUFvQixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQXRCLENBQThCLGNBQTlCLENBRHBCLENBQUE7QUFBQSxJQUdBLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUF0QixDQUFnQztBQUFBLE1BQUEsSUFBQSxFQUFPLFFBQVA7S0FBaEMsQ0FIaEIsQ0FBQTtBQUFBLElBSUEsZ0JBQUEsR0FBbUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUF0QixDQUE4QixhQUE5QixDQUpuQixDQUFBO0FBQUEsSUFNQSxPQUFBLEdBQWEsaUJBQUEsR0FBb0IsZ0JBQXZCLEdBQTZDLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBNUQsR0FBNkUsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQU50RyxDQUFBO1dBUUEsUUFWdUI7RUFBQSxDQXhHM0IsQ0FBQTs7QUFBQSw2QkFvSEEsZ0JBQUEsR0FBbUIsU0FBQSxHQUFBO0FBRWYsUUFBQSxPQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxJQUFDLENBQUEsYUFBWCxDQUEwQixDQUFBLENBQUEsQ0FBcEMsQ0FBQTtXQUVBLFFBSmU7RUFBQSxDQXBIbkIsQ0FBQTs7QUFBQSw2QkEwSEEsV0FBQSxHQUFjLFNBQUMsTUFBRCxHQUFBO0FBRVYsSUFBQSxJQUFDLENBQUEsTUFBTSxDQUFDLEdBQVIsQ0FBWSxNQUFaLENBQUEsQ0FBQTtXQUVBLEtBSlU7RUFBQSxDQTFIZCxDQUFBOztBQUFBLDZCQWdJQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRUgsSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFFBQUwsQ0FBYyxNQUFkLENBQUEsQ0FBQTtXQUVBLEtBSkc7RUFBQSxDQWhJUCxDQUFBOztBQUFBLDZCQXNJQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRUgsSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFdBQUwsQ0FBaUIsTUFBakIsQ0FBQSxDQUFBO1dBRUEsS0FKRztFQUFBLENBdElQLENBQUE7O0FBQUEsNkJBNElBLEtBQUEsR0FBSyxTQUFDLEVBQUQsR0FBQTtBQUVELElBQUEsSUFBQyxDQUFBLElBQUQsQ0FBQSxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxNQUFNLENBQUMsSUFBUixDQUFhLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsRUFBSSxFQUFKLEdBQUE7QUFDVCxZQUFBLE1BQUE7QUFBQSxRQUFBLE1BQUEsR0FBUztBQUFBLFVBQUEsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUFaO1NBQVQsQ0FBQTtBQUFBLFFBQ0EsTUFBTSxDQUFDLEtBQVAsR0FBZSxDQUFBLEdBQUksR0FEbkIsQ0FBQTtBQUFBLFFBRUEsTUFBTyxDQUFBLEtBQUMsQ0FBQSxZQUFZLENBQUMsSUFBZCxDQUFQLEdBQTZCLE1BRjdCLENBQUE7QUFHQSxRQUFBLElBQUcsQ0FBQSxLQUFLLENBQVI7QUFBZSxVQUFBLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFNBQUEsR0FBQTtBQUMvQixZQUFBLEtBQUMsQ0FBQSxXQUFELENBQWEsS0FBQyxDQUFBLFlBQVksQ0FBQyxHQUEzQixDQUFBLENBQUE7OENBQ0EsY0FGK0I7VUFBQSxDQUFwQixDQUFmO1NBSEE7ZUFPQSxTQUFTLENBQUMsRUFBVixDQUFhLENBQUEsQ0FBRSxFQUFGLENBQWIsRUFBb0IsR0FBcEIsRUFBeUIsTUFBekIsRUFSUztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWIsQ0FGQSxDQUFBO1dBWUEsS0FkQztFQUFBLENBNUlMLENBQUE7O0FBQUEsNkJBNEpBLEdBQUEsR0FBTSxTQUFDLEVBQUQsR0FBQTtBQUVGLElBQUEsSUFBQyxDQUFBLE1BQU0sQ0FBQyxJQUFSLENBQWEsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsQ0FBRCxFQUFJLEVBQUosR0FBQTtBQUNULFlBQUEsTUFBQTtBQUFBLFFBQUEsTUFBQSxHQUFTO0FBQUEsVUFBQSxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQVo7U0FBVCxDQUFBO0FBQUEsUUFDQSxNQUFNLENBQUMsS0FBUCxHQUFlLEdBQUEsR0FBTSxDQUFDLEdBQUEsR0FBTSxDQUFQLENBRHJCLENBQUE7QUFBQSxRQUVBLE1BQU8sQ0FBQSxLQUFDLENBQUEsWUFBWSxDQUFDLElBQWQsQ0FBUCxHQUE2QixHQUY3QixDQUFBO0FBR0EsUUFBQSxJQUFHLENBQUEsS0FBSyxDQUFSO0FBQWUsVUFBQSxNQUFNLENBQUMsVUFBUCxHQUFvQixTQUFBLEdBQUE7QUFDL0IsWUFBQSxLQUFDLENBQUEsSUFBRCxDQUFBLENBQUEsQ0FBQTs4Q0FDQSxjQUYrQjtVQUFBLENBQXBCLENBQWY7U0FIQTtlQU9BLFNBQVMsQ0FBQyxFQUFWLENBQWEsQ0FBQSxDQUFFLEVBQUYsQ0FBYixFQUFvQixHQUFwQixFQUF5QixNQUF6QixFQVJTO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYixDQUFBLENBQUE7V0FVQSxLQVpFO0VBQUEsQ0E1Sk4sQ0FBQTs7MEJBQUE7O0dBRjJCLGFBSi9CLENBQUE7O0FBQUEsTUFnTE0sQ0FBQyxPQUFQLEdBQWlCLGdCQWhMakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLDZDQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBdUIsT0FBQSxDQUFRLGlCQUFSLENBQXZCLENBQUE7O0FBQUEsb0JBQ0EsR0FBdUIsT0FBQSxDQUFRLGtDQUFSLENBRHZCLENBQUE7O0FBQUE7QUFLQyw4QkFBQSxDQUFBOztBQUFBLHNCQUFBLEVBQUEsR0FBa0IsSUFBbEIsQ0FBQTs7QUFBQSxzQkFFQSxlQUFBLEdBQWtCLEdBRmxCLENBQUE7O0FBQUEsc0JBSUEsZUFBQSxHQUFrQixDQUpsQixDQUFBOztBQUFBLHNCQUtBLGVBQUEsR0FBa0IsQ0FMbEIsQ0FBQTs7QUFBQSxzQkFPQSxpQkFBQSxHQUFvQixFQVBwQixDQUFBOztBQUFBLHNCQVFBLGlCQUFBLEdBQW9CLEdBUnBCLENBQUE7O0FBQUEsc0JBVUEsa0JBQUEsR0FBcUIsRUFWckIsQ0FBQTs7QUFBQSxzQkFXQSxrQkFBQSxHQUFxQixHQVhyQixDQUFBOztBQUFBLHNCQWFBLEtBQUEsR0FBUSx1RUFBdUUsQ0FBQyxLQUF4RSxDQUE4RSxFQUE5RSxDQWJSLENBQUE7O0FBZWMsRUFBQSxtQkFBQSxHQUFBO0FBRWIsdURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLDJEQUFBLENBQUE7QUFBQSxtRUFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBWSxDQUFBLENBQUUsWUFBRixDQUFaLENBQUEsQ0FBQTtBQUFBLElBRUEseUNBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTmE7RUFBQSxDQWZkOztBQUFBLHNCQXVCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsU0FBRCxHQUFhLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGlCQUFWLENBQWIsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxlQUFWLENBRFIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxlQUFWLENBRlIsQ0FBQTtXQUlBLEtBTk07RUFBQSxDQXZCUCxDQUFBOztBQUFBLHNCQStCQSxrQkFBQSxHQUFxQixTQUFFLEVBQUYsR0FBQTtBQUVwQixJQUZxQixJQUFDLENBQUEsS0FBQSxFQUV0QixDQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLGlCQUFaLENBQUEsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLEdBQ0EsQ0FBQyxJQURGLENBQ08sYUFEUCxDQUVFLENBQUMsTUFGSCxDQUFBLENBR0UsQ0FBQyxHQUhILENBQUEsQ0FJQyxDQUFDLFFBSkYsQ0FJVyxnQkFKWCxDQUxBLENBQUE7QUFBQSxJQVdBLG9CQUFvQixDQUFDLElBQUQsQ0FBcEIsQ0FBd0IsSUFBQyxDQUFBLFNBQXpCLEVBQW9DLE9BQXBDLEVBQTZDLEtBQTdDLEVBQW9ELElBQUMsQ0FBQSxJQUFyRCxDQVhBLENBQUE7V0FhQSxLQWZvQjtFQUFBLENBL0JyQixDQUFBOztBQUFBLHNCQWdEQSxjQUFBLEdBQWlCLFNBQUEsR0FBQTs7TUFFaEIsSUFBQyxDQUFBO0tBQUQ7V0FFQSxLQUpnQjtFQUFBLENBaERqQixDQUFBOztBQUFBLHNCQXNEQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFZLElBQUMsQ0FBQSxjQUFiLENBQUEsQ0FBQTtXQUVBLEtBSk07RUFBQSxDQXREUCxDQUFBOztBQUFBLHNCQTREQSxjQUFBLEdBQWlCLFNBQUEsR0FBQTs7TUFFaEIsSUFBQyxDQUFBO0tBQUQ7V0FFQSxLQUpnQjtFQUFBLENBNURqQixDQUFBOztBQUFBLHNCQWtFQSxVQUFBLEdBQWEsU0FBQyxFQUFELEdBQUE7QUFPWixJQUFBLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO0FBQ1YsWUFBQSxPQUFBO0FBQUEsUUFBQSxPQUFBLEdBQVUsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxjQUFjLENBQUMsS0FBZixDQUFxQixFQUFyQixDQUFWLENBQW1DLENBQUMsSUFBcEMsQ0FBeUMsRUFBekMsQ0FBVixDQUFBO2VBQ0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsT0FBeEIsRUFBaUMsS0FBQyxDQUFBLFNBQWxDLEVBQTZDLE9BQTdDLEVBQXNELEtBQXRELEVBQTZELFNBQUEsR0FBQTtpQkFBRyxLQUFDLENBQUEsWUFBRCxDQUFjLEVBQWQsRUFBSDtRQUFBLENBQTdELEVBRlU7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBR0UsSUFIRixDQUFBLENBQUE7V0FLQSxLQVpZO0VBQUEsQ0FsRWIsQ0FBQTs7QUFBQSxzQkFnRkEsWUFBQSxHQUFlLFNBQUMsRUFBRCxHQUFBO0FBRWQsSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxJQUFkLEVBQW9CLEdBQXBCLEVBQXlCO0FBQUEsTUFBRSxLQUFBLEVBQVEsR0FBVjtBQUFBLE1BQWUsS0FBQSxFQUFRLE1BQXZCO0FBQUEsTUFBK0IsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUEzQztLQUF6QixDQUFBLENBQUE7QUFBQSxJQUNBLFNBQVMsQ0FBQyxFQUFWLENBQWEsSUFBQyxDQUFBLElBQWQsRUFBb0IsR0FBcEIsRUFBeUI7QUFBQSxNQUFFLEtBQUEsRUFBUSxHQUFWO0FBQUEsTUFBZSxNQUFBLEVBQVMsTUFBeEI7QUFBQSxNQUFnQyxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQTVDO0tBQXpCLENBREEsQ0FBQTtBQUFBLElBR0EsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsSUFBZCxFQUFvQixHQUFwQixFQUF5QjtBQUFBLE1BQUUsS0FBQSxFQUFRLEdBQVY7QUFBQSxNQUFlLEtBQUEsRUFBUSxNQUF2QjtBQUFBLE1BQStCLElBQUEsRUFBTyxJQUFJLENBQUMsT0FBM0M7S0FBekIsQ0FIQSxDQUFBO0FBQUEsSUFJQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxJQUFkLEVBQW9CLEdBQXBCLEVBQXlCO0FBQUEsTUFBRSxLQUFBLEVBQVEsR0FBVjtBQUFBLE1BQWUsTUFBQSxFQUFTLE1BQXhCO0FBQUEsTUFBZ0MsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUE1QztBQUFBLE1BQXFELFVBQUEsRUFBYSxFQUFsRTtLQUF6QixDQUpBLENBQUE7QUFBQSxJQU1BLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQ1Ysb0JBQW9CLENBQUMsSUFBRCxDQUFwQixDQUF3QixLQUFDLENBQUEsU0FBekIsRUFBb0MsRUFBcEMsRUFBd0MsS0FBeEMsRUFEVTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFFRSxHQUZGLENBTkEsQ0FBQTtBQUFBLElBVUEsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFDVixLQUFDLENBQUEsR0FBRyxDQUFDLFdBQUwsQ0FBaUIsZ0JBQWpCLEVBRFU7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBRUUsSUFGRixDQVZBLENBQUE7V0FjQSxLQWhCYztFQUFBLENBaEZmLENBQUE7O21CQUFBOztHQUZ1QixhQUh4QixDQUFBOztBQUFBLE1BdUdNLENBQUMsT0FBUCxHQUFpQixTQXZHakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHVGQUFBO0VBQUE7O2lTQUFBOztBQUFBLFlBQUEsR0FBcUIsT0FBQSxDQUFRLGlCQUFSLENBQXJCLENBQUE7O0FBQUEsUUFDQSxHQUFxQixPQUFBLENBQVEsa0JBQVIsQ0FEckIsQ0FBQTs7QUFBQSxhQUVBLEdBQXFCLE9BQUEsQ0FBUSw0QkFBUixDQUZyQixDQUFBOztBQUFBLGtCQUdBLEdBQXFCLE9BQUEsQ0FBUSxzQ0FBUixDQUhyQixDQUFBOztBQUFBLGNBSUEsR0FBcUIsT0FBQSxDQUFRLDhCQUFSLENBSnJCLENBQUE7O0FBQUEsR0FLQSxHQUFxQixPQUFBLENBQVEsa0JBQVIsQ0FMckIsQ0FBQTs7QUFBQTtBQVNDLDRCQUFBLENBQUE7O0FBQUEsb0JBQUEsY0FBQSxHQUFrQixNQUFsQixDQUFBOztBQUFBLG9CQUVBLFFBQUEsR0FBVyxTQUZYLENBQUE7O0FBQUEsb0JBSUEsS0FBQSxHQUFpQixJQUpqQixDQUFBOztBQUFBLG9CQUtBLFlBQUEsR0FBaUIsSUFMakIsQ0FBQTs7QUFBQSxvQkFNQSxXQUFBLEdBQWlCLElBTmpCLENBQUE7O0FBQUEsb0JBUUEsYUFBQSxHQUFnQixJQVJoQixDQUFBOztBQVVjLEVBQUEsaUJBQUEsR0FBQTtBQUViLDZEQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSxtREFBQSxDQUFBO0FBQUEseUNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSwyREFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLHlEQUFBLENBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxLQUFELEdBQ0M7QUFBQSxNQUFBLElBQUEsRUFBYTtBQUFBLFFBQUEsUUFBQSxFQUFXLFFBQVg7QUFBQSxRQUErQixLQUFBLEVBQVEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUExRDtBQUFBLFFBQXNFLElBQUEsRUFBTyxJQUE3RTtBQUFBLFFBQW1GLElBQUEsRUFBTyxJQUFDLENBQUEsY0FBM0Y7T0FBYjtBQUFBLE1BQ0EsS0FBQSxFQUFhO0FBQUEsUUFBQSxRQUFBLEVBQVcsYUFBWDtBQUFBLFFBQStCLEtBQUEsRUFBUSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQTFEO0FBQUEsUUFBc0UsSUFBQSxFQUFPLElBQTdFO0FBQUEsUUFBbUYsSUFBQSxFQUFPLElBQUMsQ0FBQSxjQUEzRjtPQURiO0FBQUEsTUFFQSxVQUFBLEVBQWE7QUFBQSxRQUFBLFFBQUEsRUFBVyxrQkFBWDtBQUFBLFFBQStCLEtBQUEsRUFBUSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQTFEO0FBQUEsUUFBc0UsSUFBQSxFQUFPLElBQTdFO0FBQUEsUUFBbUYsSUFBQSxFQUFPLElBQUMsQ0FBQSxjQUEzRjtPQUZiO0FBQUEsTUFHQSxNQUFBLEVBQWE7QUFBQSxRQUFBLFFBQUEsRUFBVyxjQUFYO0FBQUEsUUFBK0IsS0FBQSxFQUFRLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBMUQ7QUFBQSxRQUFzRSxJQUFBLEVBQU8sSUFBN0U7QUFBQSxRQUFtRixJQUFBLEVBQU8sSUFBQyxDQUFBLGNBQTNGO09BSGI7S0FERCxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsYUFBRCxDQUFBLENBTkEsQ0FBQTtBQUFBLElBUUEsdUNBQUEsQ0FSQSxDQUFBO0FBYUEsV0FBTyxJQUFQLENBZmE7RUFBQSxDQVZkOztBQUFBLG9CQTJCQSxhQUFBLEdBQWdCLFNBQUEsR0FBQTtBQUVmLFFBQUEsZ0JBQUE7QUFBQTtBQUFBLFNBQUEsWUFBQTt3QkFBQTtBQUFBLE1BQUMsSUFBQyxDQUFBLEtBQU0sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFiLEdBQW9CLEdBQUEsQ0FBQSxJQUFLLENBQUEsS0FBTSxDQUFBLElBQUEsQ0FBSyxDQUFDLFFBQXRDLENBQUE7QUFBQSxLQUFBO1dBRUEsS0FKZTtFQUFBLENBM0JoQixDQUFBOztBQUFBLG9CQWlDQSxVQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVgsUUFBQSwwQkFBQTtBQUFBO0FBQUE7U0FBQSxZQUFBO3dCQUFBO0FBQ0MsTUFBQSxJQUFHLElBQUksQ0FBQyxJQUFMLEtBQWEsSUFBQyxDQUFBLGNBQWpCO3NCQUFxQyxJQUFDLENBQUEsUUFBRCxDQUFVLElBQUksQ0FBQyxJQUFmLEdBQXJDO09BQUEsTUFBQTs4QkFBQTtPQUREO0FBQUE7b0JBRlc7RUFBQSxDQWpDYixDQUFBOztBQUFBLEVBc0NDLElBdENELENBQUE7O0FBQUEsb0JBd0NBLGNBQUEsR0FBaUIsU0FBQyxLQUFELEdBQUE7QUFFaEIsUUFBQSxnQkFBQTtBQUFBO0FBQUEsU0FBQSxZQUFBO3dCQUFBO0FBQ0MsTUFBQSxJQUF1QixLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQU0sQ0FBQSxJQUFBLENBQUssQ0FBQyxLQUE3QztBQUFBLGVBQU8sSUFBQyxDQUFBLEtBQU0sQ0FBQSxJQUFBLENBQWQsQ0FBQTtPQUREO0FBQUEsS0FBQTtXQUdBLEtBTGdCO0VBQUEsQ0F4Q2pCLENBQUE7O0FBQUEsb0JBK0NBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFkLENBQWlCLE9BQWpCLEVBQTBCLElBQUMsQ0FBQSxLQUEzQixDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0EvQ1AsQ0FBQTs7QUFBQSxvQkFxREEsS0FBQSxHQUFRLFNBQUEsR0FBQTtBQUVQLElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLEdBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsSUFBQyxDQUFBLEtBQTVCLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUZBLENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FIQSxDQUFBO1dBS0EsS0FQTztFQUFBLENBckRSLENBQUE7O0FBQUEsb0JBOERBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWixJQUFBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFWLENBQWEsR0FBRyxDQUFDLGlCQUFqQixFQUFvQyxJQUFDLENBQUEsVUFBckMsQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsRUFBVixDQUFhLEdBQUcsQ0FBQyxxQkFBakIsRUFBd0MsSUFBQyxDQUFBLGFBQXpDLENBREEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLEVBQWQsQ0FBaUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLHVCQUEvQixFQUF3RCxJQUFDLENBQUEsVUFBekQsQ0FIQSxDQUFBO1dBS0EsS0FQWTtFQUFBLENBOURiLENBQUE7O0FBQUEsb0JBdUVBLFVBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWixJQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsR0FBTCxDQUFTLFlBQVQsRUFBdUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUExQyxDQUFBLENBQUE7V0FFQSxLQUpZO0VBQUEsQ0F2RWIsQ0FBQTs7QUFBQSxvQkE2RUEsVUFBQSxHQUFhLFNBQUMsUUFBRCxFQUFXLE9BQVgsR0FBQTtBQUVaLElBQUEsSUFBRyxJQUFDLENBQUEsYUFBRCxJQUFtQixJQUFDLENBQUEsYUFBYSxDQUFDLEtBQWYsQ0FBQSxDQUFBLEtBQTRCLFVBQWxEO0FBQ0MsTUFBRyxDQUFBLFNBQUEsS0FBQSxHQUFBO2VBQUEsQ0FBQSxTQUFDLFFBQUQsRUFBVyxPQUFYLEdBQUE7aUJBQXVCLEtBQUMsQ0FBQSxhQUFhLENBQUMsSUFBZixDQUFvQixTQUFBLEdBQUE7bUJBQUcsS0FBQyxDQUFBLFVBQUQsQ0FBWSxRQUFaLEVBQXNCLE9BQXRCLEVBQUg7VUFBQSxDQUFwQixFQUF2QjtRQUFBLENBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBSCxDQUFJLFFBQUosRUFBYyxPQUFkLENBQUEsQ0FBQTtBQUNBLFlBQUEsQ0FGRDtLQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsWUFBRCxHQUFnQixJQUFDLENBQUEsY0FBRCxDQUFnQixRQUFRLENBQUMsSUFBekIsQ0FKaEIsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLFdBQUQsR0FBZ0IsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsT0FBTyxDQUFDLElBQXhCLENBTGhCLENBQUE7QUFPQSxJQUFBLElBQUcsQ0FBQSxJQUFFLENBQUEsWUFBTDtBQUNDLE1BQUEsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsS0FBakIsRUFBd0IsSUFBQyxDQUFBLFdBQXpCLENBQUEsQ0FERDtLQUFBLE1BQUE7QUFHQyxNQUFBLElBQUMsQ0FBQSxlQUFELENBQWlCLElBQUMsQ0FBQSxZQUFsQixFQUFnQyxJQUFDLENBQUEsV0FBakMsQ0FBQSxDQUhEO0tBUEE7V0FZQSxLQWRZO0VBQUEsQ0E3RWIsQ0FBQTs7QUFBQSxvQkE2RkEsYUFBQSxHQUFnQixTQUFDLE9BQUQsR0FBQTtBQUVmLElBQUEsSUFBQyxDQUFBLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBbEIsQ0FBMEIsR0FBRyxDQUFDLHFCQUE5QixFQUFxRCxPQUFPLENBQUMsR0FBN0QsQ0FBQSxDQUFBO1dBRUEsS0FKZTtFQUFBLENBN0ZoQixDQUFBOztBQUFBLG9CQW1HQSxlQUFBLEdBQWtCLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTtBQUVqQixJQUFBLElBQUMsQ0FBQSxhQUFELEdBQWlCLENBQUMsQ0FBQyxRQUFGLENBQUEsQ0FBakIsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFBLElBQVMsRUFBWjtBQUNDLE1BQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUEzQixDQUFtQyxJQUFJLENBQUMsS0FBeEMsRUFBK0MsRUFBRSxDQUFDLEtBQWxELENBQUEsQ0FBQTtBQUFBLE1BQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFELENBQTFCLENBQThCLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFBLEdBQUE7aUJBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFWLENBQWUsU0FBQSxHQUFBO21CQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBUixDQUFhLFNBQUEsR0FBQTtxQkFBRyxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQTNCLENBQStCLFNBQUEsR0FBQTt1QkFBRyxLQUFDLENBQUEsYUFBYSxDQUFDLE9BQWYsQ0FBQSxFQUFIO2NBQUEsQ0FBL0IsRUFBSDtZQUFBLENBQWIsRUFBSDtVQUFBLENBQWYsRUFBSDtRQUFBLEVBQUE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCLENBREEsQ0FERDtLQUFBLE1BR0ssSUFBRyxJQUFIO0FBQ0osTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQVYsQ0FBZSxJQUFDLENBQUEsYUFBYSxDQUFDLE9BQTlCLENBQUEsQ0FESTtLQUFBLE1BRUEsSUFBRyxFQUFIO0FBQ0osTUFBQSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQVIsQ0FBYSxJQUFDLENBQUEsYUFBYSxDQUFDLE9BQTVCLENBQUEsQ0FESTtLQVBMO1dBVUEsS0FaaUI7RUFBQSxDQW5HbEIsQ0FBQTs7aUJBQUE7O0dBRnFCLGFBUHRCLENBQUE7O0FBQUEsTUEwSE0sQ0FBQyxPQUFQLEdBQWlCLE9BMUhqQixDQUFBOzs7OztBQ0FBLElBQUEsb0NBQUE7RUFBQTtpU0FBQTs7QUFBQSxnQkFBQSxHQUFtQixPQUFBLENBQVEscUJBQVIsQ0FBbkIsQ0FBQTs7QUFBQTtBQUlDLHVDQUFBLENBQUE7O0FBQUEsK0JBQUEsUUFBQSxHQUFXLGlCQUFYLENBQUE7O0FBRWMsRUFBQSw0QkFBQSxHQUFBO0FBRWIsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUNDO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsaUJBQWpCLENBQVA7S0FERCxDQUFBO0FBR0E7QUFBQTs7Ozs7T0FIQTtBQUFBLElBV0Esa0RBQUEsQ0FYQSxDQUFBO0FBYUE7QUFBQTs7Ozs7O09BYkE7QUFzQkEsV0FBTyxJQUFQLENBeEJhO0VBQUEsQ0FGZDs7NEJBQUE7O0dBRmdDLGlCQUZqQyxDQUFBOztBQUFBLE1BZ0NNLENBQUMsT0FBUCxHQUFpQixrQkFoQ2pCLENBQUE7Ozs7O0FDQUEsSUFBQSxnQ0FBQTtFQUFBOztpU0FBQTs7QUFBQSxnQkFBQSxHQUFtQixPQUFBLENBQVEscUJBQVIsQ0FBbkIsQ0FBQTs7QUFBQTtBQUlDLG1DQUFBLENBQUE7O0FBQUEsMkJBQUEsUUFBQSxHQUFXLGFBQVgsQ0FBQTs7QUFBQSwyQkFDQSxLQUFBLEdBQVcsSUFEWCxDQUFBOztBQUdjLEVBQUEsd0JBQUEsR0FBQTtBQUViLGlEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUNDO0FBQUEsTUFBQSxJQUFBLEVBQU8sSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsTUFBTSxDQUFDLEdBQWIsQ0FBaUIsYUFBakIsQ0FBUDtLQURELENBQUE7QUFHQTtBQUFBOzs7OztPQUhBO0FBQUEsSUFXQSw4Q0FBQSxDQVhBLENBQUE7QUFhQTtBQUFBOzs7Ozs7T0FiQTtBQXNCQSxXQUFPLElBQVAsQ0F4QmE7RUFBQSxDQUhkOztBQUFBLDJCQTZCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsS0FBRCxHQUFTLElBQUMsQ0FBQSxTQUFELENBQUEsQ0FBVCxDQUFBO0FBQUEsSUFFQSwwQ0FBQSxTQUFBLENBRkEsQ0FBQTtXQUlBLEtBTk07RUFBQSxDQTdCUCxDQUFBOztBQUFBLDJCQXFDQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVgsUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQVMsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUF0QixDQUFzQyxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQWxCLEdBQXNCLEdBQXRCLEdBQTBCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBbEYsQ0FBVCxDQUFBO1dBRUEsT0FKVztFQUFBLENBckNaLENBQUE7O3dCQUFBOztHQUY0QixpQkFGN0IsQ0FBQTs7QUFBQSxNQStDTSxDQUFDLE9BQVAsR0FBaUIsY0EvQ2pCLENBQUE7Ozs7O0FDQUEsSUFBQSxnREFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQXVCLE9BQUEsQ0FBUSxpQkFBUixDQUF2QixDQUFBOztBQUFBLG9CQUNBLEdBQXVCLE9BQUEsQ0FBUSxrQ0FBUixDQUR2QixDQUFBOztBQUFBO0FBS0MsaUNBQUEsQ0FBQTs7QUFBQSx5QkFBQSxRQUFBLEdBQVcsZ0JBQVgsQ0FBQTs7QUFFYyxFQUFBLHNCQUFFLEtBQUYsRUFBVSxrQkFBVixHQUFBO0FBRWIsSUFGYyxJQUFDLENBQUEsUUFBQSxLQUVmLENBQUE7QUFBQSxJQUZzQixJQUFDLENBQUEscUJBQUEsa0JBRXZCLENBQUE7QUFBQSxxREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQixDQUFDLENBQUMsTUFBRixDQUFTLEVBQVQsRUFBYSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsQ0FBQSxDQUFiLENBQWhCLENBQUE7QUFBQSxJQUVBLCtDQUFBLFNBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTmE7RUFBQSxDQUZkOztBQUFBLHlCQVVBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsK0JBQVYsQ0FBZixDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsV0FBRCxHQUFlLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLHdCQUFWLENBRGYsQ0FBQTtXQUdBLEtBTE07RUFBQSxDQVZQLENBQUE7O0FBQUEseUJBaUJBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsSUFBQyxDQUFBLEdBQUksQ0FBQSxPQUFBLENBQUwsQ0FBYyxXQUFkLEVBQTJCLElBQUMsQ0FBQSxXQUE1QixDQUFBLENBQUE7V0FFQSxLQUpjO0VBQUEsQ0FqQmYsQ0FBQTs7QUFBQSx5QkF1QkEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVOLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsV0FBZCxDQUFBLENBQUE7QUFBQSxJQUVBLG9CQUFvQixDQUFDLEVBQXJCLENBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBeEIsRUFBbUQsSUFBQyxDQUFBLFdBQXBELEVBQWlFLE1BQWpFLENBRkEsQ0FBQTtBQUFBLElBR0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUF4QixFQUE0QyxJQUFDLENBQUEsV0FBN0MsRUFBMEQsTUFBMUQsQ0FIQSxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQsQ0FMQSxDQUFBO1dBT0EsS0FUTTtFQUFBLENBdkJQLENBQUE7O0FBQUEseUJBa0NBLFdBQUEsR0FBYyxTQUFBLEdBQUE7QUFFYixJQUFBLG9CQUFvQixDQUFDLEVBQXJCLENBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLGFBQVgsQ0FBeEIsRUFBbUQsSUFBQyxDQUFBLFdBQXBELEVBQWlFLE1BQWpFLENBQUEsQ0FBQTtBQUFBLElBQ0Esb0JBQW9CLENBQUMsRUFBckIsQ0FBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsTUFBWCxDQUF4QixFQUE0QyxJQUFDLENBQUEsV0FBN0MsRUFBMEQsTUFBMUQsQ0FEQSxDQUFBO1dBR0EsS0FMYTtFQUFBLENBbENkLENBQUE7O3NCQUFBOztHQUYwQixhQUgzQixDQUFBOztBQUFBLE1BOENNLENBQUMsT0FBUCxHQUFpQixZQTlDakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLHdDQUFBO0VBQUE7O2lTQUFBOztBQUFBLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUixDQUFuQixDQUFBOztBQUFBLFlBQ0EsR0FBbUIsT0FBQSxDQUFRLGdCQUFSLENBRG5CLENBQUE7O0FBQUE7QUFPQyw2QkFBQSxDQUFBOztBQUFBLEVBQUEsUUFBQyxDQUFBLGtCQUFELEdBQXNCLEtBQXRCLENBQUE7O0FBQUEsRUFDQSxRQUFDLENBQUEsU0FBRCxHQUFhLEVBRGIsQ0FBQTs7QUFBQSxFQUVBLFFBQUMsQ0FBQSxJQUFELEdBQ0M7QUFBQSxJQUFBLElBQUEsRUFBWTtBQUFBLE1BQUEsQ0FBQSxFQUFHLEdBQUg7QUFBQSxNQUFRLENBQUEsRUFBRyxHQUFYO0FBQUEsTUFBZ0IsTUFBQSxFQUFRLEVBQXhCO0FBQUEsTUFBNEIsQ0FBQSxFQUFHLENBQS9CO0tBQVo7QUFBQSxJQUNBLFNBQUEsRUFBWTtBQUFBLE1BQUEsQ0FBQSxFQUFHLENBQUg7QUFBQSxNQUFNLENBQUEsRUFBRyxDQUFUO0FBQUEsTUFBWSxDQUFBLEVBQUcsQ0FBZjtLQURaO0dBSEQsQ0FBQTs7QUFBQSxFQUtBLFFBQUMsQ0FBQSxRQUFELEdBQVksQ0FMWixDQUFBOztBQUFBLEVBTUEsUUFBQyxDQUFBLGNBQUQsR0FBa0IsQ0FObEIsQ0FBQTs7QUFBQSxFQVFBLFFBQUMsQ0FBQSxrQkFBRCxHQUFzQixHQVJ0QixDQUFBOztBQUFBLHFCQVVBLFFBQUEsR0FBZ0IsV0FWaEIsQ0FBQTs7QUFBQSxxQkFXQSxhQUFBLEdBQWdCLGtCQVhoQixDQUFBOztBQUFBLHFCQWFBLFVBQUEsR0FBYSxJQWJiLENBQUE7O0FBZWMsRUFBQSxrQkFBQSxHQUFBO0FBRWIseURBQUEsQ0FBQTtBQUFBLG1EQUFBLENBQUE7QUFBQSx1RkFBQSxDQUFBO0FBQUEsaURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSwrQ0FBQSxDQUFBO0FBQUEsK0NBQUEsQ0FBQTtBQUFBLHVEQUFBLENBQUE7QUFBQSxpREFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQUQsR0FDQztBQUFBLE1BQUEsSUFBQSxFQUFPLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFiLENBQWlCLFdBQWpCLENBQVA7S0FERCxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsVUFBRCxHQUFjLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUg1QixDQUFBO0FBQUEsSUFLQSx3Q0FBQSxDQUxBLENBQUE7QUFPQSxXQUFPLElBQVAsQ0FUYTtFQUFBLENBZmQ7O0FBQUEscUJBMEJBLElBQUEsR0FBTyxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxLQUFELEdBQVMsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsa0JBQVYsQ0FBVCxDQUFBO1dBRUEsS0FKTTtFQUFBLENBMUJQLENBQUE7O0FBQUEscUJBZ0NBLFNBQUEsR0FBWSxTQUFBLEdBQUE7QUFFWCxRQUFBLFNBQUE7QUFBQSxJQUFBLFNBQUEsR0FBWSxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVAsQ0FBQSxDQUFaLENBQUE7QUFBQSxJQUVBLFFBQVEsQ0FBQyxRQUFULEdBQW9CLElBQUksQ0FBQyxLQUFMLENBQVcsU0FBQSxHQUFZLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQTFDLENBRnBCLENBQUE7QUFBQSxJQUlBLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBZCxHQUNDO0FBQUEsTUFBQSxDQUFBLEVBQUcsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUF0QjtBQUFBLE1BQXlCLENBQUEsRUFBRyxTQUE1QjtBQUFBLE1BQXVDLENBQUEsRUFBSSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQW5CLEdBQXVCLFNBQWxFO0tBTEQsQ0FBQTtBQUFBLElBT0EsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBbkIsR0FBdUIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBbkIsR0FBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFuQixHQUF1QixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBbkIsR0FBNEIsQ0FBQyxRQUFRLENBQUMsUUFBVCxHQUFvQixDQUFyQixDQUE3QixDQUFBLEdBQXdELFFBQVEsQ0FBQyxRQUFsRSxDQUF4QixDQVA5QyxDQUFBO1dBU0EsS0FYVztFQUFBLENBaENaLENBQUE7O0FBQUEscUJBNkNBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBUSxDQUFBLE9BQUEsQ0FBZCxDQUF1QixJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsdUJBQXJDLEVBQThELElBQUMsQ0FBQSxRQUEvRCxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQVEsQ0FBQSxPQUFBLENBQWQsQ0FBdUIsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLGVBQXJDLEVBQXNELElBQUMsQ0FBQSxRQUF2RCxDQURBLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0E3Q2YsQ0FBQTs7QUFBQSxxQkFvREEsUUFBQSxHQUFXLFNBQUEsR0FBQTtBQUVWLElBQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FEQSxDQUFBO1dBR0EsS0FMVTtFQUFBLENBcERYLENBQUE7O0FBQUEscUJBMkRBLFFBQUEsR0FBVyxTQUFBLEdBQUE7QUFFVixRQUFBLFdBQUE7QUFBQSxJQUFBLFFBQVEsQ0FBQyxjQUFULEdBQTBCLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUF4QyxDQUFBO0FBQUEsSUFFQSxXQUFBLEdBQWMsSUFBQyxDQUFBLDRCQUFELENBQUEsQ0FGZCxDQUFBO0FBR0EsSUFBQSxJQUFHLFdBQUEsR0FBYyxDQUFqQjtBQUF3QixNQUFBLElBQUMsQ0FBQSxVQUFELENBQVksV0FBWixDQUFBLENBQXhCO0tBSEE7V0FLQSxLQVBVO0VBQUEsQ0EzRFgsQ0FBQTs7QUFBQSxxQkFvRUEsSUFBQSxHQUFPLFNBQUEsR0FBQTtBQUVOLElBQUEsb0NBQUEsU0FBQSxDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0FwRVAsQ0FBQTs7QUFBQSxxQkEwRUEsU0FBQSxHQUFZLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFBLENBQUE7QUFFQSxJQUFBLElBQUcsQ0FBQSxRQUFTLENBQUMsa0JBQWI7QUFDQyxNQUFBLElBQUMsQ0FBQSxVQUFELENBQVksSUFBQyxDQUFBLDRCQUFELENBQUEsQ0FBWixFQUE2QyxJQUE3QyxDQUFBLENBQUE7QUFBQSxNQUNBLFFBQVEsQ0FBQyxrQkFBVCxHQUE4QixJQUQ5QixDQUREO0tBQUEsTUFBQTtBQUlDLE1BQUEsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUF0QixDQUFnQyxRQUFRLENBQUMsY0FBekMsQ0FBQSxDQUpEO0tBRkE7V0FRQSxLQVZXO0VBQUEsQ0ExRVosQ0FBQTs7QUFBQSxxQkFzRkEsNEJBQUEsR0FBK0IsU0FBQSxHQUFBO0FBRTlCLFFBQUEsa0NBQUE7QUFBQSxJQUFBLFNBQUEsR0FBYSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUF4QixHQUE0QixDQUFDLFFBQVEsQ0FBQyxjQUFULEdBQTBCLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQW5ELENBQXpDLENBQUE7QUFBQSxJQUNBLFVBQUEsR0FBYSxDQUFDLFNBQUEsR0FBWSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFoQyxDQUFBLEdBQXFDLFFBQVEsQ0FBQyxRQUQzRCxDQUFBO0FBQUEsSUFHQSxXQUFBLEdBQWMsSUFBSSxDQUFDLEtBQUwsQ0FBVyxVQUFYLENBQUEsR0FBeUIsUUFBUSxDQUFDLFFBSGhELENBQUE7QUFBQSxJQUlBLFdBQUEsR0FBaUIsQ0FBQyxVQUFBLEdBQWEsQ0FBZCxDQUFBLEdBQW1CLFFBQVEsQ0FBQyxrQkFBL0IsR0FBdUQsV0FBQSxHQUFjLFFBQVEsQ0FBQyxRQUE5RSxHQUE0RixXQUoxRyxDQUFBO0FBTUEsV0FBTyxXQUFBLEdBQWMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUF4QyxDQVI4QjtFQUFBLENBdEYvQixDQUFBOztBQUFBLHFCQWdHQSxVQUFBLEdBQWEsU0FBQyxLQUFELEVBQVEsa0JBQVIsR0FBQTtBQUVaLFFBQUEsc0RBQUE7O01BRm9CLHFCQUFtQjtLQUV2QztBQUFBLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBYSxxQkFBQSxHQUFxQixLQUFsQyxDQUFBLENBQUE7QUFBQSxJQUVBLFFBQUEsR0FBVyxFQUZYLENBQUE7QUFJQSxTQUFXLGtLQUFYLEdBQUE7QUFFQyxNQUFBLE1BQUEsR0FBUyxJQUFDLENBQUEsVUFBVSxDQUFDLEVBQVosQ0FBZSxHQUFmLENBQVQsQ0FBQTtBQUNBLE1BQUEsSUFBUyxDQUFBLE1BQVQ7QUFBQSxjQUFBO09BREE7QUFBQSxNQUdBLFFBQVEsQ0FBQyxJQUFULENBQWtCLElBQUEsWUFBQSxDQUFhLE1BQWIsRUFBcUIsa0JBQXJCLENBQWxCLENBSEEsQ0FGRDtBQUFBLEtBSkE7QUFBQSxJQVdBLFFBQVEsQ0FBQyxTQUFULEdBQXFCLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBbkIsQ0FBMEIsUUFBMUIsQ0FYckIsQ0FBQTtBQWFBLFNBQUEsMkRBQUE7MkJBQUE7QUFFQyxNQUFBLElBQUMsQ0FBQSxRQUFELENBQVUsSUFBVixDQUFBLENBQUE7QUFBQSxNQUNBLElBQUMsQ0FBQSxhQUFELENBQWUsSUFBZixFQUFxQixHQUFyQixFQUEwQixrQkFBMUIsQ0FEQSxDQUZEO0FBQUEsS0FiQTtXQWtCQSxLQXBCWTtFQUFBLENBaEdiLENBQUE7O0FBQUEscUJBc0hBLGFBQUEsR0FBZ0IsU0FBQyxJQUFELEVBQU8sS0FBUCxFQUFjLGtCQUFkLEdBQUE7QUFFZixRQUFBLDhCQUFBOztNQUY2QixxQkFBbUI7S0FFaEQ7QUFBQSxJQUFBLFFBQUEsR0FBYSxHQUFiLENBQUE7QUFBQSxJQUNBLFVBQUEsR0FBYTtBQUFBLE1BQUEsQ0FBQSxFQUFJLENBQUksa0JBQUgsR0FBMkIsTUFBTSxDQUFDLFdBQWxDLEdBQW1ELENBQXBELENBQUo7QUFBQSxNQUE0RCxPQUFBLEVBQVUsQ0FBdEU7QUFBQSxNQUF5RSxLQUFBLEVBQVEsR0FBakY7S0FEYixDQUFBO0FBQUEsSUFFQSxRQUFBLEdBQWE7QUFBQSxNQUFBLEtBQUEsRUFBUSxDQUFDLFFBQUEsR0FBVyxHQUFaLENBQUEsR0FBbUIsS0FBM0I7QUFBQSxNQUFrQyxDQUFBLEVBQUksQ0FBdEM7QUFBQSxNQUF5QyxPQUFBLEVBQVUsQ0FBbkQ7QUFBQSxNQUFzRCxLQUFBLEVBQVEsQ0FBOUQ7QUFBQSxNQUFrRSxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQTlFO0FBQUEsTUFBdUYsVUFBQSxFQUFhLElBQUksQ0FBQyxJQUF6RztLQUZiLENBQUE7QUFBQSxJQUlBLFNBQVMsQ0FBQyxNQUFWLENBQWlCLElBQUksQ0FBQyxHQUF0QixFQUEyQixRQUEzQixFQUFxQyxVQUFyQyxFQUFpRCxRQUFqRCxDQUpBLENBQUE7V0FNQSxLQVJlO0VBQUEsQ0F0SGhCLENBQUE7O2tCQUFBOztHQUpzQixpQkFIdkIsQ0FBQTs7QUFBQSxNQXVJTSxDQUFDLE9BQVAsR0FBaUIsUUF2SWpCLENBQUE7Ozs7O0FDQUEsSUFBQSwyQkFBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSLENBQWYsQ0FBQTs7QUFBQTtBQUlDLGtDQUFBLENBQUE7O0FBQUEsMEJBQUEsT0FBQSxHQUFVLElBQVYsQ0FBQTs7QUFFQTtBQUFBLHNDQUZBOztBQUFBLDBCQUdBLElBQUEsR0FBVyxJQUhYLENBQUE7O0FBQUEsMEJBSUEsUUFBQSxHQUFXLElBSlgsQ0FBQTs7QUFNYyxFQUFBLHVCQUFBLEdBQUE7QUFFYixtREFBQSxDQUFBO0FBQUEsbURBQUEsQ0FBQTtBQUFBLGlEQUFBLENBQUE7QUFBQSw2Q0FBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLDZDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsT0FBRCxHQUFXLENBQUEsQ0FBRSxNQUFGLENBQVgsQ0FBQTtBQUFBLElBRUEsNkNBQUEsQ0FGQSxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsUUFBZCxDQUF1QixJQUF2QixDQUpBLENBQUE7QUFBQSxJQUtBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxDQUxBLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxTQUFELENBQUEsQ0FOQSxDQUFBO0FBUUEsV0FBTyxJQUFQLENBVmE7RUFBQSxDQU5kOztBQUFBLDBCQWtCQSxJQUFBLEdBQU8sU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsVUFBRCxDQUFZLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7ZUFBRyxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsTUFBZCxDQUFxQixLQUFyQixFQUFIO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWixDQUFBLENBQUE7V0FFQSxLQUpNO0VBQUEsQ0FsQlAsQ0FBQTs7QUFBQSwwQkF3QkEsT0FBQSxHQUFVLFNBQUEsR0FBQTtBQUVULElBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxLQUFkLENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLEVBQUQsQ0FBQSxDQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFPLENBQUEsSUFBQyxDQUFBLElBQUQsQ0FBTSxDQUFDLElBQXpDLEdBQWdELElBRGhELENBQUE7V0FHQSxLQUxTO0VBQUEsQ0F4QlYsQ0FBQTs7QUFBQSwwQkErQkEsWUFBQSxHQUFlLFNBQUMsT0FBRCxHQUFBO0FBRWQsSUFBQSxJQUFDLENBQUEsT0FBUSxDQUFBLE9BQUEsQ0FBVCxDQUFrQixPQUFsQixFQUEyQixJQUFDLENBQUEsT0FBNUIsQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsQ0FBRCxDQUFHLGNBQUgsQ0FBbUIsQ0FBQSxPQUFBLENBQW5CLENBQTRCLE9BQTVCLEVBQXFDLElBQUMsQ0FBQSxVQUF0QyxDQURBLENBQUE7V0FHQSxLQUxjO0VBQUEsQ0EvQmYsQ0FBQTs7QUFBQSwwQkFzQ0EsT0FBQSxHQUFVLFNBQUMsQ0FBRCxHQUFBO0FBRVQsSUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLEtBQWEsRUFBaEI7QUFBd0IsTUFBQSxJQUFDLENBQUEsSUFBRCxDQUFBLENBQUEsQ0FBeEI7S0FBQTtXQUVBLEtBSlM7RUFBQSxDQXRDVixDQUFBOztBQUFBLDBCQTRDQSxTQUFBLEdBQVksU0FBQSxHQUFBO0FBRVgsSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFkLEVBQW1CLEdBQW5CLEVBQXdCO0FBQUEsTUFBRSxZQUFBLEVBQWMsU0FBaEI7QUFBQSxNQUEyQixTQUFBLEVBQVcsQ0FBdEM7QUFBQSxNQUF5QyxJQUFBLEVBQU8sSUFBSSxDQUFDLE9BQXJEO0tBQXhCLENBQUEsQ0FBQTtBQUFBLElBQ0EsU0FBUyxDQUFDLEVBQVYsQ0FBYSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxRQUFWLENBQWIsRUFBa0MsR0FBbEMsRUFBdUM7QUFBQSxNQUFFLEtBQUEsRUFBUSxJQUFWO0FBQUEsTUFBZ0IsV0FBQSxFQUFhLFVBQTdCO0FBQUEsTUFBeUMsWUFBQSxFQUFjLFNBQXZEO0FBQUEsTUFBa0UsU0FBQSxFQUFXLENBQTdFO0FBQUEsTUFBZ0YsSUFBQSxFQUFPLElBQUksQ0FBQyxPQUE1RjtLQUF2QyxDQURBLENBQUE7V0FHQSxLQUxXO0VBQUEsQ0E1Q1osQ0FBQTs7QUFBQSwwQkFtREEsVUFBQSxHQUFhLFNBQUMsUUFBRCxHQUFBO0FBRVosSUFBQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFkLEVBQW1CLEdBQW5CLEVBQXdCO0FBQUEsTUFBRSxLQUFBLEVBQVEsSUFBVjtBQUFBLE1BQWdCLFNBQUEsRUFBVyxDQUEzQjtBQUFBLE1BQThCLElBQUEsRUFBTyxJQUFJLENBQUMsT0FBMUM7QUFBQSxNQUFtRCxVQUFBLEVBQVksUUFBL0Q7S0FBeEIsQ0FBQSxDQUFBO0FBQUEsSUFDQSxTQUFTLENBQUMsRUFBVixDQUFhLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFFBQVYsQ0FBYixFQUFrQyxHQUFsQyxFQUF1QztBQUFBLE1BQUUsV0FBQSxFQUFhLFlBQWY7QUFBQSxNQUE2QixTQUFBLEVBQVcsQ0FBeEM7QUFBQSxNQUEyQyxJQUFBLEVBQU8sSUFBSSxDQUFDLE1BQXZEO0tBQXZDLENBREEsQ0FBQTtXQUdBLEtBTFk7RUFBQSxDQW5EYixDQUFBOztBQUFBLDBCQTBEQSxVQUFBLEdBQVksU0FBRSxDQUFGLEdBQUE7QUFFWCxJQUFBLENBQUMsQ0FBQyxjQUFGLENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsSUFBRCxDQUFBLENBRkEsQ0FBQTtXQUlBLEtBTlc7RUFBQSxDQTFEWixDQUFBOzt1QkFBQTs7R0FGMkIsYUFGNUIsQ0FBQTs7QUFBQSxNQXNFTSxDQUFDLE9BQVAsR0FBaUIsYUF0RWpCLENBQUE7Ozs7O0FDQUEsSUFBQSwrQkFBQTtFQUFBOztpU0FBQTs7QUFBQSxhQUFBLEdBQWdCLE9BQUEsQ0FBUSxpQkFBUixDQUFoQixDQUFBOztBQUFBO0FBSUMscUNBQUEsQ0FBQTs7QUFBQSw2QkFBQSxJQUFBLEdBQVcsa0JBQVgsQ0FBQTs7QUFBQSw2QkFDQSxRQUFBLEdBQVcsbUJBRFgsQ0FBQTs7QUFBQSw2QkFHQSxFQUFBLEdBQVcsSUFIWCxDQUFBOztBQUtjLEVBQUEsMEJBQUUsRUFBRixHQUFBO0FBRWIsSUFGYyxJQUFDLENBQUEsS0FBQSxFQUVmLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsdURBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQjtBQUFBLE1BQUUsTUFBRCxJQUFDLENBQUEsSUFBRjtLQUFoQixDQUFBO0FBQUEsSUFFQSxnREFBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOYTtFQUFBLENBTGQ7O0FBQUEsNkJBYUEsSUFBQSxHQUFPLFNBQUEsR0FBQTtXQUVOLEtBRk07RUFBQSxDQWJQLENBQUE7O0FBQUEsNkJBaUJBLElBQUEsR0FBTyxTQUFDLGNBQUQsR0FBQTs7TUFBQyxpQkFBZTtLQUV0QjtBQUFBLElBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBWSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO0FBQ1gsUUFBQSxLQUFDLENBQUEsRUFBRCxDQUFBLENBQUssQ0FBQyxPQUFPLENBQUMsTUFBZCxDQUFxQixLQUFyQixDQUFBLENBQUE7QUFDQSxRQUFBLElBQUcsQ0FBQSxjQUFIO2tEQUF3QixLQUFDLENBQUEsY0FBekI7U0FGVztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVosQ0FBQSxDQUFBO1dBSUEsS0FOTTtFQUFBLENBakJQLENBQUE7O0FBQUEsNkJBeUJBLFlBQUEsR0FBZSxTQUFDLE9BQUQsR0FBQTtBQUVkLElBQUEsb0RBQUEsU0FBQSxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxFQUFELENBQUEsQ0FBSyxDQUFDLE9BQVEsQ0FBQSxPQUFBLENBQWQsQ0FBdUIsWUFBdkIsRUFBcUMsSUFBQyxDQUFBLFlBQXRDLENBRkEsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLEdBQUksQ0FBQSxPQUFBLENBQUwsQ0FBYyxnQkFBZCxFQUFnQyxJQUFDLENBQUEsSUFBakMsQ0FIQSxDQUFBO1dBS0EsS0FQYztFQUFBLENBekJmLENBQUE7O0FBQUEsNkJBa0NBLFlBQUEsR0FBZSxTQUFDLElBQUQsR0FBQTtBQUVkLElBQUEsSUFBRyxJQUFJLENBQUMsQ0FBTCxLQUFVLFVBQWI7QUFBNkIsTUFBQSxJQUFDLENBQUEsSUFBRCxDQUFNLEtBQU4sQ0FBQSxDQUE3QjtLQUFBO1dBRUEsS0FKYztFQUFBLENBbENmLENBQUE7OzBCQUFBOztHQUY4QixjQUYvQixDQUFBOztBQUFBLE1BNENNLENBQUMsT0FBUCxHQUFpQixnQkE1Q2pCLENBQUE7Ozs7O0FDQUEsSUFBQSw0Q0FBQTtFQUFBOztpU0FBQTs7QUFBQSxZQUFBLEdBQW1CLE9BQUEsQ0FBUSxpQkFBUixDQUFuQixDQUFBOztBQUFBLGdCQUNBLEdBQW1CLE9BQUEsQ0FBUSxvQkFBUixDQURuQixDQUFBOztBQUFBO0FBTUMsaUNBQUEsQ0FBQTs7QUFBQSx5QkFBQSxNQUFBLEdBQ0M7QUFBQSxJQUFBLGdCQUFBLEVBQW1CO0FBQUEsTUFBQSxRQUFBLEVBQVcsZ0JBQVg7QUFBQSxNQUE2QixJQUFBLEVBQU8sSUFBcEM7S0FBbkI7R0FERCxDQUFBOztBQUdjLEVBQUEsc0JBQUEsR0FBQTtBQUViLGlEQUFBLENBQUE7QUFBQSx5REFBQSxDQUFBO0FBQUEsMkNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSxJQUFBLDRDQUFBLENBQUEsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUphO0VBQUEsQ0FIZDs7QUFBQSx5QkFTQSxJQUFBLEdBQU8sU0FBQSxHQUFBO1dBRU4sS0FGTTtFQUFBLENBVFAsQ0FBQTs7QUFBQSx5QkFhQSxNQUFBLEdBQVMsU0FBQSxHQUFBO0FBRVIsUUFBQSxpQkFBQTtBQUFBO0FBQUEsU0FBQSxZQUFBO3lCQUFBO0FBQUUsTUFBQSxJQUFHLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBakI7QUFBMkIsZUFBTyxJQUFQLENBQTNCO09BQUY7QUFBQSxLQUFBO1dBRUEsTUFKUTtFQUFBLENBYlQsQ0FBQTs7QUFBQSx5QkFtQkEsYUFBQSxHQUFnQixTQUFBLEdBQUE7QUFFZixRQUFBLDRCQUFBO0FBQUE7QUFBQSxTQUFBLFlBQUE7eUJBQUE7QUFBRSxNQUFBLElBQUcsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFqQjtBQUEyQixRQUFBLFNBQUEsR0FBWSxJQUFDLENBQUEsTUFBTyxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQTFCLENBQTNCO09BQUY7QUFBQSxLQUFBOztNQUVBLFNBQVMsQ0FBRSxJQUFYLENBQUE7S0FGQTtXQUlBLEtBTmU7RUFBQSxDQW5CaEIsQ0FBQTs7QUFBQSx5QkEyQkEsU0FBQSxHQUFZLFNBQUMsSUFBRCxFQUFPLEVBQVAsR0FBQTs7TUFBTyxLQUFHO0tBRXJCO0FBQUEsSUFBQSxJQUFVLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxDQUFLLENBQUMsSUFBeEI7QUFBQSxZQUFBLENBQUE7S0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUFkLEdBQXlCLElBQUEsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLENBQUssQ0FBQyxRQUFkLENBQXVCLEVBQXZCLENBRnpCLENBQUE7V0FJQSxLQU5XO0VBQUEsQ0EzQlosQ0FBQTs7c0JBQUE7O0dBSDBCLGFBSDNCLENBQUE7O0FBQUEsTUF5Q00sQ0FBQyxPQUFQLEdBQWlCLFlBekNqQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcCA9IHJlcXVpcmUgJy4vQXBwJ1xuXG4jIFBST0RVQ1RJT04gRU5WSVJPTk1FTlQgLSBtYXkgd2FudCB0byB1c2Ugc2VydmVyLXNldCB2YXJpYWJsZXMgaGVyZVxuIyBJU19MSVZFID0gZG8gLT4gcmV0dXJuIGlmIHdpbmRvdy5sb2NhdGlvbi5ob3N0LmluZGV4T2YoJ2xvY2FsaG9zdCcpID4gLTEgb3Igd2luZG93LmxvY2F0aW9uLnNlYXJjaCBpcyAnP2QnIHRoZW4gZmFsc2UgZWxzZSB0cnVlXG5cbiMjI1xuXG5XSVAgLSB0aGlzIHdpbGwgaWRlYWxseSBjaGFuZ2UgdG8gb2xkIGZvcm1hdCAoYWJvdmUpIHdoZW4gY2FuIGZpZ3VyZSBpdCBvdXRcblxuIyMjXG5cbklTX0xJVkUgPSBmYWxzZVxuXG4jIE9OTFkgRVhQT1NFIEFQUCBHTE9CQUxMWSBJRiBMT0NBTCBPUiBERVYnSU5HXG52aWV3ID0gaWYgSVNfTElWRSB0aGVuIHt9IGVsc2UgKHdpbmRvdyBvciBkb2N1bWVudClcblxuIyBERUNMQVJFIE1BSU4gQVBQTElDQVRJT05cbnZpZXcuQ0QgPSBuZXcgQXBwIElTX0xJVkVcbnZpZXcuQ0QuaW5pdCgpXG4iLCIvKiEgaHR0cDovL210aHMuYmUvcHVueWNvZGUgdjEuMi40IGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGVzICovXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHRtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cyAmJiBtb2R1bGU7XG5cdHZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG5cdGlmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCkge1xuXHRcdHJvb3QgPSBmcmVlR2xvYmFsO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBgcHVueWNvZGVgIG9iamVjdC5cblx0ICogQG5hbWUgcHVueWNvZGVcblx0ICogQHR5cGUgT2JqZWN0XG5cdCAqL1xuXHR2YXIgcHVueWNvZGUsXG5cblx0LyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXHRtYXhJbnQgPSAyMTQ3NDgzNjQ3LCAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cblx0LyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xuXHRiYXNlID0gMzYsXG5cdHRNaW4gPSAxLFxuXHR0TWF4ID0gMjYsXG5cdHNrZXcgPSAzOCxcblx0ZGFtcCA9IDcwMCxcblx0aW5pdGlhbEJpYXMgPSA3Mixcblx0aW5pdGlhbE4gPSAxMjgsIC8vIDB4ODBcblx0ZGVsaW1pdGVyID0gJy0nLCAvLyAnXFx4MkQnXG5cblx0LyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cblx0cmVnZXhQdW55Y29kZSA9IC9eeG4tLS8sXG5cdHJlZ2V4Tm9uQVNDSUkgPSAvW14gLX5dLywgLy8gdW5wcmludGFibGUgQVNDSUkgY2hhcnMgKyBub24tQVNDSUkgY2hhcnNcblx0cmVnZXhTZXBhcmF0b3JzID0gL1xceDJFfFxcdTMwMDJ8XFx1RkYwRXxcXHVGRjYxL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdFx0YXJyYXlbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHRcdH1cblx0XHRyZXR1cm4gYXJyYXk7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZS5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHJldHVybiBtYXAoc3RyaW5nLnNwbGl0KHJlZ2V4U2VwYXJhdG9ycyksIGZuKS5qb2luKCcuJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBkZWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cblx0ICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGNvdW50ZXIgPSAwLFxuXHRcdCAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuXHRcdCAgICB2YWx1ZSxcblx0XHQgICAgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGVuY29kZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0cmV0dXJuIG1hcChhcnJheSwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHZhciBvdXRwdXQgPSAnJztcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cblx0ICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcblx0ICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdFx0aWYgKGNvZGVQb2ludCAtIDQ4IDwgMTApIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSAyMjtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDY1IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA2NTtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDk3IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA5Nztcblx0XHR9XG5cdFx0cmV0dXJuIGJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3Jcblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2Vcblx0ICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG5cdCAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG5cdCAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG5cdCAqL1xuXHRmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0XHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHRcdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRcdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG5cdH1cblxuXHQvKipcblx0ICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cblx0ICogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdFx0dmFyIGsgPSAwO1xuXHRcdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdFx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRcdGZvciAoLyogbm8gaW5pdGlhbGl6YXRpb24gKi87IGRlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdFx0fVxuXHRcdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHRcdC8vIERvbid0IHVzZSBVQ1MtMlxuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdFx0ICAgIG91dCxcblx0XHQgICAgaSA9IDAsXG5cdFx0ICAgIG4gPSBpbml0aWFsTixcblx0XHQgICAgYmlhcyA9IGluaXRpYWxCaWFzLFxuXHRcdCAgICBiYXNpYyxcblx0XHQgICAgaixcblx0XHQgICAgaW5kZXgsXG5cdFx0ICAgIG9sZGksXG5cdFx0ICAgIHcsXG5cdFx0ICAgIGssXG5cdFx0ICAgIGRpZ2l0LFxuXHRcdCAgICB0LFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgdG8gYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgdG8gVW5pY29kZS4gT25seSB0aGVcblx0ICogUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29udmVydGVkIHRvXG5cdCAqIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBQdW55Y29kZSBkb21haW4gbmFtZSB0byBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFB1bnljb2RlLiBPbmx5IHRoZVxuXHQgKiBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLCBpLmUuIGl0IGRvZXNuJ3Rcblx0ICogbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW4gQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSB0byBjb252ZXJ0LCBhcyBhIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShkb21haW4pIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGRvbWFpbiwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuMi40Jyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZSgncHVueWNvZGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fSBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiAhZnJlZUV4cG9ydHMubm9kZVR5cGUpIHtcblx0XHRpZiAoZnJlZU1vZHVsZSkgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHsgLy8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG4iLCJ2YXIgcHVueWNvZGUgPSByZXF1aXJlKCdwdW55Y29kZScpO1xudmFyIHJldkVudGl0aWVzID0gcmVxdWlyZSgnLi9yZXZlcnNlZC5qc29uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZW5jb2RlO1xuXG5mdW5jdGlvbiBlbmNvZGUgKHN0ciwgb3B0cykge1xuICAgIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhIFN0cmluZycpO1xuICAgIH1cbiAgICBpZiAoIW9wdHMpIG9wdHMgPSB7fTtcblxuICAgIHZhciBudW1lcmljID0gdHJ1ZTtcbiAgICBpZiAob3B0cy5uYW1lZCkgbnVtZXJpYyA9IGZhbHNlO1xuICAgIGlmIChvcHRzLm51bWVyaWMgIT09IHVuZGVmaW5lZCkgbnVtZXJpYyA9IG9wdHMubnVtZXJpYztcblxuICAgIHZhciBzcGVjaWFsID0gb3B0cy5zcGVjaWFsIHx8IHtcbiAgICAgICAgJ1wiJzogdHJ1ZSwgXCInXCI6IHRydWUsXG4gICAgICAgICc8JzogdHJ1ZSwgJz4nOiB0cnVlLFxuICAgICAgICAnJic6IHRydWVcbiAgICB9O1xuXG4gICAgdmFyIGNvZGVQb2ludHMgPSBwdW55Y29kZS51Y3MyLmRlY29kZShzdHIpO1xuICAgIHZhciBjaGFycyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29kZVBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2MgPSBjb2RlUG9pbnRzW2ldO1xuICAgICAgICB2YXIgYyA9IHB1bnljb2RlLnVjczIuZW5jb2RlKFsgY2MgXSk7XG4gICAgICAgIHZhciBlID0gcmV2RW50aXRpZXNbY2NdO1xuICAgICAgICBpZiAoZSAmJiAoY2MgPj0gMTI3IHx8IHNwZWNpYWxbY10pICYmICFudW1lcmljKSB7XG4gICAgICAgICAgICBjaGFycy5wdXNoKCcmJyArICgvOyQvLnRlc3QoZSkgPyBlIDogZSArICc7JykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNjIDwgMzIgfHwgY2MgPj0gMTI3IHx8IHNwZWNpYWxbY10pIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goJyYjJyArIGNjICsgJzsnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNoYXJzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpO1xufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICAgIFwiOVwiOiBcIlRhYjtcIixcbiAgICBcIjEwXCI6IFwiTmV3TGluZTtcIixcbiAgICBcIjMzXCI6IFwiZXhjbDtcIixcbiAgICBcIjM0XCI6IFwicXVvdDtcIixcbiAgICBcIjM1XCI6IFwibnVtO1wiLFxuICAgIFwiMzZcIjogXCJkb2xsYXI7XCIsXG4gICAgXCIzN1wiOiBcInBlcmNudDtcIixcbiAgICBcIjM4XCI6IFwiYW1wO1wiLFxuICAgIFwiMzlcIjogXCJhcG9zO1wiLFxuICAgIFwiNDBcIjogXCJscGFyO1wiLFxuICAgIFwiNDFcIjogXCJycGFyO1wiLFxuICAgIFwiNDJcIjogXCJtaWRhc3Q7XCIsXG4gICAgXCI0M1wiOiBcInBsdXM7XCIsXG4gICAgXCI0NFwiOiBcImNvbW1hO1wiLFxuICAgIFwiNDZcIjogXCJwZXJpb2Q7XCIsXG4gICAgXCI0N1wiOiBcInNvbDtcIixcbiAgICBcIjU4XCI6IFwiY29sb247XCIsXG4gICAgXCI1OVwiOiBcInNlbWk7XCIsXG4gICAgXCI2MFwiOiBcImx0O1wiLFxuICAgIFwiNjFcIjogXCJlcXVhbHM7XCIsXG4gICAgXCI2MlwiOiBcImd0O1wiLFxuICAgIFwiNjNcIjogXCJxdWVzdDtcIixcbiAgICBcIjY0XCI6IFwiY29tbWF0O1wiLFxuICAgIFwiOTFcIjogXCJsc3FiO1wiLFxuICAgIFwiOTJcIjogXCJic29sO1wiLFxuICAgIFwiOTNcIjogXCJyc3FiO1wiLFxuICAgIFwiOTRcIjogXCJIYXQ7XCIsXG4gICAgXCI5NVwiOiBcIlVuZGVyQmFyO1wiLFxuICAgIFwiOTZcIjogXCJncmF2ZTtcIixcbiAgICBcIjEyM1wiOiBcImxjdWI7XCIsXG4gICAgXCIxMjRcIjogXCJWZXJ0aWNhbExpbmU7XCIsXG4gICAgXCIxMjVcIjogXCJyY3ViO1wiLFxuICAgIFwiMTYwXCI6IFwiTm9uQnJlYWtpbmdTcGFjZTtcIixcbiAgICBcIjE2MVwiOiBcImlleGNsO1wiLFxuICAgIFwiMTYyXCI6IFwiY2VudDtcIixcbiAgICBcIjE2M1wiOiBcInBvdW5kO1wiLFxuICAgIFwiMTY0XCI6IFwiY3VycmVuO1wiLFxuICAgIFwiMTY1XCI6IFwieWVuO1wiLFxuICAgIFwiMTY2XCI6IFwiYnJ2YmFyO1wiLFxuICAgIFwiMTY3XCI6IFwic2VjdDtcIixcbiAgICBcIjE2OFwiOiBcInVtbDtcIixcbiAgICBcIjE2OVwiOiBcImNvcHk7XCIsXG4gICAgXCIxNzBcIjogXCJvcmRmO1wiLFxuICAgIFwiMTcxXCI6IFwibGFxdW87XCIsXG4gICAgXCIxNzJcIjogXCJub3Q7XCIsXG4gICAgXCIxNzNcIjogXCJzaHk7XCIsXG4gICAgXCIxNzRcIjogXCJyZWc7XCIsXG4gICAgXCIxNzVcIjogXCJzdHJucztcIixcbiAgICBcIjE3NlwiOiBcImRlZztcIixcbiAgICBcIjE3N1wiOiBcInBtO1wiLFxuICAgIFwiMTc4XCI6IFwic3VwMjtcIixcbiAgICBcIjE3OVwiOiBcInN1cDM7XCIsXG4gICAgXCIxODBcIjogXCJEaWFjcml0aWNhbEFjdXRlO1wiLFxuICAgIFwiMTgxXCI6IFwibWljcm87XCIsXG4gICAgXCIxODJcIjogXCJwYXJhO1wiLFxuICAgIFwiMTgzXCI6IFwibWlkZG90O1wiLFxuICAgIFwiMTg0XCI6IFwiQ2VkaWxsYTtcIixcbiAgICBcIjE4NVwiOiBcInN1cDE7XCIsXG4gICAgXCIxODZcIjogXCJvcmRtO1wiLFxuICAgIFwiMTg3XCI6IFwicmFxdW87XCIsXG4gICAgXCIxODhcIjogXCJmcmFjMTQ7XCIsXG4gICAgXCIxODlcIjogXCJoYWxmO1wiLFxuICAgIFwiMTkwXCI6IFwiZnJhYzM0O1wiLFxuICAgIFwiMTkxXCI6IFwiaXF1ZXN0O1wiLFxuICAgIFwiMTkyXCI6IFwiQWdyYXZlO1wiLFxuICAgIFwiMTkzXCI6IFwiQWFjdXRlO1wiLFxuICAgIFwiMTk0XCI6IFwiQWNpcmM7XCIsXG4gICAgXCIxOTVcIjogXCJBdGlsZGU7XCIsXG4gICAgXCIxOTZcIjogXCJBdW1sO1wiLFxuICAgIFwiMTk3XCI6IFwiQXJpbmc7XCIsXG4gICAgXCIxOThcIjogXCJBRWxpZztcIixcbiAgICBcIjE5OVwiOiBcIkNjZWRpbDtcIixcbiAgICBcIjIwMFwiOiBcIkVncmF2ZTtcIixcbiAgICBcIjIwMVwiOiBcIkVhY3V0ZTtcIixcbiAgICBcIjIwMlwiOiBcIkVjaXJjO1wiLFxuICAgIFwiMjAzXCI6IFwiRXVtbDtcIixcbiAgICBcIjIwNFwiOiBcIklncmF2ZTtcIixcbiAgICBcIjIwNVwiOiBcIklhY3V0ZTtcIixcbiAgICBcIjIwNlwiOiBcIkljaXJjO1wiLFxuICAgIFwiMjA3XCI6IFwiSXVtbDtcIixcbiAgICBcIjIwOFwiOiBcIkVUSDtcIixcbiAgICBcIjIwOVwiOiBcIk50aWxkZTtcIixcbiAgICBcIjIxMFwiOiBcIk9ncmF2ZTtcIixcbiAgICBcIjIxMVwiOiBcIk9hY3V0ZTtcIixcbiAgICBcIjIxMlwiOiBcIk9jaXJjO1wiLFxuICAgIFwiMjEzXCI6IFwiT3RpbGRlO1wiLFxuICAgIFwiMjE0XCI6IFwiT3VtbDtcIixcbiAgICBcIjIxNVwiOiBcInRpbWVzO1wiLFxuICAgIFwiMjE2XCI6IFwiT3NsYXNoO1wiLFxuICAgIFwiMjE3XCI6IFwiVWdyYXZlO1wiLFxuICAgIFwiMjE4XCI6IFwiVWFjdXRlO1wiLFxuICAgIFwiMjE5XCI6IFwiVWNpcmM7XCIsXG4gICAgXCIyMjBcIjogXCJVdW1sO1wiLFxuICAgIFwiMjIxXCI6IFwiWWFjdXRlO1wiLFxuICAgIFwiMjIyXCI6IFwiVEhPUk47XCIsXG4gICAgXCIyMjNcIjogXCJzemxpZztcIixcbiAgICBcIjIyNFwiOiBcImFncmF2ZTtcIixcbiAgICBcIjIyNVwiOiBcImFhY3V0ZTtcIixcbiAgICBcIjIyNlwiOiBcImFjaXJjO1wiLFxuICAgIFwiMjI3XCI6IFwiYXRpbGRlO1wiLFxuICAgIFwiMjI4XCI6IFwiYXVtbDtcIixcbiAgICBcIjIyOVwiOiBcImFyaW5nO1wiLFxuICAgIFwiMjMwXCI6IFwiYWVsaWc7XCIsXG4gICAgXCIyMzFcIjogXCJjY2VkaWw7XCIsXG4gICAgXCIyMzJcIjogXCJlZ3JhdmU7XCIsXG4gICAgXCIyMzNcIjogXCJlYWN1dGU7XCIsXG4gICAgXCIyMzRcIjogXCJlY2lyYztcIixcbiAgICBcIjIzNVwiOiBcImV1bWw7XCIsXG4gICAgXCIyMzZcIjogXCJpZ3JhdmU7XCIsXG4gICAgXCIyMzdcIjogXCJpYWN1dGU7XCIsXG4gICAgXCIyMzhcIjogXCJpY2lyYztcIixcbiAgICBcIjIzOVwiOiBcIml1bWw7XCIsXG4gICAgXCIyNDBcIjogXCJldGg7XCIsXG4gICAgXCIyNDFcIjogXCJudGlsZGU7XCIsXG4gICAgXCIyNDJcIjogXCJvZ3JhdmU7XCIsXG4gICAgXCIyNDNcIjogXCJvYWN1dGU7XCIsXG4gICAgXCIyNDRcIjogXCJvY2lyYztcIixcbiAgICBcIjI0NVwiOiBcIm90aWxkZTtcIixcbiAgICBcIjI0NlwiOiBcIm91bWw7XCIsXG4gICAgXCIyNDdcIjogXCJkaXZpZGU7XCIsXG4gICAgXCIyNDhcIjogXCJvc2xhc2g7XCIsXG4gICAgXCIyNDlcIjogXCJ1Z3JhdmU7XCIsXG4gICAgXCIyNTBcIjogXCJ1YWN1dGU7XCIsXG4gICAgXCIyNTFcIjogXCJ1Y2lyYztcIixcbiAgICBcIjI1MlwiOiBcInV1bWw7XCIsXG4gICAgXCIyNTNcIjogXCJ5YWN1dGU7XCIsXG4gICAgXCIyNTRcIjogXCJ0aG9ybjtcIixcbiAgICBcIjI1NVwiOiBcInl1bWw7XCIsXG4gICAgXCIyNTZcIjogXCJBbWFjcjtcIixcbiAgICBcIjI1N1wiOiBcImFtYWNyO1wiLFxuICAgIFwiMjU4XCI6IFwiQWJyZXZlO1wiLFxuICAgIFwiMjU5XCI6IFwiYWJyZXZlO1wiLFxuICAgIFwiMjYwXCI6IFwiQW9nb247XCIsXG4gICAgXCIyNjFcIjogXCJhb2dvbjtcIixcbiAgICBcIjI2MlwiOiBcIkNhY3V0ZTtcIixcbiAgICBcIjI2M1wiOiBcImNhY3V0ZTtcIixcbiAgICBcIjI2NFwiOiBcIkNjaXJjO1wiLFxuICAgIFwiMjY1XCI6IFwiY2NpcmM7XCIsXG4gICAgXCIyNjZcIjogXCJDZG90O1wiLFxuICAgIFwiMjY3XCI6IFwiY2RvdDtcIixcbiAgICBcIjI2OFwiOiBcIkNjYXJvbjtcIixcbiAgICBcIjI2OVwiOiBcImNjYXJvbjtcIixcbiAgICBcIjI3MFwiOiBcIkRjYXJvbjtcIixcbiAgICBcIjI3MVwiOiBcImRjYXJvbjtcIixcbiAgICBcIjI3MlwiOiBcIkRzdHJvaztcIixcbiAgICBcIjI3M1wiOiBcImRzdHJvaztcIixcbiAgICBcIjI3NFwiOiBcIkVtYWNyO1wiLFxuICAgIFwiMjc1XCI6IFwiZW1hY3I7XCIsXG4gICAgXCIyNzhcIjogXCJFZG90O1wiLFxuICAgIFwiMjc5XCI6IFwiZWRvdDtcIixcbiAgICBcIjI4MFwiOiBcIkVvZ29uO1wiLFxuICAgIFwiMjgxXCI6IFwiZW9nb247XCIsXG4gICAgXCIyODJcIjogXCJFY2Fyb247XCIsXG4gICAgXCIyODNcIjogXCJlY2Fyb247XCIsXG4gICAgXCIyODRcIjogXCJHY2lyYztcIixcbiAgICBcIjI4NVwiOiBcImdjaXJjO1wiLFxuICAgIFwiMjg2XCI6IFwiR2JyZXZlO1wiLFxuICAgIFwiMjg3XCI6IFwiZ2JyZXZlO1wiLFxuICAgIFwiMjg4XCI6IFwiR2RvdDtcIixcbiAgICBcIjI4OVwiOiBcImdkb3Q7XCIsXG4gICAgXCIyOTBcIjogXCJHY2VkaWw7XCIsXG4gICAgXCIyOTJcIjogXCJIY2lyYztcIixcbiAgICBcIjI5M1wiOiBcImhjaXJjO1wiLFxuICAgIFwiMjk0XCI6IFwiSHN0cm9rO1wiLFxuICAgIFwiMjk1XCI6IFwiaHN0cm9rO1wiLFxuICAgIFwiMjk2XCI6IFwiSXRpbGRlO1wiLFxuICAgIFwiMjk3XCI6IFwiaXRpbGRlO1wiLFxuICAgIFwiMjk4XCI6IFwiSW1hY3I7XCIsXG4gICAgXCIyOTlcIjogXCJpbWFjcjtcIixcbiAgICBcIjMwMlwiOiBcIklvZ29uO1wiLFxuICAgIFwiMzAzXCI6IFwiaW9nb247XCIsXG4gICAgXCIzMDRcIjogXCJJZG90O1wiLFxuICAgIFwiMzA1XCI6IFwiaW5vZG90O1wiLFxuICAgIFwiMzA2XCI6IFwiSUpsaWc7XCIsXG4gICAgXCIzMDdcIjogXCJpamxpZztcIixcbiAgICBcIjMwOFwiOiBcIkpjaXJjO1wiLFxuICAgIFwiMzA5XCI6IFwiamNpcmM7XCIsXG4gICAgXCIzMTBcIjogXCJLY2VkaWw7XCIsXG4gICAgXCIzMTFcIjogXCJrY2VkaWw7XCIsXG4gICAgXCIzMTJcIjogXCJrZ3JlZW47XCIsXG4gICAgXCIzMTNcIjogXCJMYWN1dGU7XCIsXG4gICAgXCIzMTRcIjogXCJsYWN1dGU7XCIsXG4gICAgXCIzMTVcIjogXCJMY2VkaWw7XCIsXG4gICAgXCIzMTZcIjogXCJsY2VkaWw7XCIsXG4gICAgXCIzMTdcIjogXCJMY2Fyb247XCIsXG4gICAgXCIzMThcIjogXCJsY2Fyb247XCIsXG4gICAgXCIzMTlcIjogXCJMbWlkb3Q7XCIsXG4gICAgXCIzMjBcIjogXCJsbWlkb3Q7XCIsXG4gICAgXCIzMjFcIjogXCJMc3Ryb2s7XCIsXG4gICAgXCIzMjJcIjogXCJsc3Ryb2s7XCIsXG4gICAgXCIzMjNcIjogXCJOYWN1dGU7XCIsXG4gICAgXCIzMjRcIjogXCJuYWN1dGU7XCIsXG4gICAgXCIzMjVcIjogXCJOY2VkaWw7XCIsXG4gICAgXCIzMjZcIjogXCJuY2VkaWw7XCIsXG4gICAgXCIzMjdcIjogXCJOY2Fyb247XCIsXG4gICAgXCIzMjhcIjogXCJuY2Fyb247XCIsXG4gICAgXCIzMjlcIjogXCJuYXBvcztcIixcbiAgICBcIjMzMFwiOiBcIkVORztcIixcbiAgICBcIjMzMVwiOiBcImVuZztcIixcbiAgICBcIjMzMlwiOiBcIk9tYWNyO1wiLFxuICAgIFwiMzMzXCI6IFwib21hY3I7XCIsXG4gICAgXCIzMzZcIjogXCJPZGJsYWM7XCIsXG4gICAgXCIzMzdcIjogXCJvZGJsYWM7XCIsXG4gICAgXCIzMzhcIjogXCJPRWxpZztcIixcbiAgICBcIjMzOVwiOiBcIm9lbGlnO1wiLFxuICAgIFwiMzQwXCI6IFwiUmFjdXRlO1wiLFxuICAgIFwiMzQxXCI6IFwicmFjdXRlO1wiLFxuICAgIFwiMzQyXCI6IFwiUmNlZGlsO1wiLFxuICAgIFwiMzQzXCI6IFwicmNlZGlsO1wiLFxuICAgIFwiMzQ0XCI6IFwiUmNhcm9uO1wiLFxuICAgIFwiMzQ1XCI6IFwicmNhcm9uO1wiLFxuICAgIFwiMzQ2XCI6IFwiU2FjdXRlO1wiLFxuICAgIFwiMzQ3XCI6IFwic2FjdXRlO1wiLFxuICAgIFwiMzQ4XCI6IFwiU2NpcmM7XCIsXG4gICAgXCIzNDlcIjogXCJzY2lyYztcIixcbiAgICBcIjM1MFwiOiBcIlNjZWRpbDtcIixcbiAgICBcIjM1MVwiOiBcInNjZWRpbDtcIixcbiAgICBcIjM1MlwiOiBcIlNjYXJvbjtcIixcbiAgICBcIjM1M1wiOiBcInNjYXJvbjtcIixcbiAgICBcIjM1NFwiOiBcIlRjZWRpbDtcIixcbiAgICBcIjM1NVwiOiBcInRjZWRpbDtcIixcbiAgICBcIjM1NlwiOiBcIlRjYXJvbjtcIixcbiAgICBcIjM1N1wiOiBcInRjYXJvbjtcIixcbiAgICBcIjM1OFwiOiBcIlRzdHJvaztcIixcbiAgICBcIjM1OVwiOiBcInRzdHJvaztcIixcbiAgICBcIjM2MFwiOiBcIlV0aWxkZTtcIixcbiAgICBcIjM2MVwiOiBcInV0aWxkZTtcIixcbiAgICBcIjM2MlwiOiBcIlVtYWNyO1wiLFxuICAgIFwiMzYzXCI6IFwidW1hY3I7XCIsXG4gICAgXCIzNjRcIjogXCJVYnJldmU7XCIsXG4gICAgXCIzNjVcIjogXCJ1YnJldmU7XCIsXG4gICAgXCIzNjZcIjogXCJVcmluZztcIixcbiAgICBcIjM2N1wiOiBcInVyaW5nO1wiLFxuICAgIFwiMzY4XCI6IFwiVWRibGFjO1wiLFxuICAgIFwiMzY5XCI6IFwidWRibGFjO1wiLFxuICAgIFwiMzcwXCI6IFwiVW9nb247XCIsXG4gICAgXCIzNzFcIjogXCJ1b2dvbjtcIixcbiAgICBcIjM3MlwiOiBcIldjaXJjO1wiLFxuICAgIFwiMzczXCI6IFwid2NpcmM7XCIsXG4gICAgXCIzNzRcIjogXCJZY2lyYztcIixcbiAgICBcIjM3NVwiOiBcInljaXJjO1wiLFxuICAgIFwiMzc2XCI6IFwiWXVtbDtcIixcbiAgICBcIjM3N1wiOiBcIlphY3V0ZTtcIixcbiAgICBcIjM3OFwiOiBcInphY3V0ZTtcIixcbiAgICBcIjM3OVwiOiBcIlpkb3Q7XCIsXG4gICAgXCIzODBcIjogXCJ6ZG90O1wiLFxuICAgIFwiMzgxXCI6IFwiWmNhcm9uO1wiLFxuICAgIFwiMzgyXCI6IFwiemNhcm9uO1wiLFxuICAgIFwiNDAyXCI6IFwiZm5vZjtcIixcbiAgICBcIjQzN1wiOiBcImltcGVkO1wiLFxuICAgIFwiNTAxXCI6IFwiZ2FjdXRlO1wiLFxuICAgIFwiNTY3XCI6IFwiam1hdGg7XCIsXG4gICAgXCI3MTBcIjogXCJjaXJjO1wiLFxuICAgIFwiNzExXCI6IFwiSGFjZWs7XCIsXG4gICAgXCI3MjhcIjogXCJicmV2ZTtcIixcbiAgICBcIjcyOVwiOiBcImRvdDtcIixcbiAgICBcIjczMFwiOiBcInJpbmc7XCIsXG4gICAgXCI3MzFcIjogXCJvZ29uO1wiLFxuICAgIFwiNzMyXCI6IFwidGlsZGU7XCIsXG4gICAgXCI3MzNcIjogXCJEaWFjcml0aWNhbERvdWJsZUFjdXRlO1wiLFxuICAgIFwiNzg1XCI6IFwiRG93bkJyZXZlO1wiLFxuICAgIFwiOTEzXCI6IFwiQWxwaGE7XCIsXG4gICAgXCI5MTRcIjogXCJCZXRhO1wiLFxuICAgIFwiOTE1XCI6IFwiR2FtbWE7XCIsXG4gICAgXCI5MTZcIjogXCJEZWx0YTtcIixcbiAgICBcIjkxN1wiOiBcIkVwc2lsb247XCIsXG4gICAgXCI5MThcIjogXCJaZXRhO1wiLFxuICAgIFwiOTE5XCI6IFwiRXRhO1wiLFxuICAgIFwiOTIwXCI6IFwiVGhldGE7XCIsXG4gICAgXCI5MjFcIjogXCJJb3RhO1wiLFxuICAgIFwiOTIyXCI6IFwiS2FwcGE7XCIsXG4gICAgXCI5MjNcIjogXCJMYW1iZGE7XCIsXG4gICAgXCI5MjRcIjogXCJNdTtcIixcbiAgICBcIjkyNVwiOiBcIk51O1wiLFxuICAgIFwiOTI2XCI6IFwiWGk7XCIsXG4gICAgXCI5MjdcIjogXCJPbWljcm9uO1wiLFxuICAgIFwiOTI4XCI6IFwiUGk7XCIsXG4gICAgXCI5MjlcIjogXCJSaG87XCIsXG4gICAgXCI5MzFcIjogXCJTaWdtYTtcIixcbiAgICBcIjkzMlwiOiBcIlRhdTtcIixcbiAgICBcIjkzM1wiOiBcIlVwc2lsb247XCIsXG4gICAgXCI5MzRcIjogXCJQaGk7XCIsXG4gICAgXCI5MzVcIjogXCJDaGk7XCIsXG4gICAgXCI5MzZcIjogXCJQc2k7XCIsXG4gICAgXCI5MzdcIjogXCJPbWVnYTtcIixcbiAgICBcIjk0NVwiOiBcImFscGhhO1wiLFxuICAgIFwiOTQ2XCI6IFwiYmV0YTtcIixcbiAgICBcIjk0N1wiOiBcImdhbW1hO1wiLFxuICAgIFwiOTQ4XCI6IFwiZGVsdGE7XCIsXG4gICAgXCI5NDlcIjogXCJlcHNpbG9uO1wiLFxuICAgIFwiOTUwXCI6IFwiemV0YTtcIixcbiAgICBcIjk1MVwiOiBcImV0YTtcIixcbiAgICBcIjk1MlwiOiBcInRoZXRhO1wiLFxuICAgIFwiOTUzXCI6IFwiaW90YTtcIixcbiAgICBcIjk1NFwiOiBcImthcHBhO1wiLFxuICAgIFwiOTU1XCI6IFwibGFtYmRhO1wiLFxuICAgIFwiOTU2XCI6IFwibXU7XCIsXG4gICAgXCI5NTdcIjogXCJudTtcIixcbiAgICBcIjk1OFwiOiBcInhpO1wiLFxuICAgIFwiOTU5XCI6IFwib21pY3JvbjtcIixcbiAgICBcIjk2MFwiOiBcInBpO1wiLFxuICAgIFwiOTYxXCI6IFwicmhvO1wiLFxuICAgIFwiOTYyXCI6IFwidmFyc2lnbWE7XCIsXG4gICAgXCI5NjNcIjogXCJzaWdtYTtcIixcbiAgICBcIjk2NFwiOiBcInRhdTtcIixcbiAgICBcIjk2NVwiOiBcInVwc2lsb247XCIsXG4gICAgXCI5NjZcIjogXCJwaGk7XCIsXG4gICAgXCI5NjdcIjogXCJjaGk7XCIsXG4gICAgXCI5NjhcIjogXCJwc2k7XCIsXG4gICAgXCI5NjlcIjogXCJvbWVnYTtcIixcbiAgICBcIjk3N1wiOiBcInZhcnRoZXRhO1wiLFxuICAgIFwiOTc4XCI6IFwidXBzaWg7XCIsXG4gICAgXCI5ODFcIjogXCJ2YXJwaGk7XCIsXG4gICAgXCI5ODJcIjogXCJ2YXJwaTtcIixcbiAgICBcIjk4OFwiOiBcIkdhbW1hZDtcIixcbiAgICBcIjk4OVwiOiBcImdhbW1hZDtcIixcbiAgICBcIjEwMDhcIjogXCJ2YXJrYXBwYTtcIixcbiAgICBcIjEwMDlcIjogXCJ2YXJyaG87XCIsXG4gICAgXCIxMDEzXCI6IFwidmFyZXBzaWxvbjtcIixcbiAgICBcIjEwMTRcIjogXCJiZXBzaTtcIixcbiAgICBcIjEwMjVcIjogXCJJT2N5O1wiLFxuICAgIFwiMTAyNlwiOiBcIkRKY3k7XCIsXG4gICAgXCIxMDI3XCI6IFwiR0pjeTtcIixcbiAgICBcIjEwMjhcIjogXCJKdWtjeTtcIixcbiAgICBcIjEwMjlcIjogXCJEU2N5O1wiLFxuICAgIFwiMTAzMFwiOiBcIkl1a2N5O1wiLFxuICAgIFwiMTAzMVwiOiBcIllJY3k7XCIsXG4gICAgXCIxMDMyXCI6IFwiSnNlcmN5O1wiLFxuICAgIFwiMTAzM1wiOiBcIkxKY3k7XCIsXG4gICAgXCIxMDM0XCI6IFwiTkpjeTtcIixcbiAgICBcIjEwMzVcIjogXCJUU0hjeTtcIixcbiAgICBcIjEwMzZcIjogXCJLSmN5O1wiLFxuICAgIFwiMTAzOFwiOiBcIlVicmN5O1wiLFxuICAgIFwiMTAzOVwiOiBcIkRaY3k7XCIsXG4gICAgXCIxMDQwXCI6IFwiQWN5O1wiLFxuICAgIFwiMTA0MVwiOiBcIkJjeTtcIixcbiAgICBcIjEwNDJcIjogXCJWY3k7XCIsXG4gICAgXCIxMDQzXCI6IFwiR2N5O1wiLFxuICAgIFwiMTA0NFwiOiBcIkRjeTtcIixcbiAgICBcIjEwNDVcIjogXCJJRWN5O1wiLFxuICAgIFwiMTA0NlwiOiBcIlpIY3k7XCIsXG4gICAgXCIxMDQ3XCI6IFwiWmN5O1wiLFxuICAgIFwiMTA0OFwiOiBcIkljeTtcIixcbiAgICBcIjEwNDlcIjogXCJKY3k7XCIsXG4gICAgXCIxMDUwXCI6IFwiS2N5O1wiLFxuICAgIFwiMTA1MVwiOiBcIkxjeTtcIixcbiAgICBcIjEwNTJcIjogXCJNY3k7XCIsXG4gICAgXCIxMDUzXCI6IFwiTmN5O1wiLFxuICAgIFwiMTA1NFwiOiBcIk9jeTtcIixcbiAgICBcIjEwNTVcIjogXCJQY3k7XCIsXG4gICAgXCIxMDU2XCI6IFwiUmN5O1wiLFxuICAgIFwiMTA1N1wiOiBcIlNjeTtcIixcbiAgICBcIjEwNThcIjogXCJUY3k7XCIsXG4gICAgXCIxMDU5XCI6IFwiVWN5O1wiLFxuICAgIFwiMTA2MFwiOiBcIkZjeTtcIixcbiAgICBcIjEwNjFcIjogXCJLSGN5O1wiLFxuICAgIFwiMTA2MlwiOiBcIlRTY3k7XCIsXG4gICAgXCIxMDYzXCI6IFwiQ0hjeTtcIixcbiAgICBcIjEwNjRcIjogXCJTSGN5O1wiLFxuICAgIFwiMTA2NVwiOiBcIlNIQ0hjeTtcIixcbiAgICBcIjEwNjZcIjogXCJIQVJEY3k7XCIsXG4gICAgXCIxMDY3XCI6IFwiWWN5O1wiLFxuICAgIFwiMTA2OFwiOiBcIlNPRlRjeTtcIixcbiAgICBcIjEwNjlcIjogXCJFY3k7XCIsXG4gICAgXCIxMDcwXCI6IFwiWVVjeTtcIixcbiAgICBcIjEwNzFcIjogXCJZQWN5O1wiLFxuICAgIFwiMTA3MlwiOiBcImFjeTtcIixcbiAgICBcIjEwNzNcIjogXCJiY3k7XCIsXG4gICAgXCIxMDc0XCI6IFwidmN5O1wiLFxuICAgIFwiMTA3NVwiOiBcImdjeTtcIixcbiAgICBcIjEwNzZcIjogXCJkY3k7XCIsXG4gICAgXCIxMDc3XCI6IFwiaWVjeTtcIixcbiAgICBcIjEwNzhcIjogXCJ6aGN5O1wiLFxuICAgIFwiMTA3OVwiOiBcInpjeTtcIixcbiAgICBcIjEwODBcIjogXCJpY3k7XCIsXG4gICAgXCIxMDgxXCI6IFwiamN5O1wiLFxuICAgIFwiMTA4MlwiOiBcImtjeTtcIixcbiAgICBcIjEwODNcIjogXCJsY3k7XCIsXG4gICAgXCIxMDg0XCI6IFwibWN5O1wiLFxuICAgIFwiMTA4NVwiOiBcIm5jeTtcIixcbiAgICBcIjEwODZcIjogXCJvY3k7XCIsXG4gICAgXCIxMDg3XCI6IFwicGN5O1wiLFxuICAgIFwiMTA4OFwiOiBcInJjeTtcIixcbiAgICBcIjEwODlcIjogXCJzY3k7XCIsXG4gICAgXCIxMDkwXCI6IFwidGN5O1wiLFxuICAgIFwiMTA5MVwiOiBcInVjeTtcIixcbiAgICBcIjEwOTJcIjogXCJmY3k7XCIsXG4gICAgXCIxMDkzXCI6IFwia2hjeTtcIixcbiAgICBcIjEwOTRcIjogXCJ0c2N5O1wiLFxuICAgIFwiMTA5NVwiOiBcImNoY3k7XCIsXG4gICAgXCIxMDk2XCI6IFwic2hjeTtcIixcbiAgICBcIjEwOTdcIjogXCJzaGNoY3k7XCIsXG4gICAgXCIxMDk4XCI6IFwiaGFyZGN5O1wiLFxuICAgIFwiMTA5OVwiOiBcInljeTtcIixcbiAgICBcIjExMDBcIjogXCJzb2Z0Y3k7XCIsXG4gICAgXCIxMTAxXCI6IFwiZWN5O1wiLFxuICAgIFwiMTEwMlwiOiBcInl1Y3k7XCIsXG4gICAgXCIxMTAzXCI6IFwieWFjeTtcIixcbiAgICBcIjExMDVcIjogXCJpb2N5O1wiLFxuICAgIFwiMTEwNlwiOiBcImRqY3k7XCIsXG4gICAgXCIxMTA3XCI6IFwiZ2pjeTtcIixcbiAgICBcIjExMDhcIjogXCJqdWtjeTtcIixcbiAgICBcIjExMDlcIjogXCJkc2N5O1wiLFxuICAgIFwiMTExMFwiOiBcIml1a2N5O1wiLFxuICAgIFwiMTExMVwiOiBcInlpY3k7XCIsXG4gICAgXCIxMTEyXCI6IFwianNlcmN5O1wiLFxuICAgIFwiMTExM1wiOiBcImxqY3k7XCIsXG4gICAgXCIxMTE0XCI6IFwibmpjeTtcIixcbiAgICBcIjExMTVcIjogXCJ0c2hjeTtcIixcbiAgICBcIjExMTZcIjogXCJramN5O1wiLFxuICAgIFwiMTExOFwiOiBcInVicmN5O1wiLFxuICAgIFwiMTExOVwiOiBcImR6Y3k7XCIsXG4gICAgXCI4MTk0XCI6IFwiZW5zcDtcIixcbiAgICBcIjgxOTVcIjogXCJlbXNwO1wiLFxuICAgIFwiODE5NlwiOiBcImVtc3AxMztcIixcbiAgICBcIjgxOTdcIjogXCJlbXNwMTQ7XCIsXG4gICAgXCI4MTk5XCI6IFwibnVtc3A7XCIsXG4gICAgXCI4MjAwXCI6IFwicHVuY3NwO1wiLFxuICAgIFwiODIwMVwiOiBcIlRoaW5TcGFjZTtcIixcbiAgICBcIjgyMDJcIjogXCJWZXJ5VGhpblNwYWNlO1wiLFxuICAgIFwiODIwM1wiOiBcIlplcm9XaWR0aFNwYWNlO1wiLFxuICAgIFwiODIwNFwiOiBcInp3bmo7XCIsXG4gICAgXCI4MjA1XCI6IFwiendqO1wiLFxuICAgIFwiODIwNlwiOiBcImxybTtcIixcbiAgICBcIjgyMDdcIjogXCJybG07XCIsXG4gICAgXCI4MjA4XCI6IFwiaHlwaGVuO1wiLFxuICAgIFwiODIxMVwiOiBcIm5kYXNoO1wiLFxuICAgIFwiODIxMlwiOiBcIm1kYXNoO1wiLFxuICAgIFwiODIxM1wiOiBcImhvcmJhcjtcIixcbiAgICBcIjgyMTRcIjogXCJWZXJ0O1wiLFxuICAgIFwiODIxNlwiOiBcIk9wZW5DdXJseVF1b3RlO1wiLFxuICAgIFwiODIxN1wiOiBcInJzcXVvcjtcIixcbiAgICBcIjgyMThcIjogXCJzYnF1bztcIixcbiAgICBcIjgyMjBcIjogXCJPcGVuQ3VybHlEb3VibGVRdW90ZTtcIixcbiAgICBcIjgyMjFcIjogXCJyZHF1b3I7XCIsXG4gICAgXCI4MjIyXCI6IFwibGRxdW9yO1wiLFxuICAgIFwiODIyNFwiOiBcImRhZ2dlcjtcIixcbiAgICBcIjgyMjVcIjogXCJkZGFnZ2VyO1wiLFxuICAgIFwiODIyNlwiOiBcImJ1bGxldDtcIixcbiAgICBcIjgyMjlcIjogXCJubGRyO1wiLFxuICAgIFwiODIzMFwiOiBcIm1sZHI7XCIsXG4gICAgXCI4MjQwXCI6IFwicGVybWlsO1wiLFxuICAgIFwiODI0MVwiOiBcInBlcnRlbms7XCIsXG4gICAgXCI4MjQyXCI6IFwicHJpbWU7XCIsXG4gICAgXCI4MjQzXCI6IFwiUHJpbWU7XCIsXG4gICAgXCI4MjQ0XCI6IFwidHByaW1lO1wiLFxuICAgIFwiODI0NVwiOiBcImJwcmltZTtcIixcbiAgICBcIjgyNDlcIjogXCJsc2FxdW87XCIsXG4gICAgXCI4MjUwXCI6IFwicnNhcXVvO1wiLFxuICAgIFwiODI1NFwiOiBcIk92ZXJCYXI7XCIsXG4gICAgXCI4MjU3XCI6IFwiY2FyZXQ7XCIsXG4gICAgXCI4MjU5XCI6IFwiaHlidWxsO1wiLFxuICAgIFwiODI2MFwiOiBcImZyYXNsO1wiLFxuICAgIFwiODI3MVwiOiBcImJzZW1pO1wiLFxuICAgIFwiODI3OVwiOiBcInFwcmltZTtcIixcbiAgICBcIjgyODdcIjogXCJNZWRpdW1TcGFjZTtcIixcbiAgICBcIjgyODhcIjogXCJOb0JyZWFrO1wiLFxuICAgIFwiODI4OVwiOiBcIkFwcGx5RnVuY3Rpb247XCIsXG4gICAgXCI4MjkwXCI6IFwiaXQ7XCIsXG4gICAgXCI4MjkxXCI6IFwiSW52aXNpYmxlQ29tbWE7XCIsXG4gICAgXCI4MzY0XCI6IFwiZXVybztcIixcbiAgICBcIjg0MTFcIjogXCJUcmlwbGVEb3Q7XCIsXG4gICAgXCI4NDEyXCI6IFwiRG90RG90O1wiLFxuICAgIFwiODQ1MFwiOiBcIkNvcGY7XCIsXG4gICAgXCI4NDUzXCI6IFwiaW5jYXJlO1wiLFxuICAgIFwiODQ1OFwiOiBcImdzY3I7XCIsXG4gICAgXCI4NDU5XCI6IFwiSHNjcjtcIixcbiAgICBcIjg0NjBcIjogXCJQb2luY2FyZXBsYW5lO1wiLFxuICAgIFwiODQ2MVwiOiBcInF1YXRlcm5pb25zO1wiLFxuICAgIFwiODQ2MlwiOiBcInBsYW5ja2g7XCIsXG4gICAgXCI4NDYzXCI6IFwicGxhbmt2O1wiLFxuICAgIFwiODQ2NFwiOiBcIklzY3I7XCIsXG4gICAgXCI4NDY1XCI6IFwiaW1hZ3BhcnQ7XCIsXG4gICAgXCI4NDY2XCI6IFwiTHNjcjtcIixcbiAgICBcIjg0NjdcIjogXCJlbGw7XCIsXG4gICAgXCI4NDY5XCI6IFwiTm9wZjtcIixcbiAgICBcIjg0NzBcIjogXCJudW1lcm87XCIsXG4gICAgXCI4NDcxXCI6IFwiY29weXNyO1wiLFxuICAgIFwiODQ3MlwiOiBcIndwO1wiLFxuICAgIFwiODQ3M1wiOiBcInByaW1lcztcIixcbiAgICBcIjg0NzRcIjogXCJyYXRpb25hbHM7XCIsXG4gICAgXCI4NDc1XCI6IFwiUnNjcjtcIixcbiAgICBcIjg0NzZcIjogXCJSZnI7XCIsXG4gICAgXCI4NDc3XCI6IFwiUm9wZjtcIixcbiAgICBcIjg0NzhcIjogXCJyeDtcIixcbiAgICBcIjg0ODJcIjogXCJ0cmFkZTtcIixcbiAgICBcIjg0ODRcIjogXCJab3BmO1wiLFxuICAgIFwiODQ4N1wiOiBcIm1obztcIixcbiAgICBcIjg0ODhcIjogXCJaZnI7XCIsXG4gICAgXCI4NDg5XCI6IFwiaWlvdGE7XCIsXG4gICAgXCI4NDkyXCI6IFwiQnNjcjtcIixcbiAgICBcIjg0OTNcIjogXCJDZnI7XCIsXG4gICAgXCI4NDk1XCI6IFwiZXNjcjtcIixcbiAgICBcIjg0OTZcIjogXCJleHBlY3RhdGlvbjtcIixcbiAgICBcIjg0OTdcIjogXCJGc2NyO1wiLFxuICAgIFwiODQ5OVwiOiBcInBobW1hdDtcIixcbiAgICBcIjg1MDBcIjogXCJvc2NyO1wiLFxuICAgIFwiODUwMVwiOiBcImFsZXBoO1wiLFxuICAgIFwiODUwMlwiOiBcImJldGg7XCIsXG4gICAgXCI4NTAzXCI6IFwiZ2ltZWw7XCIsXG4gICAgXCI4NTA0XCI6IFwiZGFsZXRoO1wiLFxuICAgIFwiODUxN1wiOiBcIkREO1wiLFxuICAgIFwiODUxOFwiOiBcIkRpZmZlcmVudGlhbEQ7XCIsXG4gICAgXCI4NTE5XCI6IFwiZXhwb25lbnRpYWxlO1wiLFxuICAgIFwiODUyMFwiOiBcIkltYWdpbmFyeUk7XCIsXG4gICAgXCI4NTMxXCI6IFwiZnJhYzEzO1wiLFxuICAgIFwiODUzMlwiOiBcImZyYWMyMztcIixcbiAgICBcIjg1MzNcIjogXCJmcmFjMTU7XCIsXG4gICAgXCI4NTM0XCI6IFwiZnJhYzI1O1wiLFxuICAgIFwiODUzNVwiOiBcImZyYWMzNTtcIixcbiAgICBcIjg1MzZcIjogXCJmcmFjNDU7XCIsXG4gICAgXCI4NTM3XCI6IFwiZnJhYzE2O1wiLFxuICAgIFwiODUzOFwiOiBcImZyYWM1NjtcIixcbiAgICBcIjg1MzlcIjogXCJmcmFjMTg7XCIsXG4gICAgXCI4NTQwXCI6IFwiZnJhYzM4O1wiLFxuICAgIFwiODU0MVwiOiBcImZyYWM1ODtcIixcbiAgICBcIjg1NDJcIjogXCJmcmFjNzg7XCIsXG4gICAgXCI4NTkyXCI6IFwic2xhcnI7XCIsXG4gICAgXCI4NTkzXCI6IFwidXBhcnJvdztcIixcbiAgICBcIjg1OTRcIjogXCJzcmFycjtcIixcbiAgICBcIjg1OTVcIjogXCJTaG9ydERvd25BcnJvdztcIixcbiAgICBcIjg1OTZcIjogXCJsZWZ0cmlnaHRhcnJvdztcIixcbiAgICBcIjg1OTdcIjogXCJ2YXJyO1wiLFxuICAgIFwiODU5OFwiOiBcIlVwcGVyTGVmdEFycm93O1wiLFxuICAgIFwiODU5OVwiOiBcIlVwcGVyUmlnaHRBcnJvdztcIixcbiAgICBcIjg2MDBcIjogXCJzZWFycm93O1wiLFxuICAgIFwiODYwMVwiOiBcInN3YXJyb3c7XCIsXG4gICAgXCI4NjAyXCI6IFwibmxlZnRhcnJvdztcIixcbiAgICBcIjg2MDNcIjogXCJucmlnaHRhcnJvdztcIixcbiAgICBcIjg2MDVcIjogXCJyaWdodHNxdWlnYXJyb3c7XCIsXG4gICAgXCI4NjA2XCI6IFwidHdvaGVhZGxlZnRhcnJvdztcIixcbiAgICBcIjg2MDdcIjogXCJVYXJyO1wiLFxuICAgIFwiODYwOFwiOiBcInR3b2hlYWRyaWdodGFycm93O1wiLFxuICAgIFwiODYwOVwiOiBcIkRhcnI7XCIsXG4gICAgXCI4NjEwXCI6IFwibGVmdGFycm93dGFpbDtcIixcbiAgICBcIjg2MTFcIjogXCJyaWdodGFycm93dGFpbDtcIixcbiAgICBcIjg2MTJcIjogXCJtYXBzdG9sZWZ0O1wiLFxuICAgIFwiODYxM1wiOiBcIlVwVGVlQXJyb3c7XCIsXG4gICAgXCI4NjE0XCI6IFwiUmlnaHRUZWVBcnJvdztcIixcbiAgICBcIjg2MTVcIjogXCJtYXBzdG9kb3duO1wiLFxuICAgIFwiODYxN1wiOiBcImxhcnJoaztcIixcbiAgICBcIjg2MThcIjogXCJyYXJyaGs7XCIsXG4gICAgXCI4NjE5XCI6IFwibG9vcGFycm93bGVmdDtcIixcbiAgICBcIjg2MjBcIjogXCJyYXJybHA7XCIsXG4gICAgXCI4NjIxXCI6IFwibGVmdHJpZ2h0c3F1aWdhcnJvdztcIixcbiAgICBcIjg2MjJcIjogXCJubGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjI0XCI6IFwibHNoO1wiLFxuICAgIFwiODYyNVwiOiBcInJzaDtcIixcbiAgICBcIjg2MjZcIjogXCJsZHNoO1wiLFxuICAgIFwiODYyN1wiOiBcInJkc2g7XCIsXG4gICAgXCI4NjI5XCI6IFwiY3JhcnI7XCIsXG4gICAgXCI4NjMwXCI6IFwiY3VydmVhcnJvd2xlZnQ7XCIsXG4gICAgXCI4NjMxXCI6IFwiY3VydmVhcnJvd3JpZ2h0O1wiLFxuICAgIFwiODYzNFwiOiBcIm9sYXJyO1wiLFxuICAgIFwiODYzNVwiOiBcIm9yYXJyO1wiLFxuICAgIFwiODYzNlwiOiBcImxoYXJ1O1wiLFxuICAgIFwiODYzN1wiOiBcImxoYXJkO1wiLFxuICAgIFwiODYzOFwiOiBcInVwaGFycG9vbnJpZ2h0O1wiLFxuICAgIFwiODYzOVwiOiBcInVwaGFycG9vbmxlZnQ7XCIsXG4gICAgXCI4NjQwXCI6IFwiUmlnaHRWZWN0b3I7XCIsXG4gICAgXCI4NjQxXCI6IFwicmlnaHRoYXJwb29uZG93bjtcIixcbiAgICBcIjg2NDJcIjogXCJSaWdodERvd25WZWN0b3I7XCIsXG4gICAgXCI4NjQzXCI6IFwiTGVmdERvd25WZWN0b3I7XCIsXG4gICAgXCI4NjQ0XCI6IFwicmxhcnI7XCIsXG4gICAgXCI4NjQ1XCI6IFwiVXBBcnJvd0Rvd25BcnJvdztcIixcbiAgICBcIjg2NDZcIjogXCJscmFycjtcIixcbiAgICBcIjg2NDdcIjogXCJsbGFycjtcIixcbiAgICBcIjg2NDhcIjogXCJ1dWFycjtcIixcbiAgICBcIjg2NDlcIjogXCJycmFycjtcIixcbiAgICBcIjg2NTBcIjogXCJkb3duZG93bmFycm93cztcIixcbiAgICBcIjg2NTFcIjogXCJSZXZlcnNlRXF1aWxpYnJpdW07XCIsXG4gICAgXCI4NjUyXCI6IFwicmxoYXI7XCIsXG4gICAgXCI4NjUzXCI6IFwibkxlZnRhcnJvdztcIixcbiAgICBcIjg2NTRcIjogXCJuTGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjU1XCI6IFwiblJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjU2XCI6IFwiTGVmdGFycm93O1wiLFxuICAgIFwiODY1N1wiOiBcIlVwYXJyb3c7XCIsXG4gICAgXCI4NjU4XCI6IFwiUmlnaHRhcnJvdztcIixcbiAgICBcIjg2NTlcIjogXCJEb3duYXJyb3c7XCIsXG4gICAgXCI4NjYwXCI6IFwiTGVmdHJpZ2h0YXJyb3c7XCIsXG4gICAgXCI4NjYxXCI6IFwidkFycjtcIixcbiAgICBcIjg2NjJcIjogXCJud0FycjtcIixcbiAgICBcIjg2NjNcIjogXCJuZUFycjtcIixcbiAgICBcIjg2NjRcIjogXCJzZUFycjtcIixcbiAgICBcIjg2NjVcIjogXCJzd0FycjtcIixcbiAgICBcIjg2NjZcIjogXCJMbGVmdGFycm93O1wiLFxuICAgIFwiODY2N1wiOiBcIlJyaWdodGFycm93O1wiLFxuICAgIFwiODY2OVwiOiBcInppZ3JhcnI7XCIsXG4gICAgXCI4Njc2XCI6IFwiTGVmdEFycm93QmFyO1wiLFxuICAgIFwiODY3N1wiOiBcIlJpZ2h0QXJyb3dCYXI7XCIsXG4gICAgXCI4NjkzXCI6IFwiZHVhcnI7XCIsXG4gICAgXCI4NzAxXCI6IFwibG9hcnI7XCIsXG4gICAgXCI4NzAyXCI6IFwicm9hcnI7XCIsXG4gICAgXCI4NzAzXCI6IFwiaG9hcnI7XCIsXG4gICAgXCI4NzA0XCI6IFwiZm9yYWxsO1wiLFxuICAgIFwiODcwNVwiOiBcImNvbXBsZW1lbnQ7XCIsXG4gICAgXCI4NzA2XCI6IFwiUGFydGlhbEQ7XCIsXG4gICAgXCI4NzA3XCI6IFwiRXhpc3RzO1wiLFxuICAgIFwiODcwOFwiOiBcIk5vdEV4aXN0cztcIixcbiAgICBcIjg3MDlcIjogXCJ2YXJub3RoaW5nO1wiLFxuICAgIFwiODcxMVwiOiBcIm5hYmxhO1wiLFxuICAgIFwiODcxMlwiOiBcImlzaW52O1wiLFxuICAgIFwiODcxM1wiOiBcIm5vdGludmE7XCIsXG4gICAgXCI4NzE1XCI6IFwiU3VjaFRoYXQ7XCIsXG4gICAgXCI4NzE2XCI6IFwiTm90UmV2ZXJzZUVsZW1lbnQ7XCIsXG4gICAgXCI4NzE5XCI6IFwiUHJvZHVjdDtcIixcbiAgICBcIjg3MjBcIjogXCJDb3Byb2R1Y3Q7XCIsXG4gICAgXCI4NzIxXCI6IFwic3VtO1wiLFxuICAgIFwiODcyMlwiOiBcIm1pbnVzO1wiLFxuICAgIFwiODcyM1wiOiBcIm1wO1wiLFxuICAgIFwiODcyNFwiOiBcInBsdXNkbztcIixcbiAgICBcIjg3MjZcIjogXCJzc2V0bW47XCIsXG4gICAgXCI4NzI3XCI6IFwibG93YXN0O1wiLFxuICAgIFwiODcyOFwiOiBcIlNtYWxsQ2lyY2xlO1wiLFxuICAgIFwiODczMFwiOiBcIlNxcnQ7XCIsXG4gICAgXCI4NzMzXCI6IFwidnByb3A7XCIsXG4gICAgXCI4NzM0XCI6IFwiaW5maW47XCIsXG4gICAgXCI4NzM1XCI6IFwiYW5ncnQ7XCIsXG4gICAgXCI4NzM2XCI6IFwiYW5nbGU7XCIsXG4gICAgXCI4NzM3XCI6IFwibWVhc3VyZWRhbmdsZTtcIixcbiAgICBcIjg3MzhcIjogXCJhbmdzcGg7XCIsXG4gICAgXCI4NzM5XCI6IFwiVmVydGljYWxCYXI7XCIsXG4gICAgXCI4NzQwXCI6IFwibnNtaWQ7XCIsXG4gICAgXCI4NzQxXCI6IFwic3BhcjtcIixcbiAgICBcIjg3NDJcIjogXCJuc3BhcjtcIixcbiAgICBcIjg3NDNcIjogXCJ3ZWRnZTtcIixcbiAgICBcIjg3NDRcIjogXCJ2ZWU7XCIsXG4gICAgXCI4NzQ1XCI6IFwiY2FwO1wiLFxuICAgIFwiODc0NlwiOiBcImN1cDtcIixcbiAgICBcIjg3NDdcIjogXCJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NDhcIjogXCJJbnQ7XCIsXG4gICAgXCI4NzQ5XCI6IFwidGludDtcIixcbiAgICBcIjg3NTBcIjogXCJvaW50O1wiLFxuICAgIFwiODc1MVwiOiBcIkRvdWJsZUNvbnRvdXJJbnRlZ3JhbDtcIixcbiAgICBcIjg3NTJcIjogXCJDY29uaW50O1wiLFxuICAgIFwiODc1M1wiOiBcImN3aW50O1wiLFxuICAgIFwiODc1NFwiOiBcImN3Y29uaW50O1wiLFxuICAgIFwiODc1NVwiOiBcIkNvdW50ZXJDbG9ja3dpc2VDb250b3VySW50ZWdyYWw7XCIsXG4gICAgXCI4NzU2XCI6IFwidGhlcmVmb3JlO1wiLFxuICAgIFwiODc1N1wiOiBcImJlY2F1c2U7XCIsXG4gICAgXCI4NzU4XCI6IFwicmF0aW87XCIsXG4gICAgXCI4NzU5XCI6IFwiUHJvcG9ydGlvbjtcIixcbiAgICBcIjg3NjBcIjogXCJtaW51c2Q7XCIsXG4gICAgXCI4NzYyXCI6IFwibUREb3Q7XCIsXG4gICAgXCI4NzYzXCI6IFwiaG9tdGh0O1wiLFxuICAgIFwiODc2NFwiOiBcIlRpbGRlO1wiLFxuICAgIFwiODc2NVwiOiBcImJzaW07XCIsXG4gICAgXCI4NzY2XCI6IFwibXN0cG9zO1wiLFxuICAgIFwiODc2N1wiOiBcImFjZDtcIixcbiAgICBcIjg3NjhcIjogXCJ3cmVhdGg7XCIsXG4gICAgXCI4NzY5XCI6IFwibnNpbTtcIixcbiAgICBcIjg3NzBcIjogXCJlc2ltO1wiLFxuICAgIFwiODc3MVwiOiBcIlRpbGRlRXF1YWw7XCIsXG4gICAgXCI4NzcyXCI6IFwibnNpbWVxO1wiLFxuICAgIFwiODc3M1wiOiBcIlRpbGRlRnVsbEVxdWFsO1wiLFxuICAgIFwiODc3NFwiOiBcInNpbW5lO1wiLFxuICAgIFwiODc3NVwiOiBcIk5vdFRpbGRlRnVsbEVxdWFsO1wiLFxuICAgIFwiODc3NlwiOiBcIlRpbGRlVGlsZGU7XCIsXG4gICAgXCI4Nzc3XCI6IFwiTm90VGlsZGVUaWxkZTtcIixcbiAgICBcIjg3NzhcIjogXCJhcHByb3hlcTtcIixcbiAgICBcIjg3NzlcIjogXCJhcGlkO1wiLFxuICAgIFwiODc4MFwiOiBcImJjb25nO1wiLFxuICAgIFwiODc4MVwiOiBcIkN1cENhcDtcIixcbiAgICBcIjg3ODJcIjogXCJIdW1wRG93bkh1bXA7XCIsXG4gICAgXCI4NzgzXCI6IFwiSHVtcEVxdWFsO1wiLFxuICAgIFwiODc4NFwiOiBcImVzZG90O1wiLFxuICAgIFwiODc4NVwiOiBcImVEb3Q7XCIsXG4gICAgXCI4Nzg2XCI6IFwiZmFsbGluZ2RvdHNlcTtcIixcbiAgICBcIjg3ODdcIjogXCJyaXNpbmdkb3RzZXE7XCIsXG4gICAgXCI4Nzg4XCI6IFwiY29sb25lcTtcIixcbiAgICBcIjg3ODlcIjogXCJlcWNvbG9uO1wiLFxuICAgIFwiODc5MFwiOiBcImVxY2lyYztcIixcbiAgICBcIjg3OTFcIjogXCJjaXJlO1wiLFxuICAgIFwiODc5M1wiOiBcIndlZGdlcTtcIixcbiAgICBcIjg3OTRcIjogXCJ2ZWVlcTtcIixcbiAgICBcIjg3OTZcIjogXCJ0cmllO1wiLFxuICAgIFwiODc5OVwiOiBcInF1ZXN0ZXE7XCIsXG4gICAgXCI4ODAwXCI6IFwiTm90RXF1YWw7XCIsXG4gICAgXCI4ODAxXCI6IFwiZXF1aXY7XCIsXG4gICAgXCI4ODAyXCI6IFwiTm90Q29uZ3J1ZW50O1wiLFxuICAgIFwiODgwNFwiOiBcImxlcTtcIixcbiAgICBcIjg4MDVcIjogXCJHcmVhdGVyRXF1YWw7XCIsXG4gICAgXCI4ODA2XCI6IFwiTGVzc0Z1bGxFcXVhbDtcIixcbiAgICBcIjg4MDdcIjogXCJHcmVhdGVyRnVsbEVxdWFsO1wiLFxuICAgIFwiODgwOFwiOiBcImxuZXFxO1wiLFxuICAgIFwiODgwOVwiOiBcImduZXFxO1wiLFxuICAgIFwiODgxMFwiOiBcIk5lc3RlZExlc3NMZXNzO1wiLFxuICAgIFwiODgxMVwiOiBcIk5lc3RlZEdyZWF0ZXJHcmVhdGVyO1wiLFxuICAgIFwiODgxMlwiOiBcInR3aXh0O1wiLFxuICAgIFwiODgxM1wiOiBcIk5vdEN1cENhcDtcIixcbiAgICBcIjg4MTRcIjogXCJOb3RMZXNzO1wiLFxuICAgIFwiODgxNVwiOiBcIk5vdEdyZWF0ZXI7XCIsXG4gICAgXCI4ODE2XCI6IFwiTm90TGVzc0VxdWFsO1wiLFxuICAgIFwiODgxN1wiOiBcIk5vdEdyZWF0ZXJFcXVhbDtcIixcbiAgICBcIjg4MThcIjogXCJsc2ltO1wiLFxuICAgIFwiODgxOVwiOiBcImd0cnNpbTtcIixcbiAgICBcIjg4MjBcIjogXCJOb3RMZXNzVGlsZGU7XCIsXG4gICAgXCI4ODIxXCI6IFwiTm90R3JlYXRlclRpbGRlO1wiLFxuICAgIFwiODgyMlwiOiBcImxnO1wiLFxuICAgIFwiODgyM1wiOiBcImd0cmxlc3M7XCIsXG4gICAgXCI4ODI0XCI6IFwibnRsZztcIixcbiAgICBcIjg4MjVcIjogXCJudGdsO1wiLFxuICAgIFwiODgyNlwiOiBcIlByZWNlZGVzO1wiLFxuICAgIFwiODgyN1wiOiBcIlN1Y2NlZWRzO1wiLFxuICAgIFwiODgyOFwiOiBcIlByZWNlZGVzU2xhbnRFcXVhbDtcIixcbiAgICBcIjg4MjlcIjogXCJTdWNjZWVkc1NsYW50RXF1YWw7XCIsXG4gICAgXCI4ODMwXCI6IFwicHJzaW07XCIsXG4gICAgXCI4ODMxXCI6IFwic3VjY3NpbTtcIixcbiAgICBcIjg4MzJcIjogXCJucHJlYztcIixcbiAgICBcIjg4MzNcIjogXCJuc3VjYztcIixcbiAgICBcIjg4MzRcIjogXCJzdWJzZXQ7XCIsXG4gICAgXCI4ODM1XCI6IFwic3Vwc2V0O1wiLFxuICAgIFwiODgzNlwiOiBcIm5zdWI7XCIsXG4gICAgXCI4ODM3XCI6IFwibnN1cDtcIixcbiAgICBcIjg4MzhcIjogXCJTdWJzZXRFcXVhbDtcIixcbiAgICBcIjg4MzlcIjogXCJzdXBzZXRlcTtcIixcbiAgICBcIjg4NDBcIjogXCJuc3Vic2V0ZXE7XCIsXG4gICAgXCI4ODQxXCI6IFwibnN1cHNldGVxO1wiLFxuICAgIFwiODg0MlwiOiBcInN1YnNldG5lcTtcIixcbiAgICBcIjg4NDNcIjogXCJzdXBzZXRuZXE7XCIsXG4gICAgXCI4ODQ1XCI6IFwiY3VwZG90O1wiLFxuICAgIFwiODg0NlwiOiBcInVwbHVzO1wiLFxuICAgIFwiODg0N1wiOiBcIlNxdWFyZVN1YnNldDtcIixcbiAgICBcIjg4NDhcIjogXCJTcXVhcmVTdXBlcnNldDtcIixcbiAgICBcIjg4NDlcIjogXCJTcXVhcmVTdWJzZXRFcXVhbDtcIixcbiAgICBcIjg4NTBcIjogXCJTcXVhcmVTdXBlcnNldEVxdWFsO1wiLFxuICAgIFwiODg1MVwiOiBcIlNxdWFyZUludGVyc2VjdGlvbjtcIixcbiAgICBcIjg4NTJcIjogXCJTcXVhcmVVbmlvbjtcIixcbiAgICBcIjg4NTNcIjogXCJvcGx1cztcIixcbiAgICBcIjg4NTRcIjogXCJvbWludXM7XCIsXG4gICAgXCI4ODU1XCI6IFwib3RpbWVzO1wiLFxuICAgIFwiODg1NlwiOiBcIm9zb2w7XCIsXG4gICAgXCI4ODU3XCI6IFwib2RvdDtcIixcbiAgICBcIjg4NThcIjogXCJvY2lyO1wiLFxuICAgIFwiODg1OVwiOiBcIm9hc3Q7XCIsXG4gICAgXCI4ODYxXCI6IFwib2Rhc2g7XCIsXG4gICAgXCI4ODYyXCI6IFwicGx1c2I7XCIsXG4gICAgXCI4ODYzXCI6IFwibWludXNiO1wiLFxuICAgIFwiODg2NFwiOiBcInRpbWVzYjtcIixcbiAgICBcIjg4NjVcIjogXCJzZG90YjtcIixcbiAgICBcIjg4NjZcIjogXCJ2ZGFzaDtcIixcbiAgICBcIjg4NjdcIjogXCJMZWZ0VGVlO1wiLFxuICAgIFwiODg2OFwiOiBcInRvcDtcIixcbiAgICBcIjg4NjlcIjogXCJVcFRlZTtcIixcbiAgICBcIjg4NzFcIjogXCJtb2RlbHM7XCIsXG4gICAgXCI4ODcyXCI6IFwidkRhc2g7XCIsXG4gICAgXCI4ODczXCI6IFwiVmRhc2g7XCIsXG4gICAgXCI4ODc0XCI6IFwiVnZkYXNoO1wiLFxuICAgIFwiODg3NVwiOiBcIlZEYXNoO1wiLFxuICAgIFwiODg3NlwiOiBcIm52ZGFzaDtcIixcbiAgICBcIjg4NzdcIjogXCJudkRhc2g7XCIsXG4gICAgXCI4ODc4XCI6IFwiblZkYXNoO1wiLFxuICAgIFwiODg3OVwiOiBcIm5WRGFzaDtcIixcbiAgICBcIjg4ODBcIjogXCJwcnVyZWw7XCIsXG4gICAgXCI4ODgyXCI6IFwidmx0cmk7XCIsXG4gICAgXCI4ODgzXCI6IFwidnJ0cmk7XCIsXG4gICAgXCI4ODg0XCI6IFwidHJpYW5nbGVsZWZ0ZXE7XCIsXG4gICAgXCI4ODg1XCI6IFwidHJpYW5nbGVyaWdodGVxO1wiLFxuICAgIFwiODg4NlwiOiBcIm9yaWdvZjtcIixcbiAgICBcIjg4ODdcIjogXCJpbW9mO1wiLFxuICAgIFwiODg4OFwiOiBcIm11bWFwO1wiLFxuICAgIFwiODg4OVwiOiBcImhlcmNvbjtcIixcbiAgICBcIjg4OTBcIjogXCJpbnRlcmNhbDtcIixcbiAgICBcIjg4OTFcIjogXCJ2ZWViYXI7XCIsXG4gICAgXCI4ODkzXCI6IFwiYmFydmVlO1wiLFxuICAgIFwiODg5NFwiOiBcImFuZ3J0dmI7XCIsXG4gICAgXCI4ODk1XCI6IFwibHJ0cmk7XCIsXG4gICAgXCI4ODk2XCI6IFwieHdlZGdlO1wiLFxuICAgIFwiODg5N1wiOiBcInh2ZWU7XCIsXG4gICAgXCI4ODk4XCI6IFwieGNhcDtcIixcbiAgICBcIjg4OTlcIjogXCJ4Y3VwO1wiLFxuICAgIFwiODkwMFwiOiBcImRpYW1vbmQ7XCIsXG4gICAgXCI4OTAxXCI6IFwic2RvdDtcIixcbiAgICBcIjg5MDJcIjogXCJTdGFyO1wiLFxuICAgIFwiODkwM1wiOiBcImRpdm9ueDtcIixcbiAgICBcIjg5MDRcIjogXCJib3d0aWU7XCIsXG4gICAgXCI4OTA1XCI6IFwibHRpbWVzO1wiLFxuICAgIFwiODkwNlwiOiBcInJ0aW1lcztcIixcbiAgICBcIjg5MDdcIjogXCJsdGhyZWU7XCIsXG4gICAgXCI4OTA4XCI6IFwicnRocmVlO1wiLFxuICAgIFwiODkwOVwiOiBcImJzaW1lO1wiLFxuICAgIFwiODkxMFwiOiBcImN1dmVlO1wiLFxuICAgIFwiODkxMVwiOiBcImN1d2VkO1wiLFxuICAgIFwiODkxMlwiOiBcIlN1YnNldDtcIixcbiAgICBcIjg5MTNcIjogXCJTdXBzZXQ7XCIsXG4gICAgXCI4OTE0XCI6IFwiQ2FwO1wiLFxuICAgIFwiODkxNVwiOiBcIkN1cDtcIixcbiAgICBcIjg5MTZcIjogXCJwaXRjaGZvcms7XCIsXG4gICAgXCI4OTE3XCI6IFwiZXBhcjtcIixcbiAgICBcIjg5MThcIjogXCJsdGRvdDtcIixcbiAgICBcIjg5MTlcIjogXCJndHJkb3Q7XCIsXG4gICAgXCI4OTIwXCI6IFwiTGw7XCIsXG4gICAgXCI4OTIxXCI6IFwiZ2dnO1wiLFxuICAgIFwiODkyMlwiOiBcIkxlc3NFcXVhbEdyZWF0ZXI7XCIsXG4gICAgXCI4OTIzXCI6IFwiZ3RyZXFsZXNzO1wiLFxuICAgIFwiODkyNlwiOiBcImN1cmx5ZXFwcmVjO1wiLFxuICAgIFwiODkyN1wiOiBcImN1cmx5ZXFzdWNjO1wiLFxuICAgIFwiODkyOFwiOiBcIm5wcmN1ZTtcIixcbiAgICBcIjg5MjlcIjogXCJuc2NjdWU7XCIsXG4gICAgXCI4OTMwXCI6IFwibnNxc3ViZTtcIixcbiAgICBcIjg5MzFcIjogXCJuc3FzdXBlO1wiLFxuICAgIFwiODkzNFwiOiBcImxuc2ltO1wiLFxuICAgIFwiODkzNVwiOiBcImduc2ltO1wiLFxuICAgIFwiODkzNlwiOiBcInBybnNpbTtcIixcbiAgICBcIjg5MzdcIjogXCJzdWNjbnNpbTtcIixcbiAgICBcIjg5MzhcIjogXCJudHJpYW5nbGVsZWZ0O1wiLFxuICAgIFwiODkzOVwiOiBcIm50cmlhbmdsZXJpZ2h0O1wiLFxuICAgIFwiODk0MFwiOiBcIm50cmlhbmdsZWxlZnRlcTtcIixcbiAgICBcIjg5NDFcIjogXCJudHJpYW5nbGVyaWdodGVxO1wiLFxuICAgIFwiODk0MlwiOiBcInZlbGxpcDtcIixcbiAgICBcIjg5NDNcIjogXCJjdGRvdDtcIixcbiAgICBcIjg5NDRcIjogXCJ1dGRvdDtcIixcbiAgICBcIjg5NDVcIjogXCJkdGRvdDtcIixcbiAgICBcIjg5NDZcIjogXCJkaXNpbjtcIixcbiAgICBcIjg5NDdcIjogXCJpc2luc3Y7XCIsXG4gICAgXCI4OTQ4XCI6IFwiaXNpbnM7XCIsXG4gICAgXCI4OTQ5XCI6IFwiaXNpbmRvdDtcIixcbiAgICBcIjg5NTBcIjogXCJub3RpbnZjO1wiLFxuICAgIFwiODk1MVwiOiBcIm5vdGludmI7XCIsXG4gICAgXCI4OTUzXCI6IFwiaXNpbkU7XCIsXG4gICAgXCI4OTU0XCI6IFwibmlzZDtcIixcbiAgICBcIjg5NTVcIjogXCJ4bmlzO1wiLFxuICAgIFwiODk1NlwiOiBcIm5pcztcIixcbiAgICBcIjg5NTdcIjogXCJub3RuaXZjO1wiLFxuICAgIFwiODk1OFwiOiBcIm5vdG5pdmI7XCIsXG4gICAgXCI4OTY1XCI6IFwiYmFyd2VkZ2U7XCIsXG4gICAgXCI4OTY2XCI6IFwiZG91YmxlYmFyd2VkZ2U7XCIsXG4gICAgXCI4OTY4XCI6IFwiTGVmdENlaWxpbmc7XCIsXG4gICAgXCI4OTY5XCI6IFwiUmlnaHRDZWlsaW5nO1wiLFxuICAgIFwiODk3MFwiOiBcImxmbG9vcjtcIixcbiAgICBcIjg5NzFcIjogXCJSaWdodEZsb29yO1wiLFxuICAgIFwiODk3MlwiOiBcImRyY3JvcDtcIixcbiAgICBcIjg5NzNcIjogXCJkbGNyb3A7XCIsXG4gICAgXCI4OTc0XCI6IFwidXJjcm9wO1wiLFxuICAgIFwiODk3NVwiOiBcInVsY3JvcDtcIixcbiAgICBcIjg5NzZcIjogXCJibm90O1wiLFxuICAgIFwiODk3OFwiOiBcInByb2ZsaW5lO1wiLFxuICAgIFwiODk3OVwiOiBcInByb2ZzdXJmO1wiLFxuICAgIFwiODk4MVwiOiBcInRlbHJlYztcIixcbiAgICBcIjg5ODJcIjogXCJ0YXJnZXQ7XCIsXG4gICAgXCI4OTg4XCI6IFwidWxjb3JuZXI7XCIsXG4gICAgXCI4OTg5XCI6IFwidXJjb3JuZXI7XCIsXG4gICAgXCI4OTkwXCI6IFwibGxjb3JuZXI7XCIsXG4gICAgXCI4OTkxXCI6IFwibHJjb3JuZXI7XCIsXG4gICAgXCI4OTk0XCI6IFwic2Zyb3duO1wiLFxuICAgIFwiODk5NVwiOiBcInNzbWlsZTtcIixcbiAgICBcIjkwMDVcIjogXCJjeWxjdHk7XCIsXG4gICAgXCI5MDA2XCI6IFwicHJvZmFsYXI7XCIsXG4gICAgXCI5MDE0XCI6IFwidG9wYm90O1wiLFxuICAgIFwiOTAyMVwiOiBcIm92YmFyO1wiLFxuICAgIFwiOTAyM1wiOiBcInNvbGJhcjtcIixcbiAgICBcIjkwODRcIjogXCJhbmd6YXJyO1wiLFxuICAgIFwiOTEzNlwiOiBcImxtb3VzdGFjaGU7XCIsXG4gICAgXCI5MTM3XCI6IFwicm1vdXN0YWNoZTtcIixcbiAgICBcIjkxNDBcIjogXCJ0YnJrO1wiLFxuICAgIFwiOTE0MVwiOiBcIlVuZGVyQnJhY2tldDtcIixcbiAgICBcIjkxNDJcIjogXCJiYnJrdGJyaztcIixcbiAgICBcIjkxODBcIjogXCJPdmVyUGFyZW50aGVzaXM7XCIsXG4gICAgXCI5MTgxXCI6IFwiVW5kZXJQYXJlbnRoZXNpcztcIixcbiAgICBcIjkxODJcIjogXCJPdmVyQnJhY2U7XCIsXG4gICAgXCI5MTgzXCI6IFwiVW5kZXJCcmFjZTtcIixcbiAgICBcIjkxODZcIjogXCJ0cnBleml1bTtcIixcbiAgICBcIjkxOTFcIjogXCJlbGludGVycztcIixcbiAgICBcIjkyNTFcIjogXCJibGFuaztcIixcbiAgICBcIjk0MTZcIjogXCJvUztcIixcbiAgICBcIjk0NzJcIjogXCJIb3Jpem9udGFsTGluZTtcIixcbiAgICBcIjk0NzRcIjogXCJib3h2O1wiLFxuICAgIFwiOTQ4NFwiOiBcImJveGRyO1wiLFxuICAgIFwiOTQ4OFwiOiBcImJveGRsO1wiLFxuICAgIFwiOTQ5MlwiOiBcImJveHVyO1wiLFxuICAgIFwiOTQ5NlwiOiBcImJveHVsO1wiLFxuICAgIFwiOTUwMFwiOiBcImJveHZyO1wiLFxuICAgIFwiOTUwOFwiOiBcImJveHZsO1wiLFxuICAgIFwiOTUxNlwiOiBcImJveGhkO1wiLFxuICAgIFwiOTUyNFwiOiBcImJveGh1O1wiLFxuICAgIFwiOTUzMlwiOiBcImJveHZoO1wiLFxuICAgIFwiOTU1MlwiOiBcImJveEg7XCIsXG4gICAgXCI5NTUzXCI6IFwiYm94VjtcIixcbiAgICBcIjk1NTRcIjogXCJib3hkUjtcIixcbiAgICBcIjk1NTVcIjogXCJib3hEcjtcIixcbiAgICBcIjk1NTZcIjogXCJib3hEUjtcIixcbiAgICBcIjk1NTdcIjogXCJib3hkTDtcIixcbiAgICBcIjk1NThcIjogXCJib3hEbDtcIixcbiAgICBcIjk1NTlcIjogXCJib3hETDtcIixcbiAgICBcIjk1NjBcIjogXCJib3h1UjtcIixcbiAgICBcIjk1NjFcIjogXCJib3hVcjtcIixcbiAgICBcIjk1NjJcIjogXCJib3hVUjtcIixcbiAgICBcIjk1NjNcIjogXCJib3h1TDtcIixcbiAgICBcIjk1NjRcIjogXCJib3hVbDtcIixcbiAgICBcIjk1NjVcIjogXCJib3hVTDtcIixcbiAgICBcIjk1NjZcIjogXCJib3h2UjtcIixcbiAgICBcIjk1NjdcIjogXCJib3hWcjtcIixcbiAgICBcIjk1NjhcIjogXCJib3hWUjtcIixcbiAgICBcIjk1NjlcIjogXCJib3h2TDtcIixcbiAgICBcIjk1NzBcIjogXCJib3hWbDtcIixcbiAgICBcIjk1NzFcIjogXCJib3hWTDtcIixcbiAgICBcIjk1NzJcIjogXCJib3hIZDtcIixcbiAgICBcIjk1NzNcIjogXCJib3hoRDtcIixcbiAgICBcIjk1NzRcIjogXCJib3hIRDtcIixcbiAgICBcIjk1NzVcIjogXCJib3hIdTtcIixcbiAgICBcIjk1NzZcIjogXCJib3hoVTtcIixcbiAgICBcIjk1NzdcIjogXCJib3hIVTtcIixcbiAgICBcIjk1NzhcIjogXCJib3h2SDtcIixcbiAgICBcIjk1NzlcIjogXCJib3hWaDtcIixcbiAgICBcIjk1ODBcIjogXCJib3hWSDtcIixcbiAgICBcIjk2MDBcIjogXCJ1aGJsaztcIixcbiAgICBcIjk2MDRcIjogXCJsaGJsaztcIixcbiAgICBcIjk2MDhcIjogXCJibG9jaztcIixcbiAgICBcIjk2MTdcIjogXCJibGsxNDtcIixcbiAgICBcIjk2MThcIjogXCJibGsxMjtcIixcbiAgICBcIjk2MTlcIjogXCJibGszNDtcIixcbiAgICBcIjk2MzNcIjogXCJzcXVhcmU7XCIsXG4gICAgXCI5NjQyXCI6IFwic3F1ZjtcIixcbiAgICBcIjk2NDNcIjogXCJFbXB0eVZlcnlTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk2NDVcIjogXCJyZWN0O1wiLFxuICAgIFwiOTY0NlwiOiBcIm1hcmtlcjtcIixcbiAgICBcIjk2NDlcIjogXCJmbHRucztcIixcbiAgICBcIjk2NTFcIjogXCJ4dXRyaTtcIixcbiAgICBcIjk2NTJcIjogXCJ1dHJpZjtcIixcbiAgICBcIjk2NTNcIjogXCJ1dHJpO1wiLFxuICAgIFwiOTY1NlwiOiBcInJ0cmlmO1wiLFxuICAgIFwiOTY1N1wiOiBcInRyaWFuZ2xlcmlnaHQ7XCIsXG4gICAgXCI5NjYxXCI6IFwieGR0cmk7XCIsXG4gICAgXCI5NjYyXCI6IFwiZHRyaWY7XCIsXG4gICAgXCI5NjYzXCI6IFwidHJpYW5nbGVkb3duO1wiLFxuICAgIFwiOTY2NlwiOiBcImx0cmlmO1wiLFxuICAgIFwiOTY2N1wiOiBcInRyaWFuZ2xlbGVmdDtcIixcbiAgICBcIjk2NzRcIjogXCJsb3plbmdlO1wiLFxuICAgIFwiOTY3NVwiOiBcImNpcjtcIixcbiAgICBcIjk3MDhcIjogXCJ0cmlkb3Q7XCIsXG4gICAgXCI5NzExXCI6IFwieGNpcmM7XCIsXG4gICAgXCI5NzIwXCI6IFwidWx0cmk7XCIsXG4gICAgXCI5NzIxXCI6IFwidXJ0cmk7XCIsXG4gICAgXCI5NzIyXCI6IFwibGx0cmk7XCIsXG4gICAgXCI5NzIzXCI6IFwiRW1wdHlTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk3MjRcIjogXCJGaWxsZWRTbWFsbFNxdWFyZTtcIixcbiAgICBcIjk3MzNcIjogXCJzdGFyZjtcIixcbiAgICBcIjk3MzRcIjogXCJzdGFyO1wiLFxuICAgIFwiOTc0MlwiOiBcInBob25lO1wiLFxuICAgIFwiOTc5MlwiOiBcImZlbWFsZTtcIixcbiAgICBcIjk3OTRcIjogXCJtYWxlO1wiLFxuICAgIFwiOTgyNFwiOiBcInNwYWRlc3VpdDtcIixcbiAgICBcIjk4MjdcIjogXCJjbHVic3VpdDtcIixcbiAgICBcIjk4MjlcIjogXCJoZWFydHN1aXQ7XCIsXG4gICAgXCI5ODMwXCI6IFwiZGlhbXM7XCIsXG4gICAgXCI5ODM0XCI6IFwic3VuZztcIixcbiAgICBcIjk4MzdcIjogXCJmbGF0O1wiLFxuICAgIFwiOTgzOFwiOiBcIm5hdHVyYWw7XCIsXG4gICAgXCI5ODM5XCI6IFwic2hhcnA7XCIsXG4gICAgXCIxMDAwM1wiOiBcImNoZWNrbWFyaztcIixcbiAgICBcIjEwMDA3XCI6IFwiY3Jvc3M7XCIsXG4gICAgXCIxMDAxNlwiOiBcIm1hbHRlc2U7XCIsXG4gICAgXCIxMDAzOFwiOiBcInNleHQ7XCIsXG4gICAgXCIxMDA3MlwiOiBcIlZlcnRpY2FsU2VwYXJhdG9yO1wiLFxuICAgIFwiMTAwOThcIjogXCJsYmJyaztcIixcbiAgICBcIjEwMDk5XCI6IFwicmJicms7XCIsXG4gICAgXCIxMDE4NFwiOiBcImJzb2xoc3ViO1wiLFxuICAgIFwiMTAxODVcIjogXCJzdXBoc29sO1wiLFxuICAgIFwiMTAyMTRcIjogXCJsb2JyaztcIixcbiAgICBcIjEwMjE1XCI6IFwicm9icms7XCIsXG4gICAgXCIxMDIxNlwiOiBcIkxlZnRBbmdsZUJyYWNrZXQ7XCIsXG4gICAgXCIxMDIxN1wiOiBcIlJpZ2h0QW5nbGVCcmFja2V0O1wiLFxuICAgIFwiMTAyMThcIjogXCJMYW5nO1wiLFxuICAgIFwiMTAyMTlcIjogXCJSYW5nO1wiLFxuICAgIFwiMTAyMjBcIjogXCJsb2FuZztcIixcbiAgICBcIjEwMjIxXCI6IFwicm9hbmc7XCIsXG4gICAgXCIxMDIyOVwiOiBcInhsYXJyO1wiLFxuICAgIFwiMTAyMzBcIjogXCJ4cmFycjtcIixcbiAgICBcIjEwMjMxXCI6IFwieGhhcnI7XCIsXG4gICAgXCIxMDIzMlwiOiBcInhsQXJyO1wiLFxuICAgIFwiMTAyMzNcIjogXCJ4ckFycjtcIixcbiAgICBcIjEwMjM0XCI6IFwieGhBcnI7XCIsXG4gICAgXCIxMDIzNlwiOiBcInhtYXA7XCIsXG4gICAgXCIxMDIzOVwiOiBcImR6aWdyYXJyO1wiLFxuICAgIFwiMTA0OThcIjogXCJudmxBcnI7XCIsXG4gICAgXCIxMDQ5OVwiOiBcIm52ckFycjtcIixcbiAgICBcIjEwNTAwXCI6IFwibnZIYXJyO1wiLFxuICAgIFwiMTA1MDFcIjogXCJNYXA7XCIsXG4gICAgXCIxMDUwOFwiOiBcImxiYXJyO1wiLFxuICAgIFwiMTA1MDlcIjogXCJyYmFycjtcIixcbiAgICBcIjEwNTEwXCI6IFwibEJhcnI7XCIsXG4gICAgXCIxMDUxMVwiOiBcInJCYXJyO1wiLFxuICAgIFwiMTA1MTJcIjogXCJSQmFycjtcIixcbiAgICBcIjEwNTEzXCI6IFwiRERvdHJhaGQ7XCIsXG4gICAgXCIxMDUxNFwiOiBcIlVwQXJyb3dCYXI7XCIsXG4gICAgXCIxMDUxNVwiOiBcIkRvd25BcnJvd0JhcjtcIixcbiAgICBcIjEwNTE4XCI6IFwiUmFycnRsO1wiLFxuICAgIFwiMTA1MjFcIjogXCJsYXRhaWw7XCIsXG4gICAgXCIxMDUyMlwiOiBcInJhdGFpbDtcIixcbiAgICBcIjEwNTIzXCI6IFwibEF0YWlsO1wiLFxuICAgIFwiMTA1MjRcIjogXCJyQXRhaWw7XCIsXG4gICAgXCIxMDUyNVwiOiBcImxhcnJmcztcIixcbiAgICBcIjEwNTI2XCI6IFwicmFycmZzO1wiLFxuICAgIFwiMTA1MjdcIjogXCJsYXJyYmZzO1wiLFxuICAgIFwiMTA1MjhcIjogXCJyYXJyYmZzO1wiLFxuICAgIFwiMTA1MzFcIjogXCJud2FyaGs7XCIsXG4gICAgXCIxMDUzMlwiOiBcIm5lYXJoaztcIixcbiAgICBcIjEwNTMzXCI6IFwic2VhcmhrO1wiLFxuICAgIFwiMTA1MzRcIjogXCJzd2FyaGs7XCIsXG4gICAgXCIxMDUzNVwiOiBcIm53bmVhcjtcIixcbiAgICBcIjEwNTM2XCI6IFwidG9lYTtcIixcbiAgICBcIjEwNTM3XCI6IFwidG9zYTtcIixcbiAgICBcIjEwNTM4XCI6IFwic3dud2FyO1wiLFxuICAgIFwiMTA1NDdcIjogXCJyYXJyYztcIixcbiAgICBcIjEwNTQ5XCI6IFwiY3VkYXJycjtcIixcbiAgICBcIjEwNTUwXCI6IFwibGRjYTtcIixcbiAgICBcIjEwNTUxXCI6IFwicmRjYTtcIixcbiAgICBcIjEwNTUyXCI6IFwiY3VkYXJybDtcIixcbiAgICBcIjEwNTUzXCI6IFwibGFycnBsO1wiLFxuICAgIFwiMTA1NTZcIjogXCJjdXJhcnJtO1wiLFxuICAgIFwiMTA1NTdcIjogXCJjdWxhcnJwO1wiLFxuICAgIFwiMTA1NjVcIjogXCJyYXJycGw7XCIsXG4gICAgXCIxMDU2OFwiOiBcImhhcnJjaXI7XCIsXG4gICAgXCIxMDU2OVwiOiBcIlVhcnJvY2lyO1wiLFxuICAgIFwiMTA1NzBcIjogXCJsdXJkc2hhcjtcIixcbiAgICBcIjEwNTcxXCI6IFwibGRydXNoYXI7XCIsXG4gICAgXCIxMDU3NFwiOiBcIkxlZnRSaWdodFZlY3RvcjtcIixcbiAgICBcIjEwNTc1XCI6IFwiUmlnaHRVcERvd25WZWN0b3I7XCIsXG4gICAgXCIxMDU3NlwiOiBcIkRvd25MZWZ0UmlnaHRWZWN0b3I7XCIsXG4gICAgXCIxMDU3N1wiOiBcIkxlZnRVcERvd25WZWN0b3I7XCIsXG4gICAgXCIxMDU3OFwiOiBcIkxlZnRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU3OVwiOiBcIlJpZ2h0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODBcIjogXCJSaWdodFVwVmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODFcIjogXCJSaWdodERvd25WZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4MlwiOiBcIkRvd25MZWZ0VmVjdG9yQmFyO1wiLFxuICAgIFwiMTA1ODNcIjogXCJEb3duUmlnaHRWZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4NFwiOiBcIkxlZnRVcFZlY3RvckJhcjtcIixcbiAgICBcIjEwNTg1XCI6IFwiTGVmdERvd25WZWN0b3JCYXI7XCIsXG4gICAgXCIxMDU4NlwiOiBcIkxlZnRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU4N1wiOiBcIlJpZ2h0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1ODhcIjogXCJSaWdodFVwVGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1ODlcIjogXCJSaWdodERvd25UZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MFwiOiBcIkRvd25MZWZ0VGVlVmVjdG9yO1wiLFxuICAgIFwiMTA1OTFcIjogXCJEb3duUmlnaHRUZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5MlwiOiBcIkxlZnRVcFRlZVZlY3RvcjtcIixcbiAgICBcIjEwNTkzXCI6IFwiTGVmdERvd25UZWVWZWN0b3I7XCIsXG4gICAgXCIxMDU5NFwiOiBcImxIYXI7XCIsXG4gICAgXCIxMDU5NVwiOiBcInVIYXI7XCIsXG4gICAgXCIxMDU5NlwiOiBcInJIYXI7XCIsXG4gICAgXCIxMDU5N1wiOiBcImRIYXI7XCIsXG4gICAgXCIxMDU5OFwiOiBcImx1cnVoYXI7XCIsXG4gICAgXCIxMDU5OVwiOiBcImxkcmRoYXI7XCIsXG4gICAgXCIxMDYwMFwiOiBcInJ1bHVoYXI7XCIsXG4gICAgXCIxMDYwMVwiOiBcInJkbGRoYXI7XCIsXG4gICAgXCIxMDYwMlwiOiBcImxoYXJ1bDtcIixcbiAgICBcIjEwNjAzXCI6IFwibGxoYXJkO1wiLFxuICAgIFwiMTA2MDRcIjogXCJyaGFydWw7XCIsXG4gICAgXCIxMDYwNVwiOiBcImxyaGFyZDtcIixcbiAgICBcIjEwNjA2XCI6IFwiVXBFcXVpbGlicml1bTtcIixcbiAgICBcIjEwNjA3XCI6IFwiUmV2ZXJzZVVwRXF1aWxpYnJpdW07XCIsXG4gICAgXCIxMDYwOFwiOiBcIlJvdW5kSW1wbGllcztcIixcbiAgICBcIjEwNjA5XCI6IFwiZXJhcnI7XCIsXG4gICAgXCIxMDYxMFwiOiBcInNpbXJhcnI7XCIsXG4gICAgXCIxMDYxMVwiOiBcImxhcnJzaW07XCIsXG4gICAgXCIxMDYxMlwiOiBcInJhcnJzaW07XCIsXG4gICAgXCIxMDYxM1wiOiBcInJhcnJhcDtcIixcbiAgICBcIjEwNjE0XCI6IFwibHRsYXJyO1wiLFxuICAgIFwiMTA2MTZcIjogXCJndHJhcnI7XCIsXG4gICAgXCIxMDYxN1wiOiBcInN1YnJhcnI7XCIsXG4gICAgXCIxMDYxOVwiOiBcInN1cGxhcnI7XCIsXG4gICAgXCIxMDYyMFwiOiBcImxmaXNodDtcIixcbiAgICBcIjEwNjIxXCI6IFwicmZpc2h0O1wiLFxuICAgIFwiMTA2MjJcIjogXCJ1ZmlzaHQ7XCIsXG4gICAgXCIxMDYyM1wiOiBcImRmaXNodDtcIixcbiAgICBcIjEwNjI5XCI6IFwibG9wYXI7XCIsXG4gICAgXCIxMDYzMFwiOiBcInJvcGFyO1wiLFxuICAgIFwiMTA2MzVcIjogXCJsYnJrZTtcIixcbiAgICBcIjEwNjM2XCI6IFwicmJya2U7XCIsXG4gICAgXCIxMDYzN1wiOiBcImxicmtzbHU7XCIsXG4gICAgXCIxMDYzOFwiOiBcInJicmtzbGQ7XCIsXG4gICAgXCIxMDYzOVwiOiBcImxicmtzbGQ7XCIsXG4gICAgXCIxMDY0MFwiOiBcInJicmtzbHU7XCIsXG4gICAgXCIxMDY0MVwiOiBcImxhbmdkO1wiLFxuICAgIFwiMTA2NDJcIjogXCJyYW5nZDtcIixcbiAgICBcIjEwNjQzXCI6IFwibHBhcmx0O1wiLFxuICAgIFwiMTA2NDRcIjogXCJycGFyZ3Q7XCIsXG4gICAgXCIxMDY0NVwiOiBcImd0bFBhcjtcIixcbiAgICBcIjEwNjQ2XCI6IFwibHRyUGFyO1wiLFxuICAgIFwiMTA2NTBcIjogXCJ2emlnemFnO1wiLFxuICAgIFwiMTA2NTJcIjogXCJ2YW5ncnQ7XCIsXG4gICAgXCIxMDY1M1wiOiBcImFuZ3J0dmJkO1wiLFxuICAgIFwiMTA2NjBcIjogXCJhbmdlO1wiLFxuICAgIFwiMTA2NjFcIjogXCJyYW5nZTtcIixcbiAgICBcIjEwNjYyXCI6IFwiZHdhbmdsZTtcIixcbiAgICBcIjEwNjYzXCI6IFwidXdhbmdsZTtcIixcbiAgICBcIjEwNjY0XCI6IFwiYW5nbXNkYWE7XCIsXG4gICAgXCIxMDY2NVwiOiBcImFuZ21zZGFiO1wiLFxuICAgIFwiMTA2NjZcIjogXCJhbmdtc2RhYztcIixcbiAgICBcIjEwNjY3XCI6IFwiYW5nbXNkYWQ7XCIsXG4gICAgXCIxMDY2OFwiOiBcImFuZ21zZGFlO1wiLFxuICAgIFwiMTA2NjlcIjogXCJhbmdtc2RhZjtcIixcbiAgICBcIjEwNjcwXCI6IFwiYW5nbXNkYWc7XCIsXG4gICAgXCIxMDY3MVwiOiBcImFuZ21zZGFoO1wiLFxuICAgIFwiMTA2NzJcIjogXCJiZW1wdHl2O1wiLFxuICAgIFwiMTA2NzNcIjogXCJkZW1wdHl2O1wiLFxuICAgIFwiMTA2NzRcIjogXCJjZW1wdHl2O1wiLFxuICAgIFwiMTA2NzVcIjogXCJyYWVtcHR5djtcIixcbiAgICBcIjEwNjc2XCI6IFwibGFlbXB0eXY7XCIsXG4gICAgXCIxMDY3N1wiOiBcIm9oYmFyO1wiLFxuICAgIFwiMTA2NzhcIjogXCJvbWlkO1wiLFxuICAgIFwiMTA2NzlcIjogXCJvcGFyO1wiLFxuICAgIFwiMTA2ODFcIjogXCJvcGVycDtcIixcbiAgICBcIjEwNjgzXCI6IFwib2xjcm9zcztcIixcbiAgICBcIjEwNjg0XCI6IFwib2Rzb2xkO1wiLFxuICAgIFwiMTA2ODZcIjogXCJvbGNpcjtcIixcbiAgICBcIjEwNjg3XCI6IFwib2ZjaXI7XCIsXG4gICAgXCIxMDY4OFwiOiBcIm9sdDtcIixcbiAgICBcIjEwNjg5XCI6IFwib2d0O1wiLFxuICAgIFwiMTA2OTBcIjogXCJjaXJzY2lyO1wiLFxuICAgIFwiMTA2OTFcIjogXCJjaXJFO1wiLFxuICAgIFwiMTA2OTJcIjogXCJzb2xiO1wiLFxuICAgIFwiMTA2OTNcIjogXCJic29sYjtcIixcbiAgICBcIjEwNjk3XCI6IFwiYm94Ym94O1wiLFxuICAgIFwiMTA3MDFcIjogXCJ0cmlzYjtcIixcbiAgICBcIjEwNzAyXCI6IFwicnRyaWx0cmk7XCIsXG4gICAgXCIxMDcwM1wiOiBcIkxlZnRUcmlhbmdsZUJhcjtcIixcbiAgICBcIjEwNzA0XCI6IFwiUmlnaHRUcmlhbmdsZUJhcjtcIixcbiAgICBcIjEwNzE2XCI6IFwiaWluZmluO1wiLFxuICAgIFwiMTA3MTdcIjogXCJpbmZpbnRpZTtcIixcbiAgICBcIjEwNzE4XCI6IFwibnZpbmZpbjtcIixcbiAgICBcIjEwNzIzXCI6IFwiZXBhcnNsO1wiLFxuICAgIFwiMTA3MjRcIjogXCJzbWVwYXJzbDtcIixcbiAgICBcIjEwNzI1XCI6IFwiZXF2cGFyc2w7XCIsXG4gICAgXCIxMDczMVwiOiBcImxvemY7XCIsXG4gICAgXCIxMDc0MFwiOiBcIlJ1bGVEZWxheWVkO1wiLFxuICAgIFwiMTA3NDJcIjogXCJkc29sO1wiLFxuICAgIFwiMTA3NTJcIjogXCJ4b2RvdDtcIixcbiAgICBcIjEwNzUzXCI6IFwieG9wbHVzO1wiLFxuICAgIFwiMTA3NTRcIjogXCJ4b3RpbWU7XCIsXG4gICAgXCIxMDc1NlwiOiBcInh1cGx1cztcIixcbiAgICBcIjEwNzU4XCI6IFwieHNxY3VwO1wiLFxuICAgIFwiMTA3NjRcIjogXCJxaW50O1wiLFxuICAgIFwiMTA3NjVcIjogXCJmcGFydGludDtcIixcbiAgICBcIjEwNzY4XCI6IFwiY2lyZm5pbnQ7XCIsXG4gICAgXCIxMDc2OVwiOiBcImF3aW50O1wiLFxuICAgIFwiMTA3NzBcIjogXCJycHBvbGludDtcIixcbiAgICBcIjEwNzcxXCI6IFwic2Nwb2xpbnQ7XCIsXG4gICAgXCIxMDc3MlwiOiBcIm5wb2xpbnQ7XCIsXG4gICAgXCIxMDc3M1wiOiBcInBvaW50aW50O1wiLFxuICAgIFwiMTA3NzRcIjogXCJxdWF0aW50O1wiLFxuICAgIFwiMTA3NzVcIjogXCJpbnRsYXJoaztcIixcbiAgICBcIjEwNzg2XCI6IFwicGx1c2NpcjtcIixcbiAgICBcIjEwNzg3XCI6IFwicGx1c2FjaXI7XCIsXG4gICAgXCIxMDc4OFwiOiBcInNpbXBsdXM7XCIsXG4gICAgXCIxMDc4OVwiOiBcInBsdXNkdTtcIixcbiAgICBcIjEwNzkwXCI6IFwicGx1c3NpbTtcIixcbiAgICBcIjEwNzkxXCI6IFwicGx1c3R3bztcIixcbiAgICBcIjEwNzkzXCI6IFwibWNvbW1hO1wiLFxuICAgIFwiMTA3OTRcIjogXCJtaW51c2R1O1wiLFxuICAgIFwiMTA3OTdcIjogXCJsb3BsdXM7XCIsXG4gICAgXCIxMDc5OFwiOiBcInJvcGx1cztcIixcbiAgICBcIjEwNzk5XCI6IFwiQ3Jvc3M7XCIsXG4gICAgXCIxMDgwMFwiOiBcInRpbWVzZDtcIixcbiAgICBcIjEwODAxXCI6IFwidGltZXNiYXI7XCIsXG4gICAgXCIxMDgwM1wiOiBcInNtYXNocDtcIixcbiAgICBcIjEwODA0XCI6IFwibG90aW1lcztcIixcbiAgICBcIjEwODA1XCI6IFwicm90aW1lcztcIixcbiAgICBcIjEwODA2XCI6IFwib3RpbWVzYXM7XCIsXG4gICAgXCIxMDgwN1wiOiBcIk90aW1lcztcIixcbiAgICBcIjEwODA4XCI6IFwib2RpdjtcIixcbiAgICBcIjEwODA5XCI6IFwidHJpcGx1cztcIixcbiAgICBcIjEwODEwXCI6IFwidHJpbWludXM7XCIsXG4gICAgXCIxMDgxMVwiOiBcInRyaXRpbWU7XCIsXG4gICAgXCIxMDgxMlwiOiBcImlwcm9kO1wiLFxuICAgIFwiMTA4MTVcIjogXCJhbWFsZztcIixcbiAgICBcIjEwODE2XCI6IFwiY2FwZG90O1wiLFxuICAgIFwiMTA4MThcIjogXCJuY3VwO1wiLFxuICAgIFwiMTA4MTlcIjogXCJuY2FwO1wiLFxuICAgIFwiMTA4MjBcIjogXCJjYXBhbmQ7XCIsXG4gICAgXCIxMDgyMVwiOiBcImN1cG9yO1wiLFxuICAgIFwiMTA4MjJcIjogXCJjdXBjYXA7XCIsXG4gICAgXCIxMDgyM1wiOiBcImNhcGN1cDtcIixcbiAgICBcIjEwODI0XCI6IFwiY3VwYnJjYXA7XCIsXG4gICAgXCIxMDgyNVwiOiBcImNhcGJyY3VwO1wiLFxuICAgIFwiMTA4MjZcIjogXCJjdXBjdXA7XCIsXG4gICAgXCIxMDgyN1wiOiBcImNhcGNhcDtcIixcbiAgICBcIjEwODI4XCI6IFwiY2N1cHM7XCIsXG4gICAgXCIxMDgyOVwiOiBcImNjYXBzO1wiLFxuICAgIFwiMTA4MzJcIjogXCJjY3Vwc3NtO1wiLFxuICAgIFwiMTA4MzVcIjogXCJBbmQ7XCIsXG4gICAgXCIxMDgzNlwiOiBcIk9yO1wiLFxuICAgIFwiMTA4MzdcIjogXCJhbmRhbmQ7XCIsXG4gICAgXCIxMDgzOFwiOiBcIm9yb3I7XCIsXG4gICAgXCIxMDgzOVwiOiBcIm9yc2xvcGU7XCIsXG4gICAgXCIxMDg0MFwiOiBcImFuZHNsb3BlO1wiLFxuICAgIFwiMTA4NDJcIjogXCJhbmR2O1wiLFxuICAgIFwiMTA4NDNcIjogXCJvcnY7XCIsXG4gICAgXCIxMDg0NFwiOiBcImFuZGQ7XCIsXG4gICAgXCIxMDg0NVwiOiBcIm9yZDtcIixcbiAgICBcIjEwODQ3XCI6IFwid2VkYmFyO1wiLFxuICAgIFwiMTA4NTRcIjogXCJzZG90ZTtcIixcbiAgICBcIjEwODU4XCI6IFwic2ltZG90O1wiLFxuICAgIFwiMTA4NjFcIjogXCJjb25nZG90O1wiLFxuICAgIFwiMTA4NjJcIjogXCJlYXN0ZXI7XCIsXG4gICAgXCIxMDg2M1wiOiBcImFwYWNpcjtcIixcbiAgICBcIjEwODY0XCI6IFwiYXBFO1wiLFxuICAgIFwiMTA4NjVcIjogXCJlcGx1cztcIixcbiAgICBcIjEwODY2XCI6IFwicGx1c2U7XCIsXG4gICAgXCIxMDg2N1wiOiBcIkVzaW07XCIsXG4gICAgXCIxMDg2OFwiOiBcIkNvbG9uZTtcIixcbiAgICBcIjEwODY5XCI6IFwiRXF1YWw7XCIsXG4gICAgXCIxMDg3MVwiOiBcImVERG90O1wiLFxuICAgIFwiMTA4NzJcIjogXCJlcXVpdkREO1wiLFxuICAgIFwiMTA4NzNcIjogXCJsdGNpcjtcIixcbiAgICBcIjEwODc0XCI6IFwiZ3RjaXI7XCIsXG4gICAgXCIxMDg3NVwiOiBcImx0cXVlc3Q7XCIsXG4gICAgXCIxMDg3NlwiOiBcImd0cXVlc3Q7XCIsXG4gICAgXCIxMDg3N1wiOiBcIkxlc3NTbGFudEVxdWFsO1wiLFxuICAgIFwiMTA4NzhcIjogXCJHcmVhdGVyU2xhbnRFcXVhbDtcIixcbiAgICBcIjEwODc5XCI6IFwibGVzZG90O1wiLFxuICAgIFwiMTA4ODBcIjogXCJnZXNkb3Q7XCIsXG4gICAgXCIxMDg4MVwiOiBcImxlc2RvdG87XCIsXG4gICAgXCIxMDg4MlwiOiBcImdlc2RvdG87XCIsXG4gICAgXCIxMDg4M1wiOiBcImxlc2RvdG9yO1wiLFxuICAgIFwiMTA4ODRcIjogXCJnZXNkb3RvbDtcIixcbiAgICBcIjEwODg1XCI6IFwibGVzc2FwcHJveDtcIixcbiAgICBcIjEwODg2XCI6IFwiZ3RyYXBwcm94O1wiLFxuICAgIFwiMTA4ODdcIjogXCJsbmVxO1wiLFxuICAgIFwiMTA4ODhcIjogXCJnbmVxO1wiLFxuICAgIFwiMTA4ODlcIjogXCJsbmFwcHJveDtcIixcbiAgICBcIjEwODkwXCI6IFwiZ25hcHByb3g7XCIsXG4gICAgXCIxMDg5MVwiOiBcImxlc3NlcXFndHI7XCIsXG4gICAgXCIxMDg5MlwiOiBcImd0cmVxcWxlc3M7XCIsXG4gICAgXCIxMDg5M1wiOiBcImxzaW1lO1wiLFxuICAgIFwiMTA4OTRcIjogXCJnc2ltZTtcIixcbiAgICBcIjEwODk1XCI6IFwibHNpbWc7XCIsXG4gICAgXCIxMDg5NlwiOiBcImdzaW1sO1wiLFxuICAgIFwiMTA4OTdcIjogXCJsZ0U7XCIsXG4gICAgXCIxMDg5OFwiOiBcImdsRTtcIixcbiAgICBcIjEwODk5XCI6IFwibGVzZ2VzO1wiLFxuICAgIFwiMTA5MDBcIjogXCJnZXNsZXM7XCIsXG4gICAgXCIxMDkwMVwiOiBcImVxc2xhbnRsZXNzO1wiLFxuICAgIFwiMTA5MDJcIjogXCJlcXNsYW50Z3RyO1wiLFxuICAgIFwiMTA5MDNcIjogXCJlbHNkb3Q7XCIsXG4gICAgXCIxMDkwNFwiOiBcImVnc2RvdDtcIixcbiAgICBcIjEwOTA1XCI6IFwiZWw7XCIsXG4gICAgXCIxMDkwNlwiOiBcImVnO1wiLFxuICAgIFwiMTA5MDlcIjogXCJzaW1sO1wiLFxuICAgIFwiMTA5MTBcIjogXCJzaW1nO1wiLFxuICAgIFwiMTA5MTFcIjogXCJzaW1sRTtcIixcbiAgICBcIjEwOTEyXCI6IFwic2ltZ0U7XCIsXG4gICAgXCIxMDkxM1wiOiBcIkxlc3NMZXNzO1wiLFxuICAgIFwiMTA5MTRcIjogXCJHcmVhdGVyR3JlYXRlcjtcIixcbiAgICBcIjEwOTE2XCI6IFwiZ2xqO1wiLFxuICAgIFwiMTA5MTdcIjogXCJnbGE7XCIsXG4gICAgXCIxMDkxOFwiOiBcImx0Y2M7XCIsXG4gICAgXCIxMDkxOVwiOiBcImd0Y2M7XCIsXG4gICAgXCIxMDkyMFwiOiBcImxlc2NjO1wiLFxuICAgIFwiMTA5MjFcIjogXCJnZXNjYztcIixcbiAgICBcIjEwOTIyXCI6IFwic210O1wiLFxuICAgIFwiMTA5MjNcIjogXCJsYXQ7XCIsXG4gICAgXCIxMDkyNFwiOiBcInNtdGU7XCIsXG4gICAgXCIxMDkyNVwiOiBcImxhdGU7XCIsXG4gICAgXCIxMDkyNlwiOiBcImJ1bXBFO1wiLFxuICAgIFwiMTA5MjdcIjogXCJwcmVjZXE7XCIsXG4gICAgXCIxMDkyOFwiOiBcInN1Y2NlcTtcIixcbiAgICBcIjEwOTMxXCI6IFwicHJFO1wiLFxuICAgIFwiMTA5MzJcIjogXCJzY0U7XCIsXG4gICAgXCIxMDkzM1wiOiBcInBybkU7XCIsXG4gICAgXCIxMDkzNFwiOiBcInN1Y2NuZXFxO1wiLFxuICAgIFwiMTA5MzVcIjogXCJwcmVjYXBwcm94O1wiLFxuICAgIFwiMTA5MzZcIjogXCJzdWNjYXBwcm94O1wiLFxuICAgIFwiMTA5MzdcIjogXCJwcm5hcDtcIixcbiAgICBcIjEwOTM4XCI6IFwic3VjY25hcHByb3g7XCIsXG4gICAgXCIxMDkzOVwiOiBcIlByO1wiLFxuICAgIFwiMTA5NDBcIjogXCJTYztcIixcbiAgICBcIjEwOTQxXCI6IFwic3ViZG90O1wiLFxuICAgIFwiMTA5NDJcIjogXCJzdXBkb3Q7XCIsXG4gICAgXCIxMDk0M1wiOiBcInN1YnBsdXM7XCIsXG4gICAgXCIxMDk0NFwiOiBcInN1cHBsdXM7XCIsXG4gICAgXCIxMDk0NVwiOiBcInN1Ym11bHQ7XCIsXG4gICAgXCIxMDk0NlwiOiBcInN1cG11bHQ7XCIsXG4gICAgXCIxMDk0N1wiOiBcInN1YmVkb3Q7XCIsXG4gICAgXCIxMDk0OFwiOiBcInN1cGVkb3Q7XCIsXG4gICAgXCIxMDk0OVwiOiBcInN1YnNldGVxcTtcIixcbiAgICBcIjEwOTUwXCI6IFwic3Vwc2V0ZXFxO1wiLFxuICAgIFwiMTA5NTFcIjogXCJzdWJzaW07XCIsXG4gICAgXCIxMDk1MlwiOiBcInN1cHNpbTtcIixcbiAgICBcIjEwOTU1XCI6IFwic3Vic2V0bmVxcTtcIixcbiAgICBcIjEwOTU2XCI6IFwic3Vwc2V0bmVxcTtcIixcbiAgICBcIjEwOTU5XCI6IFwiY3N1YjtcIixcbiAgICBcIjEwOTYwXCI6IFwiY3N1cDtcIixcbiAgICBcIjEwOTYxXCI6IFwiY3N1YmU7XCIsXG4gICAgXCIxMDk2MlwiOiBcImNzdXBlO1wiLFxuICAgIFwiMTA5NjNcIjogXCJzdWJzdXA7XCIsXG4gICAgXCIxMDk2NFwiOiBcInN1cHN1YjtcIixcbiAgICBcIjEwOTY1XCI6IFwic3Vic3ViO1wiLFxuICAgIFwiMTA5NjZcIjogXCJzdXBzdXA7XCIsXG4gICAgXCIxMDk2N1wiOiBcInN1cGhzdWI7XCIsXG4gICAgXCIxMDk2OFwiOiBcInN1cGRzdWI7XCIsXG4gICAgXCIxMDk2OVwiOiBcImZvcmt2O1wiLFxuICAgIFwiMTA5NzBcIjogXCJ0b3Bmb3JrO1wiLFxuICAgIFwiMTA5NzFcIjogXCJtbGNwO1wiLFxuICAgIFwiMTA5ODBcIjogXCJEb3VibGVMZWZ0VGVlO1wiLFxuICAgIFwiMTA5ODJcIjogXCJWZGFzaGw7XCIsXG4gICAgXCIxMDk4M1wiOiBcIkJhcnY7XCIsXG4gICAgXCIxMDk4NFwiOiBcInZCYXI7XCIsXG4gICAgXCIxMDk4NVwiOiBcInZCYXJ2O1wiLFxuICAgIFwiMTA5ODdcIjogXCJWYmFyO1wiLFxuICAgIFwiMTA5ODhcIjogXCJOb3Q7XCIsXG4gICAgXCIxMDk4OVwiOiBcImJOb3Q7XCIsXG4gICAgXCIxMDk5MFwiOiBcInJubWlkO1wiLFxuICAgIFwiMTA5OTFcIjogXCJjaXJtaWQ7XCIsXG4gICAgXCIxMDk5MlwiOiBcIm1pZGNpcjtcIixcbiAgICBcIjEwOTkzXCI6IFwidG9wY2lyO1wiLFxuICAgIFwiMTA5OTRcIjogXCJuaHBhcjtcIixcbiAgICBcIjEwOTk1XCI6IFwicGFyc2ltO1wiLFxuICAgIFwiMTEwMDVcIjogXCJwYXJzbDtcIixcbiAgICBcIjY0MjU2XCI6IFwiZmZsaWc7XCIsXG4gICAgXCI2NDI1N1wiOiBcImZpbGlnO1wiLFxuICAgIFwiNjQyNThcIjogXCJmbGxpZztcIixcbiAgICBcIjY0MjU5XCI6IFwiZmZpbGlnO1wiLFxuICAgIFwiNjQyNjBcIjogXCJmZmxsaWc7XCJcbn0iLCJBbmFseXRpY3MgICAgPSByZXF1aXJlICcuL3V0aWxzL0FuYWx5dGljcydcbkF1dGhNYW5hZ2VyICA9IHJlcXVpcmUgJy4vdXRpbHMvQXV0aE1hbmFnZXInXG5TaGFyZSAgICAgICAgPSByZXF1aXJlICcuL3V0aWxzL1NoYXJlJ1xuRmFjZWJvb2sgICAgID0gcmVxdWlyZSAnLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4vdXRpbHMvR29vZ2xlUGx1cydcblRlbXBsYXRlcyAgICA9IHJlcXVpcmUgJy4vZGF0YS9UZW1wbGF0ZXMnXG5Mb2NhbGUgICAgICAgPSByZXF1aXJlICcuL2RhdGEvTG9jYWxlJ1xuUm91dGVyICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvUm91dGVyJ1xuTmF2ICAgICAgICAgID0gcmVxdWlyZSAnLi9yb3V0ZXIvTmF2J1xuQXBwRGF0YSAgICAgID0gcmVxdWlyZSAnLi9BcHBEYXRhJ1xuQXBwVmlldyAgICAgID0gcmVxdWlyZSAnLi9BcHBWaWV3J1xuTWVkaWFRdWVyaWVzID0gcmVxdWlyZSAnLi91dGlscy9NZWRpYVF1ZXJpZXMnXG5cbmNsYXNzIEFwcFxuXG4gICAgTElWRSAgICAgICA6IG51bGxcbiAgICBCQVNFX1VSTCAgIDogd2luZG93LmNvbmZpZy5ob3N0bmFtZVxuICAgIGxvY2FsZUNvZGUgOiB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcbiAgICBvYmpSZWFkeSAgIDogMFxuXG4gICAgX3RvQ2xlYW4gICA6IFsnb2JqUmVhZHknLCAnc2V0RmxhZ3MnLCAnb2JqZWN0Q29tcGxldGUnLCAnaW5pdCcsICdpbml0T2JqZWN0cycsICdpbml0U0RLcycsICdpbml0QXBwJywgJ2dvJywgJ2NsZWFudXAnLCAnX3RvQ2xlYW4nXVxuXG4gICAgY29uc3RydWN0b3IgOiAoQExJVkUpIC0+XG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIHNldEZsYWdzIDogPT5cblxuICAgICAgICB1YSA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKClcblxuICAgICAgICBNZWRpYVF1ZXJpZXMuc2V0dXAoKTtcblxuICAgICAgICBASVNfQU5EUk9JRCAgICA9IHVhLmluZGV4T2YoJ2FuZHJvaWQnKSA+IC0xXG4gICAgICAgIEBJU19GSVJFRk9YICAgID0gdWEuaW5kZXhPZignZmlyZWZveCcpID4gLTFcbiAgICAgICAgQElTX0NIUk9NRV9JT1MgPSBpZiB1YS5tYXRjaCgnY3Jpb3MnKSB0aGVuIHRydWUgZWxzZSBmYWxzZSAjIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzEzODA4MDUzXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaXNNb2JpbGUgOiA9PlxuXG4gICAgICAgIHJldHVybiBASVNfSU9TIG9yIEBJU19BTkRST0lEXG5cbiAgICBvYmplY3RDb21wbGV0ZSA6ID0+XG5cbiAgICAgICAgQG9ialJlYWR5KytcbiAgICAgICAgQGluaXRBcHAoKSBpZiBAb2JqUmVhZHkgPj0gNFxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEBpbml0T2JqZWN0cygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdE9iamVjdHMgOiA9PlxuXG4gICAgICAgIEB0ZW1wbGF0ZXMgPSBuZXcgVGVtcGxhdGVzIFwiL2RhdGEvdGVtcGxhdGVzI3soaWYgQExJVkUgdGhlbiAnLm1pbicgZWxzZSAnJyl9LnhtbFwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGxvY2FsZSAgICA9IG5ldyBMb2NhbGUgXCIvZGF0YS9sb2NhbGVzL3N0cmluZ3MuanNvblwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGFuYWx5dGljcyA9IG5ldyBBbmFseXRpY3MgXCIvZGF0YS90cmFja2luZy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYXBwRGF0YSAgID0gbmV3IEFwcERhdGEgQG9iamVjdENvbXBsZXRlXG5cbiAgICAgICAgIyBpZiBuZXcgb2JqZWN0cyBhcmUgYWRkZWQgZG9uJ3QgZm9yZ2V0IHRvIGNoYW5nZSB0aGUgYEBvYmplY3RDb21wbGV0ZWAgZnVuY3Rpb25cblxuICAgICAgICBudWxsXG5cbiAgICBpbml0U0RLcyA6ID0+XG5cbiAgICAgICAgRmFjZWJvb2subG9hZCgpXG4gICAgICAgIEdvb2dsZVBsdXMubG9hZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdEFwcCA6ID0+XG5cbiAgICAgICAgQHNldEZsYWdzKClcblxuICAgICAgICAjIyMgU3RhcnRzIGFwcGxpY2F0aW9uICMjI1xuICAgICAgICBAYXBwVmlldyA9IG5ldyBBcHBWaWV3XG4gICAgICAgIEByb3V0ZXIgID0gbmV3IFJvdXRlclxuICAgICAgICBAbmF2ICAgICA9IG5ldyBOYXZcbiAgICAgICAgQGF1dGggICAgPSBuZXcgQXV0aE1hbmFnZXJcbiAgICAgICAgQHNoYXJlICAgPSBuZXcgU2hhcmVcblxuICAgICAgICBAZ28oKVxuXG4gICAgICAgIEBpbml0U0RLcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ28gOiA9PlxuXG4gICAgICAgICMjIyBBZnRlciBldmVyeXRoaW5nIGlzIGxvYWRlZCwga2lja3Mgb2ZmIHdlYnNpdGUgIyMjXG4gICAgICAgIEBhcHBWaWV3LnJlbmRlcigpXG5cbiAgICAgICAgIyMjIHJlbW92ZSByZWR1bmRhbnQgaW5pdGlhbGlzYXRpb24gbWV0aG9kcyAvIHByb3BlcnRpZXMgIyMjXG4gICAgICAgIEBjbGVhbnVwKClcblxuICAgICAgICBudWxsXG5cbiAgICBjbGVhbnVwIDogPT5cblxuICAgICAgICBmb3IgZm4gaW4gQF90b0NsZWFuXG4gICAgICAgICAgICBAW2ZuXSA9IG51bGxcbiAgICAgICAgICAgIGRlbGV0ZSBAW2ZuXVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkFic3RyYWN0RGF0YSAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0Fic3RyYWN0RGF0YSdcblJlcXVlc3RlciAgICAgICAgID0gcmVxdWlyZSAnLi91dGlscy9SZXF1ZXN0ZXInXG5BUEkgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9BUEknXG5Eb29kbGVzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4vY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbidcblxuY2xhc3MgQXBwRGF0YSBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG4gICAgY2FsbGJhY2sgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IChAY2FsbGJhY2spIC0+XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYWRkIGFsbCBkYXRhIGNsYXNzZXMgaGVyZVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICBAZG9vZGxlcyA9IG5ldyBEb29kbGVzQ29sbGVjdGlvblxuXG4gICAgICAgIEBnZXRTdGFydERhdGEoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICAjIyNcbiAgICBnZXQgYXBwIGJvb3RzdHJhcCBkYXRhIC0gZW1iZWQgaW4gSFRNTCBvciBBUEkgZW5kcG9pbnRcbiAgICAjIyNcbiAgICBnZXRTdGFydERhdGEgOiA9PlxuICAgICAgICBcbiAgICAgICAgIyBpZiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgIGlmIHRydWVcblxuICAgICAgICAgICAgciA9IFJlcXVlc3Rlci5yZXF1ZXN0XG4gICAgICAgICAgICAgICAgIyB1cmwgIDogQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICAgICAgICAgIHVybCAgOiBAQ0QoKS5CQVNFX1VSTCArICcvZGF0YS9fRFVNTVkvZG9vZGxlcy5qc29uJ1xuICAgICAgICAgICAgICAgIHR5cGUgOiAnR0VUJ1xuXG4gICAgICAgICAgICByLmRvbmUgQG9uU3RhcnREYXRhUmVjZWl2ZWRcbiAgICAgICAgICAgIHIuZmFpbCA9PlxuXG4gICAgICAgICAgICAgICAgIyBjb25zb2xlLmVycm9yIFwiZXJyb3IgbG9hZGluZyBhcGkgc3RhcnQgZGF0YVwiXG5cbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICB0aGlzIGlzIG9ubHkgdGVtcG9yYXJ5LCB3aGlsZSB0aGVyZSBpcyBubyBib290c3RyYXAgZGF0YSBoZXJlLCBub3JtYWxseSB3b3VsZCBoYW5kbGUgZXJyb3IgLyBmYWlsXG4gICAgICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICBvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgY29uc29sZS5sb2cgXCJvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XCIsIGRhdGFcblxuICAgICAgICB0b0FkZCA9IFtdXG4gICAgICAgICh0b0FkZCA9IHRvQWRkLmNvbmNhdCBkYXRhLmRvb2RsZXMpIGZvciBpIGluIFswLi4uNV1cblxuICAgICAgICBAZG9vZGxlcy5hZGQgdG9BZGRcblxuICAgICAgICAjIyNcblxuICAgICAgICBib290c3RyYXAgZGF0YSByZWNlaXZlZCwgYXBwIHJlYWR5IHRvIGdvXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcERhdGFcbiIsIkFic3RyYWN0VmlldyAgICAgPSByZXF1aXJlICcuL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUHJlbG9hZGVyICAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL1ByZWxvYWRlcidcbkhlYWRlciAgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9IZWFkZXInXG5XcmFwcGVyICAgICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvV3JhcHBlcidcbkZvb3RlciAgICAgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9Gb290ZXInXG5QYWdlVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUGFnZVRyYW5zaXRpb25lcidcbk1vZGFsTWFuYWdlciAgICAgPSByZXF1aXJlICcuL3ZpZXcvbW9kYWxzL19Nb2RhbE1hbmFnZXInXG5cbmNsYXNzIEFwcFZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ21haW4nXG5cbiAgICAkd2luZG93ICA6IG51bGxcbiAgICAkYm9keSAgICA6IG51bGxcblxuICAgIHdyYXBwZXIgIDogbnVsbFxuICAgIGZvb3RlciAgIDogbnVsbFxuXG4gICAgZGltcyA6XG4gICAgICAgIHcgOiBudWxsXG4gICAgICAgIGggOiBudWxsXG4gICAgICAgIG8gOiBudWxsXG4gICAgICAgIHVwZGF0ZU1vYmlsZSA6IHRydWVcbiAgICAgICAgbGFzdEhlaWdodCAgIDogbnVsbFxuXG4gICAgbGFzdFNjcm9sbFkgOiAwXG4gICAgdGlja2luZyAgICAgOiBmYWxzZVxuXG4gICAgRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMgOiAnRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMnXG4gICAgRVZFTlRfUFJFTE9BREVSX0hJREUgICAgOiAnRVZFTlRfUFJFTE9BREVSX0hJREUnXG4gICAgRVZFTlRfT05fU0NST0xMICAgICAgICAgOiAnRVZFTlRfT05fU0NST0xMJ1xuXG4gICAgTU9CSUxFX1dJRFRIIDogNzAwXG4gICAgTU9CSUxFICAgICAgIDogJ21vYmlsZSdcbiAgICBOT05fTU9CSUxFICAgOiAnbm9uX21vYmlsZSdcblxuICAgIGNvbnN0cnVjdG9yIDogLT5cblxuICAgICAgICBAJHdpbmRvdyA9ICQod2luZG93KVxuICAgICAgICBAJGJvZHkgICA9ICQoJ2JvZHknKS5lcSgwKVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgIGRpc2FibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vbiAndG91Y2htb3ZlJywgQG9uVG91Y2hNb3ZlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZW5hYmxlVG91Y2g6ID0+XG5cbiAgICAgICAgQCR3aW5kb3cub2ZmICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcblxuICAgICAgICBudWxsXG5cbiAgICBvblRvdWNoTW92ZTogKCBlICkgLT5cblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICBudWxsXG5cbiAgICByZW5kZXIgOiA9PlxuXG4gICAgICAgIEBiaW5kRXZlbnRzKClcblxuICAgICAgICBAcHJlbG9hZGVyICAgID0gbmV3IFByZWxvYWRlclxuICAgICAgICBAbW9kYWxNYW5hZ2VyID0gbmV3IE1vZGFsTWFuYWdlclxuXG4gICAgICAgIEBoZWFkZXIgICAgICAgPSBuZXcgSGVhZGVyXG4gICAgICAgIEB3cmFwcGVyICAgICAgPSBuZXcgV3JhcHBlclxuICAgICAgICBAZm9vdGVyICAgICAgID0gbmV3IEZvb3RlclxuICAgICAgICBAdHJhbnNpdGlvbmVyID0gbmV3IFBhZ2VUcmFuc2l0aW9uZXJcblxuICAgICAgICBAXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGhlYWRlclxuICAgICAgICAgICAgLmFkZENoaWxkIEB3cmFwcGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGZvb3RlclxuICAgICAgICAgICAgLmFkZENoaWxkIEB0cmFuc2l0aW9uZXJcblxuICAgICAgICBAb25BbGxSZW5kZXJlZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYmluZEV2ZW50cyA6ID0+XG5cbiAgICAgICAgQG9uICdhbGxSZW5kZXJlZCcsIEBvbkFsbFJlbmRlcmVkXG5cbiAgICAgICAgQG9uUmVzaXplKClcblxuICAgICAgICBAb25SZXNpemUgPSBfLmRlYm91bmNlIEBvblJlc2l6ZSwgMzAwXG4gICAgICAgIEAkd2luZG93Lm9uICdyZXNpemUgb3JpZW50YXRpb25jaGFuZ2UnLCBAb25SZXNpemVcbiAgICAgICAgQCR3aW5kb3cub24gXCJzY3JvbGxcIiwgQG9uU2Nyb2xsXG5cbiAgICAgICAgQCRib2R5Lm9uICdjbGljaycsICdhJywgQGxpbmtNYW5hZ2VyXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25TY3JvbGwgOiA9PlxuXG4gICAgICAgIEBsYXN0U2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZXG4gICAgICAgIEByZXF1ZXN0VGljaygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVxdWVzdFRpY2sgOiA9PlxuXG4gICAgICAgIGlmICFAdGlja2luZ1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIEBzY3JvbGxVcGRhdGVcbiAgICAgICAgICAgIEB0aWNraW5nID0gdHJ1ZVxuXG4gICAgICAgIG51bGxcblxuICAgIHNjcm9sbFVwZGF0ZSA6ID0+XG5cbiAgICAgICAgQHRpY2tpbmcgPSBmYWxzZVxuXG4gICAgICAgIEAkYm9keS5hZGRDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG5cbiAgICAgICAgY2xlYXJUaW1lb3V0IEB0aW1lclNjcm9sbFxuXG4gICAgICAgIEB0aW1lclNjcm9sbCA9IHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgIEAkYm9keS5yZW1vdmVDbGFzcygnZGlzYWJsZS1ob3ZlcicpXG4gICAgICAgICwgNTBcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfT05fU0NST0xMXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb25BbGxSZW5kZXJlZCA6ID0+XG5cbiAgICAgICAgIyBjb25zb2xlLmxvZyBcIm9uQWxsUmVuZGVyZWQgOiA9PlwiXG5cbiAgICAgICAgQCRib2R5LnByZXBlbmQgQCRlbFxuXG4gICAgICAgIEBwcmVsb2FkZXIucGxheUludHJvQW5pbWF0aW9uID0+IEB0cmlnZ2VyIEBFVkVOVF9QUkVMT0FERVJfSElERVxuXG4gICAgICAgIEBiZWdpbigpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgYmVnaW4gOiA9PlxuXG4gICAgICAgIEB0cmlnZ2VyICdzdGFydCdcblxuICAgICAgICBAQ0QoKS5yb3V0ZXIuc3RhcnQoKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uUmVzaXplIDogPT5cblxuICAgICAgICBAZ2V0RGltcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0RGltcyA6ID0+XG5cbiAgICAgICAgdyA9IHdpbmRvdy5pbm5lcldpZHRoIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCBvciBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICAgICAgIGggPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodFxuXG4gICAgICAgIGNoYW5nZSA9IGggLyBAZGltcy5sYXN0SGVpZ2h0XG5cbiAgICAgICAgQGRpbXMgPVxuICAgICAgICAgICAgdyA6IHdcbiAgICAgICAgICAgIGggOiBoXG4gICAgICAgICAgICBvIDogaWYgaCA+IHcgdGhlbiAncG9ydHJhaXQnIGVsc2UgJ2xhbmRzY2FwZSdcbiAgICAgICAgICAgIHVwZGF0ZU1vYmlsZSA6ICFAQ0QoKS5pc01vYmlsZSgpIG9yIGNoYW5nZSA8IDAuOCBvciBjaGFuZ2UgPiAxLjJcbiAgICAgICAgICAgIGxhc3RIZWlnaHQgICA6IGhcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEBkaW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbGlua01hbmFnZXIgOiAoZSkgPT5cblxuICAgICAgICBocmVmID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2hyZWYnKVxuXG4gICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgaHJlZlxuXG4gICAgICAgIEBuYXZpZ2F0ZVRvVXJsIGhyZWYsIGVcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvVXJsIDogKCBocmVmLCBlID0gbnVsbCApID0+XG5cbiAgICAgICAgcm91dGUgICA9IGlmIGhyZWYubWF0Y2goQENEKCkuQkFTRV9VUkwpIHRoZW4gaHJlZi5zcGxpdChAQ0QoKS5CQVNFX1VSTClbMV0gZWxzZSBocmVmXG4gICAgICAgIHNlY3Rpb24gPSBpZiByb3V0ZS5jaGFyQXQoMCkgaXMgJy8nIHRoZW4gcm91dGUuc3BsaXQoJy8nKVsxXS5zcGxpdCgnLycpWzBdIGVsc2Ugcm91dGUuc3BsaXQoJy8nKVswXVxuXG4gICAgICAgIGlmIEBDRCgpLm5hdi5nZXRTZWN0aW9uIHNlY3Rpb25cbiAgICAgICAgICAgIGU/LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIEBDRCgpLnJvdXRlci5uYXZpZ2F0ZVRvIHJvdXRlXG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBAaGFuZGxlRXh0ZXJuYWxMaW5rIGhyZWZcblxuICAgICAgICBudWxsXG5cbiAgICBoYW5kbGVFeHRlcm5hbExpbmsgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcImhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PiBcIlxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJpbmQgdHJhY2tpbmcgZXZlbnRzIGlmIG5lY2Vzc2FyeVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBWaWV3XG4iLCJjbGFzcyBBYnN0cmFjdENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0Q29sbGVjdGlvblxuIiwiVGVtcGxhdGVNb2RlbCA9IHJlcXVpcmUgJy4uLy4uL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwnXG5cbmNsYXNzIFRlbXBsYXRlc0NvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG5cblx0bW9kZWwgOiBUZW1wbGF0ZU1vZGVsXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzQ29sbGVjdGlvblxuIiwiQWJzdHJhY3RDb2xsZWN0aW9uID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RDb2xsZWN0aW9uJ1xuRG9vZGxlTW9kZWwgICAgICAgID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2Rvb2RsZS9Eb29kbGVNb2RlbCdcblxuY2xhc3MgRG9vZGxlc0NvbGxlY3Rpb24gZXh0ZW5kcyBBYnN0cmFjdENvbGxlY3Rpb25cblxuXHRtb2RlbCA6IERvb2RsZU1vZGVsXG5cblx0Z2V0RG9vZGxlQnlTbHVnIDogKHNsdWcpID0+XG5cblx0XHRkb29kbGUgPSBAZmluZFdoZXJlIHNsdWcgOiBzbHVnXG5cblx0XHRpZiAhZG9vZGxlXG5cdFx0XHRjb25zb2xlLmxvZyBcInkgdSBubyBkb29kbGU/XCJcblxuXHRcdHJldHVybiBkb29kbGVcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVzQ29sbGVjdGlvblxuIiwiQ29sb3JzID1cblxuXHRDRF9SRUQgICAgOiAnI0VCNDIzRSdcblx0Q0RfQkxVRSAgIDogJyMzOTVDQUEnXG5cdENEX0JMQUNLICA6ICcjMTExMTExJ1xuXHRPRkZfV0hJVEUgOiAnI0YxRjFGMydcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcnNcbiIsIkFQSVJvdXRlTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsJ1xuXG5jbGFzcyBBUElcblxuXHRAbW9kZWwgOiBuZXcgQVBJUm91dGVNb2RlbFxuXG5cdEBnZXRDb250YW50cyA6ID0+XG5cblx0XHQjIyMgYWRkIG1vcmUgaWYgd2Ugd2FubmEgdXNlIGluIEFQSSBzdHJpbmdzICMjI1xuXHRcdEJBU0VfVVJMIDogQENEKCkuQkFTRV9VUkxcblxuXHRAZ2V0IDogKG5hbWUsIHZhcnMpID0+XG5cblx0XHR2YXJzID0gJC5leHRlbmQgdHJ1ZSwgdmFycywgQGdldENvbnRhbnRzKClcblx0XHRyZXR1cm4gQHN1cHBsYW50U3RyaW5nIEBtb2RlbC5nZXQobmFtZSksIHZhcnNcblxuXHRAc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdIG9yIGlmIHR5cGVvZiB2YWxzW2JdIGlzICdudW1iZXInIHRoZW4gdmFsc1tiXS50b1N0cmluZygpIGVsc2UgJydcblx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBUElcbiIsImNsYXNzIEFic3RyYWN0RGF0YVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdF8uZXh0ZW5kIEAsIEJhY2tib25lLkV2ZW50c1xuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3REYXRhXG4iLCJMb2NhbGVzTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwnXG5BUEkgICAgICAgICAgPSByZXF1aXJlICcuLi9kYXRhL0FQSSdcblxuIyMjXG4jIExvY2FsZSBMb2FkZXIgI1xuXG5GaXJlcyBiYWNrIGFuIGV2ZW50IHdoZW4gY29tcGxldGVcblxuIyMjXG5jbGFzcyBMb2NhbGVcblxuICAgIGxhbmcgICAgIDogbnVsbFxuICAgIGRhdGEgICAgIDogbnVsbFxuICAgIGNhbGxiYWNrIDogbnVsbFxuICAgIGJhY2t1cCAgIDogbnVsbFxuICAgIGRlZmF1bHQgIDogJ2VuLWdiJ1xuXG4gICAgY29uc3RydWN0b3IgOiAoZGF0YSwgY2IpIC0+XG5cbiAgICAgICAgIyMjIHN0YXJ0IExvY2FsZSBMb2FkZXIsIGRlZmluZSBsb2NhbGUgYmFzZWQgb24gYnJvd3NlciBsYW5ndWFnZSAjIyNcblxuICAgICAgICBAY2FsbGJhY2sgPSBjYlxuICAgICAgICBAYmFja3VwID0gZGF0YVxuXG4gICAgICAgIEBsYW5nID0gQGdldExhbmcoKVxuXG4gICAgICAgIGlmIEFQSS5nZXQoJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0pXG5cbiAgICAgICAgICAgICQuYWpheFxuICAgICAgICAgICAgICAgIHVybCAgICAgOiBBUEkuZ2V0KCAnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSApXG4gICAgICAgICAgICAgICAgdHlwZSAgICA6ICdHRVQnXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgICAgICBlcnJvciAgIDogQGxvYWRCYWNrdXBcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBsb2FkQmFja3VwKClcblxuICAgICAgICBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRMYW5nIDogPT5cblxuICAgICAgICBpZiB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGFuZCB3aW5kb3cubG9jYXRpb24uc2VhcmNoLm1hdGNoKCdsYW5nPScpXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KCdsYW5nPScpWzFdLnNwbGl0KCcmJylbMF1cblxuICAgICAgICBlbHNlIGlmIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBsYW5nID0gQGRlZmF1bHRcblxuICAgICAgICBsYW5nXG5cbiAgICBvblN1Y2Nlc3MgOiAoZXZlbnQpID0+XG5cbiAgICAgICAgIyMjIEZpcmVzIGJhY2sgYW4gZXZlbnQgb25jZSBpdCdzIGNvbXBsZXRlICMjI1xuXG4gICAgICAgIGQgPSBudWxsXG5cbiAgICAgICAgaWYgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgICAgICBkID0gSlNPTi5wYXJzZSBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIGQgPSBldmVudFxuXG4gICAgICAgIEBkYXRhID0gbmV3IExvY2FsZXNNb2RlbCBkXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIGxvYWRCYWNrdXAgOiA9PlxuXG4gICAgICAgICMjIyBXaGVuIEFQSSBub3QgYXZhaWxhYmxlLCB0cmllcyB0byBsb2FkIHRoZSBzdGF0aWMgLnR4dCBsb2NhbGUgIyMjXG5cbiAgICAgICAgJC5hamF4IFxuICAgICAgICAgICAgdXJsICAgICAgOiBAYmFja3VwXG4gICAgICAgICAgICBkYXRhVHlwZSA6ICdqc29uJ1xuICAgICAgICAgICAgY29tcGxldGUgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICBlcnJvciAgICA6ID0+IGNvbnNvbGUubG9nICdlcnJvciBvbiBsb2FkaW5nIGJhY2t1cCdcblxuICAgICAgICBudWxsXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgIyMjIGdldCBTdHJpbmcgZnJvbSBsb2NhbGVcbiAgICAgICAgKyBpZCA6IHN0cmluZyBpZCBvZiB0aGUgTG9jYWxpc2VkIFN0cmluZ1xuICAgICAgICAjIyNcblxuICAgICAgICByZXR1cm4gQGRhdGEuZ2V0U3RyaW5nIGlkXG5cbiAgICBnZXRMb2NhbGVJbWFnZSA6ICh1cmwpID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5jb25maWcuQ0ROICsgXCIvaW1hZ2VzL2xvY2FsZS9cIiArIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZSArIFwiL1wiICsgdXJsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlXG4iLCJUZW1wbGF0ZU1vZGVsICAgICAgID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblRlbXBsYXRlc0NvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24nXG5cbmNsYXNzIFRlbXBsYXRlc1xuXG4gICAgdGVtcGxhdGVzIDogbnVsbFxuICAgIGNiICAgICAgICA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKHRlbXBsYXRlcywgY2FsbGJhY2spIC0+XG5cbiAgICAgICAgQGNiID0gY2FsbGJhY2tcblxuICAgICAgICAkLmFqYXggdXJsIDogdGVtcGxhdGVzLCBzdWNjZXNzIDogQHBhcnNlWE1MXG4gICAgICAgICAgIFxuICAgICAgICBudWxsXG5cbiAgICBwYXJzZVhNTCA6IChkYXRhKSA9PlxuXG4gICAgICAgIHRlbXAgPSBbXVxuXG4gICAgICAgICQoZGF0YSkuZmluZCgndGVtcGxhdGUnKS5lYWNoIChrZXksIHZhbHVlKSAtPlxuICAgICAgICAgICAgJHZhbHVlID0gJCh2YWx1ZSlcbiAgICAgICAgICAgIHRlbXAucHVzaCBuZXcgVGVtcGxhdGVNb2RlbFxuICAgICAgICAgICAgICAgIGlkICAgOiAkdmFsdWUuYXR0cignaWQnKS50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgdGV4dCA6ICQudHJpbSAkdmFsdWUudGV4dCgpXG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXNDb2xsZWN0aW9uIHRlbXBcblxuICAgICAgICBAY2I/KClcbiAgICAgICAgXG4gICAgICAgIG51bGwgICAgICAgIFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgIHQgPSBAdGVtcGxhdGVzLndoZXJlIGlkIDogaWRcbiAgICAgICAgdCA9IHRbMF0uZ2V0ICd0ZXh0J1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICQudHJpbSB0XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzXG4iLCJjbGFzcyBBYnN0cmFjdE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cblx0Y29uc3RydWN0b3IgOiAoYXR0cnMsIG9wdGlvbikgLT5cblxuXHRcdGF0dHJzID0gQF9maWx0ZXJBdHRycyBhdHRyc1xuXG5cdFx0cmV0dXJuIEJhY2tib25lLkRlZXBNb2RlbC5hcHBseSBALCBhcmd1bWVudHNcblxuXHRzZXQgOiAoYXR0cnMsIG9wdGlvbnMpIC0+XG5cblx0XHRvcHRpb25zIG9yIChvcHRpb25zID0ge30pXG5cblx0XHRhdHRycyA9IEBfZmlsdGVyQXR0cnMgYXR0cnNcblxuXHRcdG9wdGlvbnMuZGF0YSA9IEpTT04uc3RyaW5naWZ5IGF0dHJzXG5cblx0XHRyZXR1cm4gQmFja2JvbmUuRGVlcE1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCBALCBhdHRycywgb3B0aW9uc1xuXG5cdF9maWx0ZXJBdHRycyA6IChhdHRycykgPT5cblxuXHRcdGF0dHJzXG5cblx0Q0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0TW9kZWxcbiIsImNsYXNzIEFQSVJvdXRlTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5EZWVwTW9kZWxcblxuICAgIGRlZmF1bHRzIDpcblxuICAgICAgICBzdGFydCAgICAgICAgIDogXCJcIiAjIEVnOiBcInt7IEJBU0VfVVJMIH19L2FwaS9zdGFydFwiXG5cbiAgICAgICAgbG9jYWxlICAgICAgICA6IFwiXCIgIyBFZzogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvbDEwbi97eyBjb2RlIH19XCJcblxuICAgICAgICB1c2VyICAgICAgICAgIDpcbiAgICAgICAgICAgIGxvZ2luICAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL2xvZ2luXCJcbiAgICAgICAgICAgIHJlZ2lzdGVyICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3JlZ2lzdGVyXCJcbiAgICAgICAgICAgIHBhc3N3b3JkICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3Bhc3N3b3JkXCJcbiAgICAgICAgICAgIHVwZGF0ZSAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL3VwZGF0ZVwiXG4gICAgICAgICAgICBsb2dvdXQgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9sb2dvdXRcIlxuICAgICAgICAgICAgcmVtb3ZlICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcmVtb3ZlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBBUElSb3V0ZU1vZGVsXG4iLCJjbGFzcyBMb2NhbGVzTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuICAgICAgICBjb2RlICAgICA6IG51bGxcbiAgICAgICAgbGFuZ3VhZ2UgOiBudWxsXG4gICAgICAgIHN0cmluZ3MgIDogbnVsbFxuICAgICAgICAgICAgXG4gICAgZ2V0X2xhbmd1YWdlIDogPT5cbiAgICAgICAgcmV0dXJuIEBnZXQoJ2xhbmd1YWdlJylcblxuICAgIGdldFN0cmluZyA6IChpZCkgPT5cbiAgICAgICAgKChyZXR1cm4gZSBpZihhIGlzIGlkKSkgZm9yIGEsIGUgb2Ygdlsnc3RyaW5ncyddKSBmb3IgaywgdiBvZiBAZ2V0KCdzdHJpbmdzJylcbiAgICAgICAgY29uc29sZS53YXJuIFwiTG9jYWxlcyAtPiBub3QgZm91bmQgc3RyaW5nOiAje2lkfVwiXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGVzTW9kZWxcbiIsImNsYXNzIFRlbXBsYXRlTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG5cdGRlZmF1bHRzIDogXG5cblx0XHRpZCAgIDogXCJcIlxuXHRcdHRleHQgOiBcIlwiXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVNb2RlbFxuIiwiQWJzdHJhY3RNb2RlbCAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdE1vZGVsJ1xuTnVtYmVyVXRpbHMgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi91dGlscy9OdW1iZXJVdGlscydcbkNvZGVXb3JkVHJhbnNpdGlvbmVyID0gcmVxdWlyZSAnLi4vLi4vdXRpbHMvQ29kZVdvcmRUcmFuc2l0aW9uZXInXG5cbmNsYXNzIERvb2RsZU1vZGVsIGV4dGVuZHMgQWJzdHJhY3RNb2RlbFxuXG5cdGRlZmF1bHRzIDpcblx0XHQjIGZyb20gbWFuaWZlc3Rcblx0XHRcIm5hbWVcIiA6IFwiXCJcblx0XHRcImF1dGhvclwiIDpcblx0XHRcdFwibmFtZVwiICAgIDogXCJcIlxuXHRcdFx0XCJnaXRodWJcIiAgOiBcIlwiXG5cdFx0XHRcIndlYnNpdGVcIiA6IFwiXCJcblx0XHRcdFwidHdpdHRlclwiIDogXCJcIlxuXHRcdFwiZGVzY3JpcHRpb25cIjogXCJcIlxuXHRcdFwidGFnc1wiIDogW11cblx0XHRcImludGVyYWN0aW9uXCIgOlxuXHRcdFx0XCJtb3VzZVwiICAgIDogbnVsbFxuXHRcdFx0XCJrZXlib2FyZFwiIDogbnVsbFxuXHRcdFx0XCJ0b3VjaFwiICAgIDogbnVsbFxuXHRcdFwiY3JlYXRlZFwiIDogXCJcIlxuXHRcdFwic2x1Z1wiIDogXCJcIlxuXHRcdFwiaW5kZXhcIjogbnVsbFxuXHRcdCMgc2l0ZS1vbmx5XG5cdFx0XCJpbmRleEhUTUxcIiA6IFwiXCJcblx0XHRcInNvdXJjZVwiICAgIDogXCJcIlxuXHRcdFwidXJsXCIgICAgICAgOiBcIlwiXG5cdFx0XCJzY3JhbWJsZWRcIiA6XG5cdFx0XHRcIm5hbWVcIiAgICAgICAgOiBcIlwiXG5cdFx0XHRcImF1dGhvcl9uYW1lXCIgOiBcIlwiXG5cblx0X2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG5cdFx0aWYgYXR0cnMuc2x1Z1xuXHRcdFx0YXR0cnMudXJsID0gd2luZG93LmNvbmZpZy5ob3N0bmFtZSArICcvJyArIHdpbmRvdy5jb25maWcucm91dGVzLkRPT0RMRVMgKyAnLycgKyBhdHRycy5zbHVnXG5cblx0XHRpZiBhdHRycy5pbmRleFxuXHRcdFx0YXR0cnMuaW5kZXggPSBOdW1iZXJVdGlscy56ZXJvRmlsbCBhdHRycy5pbmRleCwgM1xuXG5cdFx0aWYgYXR0cnMubmFtZSBhbmQgYXR0cnMuYXV0aG9yLm5hbWVcblx0XHRcdGF0dHJzLnNjcmFtYmxlZCA9XG5cdFx0XHRcdG5hbWUgICAgICAgIDogQ29kZVdvcmRUcmFuc2l0aW9uZXIuZ2V0U2NyYW1ibGVkV29yZCBhdHRycy5uYW1lXG5cdFx0XHRcdGF1dGhvcl9uYW1lIDogQ29kZVdvcmRUcmFuc2l0aW9uZXIuZ2V0U2NyYW1ibGVkV29yZCBhdHRycy5hdXRob3IubmFtZVxuXG5cdFx0aWYgYXR0cnMuaW5kZXhcblx0XHRcdGF0dHJzLmluZGV4SFRNTCA9IEBnZXRJbmRleEhUTUwgYXR0cnMuaW5kZXhcblxuXHRcdGF0dHJzXG5cblx0Z2V0SW5kZXhIVE1MIDogKGluZGV4KSA9PlxuXG5cdFx0SFRNTCA9IFwiXCJcblxuXHRcdGZvciBjaGFyIGluIGluZGV4LnNwbGl0KCcnKVxuXHRcdFx0Y2xhc3NOYW1lID0gaWYgY2hhciBpcyAnMCcgdGhlbiAnaW5kZXgtY2hhci16ZXJvJyBlbHNlICdpbmRleC1jaGFyLW5vbnplcm8nXG5cdFx0XHRIVE1MICs9IFwiPHNwYW4gY2xhc3M9XFxcIiN7Y2xhc3NOYW1lfVxcXCI+I3tjaGFyfTwvc3Bhbj5cIlxuXG5cdFx0SFRNTFxuXG5tb2R1bGUuZXhwb3J0cyA9IERvb2RsZU1vZGVsXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi92aWV3L0Fic3RyYWN0VmlldydcblJvdXRlciAgICAgICA9IHJlcXVpcmUgJy4vUm91dGVyJ1xuXG5jbGFzcyBOYXYgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIEBFVkVOVF9DSEFOR0VfVklFVyAgICAgOiAnRVZFTlRfQ0hBTkdFX1ZJRVcnXG4gICAgQEVWRU5UX0NIQU5HRV9TVUJfVklFVyA6ICdFVkVOVF9DSEFOR0VfU1VCX1ZJRVcnXG5cbiAgICBzZWN0aW9ucyA6IG51bGwgIyBzZXQgdmlhIHdpbmRvdy5jb25maWcgZGF0YSwgc28gY2FuIGJlIGNvbnNpc3RlbnQgd2l0aCBiYWNrZW5kXG5cbiAgICBjdXJyZW50ICA6IGFyZWEgOiBudWxsLCBzdWIgOiBudWxsLCB0ZXIgOiBudWxsXG4gICAgcHJldmlvdXMgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbCwgdGVyIDogbnVsbFxuXG4gICAgY2hhbmdlVmlld0NvdW50IDogMFxuXG4gICAgY29uc3RydWN0b3I6IC0+XG5cbiAgICAgICAgQHNlY3Rpb25zID0gd2luZG93LmNvbmZpZy5yb3V0ZXNcbiAgICAgICAgQGZhdmljb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmF2aWNvbicpXG5cbiAgICAgICAgQENEKCkucm91dGVyLm9uIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBjaGFuZ2VWaWV3XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBnZXRTZWN0aW9uIDogKHNlY3Rpb24sIHN0cmljdD1mYWxzZSkgPT5cblxuICAgICAgICBpZiAhc3RyaWN0IGFuZCBzZWN0aW9uIGlzICcnIHRoZW4gcmV0dXJuIHRydWVcblxuICAgICAgICBmb3Igc2VjdGlvbk5hbWUsIHVyaSBvZiBAc2VjdGlvbnNcbiAgICAgICAgICAgIGlmIHVyaSBpcyBzZWN0aW9uIHRoZW4gcmV0dXJuIHNlY3Rpb25OYW1lXG5cbiAgICAgICAgZmFsc2VcblxuICAgIGNoYW5nZVZpZXc6IChhcmVhLCBzdWIsIHRlciwgcGFyYW1zKSA9PlxuXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJhcmVhXCIsYXJlYVxuICAgICAgICAjIGNvbnNvbGUubG9nIFwic3ViXCIsc3ViXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJ0ZXJcIix0ZXJcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInBhcmFtc1wiLHBhcmFtc1xuXG4gICAgICAgIEBjaGFuZ2VWaWV3Q291bnQrK1xuXG4gICAgICAgIEBwcmV2aW91cyA9IEBjdXJyZW50XG4gICAgICAgIEBjdXJyZW50ICA9IGFyZWEgOiBhcmVhLCBzdWIgOiBzdWIsIHRlciA6IHRlclxuXG4gICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfVklFVywgQHByZXZpb3VzLCBAY3VycmVudFxuICAgICAgICBAdHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBAY3VycmVudFxuXG4gICAgICAgIGlmIEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLmlzT3BlbigpIHRoZW4gQENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIuaGlkZU9wZW5Nb2RhbCgpXG5cbiAgICAgICAgQHNldFBhZ2VUaXRsZSBhcmVhLCBzdWIsIHRlclxuICAgICAgICBAc2V0UGFnZUZhdmljb24gYXJlYVxuXG4gICAgICAgIG51bGxcblxuICAgIHNldFBhZ2VUaXRsZTogKGFyZWEsIHN1YiwgdGVyKSA9PlxuXG4gICAgICAgIHNlY3Rpb24gICA9IGlmIGFyZWEgaXMgJycgdGhlbiAnSE9NRScgZWxzZSBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBhcmVhXG4gICAgICAgIHRpdGxlVG1wbCA9IEBDRCgpLmxvY2FsZS5nZXQoXCJwYWdlX3RpdGxlXyN7c2VjdGlvbn1cIikgb3IgQENEKCkubG9jYWxlLmdldChcInBhZ2VfdGl0bGVfSE9NRVwiKVxuICAgICAgICB0aXRsZSA9IEBzdXBwbGFudFN0cmluZyB0aXRsZVRtcGwsIEBnZXRQYWdlVGl0bGVWYXJzKGFyZWEsIHN1YiwgdGVyKSwgZmFsc2VcblxuICAgICAgICBpZiB3aW5kb3cuZG9jdW1lbnQudGl0bGUgaXNudCB0aXRsZSB0aGVuIHdpbmRvdy5kb2N1bWVudC50aXRsZSA9IHRpdGxlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2V0UGFnZUZhdmljb246IChhcmVhKSA9PlxuXG4gICAgICAgIGNvbG91ciA9IHN3aXRjaCBhcmVhXG4gICAgICAgICAgICB3aGVuIEBzZWN0aW9ucy5IT01FIHRoZW4gJ3JlZCdcbiAgICAgICAgICAgIHdoZW4gQHNlY3Rpb25zLkFCT1VULCBAc2VjdGlvbnMuQ09OVFJJQlVURSB0aGVuICdibGFjaydcbiAgICAgICAgICAgIHdoZW4gQHNlY3Rpb25zLkRPT0RMRVMgdGhlbiAnYmx1ZSdcbiAgICAgICAgICAgIGVsc2UgJ3JlZCdcblxuICAgICAgICBzZXRUaW1lb3V0ID0+XG4gICAgICAgICAgICBAZmF2aWNvbi5ocmVmID0gXCIje0BDRCgpLkJBU0VfVVJMfS9zdGF0aWMvaW1nL2ljb25zL2Zhdmljb24vZmF2aWNvbl8je2NvbG91cn0ucG5nXCJcbiAgICAgICAgLCAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ2V0UGFnZVRpdGxlVmFyczogKGFyZWEsIHN1YiwgdGVyKSA9PlxuXG4gICAgICAgIHZhcnMgPSB7fVxuXG4gICAgICAgIGlmIGFyZWEgaXMgQHNlY3Rpb25zLkRPT0RMRVMgYW5kIHN1YiBhbmQgdGVyXG4gICAgICAgICAgICBkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZmluZFdoZXJlIHNsdWc6IFwiI3tzdWJ9LyN7dGVyfVwiXG5cbiAgICAgICAgICAgIGlmICFkb29kbGVcbiAgICAgICAgICAgICAgICB2YXJzLm5hbWUgPSBcImRvb2RsZVwiXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdmFycy5uYW1lID0gZG9vZGxlLmdldCgnYXV0aG9yLm5hbWUnKSArICcgXFxcXCAnICsgZG9vZGxlLmdldCgnbmFtZScpICsgJyAnXG5cbiAgICAgICAgdmFyc1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5hdlxuIiwiY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyXG5cbiAgICBARVZFTlRfSEFTSF9DSEFOR0VEIDogJ0VWRU5UX0hBU0hfQ0hBTkdFRCdcblxuICAgIEZJUlNUX1JPVVRFIDogdHJ1ZVxuXG4gICAgcm91dGVzIDpcbiAgICAgICAgJygvKSg6YXJlYSkoLzpzdWIpKC86dGVyKSgvKScgOiAnaGFzaENoYW5nZWQnXG4gICAgICAgICcqYWN0aW9ucycgICAgICAgICAgICAgICAgICAgIDogJ25hdmlnYXRlVG8nXG5cbiAgICBhcmVhICAgOiBudWxsXG4gICAgc3ViICAgIDogbnVsbFxuICAgIHRlciAgICA6IG51bGxcbiAgICBwYXJhbXMgOiBudWxsXG5cbiAgICBzdGFydCA6ID0+XG5cbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCBcbiAgICAgICAgICAgIHB1c2hTdGF0ZSA6IHRydWVcbiAgICAgICAgICAgIHJvb3QgICAgICA6ICcvJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGhhc2hDaGFuZ2VkIDogKEBhcmVhID0gbnVsbCwgQHN1YiA9IG51bGwsIEB0ZXIgPSBudWxsKSA9PlxuXG4gICAgICAgIGNvbnNvbGUubG9nIFwiPj4gRVZFTlRfSEFTSF9DSEFOR0VEIEBhcmVhID0gI3tAYXJlYX0sIEBzdWIgPSAje0BzdWJ9LCBAdGVyID0gI3tAdGVyfSA8PFwiXG5cbiAgICAgICAgaWYgQEZJUlNUX1JPVVRFIHRoZW4gQEZJUlNUX1JPVVRFID0gZmFsc2VcblxuICAgICAgICBpZiAhQGFyZWEgdGhlbiBAYXJlYSA9IEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cbiAgICAgICAgQHRyaWdnZXIgUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQGFyZWEsIEBzdWIsIEB0ZXIsIEBwYXJhbXNcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvIDogKHdoZXJlID0gJycsIHRyaWdnZXIgPSB0cnVlLCByZXBsYWNlID0gZmFsc2UsIEBwYXJhbXMpID0+XG5cbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KDApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIvI3t3aGVyZX1cIlxuICAgICAgICBpZiB3aGVyZS5jaGFyQXQoIHdoZXJlLmxlbmd0aC0xICkgaXNudCBcIi9cIlxuICAgICAgICAgICAgd2hlcmUgPSBcIiN7d2hlcmV9L1wiXG5cbiAgICAgICAgaWYgIXRyaWdnZXJcbiAgICAgICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIHdoZXJlLCBudWxsLCBAcGFyYW1zXG4gICAgICAgICAgICByZXR1cm5cblxuICAgICAgICBAbmF2aWdhdGUgd2hlcmUsIHRyaWdnZXI6IHRydWUsIHJlcGxhY2U6IHJlcGxhY2VcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlclxuIiwiIyMjXG5BbmFseXRpY3Mgd3JhcHBlclxuIyMjXG5jbGFzcyBBbmFseXRpY3NcblxuICAgIHRhZ3MgICAgOiBudWxsXG4gICAgc3RhcnRlZCA6IGZhbHNlXG5cbiAgICBhdHRlbXB0cyAgICAgICAgOiAwXG4gICAgYWxsb3dlZEF0dGVtcHRzIDogNVxuXG4gICAgY29uc3RydWN0b3IgOiAodGFncywgQGNhbGxiYWNrKSAtPlxuXG4gICAgICAgICQuZ2V0SlNPTiB0YWdzLCBAb25UYWdzUmVjZWl2ZWRcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgb25UYWdzUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICBAdGFncyAgICA9IGRhdGFcbiAgICAgICAgQHN0YXJ0ZWQgPSB0cnVlXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgICMjI1xuICAgIEBwYXJhbSBzdHJpbmcgaWQgb2YgdGhlIHRyYWNraW5nIHRhZyB0byBiZSBwdXNoZWQgb24gQW5hbHl0aWNzIFxuICAgICMjI1xuICAgIHRyYWNrIDogKHBhcmFtKSA9PlxuXG4gICAgICAgIHJldHVybiBpZiAhQHN0YXJ0ZWRcblxuICAgICAgICBpZiBwYXJhbVxuXG4gICAgICAgICAgICB2ID0gQHRhZ3NbcGFyYW1dXG5cbiAgICAgICAgICAgIGlmIHZcblxuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ3NlbmQnLCAnZXZlbnQnXVxuICAgICAgICAgICAgICAgICggYXJncy5wdXNoKGFyZykgKSBmb3IgYXJnIGluIHZcblxuICAgICAgICAgICAgICAgICMgbG9hZGluZyBHQSBhZnRlciBtYWluIGFwcCBKUywgc28gZXh0ZXJuYWwgc2NyaXB0IG1heSBub3QgYmUgaGVyZSB5ZXRcbiAgICAgICAgICAgICAgICBpZiB3aW5kb3cuZ2FcbiAgICAgICAgICAgICAgICAgICAgZ2EuYXBwbHkgbnVsbCwgYXJnc1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgQGF0dGVtcHRzID49IEBhbGxvd2VkQXR0ZW1wdHNcbiAgICAgICAgICAgICAgICAgICAgQHN0YXJ0ZWQgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgQHRyYWNrIHBhcmFtXG4gICAgICAgICAgICAgICAgICAgICAgICBAYXR0ZW1wdHMrK1xuICAgICAgICAgICAgICAgICAgICAsIDIwMDBcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQW5hbHl0aWNzXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcbkZhY2Vib29rICAgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi4vdXRpbHMvR29vZ2xlUGx1cydcblxuY2xhc3MgQXV0aE1hbmFnZXIgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHR1c2VyRGF0YSAgOiBudWxsXG5cblx0IyBAcHJvY2VzcyB0cnVlIGR1cmluZyBsb2dpbiBwcm9jZXNzXG5cdHByb2Nlc3MgICAgICA6IGZhbHNlXG5cdHByb2Nlc3NUaW1lciA6IG51bGxcblx0cHJvY2Vzc1dhaXQgIDogNTAwMFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB1c2VyRGF0YSAgPSBAQ0QoKS5hcHBEYXRhLlVTRVJcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0bG9naW4gOiAoc2VydmljZSwgY2I9bnVsbCkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCIrKysrIFBST0NFU1MgXCIsQHByb2Nlc3NcblxuXHRcdHJldHVybiBpZiBAcHJvY2Vzc1xuXG5cdFx0QHNob3dMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gdHJ1ZVxuXG5cdFx0JGRhdGFEZmQgPSAkLkRlZmVycmVkKClcblxuXHRcdHN3aXRjaCBzZXJ2aWNlXG5cdFx0XHR3aGVuICdnb29nbGUnXG5cdFx0XHRcdEdvb2dsZVBsdXMubG9naW4gJGRhdGFEZmRcblx0XHRcdHdoZW4gJ2ZhY2Vib29rJ1xuXHRcdFx0XHRGYWNlYm9vay5sb2dpbiAkZGF0YURmZFxuXG5cdFx0JGRhdGFEZmQuZG9uZSAocmVzKSA9PiBAYXV0aFN1Y2Nlc3Mgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuZmFpbCAocmVzKSA9PiBAYXV0aEZhaWwgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuYWx3YXlzICgpID0+IEBhdXRoQ2FsbGJhY2sgY2JcblxuXHRcdCMjI1xuXHRcdFVuZm9ydHVuYXRlbHkgbm8gY2FsbGJhY2sgaXMgZmlyZWQgaWYgdXNlciBtYW51YWxseSBjbG9zZXMgRysgbG9naW4gbW9kYWwsXG5cdFx0c28gdGhpcyBpcyB0byBhbGxvdyB0aGVtIHRvIGNsb3NlIHdpbmRvdyBhbmQgdGhlbiBzdWJzZXF1ZW50bHkgdHJ5IHRvIGxvZyBpbiBhZ2Fpbi4uLlxuXHRcdCMjI1xuXHRcdEBwcm9jZXNzVGltZXIgPSBzZXRUaW1lb3V0IEBhdXRoQ2FsbGJhY2ssIEBwcm9jZXNzV2FpdFxuXG5cdFx0JGRhdGFEZmRcblxuXHRhdXRoU3VjY2VzcyA6IChzZXJ2aWNlLCBkYXRhKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImxvZ2luIGNhbGxiYWNrIGZvciAje3NlcnZpY2V9LCBkYXRhID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aEZhaWwgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBmYWlsIGZvciAje3NlcnZpY2V9ID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aENhbGxiYWNrIDogKGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIEBwcm9jZXNzXG5cblx0XHRjbGVhclRpbWVvdXQgQHByb2Nlc3NUaW1lclxuXG5cdFx0QGhpZGVMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gZmFsc2VcblxuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0IyMjXG5cdHNob3cgLyBoaWRlIHNvbWUgVUkgaW5kaWNhdG9yIHRoYXQgd2UgYXJlIHdhaXRpbmcgZm9yIHNvY2lhbCBuZXR3b3JrIHRvIHJlc3BvbmRcblx0IyMjXG5cdHNob3dMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcInNob3dMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5cdGhpZGVMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImhpZGVMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhNYW5hZ2VyXG4iLCJlbmNvZGUgPSByZXF1aXJlICdlbnQvZW5jb2RlJ1xuXG5jbGFzcyBDb2RlV29yZFRyYW5zaXRpb25lclxuXG5cdEBjb25maWcgOlxuXHRcdE1JTl9XUk9OR19DSEFSUyA6IDFcblx0XHRNQVhfV1JPTkdfQ0hBUlMgOiA3XG5cblx0XHRNSU5fQ0hBUl9JTl9ERUxBWSA6IDQwXG5cdFx0TUFYX0NIQVJfSU5fREVMQVkgOiA3MFxuXG5cdFx0TUlOX0NIQVJfT1VUX0RFTEFZIDogNDBcblx0XHRNQVhfQ0hBUl9PVVRfREVMQVkgOiA3MFxuXG5cdFx0Q0hBUlMgOiAnYWJjZGVmaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhPyooKUDCoyQlXiZfLSs9W117fTo7XFwnXCJcXFxcfDw+LC4vfmAnLnNwbGl0KCcnKS5tYXAoKGNoYXIpID0+IHJldHVybiBlbmNvZGUoY2hhcikpXG5cblx0XHRDSEFSX1RFTVBMQVRFIDogXCI8c3BhbiBkYXRhLWNvZGV0ZXh0LWNoYXI9XFxcInt7IGNoYXIgfX1cXFwiIGRhdGEtY29kZXRleHQtY2hhci1zdGF0ZT1cXFwie3sgc3RhdGUgfX1cXFwiPnt7IGNoYXIgfX08L3NwYW4+XCJcblxuXHRAX3dvcmRDYWNoZSA6IHt9XG5cblx0QF9nZXRXb3JkRnJvbUNhY2hlIDogKCRlbCkgPT5cblxuXHRcdGlkID0gJGVsLmF0dHIoJ2RhdGEtY29kZXdvcmQtaWQnKVxuXG5cdFx0aWYgaWQgYW5kIEBfd29yZENhY2hlWyBpZCBdXG5cdFx0XHR3b3JkID0gQF93b3JkQ2FjaGVbIGlkIF1cblx0XHRlbHNlXG5cdFx0XHRAX3dyYXBDaGFycyAkZWxcblx0XHRcdHdvcmQgPSBAX2FkZFdvcmRUb0NhY2hlICRlbFxuXG5cdFx0d29yZFxuXG5cdEBfYWRkV29yZFRvQ2FjaGUgOiAoJGVsKSA9PlxuXG5cdFx0Y2hhcnMgPSBbXVxuXG5cdFx0JGVsLmZpbmQoJ1tkYXRhLWNvZGV0ZXh0LWNoYXJdJykuZWFjaCAoaSwgZWwpID0+XG5cdFx0XHQkY2hhckVsID0gJChlbClcblx0XHRcdGNoYXJzLnB1c2hcblx0XHRcdFx0JGVsICAgICAgICA6ICRjaGFyRWxcblx0XHRcdFx0cmlnaHRDaGFyICA6ICRjaGFyRWwuYXR0cignZGF0YS1jb2RldGV4dC1jaGFyJylcblxuXHRcdGlkID0gXy51bmlxdWVJZCgpXG5cdFx0JGVsLmF0dHIgJ2RhdGEtY29kZXdvcmQtaWQnLCBpZFxuXG5cdFx0QF93b3JkQ2FjaGVbIGlkIF0gPVxuXHRcdFx0d29yZCAgICA6IF8ucGx1Y2soY2hhcnMsICdyaWdodENoYXInKS5qb2luKCcnKVxuXHRcdFx0JGVsICAgICA6ICRlbFxuXHRcdFx0Y2hhcnMgICA6IGNoYXJzXG5cdFx0XHR2aXNpYmxlIDogdHJ1ZVxuXG5cdFx0QF93b3JkQ2FjaGVbIGlkIF1cblxuXHRAX3dyYXBDaGFycyA6ICgkZWwpID0+XG5cblx0XHRjaGFycyA9ICRlbC50ZXh0KCkuc3BsaXQoJycpXG5cdFx0c3RhdGUgPSAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pbml0aWFsLXN0YXRlJykgb3IgXCJcIlxuXHRcdGh0bWwgPSBbXVxuXHRcdGZvciBjaGFyIGluIGNoYXJzXG5cdFx0XHRodG1sLnB1c2ggQF9zdXBwbGFudFN0cmluZyBAY29uZmlnLkNIQVJfVEVNUExBVEUsIGNoYXIgOiBjaGFyLCBzdGF0ZTogc3RhdGVcblxuXHRcdCRlbC5odG1sIGh0bWwuam9pbignJylcblxuXHRcdG51bGxcblxuXHRAX2lzV29yZEVtcHR5IDogKHdvcmQpID0+XG5cblx0XHRudWxsXG5cblx0IyBAcGFyYW0gdGFyZ2V0ID0gJ3JpZ2h0JywgJ3dyb25nJywgJ2VtcHR5J1xuXHRAX3ByZXBhcmVXb3JkIDogKHdvcmQsIHRhcmdldCwgY2hhclN0YXRlPScnKSA9PlxuXG5cdFx0Zm9yIGNoYXIsIGkgaW4gd29yZC5jaGFyc1xuXG5cdFx0XHR0YXJnZXRDaGFyID0gc3dpdGNoIHRydWVcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ3JpZ2h0JyB0aGVuIGNoYXIucmlnaHRDaGFyXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICd3cm9uZycgdGhlbiBAX2dldFJhbmRvbUNoYXIoKVxuXHRcdFx0XHR3aGVuIHRhcmdldCBpcyAnZW1wdHknIHRoZW4gJydcblx0XHRcdFx0ZWxzZSB0YXJnZXQuY2hhckF0KGkpIG9yICcnXG5cblx0XHRcdGlmIHRhcmdldENoYXIgaXMgJyAnIHRoZW4gdGFyZ2V0Q2hhciA9ICcmbmJzcDsnXG5cblx0XHRcdGNoYXIud3JvbmdDaGFycyA9IEBfZ2V0UmFuZG9tV3JvbmdDaGFycygpXG5cdFx0XHRjaGFyLnRhcmdldENoYXIgPSB0YXJnZXRDaGFyXG5cdFx0XHRjaGFyLmNoYXJTdGF0ZSAgPSBjaGFyU3RhdGVcblxuXHRcdG51bGxcblxuXHRAX2dldFJhbmRvbVdyb25nQ2hhcnMgOiA9PlxuXG5cdFx0Y2hhcnMgPSBbXVxuXG5cdFx0Y2hhckNvdW50ID0gXy5yYW5kb20gQGNvbmZpZy5NSU5fV1JPTkdfQ0hBUlMsIEBjb25maWcuTUFYX1dST05HX0NIQVJTXG5cblx0XHRmb3IgaSBpbiBbMC4uLmNoYXJDb3VudF1cblx0XHRcdGNoYXJzLnB1c2hcblx0XHRcdFx0Y2hhciAgICAgOiBAX2dldFJhbmRvbUNoYXIoKVxuXHRcdFx0XHRpbkRlbGF5ICA6IF8ucmFuZG9tIEBjb25maWcuTUlOX0NIQVJfSU5fREVMQVksIEBjb25maWcuTUFYX0NIQVJfSU5fREVMQVlcblx0XHRcdFx0b3V0RGVsYXkgOiBfLnJhbmRvbSBAY29uZmlnLk1JTl9DSEFSX09VVF9ERUxBWSwgQGNvbmZpZy5NQVhfQ0hBUl9PVVRfREVMQVlcblxuXHRcdGNoYXJzXG5cblx0QF9nZXRSYW5kb21DaGFyIDogPT5cblxuXHRcdGNoYXIgPSBAY29uZmlnLkNIQVJTWyBfLnJhbmRvbSgwLCBAY29uZmlnLkNIQVJTLmxlbmd0aC0xKSBdXG5cblx0XHRjaGFyXG5cblx0QF9nZXRMb25nZXN0Q2hhckR1cmF0aW9uIDogKGNoYXJzKSA9PlxuXG5cdFx0bG9uZ2VzdFRpbWUgPSAwXG5cdFx0bG9uZ2VzdFRpbWVJZHggPSAwXG5cblx0XHRmb3IgY2hhciwgaSBpbiBjaGFyc1xuXG5cdFx0XHR0aW1lID0gMFxuXHRcdFx0KHRpbWUgKz0gd3JvbmdDaGFyLmluRGVsYXkgKyB3cm9uZ0NoYXIub3V0RGVsYXkpIGZvciB3cm9uZ0NoYXIgaW4gY2hhci53cm9uZ0NoYXJzXG5cdFx0XHRpZiB0aW1lID4gbG9uZ2VzdFRpbWVcblx0XHRcdFx0bG9uZ2VzdFRpbWUgPSB0aW1lXG5cdFx0XHRcdGxvbmdlc3RUaW1lSWR4ID0gaVxuXG5cdFx0bG9uZ2VzdFRpbWVJZHhcblxuXHRAX2FuaW1hdGVDaGFycyA6ICh3b3JkLCBzZXF1ZW50aWFsLCBjYikgPT5cblxuXHRcdGFjdGl2ZUNoYXIgPSAwXG5cblx0XHRpZiBzZXF1ZW50aWFsXG5cdFx0XHRAX2FuaW1hdGVDaGFyIHdvcmQuY2hhcnMsIGFjdGl2ZUNoYXIsIHRydWUsIGNiXG5cdFx0ZWxzZVxuXHRcdFx0bG9uZ2VzdENoYXJJZHggPSBAX2dldExvbmdlc3RDaGFyRHVyYXRpb24gd29yZC5jaGFyc1xuXHRcdFx0Zm9yIGNoYXIsIGkgaW4gd29yZC5jaGFyc1xuXHRcdFx0XHRhcmdzID0gWyB3b3JkLmNoYXJzLCBpLCBmYWxzZSBdXG5cdFx0XHRcdGlmIGkgaXMgbG9uZ2VzdENoYXJJZHggdGhlbiBhcmdzLnB1c2ggY2Jcblx0XHRcdFx0QF9hbmltYXRlQ2hhci5hcHBseSBALCBhcmdzXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlQ2hhciA6IChjaGFycywgaWR4LCByZWN1cnNlLCBjYikgPT5cblxuXHRcdGNoYXIgPSBjaGFyc1tpZHhdXG5cblx0XHRpZiByZWN1cnNlXG5cblx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgPT5cblxuXHRcdFx0XHRpZiBpZHggaXMgY2hhcnMubGVuZ3RoLTFcblx0XHRcdFx0XHRAX2FuaW1hdGVDaGFyc0RvbmUgY2Jcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdEBfYW5pbWF0ZUNoYXIgY2hhcnMsIGlkeCsxLCByZWN1cnNlLCBjYlxuXG5cdFx0ZWxzZVxuXG5cdFx0XHRpZiB0eXBlb2YgY2IgaXMgJ2Z1bmN0aW9uJ1xuXHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsID0+IEBfYW5pbWF0ZUNoYXJzRG9uZSBjYlxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXJcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVXcm9uZ0NoYXJzIDogKGNoYXIsIGNiKSA9PlxuXG5cdFx0aWYgY2hhci53cm9uZ0NoYXJzLmxlbmd0aFxuXG5cdFx0XHR3cm9uZ0NoYXIgPSBjaGFyLndyb25nQ2hhcnMuc2hpZnQoKVxuXG5cdFx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRcdGNoYXIuJGVsLmh0bWwgd3JvbmdDaGFyLmNoYXJcblxuXHRcdFx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRcdFx0QF9hbmltYXRlV3JvbmdDaGFycyBjaGFyLCBjYlxuXHRcdFx0XHQsIHdyb25nQ2hhci5vdXREZWxheVxuXG5cdFx0XHQsIHdyb25nQ2hhci5pbkRlbGF5XG5cblx0XHRlbHNlXG5cblx0XHRcdGNoYXIuJGVsXG5cdFx0XHRcdC5hdHRyKCdkYXRhLWNvZGV0ZXh0LWNoYXItc3RhdGUnLCBjaGFyLmNoYXJTdGF0ZSlcblx0XHRcdFx0Lmh0bWwoY2hhci50YXJnZXRDaGFyKVxuXG5cdFx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdEBfYW5pbWF0ZUNoYXJzRG9uZSA6IChjYikgPT5cblxuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0QF9zdXBwbGFudFN0cmluZyA6IChzdHIsIHZhbHMpID0+XG5cblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UgL3t7IChbXnt9XSopIH19L2csIChhLCBiKSA9PlxuXHRcdFx0ciA9IHZhbHNbYl1cblx0XHRcdChpZiB0eXBlb2YgciBpcyBcInN0cmluZ1wiIG9yIHR5cGVvZiByIGlzIFwibnVtYmVyXCIgdGhlbiByIGVsc2UgYSlcblxuXHRAdG8gOiAodGFyZ2V0VGV4dCwgJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQHRvKHRhcmdldFRleHQsIF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblx0XHR3b3JkLnZpc2libGUgPSB0cnVlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsIHRhcmdldFRleHQsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QGluIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEBpbihfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cdFx0d29yZC52aXNpYmxlID0gdHJ1ZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAncmlnaHQnLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEBvdXQgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQG91dChfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdHdvcmQudmlzaWJsZSA9IGZhbHNlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdlbXB0eScsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QHNjcmFtYmxlIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEBzY3JhbWJsZShfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAnd3JvbmcnLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEB1bnNjcmFtYmxlIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEB1bnNjcmFtYmxlKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdyaWdodCcsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QGdldFNjcmFtYmxlZFdvcmQgOiAod29yZCkgPT5cblxuXHRcdG5ld0NoYXJzID0gW11cblx0XHQobmV3Q2hhcnMucHVzaCBAX2dldFJhbmRvbUNoYXIoKSkgZm9yIGNoYXIgaW4gd29yZC5zcGxpdCgnJylcblxuXHRcdHJldHVybiBuZXdDaGFycy5qb2luKCcnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvZGVXb3JkVHJhbnNpdGlvbmVyXG5cbndpbmRvdy5Db2RlV29yZFRyYW5zaXRpb25lcj0gQ29kZVdvcmRUcmFuc2l0aW9uZXJcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuXG4jIyNcblxuRmFjZWJvb2sgU0RLIHdyYXBwZXIgLSBsb2FkIGFzeW5jaHJvbm91c2x5LCBzb21lIGhlbHBlciBtZXRob2RzXG5cbiMjI1xuY2xhc3MgRmFjZWJvb2sgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHRAdXJsICAgICAgICAgOiAnLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9hbGwuanMnXG5cblx0QHBlcm1pc3Npb25zIDogJ2VtYWlsJ1xuXG5cdEAkZGF0YURmZCAgICA6IG51bGxcblx0QGxvYWRlZCAgICAgIDogZmFsc2VcblxuXHRAbG9hZCA6ID0+XG5cblx0XHQjIyNcblx0XHRUTyBET1xuXHRcdGluY2x1ZGUgc2NyaXB0IGxvYWRlciB3aXRoIGNhbGxiYWNrIHRvIDppbml0XG5cdFx0IyMjXG5cdFx0IyByZXF1aXJlIFtAdXJsXSwgQGluaXRcblxuXHRcdG51bGxcblxuXHRAaW5pdCA6ID0+XG5cblx0XHRAbG9hZGVkID0gdHJ1ZVxuXG5cdFx0RkIuaW5pdFxuXHRcdFx0YXBwSWQgIDogd2luZG93LmNvbmZpZy5mYl9hcHBfaWRcblx0XHRcdHN0YXR1cyA6IGZhbHNlXG5cdFx0XHR4ZmJtbCAgOiBmYWxzZVxuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbiA6IChAJGRhdGFEZmQpID0+XG5cblx0XHRpZiAhQGxvYWRlZCB0aGVuIHJldHVybiBAJGRhdGFEZmQucmVqZWN0ICdTREsgbm90IGxvYWRlZCdcblxuXHRcdEZCLmxvZ2luICggcmVzICkgPT5cblxuXHRcdFx0aWYgcmVzWydzdGF0dXMnXSBpcyAnY29ubmVjdGVkJ1xuXHRcdFx0XHRAZ2V0VXNlckRhdGEgcmVzWydhdXRoUmVzcG9uc2UnXVsnYWNjZXNzVG9rZW4nXVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdubyB3YXkgam9zZSdcblxuXHRcdCwgeyBzY29wZTogQHBlcm1pc3Npb25zIH1cblxuXHRcdG51bGxcblxuXHRAZ2V0VXNlckRhdGEgOiAodG9rZW4pID0+XG5cblx0XHR1c2VyRGF0YSA9IHt9XG5cdFx0dXNlckRhdGEuYWNjZXNzX3Rva2VuID0gdG9rZW5cblxuXHRcdCRtZURmZCAgID0gJC5EZWZlcnJlZCgpXG5cdFx0JHBpY0RmZCAgPSAkLkRlZmVycmVkKClcblxuXHRcdEZCLmFwaSAnL21lJywgKHJlcykgLT5cblxuXHRcdFx0dXNlckRhdGEuZnVsbF9uYW1lID0gcmVzLm5hbWVcblx0XHRcdHVzZXJEYXRhLnNvY2lhbF9pZCA9IHJlcy5pZFxuXHRcdFx0dXNlckRhdGEuZW1haWwgICAgID0gcmVzLmVtYWlsIG9yIGZhbHNlXG5cdFx0XHQkbWVEZmQucmVzb2x2ZSgpXG5cblx0XHRGQi5hcGkgJy9tZS9waWN0dXJlJywgeyAnd2lkdGgnOiAnMjAwJyB9LCAocmVzKSAtPlxuXG5cdFx0XHR1c2VyRGF0YS5wcm9maWxlX3BpYyA9IHJlcy5kYXRhLnVybFxuXHRcdFx0JHBpY0RmZC5yZXNvbHZlKClcblxuXHRcdCQud2hlbigkbWVEZmQsICRwaWNEZmQpLmRvbmUgPT4gQCRkYXRhRGZkLnJlc29sdmUgdXNlckRhdGFcblxuXHRcdG51bGxcblxuXHRAc2hhcmUgOiAob3B0cywgY2IpID0+XG5cblx0XHRGQi51aSB7XG5cdFx0XHRtZXRob2QgICAgICA6IG9wdHMubWV0aG9kIG9yICdmZWVkJ1xuXHRcdFx0bmFtZSAgICAgICAgOiBvcHRzLm5hbWUgb3IgJydcblx0XHRcdGxpbmsgICAgICAgIDogb3B0cy5saW5rIG9yICcnXG5cdFx0XHRwaWN0dXJlICAgICA6IG9wdHMucGljdHVyZSBvciAnJ1xuXHRcdFx0Y2FwdGlvbiAgICAgOiBvcHRzLmNhcHRpb24gb3IgJydcblx0XHRcdGRlc2NyaXB0aW9uIDogb3B0cy5kZXNjcmlwdGlvbiBvciAnJ1xuXHRcdH0sIChyZXNwb25zZSkgLT5cblx0XHRcdGNiPyhyZXNwb25zZSlcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGYWNlYm9va1xuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5cbiMjI1xuXG5Hb29nbGUrIFNESyB3cmFwcGVyIC0gbG9hZCBhc3luY2hyb25vdXNseSwgc29tZSBoZWxwZXIgbWV0aG9kc1xuXG4jIyNcbmNsYXNzIEdvb2dsZVBsdXMgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHRAdXJsICAgICAgOiAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50OnBsdXNvbmUuanMnXG5cblx0QHBhcmFtcyAgIDpcblx0XHQnY2xpZW50aWQnICAgICA6IG51bGxcblx0XHQnY2FsbGJhY2snICAgICA6IG51bGxcblx0XHQnc2NvcGUnICAgICAgICA6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL3VzZXJpbmZvLmVtYWlsJ1xuXHRcdCdjb29raWVwb2xpY3knIDogJ25vbmUnXG5cblx0QCRkYXRhRGZkIDogbnVsbFxuXHRAbG9hZGVkICAgOiBmYWxzZVxuXG5cdEBsb2FkIDogPT5cblxuXHRcdCMjI1xuXHRcdFRPIERPXG5cdFx0aW5jbHVkZSBzY3JpcHQgbG9hZGVyIHdpdGggY2FsbGJhY2sgdG8gOmluaXRcblx0XHQjIyNcblx0XHQjIHJlcXVpcmUgW0B1cmxdLCBAaW5pdFxuXG5cdFx0bnVsbFxuXG5cdEBpbml0IDogPT5cblxuXHRcdEBsb2FkZWQgPSB0cnVlXG5cblx0XHRAcGFyYW1zWydjbGllbnRpZCddID0gd2luZG93LmNvbmZpZy5ncF9hcHBfaWRcblx0XHRAcGFyYW1zWydjYWxsYmFjayddID0gQGxvZ2luQ2FsbGJhY2tcblxuXHRcdG51bGxcblxuXHRAbG9naW4gOiAoQCRkYXRhRGZkKSA9PlxuXG5cdFx0aWYgQGxvYWRlZFxuXHRcdFx0Z2FwaS5hdXRoLnNpZ25JbiBAcGFyYW1zXG5cdFx0ZWxzZVxuXHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnU0RLIG5vdCBsb2FkZWQnXG5cblx0XHRudWxsXG5cblx0QGxvZ2luQ2FsbGJhY2sgOiAocmVzKSA9PlxuXG5cdFx0aWYgcmVzWydzdGF0dXMnXVsnc2lnbmVkX2luJ11cblx0XHRcdEBnZXRVc2VyRGF0YSByZXNbJ2FjY2Vzc190b2tlbiddXG5cdFx0ZWxzZSBpZiByZXNbJ2Vycm9yJ11bJ2FjY2Vzc19kZW5pZWQnXVxuXHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnbm8gd2F5IGpvc2UnXG5cblx0XHRudWxsXG5cblx0QGdldFVzZXJEYXRhIDogKHRva2VuKSA9PlxuXG5cdFx0Z2FwaS5jbGllbnQubG9hZCAncGx1cycsJ3YxJywgPT5cblxuXHRcdFx0cmVxdWVzdCA9IGdhcGkuY2xpZW50LnBsdXMucGVvcGxlLmdldCAndXNlcklkJzogJ21lJ1xuXHRcdFx0cmVxdWVzdC5leGVjdXRlIChyZXMpID0+XG5cblx0XHRcdFx0dXNlckRhdGEgPVxuXHRcdFx0XHRcdGFjY2Vzc190b2tlbiA6IHRva2VuXG5cdFx0XHRcdFx0ZnVsbF9uYW1lICAgIDogcmVzLmRpc3BsYXlOYW1lXG5cdFx0XHRcdFx0c29jaWFsX2lkICAgIDogcmVzLmlkXG5cdFx0XHRcdFx0ZW1haWwgICAgICAgIDogaWYgcmVzLmVtYWlsc1swXSB0aGVuIHJlcy5lbWFpbHNbMF0udmFsdWUgZWxzZSBmYWxzZVxuXHRcdFx0XHRcdHByb2ZpbGVfcGljICA6IHJlcy5pbWFnZS51cmxcblxuXHRcdFx0XHRAJGRhdGFEZmQucmVzb2x2ZSB1c2VyRGF0YVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZVBsdXNcbiIsIiMgICAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgICBNZWRpYSBRdWVyaWVzIE1hbmFnZXIgXG4jICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jICAgXG4jICAgQGF1dGhvciA6IEbDoWJpbyBBemV2ZWRvIDxmYWJpby5hemV2ZWRvQHVuaXQ5LmNvbT4gVU5JVDlcbiMgICBAZGF0ZSAgIDogU2VwdGVtYmVyIDE0XG4jICAgXG4jICAgSW5zdHJ1Y3Rpb25zIGFyZSBvbiAvcHJvamVjdC9zYXNzL3V0aWxzL19yZXNwb25zaXZlLnNjc3MuXG5cbmNsYXNzIE1lZGlhUXVlcmllc1xuXG4gICAgIyBCcmVha3BvaW50c1xuICAgIEBTTUFMTCAgICAgICA6IFwic21hbGxcIlxuICAgIEBJUEFEICAgICAgICA6IFwiaXBhZFwiXG4gICAgQE1FRElVTSAgICAgIDogXCJtZWRpdW1cIlxuICAgIEBMQVJHRSAgICAgICA6IFwibGFyZ2VcIlxuICAgIEBFWFRSQV9MQVJHRSA6IFwiZXh0cmEtbGFyZ2VcIlxuXG4gICAgQHNldHVwIDogPT5cblxuICAgICAgICBNZWRpYVF1ZXJpZXMuU01BTExfQlJFQUtQT0lOVCAgPSB7bmFtZTogXCJTbWFsbFwiLCBicmVha3BvaW50czogW01lZGlhUXVlcmllcy5TTUFMTF19XG4gICAgICAgIE1lZGlhUXVlcmllcy5NRURJVU1fQlJFQUtQT0lOVCA9IHtuYW1lOiBcIk1lZGl1bVwiLCBicmVha3BvaW50czogW01lZGlhUXVlcmllcy5NRURJVU1dfVxuICAgICAgICBNZWRpYVF1ZXJpZXMuTEFSR0VfQlJFQUtQT0lOVCAgPSB7bmFtZTogXCJMYXJnZVwiLCBicmVha3BvaW50czogW01lZGlhUXVlcmllcy5JUEFELCBNZWRpYVF1ZXJpZXMuTEFSR0UsIE1lZGlhUXVlcmllcy5FWFRSQV9MQVJHRV19XG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTID0gW1xuICAgICAgICAgICAgTWVkaWFRdWVyaWVzLlNNQUxMX0JSRUFLUE9JTlRcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5NRURJVU1fQlJFQUtQT0lOVFxuICAgICAgICAgICAgTWVkaWFRdWVyaWVzLkxBUkdFX0JSRUFLUE9JTlRcbiAgICAgICAgXVxuICAgICAgICByZXR1cm5cblxuICAgIEBnZXREZXZpY2VTdGF0ZSA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHksIFwiYWZ0ZXJcIikuZ2V0UHJvcGVydHlWYWx1ZShcImNvbnRlbnRcIik7XG5cbiAgICBAZ2V0QnJlYWtwb2ludCA6ID0+XG5cbiAgICAgICAgc3RhdGUgPSBNZWRpYVF1ZXJpZXMuZ2V0RGV2aWNlU3RhdGUoKVxuXG4gICAgICAgIGZvciBpIGluIFswLi4uTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTLmxlbmd0aF1cbiAgICAgICAgICAgIGlmIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UU1tpXS5icmVha3BvaW50cy5pbmRleE9mKHN0YXRlKSA+IC0xXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UU1tpXS5uYW1lXG5cbiAgICAgICAgcmV0dXJuIFwiXCJcblxuICAgIEBpc0JyZWFrcG9pbnQgOiAoYnJlYWtwb2ludCkgPT5cblxuICAgICAgICBmb3IgaSBpbiBbMC4uLmJyZWFrcG9pbnQuYnJlYWtwb2ludHMubGVuZ3RoXVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBicmVha3BvaW50LmJyZWFrcG9pbnRzW2ldID09IE1lZGlhUXVlcmllcy5nZXREZXZpY2VTdGF0ZSgpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcblxuICAgICAgICByZXR1cm4gZmFsc2Vcblxud2luZG93Lk1lZGlhUXVlcmllcyA9IE1lZGlhUXVlcmllc1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lZGlhUXVlcmllc1xuIiwiY2xhc3MgTnVtYmVyVXRpbHNcblxuICAgIEBNQVRIX0NPUzogTWF0aC5jb3MgXG4gICAgQE1BVEhfU0lOOiBNYXRoLnNpbiBcbiAgICBATUFUSF9SQU5ET006IE1hdGgucmFuZG9tIFxuICAgIEBNQVRIX0FCUzogTWF0aC5hYnNcbiAgICBATUFUSF9BVEFOMjogTWF0aC5hdGFuMlxuXG4gICAgQGxpbWl0OihudW1iZXIsIG1pbiwgbWF4KS0+XG4gICAgICAgIHJldHVybiBNYXRoLm1pbiggTWF0aC5tYXgobWluLG51bWJlciksIG1heCApXG5cbiAgICBAZ2V0UmFuZG9tQ29sb3I6IC0+XG5cbiAgICAgICAgbGV0dGVycyA9ICcwMTIzNDU2Nzg5QUJDREVGJy5zcGxpdCgnJylcbiAgICAgICAgY29sb3IgPSAnIydcbiAgICAgICAgZm9yIGkgaW4gWzAuLi42XVxuICAgICAgICAgICAgY29sb3IgKz0gbGV0dGVyc1tNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxNSldXG4gICAgICAgIGNvbG9yXG5cbiAgICBAZ2V0VGltZVN0YW1wRGlmZiA6IChkYXRlMSwgZGF0ZTIpIC0+XG5cbiAgICAgICAgIyBHZXQgMSBkYXkgaW4gbWlsbGlzZWNvbmRzXG4gICAgICAgIG9uZV9kYXkgPSAxMDAwKjYwKjYwKjI0XG4gICAgICAgIHRpbWUgICAgPSB7fVxuXG4gICAgICAgICMgQ29udmVydCBib3RoIGRhdGVzIHRvIG1pbGxpc2Vjb25kc1xuICAgICAgICBkYXRlMV9tcyA9IGRhdGUxLmdldFRpbWUoKVxuICAgICAgICBkYXRlMl9tcyA9IGRhdGUyLmdldFRpbWUoKVxuXG4gICAgICAgICMgQ2FsY3VsYXRlIHRoZSBkaWZmZXJlbmNlIGluIG1pbGxpc2Vjb25kc1xuICAgICAgICBkaWZmZXJlbmNlX21zID0gZGF0ZTJfbXMgLSBkYXRlMV9tc1xuXG4gICAgICAgICMgdGFrZSBvdXQgbWlsbGlzZWNvbmRzXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkaWZmZXJlbmNlX21zLzEwMDBcbiAgICAgICAgdGltZS5zZWNvbmRzICA9IE1hdGguZmxvb3IoZGlmZmVyZW5jZV9tcyAlIDYwKVxuXG4gICAgICAgIGRpZmZlcmVuY2VfbXMgPSBkaWZmZXJlbmNlX21zLzYwIFxuICAgICAgICB0aW1lLm1pbnV0ZXMgID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlX21zICUgNjApXG5cbiAgICAgICAgZGlmZmVyZW5jZV9tcyA9IGRpZmZlcmVuY2VfbXMvNjAgXG4gICAgICAgIHRpbWUuaG91cnMgICAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMgJSAyNCkgIFxuXG4gICAgICAgIHRpbWUuZGF5cyAgICAgPSBNYXRoLmZsb29yKGRpZmZlcmVuY2VfbXMvMjQpXG5cbiAgICAgICAgdGltZVxuXG4gICAgQG1hcDogKCBudW0sIG1pbjEsIG1heDEsIG1pbjIsIG1heDIsIHJvdW5kID0gZmFsc2UsIGNvbnN0cmFpbk1pbiA9IHRydWUsIGNvbnN0cmFpbk1heCA9IHRydWUgKSAtPlxuICAgICAgICBpZiBjb25zdHJhaW5NaW4gYW5kIG51bSA8IG1pbjEgdGhlbiByZXR1cm4gbWluMlxuICAgICAgICBpZiBjb25zdHJhaW5NYXggYW5kIG51bSA+IG1heDEgdGhlbiByZXR1cm4gbWF4MlxuICAgICAgICBcbiAgICAgICAgbnVtMSA9IChudW0gLSBtaW4xKSAvIChtYXgxIC0gbWluMSlcbiAgICAgICAgbnVtMiA9IChudW0xICogKG1heDIgLSBtaW4yKSkgKyBtaW4yXG4gICAgICAgIGlmIHJvdW5kIHRoZW4gcmV0dXJuIE1hdGgucm91bmQobnVtMilcblxuICAgICAgICByZXR1cm4gbnVtMlxuXG4gICAgQHRvUmFkaWFuczogKCBkZWdyZWUgKSAtPlxuICAgICAgICByZXR1cm4gZGVncmVlICogKCBNYXRoLlBJIC8gMTgwIClcblxuICAgIEB0b0RlZ3JlZTogKCByYWRpYW5zICkgLT5cbiAgICAgICAgcmV0dXJuIHJhZGlhbnMgKiAoIDE4MCAvIE1hdGguUEkgKVxuXG4gICAgQGlzSW5SYW5nZTogKCBudW0sIG1pbiwgbWF4LCBjYW5CZUVxdWFsICkgLT5cbiAgICAgICAgaWYgY2FuQmVFcXVhbCB0aGVuIHJldHVybiBudW0gPj0gbWluICYmIG51bSA8PSBtYXhcbiAgICAgICAgZWxzZSByZXR1cm4gbnVtID49IG1pbiAmJiBudW0gPD0gbWF4XG5cbiAgICAjIGNvbnZlcnQgbWV0cmVzIGluIHRvIG0gLyBLTVxuICAgIEBnZXROaWNlRGlzdGFuY2U6IChtZXRyZXMpID0+XG5cbiAgICAgICAgaWYgbWV0cmVzIDwgMTAwMFxuXG4gICAgICAgICAgICByZXR1cm4gXCIje01hdGgucm91bmQobWV0cmVzKX1NXCJcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIGttID0gKG1ldHJlcy8xMDAwKS50b0ZpeGVkKDIpXG4gICAgICAgICAgICByZXR1cm4gXCIje2ttfUtNXCJcblxuICAgICMgZnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMjY3MzM4XG4gICAgQHplcm9GaWxsOiAoIG51bWJlciwgd2lkdGggKSA9PlxuXG4gICAgICAgIHdpZHRoIC09IG51bWJlci50b1N0cmluZygpLmxlbmd0aFxuXG4gICAgICAgIGlmIHdpZHRoID4gMFxuICAgICAgICAgICAgcmV0dXJuIG5ldyBBcnJheSggd2lkdGggKyAoL1xcLi8udGVzdCggbnVtYmVyICkgPyAyIDogMSkgKS5qb2luKCAnMCcgKSArIG51bWJlclxuXG4gICAgICAgIHJldHVybiBudW1iZXIgKyBcIlwiICMgYWx3YXlzIHJldHVybiBhIHN0cmluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlclV0aWxzXG4iLCIjIyNcbiMgUmVxdWVzdGVyICNcblxuV3JhcHBlciBmb3IgYCQuYWpheGAgY2FsbHNcblxuIyMjXG5jbGFzcyBSZXF1ZXN0ZXJcblxuICAgIEByZXF1ZXN0cyA6IFtdXG5cbiAgICBAcmVxdWVzdDogKCBkYXRhICkgPT5cbiAgICAgICAgIyMjXG4gICAgICAgIGBkYXRhID0ge2A8YnI+XG4gICAgICAgIGAgIHVybCAgICAgICAgIDogU3RyaW5nYDxicj5cbiAgICAgICAgYCAgdHlwZSAgICAgICAgOiBcIlBPU1QvR0VUL1BVVFwiYDxicj5cbiAgICAgICAgYCAgZGF0YSAgICAgICAgOiBPYmplY3RgPGJyPlxuICAgICAgICBgICBkYXRhVHlwZSAgICA6IGpRdWVyeSBkYXRhVHlwZWA8YnI+XG4gICAgICAgIGAgIGNvbnRlbnRUeXBlIDogU3RyaW5nYDxicj5cbiAgICAgICAgYH1gXG4gICAgICAgICMjI1xuXG4gICAgICAgIHIgPSAkLmFqYXgge1xuXG4gICAgICAgICAgICB1cmwgICAgICAgICA6IGRhdGEudXJsXG4gICAgICAgICAgICB0eXBlICAgICAgICA6IGlmIGRhdGEudHlwZSB0aGVuIGRhdGEudHlwZSBlbHNlIFwiUE9TVFwiLFxuICAgICAgICAgICAgZGF0YSAgICAgICAgOiBpZiBkYXRhLmRhdGEgdGhlbiBkYXRhLmRhdGEgZWxzZSBudWxsLFxuICAgICAgICAgICAgZGF0YVR5cGUgICAgOiBpZiBkYXRhLmRhdGFUeXBlIHRoZW4gZGF0YS5kYXRhVHlwZSBlbHNlIFwianNvblwiLFxuICAgICAgICAgICAgY29udGVudFR5cGUgOiBpZiBkYXRhLmNvbnRlbnRUeXBlIHRoZW4gZGF0YS5jb250ZW50VHlwZSBlbHNlIFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04XCIsXG4gICAgICAgICAgICBwcm9jZXNzRGF0YSA6IGlmIGRhdGEucHJvY2Vzc0RhdGEgIT0gbnVsbCBhbmQgZGF0YS5wcm9jZXNzRGF0YSAhPSB1bmRlZmluZWQgdGhlbiBkYXRhLnByb2Nlc3NEYXRhIGVsc2UgdHJ1ZVxuXG4gICAgICAgIH1cblxuICAgICAgICByLmRvbmUgZGF0YS5kb25lXG4gICAgICAgIHIuZmFpbCBkYXRhLmZhaWxcbiAgICAgICAgXG4gICAgICAgIHJcblxuICAgIEBhZGRJbWFnZSA6IChkYXRhLCBkb25lLCBmYWlsKSA9PlxuICAgICAgICAjIyNcbiAgICAgICAgKiogVXNhZ2U6IDxicj5cbiAgICAgICAgYGRhdGEgPSBjYW52YXNzLnRvRGF0YVVSTChcImltYWdlL2pwZWdcIikuc2xpY2UoXCJkYXRhOmltYWdlL2pwZWc7YmFzZTY0LFwiLmxlbmd0aClgPGJyPlxuICAgICAgICBgUmVxdWVzdGVyLmFkZEltYWdlIGRhdGEsIFwiem9ldHJvcGVcIiwgQGRvbmUsIEBmYWlsYFxuICAgICAgICAjIyNcblxuICAgICAgICBAcmVxdWVzdFxuICAgICAgICAgICAgdXJsICAgIDogJy9hcGkvaW1hZ2VzLydcbiAgICAgICAgICAgIHR5cGUgICA6ICdQT1NUJ1xuICAgICAgICAgICAgZGF0YSAgIDoge2ltYWdlX2Jhc2U2NCA6IGVuY29kZVVSSShkYXRhKX1cbiAgICAgICAgICAgIGRvbmUgICA6IGRvbmVcbiAgICAgICAgICAgIGZhaWwgICA6IGZhaWxcblxuICAgICAgICBudWxsXG5cbiAgICBAZGVsZXRlSW1hZ2UgOiAoaWQsIGRvbmUsIGZhaWwpID0+XG4gICAgICAgIFxuICAgICAgICBAcmVxdWVzdFxuICAgICAgICAgICAgdXJsICAgIDogJy9hcGkvaW1hZ2VzLycraWRcbiAgICAgICAgICAgIHR5cGUgICA6ICdERUxFVEUnXG4gICAgICAgICAgICBkb25lICAgOiBkb25lXG4gICAgICAgICAgICBmYWlsICAgOiBmYWlsXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RlclxuIiwiIyMjXG5TaGFyaW5nIGNsYXNzIGZvciBub24tU0RLIGxvYWRlZCBzb2NpYWwgbmV0d29ya3MuXG5JZiBTREsgaXMgbG9hZGVkLCBhbmQgcHJvdmlkZXMgc2hhcmUgbWV0aG9kcywgdGhlbiB1c2UgdGhhdCBjbGFzcyBpbnN0ZWFkLCBlZy4gYEZhY2Vib29rLnNoYXJlYCBpbnN0ZWFkIG9mIGBTaGFyZS5mYWNlYm9va2BcbiMjI1xuY2xhc3MgU2hhcmVcblxuICAgIHVybCA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogLT5cblxuICAgICAgICBAdXJsID0gQENEKCkuQkFTRV9VUkxcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgb3BlbldpbiA6ICh1cmwsIHcsIGgpID0+XG5cbiAgICAgICAgbGVmdCA9ICggc2NyZWVuLmF2YWlsV2lkdGggIC0gdyApID4+IDFcbiAgICAgICAgdG9wICA9ICggc2NyZWVuLmF2YWlsSGVpZ2h0IC0gaCApID4+IDFcblxuICAgICAgICB3aW5kb3cub3BlbiB1cmwsICcnLCAndG9wPScrdG9wKycsbGVmdD0nK2xlZnQrJyx3aWR0aD0nK3crJyxoZWlnaHQ9JytoKycsbG9jYXRpb249bm8sbWVudWJhcj1ubydcblxuICAgICAgICBudWxsXG5cbiAgICBwbHVzIDogKCB1cmwgKSA9PlxuXG4gICAgICAgIHVybCA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcblxuICAgICAgICBAb3BlbldpbiBcImh0dHBzOi8vcGx1cy5nb29nbGUuY29tL3NoYXJlP3VybD0je3VybH1cIiwgNjUwLCAzODVcblxuICAgICAgICBudWxsXG5cbiAgICBwaW50ZXJlc3QgOiAodXJsLCBtZWRpYSwgZGVzY3IpID0+XG5cbiAgICAgICAgdXJsICAgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG4gICAgICAgIG1lZGlhID0gZW5jb2RlVVJJQ29tcG9uZW50KG1lZGlhKVxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChkZXNjcilcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cucGludGVyZXN0LmNvbS9waW4vY3JlYXRlL2J1dHRvbi8/dXJsPSN7dXJsfSZtZWRpYT0je21lZGlhfSZkZXNjcmlwdGlvbj0je2Rlc2NyfVwiLCA3MzUsIDMxMFxuXG4gICAgICAgIG51bGxcblxuICAgIHR1bWJsciA6ICh1cmwsIG1lZGlhLCBkZXNjcikgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgbWVkaWEgPSBlbmNvZGVVUklDb21wb25lbnQobWVkaWEpXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGRlc2NyKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy50dW1ibHIuY29tL3NoYXJlL3Bob3RvP3NvdXJjZT0je21lZGlhfSZjYXB0aW9uPSN7ZGVzY3J9JmNsaWNrX3RocnU9I3t1cmx9XCIsIDQ1MCwgNDMwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZmFjZWJvb2sgOiAoIHVybCAsIGNvcHkgPSAnJykgPT4gXG5cbiAgICAgICAgdXJsICAgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG4gICAgICAgIGRlY3NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGNvcHkpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9zaGFyZS5waHA/dT0je3VybH0mdD0je2RlY3NyfVwiLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHR3aXR0ZXIgOiAoIHVybCAsIGNvcHkgPSAnJykgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgaWYgY29weSBpcyAnJ1xuICAgICAgICAgICAgY29weSA9IEBDRCgpLmxvY2FsZS5nZXQgJ3Nlb190d2l0dGVyX2NhcmRfZGVzY3JpcHRpb24nXG4gICAgICAgICAgICBcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoY29weSlcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly90d2l0dGVyLmNvbS9pbnRlbnQvdHdlZXQvP3RleHQ9I3tkZXNjcn0mdXJsPSN7dXJsfVwiLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHJlbnJlbiA6ICggdXJsICkgPT4gXG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3NoYXJlLnJlbnJlbi5jb20vc2hhcmUvYnV0dG9uc2hhcmUuZG8/bGluaz1cIiArIHVybCwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICB3ZWlibyA6ICggdXJsICkgPT4gXG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3NlcnZpY2Uud2VpYm8uY29tL3NoYXJlL3NoYXJlLnBocD91cmw9I3t1cmx9Jmxhbmd1YWdlPXpoX2NuXCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQ0QgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBTaGFyZVxuIiwiY2xhc3MgQWJzdHJhY3RWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cdGVsICAgICAgICAgICA6IG51bGxcblx0aWQgICAgICAgICAgIDogbnVsbFxuXHRjaGlsZHJlbiAgICAgOiBudWxsXG5cdHRlbXBsYXRlICAgICA6IG51bGxcblx0dGVtcGxhdGVWYXJzIDogbnVsbFxuXHRcblx0aW5pdGlhbGl6ZSA6IC0+XG5cdFx0XG5cdFx0QGNoaWxkcmVuID0gW11cblxuXHRcdGlmIEB0ZW1wbGF0ZVxuXHRcdFx0dG1wSFRNTCA9IF8udGVtcGxhdGUgQENEKCkudGVtcGxhdGVzLmdldCBAdGVtcGxhdGVcblx0XHRcdEBzZXRFbGVtZW50IHRtcEhUTUwgQHRlbXBsYXRlVmFyc1xuXG5cdFx0QCRlbC5hdHRyICdpZCcsIEBpZCBpZiBAaWRcblx0XHRAJGVsLmFkZENsYXNzIEBjbGFzc05hbWUgaWYgQGNsYXNzTmFtZVxuXHRcdFxuXHRcdEBpbml0KClcblxuXHRcdEBwYXVzZWQgPSBmYWxzZVxuXG5cdFx0bnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdHVwZGF0ZSA6ID0+XG5cblx0XHRudWxsXG5cblx0cmVuZGVyIDogPT5cblxuXHRcdG51bGxcblxuXHRhZGRDaGlsZCA6IChjaGlsZCwgcHJlcGVuZCA9IGZhbHNlKSA9PlxuXG5cdFx0QGNoaWxkcmVuLnB1c2ggY2hpbGQgaWYgY2hpbGQuZWxcblx0XHR0YXJnZXQgPSBpZiBAYWRkVG9TZWxlY3RvciB0aGVuIEAkZWwuZmluZChAYWRkVG9TZWxlY3RvcikuZXEoMCkgZWxzZSBAJGVsXG5cdFx0XG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblxuXHRcdGlmICFwcmVwZW5kIFxuXHRcdFx0dGFyZ2V0LmFwcGVuZCBjXG5cdFx0ZWxzZSBcblx0XHRcdHRhcmdldC5wcmVwZW5kIGNcblxuXHRcdEBcblxuXHRyZXBsYWNlIDogKGRvbSwgY2hpbGQpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdGMgPSBpZiBjaGlsZC5lbCB0aGVuIGNoaWxkLiRlbCBlbHNlIGNoaWxkXG5cdFx0QCRlbC5jaGlsZHJlbihkb20pLnJlcGxhY2VXaXRoKGMpXG5cblx0XHRudWxsXG5cblx0cmVtb3ZlIDogKGNoaWxkKSA9PlxuXG5cdFx0dW5sZXNzIGNoaWxkP1xuXHRcdFx0cmV0dXJuXG5cdFx0XG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgJChjaGlsZClcblx0XHRjaGlsZC5kaXNwb3NlKCkgaWYgYyBhbmQgY2hpbGQuZGlzcG9zZVxuXG5cdFx0aWYgYyAmJiBAY2hpbGRyZW4uaW5kZXhPZihjaGlsZCkgIT0gLTFcblx0XHRcdEBjaGlsZHJlbi5zcGxpY2UoIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSwgMSApXG5cblx0XHRjLnJlbW92ZSgpXG5cblx0XHRudWxsXG5cblx0b25SZXNpemUgOiAoZXZlbnQpID0+XG5cblx0XHQoaWYgY2hpbGQub25SZXNpemUgdGhlbiBjaGlsZC5vblJlc2l6ZSgpKSBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0bW91c2VFbmFibGVkIDogKCBlbmFibGVkICkgPT5cblxuXHRcdEAkZWwuY3NzXG5cdFx0XHRcInBvaW50ZXItZXZlbnRzXCI6IGlmIGVuYWJsZWQgdGhlbiBcImF1dG9cIiBlbHNlIFwibm9uZVwiXG5cblx0XHRudWxsXG5cblx0Q1NTVHJhbnNsYXRlIDogKHgsIHksIHZhbHVlPSclJywgc2NhbGUpID0+XG5cblx0XHRpZiBNb2Rlcm5penIuY3NzdHJhbnNmb3JtczNkXG5cdFx0XHRzdHIgPSBcInRyYW5zbGF0ZTNkKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0sIDApXCJcblx0XHRlbHNlXG5cdFx0XHRzdHIgPSBcInRyYW5zbGF0ZSgje3grdmFsdWV9LCAje3krdmFsdWV9KVwiXG5cblx0XHRpZiBzY2FsZSB0aGVuIHN0ciA9IFwiI3tzdHJ9IHNjYWxlKCN7c2NhbGV9KVwiXG5cblx0XHRzdHJcblxuXHR1bk11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC51bk11dGU/KClcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0Y2hpbGQudW5NdXRlQWxsKClcblxuXHRcdG51bGxcblxuXHRtdXRlQWxsIDogPT5cblxuXHRcdGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGQubXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC5tdXRlQWxsKClcblxuXHRcdG51bGxcblxuXHRyZW1vdmVBbGxDaGlsZHJlbjogPT5cblxuXHRcdEByZW1vdmUgY2hpbGQgZm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdHRyaWdnZXJDaGlsZHJlbiA6IChtc2csIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdGZvciBjaGlsZCwgaSBpbiBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC50cmlnZ2VyIG1zZ1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAdHJpZ2dlckNoaWxkcmVuIG1zZywgY2hpbGQuY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRjYWxsQ2hpbGRyZW4gOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdGZvciBjaGlsZCwgaSBpbiBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZFttZXRob2RdPyBwYXJhbXNcblxuXHRcdFx0aWYgY2hpbGQuY2hpbGRyZW4ubGVuZ3RoXG5cblx0XHRcdFx0QGNhbGxDaGlsZHJlbiBtZXRob2QsIHBhcmFtcywgY2hpbGQuY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRjYWxsQ2hpbGRyZW5BbmRTZWxmIDogKG1ldGhvZCwgcGFyYW1zLCBjaGlsZHJlbj1AY2hpbGRyZW4pID0+XG5cblx0XHRAW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdHN1cHBsYW50U3RyaW5nIDogKHN0ciwgdmFscywgYWxsb3dTcGFjZXM9dHJ1ZSkgLT5cblxuXHRcdHJlID0gaWYgYWxsb3dTcGFjZXMgdGhlbiBuZXcgUmVnRXhwKCd7eyAoW157fV0qKSB9fScsICdnJykgZWxzZSBuZXcgUmVnRXhwKCd7eyhbXnt9XSopfX0nLCAnZycpXG5cblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UgcmUsIChhLCBiKSAtPlxuXHRcdFx0ciA9IHZhbHNbYl1cblx0XHRcdChpZiB0eXBlb2YgciBpcyBcInN0cmluZ1wiIG9yIHR5cGVvZiByIGlzIFwibnVtYmVyXCIgdGhlbiByIGVsc2UgYSlcblxuXHRkaXNwb3NlIDogPT5cblxuXHRcdCMjI1xuXHRcdG92ZXJyaWRlIG9uIHBlciB2aWV3IGJhc2lzIC0gdW5iaW5kIGV2ZW50IGhhbmRsZXJzIGV0Y1xuXHRcdCMjI1xuXG5cdFx0bnVsbFxuXG5cdENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdFZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4vQWJzdHJhY3RWaWV3J1xuXG5jbGFzcyBBYnN0cmFjdFZpZXdQYWdlIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0X3Nob3duICAgICA6IGZhbHNlXG5cdF9saXN0ZW5pbmcgOiBmYWxzZVxuXG5cdHNob3cgOiAoY2IpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzICFAX3Nob3duXG5cdFx0QF9zaG93biA9IHRydWVcblxuXHRcdCMjI1xuXHRcdENIQU5HRSBIRVJFIC0gJ3BhZ2UnIHZpZXdzIGFyZSBhbHdheXMgaW4gRE9NIC0gdG8gc2F2ZSBoYXZpbmcgdG8gcmUtaW5pdGlhbGlzZSBnbWFwIGV2ZW50cyAoUElUQSkuIE5vIGxvbmdlciByZXF1aXJlIDpkaXNwb3NlIG1ldGhvZFxuXHRcdCMjI1xuXHRcdEBDRCgpLmFwcFZpZXcud3JhcHBlci5hZGRDaGlsZCBAXG5cdFx0QGNhbGxDaGlsZHJlbkFuZFNlbGYgJ3NldExpc3RlbmVycycsICdvbidcblxuXHRcdCMjIyByZXBsYWNlIHdpdGggc29tZSBwcm9wZXIgdHJhbnNpdGlvbiBpZiB3ZSBjYW4gIyMjXG5cdFx0QCRlbC5jc3MgJ3Zpc2liaWxpdHknIDogJ3Zpc2libGUnXG5cdFx0Y2I/KClcblxuXHRcdGlmIEBDRCgpLm5hdi5jaGFuZ2VWaWV3Q291bnQgaXMgMVxuXHRcdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1BSRUxPQURFUl9ISURFLCBAYW5pbWF0ZUluXG5cdFx0ZWxzZVxuXHRcdFx0QGFuaW1hdGVJbigpXG5cblx0XHRudWxsXG5cblx0aGlkZSA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgQF9zaG93blxuXHRcdEBfc2hvd24gPSBmYWxzZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLnJlbW92ZSBAXG5cblx0XHQjIEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAnaGlkZGVuJ1xuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29mZidcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHJldHVybiB1bmxlc3Mgc2V0dGluZyBpc250IEBfbGlzdGVuaW5nXG5cdFx0QF9saXN0ZW5pbmcgPSBzZXR0aW5nXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdCMjI1xuXHRcdHN0dWJiZWQgaGVyZSwgb3ZlcnJpZGUgaW4gdXNlZCBwYWdlIGNsYXNzZXNcblx0XHQjIyNcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdFZpZXdQYWdlXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcblxuY2xhc3MgQWJvdXRQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWFib3V0J1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGRlc2MgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiYWJvdXRfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBleGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFib3V0UGFnZVZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblxuY2xhc3MgRm9vdGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICB0ZW1wbGF0ZSA6ICdzaXRlLWZvb3RlcidcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEB0ZW1wbGF0ZVZhcnMgPSB7fVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEZvb3RlclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Sb3V0ZXIgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3JvdXRlci9Sb3V0ZXInXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBIZWFkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHR0ZW1wbGF0ZSA6ICdzaXRlLWhlYWRlcidcblxuXHRGSVJTVF9IQVNIQ0hBTkdFIDogdHJ1ZVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPVxuXHRcdFx0aG9tZSAgICA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9sb2dvX2xhYmVsJylcblx0XHRcdFx0dXJsICAgICAgOiBAQ0QoKS5CQVNFX1VSTCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cdFx0XHRhYm91dCA6IFxuXHRcdFx0XHRsYWJlbCAgICA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9hYm91dF9sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVRcblx0XHRcdGNvbnRyaWJ1dGUgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY29udHJpYnV0ZV9sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURVxuXHRcdFx0Y2xvc2VfbGFiZWwgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfY2xvc2VfbGFiZWwnKVxuXHRcdFx0aW5mb19sYWJlbCA6IEBDRCgpLmxvY2FsZS5nZXQoJ2hlYWRlcl9pbmZvX2xhYmVsJylcblxuXHRcdHN1cGVyKClcblxuXHRcdEBiaW5kRXZlbnRzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGxvZ28gICAgICAgICAgICAgID0gQCRlbC5maW5kKCcubG9nb19fbGluaycpXG5cdFx0QCRuYXZMaW5rQWJvdXQgICAgICA9IEAkZWwuZmluZCgnLmFib3V0LWJ0bicpXG5cdFx0QCRuYXZMaW5rQ29udHJpYnV0ZSA9IEAkZWwuZmluZCgnLmNvbnRyaWJ1dGUtYnRuJylcblx0XHRAJGluZm9CdG4gICAgICAgICAgID0gQCRlbC5maW5kKCcuaW5mby1idG4nKVxuXHRcdEAkY2xvc2VCdG4gICAgICAgICAgPSBAJGVsLmZpbmQoJy5jbG9zZS1idG4nKVxuXG5cdFx0bnVsbFxuXG5cdGJpbmRFdmVudHMgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiBAQ0QoKS5hcHBWaWV3LkVWRU5UX1BSRUxPQURFUl9ISURFLCBAYW5pbWF0ZVRleHRJblxuXHRcdEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAb25IYXNoQ2hhbmdlXG5cblx0XHRAJGVsLm9uICdtb3VzZWVudGVyJywgJ1tkYXRhLWNvZGV3b3JkXScsIEBvbldvcmRFbnRlclxuXHRcdEAkZWwub24gJ21vdXNlbGVhdmUnLCAnW2RhdGEtY29kZXdvcmRdJywgQG9uV29yZExlYXZlXG5cblx0XHRudWxsXG5cblx0b25IYXNoQ2hhbmdlIDogKHdoZXJlKSA9PlxuXG5cdFx0aWYgQEZJUlNUX0hBU0hDSEFOR0Vcblx0XHRcdEBGSVJTVF9IQVNIQ0hBTkdFID0gZmFsc2Vcblx0XHRcdHJldHVyblxuXHRcdFxuXHRcdEBvbkFyZWFDaGFuZ2Ugd2hlcmVcblxuXHRcdG51bGxcblxuXHRvbkFyZWFDaGFuZ2UgOiAoc2VjdGlvbikgPT5cblxuXHRcdGNvbG91ciA9IEBnZXRTZWN0aW9uQ29sb3VyIHNlY3Rpb25cblxuXHRcdEAkZWwuYXR0ciAnZGF0YS1zZWN0aW9uJywgc2VjdGlvblxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRsb2dvLCBjb2xvdXJcblxuXHRcdCMgdGhpcyBqdXN0IGZvciB0ZXN0aW5nLCB0aWR5IGxhdGVyXG5cdFx0aWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFU1xuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZV0sIGNvbG91clxuXHRcdGVsc2Vcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlLCBAJGluZm9CdG5dLCBjb2xvdXJcblxuXHRcdG51bGxcblxuXHRnZXRTZWN0aW9uQ29sb3VyIDogKHNlY3Rpb24pID0+XG5cblx0XHRzZWN0aW9uID0gc2VjdGlvbiBvciBAQ0QoKS5uYXYuY3VycmVudC5hcmVhIG9yICdob21lJ1xuXG5cdFx0Y29sb3VyID0gc3dpdGNoIHNlY3Rpb25cblx0XHRcdHdoZW4gJ2hvbWUnIHRoZW4gJ3JlZCdcblx0XHRcdHdoZW4gQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUIHRoZW4gJ3doaXRlJ1xuXHRcdFx0d2hlbiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURSB0aGVuICd3aGl0ZSdcblx0XHRcdGVsc2UgJ3doaXRlJ1xuXG5cdFx0Y29sb3VyXG5cblx0YW5pbWF0ZVRleHRJbiA6ID0+XG5cblx0XHRAb25BcmVhQ2hhbmdlIEBDRCgpLm5hdi5jdXJyZW50LmFyZWFcblxuXHRcdG51bGxcblxuXHRvbldvcmRFbnRlciA6IChlKSA9PlxuXG5cdFx0JGVsID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5zY3JhbWJsZSAkZWwsIEBnZXRTZWN0aW9uQ29sb3VyKClcblxuXHRcdG51bGxcblxuXHRvbldvcmRMZWF2ZSA6IChlKSA9PlxuXG5cdFx0JGVsID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci51bnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIoKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWRlclxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuSG9tZVZpZXcgICAgID0gcmVxdWlyZSAnLi4vaG9tZS9Ib21lVmlldydcbkNvbG9ycyAgICAgICA9IHJlcXVpcmUgJy4uLy4uL2NvbmZpZy9Db2xvcnMnXG5cbmNsYXNzIFBhZ2VUcmFuc2l0aW9uZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ3BhZ2UtdHJhbnNpdGlvbmVyJ1xuXG4gICAgcGFsZXR0ZXMgOlxuICAgICAgICBIT01FICAgICAgIDogWyBDb2xvcnMuQ0RfQkxVRSwgQ29sb3JzLk9GRl9XSElURSwgQ29sb3JzLkNEX1JFRCBdXG4gICAgICAgIEFCT1VUICAgICAgOiBbIENvbG9ycy5DRF9SRUQsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9CTFVFIF1cbiAgICAgICAgQ09OVFJJQlVURSA6IFsgQ29sb3JzLkNEX0JMVUUsIENvbG9ycy5PRkZfV0hJVEUsIENvbG9ycy5DRF9SRUQgXVxuICAgICAgICBET09ETEVTICAgIDogWyBDb2xvcnMuQ0RfUkVELCBDb2xvcnMuT0ZGX1dISVRFLCBDb2xvcnMuQ0RfQkxVRSBdXG5cbiAgICBhY3RpdmVDb25maWcgOlxuICAgICAgICBwcm9wIDogbnVsbFxuICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICB0b3AgOiBudWxsLCBib3R0b20gOiBudWxsLCBsZWZ0IDogbnVsbCwgcmlnaHQgOiBudWxsLCB3aWR0aCA6IG51bGwsIGhlaWdodCA6IG51bGxcbiAgICAgICAgZW5kIDpcbiAgICAgICAgICAgIHRvcCA6IG51bGwsIGJvdHRvbSA6IG51bGwsIGxlZnQgOiBudWxsLCByaWdodCA6IG51bGwsIHdpZHRoIDogbnVsbCwgaGVpZ2h0IDogbnVsbFxuXG4gICAgY29uZmlnUHJlc2V0cyA6XG4gICAgICAgIGJvdHRvbVRvVG9wIDpcbiAgICAgICAgICAgIHByb3AgOiAnaGVpZ2h0J1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHRvcCA6ICdhdXRvJywgYm90dG9tIDogMCwgbGVmdCA6IDAsIHJpZ2h0IDogMCwgd2lkdGggOiAnMTAwJScsIGhlaWdodCA6IDBcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdG9wIDogMCwgYm90dG9tIDogJ2F1dG8nLCBsZWZ0IDogMCwgcmlnaHQgOiAwLCB3aWR0aCA6ICcxMDAlJywgaGVpZ2h0IDogJzEwMCUnXG4gICAgICAgIHRvcFRvQm90dG9tIDpcbiAgICAgICAgICAgIHByb3AgOiAnaGVpZ2h0J1xuICAgICAgICAgICAgc3RhcnQgOlxuICAgICAgICAgICAgICAgIHRvcCA6IDAsIGJvdHRvbSA6ICdhdXRvJywgbGVmdCA6IDAsIHJpZ2h0IDogMCwgd2lkdGggOiAnMTAwJScsIGhlaWdodCA6IDBcbiAgICAgICAgICAgIGVuZCA6XG4gICAgICAgICAgICAgICAgdG9wIDogJ2F1dG8nLCBib3R0b20gOiAwLCBsZWZ0IDogMCwgcmlnaHQgOiAwLCB3aWR0aCA6ICcxMDAlJywgaGVpZ2h0IDogJzEwMCUnXG4gICAgICAgIGxlZnRUb1JpZ2h0IDpcbiAgICAgICAgICAgIHByb3AgOiAnd2lkdGgnXG4gICAgICAgICAgICBzdGFydCA6XG4gICAgICAgICAgICAgICAgdG9wIDogMCwgYm90dG9tIDogMCwgbGVmdCA6IDAsIHJpZ2h0IDogJ2F1dG8nLCB3aWR0aCA6IDAsIGhlaWdodCA6ICcxMDAlJ1xuICAgICAgICAgICAgZW5kIDpcbiAgICAgICAgICAgICAgICB0b3AgOiAwLCBib3R0b20gOiAwLCBsZWZ0IDogJ2F1dG8nLCByaWdodCA6IDAsIHdpZHRoIDogJzEwMCUnLCBoZWlnaHQgOiAnMTAwJSdcbiAgICAgICAgcmlnaHRUb0xlZnQgOlxuICAgICAgICAgICAgcHJvcCA6ICd3aWR0aCdcbiAgICAgICAgICAgIHN0YXJ0IDpcbiAgICAgICAgICAgICAgICB0b3AgOiAwLCBib3R0b20gOiAwLCBsZWZ0IDogJ2F1dG8nLCByaWdodCA6IDAsIHdpZHRoIDogMCwgaGVpZ2h0IDogJzEwMCUnXG4gICAgICAgICAgICBlbmQgOlxuICAgICAgICAgICAgICAgIHRvcCA6IDAsIGJvdHRvbSA6IDAsIGxlZnQgOiAwLCByaWdodCA6ICdhdXRvJywgd2lkdGggOiAnMTAwJScsIGhlaWdodCA6ICcxMDAlJ1xuXG4gICAgY29uc3RydWN0b3I6IC0+XG5cbiAgICAgICAgQHRlbXBsYXRlVmFycyA9IHt9XG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBpbml0IDogPT5cblxuICAgICAgICBAJHBhbmVzID0gQCRlbC5maW5kKCdbZGF0YS1wYW5lXScpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcHJlcGFyZSA6IChmcm9tQXJlYSwgdG9BcmVhKSA9PlxuXG4gICAgICAgIEByZXNldFBhbmVzKClcblxuICAgICAgICBAYXBwbHlQYWxldHRlIEBnZXRQYWxldHRlIHRvQXJlYVxuXG4gICAgICAgIEBhY3RpdmVDb25maWcgPSBAZ2V0Q29uZmlnKGZyb21BcmVhLCB0b0FyZWEpXG5cbiAgICAgICAgQGFwcGx5Q29uZmlnIEBhY3RpdmVDb25maWcuc3RhcnRcblxuICAgICAgICBudWxsXG5cbiAgICByZXNldFBhbmVzIDogPT5cblxuICAgICAgICBAJHBhbmVzLmF0dHIgJ3N0eWxlJzogJydcblxuICAgICAgICBudWxsXG5cbiAgICBnZXRQYWxldHRlIDogKGFyZWEpID0+XG5cbiAgICAgICAgc2VjdGlvbiA9IEBDRCgpLm5hdi5nZXRTZWN0aW9uIGFyZWEsIHRydWVcblxuICAgICAgICBAcGFsZXR0ZXNbc2VjdGlvbl0gb3IgQHBhbGV0dGVzLkhPTUVcblxuICAgIGFwcGx5UGFsZXR0ZSA6IChwYWxldHRlKSA9PlxuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSkgPT4gQCRwYW5lcy5lcShpKS5jc3MgJ2JhY2tncm91bmQtY29sb3InIDogcGFsZXR0ZVtpXVxuXG4gICAgICAgIG51bGxcblxuICAgIGdldENvbmZpZyA6IChmcm9tQXJlYSwgdG9BcmVhKSA9PlxuXG4gICAgICAgIGlmICFIb21lVmlldy52aXNpdGVkVGhpc1Nlc3Npb24gYW5kIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuICAgICAgICAgICAgY29uZmlnID0gQGNvbmZpZ1ByZXNldHMuYm90dG9tVG9Ub3BcblxuICAgICAgICBlbHNlIGlmIGZyb21BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTIGFuZCB0b0FyZWEgaXMgQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVNcbiAgICAgICAgICAgIGNvbmZpZyA9IEBfZ2V0RG9vZGxlVG9Eb29kbGVDb25maWcgXCIje0BDRCgpLm5hdi5wcmV2aW91cy5zdWJ9LyN7QENEKCkubmF2LnByZXZpb3VzLnRlcn1cIiwgXCIje0BDRCgpLm5hdi5jdXJyZW50LnN1Yn0vI3tAQ0QoKS5uYXYuY3VycmVudC50ZXJ9XCJcblxuICAgICAgICBlbHNlIGlmIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQgb3IgdG9BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5DT05UUklCVVRFXG4gICAgICAgICAgICAjIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLnRvcFRvQm90dG9tXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldFJhbmRvbUNvbmZpZygpXG5cbiAgICAgICAgIyBlbHNlIGlmIGZyb21BcmVhIGlzIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FIG9yIHRvQXJlYSBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICAjIGNvbmZpZyA9IEBjb25maWdQcmVzZXRzLmJvdHRvbVRvVG9wXG4gICAgICAgICAgICBjb25maWcgPSBAX2dldFJhbmRvbUNvbmZpZygpXG5cbiAgICAgICAgY29uZmlnXG5cbiAgICBfZ2V0RG9vZGxlVG9Eb29kbGVDb25maWcgOiAocHJldlNsdWcsIG5leHRTbHVnKSA9PlxuXG4gICAgICAgIHByZXZpb3VzRG9vZGxlID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmZpbmRXaGVyZSBzbHVnIDogcHJldlNsdWdcbiAgICAgICAgcHJldmlvdXNEb29kbGVJZHggPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuaW5kZXhPZiBwcmV2aW91c0Rvb2RsZVxuXG4gICAgICAgIGN1cnJlbnREb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZmluZFdoZXJlIHNsdWcgOiBuZXh0U2x1Z1xuICAgICAgICBjdXJyZW50RG9vZGxlSWR4ID0gQENEKCkuYXBwRGF0YS5kb29kbGVzLmluZGV4T2YgY3VycmVudERvb2RsZVxuXG4gICAgICAgIF9jb25maWcgPSBpZiBwcmV2aW91c0Rvb2RsZUlkeCA+IGN1cnJlbnREb29kbGVJZHggdGhlbiBAY29uZmlnUHJlc2V0cy5sZWZ0VG9SaWdodCBlbHNlIEBjb25maWdQcmVzZXRzLnJpZ2h0VG9MZWZ0XG5cbiAgICAgICAgX2NvbmZpZ1xuXG4gICAgX2dldFJhbmRvbUNvbmZpZyA6ID0+XG5cbiAgICAgICAgX2NvbmZpZyA9IF8uc2h1ZmZsZShAY29uZmlnUHJlc2V0cylbMF1cblxuICAgICAgICBfY29uZmlnXG5cbiAgICBhcHBseUNvbmZpZyA6IChjb25maWcpID0+XG5cbiAgICAgICAgQCRwYW5lcy5jc3MgY29uZmlnXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2hvdyA6ID0+XG5cbiAgICAgICAgQCRlbC5hZGRDbGFzcyAnc2hvdydcblxuICAgICAgICBudWxsXG5cbiAgICBoaWRlIDogPT5cblxuICAgICAgICBAJGVsLnJlbW92ZUNsYXNzICdzaG93J1xuXG4gICAgICAgIG51bGxcblxuICAgIGluIDogKGNiKSA9PlxuXG4gICAgICAgIEBzaG93KClcblxuICAgICAgICBAJHBhbmVzLmVhY2ggKGksIGVsKSA9PlxuICAgICAgICAgICAgcGFyYW1zID0gZWFzZSA6IEV4cG8uZWFzZU91dFxuICAgICAgICAgICAgcGFyYW1zLmRlbGF5ID0gaSAqIDAuMVxuICAgICAgICAgICAgcGFyYW1zW0BhY3RpdmVDb25maWcucHJvcF0gPSAnMTAwJSdcbiAgICAgICAgICAgIGlmIGkgaXMgMiB0aGVuIHBhcmFtcy5vbkNvbXBsZXRlID0gPT5cbiAgICAgICAgICAgICAgICBAYXBwbHlDb25maWcgQGFjdGl2ZUNvbmZpZy5lbmRcbiAgICAgICAgICAgICAgICBjYj8oKVxuXG4gICAgICAgICAgICBUd2VlbkxpdGUudG8gJChlbCksIDAuNSwgcGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgb3V0IDogKGNiKSA9PlxuXG4gICAgICAgIEAkcGFuZXMuZWFjaCAoaSwgZWwpID0+XG4gICAgICAgICAgICBwYXJhbXMgPSBlYXNlIDogRXhwby5lYXNlT3V0XG4gICAgICAgICAgICBwYXJhbXMuZGVsYXkgPSAwLjIgLSAoMC4xICogaSlcbiAgICAgICAgICAgIHBhcmFtc1tAYWN0aXZlQ29uZmlnLnByb3BdID0gJzAnXG4gICAgICAgICAgICBpZiBpIGlzIDAgdGhlbiBwYXJhbXMub25Db21wbGV0ZSA9ID0+XG4gICAgICAgICAgICAgICAgQGhpZGUoKVxuICAgICAgICAgICAgICAgIGNiPygpXG5cbiAgICAgICAgICAgIFR3ZWVuTGl0ZS50byAkKGVsKSwgMC41LCBwYXJhbXNcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUGFnZVRyYW5zaXRpb25lclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBQcmVsb2FkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblx0XG5cdGNiICAgICAgICAgICAgICA6IG51bGxcblx0XG5cdFRSQU5TSVRJT05fVElNRSA6IDAuNVxuXG5cdE1JTl9XUk9OR19DSEFSUyA6IDBcblx0TUFYX1dST05HX0NIQVJTIDogNFxuXG5cdE1JTl9DSEFSX0lOX0RFTEFZIDogMzBcblx0TUFYX0NIQVJfSU5fREVMQVkgOiAxMDBcblxuXHRNSU5fQ0hBUl9PVVRfREVMQVkgOiAzMFxuXHRNQVhfQ0hBUl9PVVRfREVMQVkgOiAxMDBcblxuXHRDSEFSUyA6ICdhYmNkZWZoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSE/KigpQMKjJCVeJl8tKz1bXXt9OjtcXCdcIlxcXFx8PD4sLi9+YCcuc3BsaXQoJycpXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHNldEVsZW1lbnQgJCgnI3ByZWxvYWRlcicpXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRjb2RlV29yZCA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmRdJylcblx0XHRAJGJnMSA9IEAkZWwuZmluZCgnW2RhdGEtYmc9XCIxXCJdJylcblx0XHRAJGJnMiA9IEAkZWwuZmluZCgnW2RhdGEtYmc9XCIyXCJdJylcblxuXHRcdG51bGxcblxuXHRwbGF5SW50cm9BbmltYXRpb24gOiAoQGNiKSA9PlxuXG5cdFx0Y29uc29sZS5sb2cgXCJzaG93IDogKEBjYikgPT5cIlxuXG5cdFx0IyBERUJVRyFcblx0XHQjIHJldHVybiBAY2IoKVxuXG5cdFx0QCRlbFxuXHRcdFx0LmZpbmQoJ1tkYXRhLWRvdHNdJylcblx0XHRcdFx0LnJlbW92ZSgpXG5cdFx0XHRcdC5lbmQoKVxuXHRcdFx0LmFkZENsYXNzKCdzaG93LXByZWxvYWRlcicpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5pbiBAJGNvZGVXb3JkLCAnd2hpdGUnLCBmYWxzZSwgQGhpZGVcblxuXHRcdG51bGxcblxuXHRvblNob3dDb21wbGV0ZSA6ID0+XG5cblx0XHRAY2I/KClcblxuXHRcdG51bGxcblxuXHRoaWRlIDogPT5cblxuXHRcdEBhbmltYXRlT3V0IEBvbkhpZGVDb21wbGV0ZVxuXG5cdFx0bnVsbFxuXG5cdG9uSGlkZUNvbXBsZXRlIDogPT5cblxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVPdXQgOiAoY2IpID0+XG5cblx0XHQjIEBhbmltYXRlQ2hhcnNPdXQoKVxuXG5cdFx0IyB0aGF0J2xsIGRvXG5cdFx0IyBzZXRUaW1lb3V0IGNiLCAyMjAwXG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRhbmFncmFtID0gXy5zaHVmZmxlKCdjb2RlZG9vZGwuZXMnLnNwbGl0KCcnKSkuam9pbignJylcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIGFuYWdyYW0sIEAkY29kZVdvcmQsICd3aGl0ZScsIGZhbHNlLCA9PiBAYW5pbWF0ZUJnT3V0IGNiXG5cdFx0LCAyMDAwXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUJnT3V0IDogKGNiKSA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcxLCAwLjUsIHsgZGVsYXkgOiAwLjIsIHdpZHRoIDogXCIxMDAlXCIsIGVhc2UgOiBFeHBvLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGJnMSwgMC42LCB7IGRlbGF5IDogMC43LCBoZWlnaHQgOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cblx0XHRUd2VlbkxpdGUudG8gQCRiZzIsIDAuNCwgeyBkZWxheSA6IDAuNCwgd2lkdGggOiBcIjEwMCVcIiwgZWFzZSA6IEV4cG8uZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkYmcyLCAwLjUsIHsgZGVsYXkgOiAwLjgsIGhlaWdodCA6IFwiMTAwJVwiLCBlYXNlIDogRXhwby5lYXNlT3V0LCBvbkNvbXBsZXRlIDogY2IgfVxuXG5cdFx0c2V0VGltZW91dCA9PlxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRjb2RlV29yZCwgJycsIGZhbHNlXG5cdFx0LCA0MDBcblxuXHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdEAkZWwucmVtb3ZlQ2xhc3MoJ3Nob3ctcHJlbG9hZGVyJylcblx0XHQsIDEyMDBcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVsb2FkZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkhvbWVWaWV3ICAgICAgICAgICA9IHJlcXVpcmUgJy4uL2hvbWUvSG9tZVZpZXcnXG5BYm91dFBhZ2VWaWV3ICAgICAgPSByZXF1aXJlICcuLi9hYm91dFBhZ2UvQWJvdXRQYWdlVmlldydcbkNvbnRyaWJ1dGVQYWdlVmlldyA9IHJlcXVpcmUgJy4uL2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldydcbkRvb2RsZVBhZ2VWaWV3ICAgICA9IHJlcXVpcmUgJy4uL2Rvb2RsZVBhZ2UvRG9vZGxlUGFnZVZpZXcnXG5OYXYgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvTmF2J1xuXG5jbGFzcyBXcmFwcGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0VklFV19UWVBFX1BBR0UgIDogJ3BhZ2UnXG5cblx0dGVtcGxhdGUgOiAnd3JhcHBlcidcblxuXHR2aWV3cyAgICAgICAgICA6IG51bGxcblx0cHJldmlvdXNWaWV3ICAgOiBudWxsXG5cdGN1cnJlbnRWaWV3ICAgIDogbnVsbFxuXG5cdHBhZ2VTd2l0Y2hEZmQgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHZpZXdzID1cblx0XHRcdGhvbWUgICAgICAgOiBjbGFzc1JlZiA6IEhvbWVWaWV3LCAgICAgICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRSwgICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGFib3V0ICAgICAgOiBjbGFzc1JlZiA6IEFib3V0UGFnZVZpZXcsICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQsICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGNvbnRyaWJ1dGUgOiBjbGFzc1JlZiA6IENvbnRyaWJ1dGVQYWdlVmlldywgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURSwgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGRvb2RsZSAgICAgOiBjbGFzc1JlZiA6IERvb2RsZVBhZ2VWaWV3LCAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFUywgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0VcblxuXHRcdEBjcmVhdGVDbGFzc2VzKClcblxuXHRcdHN1cGVyKClcblxuXHRcdCMgZGVjaWRlIGlmIHlvdSB3YW50IHRvIGFkZCBhbGwgY29yZSBET00gdXAgZnJvbnQsIG9yIGFkZCBvbmx5IHdoZW4gcmVxdWlyZWQsIHNlZSBjb21tZW50cyBpbiBBYnN0cmFjdFZpZXdQYWdlLmNvZmZlZVxuXHRcdCMgQGFkZENsYXNzZXMoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRjcmVhdGVDbGFzc2VzIDogPT5cblxuXHRcdChAdmlld3NbbmFtZV0udmlldyA9IG5ldyBAdmlld3NbbmFtZV0uY2xhc3NSZWYpIGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXG5cdFx0bnVsbFxuXG5cdGFkZENsYXNzZXMgOiA9PlxuXG5cdFx0IGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXHRcdCBcdGlmIGRhdGEudHlwZSBpcyBAVklFV19UWVBFX1BBR0UgdGhlbiBAYWRkQ2hpbGQgZGF0YS52aWV3XG5cblx0XHRudWxsXG5cblx0Z2V0Vmlld0J5Um91dGUgOiAocm91dGUpID0+XG5cblx0XHRmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHRcdHJldHVybiBAdmlld3NbbmFtZV0gaWYgcm91dGUgaXMgQHZpZXdzW25hbWVdLnJvdXRlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uICdzdGFydCcsIEBzdGFydFxuXG5cdFx0bnVsbFxuXG5cdHN0YXJ0IDogPT5cblxuXHRcdEBDRCgpLmFwcFZpZXcub2ZmICdzdGFydCcsIEBzdGFydFxuXG5cdFx0QGJpbmRFdmVudHMoKVxuXHRcdEB1cGRhdGVEaW1zKClcblxuXHRcdG51bGxcblxuXHRiaW5kRXZlbnRzIDogPT5cblxuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBjaGFuZ2VWaWV3XG5cdFx0QENEKCkubmF2Lm9uIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjaGFuZ2VTdWJWaWV3XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uIEBDRCgpLmFwcFZpZXcuRVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEB1cGRhdGVEaW1zXG5cblx0XHRudWxsXG5cblx0dXBkYXRlRGltcyA6ID0+XG5cblx0XHRAJGVsLmNzcyAnbWluLWhlaWdodCcsIEBDRCgpLmFwcFZpZXcuZGltcy5oXG5cblx0XHRudWxsXG5cblx0Y2hhbmdlVmlldyA6IChwcmV2aW91cywgY3VycmVudCkgPT5cblxuXHRcdGlmIEBwYWdlU3dpdGNoRGZkIGFuZCBAcGFnZVN3aXRjaERmZC5zdGF0ZSgpIGlzbnQgJ3Jlc29sdmVkJ1xuXHRcdFx0ZG8gKHByZXZpb3VzLCBjdXJyZW50KSA9PiBAcGFnZVN3aXRjaERmZC5kb25lID0+IEBjaGFuZ2VWaWV3IHByZXZpb3VzLCBjdXJyZW50XG5cdFx0XHRyZXR1cm5cblxuXHRcdEBwcmV2aW91c1ZpZXcgPSBAZ2V0Vmlld0J5Um91dGUgcHJldmlvdXMuYXJlYVxuXHRcdEBjdXJyZW50VmlldyAgPSBAZ2V0Vmlld0J5Um91dGUgY3VycmVudC5hcmVhXG5cblx0XHRpZiAhQHByZXZpb3VzVmlld1xuXHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3XG5cdFx0ZWxzZVxuXHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LCBAY3VycmVudFZpZXdcblxuXHRcdG51bGxcblxuXHRjaGFuZ2VTdWJWaWV3IDogKGN1cnJlbnQpID0+XG5cblx0XHRAY3VycmVudFZpZXcudmlldy50cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIGN1cnJlbnQuc3ViXG5cblx0XHRudWxsXG5cblx0dHJhbnNpdGlvblZpZXdzIDogKGZyb20sIHRvKSA9PlxuXG5cdFx0QHBhZ2VTd2l0Y2hEZmQgPSAkLkRlZmVycmVkKClcblxuXHRcdGlmIGZyb20gYW5kIHRvXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5wcmVwYXJlIGZyb20ucm91dGUsIHRvLnJvdXRlXG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnRyYW5zaXRpb25lci5pbiA9PiBmcm9tLnZpZXcuaGlkZSA9PiB0by52aWV3LnNob3cgPT4gQENEKCkuYXBwVmlldy50cmFuc2l0aW9uZXIub3V0ID0+IEBwYWdlU3dpdGNoRGZkLnJlc29sdmUoKVxuXHRcdGVsc2UgaWYgZnJvbVxuXHRcdFx0ZnJvbS52aWV3LmhpZGUgQHBhZ2VTd2l0Y2hEZmQucmVzb2x2ZVxuXHRcdGVsc2UgaWYgdG9cblx0XHRcdHRvLnZpZXcuc2hvdyBAcGFnZVN3aXRjaERmZC5yZXNvbHZlXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gV3JhcHBlclxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIENvbnRyaWJ1dGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWNvbnRyaWJ1dGUnXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJjb250cmlidXRlX2Rlc2NcIlxuXG5cdFx0IyMjXG5cblx0XHRpbnN0YW50aWF0ZSBjbGFzc2VzIGhlcmVcblxuXHRcdEBleGFtcGxlQ2xhc3MgPSBuZXcgZXhhbXBsZUNsYXNzXG5cblx0XHQjIyNcblxuXHRcdHN1cGVyKClcblxuXHRcdCMjI1xuXG5cdFx0YWRkIGNsYXNzZXMgdG8gYXBwIHN0cnVjdHVyZSBoZXJlXG5cblx0XHRAXG5cdFx0XHQuYWRkQ2hpbGQoQGV4YW1wbGVDbGFzcylcblxuXHRcdCMjI1xuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cmlidXRlUGFnZVZpZXdcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBEb29kbGVQYWdlVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHR0ZW1wbGF0ZSA6ICdwYWdlLWRvb2RsZSdcblx0bW9kZWwgICAgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJkb29kbGVfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBleGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdHNob3cgOiA9PlxuXG5cdFx0QG1vZGVsID0gQGdldERvb2RsZSgpXG5cblx0XHRzdXBlclxuXG5cdFx0bnVsbFxuXG5cdGdldERvb2RsZSA6ID0+XG5cblx0XHRkb29kbGUgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXMuZ2V0RG9vZGxlQnlTbHVnIEBDRCgpLm5hdi5jdXJyZW50LnN1YisnLycrQENEKCkubmF2LmN1cnJlbnQudGVyXG5cblx0XHRkb29kbGVcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBIb21lR3JpZEl0ZW0gZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHR0ZW1wbGF0ZSA6ICdob21lLWdyaWQtaXRlbSdcblxuXHRjb25zdHJ1Y3RvciA6IChAbW9kZWwsIEBmdWxsUGFnZVRyYW5zaXRpb24pIC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXy5leHRlbmQge30sIEBtb2RlbC50b0pTT04oKVxuXG5cdFx0c3VwZXJcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGF1dGhvck5hbWUgPSBAJGVsLmZpbmQoJ1tkYXRhLWNvZGV3b3JkPVwiYXV0aG9yX25hbWVcIl0nKVxuXHRcdEAkZG9vZGxlTmFtZSA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmQ9XCJuYW1lXCJdJylcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEAkZWxbc2V0dGluZ10gJ21vdXNlb3ZlcicsIEBvbk1vdXNlT3ZlclxuXG5cdFx0bnVsbFxuXG5cdHNob3cgOiA9PlxuXG5cdFx0QCRlbC5hZGRDbGFzcyAnc2hvdy1pdGVtJ1xuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIudG8gQG1vZGVsLmdldCgnYXV0aG9yLm5hbWUnKSwgQCRhdXRob3JOYW1lLCAnYmx1ZSdcblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCduYW1lJyksIEAkZG9vZGxlTmFtZSwgJ2JsdWUnXG5cblx0XHRAc2V0TGlzdGVuZXJzICdvbidcblxuXHRcdG51bGxcblxuXHRvbk1vdXNlT3ZlciA6ID0+XG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci50byBAbW9kZWwuZ2V0KCdhdXRob3IubmFtZScpLCBAJGF1dGhvck5hbWUsICdibHVlJ1xuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLnRvIEBtb2RlbC5nZXQoJ25hbWUnKSwgQCRkb29kbGVOYW1lLCAnYmx1ZSdcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBIb21lR3JpZEl0ZW1cbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuSG9tZUdyaWRJdGVtICAgICA9IHJlcXVpcmUgJy4vSG9tZUdyaWRJdGVtJ1xuXG5jbGFzcyBIb21lVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1BhZ2VcblxuXHQjIG1hbmFnZSBzdGF0ZSBmb3IgaG9tZVZpZXcgb24gcGVyLXNlc3Npb24gYmFzaXMsIGFsbG93IG51bWJlciBvZlxuXHQjIGdyaWQgaXRlbXMsIGFuZCBzY3JvbGwgcG9zaXRpb24gb2YgaG9tZSBncmlkIHRvIGJlIHBlcnNpc3RlZFxuXHRAdmlzaXRlZFRoaXNTZXNzaW9uIDogZmFsc2Vcblx0QGdyaWRJdGVtcyA6IFtdXG5cdEBkaW1zIDpcblx0XHRpdGVtICAgICAgOiBoOiAyNjgsIHc6IDIwMCwgbWFyZ2luOiAyMCwgYTogMFxuXHRcdGNvbnRhaW5lciA6IGg6IDAsIHc6IDAsIGE6IDBcblx0QGNvbENvdW50IDogMFxuXHRAc2Nyb2xsRGlzdGFuY2UgOiAwXG5cblx0QFNIT1dfUk9XX1RIUkVTSE9MRCA6IDAuMyAjIGhvdyBtdWNoIG9mIGEgZ3JpZCByb3cgKHNjYWxlIDAgLT4gMSkgbXVzdCBiZSB2aXNpYmxlIGJlZm9yZSBpdCBpcyBcInNob3duXCJcblxuXHR0ZW1wbGF0ZSAgICAgIDogJ3BhZ2UtaG9tZSdcblx0YWRkVG9TZWxlY3RvciA6ICdbZGF0YS1ob21lLWdyaWRdJ1xuXG5cdGFsbERvb2RsZXMgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHRlbXBsYXRlVmFycyA9IFxuXHRcdFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJob21lX2Rlc2NcIlxuXG5cdFx0QGFsbERvb2RsZXMgPSBAQ0QoKS5hcHBEYXRhLmRvb2RsZXNcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAJGdyaWQgPSBAJGVsLmZpbmQoJ1tkYXRhLWhvbWUtZ3JpZF0nKVxuXG5cdFx0bnVsbFxuXG5cdHNldHVwRGltcyA6ID0+XG5cblx0XHRncmlkV2lkdGggPSBAJGdyaWQub3V0ZXJXaWR0aCgpXG5cblx0XHRIb21lVmlldy5jb2xDb3VudCA9IE1hdGgucm91bmQgZ3JpZFdpZHRoIC8gSG9tZVZpZXcuZGltcy5pdGVtLndcblx0XHRcblx0XHRIb21lVmlldy5kaW1zLmNvbnRhaW5lciA9XG5cdFx0XHRoOiBAQ0QoKS5hcHBWaWV3LmRpbXMuaCwgdzogZ3JpZFdpZHRoLCBhOiAoQENEKCkuYXBwVmlldy5kaW1zLmggKiBncmlkV2lkdGgpXG5cblx0XHRIb21lVmlldy5kaW1zLml0ZW0uYSA9IEhvbWVWaWV3LmRpbXMuaXRlbS5oICogKEhvbWVWaWV3LmRpbXMuaXRlbS53ICsgKChIb21lVmlldy5kaW1zLml0ZW0ubWFyZ2luICogKEhvbWVWaWV3LmNvbENvdW50IC0gMSkpIC8gSG9tZVZpZXcuY29sQ291bnQpKVxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSBAQ0QoKS5hcHBWaWV3LkVWRU5UX1VQREFURV9ESU1FTlNJT05TLCBAb25SZXNpemVcblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddIEBDRCgpLmFwcFZpZXcuRVZFTlRfT05fU0NST0xMLCBAb25TY3JvbGxcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6ID0+XG5cblx0XHRAc2V0dXBEaW1zKClcblx0XHRAb25TY3JvbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG9uU2Nyb2xsIDogPT5cblxuXHRcdEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlID0gQENEKCkuYXBwVmlldy5sYXN0U2Nyb2xsWVxuXG5cdFx0aXRlbXNUb1Nob3cgPSBAZ2V0UmVxdWlyZWREb29kbGVDb3VudEJ5QXJlYSgpXG5cdFx0aWYgaXRlbXNUb1Nob3cgPiAwIHRoZW4gQGFkZERvb2RsZXMgaXRlbXNUb1Nob3dcblxuXHRcdG51bGxcblxuXHRzaG93IDogPT5cblxuXHRcdHN1cGVyXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdEBzZXR1cERpbXMoKVxuXG5cdFx0aWYgIUhvbWVWaWV3LnZpc2l0ZWRUaGlzU2Vzc2lvblxuXHRcdFx0QGFkZERvb2RsZXMgQGdldFJlcXVpcmVkRG9vZGxlQ291bnRCeUFyZWEoKSwgdHJ1ZVxuXHRcdFx0SG9tZVZpZXcudmlzaXRlZFRoaXNTZXNzaW9uID0gdHJ1ZVxuXHRcdGVsc2Vcblx0XHRcdEBDRCgpLmFwcFZpZXcuJHdpbmRvdy5zY3JvbGxUb3AgSG9tZVZpZXcuc2Nyb2xsRGlzdGFuY2VcblxuXHRcdG51bGxcblxuXHRnZXRSZXF1aXJlZERvb2RsZUNvdW50QnlBcmVhIDogPT5cblxuXHRcdHRvdGFsQXJlYSAgPSBIb21lVmlldy5kaW1zLmNvbnRhaW5lci5hICsgKEhvbWVWaWV3LnNjcm9sbERpc3RhbmNlICogSG9tZVZpZXcuZGltcy5jb250YWluZXIudylcblx0XHR0YXJnZXRSb3dzID0gKHRvdGFsQXJlYSAvIEhvbWVWaWV3LmRpbXMuaXRlbS5hKSAvIEhvbWVWaWV3LmNvbENvdW50XG5cblx0XHR0YXJnZXRJdGVtcyA9IE1hdGguZmxvb3IodGFyZ2V0Um93cykgKiBIb21lVmlldy5jb2xDb3VudFxuXHRcdHRhcmdldEl0ZW1zID0gaWYgKHRhcmdldFJvd3MgJSAxKSA+IEhvbWVWaWV3LlNIT1dfUk9XX1RIUkVTSE9MRCB0aGVuIHRhcmdldEl0ZW1zICsgSG9tZVZpZXcuY29sQ291bnQgZWxzZSB0YXJnZXRJdGVtc1xuXG5cdFx0cmV0dXJuIHRhcmdldEl0ZW1zIC0gSG9tZVZpZXcuZ3JpZEl0ZW1zLmxlbmd0aFxuXG5cdGFkZERvb2RsZXMgOiAoY291bnQsIGZ1bGxQYWdlVHJhbnNpdGlvbj1mYWxzZSkgPT5cblxuXHRcdGNvbnNvbGUubG9nIFwiYWRkaW5nIGRvb2RsZXMuLi4geCN7Y291bnR9XCJcblxuXHRcdG5ld0l0ZW1zID0gW11cblxuXHRcdGZvciBpZHggaW4gW0hvbWVWaWV3LmdyaWRJdGVtcy5sZW5ndGguLi5Ib21lVmlldy5ncmlkSXRlbXMubGVuZ3RoK2NvdW50XVxuXG5cdFx0XHRkb29kbGUgPSBAYWxsRG9vZGxlcy5hdCBpZHhcblx0XHRcdGJyZWFrIGlmICFkb29kbGVcblxuXHRcdFx0bmV3SXRlbXMucHVzaCBuZXcgSG9tZUdyaWRJdGVtIGRvb2RsZSwgZnVsbFBhZ2VUcmFuc2l0aW9uXG5cblx0XHRIb21lVmlldy5ncmlkSXRlbXMgPSBIb21lVmlldy5ncmlkSXRlbXMuY29uY2F0IG5ld0l0ZW1zXG5cblx0XHRmb3IgaXRlbSwgaWR4IGluIG5ld0l0ZW1zXG5cblx0XHRcdEBhZGRDaGlsZCBpdGVtXG5cdFx0XHRAYW5pbWF0ZUl0ZW1JbiBpdGVtLCBpZHgsIGZ1bGxQYWdlVHJhbnNpdGlvblxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJdGVtSW4gOiAoaXRlbSwgaW5kZXgsIGZ1bGxQYWdlVHJhbnNpdGlvbj1mYWxzZSkgPT5cblxuXHRcdGR1cmF0aW9uICAgPSAwLjVcblx0XHRmcm9tUGFyYW1zID0geSA6IChpZiBmdWxsUGFnZVRyYW5zaXRpb24gdGhlbiB3aW5kb3cuaW5uZXJIZWlnaHQgZWxzZSAwKSwgb3BhY2l0eSA6IDAsIHNjYWxlIDogMC42XG5cdFx0dG9QYXJhbXMgICA9IGRlbGF5IDogKGR1cmF0aW9uICogMC4yKSAqIGluZGV4LCB5IDogMCwgb3BhY2l0eSA6IDEsIHNjYWxlIDogMSAsIGVhc2UgOiBFeHBvLmVhc2VPdXQsIG9uQ29tcGxldGUgOiBpdGVtLnNob3dcblxuXHRcdFR3ZWVuTGl0ZS5mcm9tVG8gaXRlbS4kZWwsIGR1cmF0aW9uLCBmcm9tUGFyYW1zLCB0b1BhcmFtc1xuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWVWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEFic3RyYWN0TW9kYWwgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHQkd2luZG93IDogbnVsbFxuXG5cdCMjIyBvdmVycmlkZSBpbiBpbmRpdmlkdWFsIGNsYXNzZXMgIyMjXG5cdG5hbWUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZSA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAJHdpbmRvdyA9ICQod2luZG93KVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0QENEKCkuYXBwVmlldy5hZGRDaGlsZCBAXG5cdFx0QHNldExpc3RlbmVycyAnb24nXG5cdFx0QGFuaW1hdGVJbigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGhpZGUgOiA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgPT4gQENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXG5cdFx0bnVsbFxuXG5cdGRpc3Bvc2UgOiA9PlxuXG5cdFx0QHNldExpc3RlbmVycyAnb2ZmJ1xuXHRcdEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLm1vZGFsc1tAbmFtZV0udmlldyA9IG51bGxcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdEAkd2luZG93W3NldHRpbmddICdrZXl1cCcsIEBvbktleVVwXG5cdFx0QCQoJ1tkYXRhLWNsb3NlXScpW3NldHRpbmddICdjbGljaycsIEBjbG9zZUNsaWNrXG5cblx0XHRudWxsXG5cblx0b25LZXlVcCA6IChlKSA9PlxuXG5cdFx0aWYgZS5rZXlDb2RlIGlzIDI3IHRoZW4gQGhpZGUoKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVJbiA6ID0+XG5cblx0XHRUd2VlbkxpdGUudG8gQCRlbCwgMC4zLCB7ICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLCAnb3BhY2l0eSc6IDEsIGVhc2UgOiBRdWFkLmVhc2VPdXQgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAndHJhbnNmb3JtJzogJ3NjYWxlKDEpJywgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IEJhY2suZWFzZU91dCB9XG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZU91dCA6IChjYWxsYmFjaykgPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgZGVsYXkgOiAwLjE1LCAnb3BhY2l0eSc6IDAsIGVhc2UgOiBRdWFkLmVhc2VPdXQsIG9uQ29tcGxldGU6IGNhbGxiYWNrIH1cblx0XHRUd2VlbkxpdGUudG8gQCRlbC5maW5kKCcuaW5uZXInKSwgMC4zLCB7ICd0cmFuc2Zvcm0nOiAnc2NhbGUoMC44KScsICdvcGFjaXR5JzogMCwgZWFzZSA6IEJhY2suZWFzZUluIH1cblxuXHRcdG51bGxcblxuXHRjbG9zZUNsaWNrOiAoIGUgKSA9PlxuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRAaGlkZSgpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RNb2RhbFxuIiwiQWJzdHJhY3RNb2RhbCA9IHJlcXVpcmUgJy4vQWJzdHJhY3RNb2RhbCdcblxuY2xhc3MgT3JpZW50YXRpb25Nb2RhbCBleHRlbmRzIEFic3RyYWN0TW9kYWxcblxuXHRuYW1lICAgICA6ICdvcmllbnRhdGlvbk1vZGFsJ1xuXHR0ZW1wbGF0ZSA6ICdvcmllbnRhdGlvbi1tb2RhbCdcblxuXHRjYiAgICAgICA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IChAY2IpIC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0ge0BuYW1lfVxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRoaWRlIDogKHN0aWxsTGFuZHNjYXBlPXRydWUpID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PlxuXHRcdFx0QENEKCkuYXBwVmlldy5yZW1vdmUgQFxuXHRcdFx0aWYgIXN0aWxsTGFuZHNjYXBlIHRoZW4gQGNiPygpXG5cblx0XHRudWxsXG5cblx0c2V0TGlzdGVuZXJzIDogKHNldHRpbmcpID0+XG5cblx0XHRzdXBlclxuXG5cdFx0QENEKCkuYXBwVmlld1tzZXR0aW5nXSAndXBkYXRlRGltcycsIEBvblVwZGF0ZURpbXNcblx0XHRAJGVsW3NldHRpbmddICd0b3VjaGVuZCBjbGljaycsIEBoaWRlXG5cblx0XHRudWxsXG5cblx0b25VcGRhdGVEaW1zIDogKGRpbXMpID0+XG5cblx0XHRpZiBkaW1zLm8gaXMgJ3BvcnRyYWl0JyB0aGVuIEBoaWRlIGZhbHNlXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gT3JpZW50YXRpb25Nb2RhbFxuIiwiQWJzdHJhY3RWaWV3ICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlldydcbk9yaWVudGF0aW9uTW9kYWwgPSByZXF1aXJlICcuL09yaWVudGF0aW9uTW9kYWwnXG5cbmNsYXNzIE1vZGFsTWFuYWdlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCMgd2hlbiBuZXcgbW9kYWwgY2xhc3NlcyBhcmUgY3JlYXRlZCwgYWRkIGhlcmUsIHdpdGggcmVmZXJlbmNlIHRvIGNsYXNzIG5hbWVcblx0bW9kYWxzIDpcblx0XHRvcmllbnRhdGlvbk1vZGFsIDogY2xhc3NSZWYgOiBPcmllbnRhdGlvbk1vZGFsLCB2aWV3IDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0aXNPcGVuIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gcmV0dXJuIHRydWUgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0ZmFsc2VcblxuXHRoaWRlT3Blbk1vZGFsIDogPT5cblxuXHRcdCggaWYgQG1vZGFsc1tuYW1lXS52aWV3IHRoZW4gb3Blbk1vZGFsID0gQG1vZGFsc1tuYW1lXS52aWV3ICkgZm9yIG5hbWUsIG1vZGFsIG9mIEBtb2RhbHNcblxuXHRcdG9wZW5Nb2RhbD8uaGlkZSgpXG5cblx0XHRudWxsXG5cblx0c2hvd01vZGFsIDogKG5hbWUsIGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gaWYgQG1vZGFsc1tuYW1lXS52aWV3XG5cblx0XHRAbW9kYWxzW25hbWVdLnZpZXcgPSBuZXcgQG1vZGFsc1tuYW1lXS5jbGFzc1JlZiBjYlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGFsTWFuYWdlclxuIl19
