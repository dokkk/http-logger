<h1 align="center">http-logger</h1>

<p align="center">
  http-logger is a Node.js app for logging over HTTP.
  It uses Express.js for serving HTTP requests and Log4js for actual logging.
  <br/>It can be used in a microservice architecture.
</p>

## Installation

Just clone or download from Github

## Configuration

The configuration file is http-logger-config.json, in the "config" folder. It has 3 main blocks:

- "log4js"; specifies all the configurations needed for log4js, as it was in a separate log4js config file
- "resource"; it must specify:
  - "type": currently only "file"
  - "base": the base filepath where log files will be located (es: "C:\\http-logger\\logs_api")
  - "sources": the relative filepaths list, (es: {"errors": "\\errors", "debugs": "\\debugs"})
- "api"; it must specify:
  - "port": the port on which the server will listen (es. "8080")
  - "url": the root end point (es: "/api")
  - "end_points": one or more entry points (es "errors"); each entry point must specify:
    - "url": the end point relative URL "/errors"
    - "verbs": the HTTP verbs available (es: ["GET", "POST"])
    - "log_category": the log4js category name, as listed in categories (es: "error"),
    - "source": the source name as listed in resource (es: "errors")

## Usage
```sh
1) Start Node => Node index.js
2) From your third apps, send your log requests to http-logger, using the end points previously configured; es.
{
  "uri": "http://your-url:8080/api/errors",
  "method": "POST",
  "json": {
    "content": your_error_content
  }
}
```

### Dependencies

- "express": "^4.15.5"
- "body-parser": "^1.18.2"
- "log4js": "^2.3.4"

### Author

[Domenico Caruso](https://www.linkedin.com/in/domenico-caruso/)

### Contributing

Pull requests and stars are welcome. For bugs and feature requests, [please create an issue](../../issues/new).

### License

Copyright © 2017 [Domenico Caruso](https://www.linkedin.com/in/domenico-caruso/). This project is licensed under the MIT License


**Enjoy!**
