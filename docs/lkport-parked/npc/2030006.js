/*
    This file is part of the HeavenMS MapleStory Server
    Copyleft (L) 2016 - 2019 RonanLana

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation version 3 as published by
    the Free Software Foundation. You may not use, modify or distribute
    this program under any other version of the GNU Affero General Public
    License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/* Holy Stone, edited by LichKing
    Holy Ground at the Snowfield (211040401)
    3rd job advancement - Question trial.
 */

var questionTree = [
    ["本服70级后的经验倍率？", ["1x", "2x", "3x", "4x"], 3],
    ["本服的QQ群号是？", ["763054634", "4763054634"], 0],
    ["你能直接传送到自由市场么？", ["可以，点击“拍卖”", "不行"], 0],
    ["1 + 1 = ", ["0", "1", "2"], 2],
    ["遇到BUG应该怎么做？", ["及时向Lich报告！", "滥用 = ="], 0]
];

var status;
var question;

var questionPool;
var questionPoolCursor;

var questionAnswer;

function start() {
    status = -1;
    action(1, 0, 0);
}

function action(mode, type, selection) {
    if (mode == -1) {
        cm.dispose();
    } else {
        if (mode == 0 && type > 0) {
            cm.dispose();
            return;
        }
        if (mode == 1)
            status++;
        else
            status--;

        if (status == 0) {
            if (cm.getPlayer().gotPartyQuestItem("JBQ") && !cm.haveItem(4031058, 1)) {
                if (cm.haveItem(4005004, 1)) {
                    if (!cm.canHold(4031058)) {
                        cm.sendNext("确保etc栏有足够的格子");
                        cm.dispose();
                    } else {
                        cm.sendNext("枫之大陆小知识测试开始，回答错误要重新开始！");
                    }
                } else {
                    cm.sendNext("你需要有一个#b#t4005004##k来参与问答.");
                    cm.dispose();
                }
            } else {
                cm.dispose();
            }
        } else if (status == 1) {
            cm.gainItem(4005004, -1);
            instantiateQuestionPool();

            question = fetchNextQuestion();
            var questionHead = "第 " + (status) + " 个问题。";
            var questionEntry = questionTree[question][0];

            var questionData = generateSelectionMenu(questionTree[question][1], questionTree[question][2]);
            var questionOptions = questionData[0];
            questionAnswer = questionData[1];

            cm.sendSimple(questionHead + questionEntry + "\r\n\r\n#b" + questionOptions + "#k");
        } else if (status >= 2 && status <= 5) {
            if (!evaluateAnswer(selection)) {
                cm.sendNext("回答错误。");
                cm.dispose();
                return;
            }

            question = fetchNextQuestion();
            var questionHead = "第 " + (status) + " 个问题.。";
            var questionEntry = questionTree[question][0];

            var questionData = generateSelectionMenu(questionTree[question][1], questionTree[question][2]);
            var questionOptions = questionData[0];
            questionAnswer = questionData[1];

            cm.sendSimple(questionHead + questionEntry + "\r\n\r\n#b" + questionOptions + "#k");
        } else if (status == 6) {
            if (!evaluateAnswer(selection)) {
                cm.sendNext("回答错误。");
                cm.dispose();
                return;
            }

            cm.sendOk("回答正确。你真是个小机灵鬼。\r\n拿着项回去吧。");
            cm.gainItem(4031058, 1);
            cm.dispose();
        } else {
            cm.sendOk("Unexpected branch.");
            cm.dispose();
        }
    }
}

function evaluateAnswer(selection) {
    return selection == questionAnswer;
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function instantiateQuestionPool() {
    questionPool = [];

    for (var i = 0; i < questionTree.length; i++) {
        questionPool.push(i);
    }

    shuffleArray(questionPool);
    questionPoolCursor = 0;
}

function fetchNextQuestion() {
    var next = questionPool[questionPoolCursor];
    questionPoolCursor++;

    return next;
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function generateSelectionMenu(array, answer) {
    var answerStr = array[answer], answerPos = -1;

    shuffle(array);

    var menu = "";
    for (var i = 0; i < array.length; i++) {
        menu += "#L" + i + "#" + array[i] + "#l\r\n";
        if (answerStr == array[i]) {
            answerPos = i;
        }
    }
    return [menu, answerPos];
}