export type SSGActionOptions = {
    pages: string[];
    outdir: string;
    
};
export type SSGAction = (options: SSGActionOptions) => Promise<void>;
