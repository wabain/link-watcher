describe('getPathInfo()', function () {
  function pathInfoFrom(root, relative, event) {
    var anchor = document.createElement('a');
    anchor.href = relative;

    // Since we basically just check booleans for the event, an empty object is a good default
    return LinkWatcher.getPathInfo(anchor, event || {}, LinkWatcher.urlResolve(root));
  }

  describe('relative path detection', function () {
    it('should differentiate by scheme', function () {
      expect(pathInfoFrom('http://example.org', 'https://example.org/foo').isRelative).toBe(false);
    });

    it('should differentiate by host', function () {
      expect(pathInfoFrom('http://example.org', 'http://google.com/foo').isRelative).toBe(false);
    });

    it('should differentiate by port', function () {
      expect(pathInfoFrom('http://example.org', 'http://example.org:8080/foo').isRelative).toBe(false);
    });

    // ...
    it('should differentiate by path', function () {
      expect(pathInfoFrom('http://example.org/bar', 'http://example.org/foo/bar').isRelative).toBe(false);
      expect(pathInfoFrom('http://example.org/fo', 'http://example.org/foo').isRelative).toBe(false);
    });

    // Test the normalization concerns from RFC 3986 and RFC 7230

    // RFC 3986, sec. 6.2.2.1, Case normalization
    it('should use case-normalized protocols', function () {
      expect(pathInfoFrom('HTTP://example.org', 'http://example.org/foo').isRelative).toBe(true);
    });

    it('should use case-normalized hosts', function () {
      expect(pathInfoFrom('http://EXAMPLE.ORG', 'http://example.org/foo').isRelative).toBe(true);
    });

    it('should use case-normalized percent encoding', function () {
      expect(pathInfoFrom('http://example.org/%3A', 'http://example.org/%3a/foo').isRelative).toBe(true);
    });

    // RFC 3986, sec. 6.2.2.2, Percent encoding
    it('should decode unreserved percent-encoded characters', function () {
      expect(pathInfoFrom('http://example.org/%41', 'http://example.org/A/foo').isRelative).toBe(true);
    });

    // RFC 3986, sec. 6.2.2.3, Path segment normalization
    it('should have normalized path segments', function () {
      expect(pathInfoFrom('http://example.org/./%41/bar/..', 'http://example.org/A/foo').isRelative).toBe(true);
    });

    // RFC 3986, sec. 6.2.3, Scheme normalization
    // RFC 7230, sec. 2.7.3, http and https URI Normalization and Comparison
    it('should normalize an empty port to the scheme default', function () {
      expect(pathInfoFrom('http://example.org:/', 'http://example.org/foo').isRelative).toBe(true);
      expect(pathInfoFrom('https://example.org:/', 'https://example.org/foo').isRelative).toBe(true);
    });

    it('should treat the default port and no port as equivalent', function () {
      expect(pathInfoFrom('http://example.org:80/', 'http://example.org/foo').isRelative).toBe(true);
      expect(pathInfoFrom('https://example.org:443/', 'https://example.org/foo').isRelative).toBe(true);
    });

    it('should treat no path as an empty path', function () {
      expect(pathInfoFrom('http://example.org/', 'http://example.org').isRelative).toBe(true);
    });
  });

  describe('relativized path generation', function () {
    function expectRelative(root, full, rel) {
      expect(pathInfoFrom(root, full).relativePath).toBe(rel);

      var rebuilt = root + (root[root.length-1] === '/' ? '' : '/') + rel;

      expect(pathInfoFrom(root, rebuilt).relativePath).toBe(rel, 'idempotency');
    }

    it('should generate paths relative to the root URL', function () {
      expectRelative('http://example.org/foo/', 'http://example.org/foo/bar', 'bar');
    });

    it('should strip a leading slash', function () {
      expectRelative('http://example.org/foo', 'http://example.org/foo/bar', 'bar');
    });

    it('should do something with query strings and fragments', function () {
      // FIXME
    });

    it('should use a `.` segment when the relative path starts with an empty component', function () {
      expectRelative('http://example.org/foo/', 'http://example.org/foo//bar', './/bar');
      expectRelative('http://example.org/foo', 'http://example.org/foo//bar', './/bar');

      // FIXME
      expectRelative('http://example.org/foo//', 'http://example.org/foo///bar', './/bar');
    });
  });

  describe('local link detection', function () {
    it('should treat clicks with the control and meta keys as non-local', function () {
      var info;

      info = pathInfoFrom('http://example.org/', 'http://example.org/foo', {ctrlKey: true});
      expect(info).toEqual(jasmine.objectContaining({isRelative: true, isLocalLink: false}), 'ctrl');

      info = pathInfoFrom('http://example.org/', 'http://example.org/foo', {metaKey: true});
      expect(info).toEqual(jasmine.objectContaining({isRelative: true, isLocalLink: false}), 'meta');
    });

    it('should treat clicks with the center mouse button as non-local', function () {
      var info = pathInfoFrom('http://example.org/', 'http://example.org/foo', {which: 2});
      expect(info).toEqual(jasmine.objectContaining({isRelative: true, isLocalLink: false}));
    });

    it('should treat clicks on anchors with targets as non-local', function () {
      var anchor = document.createElement('a');
      anchor.setAttribute('target', '_self');
      anchor.href = 'http://example.org/foo';

      var info = LinkWatcher.getPathInfo(anchor, {}, LinkWatcher.urlResolve('http://example.org/'));

      expect(info).toEqual(jasmine.objectContaining({isRelative: true, isLocalLink: false}));
    });
  });
});
