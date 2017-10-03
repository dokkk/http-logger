const express = require('express');
var app = express();

const bodyParser = require('body-parser');
const url = require('url');

const config = require('./config/http-logger-config.json');

//loggers used inside the app
const log4jsInternal = require( "log4js" );
log4jsInternal.configure('./config/log4js.json');
var logger = log4jsInternal.getLogger('error');
var debug = log4jsInternal.getLogger('debug');

//logger used by the app
const log4jsApi = require( "log4js" );
log4jsApi.configure(config.log4js);

app.use(function(req, res, next)
{
  res.setHeader('charset', 'utf-8');
  res.setHeader('Content-Type', 'application/json');
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get(config.api.url, function(req, res)
{
  var resourceLinks = getResourceLink(req);

  for(var key in config.api.end_points)
  {
    var link = {"rel": key, "href": getRequestUrl(req, config.api.end_points[key])};
    resourceLinks._links.push(link);
  }

  res.status(200).json(resourceLinks);
})

for(var key in config.api.end_points)
{
  createEndPoints(key);
}

function createEndPoints(end_point)
{
  if(config.api.end_points[end_point].verbs.indexOf("GET") > -1)
  {
    app.get(config.api.url + config.api.end_points[end_point].url, function(req, res)
    {
      //config.api.end_points[end_point].source value is the end_point in config.resource.sources
      buildAndSendResources(req, res, config.resource.sources[config.api.end_points[end_point].source], 200);
    })
  }

  if(config.api.end_points[end_point].verbs.indexOf("POST") > -1)
  {
    app.post(config.api.url + config.api.end_points[end_point].url, function(req, res)
    {
      var category = config.api.end_points[end_point].log_category;
      if(log4jsApi.getLogger(category)[category] != undefined && typeof log4jsApi.getLogger(category)[category] == 'function')
        log4jsApi.getLogger(category)[category](req.body.content);
      buildAndSendResources(req, res, config.resource.sources[config.api.end_points[end_point].source], 204);
    })
  }
}

function buildAndSendResources(req, res, source, status)
{
  var resourceLinks = getResourceLink(req);

  getResources(config.resource.base + "\\" + source)
  .then(function(list)
  {
    var resourceLinks = getResourceLink(req);

    for(count = 0; count < list.length; count++)
    {
      var link = {"rel": list[count], "href": getRequestUrl(req, list[count])};
      resourceLinks._links.push(link);
    };
    res.status(status).json(resourceLinks);
  })
  .catch(function(err)
  {
    logger.error(err);
    res.status(500).json({error: "An error occurred"});
  });
}

function getRequestUrl(req, relativeUrl = null)
{
  var fullUrl = url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.originalUrl
  });

  if(relativeUrl != null)
    fullUrl = url.resolve(fullUrl + "/", relativeUrl)

  return fullUrl;
}

function getResourceLink(req)
{
  return {"_links": [{"rel": "self", "href": getRequestUrl(req)}]};
}

function getResources(source)
{
  //TO DO generalize source (es: filesystem, db, etc)?
  var fs = require('fs');
  return new Promise(function(resolve, reject)
  {
    stats = fs.lstat(source, function(err, stats)
    {
      if (!err && stats.isDirectory())
      {
        fs.readdir(source, function(err, items)
        {
          var files = [];
          if(err)
            throw new Error(err);

          resolve(items);
        });
      }
      else
      {
        reject(err);
      }
    });
  })
}

var server = app.listen(8081, function() {
    console.log('Express is listening to http://localhost:8081');
});
