import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { Contact, LinkPrecedence } from "../../types";
import { contactInclude, handleCachedContact, mapToResponse } from "../utils";
import { getCachedContact, redisClient } from "../utils/redis";

export const identityReconciler = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data || (!data.phoneNumber && !data.email)) {
      return res.status(400).json("Invalid request");
    }
    const cacheKey = JSON.stringify(data);
    const cachedContact = await getCachedContact(cacheKey);

    if (cachedContact) {
      console.log("fetching from cache: ", JSON.parse(cachedContact));
      return res.status(200).json({ contact: JSON.parse(cachedContact) });
    }

    if (!data.phoneNumber) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          email: data.email,
        },
        include: contactInclude,
      });
      if (existingContact) {
        const response = await handleCachedContact(
          `${JSON.stringify(data)}`,
          JSON.stringify(mapToResponse(existingContact))
        );
        return res.status(200).json({ contact: response });
      }
      return res.status(404).json({
        error: "Contact not found or insufficient data to create a new one",
      });
    }
    if (!data.email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          phoneNumber: data.phoneNumber,
        },
        include: contactInclude,
      });
      if (existingContact) {
        const response = await handleCachedContact(
          `${JSON.stringify(data)}`,
          JSON.stringify(mapToResponse(existingContact))
        );
        return res.status(200).json({ contact: response });
      }
      return res.status(404).json({
        error: "Contact not found or insufficient data to create a new one",
      });
    }

    const sameContact = await prisma.contact.findFirst({
      where: {
        AND: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
      },
      include: contactInclude,
    });
    if (sameContact) {
      return res.status(200).json({ contact: mapToResponse(sameContact) });
    }

    const existingContact = await prisma.contact.findFirst({
      where: {
        OR: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
      },
    });

    if (existingContact) {
      if (
        existingContact.phoneNumber == data.phoneNumber &&
        existingContact.email === data.email
      ) {
        await redisClient.set(
          `${JSON.stringify(data)}`,
          JSON.stringify(mapToResponse(existingContact))
        );
        return res
          .status(200)
          .json({ contact: mapToResponse(existingContact) });
      }

      let updateData: Contact = {
        ...existingContact,
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: existingContact.id,
      };

      if (existingContact.linkPrecedence === LinkPrecedence.secondary) {
        updateData.linkedId = existingContact.linkedId;
      }

      if (existingContact.phoneNumber !== data.phoneNumber) {
        updateData.phoneNumber = data.phoneNumber;
        const primaryContact = await prisma.contact.findFirst({
          where: {
            OR: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
            linkPrecedence: LinkPrecedence.primary,
            id: {
              not: existingContact.id,
            },
          },
          include: contactInclude,
        });

        if (primaryContact) {
          const contact = await prisma.contact.update({
            where: {
              id: existingContact.id,
            },
            data: {
              phoneNumber: data.phoneNumber,
              email: data.email,
              linkPrecedence: LinkPrecedence.secondary,
              linkedId: primaryContact.id,
            },
            include: contactInclude,
          });

          const response = await handleCachedContact(
            `${JSON.stringify(data)}`,
            JSON.stringify(mapToResponse(contact))
          );
          return res.status(200).json({ contact: response });
        }
      }

      if (existingContact.email !== data.email) {
        const primaryContact = await prisma.contact.findFirst({
          where: {
            OR: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
            linkPrecedence: LinkPrecedence.primary,
            id: {
              not: existingContact.id,
            },
          },
          include: contactInclude,
        });
        updateData.email = data.email;

        if (primaryContact) {
          const contact = await prisma.contact.update({
            where: {
              id: existingContact.id,
            },
            data: {
              linkPrecedence: LinkPrecedence.secondary,
              linkedId: primaryContact.id,
            },
            include: contactInclude,
          });

          const response = await handleCachedContact(
            `${JSON.stringify(data)}`,
            JSON.stringify(mapToResponse(primaryContact))
          );
          return res.status(200).json({ contact: response });
        }
      }

      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.id;

      const contact = await prisma.contact.create({
        data: updateData,
        include: contactInclude,
      });

      const response = await handleCachedContact(
        `${JSON.stringify(data)}`,
        JSON.stringify(mapToResponse(contact))
      );

      return res.status(200).json({ contact: response });
    } else {
      const contact = await prisma.contact.create({
        data,
        include: contactInclude,
      });

      const response = await handleCachedContact(
        `${JSON.stringify(data)}`,
        JSON.stringify(mapToResponse(contact))
      );
      return res.status(200).json({ contact: response });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        primaryContact: true,
        secondaryContacts: true,
      },
    });
    const response = contacts.map((contact) => ({
      id: contact.id,
      primaryContactId: contact.linkedId,
      emails: [...new Set(contact.secondaryContacts.map(({ email }) => email))],
      phoneNumbers: [
        ...new Set(
          contact.secondaryContacts.map(({ phoneNumber }) => phoneNumber)
        ),
      ],
      secondaryContactIds: contact.secondaryContacts.map(({ id }) => id),
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
