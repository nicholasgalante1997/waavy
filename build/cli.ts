import { base } from './build.config';
import log from './build.logger';

const info = log.extend('cli:info');

info('building `cli` executable, format: esm :hammer: :hammer: :hammer:');

await Bun.build(base);

info('built `cli` executable, format: esm :rocket: :rocket: :rocket:');