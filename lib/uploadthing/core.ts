import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  cvUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "8MB", maxFileCount: 1 },
    "application/msword": { maxFileSize: "8MB", maxFileCount: 1 }
  })
    .middleware(async () => {
      return {};
    })
    // .onUploadComplete(async ({ file }) => {
    //   console.log("Upload complete for url:", file.url);
    //   return { url: file.url };
    // }),

    .onUploadComplete(async ({ file }) => {
      console.log("Upload complete:", file.ufsUrl);

      return {
        ufsUrl: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

export const utapi = new UTApi();