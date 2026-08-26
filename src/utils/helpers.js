const {isIPv6, isIP, isIPv4} = require('node:net');

const redirectMetaTemplate = (location) => {
  const encodedLoc = location.replace(/"/g, "%22");
  return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
};

const redirectJsTemplate = (location) => {
  return `<!DOCTYPE html><html><head><script>window.location.href='${location}'</script></head></html>`;
}

const isValidIpv4 = (ip) => isIPv4(ip);
const isValidIpv6 = (ip) =>  isIPv6(ip);
const isValidIp = (ip) => isIP(ip) !== 0;

const getFullIpv6 = (ip) => {
  if (!isIPv6(ip)){
    return ip;
  }
  let fullIp = ip.toLowerCase();

  if (fullIp.includes('::')) {
    const parts = fullIp.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];

    const missingCount = 8 - (left.length + right.length);
    const zeroGroups = new Array(missingCount).fill('0000');

    fullIp = [...left, ...zeroGroups, ...right].join(':');
  }

  return fullIp
    .split(':')
    .map(group => group.padStart(4, '0'))
    .join(':');
};

const convertIpv6toIpv4 = (ip) => {
  if (isIPv4(ip)) {
    return ip;
  }

  try {
    let fullIp = ip.toLowerCase();

    if (fullIp.includes('::')) {
      const parts = fullIp.split('::');
      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];

      const missingCount = 8 - (left.length + right.length);
      const zeroGroups = new Array(missingCount).fill('0');

      fullIp = [...left, ...zeroGroups, ...right].join(':');
    }

    const groups = fullIp.split(':');

    if (groups[5] === 'ffff') {
      const part1 = parseInt(groups[6], 16);
      const byte1 = (part1 >> 8) & 0xff;
      const byte2 = part1 & 0xff;

      const part2 = parseInt(groups[7], 16);
      const byte3 = (part2 >> 8) & 0xff;
      const byte4 = part2 & 0xff;

      return `${byte1}.${byte2}.${byte3}.${byte4}`;
    }
  } catch (error) {}

  return ip;
};


module.exports = {
  redirectMetaTemplate,
  redirectJsTemplate,
  convertIpv6toIpv4,
  getFullIpv6,
  isValidIp,
  isValidIpv4,
  isValidIpv6
}