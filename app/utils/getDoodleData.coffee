_      = require "underscore"
fs     = require "fs"
path   = require "path"
colors = require "colors"
config = require "../../config/server"

cache =
  doodles      : null
  contributors : null
  timestamp    : null

cacheRequiresUpdating = ->

    requiresUpdating = false

    if (Date.now() - cache.timestamp) > config.DOODLE_CACHE_TIMEOUT
        requiresUpdating = true

    return requiresUpdating

updateCache = (cb) ->

    cache.timestamp = Date.now()

    # make async
    setTimeout ->
        cache.doodles      = _getDoodles()
        cache.contributors = _getContributors()
    , 0

    null
 
_getDoodles = ->

    doodles     = []
    doodlesPath = path.resolve(__dirname, '../../doodles')

    fs.readdirSync(doodlesPath).forEach( (authorPath, i) ->

        authorPath = doodlesPath + '/' + authorPath

        if fs.lstatSync(authorPath).isDirectory()

            fs.readdirSync(authorPath).forEach( (doodlePath, i) ->

                doodlePath   = authorPath + '/' + doodlePath;
                manifestPath = doodlePath+'/manifest.json';

                if fs.lstatSync(doodlePath).isDirectory()

                    if fs.existsSync(manifestPath)
                        doodles.push(JSON.parse(fs.readFileSync(manifestPath, {encoding: 'utf8'})))
                    else
                        console.log(colors.red('No manifest.json found for doodle :  %s'), doodlePath)

            )

    )

    # return doodles;

    # ACTUALLY JUST KIDDING, SERVE THE DUMMY SHIT PLZ!!!
    return require('../../project/data/_DUMMY/doodles.json').doodles

_getContributors = ->

    authorsUniq = []

    authors = _.pluck(cache.doodles, 'author')
    authors = _.groupBy(authors, (author) -> return author.github )

    _.each(authors, (author) -> authorsUniq.push(author[0]) )

    return authorsUniq

getDoodles = ->

    if cacheRequiresUpdating()
        updateCache()

    return cache.doodles

getContributors = ->

    if cacheRequiresUpdating()
        updateCache()

    return cache.contributors

###
Get fresh set of data whenever process starts
###
updateCache()

module.exports =
    getDoodles      : getDoodles
    getContributors : getContributors
