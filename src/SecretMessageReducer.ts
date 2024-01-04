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
  Reducer,
  Struct,
  Poseidon,
} from 'o1js';

class MessageInfo extends Struct({
  address: PublicKey,
  message: Field,
}) {
  constructor(value: { address: PublicKey; message: Field }) {
    super(value);
  }

  hash(): Field {
    return Poseidon.hash([
      this.address.x,
      this.address.isOdd.toField(),
      this.message,
    ]);
  }
}

export class SecretMessage extends SmartContract {
  @state(Field) public num = State<Field>();
  reducer = Reducer({ actionType: MessageInfo });

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

    const messageInfo = new MessageInfo({ address: this.sender, message });
    this.reducer.dispatch(messageInfo);
  }

  getMessage(address: PublicKey): Field {
    let actions = this.reducer.getActions();
    let find = actions.find((x) => x.find((z) => z.address == address));
    if (find) {
      return find[0].message;
    }
    return Field(0);
  }
}
