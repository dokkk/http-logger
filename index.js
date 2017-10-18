const express = require('express');
var app = express();

const bodyParser = require('body-parser');
const url = require('url');

const config = require('./config/http-logger-config.json');

//logger used inside the app
const log4jsInternal = require( "log4js" );
//configuring the internal logger
log4jsInternal.configure('./config/log4js.json');
var logger = log4jsInternal.getLogger('error');
var debug = log4jsInternal.getLogger('debug');

//logger used by the app
const log4jsApi = require( "log4js" );
//configuring the app logger
log4jsApi.configure(config.log4js);

app.use(function(req, res, next)
{
  res.setHeader('charset', 'utf-8');
  res.setHeader('Content-Type', 'application/json');
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//adding the root end point
app.get(config.api.url, function(req, res)
{
  var resourceLinks = getResourceLink(req);

  //building the list containing all the links to the resource (end points)
  for(var key in config.api.end_points)
  {
    var link = {"rel": key, "href": getRequestUrl(req, config.api.end_points[key])};
    resourceLinks._links.push(link);
  }

  //returning the resource links into the response
  res.status(200).json(resourceLinks);
});

//adding all the end points as configured in the config file
for(var end_point in config.api.end_points)
{
  createEndPoints(config.api.end_points[end_point]);
}

//starting the server
var server = app.listen(config.api.port, function() {
    console.log('http-logger is listening on port ' + config.api.port);
});

// *** functions section ***

/**
 * Takes an end point name and add a GET/POST end point
 *
 * @param {end_point} string - The end_point name to add
 */
function createEndPoints(end_point)
{
  //add a GET end point list if stated in the config file
  if(end_point.verbs.indexOf("GET") > -1)
  {
    app.get(config.api.url + end_point.url, function(req, res)
    {
      //build the resources links and then return them in the response
      //end_point.source is used to match the sources in config.resource (i.e.: "errors")
      buildResourcesLinks(req, config.resource.sources[end_point.source])
      .then(function(resourceLinks)
      {
        res.status(200).json(resourceLinks);
      })
      .catch(function(err)
      {
        logger.error(err);
        sendStatus500(res, {error: "An error occurred"});
      });
    });

    //add a GET single end point if stated in the config file
    if(end_point.single)
    {
      app.get(config.api.url + end_point.url + "/:" + end_point.single, function(req, res)
      {
        //end_point.source is used to match the sources in config.resource (i.e.: "errors")
        var filePath = config.resource.base + config.resource.sources[end_point.source] + "\\" + req.params[end_point.single];
        res.set('Content-Type', 'text/plain');
        res.sendFile(filePath, function (err)
        {
          if(err)
          {
            logger.error(err);
            sendStatus500(res, {error: "An error occurred"});
          }
        });
      });
    }
  }

  //add a POST end point if stated in the config file
  if(end_point.verbs.indexOf("POST") > -1)
  {
    app.post(config.api.url + end_point.url, function(req, res)
    {
      var category = end_point.log_category;
      var categoryLogger = log4jsApi.getLogger(category);
      if(categoryLogger[category] != undefined && typeof categoryLogger[category] == 'function')
      {
        categoryLogger[category](req.body.content);
      }
      else
      {
        //TO DO
      }

      //build the resources links and then return them in the response
      //end_point.source is used to match the sources in config.resource (i.e.: "errors")
      buildResourcesLinks(req, config.resource.sources[end_point.source])
      .then(function(resourceLinks)
      {
        res.status(204).json(resourceLinks);
      })
      .catch(function(err)
      {
        logger.error(err);
        sendStatus500(res, {error: "An error occurred"});
      });
    })
  }
}

/**
 * Takes the request and a source and return a list of resource links when the promise is completed
 *
 * @param {req} Request - The request
 * @param {source} string - The source
 */
function buildResourcesLinks(req, source)
{
  return new Promise(function(resolve, reject)
  {
    var resourceLinks = getResourceLink(req);

    getResourcesList(config.resource.base + source)
    .then(function(list)
    {
      for(var resource of list)
      {
        var link = {"rel": resource, "href": getRequestUrl(req, resource)};
        resourceLinks._links.push(link);
      }

      resolve(resourceLinks);
    })
    .catch(function(err)
    {
      reject(err);
    });
  });
}

/**
 * Takes the request and return a basic JSON containing the link to self
 *
 * @param {req} Request - The request
 */
function getResourceLink(req)
{
  return {"_links": [{"rel": "self", "href": getRequestUrl(req)}]};
}

/**
 * Takes the request and a optional relativeUrl and return a full url (protocol + host + path)
 *
 * @param {req} Request - The request
 * @param {relativeUrl} string - The relative url
 */
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

/**
 * Takes a source (path) and return a list of files inside it
 *
 * @param {source} string - The relative url
 */
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

/**
 * Takes the request and a content, and send a status code 500 + a content in JSON format within the response
 *
 * @param {req} Request - The request
 * @param {content} string - The relative url
 */
function sendStatus500(res, content)
{
  res.status(500).json(content);
}
