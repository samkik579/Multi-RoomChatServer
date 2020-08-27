# Multi-RoomChatServer
Created a multi-room chat server using Node.JS and Socket.IO.

This chat service contains a main lobby where users sign on with a nickname and can communicate with each other. Users may also create chat rooms for other to join. The entire app is displayed on a single webpage, listing the room you are in, all available rooms, and the users in the current room. The creator of a private room can kick or ban users from the room.

Requirements

Administration of user created chat rooms

- Users can create chat rooms with an arbitrary room name
- Users can join an arbitrary chat room
- The chat room displays all users currently in the room
- A private room can be created that is password protected
- Creators of chat rooms can temporarily kick others out of the room
- Creators of chat rooms can permanently ban users from joining that particular room Messaging:
- A user's message shows their username and is sent to everyone in the room
- Users can send private messages to another user in the same room

Creative Portion:

- If *message is typed, then the user is given info on how to send a private message
- If *allusers is typed, then the user is given info on all the users in the chatroom, not just in the specific room
- If *330 is typed, then the user user is given the link to the wiki module page that gave the instructions for module 6
- If *leaveroom is typed, then the user leaves the room they are currently in and gets put back in the lobby on their request. However if they are already in the     lobby, it will tell them they are already in the lobby and cannot leave that.
- Users can see the lobby chat before providing a username, however, they cannot send messages.
- The room a user is in is displayed at the top of their page along with their username.

I worked on this project with raekaattari, due to our classroom privacy settings we made individual copies of the repository.
