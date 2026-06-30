declare module 'swagger-jsdoc' {
  function swaggerJsdoc(options: swaggerJsdoc.Options): any;

  namespace swaggerJsdoc {
    interface Options {
      definition?: Record<string, unknown>;
      apis?: string[];
      [key: string]: unknown;
    }
  }

  export = swaggerJsdoc;
}
