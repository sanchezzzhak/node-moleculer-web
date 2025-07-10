const regexExecAll = (str, regex) => {
	let lastMatch = null;
	const matches = [];

	while ((lastMatch = regex.exec(str))) {
		matches.push(lastMatch);
		if (!regex.global) break;
	}

	return matches;
};

const redirectMetaTemplate = (location) => {
	const encodedLoc = location.replace(/"/g, "%22");
	return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
};

const redirectJsTemplate = (location) => {
	return `<!DOCTYPE html><html><head><script>window.location.href='${location}'</script></head></html>`;
}

const isValidIpv4 =  (ip) => {
	let ipv4_pattern = /^(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)$/;
	if (!ipv4_pattern.test(ip)) {
		return false;
	}
	let token = ip.split('.');
	return token[0] <= 255 && token[1] <= 255 && token[2] <= 255 && token[3] <= 255;
};

const isValidIpv6 =  (ip) => {
	let ipv6_pattern = /^::|^::1|^([a-fA-F0-9]{1,4}::?){1,7}([a-fA-F0-9]{1,4})$/;
	return ipv6_pattern.test(ip);
};

const isValidIp = (ip) => {
	if (!ip) {
		return false
	}
	return isValidIpv4(ip) || isValidIpv6(ip);
};

const getFullIpv6 = (ip) => {
	if (isValidIpv6(ip)) {
		if (ip.indexOf('::') !== -1) {
			let ipv6Parts = ip.split(':');
			let ipv6PartsFiltered = ipv6Parts.filter((currentValue) => currentValue !== '');
			let zeroPartsCount = 8 - ipv6PartsFiltered.length;
			let zeroParts = ':0000'.repeat(zeroPartsCount);

			if (ip.indexOf('::') !== ip.length) {
				zeroParts += ':';
			}

			ip = ip.split('::').join(zeroParts);
		}

		let ipv6Parts = ip.split(':');
		let fullIpv6Parts = [];

		ipv6Parts.forEach(function (item, i, arr) {
			if (item.length === 4) {
				fullIpv6Parts.push(item);
				return;
			}

			if (item.length > 0) {
				let fullItem = item;
				for (let i = fullItem.length; i < 4; i++) {
					fullItem = '0' + fullItem;
				}

				fullIpv6Parts.push(fullItem);
			}
		});

		return fullIpv6Parts.join(':');
	}

	return ip;
};

const convertIpv6toIpv4 = (ip, force = false) => {
	if (isValidIpv4(ip)) {
		return ip;
	}
	if (force === true || /0000:0000:0000:0000:0000:/.test(ip)) {
		const ip6parsed = parseIpv6(ip);
		return `${ip6parsed[6] >> 8}.${ip6parsed[6] & 0xff}.${ip6parsed[7] >> 8}.${ip6parsed[7] & 0xff}`;
	}

	return ip;
};

const parseIpv6 = (ip6str) => {
	let i;
	const str = ip6str.toString();
	const ar = [];
	for (i = 0; i < 8; i++) ar[i] = 0;
	if (str === '::') return ar;
	const sar = str.split(':');
	let slen = sar.length;
	if (slen > 8) slen = 8;
	let j = 0;
	i = 0;
	for (i = 0; i < slen; i++) {
		if (i && sar[i] === '') {
			j = 9 - slen + i;
			continue;
		}
		ar[j] = parseInt(`0x0${sar[i]}`);
		j++;
	}
	return ar;
};


module.exports = {
	regexExecAll, redirectMetaTemplate,
	redirectJsTemplate,
	convertIpv6toIpv4, getFullIpv6, isValidIp, isValidIpv4, isValidIpv6
}