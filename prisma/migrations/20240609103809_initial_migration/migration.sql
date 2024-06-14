-- CreateEnum
CREATE TYPE "LinkPrecedence" AS ENUM ('primary', 'secondary');

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "linkedId" INTEGER,
    "linkPrecedence" "LinkPrecedence" NOT NULL DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_linked_id_index" ON "Contact"("linkedId");

-- CreateIndex
CREATE INDEX "contact_phone_number_index" ON "Contact"("phoneNumber");

-- CreateIndex
CREATE INDEX "contact_email_index" ON "Contact"("email");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_linkedId_fkey" FOREIGN KEY ("linkedId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
