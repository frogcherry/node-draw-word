/**
 * 控制错误页面的输出
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.09.17
 */

ErrorServer = exports;

ErrorServer.NOT_FOUND = "404: Not Found\n";

ErrorServer.notFound = function(req, res) {
  res.writeHead(200, { "Content-Type": "text/plain" //maybe, should write 404
                     , "Content-Length": ErrorServer.NOT_FOUND.length
                     });
  res.write(ErrorServer.NOT_FOUND);
  res.end();
};

