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
} from 'o1js';

export class SecretMessage extends SmartContract {
  @state(Field) public num = State<Field>();

  init() {
    super.init();
    this.num.set(Field(0));
  }

  @method addAddress(address: PublicKey) {
    const currentState = this.num.getAndRequireEquals();
    currentState.assertLessThan(100);

    const accountUpdate = AccountUpdate.createSigned(address, this.token.id);

    // only new address can be added
    accountUpdate.account.isNew.getAndRequireEquals().assertTrue();

    accountUpdate.body.update.permissions = {
      isSome: Bool(true),
      value: {
        ...Permissions.default(),
        editState: Permissions.signature(),
      },
    };
    accountUpdate.body.update.appState[0] = {
      isSome: Bool(true),
      value: Field(1),
    };

    currentState.add(1);
  }

  @method addMessage(message: Field) {
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
    oldValue.assertEquals(Field(1));
    this.value.set(value);
  }
}
