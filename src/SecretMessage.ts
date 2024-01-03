import {
  AccountUpdate,
  Bool,
  Field,
  PublicKey,
  SmartContract,
  State,
  VerificationKey,
  method,
  state,
  Permissions,
  Account,
  UInt64,
  fetchAccount,
} from 'o1js';

export class SecretMessage extends SmartContract {
  @state(Field) public num = State<Field>();

  init() {
    super.init();

    const permissionToEdit = Permissions.proof();

    this.account.permissions.set({
      ...Permissions.default(),
      editState: permissionToEdit,
      setTokenSymbol: permissionToEdit,
      send: permissionToEdit,
      receive: permissionToEdit,
    });

    this.num.set(Field(0));
  }

  @method addAddress(address: PublicKey) {
    const currentState = this.num.getAndRequireEquals();
    currentState.assertLessThan(100);

    // this method will create an account for the address
    let account = Account(address, this.token.id);

    // need to be a new account
    account.isNew.getAndRequireEquals().assertTrue();

    this.num.set(currentState.add(1));
  }

  @method addMessage(message: Field) {
    let account = Account(this.sender, this.token.id);
    // need to be a existing account
    account.isNew.getAndRequireEquals().assertFalse();

    let update = AccountUpdate.createSigned(this.sender, this.token.id);
    update.body.update.appState[0] = { isSome: Bool(true), value: message };
    update.body.update.appState[0].value.assertEquals(message);
  }

  @method check(address: PublicKey, value: Field) {
    const update = AccountUpdate.createSigned(address, this.token.id);
    update.body.preconditions.account.state[0] = { isSome: Bool(true), value };
  }
}

export class TokenAccount extends SmartContract {
  @state(Field) value = State<Field>();

  @method empty() {
    this.value.getAndRequireEquals();
  }
}
