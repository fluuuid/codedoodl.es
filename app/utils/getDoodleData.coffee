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

    cache.timestamp = Date.now()

    # make async
    setTimeout ->
        _getDoodles (doodles) ->
            cache.doodles      = doodles
            cache.contributors = _getContributors()
    , 0

    null

_getMasterManifestRemote = (cb) ->

    manifestUrl = config.DOODLES_BUCKET_URL + '/master_manifest.json'

    request manifestUrl, (err, res, body) ->

        if !err && res.statusCode == 200
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
 
_getDoodles = (cb) ->

    allDoodles    = []
    localDoodles  = []
    returnDoodles = null

    doodlesPath = path.resolve(__dirname, '../../doodles')

    fs.readdirSync(doodlesPath).forEach (authorPath, i) ->

        authorPath = doodlesPath + '/' + authorPath

        if fs.lstatSync(authorPath).isDirectory()

            fs.readdirSync(authorPath).forEach (doodlePath, i) ->

                doodlePath   = authorPath + '/' + doodlePath;
                manifestPath = doodlePath+'/manifest.json';

                if fs.lstatSync(doodlePath).isDirectory()

                    if fs.existsSync(manifestPath)
                        localDoodles.push(JSON.parse(fs.readFileSync(manifestPath, {encoding: 'utf8'})))
                    else
                        console.log(colors.red('No manifest.json found for doodle :  %s'), doodlePath)

    getManifestMethod = if config.PRODUCTION then _getMasterManifestRemote else _getMasterManifestLocal
    getManifestMethod (manifest) ->

        for doodle in manifest.doodles

            localDoodle = _.findWhere localDoodles, slug : doodle.slug
            if localDoodle
                mergedDoodleData = _.extend {}, doodle, localDoodle
                allDoodles.push mergedDoodleData

        returnDoodles = allDoodles.reverse()

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
