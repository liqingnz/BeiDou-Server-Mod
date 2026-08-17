/*
    This file is part of the HeavenMS MapleStory Server
    Copyleft (L) 2016 - 2018 RonanLana

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
/* Screwing the Red Scorpions
 */

var status = -1;

function end(mode, type, selection) {
    if (mode == -1) {
        qm.dispose();
    } else {
        if(mode == 0 && type > 0) {
            qm.dispose();
            return;
        }
        
        if (mode == 1)
            status++;
        else
            status--;
        
        if (status == 0) {
            //var c = 0; 
            var c = 4;  //任务有bug，设置为可丢弃物品后直接完成
            
            for(var i = 0; i < 4; i++) {
                if(qm.getQuestProgress(3926, i) == 1) {
                    c++;
                }
            }
            
            if(c == 4 && !qm.haveItem(4031579)) {
                //qm.sendNext("你把所有的珠宝都运送了，干得好！");
                qm.sendNext("你把所有的珠宝都运送了，干得好！(任务有bug，可丢弃物品后直接完成)");
                qm.gainExp(6500);
                qm.forceCompleteQuest();
            } else {
                qm.sendNext("你把红蝎子的珠宝都运送了吗？它们必须被运送到沙子图团的住宅区。");
            }   
            
            qm.dispose();
        }
    }
}
