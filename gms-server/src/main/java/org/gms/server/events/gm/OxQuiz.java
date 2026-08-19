/*
	This file is part of the OdinMS Maple Story Server
    Copyright (C) 2008 Patrick Huy <patrick.huy@frz.cc>
		       Matthias Butz <matze@odinms.de>
		       Jan Christian Meyer <vimes@odinms.de>

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
package org.gms.server.events.gm;

import org.gms.client.Character;
import org.gms.provider.DataProvider;
import org.gms.provider.DataProviderFactory;
import org.gms.provider.DataTool;
import org.gms.provider.wz.WZFiles;
import org.gms.server.TimerManager;
import org.gms.server.maps.MapleMap;
import org.gms.util.I18nUtil;
import org.gms.util.PacketCreator;
import org.gms.util.Randomizer;


/**
 * @author FloppyDisk
 */
public final class OxQuiz {
    private int round = 1;
    private int question = 1;
    private MapleMap map = null;
    private final int expGain = 200;
    private static final DataProvider stringData = DataProviderFactory.getDataProvider(WZFiles.ETC);

    public OxQuiz(MapleMap map) {
        this.map = map;
        this.round = Randomizer.nextInt(9);
        this.question = 1;
    }

    private boolean isCorrectAnswer(Character chr, int answer) {
        double x = chr.getPosition().getX();
        double y = chr.getPosition().getY();
        if ((x > -234 && y > -26 && answer == 0) || (x < -234 && y > -26 && answer == 1)) {
            chr.dropMessage(I18nUtil.getMessage("OxQuiz.message1"));
            return true;
        }
        return false;
    }

    public void sendQuestion() {
        int gm = 0;
        for (Character mc : map.getCharacters()) {
            if (mc.gmLevel() > 1) {
                gm++;
            }
        }
        final int number = gm;
        map.broadcastMessage(PacketCreator.showOXQuiz(round, question, true));
        TimerManager.getInstance().schedule(() -> {
            map.broadcastMessage(PacketCreator.showOXQuiz(round, question, true));
            // getCharacters() 返回的是锁内拷好的不可变快照，直接迭代即可
            for (Character chr : map.getCharacters()) {
                if (chr != null) // make sure they aren't null... maybe something can happen in 12 seconds.
                {
                    if (!isCorrectAnswer(chr, getOXAnswer(round, question)) && !chr.isGM()) {
                        chr.changeMap(chr.getMap().getReturnMap());
                    } else {
                        chr.gainExp(expGain, true, true);
                    }
                }
            }
            //do question
            if ((round == 1 && question == 29) || ((round == 2 || round == 3) && question == 17) || ((round == 4 || round == 8) && question == 12) || (round == 5 && question == 26) || (round == 9 && question == 44) || ((round == 6 || round == 7) && question == 16)) {
                question = 100;
            } else {
                question++;
            }
            //send question
            if (map.getCharacterCount() - number <= 2) {
                map.broadcastMessage(PacketCreator.serverNotice(6, I18nUtil.getMessage("OxQuiz.message2")));
                map.getPortal("join00").setPortalStatus(true);
                map.setOx(null);
                map.setOxQuiz(false);
                //prizes here
                return;
            }
            sendQuestion();
        }, 30000); // Time to answer = 30 seconds ( Ox Quiz packet shows a 30 second timer.
    }

    private static int getOXAnswer(int imgdir, int id) {
        return DataTool.getInt(stringData.getData("OXQuiz.img").getChildByPath("" + imgdir + "").getChildByPath("" + id + "").getChildByPath("a"));
    }
}
