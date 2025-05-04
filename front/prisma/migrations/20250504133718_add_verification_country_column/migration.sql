/*
  Warnings:

  - You are about to drop the column `idCardPicture` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `selfiePicture` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `idCardPicture` on the `verification` table. All the data in the column will be lost.
  - You are about to drop the column `selfiePicture` on the `verification` table. All the data in the column will be lost.
  - Added the required column `selfiePictureUrl` to the `verification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verificationCountry` to the `verification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `idCardPicture`,
    DROP COLUMN `selfiePicture`,
    ADD COLUMN `verification_country` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `verification` DROP COLUMN `idCardPicture`,
    DROP COLUMN `selfiePicture`,
    ADD COLUMN `idCardBackUrl` VARCHAR(191) NULL,
    ADD COLUMN `idCardFrontUrl` VARCHAR(191) NULL,
    ADD COLUMN `selfiePictureUrl` VARCHAR(191) NOT NULL,
    ADD COLUMN `verificationCountry` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `verification_userId_idx` ON `verification`(`userId`);
