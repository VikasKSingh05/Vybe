const https = require('https');

function check(id) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
    const req = https.get(url, (res) => {
      if (res.statusCode === 200) {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ valid: true, id, title: data.title, author: data.author_name });
          } catch {
            resolve({ valid: false, id });
          }
        });
      } else {
        resolve({ valid: false, id });
      }
    });
    req.on('error', () => resolve({ valid: false, id }));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve({ valid: false, id });
    });
  });
}

// Unique IDs for testing
const testIds = [
  'lJvRohYSrZM', 'ao4RCon11eY', 'Umqb9KENgmk', 'BddP6PYo2gs', 'bzSTpdcs-EI',
  'ElZfdU54Cp8', 'dTu5dTEzVM4', 'sElE_BfQ67s', 'dvgZkm1xWPE', '8UVNT4wvIGY',
  'b8-tXG8KrWs', 'HCjNJDNzw8Y', 'kffacxfA7G4', 'OPf0YbXqDm0', '09R8_2nJtjg',
  'fJ9rUzIMcZQ', 'hT_nvWreIhg', 'YQHsXMglC9A', 'CevxZvSJLk8', 'LjhCEhWiKXk',
  'L_jWHffIx5E', 'jfKfPfyJRdk', 'DWcJFNfaw9c', '8GW6sLrK40k', '5qap5aO4i9A',
  '7NOSDKb0HlU', 'kJQP7kiw5Fk', 'LsoLEjrDogU', 'fHI8X4OXluQ', 'RgKAFK5djSk',
  'K4DyBUG242c', 'hTWKbfoikeg', 'JGwWNGJdvx8', 'I_izvAbhExY', 'aJOTlE1K90k'
];

async function main() {
  console.log("Verifying candidate YouTube IDs...");
  const valid = [];
  for (const id of testIds) {
    const res = await check(id);
    if (res.valid) valid.push(res);
  }
  console.log(`Verified ${valid.length} valid unique IDs.`);
}

main();
