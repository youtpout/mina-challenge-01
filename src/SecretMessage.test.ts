import { SecretMessage } from './SecretMessage';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Add', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: SecretMessage;

  beforeAll(async () => {
    if (proofsEnabled) await SecretMessage.compile();
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

    const Local = Mina.LocalBlockchain({ proofsEnabled });

    const newAccount = Local.testAccounts[2];

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      AccountUpdate.fundNewAccount(senderAccount);
      zkApp.addAddress(newAccount.publicKey);
    });
    await txn.prove();
    await txn.sign([senderKey, zkAppPrivateKey]).send();

    const updatedNum = zkApp.num.get();
    console.log('updatedNum', updatedNum);
    expect(updatedNum).toEqual(Field(1));
  });

  it('can add same address', async () => {
    await localDeploy();

    const Local = Mina.LocalBlockchain({ proofsEnabled });

    const newAccount = Local.testAccounts[2];

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
    //await txn2.prove();
    //await txn2.sign([senderKey, zkAppPrivateKey]).send();
  });
});
