import { SecretMessage } from './SecretMessageReducer';
import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  fetchAccount,
  Account,
  TokenId,
} from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Secret Message', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: SecretMessage,
    localBlockchain: any;

  beforeAll(async () => {
    if (proofsEnabled) {
      await SecretMessage.compile();
    }
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new SecretMessage(zkAppAddress);
    localBlockchain = Local;
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `SecretMessage` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(0));
  });

  it('correctly add an address', async () => {
    await localDeploy();

    const newAccount = localBlockchain.testAccounts[2];

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      AccountUpdate.fundNewAccount(senderAccount);
      zkApp.addAddress(newAccount.publicKey);
    });
    await txn.prove();
    await txn.sign([senderKey, zkAppPrivateKey]).send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(1));
  });

  it("can't add same address", async () => {
    await localDeploy();

    const newAccount = localBlockchain.testAccounts[2];

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      AccountUpdate.fundNewAccount(senderAccount);
      zkApp.addAddress(newAccount.publicKey);
    });
    await txn.prove();
    await txn.sign([senderKey, zkAppPrivateKey]).send();

    const txn2 = Mina.transaction(senderAccount, () => {
      zkApp.addAddress(newAccount.publicKey);
    });
    await expect(txn2).rejects.toThrow();
  });

  it('correctly add a message', async () => {
    await localDeploy();

    const newAccount = localBlockchain.testAccounts[2];

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      AccountUpdate.fundNewAccount(senderAccount);
      zkApp.addAddress(newAccount.publicKey);
    });
    await txn.prove();
    await txn.sign([senderKey, zkAppPrivateKey]).send();

    const msg = Field(1234);
    const tx2 = await Mina.transaction(newAccount.publicKey, () => {
      zkApp.addMessage(msg);
    });
    await tx2.prove();
    await tx2.sign([newAccount.privateKey]).send();

    await fetchAccount({
      publicKey: newAccount.publicKey,
      tokenId: zkApp.tokenId,
    });
    const msgReduce = zkApp.getMessage(newAccount.publicKey);
    expect(msgReduce).toEqual(msg);
  });

  it("can't add 2 message", async () => {
    await localDeploy();

    const newAccount = localBlockchain.testAccounts[2];

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      AccountUpdate.fundNewAccount(senderAccount);
      zkApp.addAddress(newAccount.publicKey);
    });
    await txn.prove();
    await txn.sign([senderKey, zkAppPrivateKey]).send();

    const msg = Field(1234);
    const tx2 = await Mina.transaction(newAccount.publicKey, () => {
      zkApp.addMessage(msg);
    });
    await tx2.prove();
    await tx2.sign([newAccount.privateKey]).send();

    const tx3 = Mina.transaction(newAccount.publicKey, () => {
      zkApp.addMessage(msg);
    });
    await expect(tx3).rejects.toThrow();
  });
});
