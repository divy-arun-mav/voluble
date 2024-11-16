/* eslint-disable jsx-a11y/img-redundant-alt */
import { useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody } from "@chakra-ui/react";
import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";

const ScrollableChat = ({ messages }) => {
  const [showModal, setShowModal] = useState(false);
  const [img, setImg] = useState();
  const { user } = ChatState();

  const formatDate = (time) => {
    const date = new Date(time);
    const padZero = (num) => num.toString().padStart(2, '0');
    const day = padZero(date.getDate());
    const month = padZero(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    return `${hours}:${minutes} ${day}-${month}-${year}`;
  };

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div style={{ display: "flex" }} key={m._id}>
            {(isSameSender(messages, m, i, user._id) ||
              isLastMessage(messages, i, user._id)) && (
                <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                  <Avatar
                    mt="7px"
                    mr={1}
                    size="sm"
                    cursor="pointer"
                    name={m.sender.name}
                    src={m.sender.pic}
                  />
                </Tooltip>
              )}
            <span
              style={{
                backgroundColor: `${m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0"}`,
                marginLeft: isSameSenderMargin(messages, m, i, user._id),
                marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                borderRadius: "20px",
                padding: (m.content.includes('https') && m.content.includes('upload')) || m.content.includes('image') ? "10px" : "5px 15px",
                minWidth: "min-content",
                maxWidth: "75%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Conditional rendering of image or text content */}
              {
                (m.content.includes('https') && m.content.includes('upload')) || m.content.includes('image') ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    onClick={() => { setShowModal(true); setImg(m.content); }}
                    src={m.content}
                    alt="message image"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "10px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  m.content
                )
              }
              <span style={{ fontSize: "10px", display: 'flex' }}>
                {formatDate(m.createdAt)}
                {m.sender._id === user._id ? (<p style={{ marginLeft: "10px" }}>{m.status}</p>) : null}
              </span>
            </span>
          </div>
        ))}

      {/* Modal to display the clicked image */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <ModalBody>
              <img
                src={img}
                alt="message image"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "10px",
                  objectFit: "cover"
                }}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </ScrollableFeed>
  );
};

export default ScrollableChat;