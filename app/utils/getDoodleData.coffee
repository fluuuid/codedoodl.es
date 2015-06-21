_       = require "underscore"
fs      = require "fs"
path    = require "path"
colors  = require "colors"
request = require "request"
config  = require "../../config/server"

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

    getDoodlesMethod = if config.PRODUCTION then _getDoodlesRemote else _getDoodlesLocal

    cache.timestamp = Date.now()

    console.log(colors.yellow(">> Updating doodle cache at %s"), cache.timestamp)

    # make async
    setTimeout ->
        getDoodlesMethod (doodles) ->
            cache.doodles      = doodles
            cache.contributors = _getContributors()
    , 0

    null

_getMasterManifestRemote = (cb) ->

    manifestUrl = config.DOODLES_BUCKET_URL + '/master_manifest.json'

    request manifestUrl, (err, res, body) ->

        if !err and res.statusCode is 200
            manifest = JSON.parse body
            cb manifest
        else
            console.error 'Error getting remote master manifest from SOURCE'
            _getMasterManifestLocal cb

    null

_getMasterManifestLocal = (cb) ->

    doodlesPath  = path.resolve(__dirname, '../../doodles')
    manifestPath = doodlesPath + '/master_manifest.json'
    manifest     = JSON.parse(fs.readFileSync(manifestPath, { encoding : 'utf8' }))
    cb manifest

    null

_getDoodlesRemote = (cb) ->

    allDoodles       = []
    returnedManCount = 0
    returnDoodles    = null

    _getMasterManifestRemote (manifest) ->

        for doodle in manifest.doodles

            do (doodle) ->
                manifestUrl = config.DOODLES_BUCKET_URL + '/' + doodle.slug + '/manifest.json'

                request manifestUrl, (err, res, body) ->

                    console.log(colors.yellow("request for #{manifestUrl} is #{res.statusCode}"))

                    returnedManCount++

                    if !err and res.statusCode is 200
                        doodleManifest   = JSON.parse body
                        mergedDoodleData = _.extend {}, doodle, doodleManifest
                        allDoodles.push mergedDoodleData
                    else
                        console.log(colors.red('No manifest_gzip.json found for doodle at  %s'), manifestUrl)

                    if returnedManCount is manifest.doodles.length
                        returnDoodles = _.sortBy(allDoodles, 'index').reverse()
                        cb returnDoodles


_getDoodlesLocal = (cb) ->

    allDoodles    = []
    returnDoodles = null

    _getMasterManifestLocal (manifest) ->

        for doodle in manifest.doodles

            doodlePath   = path.resolve(__dirname, '../../doodles', doodle.slug)
            manifestPath = doodlePath + '/manifest.json'

            console.log(colors.yellow("requesting #{manifestPath}"))

            if !fs.existsSync(manifestPath)
                console.log(colors.red('No manifest.json found for doodle :  %s'), doodlePath)
            else
                doodleManifest   = JSON.parse(fs.readFileSync(manifestPath, {encoding: 'utf8'}))
                mergedDoodleData = _.extend {}, doodle, doodleManifest
                allDoodles.push mergedDoodleData

        returnDoodles = _.sortBy(allDoodles, 'index').reverse()

        cb returnDoodles

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
