const {expect} = require('chai');

const {
  getFullIpv6, convertIpv6toIpv4, redirectMetaTemplate, redirectJsTemplate
} = require('../../src/utils/helpers');

describe('IP Utilities & Redirect Templates', () => {

  describe('getFullIpv6()', () => {
    it('should return the original string if it s not ipv6', () => {
      expect(getFullIpv6('127.0.0.1')).to.equal('127.0.0.1');
      expect(getFullIpv6('not-ip')).to.equal('not-ip');
    });

    it('must fully expand shortened IPv6 (localhost)', () => {
      expect(getFullIpv6('::1')).to.equal('0000:0000:0000:0000:0000:0000:0000:0001');
    });

    it('must expand an address ending with a double colon', () => {
      expect(getFullIpv6('2001:db8::')).to.equal('2001:0db8:0000:0000:0000:0000:0000:0000');
    });

    it('should convert groups to lowercase and pad them with zeros up to 4 characters', () => {
      expect(getFullIpv6('2001:DB8:1::A')).to.equal('2001:0db8:0001:0000:0000:0000:0000:000a');
    });

    it('must leave the full address unchanged (lowercase only)', () => {
      const full = '0000:0000:0000:0000:0000:ffff:7f00:0001';
      expect(getFullIpv6(full)).to.equal(full);
    });
  });

  describe('convertIpv6toIpv4()', () => {
    it('should return IPv4 unchanged', () => {
      expect(convertIpv6toIpv4('10.0.0.1')).to.equal('10.0.0.1');
    });

    it('should successfully convert full IPv4-mapped IPv6', () => {
      const input = '0000:0000:0000:0000:0000:ffff:7f00:0001';
      expect(convertIpv6toIpv4(input)).to.equal('127.0.0.1');
    });

    it('should successfully convert compressed IPv4-mapped IPv6', () => {
      expect(convertIpv6toIpv4('::ffff:7f00:0001')).to.equal('127.0.0.1');
      expect(convertIpv6toIpv4('::ffff:7f00:1')).to.equal('127.0.0.1');
    });

    it('should correctly retrieve global public IPs (e.g. 8.8.8.8)', () => {
      expect(convertIpv6toIpv4('::ffff:0808:0808')).to.equal('8.8.8.8');
    });

    it('should return the original address if it is pure IPv6 (not mapped)', () => {
      const nativeIp6 = '2001:db8::1';
      expect(convertIpv6toIpv4(nativeIp6)).to.equal(nativeIp6);
    });

    it('should safely return the original string when receiving garbage', () => {
      expect(convertIpv6toIpv4('some-random-string')).to.equal('some-random-string');
    });
  });

  describe('Redirect Templates', () => {
    it('redirectMetaTemplate should escape quotes and return valid HTML', () => {
      const result = redirectMetaTemplate('http://example.com"test"');
      expect(result).to.include('url=http://example.com%22test%22');
      expect(result).to.include('http-equiv="refresh"');
    });

    it('redirectJsTemplate should substitute the location in window.location.href', () => {
      const result = redirectJsTemplate('http://example.com');
      expect(result).to.include("window.location.href='http://example.com'");
    });
  });

});
