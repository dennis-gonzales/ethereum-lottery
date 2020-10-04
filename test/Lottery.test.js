const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const { interface, bytecode } = require('../compile');

let accounts;
let lottery;

beforeEach(async () => {
    // get list of accounts
    accounts = await web3.eth.getAccounts();

    lottery = await new web3.eth.Contract(JSON.parse(interface))
        .deploy({ data: bytecode, arguments: [] })
        .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery', () => {
    it('is deployed', () => {
        assert.ok(lottery._address);
    });
    it('can enter a player', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('1', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.strictEqual(players[0], accounts[0]);
        assert.strictEqual(players.length, 1);
    });

    it('can enter multiple players', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('1', 'ether')
        });
        await lottery.methods.enter().send({
            from: accounts[1],
            value: web3.utils.toWei('2', 'ether')
        });
        await lottery.methods.enter().send({
            from: accounts[2],
            value: web3.utils.toWei('3', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.strictEqual(players[0], accounts[0]);
        assert.strictEqual(players[1], accounts[1]);
        assert.strictEqual(players[2], accounts[2]);
        assert.strictEqual(players.length, 3);
    });

    it('fails when payment is below minimum', async () => {
        try {
            // do a [failing test] by sending a payment below minimum
            await lottery.methods.enter().send({
                from: accounts[0],
                value: web3.utils.toWei('0', 'ether')
            });
        } catch (err) {
            // the test has failed -> [therefore it passed the test]
            assert(err);
            return;
        }
        // it passed the test -> [therefore the test has failed]
        assert(false);
    });

    it('fails when a non-manager picks the winner', async () => {
        try {
            // a non-manager player enters the lottery
            await lottery.methods.enter().send({
                from: accounts[1],
                value: web3.utils.toWei('1', 'ether')
            });

            // do a [failing test] by picking a winner using non-manager accounts
            await lottery.methods.pickWinner().send({
                from: accounts[1]
            });
        } catch (err) {
            // the test has failed -> [therefore it passed the test]
            assert(err);
            return;
        }
        // it passed the test -> [therefore the test has failed]
        assert(false);
    });

    it('can play the game', async () => {
        const originalBalance = await web3.eth.getBalance(accounts[2]);
        await lottery.methods.enter().send({
            from: accounts[2],
            value: web3.utils.toWei('2', 'ether')
        });

        const contractBalance = await web3.eth.getBalance(lottery._address);
        const initialBalance = await web3.eth.getBalance(accounts[2]);
        await lottery.methods.pickWinner().send({
            from: accounts[0]
        });
        
        const newBalance = await web3.eth.getBalance(accounts[2]);
        const difference = newBalance - initialBalance;

        assert.strictEqual(difference.toString(), web3.utils.toWei('2', 'ether'));

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });
        assert.strictEqual(players.length, 0);

        const gameoverBalance = await web3.eth.getBalance(lottery._address);
        assert.strictEqual(gameoverBalance, '0');

        console.log('-----------------------------------------');
        console.log('original player balance: ', web3.utils.fromWei(originalBalance.toString(), 'ether'));
        console.log('gamestart contract balance: ', web3.utils.fromWei(contractBalance.toString(), 'ether'));
        console.log('joined player balance: ', web3.utils.fromWei(initialBalance.toString(), 'ether'));
        console.log('win player balance: ', web3.utils.fromWei(newBalance.toString(), 'ether'));
        console.log('gameover contract balance: ', gameoverBalance);
        console.log('-----------------------------------------');
        console.log('difference: ', difference);
    });
});