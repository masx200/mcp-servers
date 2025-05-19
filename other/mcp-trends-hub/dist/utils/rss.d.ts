export declare const getRss: (url: string) => Promise<any>;
export declare const getRssItems: (url: string) => Promise<{
    title: any;
    description: any;
    category: string;
    author: any;
    publish_time: any;
    link: any;
}[]>;
