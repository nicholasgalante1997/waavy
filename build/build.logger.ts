import { emojify } from 'node-emoji'
import debug from 'debug';
const base = debug('supra:packages:react:build');
export default new Proxy(
    base, 
    {
        apply: (target, thisArg, args) => {
            args = args.map((arg) => {
                if (typeof arg === 'string') {
                    return emojify(arg);
                }
                return arg;
            });

            return (target as any)(...(args || []));
        }
    }
);