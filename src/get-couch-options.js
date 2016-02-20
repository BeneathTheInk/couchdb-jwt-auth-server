import { parse } from 'url';

export default function getCouchDbOptions(uri = 'http://localhost:5984') {
  const parsed = parse(uri);
  const [ username, password ] = parsed.auth.split(':');

  return {
    auth: {
      password,
      username
    },
    baseUrl: `${parsed.protocol}//${parsed.host}`
  };
}
