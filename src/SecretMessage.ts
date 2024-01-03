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

    let account = Account(address, this.token.id);

    // need to be a new account
    account.isNew.getAndRequireEquals().assertTrue();

    this.token.mint({ address, amount: 1 });

    this.num.set(currentState.add(1));
  }

  @method addMessage(message: Field) {
    let account = Account(this.address, this.token.id);
    let balance = account.balance.getAndRequireEquals();
    //
    balance.assertEquals(new UInt64(1));

    const accountUpdate = AccountUpdate.createSigned(
      this.sender,
      this.token.id
    );
    // only address not new can add message
    accountUpdate.account.isNew.getAndRequireEquals().assertFalse();

    const zkAppTokenAccount = new TokenAccount(this.sender, this.token.id);
    zkAppTokenAccount.addMessage(message);
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
