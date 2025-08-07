import { Contact } from "@prisma/client";
import dayjs from "dayjs";
import { prisma } from "../../prisma/client";
import { LinkPrecedence } from "../../types";

export const mapToResponse = (contact: any) => {
  const { secondaryContacts = [], primaryContact, linkPrecedence } = contact;
  let emails = secondaryContacts.map(({ email }: { email: string }) => email);
  emails.push(contact.email);
  if (primaryContact?.email) {
    emails.push(contact.primaryContact.email);
  }

  let phoneNumbers = secondaryContacts.map(
    ({ phoneNumber }: { phoneNumber: string }) => phoneNumber
  );
  phoneNumbers.push(contact.phoneNumber);

  if (primaryContact?.phoneNumber) {
    phoneNumbers.push(primaryContact.phoneNumber);
  }

  let secondaryContactIds = secondaryContacts.map(
    ({ id }: { id: number }) => id
  );
  if (primaryContact) {
    let { secondaryContacts: primarySecondaryContacts = [] } = primaryContact;
    secondaryContactIds.push(
      ...primarySecondaryContacts.map(({ id }: { id: number }) => id)
    );
    phoneNumbers.push(
      ...primarySecondaryContacts.map(
        ({ phoneNumber }: { phoneNumber: string }) => phoneNumber
      )
    );
    emails.push(
      ...primarySecondaryContacts.map(({ email }: { email: string }) => email)
    );
  }
  let uniqueEmails = [...new Set(emails)];
  uniqueEmails = uniqueEmails.sort((a: unknown, b: unknown) =>
    String(a).localeCompare(String(b))
  );
  let uniquePhoneNumbers = [...new Set(phoneNumbers)];
  uniquePhoneNumbers = uniquePhoneNumbers.sort((a: unknown, b: unknown) =>
    String(a).localeCompare(String(b))
  );
  secondaryContactIds.sort((a: number, b: number) => a - b);
  secondaryContactIds = [...new Set(secondaryContactIds)];
  return {
    primaryContactId:
      linkPrecedence == LinkPrecedence.primary ? contact.id : contact.linkedId,
    emails: uniqueEmails,
    phoneNumbers: uniquePhoneNumbers,
    secondaryContactIds,
  };
};

export const contactInclude = {
  primaryContact: {
    include: {
      secondaryContacts: true,
    },
  },
  secondaryContacts: true,
};

export async function findPrimaryContact(relatedContacts: Contact[]) {
  let earliestDate = dayjs();
  let primaryContact;
  for (const c of relatedContacts) {
    const { primaryContactId } = mapToResponse(c);
    const contact = await prisma.contact.findFirst({
      where: { id: primaryContactId },
    });
    if (contact) {
      const isBefore = dayjs(contact.createdAt).isBefore(earliestDate);
      console.log(
        isBefore,
        dayjs(contact.createdAt).toISOString(),
        earliestDate.toISOString()
      );
      earliestDate = isBefore ? dayjs(contact.createdAt) : earliestDate;
      primaryContact = isBefore ? contact : primaryContact;
    }
  }
  console.log("primary:", primaryContact);
  return primaryContact;
}
