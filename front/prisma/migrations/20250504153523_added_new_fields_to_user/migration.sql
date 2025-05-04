/*
  Warnings:

  - You are about to drop the column `verification_country` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `idCardBackUrl` on the `verification` table. All the data in the column will be lost.
  - You are about to drop the column `idCardFrontUrl` on the `verification` table. All the data in the column will be lost.
  - You are about to drop the column `selfiePictureUrl` on the `verification` table. All the data in the column will be lost.
  - You are about to drop the column `verificationCountry` on the `verification` table. All the data in the column will be lost.
  - Added the required column `idCardPicture` to the `verification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selfiePicture` to the `verification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `verification_country`;

-- AlterTable
ALTER TABLE `verification` DROP COLUMN `idCardBackUrl`,
    DROP COLUMN `idCardFrontUrl`,
    DROP COLUMN `selfiePictureUrl`,
    DROP COLUMN `verificationCountry`,
    ADD COLUMN `idCardPicture` VARCHAR(191) NOT NULL,
    ADD COLUMN `selfiePicture` VARCHAR(191) NOT NULL,
    ADD COLUMN `verificationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
