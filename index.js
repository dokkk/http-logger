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
      var resourceLinks = buildResourcesLinks(req, res, config.resource.sources[config.api.end_points[end_point].source]);
      res.status(200).json(resourceLinks);
    });

    if(config.api.end_points[end_point].single)
    {
      app.get(config.api.url + config.api.end_points[end_point].url + "/:" + config.api.end_points[end_point].single, function(req, res)
      {
        //config.api.end_points[end_point].single value is the name of the single end_point in config.resource.sources
        sendResource(req, res, config.resource.sources[config.api.end_points[end_point].source] + "\\" + req.params[config.api.end_points[end_point].single], 200);
      });
    }
  }

  if(config.api.end_points[end_point].verbs.indexOf("POST") > -1)
  {
    app.post(config.api.url + config.api.end_points[end_point].url, function(req, res)
    {
      var category = config.api.end_points[end_point].log_category;
      var categoryLogger = log4jsApi.getLogger(category);
      if(categoryLogger[category] != undefined && typeof categoryLogger[category] == 'function')
      {
        categoryLogger[category](req.body.content);
      }
      else
      {
        //TO DO
      }

      var resourceLinks = buildResourcesLinks(req, res, config.resource.sources[config.api.end_points[end_point].source]);
      res.status(204).json(resourceLinks);
    })
  }
}

function buildResourcesLinks(req, res, source)
{
  var resourceLinks = getResourceLink(req);

  getResourcesList(config.resource.base + source)
  .then(function(list)
  {
    var resourceLinks = getResourceLink(req);

    for(count = 0; count < list.length; count++)
    {
      var link = {"rel": list[count], "href": getRequestUrl(req, list[count])};
      resourceLinks._links.push(link);
    };
  })
  .catch(function(err)
  {
    logger.error(err);
    res.status(500).json({error: "An error occurred"});
  });
}

function sendResource(req, res, source, status)
{
  try
  {
    res.set('Content-Type', 'text/plain');
    res.sendFile(config.resource.base + source, function (err)
    {
      if(err)
        throw new Error(err);
    });
  }
  catch(err)
  {
    logger.error(err);
    res.status(500).json({error: "An error occurred"});
  };
}

function getRequestUrl(req, relativeUrl = null)
{
  var fullUrl = url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.originalUrl
  });

  if(relativeUrl != null)
    fullUrl = url.resolve(fullUrl + "\\", relativeUrl)

  return fullUrl;
}

function getResourceLink(req)
{
  return {"_links": [{"rel": "self", "href": getRequestUrl(req)}]};
}

function getResourcesList(source)
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
          if(err)
            throw new Error(err);

          resolve(items);
        });
      }
      else
      {
        //TO DO manage !stats.isDirectory()
        reject(err);
      }
    });
  })
}

var server = app.listen(config.api.port, function() {
    console.log('http-logger is listening on port ' + config.api.port);
});
