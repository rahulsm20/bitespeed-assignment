import { LinkPrecedence } from "../../types";
import { getCachedContact, setCachedContact } from "./redis";

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
  const uniqueEmails = [...new Set(emails)];
  const uniquePhoneNumbers = [...new Set(phoneNumbers)];
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

export const handleCachedContact = async (cacheKey: any, contact: any) => {
  const mappedContact = JSON.parse(contact);
  await setCachedContact(cacheKey, JSON.stringify(mappedContact));
  return mappedContact;
};
