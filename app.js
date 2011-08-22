var $ = require('jquery')
  , url = require('url')
  , http = require('http')
  , _ = require('underscore')
  , async = require('async')
  , express = require('express')
  , app = express.createServer()
  , io = require('socket.io').listen(app);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
 res.render('index.jade', { title: 'Flickr Recent' });
});

io.sockets.on('connection', function (socket) {
  var count = 0;
  var emitRecentPhotos = function() {
    getRecentPhotos(function(urls, error) {
      socket.emit('new photos', urls);
      if (++count < 2) {
        setTimeout(emitRecentPhotos, 5000);
      }
    })
  }
  emitRecentPhotos();
});

app.listen(3000);

function getRecentPhotos(callback) {
  http.get({host:'www.flickr.com', path:'/photos'}, function(res) {
    res.setEncoding('utf8');
    var html = ""
    res.on('data', function(chunk) {
      html += chunk;
    });
    res.on('end', function() {
      var matches = html.match( /StreamList[\s\S.]*?a href=\"([^\"]*)\"/g )
      var pageUrls = _.map(matches, function(m) {
        return {host:'www.flickr.com', path:m.match(/href="([^"]*)"/)[1]};
      });
      async.mapSeries(pageUrls, getImageUrl, function(err, imageUrls) {
        callback(imageUrls);
      });
    });      
  });
}

function getImageUrl(urlOptions, next) {
  http.get(urlOptions, function(res) {
    html = ""
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      html += chunk;
    });
    res.on('end', function() {
      next(null, html.match( /photo-div[\s\S.]*?img src=\"([^\"]*)\"/ )[1]);
    });
  });
}
