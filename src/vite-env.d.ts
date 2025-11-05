/// <reference types="vite/client" />

// CSS モジュールの型定義
declare module "*.css" {
    const content: { [className: string]: string };
    export default content;
}
