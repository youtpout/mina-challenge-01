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

    const permissionToEdit = Permissions.none();

    // this method will create an account for the address
    let account = Account(address, this.token.id);

    account.permissions.set({
      ...Permissions.default(),
      editState: permissionToEdit,
      setTokenSymbol: permissionToEdit,
      send: permissionToEdit,
      receive: permissionToEdit,
    });

    // need to be a new account
    account.isNew.getAndRequireEquals().assertTrue();

    this.num.set(currentState.add(1));
  }

  @method addMessage(message: Field) {
    let account = Account(this.sender, this.token.id);

    // need to be a existing account
    account.isNew.getAndRequireEquals().assertFalse();

    // const zkAppTokenAccount = new TokenAccount(this.sender, this.token.id);
    // zkAppTokenAccount.addMessage(message);

    let update = AccountUpdate.create(this.sender, this.token.id);
    update.body.update.appState[0] = { isSome: Bool(true), value: message };
  }
}

class TokenAccount extends SmartContract {
  @state(Field) value = State<Field>();

  @method addMessage(value: Field) {
    const oldValue = this.value.getAndRequireEquals();
    // address can only deposit 1 message
    oldValue.assertEquals(Field(0));
    this.value.set(value);
  }
}
