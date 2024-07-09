import { Contact } from "@prisma/client";
import dayjs from "dayjs";
import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { LinkPrecedence } from "../../types";
import { contactInclude, findPrimaryContact, mapToResponse } from "../utils";

export const identityReconciler = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const { phoneNumber, email } = data;
    if (!phoneNumber && !email) {
      return res.status(400).json("Invalid request");
    }
    const existingContact = await prisma.contact.findFirst({
      where: { phoneNumber, email },
      include: contactInclude,
    });

    if (existingContact) {
      const response = mapToResponse(existingContact);
      return res.status(200).json({ contact: response });
    }

    let relatedContacts = await prisma.contact.findMany({
      where: { OR: [{ phoneNumber }, { email }] },
      orderBy: {
        createdAt: "asc",
      },
      include: contactInclude,
    });
    let primaryContact: Contact | undefined;
    if (relatedContacts && relatedContacts.length) {
      primaryContact = await findPrimaryContact(relatedContacts);
      let phoneNumbers: (string | null)[] = relatedContacts.map(
        ({ phoneNumber }) => phoneNumber
      );

      let emails: (string | null)[] = relatedContacts.map(({ email }) => email);
      if (!phoneNumbers.includes(phoneNumber) || !emails.includes(email)) {
        const newConnectedContact = await prisma.contact.create({
          data: {
            phoneNumber,
            email,
            linkedId: primaryContact?.id,
            linkPrecedence: LinkPrecedence.secondary,
          },
          include: contactInclude,
        });
        const response = mapToResponse(newConnectedContact);
        return res.status(200).json({ contact: response });
      }
      let paramToSearchFor =
        primaryContact?.phoneNumber != phoneNumber
          ? { type: "phoneNumber", value: phoneNumber }
          : { type: "email", value: email };
      const contactToBeUpdated = await prisma.contact.findFirst({
        where: {
          NOT: { id: primaryContact?.id },
          [paramToSearchFor.type]: paramToSearchFor.value,
        },
      });
      let updateData = {
        linkedId: primaryContact?.id,
        linkPrecedence: LinkPrecedence.secondary,
      };

      if (contactToBeUpdated?.linkPrecedence == LinkPrecedence.secondary) {
        const associatedPrimaryContact = await prisma.contact.findUnique({
          where: { id: contactToBeUpdated.linkedId || undefined },
        });
        if (
          associatedPrimaryContact &&
          associatedPrimaryContact?.createdAt !== undefined &&
          primaryContact?.createdAt !== undefined
        ) {
          if (
            dayjs(associatedPrimaryContact.createdAt).isAfter(
              dayjs(primaryContact.createdAt)
            )
          ) {
            updateData.linkedId = primaryContact.id;
            await prisma.contact.update({
              where: { id: associatedPrimaryContact.id },
              data: updateData,
              include: contactInclude,
            });
          }
        }
      }
      await prisma.contact.update({
        where: { id: contactToBeUpdated?.id },
        data: updateData,
        include: contactInclude,
      });
      relatedContacts = [...relatedContacts];
      const updatedRelatedContacts = await prisma.contact.findMany({
        where: { OR: [{ phoneNumber }, { email }] },
        orderBy: {
          createdAt: "asc",
        },
        include: contactInclude,
      });
      relatedContacts.push(...updatedRelatedContacts);
      relatedContacts.forEach(async (c) => {
        if (c.id !== primaryContact?.id) {
          await prisma.contact.update({
            where: { id: c.id },
            data: {
              linkedId: primaryContact?.id,
              linkPrecedence: LinkPrecedence.secondary,
            },
          });
        }
        let { primaryContact: newPrimaryContact, secondaryContacts = [] } = c;
        secondaryContacts.map(async (sc) => {
          if (
            c.id !== primaryContact?.id &&
            dayjs(sc.createdAt).isAfter(primaryContact?.createdAt)
          ) {
            await prisma.contact.update({
              where: { id: sc.id },
              data: {
                linkedId: primaryContact?.id,
                linkPrecedence: LinkPrecedence.secondary,
              },
            });
          }
        });
        if (newPrimaryContact?.secondaryContacts) {
          for (const c of newPrimaryContact?.secondaryContacts) {
            if (
              c.id !== primaryContact?.id &&
              dayjs(c.createdAt).isAfter(primaryContact?.createdAt)
            ) {
              await prisma.contact.update({
                where: { id: c.id },
                data: {
                  linkedId: primaryContact?.id,
                  linkPrecedence: LinkPrecedence.secondary,
                },
              });
            }
          }
        }
      });
      const updatedPrimaryContact = await prisma.contact.findUnique({
        where: { id: primaryContact?.id },
        include: contactInclude,
      });
      const response = mapToResponse(updatedPrimaryContact);
      return res.status(200).json({ contact: response });
    }
    const newContact = await prisma.contact.create({
      data: { phoneNumber, email },
      include: contactInclude,
    });
    const response = mapToResponse(newContact);
    return res.status(200).json({ contact: response });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: contactInclude,
    });
    const response = contacts.map((contact: any) => ({
      id: contact.id,
      primaryContactId: contact.linkedId,
      emails: [
        ...new Set(
          contact.secondaryContacts.map(({ email }: { email: string }) => email)
        ),
      ],
      phoneNumbers: [
        ...new Set(
          contact.secondaryContacts.map(
            ({ phoneNumber }: { phoneNumber: string }) => phoneNumber
          )
        ),
      ],
      secondaryContactIds: contact.secondaryContacts.map(
        ({ id }: { id: string }) => id
      ),
    }));
    return res.status(200).json(response);
  } catch (error) {
    console.error({ error });
    return res.status(500).json("Internal server error");
  }
};

export const getContact = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(404).json({ error: "Invalid ID" });
    }
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: contactInclude,
    });
    if (!contact) {
      return res.status(404).json("Contact not found");
    }
    return res.status(200).json(mapToResponse(contact));
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err });
  }
};
