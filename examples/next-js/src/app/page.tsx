"use client";

import {
  Button,
  ChakraProvider,
  HStack,
  ListItem,
  OrderedList,
  Spinner,
  Stack,
  Text,
  UnorderedList,
  VStack,
} from "@chakra-ui/react";
import { createSigner } from "@guildxyz/sdk";
import { UserProfile } from "@guildxyz/types";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import guildClient from "../lib/guild";
import { set } from "zod";

// Id of Our Guild (https://guild.xyz/our-guild)
// You can check your guild's id with the following endpoint:
// https://api.guild.xyz/v2/guilds/our-guild
const GUILD_ID = 14656;

function fetchUserMembershipsInGuild(address: `0x${string}`, guildId: number) {
  return guildClient.user
    .getMemberships(address)
    .then((results) => results.find((item) => item.guildId === guildId));
}

function fetchRoleNames(guildId: number) {
  return guildClient.guild.role
    .getAll(guildId)
    .then((roles) =>
      Object.fromEntries(roles.map(({ id, name }) => [id, name]))
    );
}

async function fetchLeaderboard(guildIdOrUrlName: number | string) {
  const rewards = await guildClient.guild.reward.getAll(guildIdOrUrlName);

  // platformId === 13 means that the reward is point-based
  const pointsReward = rewards.find((reward) => reward.platformId === 13);

  // The guildPlatformId parameter could also be hardcoded
  return guildClient.guild.getLeaderboard(guildIdOrUrlName, pointsReward!.id);
}

export default function Home() {
  const { address } = useAccount();

  const { connect: connectInjected } = useConnect({
    connector: new InjectedConnector(),
  });
  const { connect: connectWalletConnect } = useConnect({
    connector: new WalletConnectConnector({
      options: { projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID },
    }),
  });
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [selectedMember, setSelectedMember] = useState();


  const [profile, setProfile] = useState();
  const [myProfile, setMyProfile] = useState<UserProfile>();

  const [members, setMembers] = useState<string[]>();

  const { data: userMemberships, isLoading: isUserMembershipsLoading } = useSWR(
    !!address ? ["memberships", address, GUILD_ID] : null,
    ([, ...props]) => fetchUserMembershipsInGuild(...props)
  );

  const { data: roles, isLoading: isRolesLoading } = useSWR(
    ["roles", GUILD_ID],
    ([, ...props]) => fetchRoleNames(...props)
  );

  const { data: leaderboard, isLoading: isLeaderboardLoading } = useSWR(
    ["leaderboard", "walletconnect"],
    ([, ...params]) => fetchLeaderboard(GUILD_ID)
  );


  useEffect(() => {
    if (selectedMember) {
      guildClient.user.getProfile(selectedMember).then(setProfile)
    }
  }, [selectedMember])

  return (
    <ChakraProvider>
      <Stack alignItems={"start"} spacing={8} padding={8}>
        {address ? (
          <>
            <HStack>
              <Text>Connected to {address}</Text>

              <Button onClick={() => disconnect()}>Disconnect</Button>
            </HStack>
          </>
        ) : (
          <HStack spacing={8}>
            <Button onClick={() => connectInjected()}>Connect Injected</Button>
            <Button onClick={() => connectWalletConnect()}>
              Connect WalletConnect
            </Button>
          </HStack>
        )}



        <Text fontSize={"xx-large"}>Your Roles in Raid Guild</Text>

        <VStack fontSize={"medium"} border={'1px solid black'} padding={10}>
          {isUserMembershipsLoading || isRolesLoading ? (
            <Spinner />
          ) : !userMemberships || !roles ? (
            <Text>No data</Text>
          ) : (
            <UnorderedList>
              {userMemberships.roleIds.map((roleId) => (
                <ListItem key={roleId}>
                  {roles[roleId]} (#{roleId})
                </ListItem>
              ))}
            </UnorderedList>
          )}



        </VStack>

        <Text fontSize={'xx-large'}>Fetch your profile</Text>
        <VStack fontSize={"medium"} border={'1px solid black'} padding={10}>
          {!!address && (
          <>
            
            {!profile ? (
              <Button 
                onClick={() =>
                  guildClient.user
                    .getProfile(
                      address,
                      createSigner.custom(
                        (message) => signMessageAsync({ message }),
                        address
                      )
                    )
                    .then(setMyProfile)
                }
              >
                Call Guild API
              </Button>
            ) : (
              <Text>{JSON.stringify(myProfile)}</Text>
            )}
          </>
            )}
            
            </VStack>

        
        <Button
          onClick={() =>
            guildClient.guild.getMembers(GUILD_ID).then((res) => {
              setMembers(res[0].members)
            })
          }
        >
          Fetch Members
        </Button>

        <HStack>

          <VStack align='flex-start'>
            <Text fontSize={"xx-large"}>RaidGuild Members</Text>

            <VStack align='flex-start' justify={'flex-start'}>
              <Text fontSize={"x-large"}>
                {members ?
                  `Total: ${members.length}` : 'Not Fetched yet'}
              </Text>
              
              {profile && <Text fontSize={"medium"} border={'1px solid black'} padding={4}>
                Selected Member
              </Text>}
              <Text fontSize={"medium"} border={'1px solid black'} padding={10}>
                
                {profile ? JSON.stringify(profile) : 'No member selected'}
              </Text>
            </VStack>


            {!members ? (
              <Text>No data fetched</Text>
            ) : (
              <UnorderedList>
                {members.map((member) => (
                  <ListItem key={member}
                    cursor={'pointer'}
                    onClick={() => {
                      setSelectedMember(member)
                    }}>
                    {member}
                  </ListItem>
                ))}
              </UnorderedList>
            )}

          </VStack>
        </HStack>
      </Stack>
    </ChakraProvider>
  );
}
