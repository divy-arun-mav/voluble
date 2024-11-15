import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { Button, IconButton, Image, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
const ENDPOINT = process.env.REACT_APP_BACKEND_API; // "https://talk-a-tive.herokuapp.com"; -> After deployment
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [picLoading, setPicLoading] = useState(false);
  const [pic, setPic] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const { selectedChat, setSelectedChat, user, notification, setNotification } =
    ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `${process.env.REACT_APP_BACKEND_API}/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleImageUpload = (pics) => {
    setPicLoading(true);
    const data = new FormData();
    data.append("file", pics);
    data.append("upload_preset", "qwaqnhu3");
    data.append("cloud_name", "djy7my1mw");
    fetch("https://api.cloudinary.com/v1_1/djy7my1mw/image/upload", {
      method: "post",
      body: data,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data.url.toString());
        setPic(data.url.toString()); // Set the uploaded image URL
        setPicLoading(false);
        openModal(data.url.toString());
      })
      .catch((err) => {
        console.log(err);
        setPicLoading(false);
      });
  };


  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        setNewMessage("");
        const { data } = await axios.post(
          `${process.env.REACT_APP_BACKEND_API}/api/message`,
          {
            content: newMessage,
            chatId: selectedChat,
          },
          config
        );
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (error) {
        toast({
          title: "Error Occured!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  const sendImage = async () => {
    if (!pic) return; // Ensure an image URL exists

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
    },
  };

  const { data } = await axios.post(
    `${process.env.REACT_APP_BACKEND_API}/api/message`,
    {
      content: pic, // Use the uploaded image URL
      chatId: selectedChat._id,
      isImage: true,
    },
    config
  );

  socket.emit("new message", data);
  setMessages([...messages, data]);
  setPic(""); // Clear the image URL
  closeModal(); // Close the modal
} catch (error) {
  toast({
    title: "Error Occurred!",
    description: "Failed to send the image",
    status: "error",
    duration: 5000,
    isClosable: true,
    position: "bottom",
  });
}
  };


useEffect(() => {
  socket = io(ENDPOINT);
  socket.emit("setup", user);
  socket.on("connected", () => setSocketConnected(true));
  socket.on("online-users", (users) => {
    setOnlineUsers(users);
  });
  socket.on("typing", () => setIsTyping(true));
  socket.on("stop typing", () => setIsTyping(false));

  // eslint-disable-next-line
}, []);

useEffect(() => {
  fetchMessages();
  selectedChatCompare = selectedChat;
  const recipientId = selectedChat?.users?.find((u) => u._id !== user._id)?._id;
  const recipientOnline = onlineUsers?.some((u) => {
    console.log(u);
    return u === recipientId;
  });
  setIsOnline(recipientOnline);
  // eslint-disable-next-line
}, [selectedChat]);

useEffect(() => {
  socket.on("message recieved", (newMessageRecieved) => {
    if (
      !selectedChatCompare || // if chat is not selected or doesn't match current chat
      selectedChatCompare._id !== newMessageRecieved.chat._id
    ) {
      if (!notification.includes(newMessageRecieved)) {
        setNotification([newMessageRecieved, ...notification]);
        setFetchAgain(!fetchAgain);
      }
    } else {
      setMessages([...messages, newMessageRecieved]);
    }
  });
});

const typingHandler = (e) => {
  setNewMessage(e.target.value);

  if (!socketConnected) return;

  if (!typing) {
    setTyping(true);
    socket.emit("typing", selectedChat._id);
  }
  let lastTypingTime = new Date().getTime();
  var timerLength = 3000;
  setTimeout(() => {
    var timeNow = new Date().getTime();
    var timeDiff = timeNow - lastTypingTime;
    if (timeDiff >= timerLength && typing) {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);
    }
  }, timerLength);
};

const openModal = (image) => {
  setImagePreview(image);
  setIsModalOpen(true);
};

const closeModal = () => {
  setIsModalOpen(false);
  setImagePreview(null);
};


return (
  <>
    {selectedChat ? (
      <div className="chat-screen">
        <Text
          fontSize={{ base: "28px", md: "30px" }}
          pb={3}
          px={2}
          w="100%"
          fontFamily="Work sans"
          d="flex"
          justifyContent={{ base: "space-between" }}
          alignItems="center"
          bg="white"
        >
          <IconButton
            d={{ base: "flex", md: "none" }}
            icon={<ArrowBackIcon />}
            onClick={() => setSelectedChat("")}
          />
          {messages &&
            (!selectedChat.isGroupChat ? (
              <>
                <p>{getSender(user, selectedChat.users)}
                  <Text fontSize={{ base: "12px", md: "15px" }}>{isOnline ? "online" : "offline"}</Text>
                </p>
                <ProfileModal
                  user={getSenderFull(user, selectedChat.users)}
                />
              </>
            ) : (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal
                  fetchMessages={fetchMessages}
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                />
              </>
            ))}
        </Text>
        <Box
          d="flex"
          flexDir="column"
          justifyContent="flex-end"
          p={3}
          w="100%"
          h="100%"
          borderRadius="lg"
          overflowY="hidden"
        >
          {loading ? (
            <Spinner
              size="xl"
              w={20}
              h={20}
              alignSelf="center"
              margin="auto"
            />
          ) : (
            <div className="messages">
              <ScrollableChat messages={messages} />
            </div>
          )}

          <FormControl
            onKeyDown={sendMessage}
            id="first-name"
            isRequired
            mt={3}
          >
            {istyping ? (
              <div>
                <Lottie
                  options={defaultOptions}
                  // height={50}
                  width={70}
                  style={{ marginBottom: 15, marginLeft: 0 }}
                />
              </div>
            ) : (
              <></>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files[0])}
              disabled={picLoading}
            />
            <Input
              variant="filled"
              bg="#E0E0E0"
              placeholder="Enter a message.."
              value={newMessage}
              onChange={typingHandler}
            />
          </FormControl>
        </Box>
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Image Preview</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Image src={imagePreview} alt="Image Preview" />
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={sendImage}>
                Send
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

      </div>
    ) : (
      // to get socket.io on same page
      <Box d="flex" alignItems="center" justifyContent="center" h="100%">
        <Text fontSize="3xl" pb={3} fontFamily="Work sans">
          Click on a user to start chatting
        </Text>
      </Box>
    )}
  </>
);
};

export default SingleChat;